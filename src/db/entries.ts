import { deletePhotoFile } from '@/photos/photos';
import {
  getDb,
  MAX_PHOTOS_PER_SLOT,
  MAX_SLOTS,
  nowIso,
  type EntryRow,
  type PhotoRow,
  type Slot,
} from './db';

export type Photo = {
  position: number;
  localUri: string | null;
  path: string | null;
};

export type DaySlot = {
  slot: Slot;
  text: string;
  photos: Photo[]; // tylko niepuste, posortowane po position
};

export type Day = {
  date: string;
  /** Tylko sloty z trescia, plus ewentualnie jeden pusty na dopisanie. */
  slots: DaySlot[];
};

export const MAX_TEXT_LENGTH = 280;

const isPhotoEmpty = (photo: Photo) => !photo.localUri && !photo.path;

export const isEmpty = (slot: DaySlot) => slot.text.trim() === '' && slot.photos.length === 0;

// --- odczyt -----------------------------------------------------------------

async function photosFor(date: string): Promise<Map<number, Photo[]>> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT * FROM entry_photos
      WHERE entry_date = ? AND (local_uri IS NOT NULL OR path IS NOT NULL)
      ORDER BY slot, position`,
    [date]
  );

  const bySlot = new Map<number, Photo[]>();
  for (const row of rows) {
    const list = bySlot.get(row.slot) ?? [];
    list.push({ position: row.position, localUri: row.local_uri, path: row.path });
    bySlot.set(row.slot, list);
  }
  return bySlot;
}

/**
 * Dzien jako lista WYPELNIONYCH slotow.
 *
 * Przy trzech slotach rysowalismy zawsze wszystkie trzy. Przy dziesieciu byloby
 * to sciana pustych pol, wiec pokazujemy tylko to, co ma tresc — a dopisanie
 * kolejnej wdziecznosci obsluguje przycisk w UI (patrz nextFreeSlot).
 */
export async function loadDay(date: string): Promise<Day> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE entry_date = ? ORDER BY slot',
    [date]
  );
  const photos = await photosFor(date);

  const slots = rows
    .map((row) => ({
      slot: row.slot,
      text: row.text ?? '',
      photos: photos.get(row.slot) ?? [],
    }))
    .filter((slot) => !isEmpty(slot));

  return { date, slots };
}

/** Najnizszy wolny numer slotu, albo null gdy dzien jest pelny. */
export async function nextFreeSlot(date: string): Promise<Slot | null> {
  const db = await getDb();
  const used = await db.getAllAsync<{ slot: number }>(
    'SELECT slot FROM entries WHERE entry_date = ?',
    [date]
  );
  const taken = new Set(used.map((row) => row.slot));
  for (let slot = 1; slot <= MAX_SLOTS; slot++) {
    if (!taken.has(slot)) return slot;
  }
  return null;
}

export type DayFilter = 'all' | 'favorites' | 'photos';

const HAS_TEXT = `(e.text IS NOT NULL AND trim(e.text) <> '')`;
const HAS_PHOTO = `EXISTS (
  SELECT 1 FROM entry_photos p
   WHERE p.entry_date = e.entry_date AND p.slot = e.slot
     AND (p.local_uri IS NOT NULL OR p.path IS NOT NULL)
)`;
const HAS_CONTENT = `(${HAS_TEXT} OR ${HAS_PHOTO})`;

/**
 * Dni z jakakolwiek trescia, od najnowszego.
 *
 * Uwaga o szukaniu: LIKE w SQLite zwija wielkosc liter tylko dla ASCII, wiec
 * "Zdrowie" znajdzie sie po "zdrow", ale "Łąka" juz nie po "łąk". Do naprawy
 * trzeba rozszerzenia ICU albo kolumny z tekstem bez znakow diakrytycznych.
 */
export async function listDays(
  limit: number,
  offset = 0,
  options: { filter?: DayFilter; query?: string } = {}
): Promise<Day[]> {
  const db = await getDb();
  const { filter = 'all', query = '' } = options;
  const search = query.trim();

  const conditions = [HAS_CONTENT];
  const params: (string | number)[] = [];

  if (filter === 'favorites') conditions.push('d.favorite = 1');
  if (filter === 'photos') conditions.push(HAS_PHOTO);
  if (search) {
    conditions.push('(e.text LIKE ? OR d.note LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const dates = await db.getAllAsync<{ entry_date: string }>(
    `SELECT e.entry_date FROM entries e
       LEFT JOIN days d ON d.entry_date = e.entry_date
      WHERE ${conditions.join(' AND ')}
      GROUP BY e.entry_date
      ORDER BY e.entry_date DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return Promise.all(dates.map((row) => loadDay(row.entry_date)));
}

/** Dni z trescia w zadanym zakresie — kalendarz zaznacza nimi kropki. */
export async function datesWithContent(from: string, to: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_date: string }>(
    `SELECT DISTINCT e.entry_date FROM entries e
      WHERE e.entry_date BETWEEN ? AND ? AND ${HAS_CONTENT}`,
    [from, to]
  );
  return new Set(rows.map((row) => row.entry_date));
}

