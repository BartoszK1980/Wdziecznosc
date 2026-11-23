import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { TabBar } from '@/components/tab-bar';
import { useMonetization } from '@/monetization/provider';

/**
 * Cztery zakladki plus wyniesiony przycisk dodawania posrodku paska.
 * Sam przycisk nie jest zakladka — patrz komentarz w TabBar.
 */
export default function TabsLayout() {
  useUpsellOnce();

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="notes" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

/**
 * Pokazuje propozycje wersji bez reklam, gdy provider uzna, ze pora.
 *
 * Siedzi w ukladzie zakladek, a nie w glownym ukladzie aplikacji: dzieki temu
 * nie wyskoczy nad edytorem wpisu ani przed odblokowaniem aplikacji
 * (zakladki renderuja sie dopiero za LockGate).
 */
function useUpsellOnce() {
  const router = useRouter();
  const { upsellDue, consumeUpsell } = useMonetization();

  useEffect(() => {
    if (!upsellDue) return;
    void consumeUpsell();
    router.push({ pathname: '/premium', params: { source: 'upsell' } });
  }, [upsellDue, consumeUpsell, router]);
}
