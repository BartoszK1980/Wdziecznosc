import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getState, setState } from '@/db/entries';
import { currentUserId } from '@/sync/supabase';
import { hasNativeModule } from '@/native-runtime';

/**
 * Czy uzytkownik ma wykupiona subskrypcje "bez reklam".
 *
 * SDK RevenueCat ladujemy LENIWIE. Ta sama lekcja co przy expo-notifications:
 * modul natywny nieobecny w Expo Go rzuca wyjatkiem, a statyczny import
 * przenosi ten wyjatek na cala aplikacje. Brak SDK ma wylaczyc zakupy,
 * a nie uniemozliwic pisanie wpisow.
 */

type PurchasesModule = typeof import('react-native-purchases');

/** Nazwa uprawnienia skonfigurowana w panelu RevenueCat. */
const ENTITLEMENT = 'no_ads';
/** Identyfikator oferty rocznej — musi zgadzac sie z produktem w sklepach. */
export const ANNUAL_PACKAGE = 'annual';

const CACHE_KEY = 'premium_cached';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  revenueCatAndroidKey?: string;
  revenueCatIosKey?: string;
};

const apiKey = () =>
  (Platform.OS === 'ios' ? extra.revenueCatIosKey : extra.revenueCatAndroidKey)?.trim() || '';

export const isPurchasingConfigured = () => apiKey().length > 0;

let modulePromise: Promise<PurchasesModule | null> | null = null;
let configured = false;

/** Nazwa modulu natywnego rejestrowanego przez react-native-purchases. */
const NATIVE_MODULE = 'RNPurchases';

function loadPurchases(): Promise<PurchasesModule | null> {
  modulePromise ??= (async () => {
    if (!isPurchasingConfigured()) return null;
    // Sprawdzenie przed importem, z tego samego powodu co przy reklamach —
    // patrz komentarz w native.ts.
    if (!hasNativeModule(NATIVE_MODULE)) return null;

    try {
      return await import('react-native-purchases');
    } catch {
      return null;
    }
  })();
  return modulePromise;
}

async function ready(): Promise<PurchasesModule | null> {
  const Purchases = await loadPurchases();
  if (!Purchases) return null;

  if (!configured) {
    // Wiazemy zakup z naszym user_id z Supabase, a nie z anonimowym id
    // RevenueCata. Dzieki temu subskrypcja wraca razem z wpisami po
    // zalogowaniu na nowym telefonie.
    const appUserId = await currentUserId();
    await Purchases.default.configure({ apiKey: apiKey(), appUserID: appUserId ?? undefined });
    configured = true;
  }
  return Purchases;
}

/**
 * Ostatnio znany stan, czytany z lokalnej bazy.
 *
 * Uzywany przy starcie i bez sieci: reklama nie moze mrugnac u kogos, kto
 * zaplacil, tylko dlatego ze telefon jest w trybie samolotowym.
 */
export async function cachedPremium(): Promise<boolean> {
  return (await getState(CACHE_KEY)) === '1';
}

export async function refreshPremium(): Promise<boolean> {
  const Purchases = await ready();
  if (!Purchases) return cachedPremium();

  try {
    const info = await Purchases.default.getCustomerInfo();
    const active = info.entitlements.active[ENTITLEMENT] !== undefined;
    await setState(CACHE_KEY, active ? '1' : '0');
    return active;
  } catch {
    return cachedPremium();
  }
}

export type Offer = { identifier: string; priceString: string } | null;

/** Roczny pakiet do pokazania na scianie platnosci. */
export async function annualOffer(): Promise<Offer> {
  const Purchases = await ready();
  if (!Purchases) return null;

  try {
    const offerings = await Purchases.default.getOfferings();
    const pkg =
      offerings.current?.annual ??
      offerings.current?.availablePackages.find((p) => p.identifier === ANNUAL_PACKAGE);
    if (!pkg) return null;
    return { identifier: pkg.identifier, priceString: pkg.product.priceString };
  } catch {
    return null;
  }
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error';

export async function purchaseAnnual(): Promise<PurchaseResult> {
  const Purchases = await ready();
  if (!Purchases) return 'unavailable';

  try {
    const offerings = await Purchases.default.getOfferings();
    const pkg =
      offerings.current?.annual ??
      offerings.current?.availablePackages.find((p) => p.identifier === ANNUAL_PACKAGE);
    if (!pkg) return 'unavailable';

    const { customerInfo } = await Purchases.default.purchasePackage(pkg);
    const active = customerInfo.entitlements.active[ENTITLEMENT] !== undefined;
    await setState(CACHE_KEY, active ? '1' : '0');
    return active ? 'purchased' : 'error';
  } catch (error) {
    // RevenueCat oznacza rezygnacje uzytkownika osobna flaga — to nie jest blad
    // i nie wolno pokazywac za to komunikatu o niepowodzeniu.
    if ((error as { userCancelled?: boolean })?.userCancelled) return 'cancelled';
    return 'error';
  }
}

/**
 * Przywrocenie zakupu. Apple WYMAGA tego przycisku w aplikacjach z subskrypcja —
 * bez niego zgloszenie bywa odrzucane.
 */
export async function restorePurchases(): Promise<boolean> {
  const Purchases = await ready();
  if (!Purchases) return false;

  try {
    const info = await Purchases.default.restorePurchases();
    const active = info.entitlements.active[ENTITLEMENT] !== undefined;
    await setState(CACHE_KEY, active ? '1' : '0');
    return active;
  } catch {
    return false;
  }
}

/** Wylacznie do testow bez SDK — pozwala sprawdzic zachowanie aplikacji z premium. */
export async function setPremiumOverride(active: boolean): Promise<void> {
  await setState(CACHE_KEY, active ? '1' : '0');
}
