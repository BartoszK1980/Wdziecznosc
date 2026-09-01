import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { Spacing } from '@/constants/theme';
import type { Mood } from '@/db/db';
import { useTheme } from '@/hooks/use-theme';
import { parseDateKey } from '@/i18n/dates';

type Point = { date: string; mood: Mood };

const HEIGHT = 140;
const PADDING = { top: 12, right: 8, bottom: 22, left: 8 };

/**
 * Wykres nastroju w czasie. Rysowany recznie w SVG, bez biblioteki wykresow —
 * to jedna linia lamana na piecu poziomach, a kazda biblioteka dolozylaby
 * kilkaset kilobajtow i wlasny zestaw problemow z motywem.
 *
 * Os X jest porzadkowa, nie kalendarzowa: punkty rozkladaja sie rowno, nawet gdy
 * miedzy wpisami sa dni przerwy. Inaczej przy jednym wpisie na tydzien wykres
 * bylby prawie pusty.
 */
export function MoodChart({ points }: { points: Point[] }) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (points.length < 2) {
    return (
      <View style={styles.placeholder} onLayout={onLayout}>
        <Text style={[styles.hint, { color: colors.textMuted }]}>{t('stats.empty')}</Text>
      </View>
    );
  }

  const innerWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const x = (index: number) =>
    PADDING.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  // nastroj 1 na dole, 5 na gorze
  const y = (mood: Mood) => PADDING.top + innerHeight - ((mood - 1) / 4) * innerHeight;

  const polyline = points.map((point, index) => `${x(index)},${y(point.mood)}`).join(' ');

  const label = (index: number) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'numeric' }).format(
      parseDateKey(points[index].date)
    );

  return (
    <View onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={HEIGHT}>
          {[1, 2, 3, 4, 5].map((level) => (
            <Line
              key={level}
              x1={PADDING.left}
              x2={PADDING.left + innerWidth}
              y1={y(level as Mood)}
              y2={y(level as Mood)}
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}

          <Polyline
            points={polyline}
            fill="none"
            stroke={colors.accent}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((point, index) => (
            <Circle
              key={point.date}
              cx={x(index)}
              cy={y(point.mood)}
              r={4}
              fill={colors.accent}
              stroke={colors.surface}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height: HEIGHT }} />
      )}

      <View style={styles.axis}>
        <Text style={[styles.tick, { color: colors.textMuted }]}>{label(0)}</Text>
        <Text style={[styles.tick, { color: colors.textMuted }]}>{label(points.length - 1)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  hint: { fontSize: 14, textAlign: 'center' },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.md,
  },
  tick: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
