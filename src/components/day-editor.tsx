import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { EntryPhoto } from './entry-photo';

import { Radius, Spacing } from '@/constants/theme';
import type { Slot } from '@/db/db';
import {
  loadDay,
  MAX_TEXT_LENGTH,
  removePhoto,
  savePhoto,
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

export function DayEditor({ date }: { date: string }) {
  const { t } = useTranslation();
  const [day, setDay] = useState<Day | null>(null);
  const timers = useRef(new Map<Slot, ReturnType<typeof setTimeout>>());

  const reload = useCallback(async () => {
    setDay(await loadDay(date));
  }, [date]);

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

  const updateSlot = (slot: Slot, patch: Partial<DaySlot>) => {
    setDay((current) =>
      current
        ? { ...current, slots: current.slots.map((s) => (s.slot === slot ? { ...s, ...patch } : s)) }
        : current
    );
  };

  const onChangeText = (slot: Slot, text: string) => {
    updateSlot(slot, { text });

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
    const result = await pick();
    if (result.status === 'denied') {
      Alert.alert(t('photo.permissionTitle'), t('photo.permissionBody'));
      return;
    }
    if (result.status === 'canceled') return;

    const localUri = await storePhoto(result.image, date, slot);
    await savePhoto(date, slot, localUri);
    updateSlot(slot, { photoLocalUri: localUri, photoPath: null });
    scheduleSync();
  };

  const onPhotoPress = (entry: DaySlot) => {
    const hasPhoto = Boolean(entry.photoLocalUri || entry.photoPath);
    const options = [
      { text: t('photo.camera'), onPress: () => void attachPhoto(entry.slot, pickFromCamera) },
      { text: t('photo.library'), onPress: () => void attachPhoto(entry.slot, pickFromLibrary) },
    ];

    if (hasPhoto) {
      options.push({
        text: t('photo.remove'),
        onPress: () => {
          void removePhoto(date, entry.slot).then(() => {
            updateSlot(entry.slot, { photoLocalUri: null, photoPath: null });
            scheduleSync();
          });
        },
      });
    }

    Alert.alert(hasPhoto ? t('photo.replace') : t('editor.photo'), undefined, [
      ...options,
      { text: t('common.cancel'), style: 'cancel' as const },
    ]);
  };

  if (!day) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {day.slots.map((entry) => (
        <SlotRow
          key={entry.slot}
          date={date}
          entry={entry}
          placeholder={t(`editor.hint${entry.slot}`)}
          onChangeText={(text) => onChangeText(entry.slot, text)}
          onPhotoPress={() => onPhotoPress(entry)}
        />
      ))}
    </View>
  );
}

type SlotRowProps = {
  date: string;
  entry: DaySlot;
  placeholder: string;
  onChangeText: (text: string) => void;
  onPhotoPress: () => void;
};

function SlotRow({ date, entry, placeholder, onChangeText, onPhotoPress }: SlotRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const hasPhoto = Boolean(entry.photoLocalUri || entry.photoPath);

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.badge, { backgroundColor: colors.gold }]}>
        <Text style={[styles.badgeText, { color: colors.surface }]}>{entry.slot}</Text>
      </View>

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

      <Pressable
        onPress={onPhotoPress}
        hitSlop={Spacing.sm}
        accessibilityRole="button"
        accessibilityLabel={hasPhoto ? t('photo.replace') : t('editor.photo')}>
        {hasPhoto ? (
          <EntryPhoto
            date={date}
            slot={entry.slot}
            localUri={entry.photoLocalUri}
            photoPath={entry.photoPath}
            size={THUMB}
          />
        ) : (
          <View style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Feather name="image" size={18} color={colors.textMuted} />
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
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
    minHeight: THUMB,
    padding: 0,
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
});
