import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoodChart } from '@/components/mood-chart';
import { Card, Heading, Muted, SectionLabel, StatTile } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { loadStats, type Stats } from '@/db/days';
import { useTheme } from '@/hooks/use-theme';

export default function StatsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadStats().then((next) => {
        if (active) setStats(next);
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const empty = stats !== null && stats.days === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.column}>
          <Heading size={26}>{t('stats.title')}</Heading>

          {empty ? (
            <Card style={styles.emptyCard}>
              <Muted>{t('stats.empty')}</Muted>
            </Card>
          ) : (
            <>
              <Card warm style={styles.streakCard}>
                <View style={styles.streakText}>
                  <Text style={[styles.streakTitle, { color: colors.text }]}>{t('stats.streak')}</Text>
                  <Text style={[styles.streakValue, { color: colors.text }]}>
                    {stats?.streak ?? 0}
                  </Text>
                  <Muted size={14}>{t('stats.streakUnit')}</Muted>
                </View>
                <Text style={styles.flame}>🔥</Text>
              </Card>

              <View style={styles.section}>
                <SectionLabel>{t('stats.summary')}</SectionLabel>
                <View style={styles.tiles}>
                  <StatTile value={stats?.days ?? 0} label={t('stats.days')} />
                  <StatTile value={stats?.entries ?? 0} label={t('stats.entries')} />
                  <StatTile value={stats?.streak ?? 0} label={t('stats.streakShort')} />
                </View>
              </View>

              <View style={styles.section}>
                <SectionLabel>{t('stats.moodChart')}</SectionLabel>
                <Card>
                  <MoodChart points={stats?.moods ?? []} />
                </Card>
              </View>

              {stats && stats.tags.length > 0 ? (
                <View style={styles.section}>
                  <SectionLabel>{t('stats.topTags')}</SectionLabel>
                  <View style={styles.tags}>
                    {stats.tags.map(({ tag, count }) => (
                      <View
                        key={tag}
                        style={[
                          styles.tag,
                          { backgroundColor: colors.surfaceWarm, borderColor: colors.border },
                        ]}>
                        <Text style={[styles.tagLabel, { color: colors.text }]}>{t(`tags.${tag}`)}</Text>
                        <Text style={[styles.tagCount, { color: colors.textMuted }]}>{count}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    alignItems: 'center',
  },
  column: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.lg,
  },
  emptyCard: { alignItems: 'center', paddingVertical: Spacing.xl },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  streakText: { gap: 0 },
  streakTitle: { fontSize: 15, fontWeight: '600' },
  streakValue: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    lineHeight: 48,
    fontVariant: ['tabular-nums'],
  },
  flame: { fontSize: 40 },
  section: { gap: Spacing.sm },
  tiles: { flexDirection: 'row', gap: Spacing.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagLabel: { fontSize: 14, fontWeight: '500' },
  tagCount: { fontSize: 13, fontVariant: ['tabular-nums'] },
});
