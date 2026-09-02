import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { cachedPremium, refreshPremium } from './entitlement';
import {
  DEFAULT_AD_POLICY,
  graceExpired,
  loadAdPolicy,
  markInstalled,
  type AdPlacement,
  type AdPolicy,
} from './policy';

/**
 * Jedno miejsce, ktore odpowiada na pytanie "czy pokazac tu reklame".
 *
 * Ekrany nie znaja ani regul, ani stanu subskrypcji — pytaja tylko o placement.
 * Dzieki temu zmiana kanalu monetyzacji nie wymaga dotykania ekranow.
 */
type MonetizationValue = {
  premium: boolean;
  policy: AdPolicy;
  /** Czy na tym ekranie wolno teraz pokazac baner. */
  showBanner: (placement: AdPlacement) => boolean;
  refresh: () => Promise<void>;
};

const MonetizationContext = createContext<MonetizationValue | null>(null);

export function MonetizationProvider({ children }: { children: React.ReactNode }) {
  const [premium, setPremium] = useState(false);
  const [policy, setPolicy] = useState<AdPolicy>(DEFAULT_AD_POLICY);
  const [afterGrace, setAfterGrace] = useState(false);

  const refresh = useCallback(async () => {
    await markInstalled();

    // Najpierw stan z cache, zeby pierwsza klatka nie mrugnela reklama komus,
    // kto ma wykupiona subskrypcje.
    setPremium(await cachedPremium());

    const next = await loadAdPolicy();
    setPolicy(next);
    setAfterGrace(await graceExpired(next));
    setPremium(await refreshPremium());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<MonetizationValue>(
    () => ({
      premium,
      policy,
      showBanner: (placement) =>
        policy.enabled && !premium && afterGrace && policy.banners[placement],
      refresh,
    }),
    [premium, policy, afterGrace, refresh]
  );

  return <MonetizationContext value={value}>{children}</MonetizationContext>;
}

export function useMonetization(): MonetizationValue {
  const value = use(MonetizationContext);
  if (!value) throw new Error('Brak MonetizationProvider nad tym komponentem');
  return value;
}
