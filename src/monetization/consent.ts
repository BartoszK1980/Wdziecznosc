import { hasNativeModule } from '@/native-runtime';

/**
 * Zgoda na reklamy spersonalizowane (Google User Messaging Platform).
 *
 * W Europejskim Obszarze Gospodarczym i Wielkiej Brytanii AdMob WYMAGA, zeby
 * przed pierwsza reklama pokazac uzytkownikowi formularz zgody. Bez tego
 * wyswietlanie reklam narusza RODO i zasady samego AdMob. Poza EOG formularz
 * zwykle nie jest wymagany i `gatherConsent` po prostu nic nie pokazuje —
 * dlatego wolno (i trzeba) wolac to zawsze, a nie zgadywac lokalizacji
 * po stronie aplikacji.
 *
 * Kolejnosc jest scisle okreslona przez Google:
 *   1. zebrac zgode,
 *   2. dopiero potem zainicjalizowac SDK reklam,
 *   3. dopiero potem ladowac jakakolwiek reklame.
 * Odwrocenie tej kolejnosci to najczestszy blad przy wdrazaniu UMP.
 */

type AdsModule = typeof import('react-native-google-mobile-ads');

/** Ten sam modul natywny co reklamy — UMP jedzie w tej samej bibliotece. */
const NATIVE_MODULE = 'RNGoogleMobileAdsModule';

export type ConsentState = {
  /** Czy wolno ladowac reklamy. Fałsz = uzytkownik nie wyrazil zgody. */
  canRequestAds: boolean;
  /**
   * Czy trzeba dac uzytkownikowi mozliwosc zmiany decyzji.
   * Google wymaga wtedy wejscia w ustawieniach — nie wolno go ukryc.
   */
  privacyOptionsRequired: boolean;
};

/**
 * Gdy SDK nie ma (Expo Go), reklam i tak nie bedzie, wiec `canRequestAds`
 * moze byc prawda — decyzje i tak podejmuje AdBanner, ktory bez modulu
 * rysuje pole zastepcze.
 */
const NO_SDK: ConsentState = { canRequestAds: true, privacyOptionsRequired: false };

async function loadModule(): Promise<AdsModule | null> {
  if (!hasNativeModule(NATIVE_MODULE)) return null;
  try {
    return await import('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

function toState(info: {
  canRequestAds: boolean;
  privacyOptionsRequirementStatus: string;
}): ConsentState {
  return {
    canRequestAds: info.canRequestAds,
    // Biblioteka zwraca 'REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN'.
    privacyOptionsRequired: info.privacyOptionsRequirementStatus === 'REQUIRED',
  };
}

/**
 * Zbiera zgode i w razie potrzeby pokazuje formularz. Wolane raz przy starcie.
 *
 * Blad NIE moze wywrocic aplikacji ani zablokowac pisania wpisow — w takiej
 * sytuacji zwracamy brak zgody, czyli reklam nie bedzie. To bezpieczniejsza
 * strona pomylki niz pokazanie reklamy komus, kto zgody nie wyrazil.
 */
export async function gatherConsent(): Promise<ConsentState> {
  const mod = await loadModule();
  if (!mod) return NO_SDK;

  try {
    const info = await mod.AdsConsent.gatherConsent();
    return toState(info);
  } catch {
    return { canRequestAds: false, privacyOptionsRequired: false };
  }
}

/** Ponowne otwarcie formularza z ustawien — wymagane przez Google. */
export async function showPrivacyOptions(): Promise<ConsentState> {
  const mod = await loadModule();
  if (!mod) return NO_SDK;

  try {
    const info = await mod.AdsConsent.showPrivacyOptionsForm();
    return toState(info);
  } catch {
    // Uzytkownik zamknal formularz albo nie da sie go pokazac — zostawiamy
    // stan bez zmian, pytajac SDK o to, co wie teraz.
    try {
      return toState(await mod.AdsConsent.getConsentInfo());
    } catch {
      return { canRequestAds: false, privacyOptionsRequired: true };
    }
  }
}
