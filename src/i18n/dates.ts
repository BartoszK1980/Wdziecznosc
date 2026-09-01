/**
 * Formatowanie dat idzie przez Intl, nigdy przez reczne sklejanie.
 * Kazdy z siedmiu jezykow ma inny porzadek i interpunkcje ("31 sierpnia",
 * "31. August", "August 31") — recznie zbudowany naglowek bylby poprawny
 * najwyzej w jednym z nich.
 */

/**
 * 'YYYY-MM-DD' -> lokalna polnoc tego dnia.
 *
 * Celowo NIE `new Date(key)`: ten konstruktor traktuje sam ciag daty jako UTC,
 * wiec w strefie Europe/Warsaw wypadlby na poprzedni dzien.
 */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Podnosi TYLKO pierwsza litere.
 *
 * CSS-owe `textTransform: 'capitalize'` podnosi kazde slowo, przez co polski
 * "wtorek, 1 września" stawal sie "Wtorek, 1 Września" — nazwy miesiecy pisze
 * sie po polsku mala litera. To samo dotyczy wiekszosci obslugiwanych jezykow;
 * wyjatkiem jest angielski i niemiecki, gdzie Intl i tak zwraca wielka litere.
 */
const capitalizeFirst = (value: string) =>
  value.charAt(0).toLocaleUpperCase() + value.slice(1);

/** np. "Poniedziałek, 31 sierpnia" — rok tylko wtedy, gdy nie jest biezacy. */
export function formatLongDate(key: string, language: string): string {
  const date = parseDateKey(key);
  const includeYear = date.getFullYear() !== new Date().getFullYear();

  return capitalizeFirst(
    new Intl.DateTimeFormat(language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).format(date)
  );
}

/** Krotszy wariant do naglowkow kart w historii. */
export function formatShortDate(key: string, language: string): string {
  const date = parseDateKey(key);
  const includeYear = date.getFullYear() !== new Date().getFullYear();

  return capitalizeFirst(
    new Intl.DateTimeFormat(language, {
      day: 'numeric',
      month: 'long',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).format(date)
  );
}

/**
 * Dzien i skrot miesiaca ROZDZIELNIE, do kolumny daty na karcie notatki.
 *
 * Celowo przez formatToParts, a nie przez dzielenie sformatowanego napisu po
 * spacji: kolejnosc czlonow zalezy od jezyka ("1 września", ale "September 1"),
 * wiec podzial po spacji trafialby raz w dzien, a raz w miesiac.
 */
export function formatDayAndMonth(
  key: string,
  language: string
): { day: string; month: string } {
  const parts = new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
  }).formatToParts(parseDateKey(key));

  return {
    day: parts.find((part) => part.type === 'day')?.value ?? '',
    month: (parts.find((part) => part.type === 'month')?.value ?? '')
      // czesc jezykow dokleja kropke do skrotu ("wrz.", "sept.")
      .replace(/\.$/, ''),
  };
}

export function formatTime(hour: number, minute: number, language: string): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(date);
}
