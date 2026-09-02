import { getState, setState } from '@/db/entries';
import { getSupabase } from '@/sync/supabase';

/**
 * Gdzie i kiedy pokazujemy reklamy.
 *
 * To JEDYNE miejsce, w ktorym opisana jest nachalnosc reklam — komponenty pytaja
 * tylko "czy tu wolno", nie znaja zadnych regul. Zmiana kanalu monetyzacji to
 * zmiana tego obiektu, a nie przechodzenie po ekranach.
 *
 * Wartosci ponizej to wybor klienta: baner wylacznie na ekranach przegladania,
 * nigdy przy pisaniu wpisu.
 */
export type AdPlacement = 'today' | 'notes' | 'stats' | 'settings' | 'editor';

export type AdPolicy = {
  /** Wylacza reklamy calkowicie, niezaleznie od reszty ustawien. */
  enabled: boolean;
  /** Ekrany, na ktorych wolno pokazac baner. */
  banners: Record<AdPlacement, boolean>;
  /**
   * Reklama pelnoekranowa co N zapisanych dni. 0 = wylaczona.
   * Zostawione na wypadek, gdyby sam baner okazal sie za slaby.
   */
  interstitialEveryNDays: number;
  /**
   * Ile pierwszych dni bez reklam. Liczone od pierwszego uruchomienia,
   * nie od pierwszego wpisu — inaczej ktos, kto tylko oglada, nigdy by
   * reklam nie zobaczyl.
   */
  graceDays: number;
};

export const DEFAULT_AD_POLICY: AdPolicy = {
  enabled: true,
  banners: {
    today: false,
    notes: true,
    stats: true,
    settings: false,
    editor: false,
  },
  interstitialEveryNDays: 0,
  graceDays: 7,
};

const INSTALLED_AT_KEY = 'installed_at';
const POLICY_CACHE_KEY = 'ad_policy_cache';

/**
 * Nadpisanie z serwera.
 *
 * Bez tego kazda zmiana rozmieszczenia reklam wymagalaby nowego wydania
 * i czekania na przeglad w sklepie — czyli dni albo tygodni na sprawdzenie
 * jednej hipotezy o przychodzie. Tabela w Supabase pozwala przestawic to
 * z dnia na dzien, a ostatnio pobrana wartosc siedzi w cache, wiec aplikacja
 * dziala tak samo bez sieci.
 */
export async function loadAdPolicy(): Promise<AdPolicy> {
  const cached = await getState(POLICY_CACHE_KEY);
  const fallback: AdPolicy = cached ? merge(JSON.parse(cached)) : DEFAULT_AD_POLICY;

  const supabase = getSupabase();
  if (!supabase) return fallback;

  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'ad_policy')
      .maybeSingle();
    if (error || !data?.value) return fallback;

    const policy = merge(data.value as Partial<AdPolicy>);
    await setState(POLICY_CACHE_KEY, JSON.stringify(policy));
    return policy;
  } catch {
    // brak sieci albo brak tabeli — zostajemy przy tym, co znamy
    return fallback;
  }
}

/** Scala czesciowe nadpisanie z domyslnymi, zeby brak pola nie wywalil ekranu. */
function merge(partial: Partial<AdPolicy>): AdPolicy {
  return {
    enabled: partial.enabled ?? DEFAULT_AD_POLICY.enabled,
    banners: { ...DEFAULT_AD_POLICY.banners, ...(partial.banners ?? {}) },
    interstitialEveryNDays:
      partial.interstitialEveryNDays ?? DEFAULT_AD_POLICY.interstitialEveryNDays,
    graceDays: partial.graceDays ?? DEFAULT_AD_POLICY.graceDays,
  };
}

/** Zapisuje date pierwszego uruchomienia, jesli jeszcze jej nie ma. */
export async function markInstalled(): Promise<void> {
  if (!(await getState(INSTALLED_AT_KEY))) {
    await setState(INSTALLED_AT_KEY, new Date().toISOString());
  }
}

/** Czy okres bez reklam dla nowego uzytkownika juz minal. */
export async function graceExpired(policy: AdPolicy): Promise<boolean> {
  if (policy.graceDays <= 0) return true;

  const installedAt = await getState(INSTALLED_AT_KEY);
  if (!installedAt) return false;

  const elapsedDays = (Date.now() - new Date(installedAt).getTime()) / 86_400_000;
  return elapsedDays >= policy.graceDays;
}
