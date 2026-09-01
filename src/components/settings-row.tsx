import { StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
}

export function Row({
  label,
  value,
  selected = false,
  last = false,
}: {
  label: string;
  value?: string;
  selected?: boolean;
  last?: boolean;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {value ? <Text style={[styles.value, { color: colors.textMuted }]}>{value}</Text> : null}
      {selected ? <Text style={[styles.check, { color: colors.accent }]}>✓</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  value: {
    fontSize: 15,
  },
  check: {
    fontSize: 16,
    fontWeight: '700',
  },
});
