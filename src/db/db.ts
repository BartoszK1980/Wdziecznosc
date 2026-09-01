import * as SQLite from 'expo-sqlite';

/**
 * Lokalna baza jest ZRODLEM PRAWDY dla UI — ekrany nigdy nie czekaja na siec.
 * Synchronizacja z Supabase dokleja sie do tego w tle (src/sync/sync.ts).
 *
 * Dzien ma trzy stale sloty (1..3). "Usuniecie" wdziecznosci to wyczyszczenie
 * slotu, a nie DELETE wiersza — dzieki temu pusty slot propaguje sie na inne
 * urzadzenia zwyklym last-write-wins i nie potrzebujemy tombstone'ow.
 */

export const SLOTS = [1, 2, 3] as const;
export type Slot = (typeof SLOTS)[number];

export const MOODS = [1, 2, 3, 4, 5] as const;
export type Mood = (typeof MOODS)[number];

/**
 * Kategorie z ekranu Statystyk w koncepcie. Makieta pokazuje je w podsumowaniu,
 * ale nigdzie ich nie wpisuje — dlatego trafily do edytora jako chipy do
 * zaznaczenia. Automatyczne zgadywanie z tresci nie zadziala w siedmiu jezykach.
 */
export const TAGS = ['family', 'health', 'friends', 'nature', 'growth', 'small'] as const;
export type Tag = (typeof TAGS)[number];

export type DayRow = {
  entry_date: string;
  mood: number | null;
  favorite: number;
  note: string | null;
  tags: string; // JSON
  updated_at: string;
  dirty: number;
};

export type EntryRow = {
  entry_date: string; // 'YYYY-MM-DD', czas LOKALNY
  slot: number;
  text: string | null;
  /** Plik w documentDirectory/photos/. Zawsze wyswietlamy stad, jesli jest. */
  photo_local_uri: string | null;
  /** Sciezka w buckecie Supabase. NULL dopoki zdjecie nie zostalo wyslane. */
  photo_path: string | null;
  updated_at: string; // ISO 8601
  dirty: number; // 1 = wiersz czeka na wypchniecie
  photo_dirty: number; // 1 = plik lokalny czeka na upload
};

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS entries (
  entry_date      TEXT    NOT NULL,
  slot            INTEGER NOT NULL CHECK (slot >= 1 AND slot <= 3),
  text            TEXT,
  photo_local_uri TEXT,
  photo_path      TEXT,
  updated_at      TEXT    NOT NULL,
  dirty           INTEGER NOT NULL DEFAULT 1,
  photo_dirty     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entry_date, slot)
);

CREATE INDEX IF NOT EXISTS entries_dirty_idx ON entries (dirty) WHERE dirty = 1;

-- Wlasciwosci calego DNIA, nie pojedynczej wdziecznosci: nastroj, ulubiony,
-- notatka dodatkowa i tagi. Osobna tabela, bo te dane nie maja slotu — dzien
-- ma jeden nastroj, nie trzy.
CREATE TABLE IF NOT EXISTS days (
  entry_date TEXT PRIMARY KEY,
  mood       INTEGER CHECK (mood IS NULL OR (mood >= 1 AND mood <= 5)),
  favorite   INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  -- tablica JSON kluczy tagow, np. ["family","nature"] — SQLite nie ma typu
  -- tablicowego, a lista jest krotka i zawsze czytana w calosci
  tags       TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL,
  dirty      INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS days_dirty_idx ON days (dirty) WHERE dirty = 1;

-- Ustawienia i znaczniki synchronizacji: 'last_pulled_at', 'language',
-- 'reminder_time', 'protect_banner_dismissed'.
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Zdjecia usuniete lokalnie, ktore wciaz istnieja w buckecie. Bez tego kazde
-- podmienione zdjecie zostawaloby w Storage na zawsze i rachunek rosl bez powodu.
CREATE TABLE IF NOT EXISTS photo_trash (
  storage_path TEXT PRIMARY KEY
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('gratitude.db');
  await db.execAsync(SCHEMA);
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
