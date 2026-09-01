import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CardShadow, Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Naglowek pisany serifem (Lora) — zgodnie z kierunkiem z konceptu. */
export function Heading({
  children,
  size = 28,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  return (
    <Text
      style={[
        { fontFamily: Fonts.serif, fontSize: size, lineHeight: size * 1.25, color: colors.text },
        style as never,
      ]}>
      {children}
    </Text>
  );
}

export function Muted({ children, size = 15 }: { children: React.ReactNode; size?: number }) {
  const colors = useTheme();
  return <Text style={{ fontSize: size, lineHeight: size * 1.4, color: colors.textMuted }}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const colors = useTheme();
  return <Text style={[styles.sectionLabel, { color: colors.text }]}>{children}</Text>;
}

/** Biala karta na kremowym tle. `warm` przelacza na cieply bez z konceptu. */
export function Card({
  children,
  warm = false,
  style,
}: {
  children: React.ReactNode;
  warm?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.card,
        CardShadow,
        { backgroundColor: warm ? colors.surfaceWarm : colors.surface },
        style,
      ]}>
      {children}
    </View>
  );
}

export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled = false,
  style,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.accent, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {icon ? <Feather name={icon} size={18} color={colors.surface} /> : null}
      <Text style={[styles.buttonLabel, { color: colors.surface }]}>{label}</Text>
    </Pressable>
  );
}

/** Pigulka filtra / tagu. Zaznaczona wypelnia sie ciemna zielenia. */
export function Chip({
  label,
  icon,
  selected = false,
  onPress,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  selected?: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={selected ? { selected: true } : {}}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.border,
        },
      ]}>
      {icon ? (
        <Feather name={icon} size={14} color={selected ? colors.surface : colors.textMuted} />
      ) : null}
      <Text style={[styles.chipLabel, { color: selected ? colors.surface : colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Kafelek liczbowy z ekranu Statystyk. */
export function StatTile({ value, label }: { value: number | string; label: string }) {
  const colors = useTheme();
  return (
    <Card style={styles.tile}>
      <Text style={[styles.tileValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.textMuted }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.md,
  },
  tileValue: {
    fontFamily: Fonts.serif,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    fontSize: 12,
  },
});
