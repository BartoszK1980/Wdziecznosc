import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DayEditor } from '@/components/day-editor';
import { Card, Chip, Muted, SectionLabel } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { dateKey, TAGS, type Tag } from '@/db/db';
import { loadDayMeta, MAX_NOTE_LENGTH, setNote, setTags, toggleFavorite } from '@/db/days';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate } from '@/i18n/dates';
import { scheduleSync } from '@/sync/sync';

const SAVE_DEBOUNCE_MS = 600;

/**
 * Edytor dnia. W koncepcie to okno "Nowa notatka" z przyciskiem "Zapisz notatke";
 * tutaj przycisku nie ma — tresc zapisuje sie sama po chwili przerwy w pisaniu.
 * Dzieki temu nie da sie stracic wpisu przez zamkniecie okna ani przez ubicie
 * aplikacji w trakcie.
 */
export default function NoteScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ date?: string }>();
  const date = typeof params.date === 'string' ? params.date : dateKey();

  const [note, setNoteState] = useState('');
  const [tags, setTagsState] = useState<Tag[]>([]);
  const [favorite, setFavorite] = useState(false);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    void loadDayMeta(date).then((meta) => {
      if (!active) return;
      setNoteState(meta.note);
      setTagsState(meta.tags);
      setFavorite(meta.favorite);
    });
    return () => {
      active = false;
    };
  }, [date]);

  useEffect(() => {
    const timer = noteTimer;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onChangeNote = (text: string) => {
    setNoteState(text);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      noteTimer.current = null;
      void setNote(date, text).then(() => scheduleSync());
    }, SAVE_DEBOUNCE_MS);
  };

  const onToggleTag = (tag: Tag) => {
    const next = tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag];
    setTagsState(next);
    void setTags(date, next).then(() => scheduleSync());
  };

  const onToggleFavorite = useCallback(() => {
    void toggleFavorite(date).then((next) => {
      setFavorite(next);
      scheduleSync();
    });
  }, [date]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notes.favorites')}
          onPress={onToggleFavorite}
          hitSlop={Spacing.sm}>
          <Feather
            name="heart"
            size={22}
            color={favorite ? colors.accent : colors.textMuted}
            // wypelnione serce = ulubione; sam obrys nie odroznia sie dosc mocno
            style={favorite ? undefined : styles.outlineHeart}
          />
        </Pressable>
      ),
    });
  }, [navigation, favorite, colors, onToggleFavorite, t]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <View style={styles.field}>
            <SectionLabel>{t('editor.date')}</SectionLabel>
            <Card style={styles.dateCard}>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {formatLongDate(date, i18n.language)}
              </Text>
              <Feather name="calendar" size={18} color={colors.textMuted} />
            </Card>
          </View>

          <View style={styles.field}>
            <SectionLabel>{t('editor.question')}</SectionLabel>
            <DayEditor date={date} />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <SectionLabel>{t('editor.tags')}</SectionLabel>
              <Muted size={13}>{t('editor.optional')}</Muted>
            </View>
            <View style={styles.chips}>
              {TAGS.map((tag) => (
                <Chip
                  key={tag}
                  label={t(`tags.${tag}`)}
                  selected={tags.includes(tag)}
                  onPress={() => onToggleTag(tag)}
                />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <SectionLabel>{t('editor.extra')}</SectionLabel>
              <Muted size={13}>{t('editor.optional')}</Muted>
            </View>
            <TextInput
              value={note}
              onChangeText={onChangeNote}
              placeholder={t('editor.extraPlaceholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={MAX_NOTE_LENGTH}
              textAlignVertical="top"
              style={[
                styles.noteInput,
                { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            />
          </View>

          <View style={styles.footer}>
            <Feather name="check-circle" size={14} color={colors.sage} />
            <Muted size={13}>{t('editor.autosaved')}</Muted>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  },
  field: { gap: Spacing.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  dateText: {
    fontSize: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  noteInput: {
    minHeight: 110,
    fontSize: 16,
    lineHeight: 23,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: Fonts.serifRegular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  outlineHeart: { opacity: 0.9 },
});
