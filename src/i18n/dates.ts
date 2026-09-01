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

/** np. "poniedziałek, 31 sierpnia" — rok tylko wtedy, gdy nie jest biezacy. */
export function formatLongDate(key: string, language: string): string {
  const date = parseDateKey(key);
  const includeYear = date.getFullYear() !== new Date().getFullYear();

  return new Intl.DateTimeFormat(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

/** Krotszy wariant do naglowkow kart w historii. */
export function formatShortDate(key: string, language: string): string {
  const date = parseDateKey(key);
  const includeYear = date.getFullYear() !== new Date().getFullYear();

  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    ...(includeYear ? { year: 'numeric' } : {}),
  }).format(date);
}

export function formatTime(hour: number, minute: number, language: string): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat(language, { hour: 'numeric', minute: '2-digit' }).format(date);
}
