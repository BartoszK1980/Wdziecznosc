import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { hasNativeModule } from '@/native-runtime';

/**
 * Dostep do SDK reklam.
 *
 * Modul natywny nieobecny w Expo Go wywraca aplikacje, wiec najpierw pytamy
 * rejestr, czy w ogole istnieje, i dopiero potem go importujemy.
 */

export type AdsModule = typeof import('react-native-google-mobile-ads');

/**
 * Publiczne identyfikatory testowe Google.
 *
 * Dzialaja bez konta AdMob i zawsze zwracaja reklame testowa, wiec pozwalaja
 * sprawdzic layout i zachowanie jeszcze przed zalozeniem konta. NIGDY nie wolno
 * wydac aplikacji z prawdziwym identyfikatorem na wlasnych urzadzeniach
 * testowych — klikanie wlasnych reklam produkcyjnych konczy sie zablokowaniem
 * konta AdMob.
 */
const TEST_BANNER = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
};

const extra = (Constants.expoConfig?.extra ?? {}) as {
  admobBannerAndroid?: string;
  admobBannerIos?: string;
};

/** Prawdziwy identyfikator z konfiguracji, a w jego braku — testowy Google. */
export function bannerUnitId(): string {
  const configured = Platform.OS === 'ios' ? extra.admobBannerIos : extra.admobBannerAndroid;
  const trimmed = configured?.trim();
  if (trimmed) return trimmed;
  return Platform.OS === 'ios' ? TEST_BANNER.ios : TEST_BANNER.android;
}

/** Czy pracujemy na identyfikatorach testowych (do oznaczenia w interfejsie). */
export function usingTestUnit(): boolean {
  const configured = Platform.OS === 'ios' ? extra.admobBannerIos : extra.admobBannerAndroid;
  return !configured?.trim();
}

let modulePromise: Promise<AdsModule | null> | null = null;
let initialised = false;

/** Nazwa modulu natywnego rejestrowanego przez react-native-google-mobile-ads. */
const NATIVE_MODULE = 'RNGoogleMobileAdsModule';

/**
 * Zwraca SDK reklam, inicjalizujac je przy pierwszym uzyciu.
 *
 * WAZNE: wolno to wywolac dopiero PO zebraniu zgody (src/monetization/consent.ts).
 * Google wymaga kolejnosci zgoda -> inicjalizacja -> ladowanie reklamy, a
 * `initialize()` wywolane wczesniej potrafi wyslac zadanie jeszcze zanim
 * uzytkownik cokolwiek zdecydowal. Pilnuje tego MonetizationProvider: baner
 * nie renderuje sie, dopoki `canRequestAds` nie jest prawda.
 */
export function loadAds(): Promise<AdsModule | null> {
  modulePromise ??= (async () => {
    // Sprawdzenie MUSI byc przed importem. Biblioteka wola getEnforcing
    // w zasiegu modulu, a ten wyjatek nie da sie zlapac przy `await` —
    // szczegoly w komentarzu w native.ts.
    if (!hasNativeModule(NATIVE_MODULE)) return null;

    try {
      const mod = await import('react-native-google-mobile-ads');
      if (!initialised) {
        await mod.default().initialize();
        initialised = true;
      }
      return mod;
    } catch {
      return null;
    }
  })();
  return modulePromise;
}

export async function adsAvailable(): Promise<boolean> {
  return (await loadAds()) !== null;
}