// --- zapis ------------------------------------------------------------------

async function ensureRow(date: string, slot: Slot): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO entries (entry_date, slot, updated_at, dirty) VALUES (?, ?, ?, 1)
     ON CONFLICT(entry_date, slot) DO NOTHING`,
    [date, slot, nowIso()]
  );
}

export async function saveText(date: string, slot: Slot, text: string): Promise<void> {
  const db = await getDb();
  await ensureRow(date, slot);
  const trimmed = text.slice(0, MAX_TEXT_LENGTH);
  await db.runAsync(
    `UPDATE entries SET text = ?, updated_at = ?, dirty = 1
      WHERE entry_date = ? AND slot = ?`,
    [trimmed.trim() === '' ? null : trimmed, nowIso(), date, slot]
  );
}

/** Pierwsza wolna pozycja zdjecia w slocie, albo null gdy komplet. */
export async function nextFreePhotoPosition(date: string, slot: Slot): Promise<number | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ position: number }>(
    `SELECT position FROM entry_photos
      WHERE entry_date = ? AND slot = ? AND (local_uri IS NOT NULL OR path IS NOT NULL)`,
    [date, slot]
  );
  const taken = new Set(rows.map((row) => row.position));
  for (let position = 1; position <= MAX_PHOTOS_PER_SLOT; position++) {
    if (!taken.has(position)) return position;
  }
  return null;
}

export async function addPhoto(
  date: string,
  slot: Slot,
  position: number,
  localUri: string
): Promise<void> {
  const db = await getDb();
  await ensureRow(date, slot);
  await trashRemotePhoto(date, slot, position);
  await db.runAsync(
    `INSERT INTO entry_photos (entry_date, slot, position, local_uri, path, updated_at, dirty, photo_dirty)
     VALUES (?, ?, ?, ?, NULL, ?, 1, 1)
     ON CONFLICT(entry_date, slot, position) DO UPDATE SET
       local_uri = excluded.local_uri,
       path = NULL,
       updated_at = excluded.updated_at,
       dirty = 1,
       photo_dirty = 1`,
    [date, slot, position, localUri, nowIso()]
  );
}

export async function removePhoto(date: string, slot: Slot, position: number): Promise<void> {
  const db = await getDb();
  await trashRemotePhoto(date, slot, position);

  const row = await db.getFirstAsync<PhotoRow>(
    'SELECT * FROM entry_photos WHERE entry_date = ? AND slot = ? AND position = ?',
    [date, slot, position]
  );
  deletePhotoFile(row?.local_uri ?? null);

  await db.runAsync(
    `UPDATE entry_photos SET local_uri = NULL, path = NULL, photo_dirty = 0,
            updated_at = ?, dirty = 1
      WHERE entry_date = ? AND slot = ? AND position = ?`,
    [nowIso(), date, slot, position]
  );
}

/** Czysci caly slot: tekst i wszystkie jego zdjecia. */
export async function clearSlot(date: string, slot: Slot): Promise<void> {
  const db = await getDb();
  for (let position = 1; position <= MAX_PHOTOS_PER_SLOT; position++) {
    await removePhoto(date, slot, position);
  }
  await db.runAsync(
    'UPDATE entries SET text = NULL, updated_at = ?, dirty = 1 WHERE entry_date = ? AND slot = ?',
    [nowIso(), date, slot]
  );
}

async function trashRemotePhoto(date: string, slot: Slot, position: number): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ path: string | null }>(
    'SELECT path FROM entry_photos WHERE entry_date = ? AND slot = ? AND position = ?',
    [date, slot, position]
  );
  if (row?.path) {
    await db.runAsync('INSERT OR IGNORE INTO photo_trash (storage_path) VALUES (?)', [row.path]);
  }
}

export async function countNonEmptyDays(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(DISTINCT e.entry_date) AS n FROM entries e WHERE ${HAS_CONTENT}`
  );
  return row?.n ?? 0;
}

/**
 * Czysci wszystkie wpisy i pliki zdjec z tego urzadzenia.
 *
 * Wolane przy logowaniu na istniejace konto: bez tego wpisy z sesji anonimowej
 * zostalyby wypchniete do odzyskiwanego konta i wymieszaly sie z jego historia.
 * Ustawienia (jezyk, motyw, godzina przypomnienia) zostaja — to preferencje
 * urzadzenia, nie dane konta.
 */
export async function wipeLocalEntries(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ local_uri: string | null }>(
    'SELECT local_uri FROM entry_photos WHERE local_uri IS NOT NULL'
  );
  rows.forEach((row) => deletePhotoFile(row.local_uri));

  await db.runAsync('DELETE FROM entries');
  await db.runAsync('DELETE FROM entry_photos');
  await db.runAsync('DELETE FROM days');
  await db.runAsync('DELETE FROM photo_trash');
}

// --- app_state --------------------------------------------------------------

export async function getState(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setState(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_state (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function clearState(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM app_state WHERE key = ?', [key]);
}

export { isPhotoEmpty };
