import * as SQLite from 'expo-sqlite';

/**
 * Lokalna baza jest ZRODLEM PRAWDY dla UI — ekrany nigdy nie czekaja na siec.
 * Synchronizacja z Supabase dokleja sie do tego w tle (src/sync/sync.ts).
 *
 * Wszedzie trzymamy sie tej samej sztuczki: wiersz ma STALA pozycje w swoim
 * kontenerze (slot w dniu, position w slocie). "Usuniecie" to wyczyszczenie
 * pozycji, a nie DELETE — dzieki temu synchronizacja nie potrzebuje znacznikow
 * usuniecia, bo pusty wiersz sam w sobie niesie informacje "tu nic nie ma".
 */

export const MAX_SLOTS = 10;
export const SLOTS = Array.from({ length: MAX_SLOTS }, (_, i) => i + 1);
export type Slot = number;

/** Ile zdjec moze wisiec przy JEDNEJ wdziecznosci. */
export const MAX_PHOTOS_PER_SLOT = 3;
export const PHOTO_POSITIONS = Array.from({ length: MAX_PHOTOS_PER_SLOT }, (_, i) => i + 1);

/** Ile dni wstecz wolno jeszcze edytowac. Starsze dni sa tylko do odczytu. */
export const EDIT_WINDOW_DAYS = 7;

export const MOODS = [1, 2, 3, 4, 5] as const;
export type Mood = (typeof MOODS)[number];

/**
 * Kategorie z ekranu Statystyk w koncepcie. Makieta pokazuje je w podsumowaniu,
 * ale nigdzie ich nie wpisuje — dlatego trafily do edytora jako chipy do
 * zaznaczenia. Automatyczne zgadywanie z tresci nie zadziala w siedmiu jezykach.
 */
export const TAGS = ['family', 'health', 'friends', 'nature', 'growth', 'small'] as const;
export type Tag = (typeof TAGS)[number];

export type EntryRow = {
  entry_date: string; // 'YYYY-MM-DD', czas LOKALNY
  slot: number;
  text: string | null;
  updated_at: string; // ISO 8601
  dirty: number; // 1 = wiersz czeka na wypchniecie
};

export type PhotoRow = {
  entry_date: string;
  slot: number;
  position: number; // 1..MAX_PHOTOS_PER_SLOT
  /** Plik w documentDirectory/photos/. Zawsze wyswietlamy stad, jesli jest. */
  local_uri: string | null;
  /** Sciezka w buckecie Supabase. NULL dopoki zdjecie nie zostalo wyslane. */
  path: string | null;
  updated_at: string;
  dirty: number;
  photo_dirty: number; // 1 = plik lokalny czeka na upload
};

export type AudioRow = {
  entry_date: string;
  slot: number;
  /** Plik w documentDirectory/audio/. Zawsze odtwarzamy stad, jesli jest. */
  local_uri: string | null;
  /** Sciezka w buckecie Supabase. NULL dopoki nagranie nie zostalo wyslane. */
  path: string | null;
  duration_ms: number | null;
  updated_at: string;
  dirty: number;
  audio_dirty: number; // 1 = plik lokalny czeka na upload
};

export type DayRow = {
  entry_date: string;
  mood: number | null;
  favorite: number;
  note: string | null;
  tags: string; // JSON
  updated_at: string;
  dirty: number;
};

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS entries (
  entry_date TEXT    NOT NULL,
  slot       INTEGER NOT NULL CHECK (slot >= 1 AND slot <= ${MAX_SLOTS}),
  text       TEXT,
  updated_at TEXT    NOT NULL,
  dirty      INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (entry_date, slot)
);

CREATE INDEX IF NOT EXISTS entries_dirty_idx ON entries (dirty) WHERE dirty = 1;

