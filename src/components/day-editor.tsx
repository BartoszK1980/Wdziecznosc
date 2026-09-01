import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EntryPhoto } from './entry-photo';

import { Radius, Spacing } from '@/constants/theme';
import { MAX_PHOTOS_PER_SLOT, MAX_SLOTS, type Slot } from '@/db/db';
import {
  addPhoto,
  clearSlot,
  loadDay,
  MAX_TEXT_LENGTH,
  nextFreePhotoPosition,
  nextFreeSlot,
  removePhoto,
  saveText,
  type Day,
  type DaySlot,
} from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import { pickFromCamera, pickFromLibrary, storePhoto, type PickResult } from '@/photos/photos';
import { scheduleSync } from '@/sync/sync';

const SAVE_DEBOUNCE_MS = 600;
const THUMB = 52;
const BADGE = 26;

export function DayEditor({ date, editable = true }: { date: string; editable?: boolean }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [day, setDay] = useState<Day | null>(null);
  /** Slot dopisany przyciskiem, jeszcze bez tresci — nie ma go w bazie. */
  const [draftSlot, setDraftSlot] = useState<Slot | null>(null);
  const timers = useRef(new Map<Slot, ReturnType<typeof setTimeout>>());

  const reload = useCallback(async () => {
    const loaded = await loadDay(date);
    setDay(loaded);
    // Pusty dzien od razu pokazuje jedno pole — inaczej uzytkownik widzialby
    // sam przycisk i musial go nacisnac, zeby w ogole zaczac pisac.
    //
    // Tylko gdy dzien wolno edytowac: w dniu zamknietym pusty szkic wygladalby
    // jak wpis bez tresci, zamiast powiedziec wprost, ze nic nie zapisano.
    if (editable && loaded.slots.length === 0) setDraftSlot(await nextFreeSlot(date));
    else setDraftSlot(null);
    return loaded;
  }, [date, editable]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Po powrocie na ekran odswiezamy dane (mogl je zmienic pull z chmury), ale
  // NIE wtedy, gdy czeka niezapisany tekst — inaczej przeladowanie skasowaloby
  // to, co uzytkownik wlasnie wpisuje.
  useFocusEffect(
    useCallback(() => {
      if (timers.current.size === 0) void reload();
    }, [reload])
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const patch = (slot: Slot, next: Partial<DaySlot>) =>
    setDay((current) =>
      current
        ? { ...current, slots: current.slots.map((s) => (s.slot === slot ? { ...s, ...next } : s)) }
        : current
    );

  const onChangeText = (slot: Slot, text: string) => {
    // Pisanie w slocie-szkicu materializuje go na liscie.
    setDay((current) => {
      if (!current) return current;
      if (current.slots.some((s) => s.slot === slot)) {
        return {
          ...current,
          slots: current.slots.map((s) => (s.slot === slot ? { ...s, text } : s)),
        };
      }
      return {
        ...current,
        slots: [...current.slots, { slot, text, photos: [] }].sort((a, b) => a.slot - b.slot),
      };
    });
    if (draftSlot === slot) setDraftSlot(null);

    const existing = timers.current.get(slot);
    if (existing) clearTimeout(existing);
    timers.current.set(
      slot,
      setTimeout(() => {
        timers.current.delete(slot);
        void saveText(date, slot, text).then(() => scheduleSync());
      }, SAVE_DEBOUNCE_MS)
    );
  };

  const attachPhoto = async (slot: Slot, pick: () => Promise<PickResult>) => {
    const position = await nextFreePhotoPosition(date, slot);
    if (position === null) {
      Alert.alert(t('editor.photo'), t('editor.photoLimit', { count: MAX_PHOTOS_PER_SLOT }));
      return;
    }

    const result = await pick();
    if (result.status === 'denied') {
      Alert.alert(t('photo.permissionTitle'), t('photo.permissionBody'));
      return;
    }
    if (result.status === 'canceled') return;

    const localUri = await storePhoto(result.image, date, slot, position);
    await addPhoto(date, slot, position, localUri);
    if (draftSlot === slot) setDraftSlot(null);
    await reload();
    scheduleSync();
  };

  const onAddPhoto = (slot: Slot) =>
    Alert.alert(t('editor.photo'), undefined, [
      { text: t('photo.camera'), onPress: () => void attachPhoto(slot, pickFromCamera) },
      { text: t('photo.library'), onPress: () => void attachPhoto(slot, pickFromLibrary) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const onPhotoPress = (slot: Slot, position: number) =>
    Alert.alert(t('photo.replace'), undefined, [
      {
        text: t('photo.remove'),
        style: 'destructive',
        onPress: () => {
          void removePhoto(date, slot, position)
            .then(reload)
            .then(() => scheduleSync());
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const onRemoveSlot = (slot: Slot) =>
    Alert.alert(t('editor.removeEntry'), undefined, [
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          timers.current.get(slot) && clearTimeout(timers.current.get(slot)!);
          timers.current.delete(slot);
          void clearSlot(date, slot)
            .then(reload)
            .then(() => scheduleSync());
        },
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);

  const onAddSlot = async () => {
    const slot = await nextFreeSlot(date);
    if (slot === null) {
      Alert.alert(t('editor.addEntry'), t('editor.slotLimit', { count: MAX_SLOTS }));
      return;
    }
    setDraftSlot(slot);
  };

  if (!day) return <View style={styles.container} />;

  const visible: DaySlot[] = draftSlot
    ? [...day.slots, { slot: draftSlot, text: '', photos: [] }].sort((a, b) => a.slot - b.slot)
    : day.slots;

  if (!editable && visible.length === 0) {
    return (
      <View style={[styles.readOnlyEmpty, { borderColor: colors.border }]}>
        <Text style={[styles.readOnlyText, { color: colors.textMuted }]}>
          {t('editor.noEntries')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {visible.map((entry, index) => (
        <SlotRow
          key={entry.slot}
          date={date}
          entry={entry}
          index={index + 1}
          editable={editable}
          placeholder={t(`editor.hint${((index % 3) + 1) as 1 | 2 | 3}`)}
          onChangeText={(text) => onChangeText(entry.slot, text)}
          onAddPhoto={() => onAddPhoto(entry.slot)}
          onPhotoPress={(position) => onPhotoPress(entry.slot, position)}
          onRemove={() => onRemoveSlot(entry.slot)}
        />
      ))}

      {editable && !draftSlot && day.slots.length < MAX_SLOTS ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void onAddSlot()}
          style={[styles.addSlot, { borderColor: colors.border }]}>
          <Feather name="plus" size={18} color={colors.accent} />
          <Text style={[styles.addSlotLabel, { color: colors.accent }]}>
            {t('editor.addEntry')}
          </Text>
          <Text style={[styles.counter, { color: colors.textMuted }]}>
            {day.slots.length} / {MAX_SLOTS}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type SlotRowProps = {
  date: string;
  entry: DaySlot;
  index: number;
  editable: boolean;
  placeholder: string;
  onChangeText: (text: string) => void;
  onAddPhoto: () => void;
  onPhotoPress: (position: number) => void;
  onRemove: () => void;
};

function SlotRow({
  date,
  entry,
  index,
  editable,
  placeholder,
  onChangeText,
  onAddPhoto,
  onPhotoPress,
  onRemove,
}: SlotRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const canAddPhoto = editable && entry.photos.length < MAX_PHOTOS_PER_SLOT;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.gold }]}>
          <Text style={[styles.badgeText, { color: colors.surface }]}>{index}</Text>
        </View>

        {editable ? (
          <TextInput
            value={entry.text}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            style={[styles.input, { color: colors.text }]}
            multiline
            maxLength={MAX_TEXT_LENGTH}
            textAlignVertical="top"
          />
        ) : (
          <Text style={[styles.input, styles.readOnly, { color: colors.text }]}>
            {entry.text || '—'}
          </Text>
        )}

        {editable ? (
          <Pressable
            onPress={onRemove}
            hitSlop={Spacing.sm}
            accessibilityRole="button"
            accessibilityLabel={t('editor.removeEntry')}>
            <Feather name="x" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {entry.photos.length > 0 || canAddPhoto ? (
        <View style={styles.gallery}>
          {entry.photos.map((photo) => (
            <Pressable
              key={photo.position}
              disabled={!editable}
              onPress={() => onPhotoPress(photo.position)}
              accessibilityRole="button"
              accessibilityLabel={t('photo.replace')}>
              <EntryPhoto date={date} slot={entry.slot} photo={photo} size={THUMB} />
            </Pressable>
          ))}

          {canAddPhoto ? (
            <Pressable
              onPress={onAddPhoto}
              accessibilityRole="button"
              accessibilityLabel={t('editor.photo')}
              style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.bg }]}>
              <Feather name="image" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 23,
    minHeight: 40,
    padding: 0,
  },
  readOnly: {
    paddingTop: 4,
  },
  gallery: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingLeft: BADGE + Spacing.sm,
  },
  addPhoto: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  addSlotLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  counter: {
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  readOnlyEmpty: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  readOnlyText: {
    fontSize: 15,
  },
});
