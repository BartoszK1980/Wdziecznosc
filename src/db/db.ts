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

-- Ustawienia i znaczniki synchronizacji.
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Zdjecia usuniete lokalnie, ktore wciaz istnieja w buckecie.
CREATE TABLE IF NOT EXISTS photo_trash (
  storage_path TEXT PRIMARY KEY
);
`;

/**
 * Wersja schematu w PRAGMA user_version.
 *
 * Potrzebna, bo aplikacja jest juz zainstalowana z poprzednim schematem:
 * `entries` mialo CHECK (slot <= 3) i kolumny na JEDNO zdjecie. SQLite nie
 * pozwala zmienic CHECK-a przez ALTER TABLE, wiec tabele trzeba przepisac.
 */
const TARGET_VERSION = 1;

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= TARGET_VERSION) return;

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

  await db.execAsync(`PRAGMA user_version = ${TARGET_VERSION}`);
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('gratitude.db');
  await db.execAsync(SCHEMA);
  await migrate(db);
  return db;
}

/** Jedno wspoldzielone polaczenie na caly proces. */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= open();
  return dbPromise;
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