-- Zdjecia wisza przy KONKRETNEJ wdziecznosci, nie przy dniu. Stala pozycja
-- 1..3 w obrebie slotu, wiec usuniecie zdjecia to wyzerowanie wiersza.
CREATE TABLE IF NOT EXISTS entry_photos (
  entry_date  TEXT    NOT NULL,
  slot        INTEGER NOT NULL,
  position    INTEGER NOT NULL CHECK (position >= 1 AND position <= ${MAX_PHOTOS_PER_SLOT}),
  local_uri   TEXT,
  path        TEXT,
  updated_at  TEXT    NOT NULL,
  dirty       INTEGER NOT NULL DEFAULT 1,
  photo_dirty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entry_date, slot, position)
);

CREATE INDEX IF NOT EXISTS entry_photos_day_idx ON entry_photos (entry_date, slot);
CREATE INDEX IF NOT EXISTS entry_photos_dirty_idx ON entry_photos (dirty, photo_dirty);

-- Wlasciwosci calego DNIA, nie pojedynczej wdziecznosci: nastroj, ulubiony,
-- notatka dodatkowa i tagi. Dzien ma jeden nastroj, nie dziesiec.
CREATE TABLE IF NOT EXISTS days (
  entry_date TEXT PRIMARY KEY,
  mood       INTEGER CHECK (mood IS NULL OR (mood >= 1 AND mood <= 5)),
  favorite   INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  tags       TEXT    NOT NULL DEFAULT '[]',
  updated_at TEXT    NOT NULL,
  dirty      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS days_dirty_idx ON days (dirty) WHERE dirty = 1;

-- Nagranie glosowe wisi przy KONKRETNEJ wdziecznosci, jedno na slot.
-- Skasowanie nagrania to wyzerowanie wiersza, nie DELETE — jak wszedzie indziej.
CREATE TABLE IF NOT EXISTS entry_audio (
  entry_date  TEXT    NOT NULL,
  slot        INTEGER NOT NULL,
  local_uri   TEXT,
  path        TEXT,
  duration_ms INTEGER,
  updated_at  TEXT    NOT NULL,
  dirty       INTEGER NOT NULL DEFAULT 1,
  audio_dirty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entry_date, slot)
);

CREATE INDEX IF NOT EXISTS entry_audio_dirty_idx ON entry_audio (dirty, audio_dirty);

-- Ustawienia i znaczniki synchronizacji.
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Pliki usuniete lokalnie, ktore wciaz leza w ktoryms z bucketow.
-- Kolumna bucket jest tu od poczatku, bo nagrania mieszkaja w innym niz zdjecia.
CREATE TABLE IF NOT EXISTS storage_trash (
  bucket       TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  PRIMARY KEY (bucket, storage_path)
);
`;

/**
 * Wersja schematu w PRAGMA user_version.
 *
 *   1 — `entries` mialo CHECK (slot <= 3) i kolumny na JEDNO zdjecie. SQLite nie
 *       pozwala zmienic CHECK-a przez ALTER TABLE, wiec tabele trzeba przepisac.
 *   2 — `photo_trash` zastapiony przez `storage_trash` z kolumna bucket, bo
 *       nagrania glosowe trafiaja do innego bucketu niz zdjecia.
 */
const TARGET_VERSION = 2;

/** Nazwy bucketow w Supabase. Wspoldzielone przez kosz, synchronizacje i UI. */
export const PHOTO_BUCKET = 'gratitude-photos';
export const AUDIO_BUCKET = 'gratitude-audio';

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= TARGET_VERSION) return;

  if (current < 1) await migrateToV1(db);
  if (current < 2) await migrateToV2(db);

  await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION}`);
}

