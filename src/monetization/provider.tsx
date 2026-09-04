import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { gatherConsent, showPrivacyOptions, type ConsentState } from './consent';
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
 * Ekrany nie znaja ani regul monetyzacji, ani stanu subskrypcji, ani zgody —
 * pytaja tylko o placement. Dzieki temu zmiana kanalu monetyzacji nie wymaga
 * dotykania ekranow.
 */
type MonetizationValue = {
  premium: boolean;
  policy: AdPolicy;
  /** Czy trzeba pokazac w ustawieniach wejscie do zmiany zgody. */
  privacyOptionsRequired: boolean;
  /** Czy na tym ekranie wolno teraz pokazac baner. */
  showBanner: (placement: AdPlacement) => boolean;
  /** Ponowne otwarcie formularza zgody z ustawien. */
  openPrivacyOptions: () => Promise<void>;
  refresh: () => Promise<void>;
};

const MonetizationContext = createContext<MonetizationValue | null>(null);

/**
 * Zgoda zaczyna od `canRequestAds: false`.
 *
 * Domyslna odmowa, nie domyslna zgoda: dopoki UMP nie odpowie, nie wolno
 * pokazac ani jednej reklamy. Blad w druga strone jest naruszeniem RODO.
 */
const INITIAL_CONSENT: ConsentState = { canRequestAds: false, privacyOptionsRequired: false };

export function MonetizationProvider({ children }: { children: React.ReactNode }) {
  const [premium, setPremium] = useState(false);
  const [policy, setPolicy] = useState<AdPolicy>(DEFAULT_AD_POLICY);
  const [afterGrace, setAfterGrace] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(INITIAL_CONSENT);

  const refresh = useCallback(async () => {
    await markInstalled();

    // Najpierw stan z cache, zeby pierwsza klatka nie mrugnela reklama komus,
    // kto ma wykupiona subskrypcje.
    setPremium(await cachedPremium());

    const next = await loadAdPolicy();
    setPolicy(next);
    setAfterGrace(await graceExpired(next));

    const active = await refreshPremium();
    setPremium(active);

    // Formularza zgody nie pokazujemy komus, kto zaplacil za brak reklam —
    // nie ma o co pytac, skoro i tak nic mu nie wyswietlimy.
    if (!active) setConsent(await gatherConsent());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openPrivacyOptions = useCallback(async () => {
    setConsent(await showPrivacyOptions());
  }, []);

  const value = useMemo<MonetizationValue>(
    () => ({
      premium,
      policy,
      privacyOptionsRequired: consent.privacyOptionsRequired,
      showBanner: (placement) =>
        policy.enabled &&
        !premium &&
        afterGrace &&
        consent.canRequestAds &&
        policy.banners[placement],
      openPrivacyOptions,
      refresh,
    }),
    [premium, policy, afterGrace, consent, openPrivacyOptions, refresh]
  );

  return <MonetizationContext value={value}>{children}</MonetizationContext>;
}

export function useMonetization(): MonetizationValue {
  const value = use(MonetizationContext);
  if (!value) throw new Error('Brak MonetizationProvider nad tym komponentem');
  return value;
}
