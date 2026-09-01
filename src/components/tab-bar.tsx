import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardShadow, Radius, Spacing } from '@/constants/theme';
import { dateKey } from '@/db/db';
import { useTheme } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, IconName> = {
  index: 'home',
  notes: 'file-text',
  stats: 'bar-chart-2',
  settings: 'settings',
};

const LABELS: Record<string, string> = {
  index: 'today.title',
  notes: 'notes.title',
  stats: 'stats.title',
  settings: 'settings.title',
};

const FAB_SIZE = 56;

/**
 * Wlasny pasek zakladek, bo koncept ma posrodku wyniesiony przycisk dodawania.
 * Natywne zakladki systemowe nie umieja takiego elementu — daloby sie go tylko
 * doklejic nad paskiem, co rozjezdza sie przy roznych wysokosciach bezpiecznego
 * obszaru.
 *
 * Przycisk "+" NIE jest zakladka: nie ma wlasnego ekranu w nawigatorze, tylko
 * otwiera edytor dzisiejszego dnia jako okno modalne.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const left = state.routes.slice(0, 2);
  const right = state.routes.slice(2, 4);

  const renderTab = (route: (typeof state.routes)[number]) => {
    const index = state.routes.findIndex((candidate) => candidate.key === route.key);
    const focused = state.index === index;
    const color = focused ? colors.accent : colors.textMuted;

    return (
      <Pressable
        key={route.key}
        style={styles.tab}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        }}>
        <Feather name={ICONS[route.name] ?? 'circle'} size={22} color={color} />
        <Text numberOfLines={1} style={[styles.label, { color }, focused && styles.labelActive]}>
          {t(LABELS[route.name] ?? route.name)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Spacing.sm),
        },
      ]}>
      {left.map(renderTab)}

      <View style={styles.fabSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.addNote')}
          onPress={() => router.push({ pathname: '/note/[date]', params: { date: dateKey() } })}
          style={[styles.fab, { backgroundColor: colors.accent }, CardShadow]}>
          <Feather name="plus" size={26} color={colors.bg} />
        </Pressable>
      </View>

      {right.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.xs,
  },
  label: {
    fontSize: 11,
  },
  labelActive: {
    fontWeight: '600',
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // wyniesiony ponad pasek, jak w koncepcie
    marginTop: -Spacing.lg,
  },
});