async function migrateToV1(db: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(entries)');
  const hasLegacyPhotos = columns.some((c) => c.name === 'photo_local_uri');

  if (hasLegacyPhotos) {
    // Przepisujemy `entries` bez kolumn na zdjecia i z szerszym CHECK-iem,
    // a stare zdjecia przenosimy na pozycje 1 w nowej tabeli. Calosc w jednej
    // transakcji: przerwana migracja zostawilaby baze bez tabeli entries.
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        INSERT OR IGNORE INTO entry_photos
          (entry_date, slot, position, local_uri, path, updated_at, dirty, photo_dirty)
        SELECT entry_date, slot, 1, photo_local_uri, photo_path, updated_at, dirty, photo_dirty
          FROM entries
         WHERE photo_local_uri IS NOT NULL OR photo_path IS NOT NULL;

        CREATE TABLE entries_migrated (
          entry_date TEXT    NOT NULL,
          slot       INTEGER NOT NULL CHECK (slot >= 1 AND slot <= ${MAX_SLOTS}),
          text       TEXT,
          updated_at TEXT    NOT NULL,
          dirty      INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (entry_date, slot)
        );

        INSERT INTO entries_migrated (entry_date, slot, text, updated_at, dirty)
        SELECT entry_date, slot, text, updated_at, dirty FROM entries;

        DROP TABLE entries;
        ALTER TABLE entries_migrated RENAME TO entries;
        CREATE INDEX IF NOT EXISTS entries_dirty_idx ON entries (dirty) WHERE dirty = 1;
      `);
    });
  }
}

/**
 * Kosz na pliki dostaje kolumne `bucket`.
 *
 * Wpisy ze starej tabeli sa z definicji zdjeciami — w tamtej wersji aplikacji
 * nie bylo nagran. Przepisujemy je z nazwa bucketu zdjec, zeby porzucone pliki
 * z poprzedniej instalacji nadal doczekaly sie skasowania w chmurze.
 */
async function migrateToV2(db: SQLite.SQLiteDatabase): Promise<void> {
  const legacy = await db.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'photo_trash'`
  );
  if (legacy.length === 0) return;

  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      INSERT OR IGNORE INTO storage_trash (bucket, storage_path)
      SELECT '${PHOTO_BUCKET}', storage_path FROM photo_trash;

      DROP TABLE photo_trash;
    `);
  });
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
/** Surowe polaczenie stojace za dbPromise — pozwala poznac, czy juz je podmieniono. */
let activeDb: SQLite.SQLiteDatabase | null = null;
let openCount = 0;

/**
 * Obrona przed bledem expo-modules-core na Androidzie (expo/expo#49799):
 * wywolanie async metody obiektu natywnego przekazuje do Kotlina tylko numer
 * obiektu, a sam obiekt jest wyszukiwany dopiero pozniej, w watku w tle. Jesli
 * w tym oknie rejestr zdazy go zwolnic, zapytanie odpada z "Cannot use shared
 * object that was already released" — zanim SQL w ogole sie wykona. Zgloszenie
 * odtwarza to w buildzie release, a poprawka (PR #49807) nie jest jeszcze
 * wydana. Gdy trafi do expo-modules-core, ten kod mozna usunac.
 */
function isReleasedError(error: unknown): boolean {
  for (let e = error; e; e = (e as { cause?: unknown }).cause) {
    if (String((e as Error).message ?? e).includes('already released')) return true;
  }
  return false;
}

/** Tylko metody, ktorych naprawde uzywamy. Transakcji celowo tu nie ma — patrz nizej. */
const RETRIED_METHODS = new Set<PropertyKey>(['execAsync', 'runAsync', 'getAllAsync', 'getFirstAsync']);
const RAW = Symbol('raw');

/**
 * Zapytanie, ktore trafilo na zwolniony obiekt, powtarzamy RAZ na swiezo
 * otwartym polaczeniu. Stare polaczenie jest wtedy spisane na straty — nie
 * wiemy, czy zwolniona zostala baza, czy tylko jej instrukcja, a ponowne
 * uzycie zwolnionej bazy konczy sie tym samym bledem przy kazdym zapytaniu.
 *
 * Dlaczego powtorzenie jest bezpieczne: blad pada przy przekazywaniu argumentow,
 * wiec SQL zwykle nie zdazyl sie wykonac. A gdyby padl dopiero przy sprzataniu
 * po nim — nasze zapisy ustawiaja wartosci bezwzglednie (zadnych x = x + 1),
 * wiec drugie wykonanie da ten sam stan albo glosny blad klucza glownego,
 * nigdy cichy duplikat.
 *
 * Dlaczego nie transakcje: powtorka poszlaby innym polaczeniem niz BEGIN, czyli
 * poza transakcja. withTransactionAsync uzywa tylko migracja, a ta dostaje
 * surowe polaczenie i ma wlasne ponowienie w openWithRetry().
 */
function withRetry(db: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === RAW) return target;
      const value = Reflect.get(target, prop, receiver);
      if (!RETRIED_METHODS.has(prop) || typeof value !== 'function') return value;

      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args);
        } catch (error) {
          if (!isReleasedError(error)) throw error;
          // Rownolegle zapytania moga trafic na ten sam blad naraz — tylko
          // pierwsze otwiera nowe polaczenie, reszta korzysta z niego.
          if (activeDb === target) {
            activeDb = null;
            dbPromise = null;
          }
          // Powtorka idzie do SUROWEGO polaczenia, z pominieciem proxy — inaczej
          // przy uporczywym bledzie kazda proba otwieralaby kolejna baze bez konca.
          const fresh = (await getDb()) as SQLite.SQLiteDatabase & { [RAW]?: SQLite.SQLiteDatabase };
          const raw = fresh[RAW] ?? fresh;
          return (Reflect.get(raw, prop) as (...a: unknown[]) => Promise<unknown>).apply(raw, args);
        }
      };
    },
  });
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  // Kazde otwarcie poza pierwszym omija cache expo-sqlite: dla tej samej sciezki
  // zwraca on TEN SAM obiekt natywny (z mysla o fast refresh), wiec po bledzie
  // "already released" moglibysmy dostac z powrotem wlasnie zwolniona baze.
  const options = openCount++ > 0 ? { useNewConnection: true } : undefined;
  const db = await SQLite.openDatabaseAsync('gratitude.db', options);
  await db.execAsync(SCHEMA);
  await migrate(db);
  activeDb = db;
  return withRetry(db);
}

async function openWithRetry(): Promise<SQLite.SQLiteDatabase> {
  try {
    return await open();
  } catch (error) {
    // Zgloszone przypadki padaly wlasnie tu: pierwsze zapytania po starcie.
    // Schemat i migracje sa idempotentne (IF NOT EXISTS, user_version ustawiany
    // na koncu), wiec jedno ponowne otwarcie niczego nie zdubluje.
    if (!isReleasedError(error)) throw error;
    return open();
  }
}

/** Jedno wspoldzielone polaczenie na caly proces (podmieniane tylko po bledzie wyzej). */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  // Nieudane otwarcie nie moze zostac w pamieci na zawsze — nastepne wywolanie
  // ma sprobowac od nowa, a nie dostawac w kolko te sama odrzucona obietnice.
  const attempt = (dbPromise ??= openWithRetry().catch((error: unknown) => {
    if (dbPromise === attempt) dbPromise = null;
    throw error;
  }));
  return attempt;
}

/**
 * Klucz dnia w czasie LOKALNYM urzadzenia.
 *
 * Celowo NIE uzywamy toISOString() — ono zwraca date w UTC, wiec wpis zapisany
 * o 23:30 czasu polskiego wyladowalby pod data nastepnego dnia.
 */
export function dateKey(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const nowIso = () => new Date().toISOString();

/**
 * Czy dzien wolno jeszcze edytowac.
 *
 * Okno liczymy w DNIACH KALENDARZOWYCH, nie w godzinach: inaczej to, czy wpis
 * sprzed tygodnia da sie jeszcze poprawic, zalezaloby od pory dnia.
 */
export function isEditable(key: string, today: string = dateKey()): boolean {
  if (key > today) return false; // przyszlosc

  const [y, m, d] = key.split('-').map(Number);
  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setDate(limit.getDate() - EDIT_WINDOW_DAYS);

  return new Date(y, m - 1, d).getTime() >= limit.getTime();
}
