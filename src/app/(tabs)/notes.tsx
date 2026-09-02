import { Feather } from '@expo/vector-icons';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '@/components/ad-banner';
import { Calendar } from '@/components/calendar';
import { EntryPhoto } from '@/components/entry-photo';
import { Card, Chip, Heading, Muted } from '@/components/ui';
import { CardShadow, Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { loadDayMetaMap, type DayMeta } from '@/db/days';
import { listDays, type Day, type DayFilter } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';
import { formatDayAndMonth, parseDateKey } from '@/i18n/dates';

const PAGE = 30;
const THUMB = 56;

const FILTERS: { key: DayFilter; label: string; icon?: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'all', label: 'notes.all' },
  { key: 'favorites', label: 'notes.favorites', icon: 'heart' },
  { key: 'photos', label: 'notes.photos', icon: 'image' },
];

type ViewMode = 'list' | 'calendar';

export default function NotesScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const router = useRouter();

  const [view, setView] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<DayFilter>('all');
  const [query, setQuery] = useState('');
  const [days, setDays] = useState<Day[]>([]);
  const [meta, setMeta] = useState<Map<string, DayMeta>>(new Map());
  const [exhausted, setExhausted] = useState(false);

  const refresh = useCallback(async () => {
    const page = await listDays(PAGE, 0, { filter, query });
    setDays(page);
    setMeta(await loadDayMetaMap(page.map((d) => d.date)));
    setExhausted(page.length < PAGE);
  }, [filter, query]);

  // Filtr i fraza zmieniaja zbior wynikow, wiec lista wraca na poczatek.
  useEffect(() => {
    let active = true;
    void listDays(PAGE, 0, { filter, query }).then(async (page) => {
      if (!active) return;
      setDays(page);
      setMeta(await loadDayMetaMap(page.map((d) => d.date)));
      setExhausted(page.length < PAGE);
    });
    return () => {
      active = false;
    };
  }, [filter, query]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const loadMore = useCallback(async () => {
    if (exhausted) return;
    const next = await listDays(PAGE, days.length, { filter, query });
    if (next.length === 0) {
      setExhausted(true);
      return;
    }
    const combined = [...days, ...next];
    setDays(combined);
    setMeta(await loadDayMetaMap(combined.map((d) => d.date)));
    setExhausted(next.length < PAGE);
  }, [days, exhausted, filter, query]);

  const openDay = (date: string) =>
    router.push({ pathname: '/note/[date]', params: { date } });

  const header = (
    <View style={styles.header}>
      <Heading size={26}>{t('notes.title')}</Heading>

      <View style={styles.switcher}>
        <Chip
          label={t('notes.viewList')}
          icon="list"
          selected={view === 'list'}
          onPress={() => setView('list')}
        />
        <Chip
          label={t('notes.viewCalendar')}
          icon="calendar"
          selected={view === 'calendar'}
          onPress={() => setView('calendar')}
        />
      </View>

      {view === 'calendar' ? (
        <Calendar onSelectDay={openDay} />
      ) : (
        <>
          <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('notes.search')}
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={Spacing.sm} accessibilityRole="button">
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.filters}>
            {FILTERS.map((item) => (
              <Chip
                key={item.key}
                label={t(item.label)}
                icon={item.icon}
                selected={filter === item.key}
                onPress={() => setFilter(item.key)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <FlatList
        data={view === 'list' ? days : []}
        keyExtractor={(day) => day.date}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={
          view === 'list' ? (
            <View style={styles.empty}>
              <Muted>{query ? t('notes.noResults') : t('history.emptyHint')}</Muted>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <DayCard
            day={item}
            meta={meta.get(item.date)}
            language={i18n.language}
            // Naglowek miesiaca tylko przy zmianie — lista jest chronologiczna,
            // wiec powtarzanie go przy kazdej karcie byloby szumem.
            month={monthHeading(item, days[index - 1], i18n.language)}
          />
        )}
        onEndReached={() => void loadMore()}
        onEndReachedThreshold={0.5}
      />
      <AdBanner placement="notes" />
    </SafeAreaView>
  );
}

function monthHeading(day: Day, previous: Day | undefined, language: string): string | null {
  const label = (date: string) =>
    new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(
      parseDateKey(date)
    );
  const current = label(day.date);
  if (!previous) return current;
  return current === label(previous.date) ? null : current;
}

function DayCard({
  day,
  meta,
  language,
  month,
}: {
  day: Day;
  meta: DayMeta | undefined;
  language: string;
  month: string | null;
}) {
  const colors = useTheme();
  const { day: dayNumber, month: monthShort } = formatDayAndMonth(day.date, language);
  const photo = day.slots.flatMap((slot) => slot.photos.map((p) => ({ slot, photo: p })))[0];
  const extra = day.slots.length - 3;

  return (
    <View style={styles.cardWrap}>
      {month ? <Text style={[styles.month, { color: colors.text }]}>{month}</Text> : null}

      <Link href={{ pathname: '/note/[date]', params: { date: day.date } }} asChild>
        <Pressable accessibilityRole="button">
          <Card style={styles.card}>
            <View style={styles.dateColumn}>
              <Text style={[styles.dateDay, { color: colors.text }]}>{dayNumber}</Text>
              <Text
                style={[styles.dateMonth, { color: colors.textMuted }]}
                numberOfLines={1}
                // niektore jezyki maja dluzsze skroty miesiaca; zwezenie jest
                // lepsze niz lamanie kolumny albo przyciecie w polowie slowa
                adjustsFontSizeToFit>
                {monthShort.toUpperCase()}
              </Text>
              {meta?.favorite ? <Feather name="heart" size={14} color={colors.accent} /> : null}
            </View>

            <View style={styles.lines}>
              {day.slots.slice(0, 3).map((slot) => (
                <View key={slot.slot} style={styles.line}>
                  <View style={[styles.bullet, { backgroundColor: colors.sage }]} />
                  <Text style={[styles.lineText, { color: colors.text }]} numberOfLines={2}>
                    {slot.text || '—'}
                  </Text>
                </View>
              ))}
              {extra > 0 ? (
                <Text style={[styles.more, { color: colors.textMuted }]}>+{extra}</Text>
              ) : null}
            </View>

            {photo ? (
              <EntryPhoto
                date={day.date}
                slot={photo.slot.slot}
                photo={photo.photo}
                size={THUMB}
              />
            ) : null}
          </Card>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  switcher: { flexDirection: 'row', gap: Spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    ...CardShadow,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  filters: { flexDirection: 'row', gap: Spacing.sm },
  cardWrap: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  month: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    marginTop: Spacing.sm,
    textTransform: 'capitalize',
  },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dateColumn: { alignItems: 'center', gap: 2, width: 42 },
  dateDay: { fontFamily: Fonts.serif, fontSize: 20, fontVariant: ['tabular-nums'] },
  dateMonth: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  lines: { flex: 1, gap: Spacing.xs },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: 8 },
  lineText: { flex: 1, fontSize: 14, lineHeight: 20 },
  more: { fontSize: 12, paddingLeft: Spacing.md },
  empty: { alignItems: 'center', paddingTop: Spacing.xl },
});
