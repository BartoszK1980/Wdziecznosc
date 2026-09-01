import { deletePhotoFile } from '@/photos/photos';
import { getDb, nowIso, SLOTS, type EntryRow, type Slot } from './db';

export type DaySlot = {
  slot: Slot;
  text: string;
  photoLocalUri: string | null;
  photoPath: string | null;
};

export type Day = {
  date: string;
  slots: DaySlot[]; // zawsze 3 pozycje, w kolejnosci 1..3
};

export const MAX_TEXT_LENGTH = 280;

const emptySlot = (slot: Slot): DaySlot => ({
  slot,
  text: '',
  photoLocalUri: null,
  photoPath: null,
});

const toDaySlot = (row: EntryRow): DaySlot => ({
  slot: row.slot as Slot,
  text: row.text ?? '',
  photoLocalUri: row.photo_local_uri,
  photoPath: row.photo_path,
});

const isEmpty = (s: DaySlot) => s.text.trim() === '' && !s.photoLocalUri && !s.photoPath;

/**
 * Zwraca dzien zawsze jako komplet trzech slotow — brakujace wiersze w bazie
 * staja sie pustymi slotami. Ekran nigdy nie musi sie zastanawiac, ilu pol
 * narysowac, i nie tworzymy wierszy dla slotow, ktorych uzytkownik nie dotknal.
 */
export async function loadDay(date: string): Promise<Day> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE entry_date = ? ORDER BY slot',
    [date]
  );
  const bySlot = new Map(rows.map((r) => [r.slot, toDaySlot(r)]));
  return { date, slots: SLOTS.map((s) => bySlot.get(s) ?? emptySlot(s)) };
}

export type DayFilter = 'all' | 'favorites' | 'photos';

const HAS_CONTENT = `((e.text IS NOT NULL AND trim(e.text) <> '') OR e.photo_local_uri IS NOT NULL OR e.photo_path IS NOT NULL)`;
const HAS_PHOTO = `(e.photo_local_uri IS NOT NULL OR e.photo_path IS NOT NULL)`;

/**
 * Dni z jakakolwiek trescia, od najnowszego. Pusty slot nie robi z dnia wpisu,
 * wiec dzien, w ktorym wszystko wyczyszczono, znika z listy — ale jego wiersze
 * zostaja w bazie, bo musza dojechac do pozostalych urzadzen.
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

  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
      WHERE entry_date IN (
        SELECT e.entry_date FROM entries e
          LEFT JOIN days d ON d.entry_date = e.entry_date
         WHERE ${conditions.join(' AND ')}
         GROUP BY e.entry_date
         ORDER BY e.entry_date DESC
         LIMIT ? OFFSET ?
      )
      ORDER BY entry_date DESC, slot`,
    [...params, limit, offset]
  );

  const days: Day[] = [];
  for (const row of rows) {
    let day = days[days.length - 1];
    if (!day || day.date !== row.entry_date) {
      day = { date: row.entry_date, slots: SLOTS.map(emptySlot) };
      days.push(day);
    }
    day.slots[row.slot - 1] = toDaySlot(row);
  }
  return days;
}

/** Tworzy wiersz slotu, jesli jeszcze nie istnieje. */
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

/**
 * Podpina zdjecie juz skopiowane do katalogu aplikacji (patrz src/photos).
 * Poprzednie zdjecie tego slotu trafia do kosza, zeby sync mogl skasowac je
 * takze w chmurze.
 */
export async function savePhoto(date: string, slot: Slot, localUri: string): Promise<void> {
  const db = await getDb();
  await ensureRow(date, slot);
  await trashRemotePhoto(date, slot);
  await db.runAsync(
    `UPDATE entries SET photo_local_uri = ?, photo_path = NULL, photo_dirty = 1,
            updated_at = ?, dirty = 1
      WHERE entry_date = ? AND slot = ?`,
    [localUri, nowIso(), date, slot]
  );
}

export async function removePhoto(date: string, slot: Slot): Promise<void> {
  const db = await getDb();
  await trashRemotePhoto(date, slot);
  await db.runAsync(
    `UPDATE entries SET photo_local_uri = NULL, photo_path = NULL, photo_dirty = 0,
            updated_at = ?, dirty = 1
      WHERE entry_date = ? AND slot = ?`,
    [nowIso(), date, slot]
  );
}

async function trashRemotePhoto(date: string, slot: Slot): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ photo_path: string | null }>(
    'SELECT photo_path FROM entries WHERE entry_date = ? AND slot = ?',
    [date, slot]
  );
  if (row?.photo_path) {
    await db.runAsync('INSERT OR IGNORE INTO photo_trash (storage_path) VALUES (?)', [
      row.photo_path,
    ]);
  }
}

export async function countNonEmptyDays(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(DISTINCT entry_date) AS n FROM entries
      WHERE (text IS NOT NULL AND trim(text) <> '') OR photo_local_uri IS NOT NULL OR photo_path IS NOT NULL`
  );
  return row?.n ?? 0;
}

export { isEmpty };

/**
 * Czysci wszystkie wpisy i pliki zdjec z tego urzadzenia.
 *
 * Wolane przy logowaniu na istniejace konto: bez tego wpisy z sesji anonimowej
 * zostalyby wypchniete do odzyskiwanego konta i wymieszaly sie z jego historia.
 * Ustawienia (jezyk, godzina przypomnienia) zostaja — to preferencje urzadzenia,
 * nie dane konta.
 */
export async function wipeLocalEntries(): Promise<void> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ photo_local_uri: string | null }>(
    'SELECT photo_local_uri FROM entries WHERE photo_local_uri IS NOT NULL'
  );
  rows.forEach((row) => deletePhotoFile(row.photo_local_uri));

  await db.runAsync('DELETE FROM entries');
  await db.runAsync('DELETE FROM days');
  await db.runAsync('DELETE FROM photo_trash');
}

// --- app_state -------------------------------------------------------------

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
