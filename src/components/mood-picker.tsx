import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Radius, Spacing } from '@/constants/theme';
import { MOODS, type Mood } from '@/db/db';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 44;

/**
 * Buzki rysowane wektorowo, nie emoji.
 *
 * Emoji renderuje sie inaczej na kazdej platformie i wersji systemu, a tu chodzi
 * o rzad piecu ikon roznicych sie wylacznie krzywizna ust. Przy emoji ten rzad
 * wygladalby inaczej na iOS niz na Androidzie i nie dalby sie pomalowac paleta.
 */
const MOUTH: Record<Mood, string> = {
  1: 'M7 15.5 Q12 11 17 15.5', // wyrazny grymas
  2: 'M7 14.5 Q12 12 17 14.5', // lekki grymas
  3: 'M7.5 14 H16.5', // prosta
  4: 'M7 13 Q12 16 17 13', // lekki usmiech
  5: 'M6.5 12.5 Q12 17.5 17.5 12.5', // szeroki usmiech
};

export function MoodPicker({
  value,
  onChange,
}: {
  value: Mood | null;
  onChange: (mood: Mood) => void;
}) {
  const { t } = useTranslation();
  const colors = useTheme();

  return (
    <View style={styles.row}>
      {MOODS.map((mood) => {
        const selected = value === mood;
        const stroke = selected ? colors.surface : colors.textMuted;

        return (
          <Pressable
            key={mood}
            accessibilityRole="button"
            accessibilityLabel={t(`mood.m${mood}`)}
            accessibilityState={selected ? { selected: true } : {}}
            onPress={() => onChange(mood)}
            style={[
              styles.item,
              {
                backgroundColor: selected ? colors.accent : colors.surfaceWarm,
                borderColor: selected ? colors.accent : colors.border,
              },
            ]}>
            <Svg width={24} height={24} viewBox="0 0 24 24">
              <Circle cx={9} cy={9.5} r={1.3} fill={stroke} />
              <Circle cx={15} cy={9.5} r={1.3} fill={stroke} />
              <Path
                d={MOUTH[mood]}
                stroke={stroke}
                strokeWidth={1.8}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  item: {
    width: SIZE,
    height: SIZE,
    flex: 1,
    maxWidth: SIZE + 8,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
