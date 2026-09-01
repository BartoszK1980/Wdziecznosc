import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoodPicker } from '@/components/mood-picker';
import { ProtectBanner } from '@/components/protect-banner';
import { Card, Heading, Muted, PrimaryButton, SectionLabel } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { dateKey, type Mood } from '@/db/db';
import { loadDayMeta, setMood } from '@/db/days';
import { loadDay } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import { formatLongDate } from '@/i18n/dates';
import { scheduleSync } from '@/sync/sync';

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const router = useRouter();

  const [date, setDate] = useState(dateKey);
  const [mood, setMoodState] = useState<Mood | null>(null);
  const [hasNote, setHasNote] = useState(false);

  // Aplikacja potrafi zostac otwarta przez polnoc, wiec date przeliczamy przy
  // kazdym wejsciu na ekran — inaczej wpisy ladowalyby pod wczorajsza data.
  useFocusEffect(
    useCallback(() => {
      const today = dateKey();
      setDate(today);

      let active = true;
      void Promise.all([loadDayMeta(today), loadDay(today)]).then(([meta, day]) => {
        if (!active) return;
        setMoodState(meta.mood);
        setHasNote(day.slots.some((slot) => slot.text.trim() !== '' || slot.photoLocalUri || slot.photoPath));
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const chooseMood = (next: Mood) => {
    // Ponowne stukniecie w ten sam nastroj go zdejmuje.
    const value = next === mood ? null : next;
    setMoodState(value);
    void setMood(date, value).then(() => scheduleSync());
  };

  const openEditor = () => router.push({ pathname: '/note/[date]', params: { date } });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
          <View style={styles.topBar}>
            <Feather name="menu" size={22} color={colors.text} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.reminder')}
              onPress={() => router.push('/(tabs)/settings')}>
              <Feather name="bell" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.greeting}>
            <Heading size={30}>{t('home.greeting')}</Heading>
            <Muted>{t('home.subtitle')}</Muted>
            <Text style={[styles.date, { color: colors.sage }]}>
              {formatLongDate(date, i18n.language)}
            </Text>
          </View>

          <Card warm style={styles.noteCard}>
            <View style={styles.noteCardText}>
              <Text style={[styles.noteCardTitle, { color: colors.text }]}>{t('home.cardTitle')}</Text>
              <Muted size={14}>{t('home.cardBody')}</Muted>
              <PrimaryButton
                icon={hasNote ? 'edit-2' : 'plus'}
                label={hasNote ? t('home.openNote') : t('home.addNote')}
                onPress={openEditor}
                style={styles.noteCardButton}
              />
            </View>
          </Card>

          <View style={styles.section}>
            <SectionLabel>{t('home.moodTitle')}</SectionLabel>
            <Muted size={14}>{t('home.moodQuestion')}</Muted>
            <MoodPicker value={mood} onChange={chooseMood} />
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/stats')}>
            <Card warm style={styles.statsCard}>
              <View style={styles.statsText}>
                <Text style={[styles.noteCardTitle, { color: colors.text }]}>
                  {t('home.statsTitle')}
                </Text>
                <Muted size={14}>{t('home.statsBody')}</Muted>
              </View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </Card>
          </Pressable>

          <ProtectBanner />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl * 2,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  greeting: { gap: Spacing.xs },
  date: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  noteCard: { padding: Spacing.lg },
  noteCardText: { gap: Spacing.sm },
  noteCardTitle: {
    fontFamily: Fonts.serif,
    fontSize: 19,
  },
  noteCardButton: {
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
  },
  section: { gap: Spacing.sm },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  statsText: { flex: 1, gap: Spacing.xs },
});
