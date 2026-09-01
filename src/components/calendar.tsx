import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from './ui';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { dateKey, isEditable } from '@/db/db';
import { datesWithContent } from '@/db/entries';
import { useTheme } from '@/hooks/use-theme';

const CELL_HEIGHT = 46;

/** Poniedzialek jako pierwszy dzien — tak dziala kalendarz w Polsce i wiekszosci Europy. */
const FIRST_DAY_OF_WEEK = 1;

type Props = {
  onSelectDay: (date: string) => void;
};

export function Calendar({ onSelectDay }: Props) {
  const { i18n } = useTranslation();
  const colors = useTheme();

  const today = dateKey();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [filled, setFilled] = useState<Set<string>>(new Set());

  const weeks = useMemo(() => buildMonth(cursor.year, cursor.month), [cursor]);

  const load = useCallback(async () => {
    const days = weeks.flat().filter(Boolean) as string[];
    if (days.length === 0) return;
    setFilled(await datesWithContent(days[0], days[days.length - 1]));
  }, [weeks]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthLabel = new Intl.DateTimeFormat(i18n.language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(cursor.year, cursor.month, 1));

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    // 2024-01-01 byl poniedzialkiem — wygodny punkt zaczepienia dla nazw dni.
    return Array.from({ length: 7 }, (_, i) =>
      formatter.format(new Date(2024, 0, 1 + i)).replace(/\.$/, '')
    );
  }, [i18n.language]);

  const shift = (delta: number) =>
    setCursor(({ year, month }) => {
      const next = new Date(year, month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} hitSlop={Spacing.md} accessibilityRole="button">
          <Feather name="chevron-left" size={22} color={colors.accent} />
        </Pressable>
        <Text style={[styles.month, { color: colors.text }]}>{monthLabel}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={Spacing.md} accessibilityRole="button">
          <Feather name="chevron-right" size={22} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.week}>
        {weekdayLabels.map((label, index) => (
          <Text key={index} style={[styles.weekday, { color: colors.textMuted }]}>
            {label}
          </Text>
        ))}
      </View>

      {weeks.map((week, index) => (
        <View key={index} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (!day) return <View key={dayIndex} style={styles.cell} />;

            const isToday = day === today;
            const editable = isEditable(day, today);
            const future = day > today;
            const hasContent = filled.has(day);

            return (
              <Pressable
                key={dayIndex}
                disabled={future}
                onPress={() => onSelectDay(day)}
                accessibilityRole="button"
                style={[
                  styles.cell,
                  isToday && { backgroundColor: colors.accent, borderRadius: Radius.pill },
                ]}>
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isToday
                        ? colors.surface
                        : future
                          ? colors.border
                          : editable
                            ? colors.text
                            : colors.textMuted,
                    },
                  ]}>
                  {Number(day.slice(8))}
                </Text>
                <View
                  style={[
                    styles.dot,
                    hasContent && {
                      backgroundColor: isToday ? colors.surface : colors.sage,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

/**
 * Miesiac jako tablica tygodni. `null` to komorka przed pierwszym albo po
 * ostatnim dniu miesiaca — rysujemy ja pusta, zamiast doklejac dni sasiednich
 * miesiecy, ktore mylilyby przy dotykaniu.
 */
function buildMonth(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() - FIRST_DAY_OF_WEEK + 7) % 7;

  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  const pad = (n: number) => String(n).padStart(2, '0');
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

const styles = StyleSheet.create({
  card: { gap: Spacing.xs, paddingHorizontal: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  month: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    textTransform: 'capitalize',
  },
  week: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingBottom: Spacing.xs,
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayNumber: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  dot: {
    width: 6,
    height: 6,
    // Przy 5 px i promieniu 3 Android rysowal kwadrat — zaokraglenie musi byc
    // wyraznie wieksze od polowy boku, zeby wyszlo kolo.
    borderRadius: Radius.pill,
    backgroundColor: 'transparent',
  },
});
