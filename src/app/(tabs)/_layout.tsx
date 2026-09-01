import { Tabs } from 'expo-router';

import { TabBar } from '@/components/tab-bar';

/**
 * Cztery zakladki plus wyniesiony przycisk dodawania posrodku paska.
 * Sam przycisk nie jest zakladka — patrz komentarz w TabBar.
 */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
