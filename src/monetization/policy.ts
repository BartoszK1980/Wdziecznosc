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
  /**
   * Po ilu dniach od instalacji sami proponujemy wersje bez reklam.
   * 0 = nigdy, propozycja zostaje tylko w ustawieniach.
   *
   * Liczone od instalacji, tak jak graceDays. Musi byc WIEKSZE od graceDays:
   * proponowanie usuniecia reklam komus, kto jeszcze zadnej nie widzial,
   * nie ma sensu — nie wie, za co mialby placic.
   */
  upsellAfterDays: number;
  /**
   * Co ile dni ponowic propozycje, jesli uzytkownik jej nie przyjal.
   * 0 = tylko raz.
   */
  upsellRepeatDays: number;
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
  // Trzy dni po pojawieniu sie pierwszego banera: uzytkownik juz wie, jak
  // reklama wyglada, a jeszcze nie przywykl do niej na tyle, by ja ignorowac.
  upsellAfterDays: 10,
  upsellRepeatDays: 30,
};

const INSTALLED_AT_KEY = 'installed_at';
const POLICY_CACHE_KEY = 'ad_policy_cache';
const UPSELL_SHOWN_KEY = 'upsell_last_shown_at';

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
    upsellAfterDays: partial.upsellAfterDays ?? DEFAULT_AD_POLICY.upsellAfterDays,
    upsellRepeatDays: partial.upsellRepeatDays ?? DEFAULT_AD_POLICY.upsellRepeatDays,
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

  return daysSince(installedAt) >= policy.graceDays;
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * Czy pora samemu zaproponowac wersje bez reklam.
 *
 * Nie sprawdza subskrypcji ani dostepnosci oferty — to robi provider, bo tylko
 * on wie, czy uzytkownik juz zaplacil i czy sklep zwrocil cene.
 */
export async function upsellDue(policy: AdPolicy): Promise<boolean> {
  // Bez reklam nie ma czego usuwac.
  if (!policy.enabled || policy.upsellAfterDays <= 0) return false;

  const installedAt = await getState(INSTALLED_AT_KEY);
  if (!installedAt || daysSince(installedAt) < policy.upsellAfterDays) return false;

  const lastShown = await getState(UPSELL_SHOWN_KEY);
  if (!lastShown) return true;
  if (policy.upsellRepeatDays <= 0) return false;
  return daysSince(lastShown) >= policy.upsellRepeatDays;
}

/**
 * Zapisywane PRZED pokazaniem ekranu, nie po zamknieciu. Gdyby aplikacja
 * padla albo zostala zabita w trakcie, propozycja nie moze wracac przy
 * kazdym kolejnym uruchomieniu.
 */
export async function markUpsellShown(): Promise<void> {
  await setState(UPSELL_SHOWN_KEY, new Date().toISOString());
}
