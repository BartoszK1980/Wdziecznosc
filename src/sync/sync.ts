import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

import { getDb, type DayRow, type EntryRow, type PhotoRow, type Slot } from '@/db/db';
import { getState, setState } from '@/db/entries';
import { deletePhotoFile, downloadPhoto, photoExists, readPhotoBytes } from '@/photos/photos';
import { currentUserId, getSupabase } from './supabase';

const TABLE = 'gratitude_entries';
const DAYS_TABLE = 'gratitude_days';
const PHOTOS_TABLE = 'gratitude_photos';
const BUCKET = 'gratitude-photos';

const LAST_PULLED_KEY = 'last_pulled_at';
const LAST_PULLED_DAYS_KEY = 'last_pulled_days_at';
const LAST_PULLED_PHOTOS_KEY = 'last_pulled_photos_at';
const EPOCH = '1970-01-01T00:00:00.000Z';
const PAGE_SIZE = 500;

type RemoteRow = {
  entry_date: string;
  slot: number;
  text: string | null;
  updated_at: string;
};

type RemotePhotoRow = {
  entry_date: string;
  slot: number;
  position: number;
  path: string | null;
  updated_at: string;
};

type RemoteDayRow = {
  entry_date: string;
  mood: number | null;
  favorite: boolean;
  note: string | null;
  tags: string[] | null;
  updated_at: string;
};

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

let status: SyncStatus = 'idle';
const listeners = new Set<(s: SyncStatus) => void>();

function setStatus(next: SyncStatus) {
  status = next;
  listeners.forEach((l) => l(next));
}

export const getSyncStatus = () => status;

export function subscribeSyncStatus(listener: (s: SyncStatus) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- glowna petla -----------------------------------------------------------

let running: Promise<void> | null = null;

/**
 * Jedno wywolanie naraz. Dwa rownolegle przebiegi potrafilyby wypchnac ten sam
 * wiersz dwa razy i wyzerowac `dirty` dla zmiany, ktora jeszcze nie dojechala.
 */
export function syncNow(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run(): Promise<void> {
  const supabase = getSupabase();
  const userId = await currentUserId();
  if (!supabase || !userId) {
    setStatus('offline');
    return;
  }

  setStatus('syncing');
  try {
    // Kolejnosc ma znaczenie: wiersz zdjecia musi wyjechac z gotowa sciezka,
    // wiec najpierw pliki do Storage, dopiero potem upsert wierszy.
    await uploadPhotoFiles(userId);
    await pushRows(userId);
    await pushPhotos(userId);
    await pushDays(userId);
    await pullRows();
    await pullPhotos();
    await pullDays();
    await purgeTrash();
    setStatus('idle');
  } catch (error) {
    setStatus('error');
    if (__DEV__) console.warn('[sync]', error);
  }
}

// --- push -------------------------------------------------------------------

async function uploadPhotoFiles(userId: string): Promise<void> {
  const db = await getDb();
  const supabase = getSupabase()!;

  const pending = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM entry_photos WHERE photo_dirty = 1 AND local_uri IS NOT NULL'
  );

  for (const row of pending) {
    const localUri = row.local_uri!;
    if (!photoExists(localUri)) {
      // Plik zniknal spod nog — nie ma czego wysylac, odznacz i idz dalej.
      await db.runAsync(
        'UPDATE entry_photos SET photo_dirty = 0 WHERE entry_date = ? AND slot = ? AND position = ?',
        [row.entry_date, row.slot, row.position]
      );
      continue;
    }

    // Sciezka zdalna wynika z nazwy pliku lokalnego (ta ma losowy sufiks),
    // wiec ponowiona proba trafia w to samo miejsce zamiast mnozyc kopie.
    const fileName = localUri.split('/').pop()!;
    const storagePath = `${userId}/${row.entry_date}/${fileName}`;

    const bytes = await readPhotoBytes(localUri);
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) throw error;

    // Warunek na local_uri chroni przed wyscigiem: jesli uzytkownik w tym czasie
    // podmienil zdjecie, nie nadpisujemy jego nowej wartosci.
    await db.runAsync(
      `UPDATE entry_photos SET path = ?, photo_dirty = 0, dirty = 1
        WHERE entry_date = ? AND slot = ? AND position = ? AND local_uri = ?`,
      [storagePath, row.entry_date, row.slot, row.position, localUri]
    );
  }
}

async function pushRows(userId: string): Promise<void> {
  const db = await getDb();
  const supabase = getSupabase()!;

  const dirty = await db.getAllAsync<EntryRow>('SELECT * FROM entries WHERE dirty = 1');
  if (dirty.length === 0) return;

  const { error } = await supabase.from(TABLE).upsert(
    dirty.map((row) => ({
      user_id: userId,
      entry_date: row.entry_date,
      slot: row.slot,
      text: row.text,
    })),
    { onConflict: 'user_id,entry_date,slot' }
  );
  if (error) throw error;

  for (const row of dirty) {
    // Czyscimy flage TYLKO jesli wiersz nie zmienil sie od momentu odczytu.
    // Bez tego edycja zrobiona w trakcie wysylki przepadlaby bez sladu.
    await db.runAsync(
      'UPDATE entries SET dirty = 0 WHERE entry_date = ? AND slot = ? AND updated_at = ?',
      [row.entry_date, row.slot, row.updated_at]
    );
  }
}

async function pushPhotos(userId: string): Promise<void> {
  const db = await getDb();
  const supabase = getSupabase()!;

  const dirty = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM entry_photos WHERE dirty = 1 AND photo_dirty = 0'
  );
  if (dirty.length === 0) return;

  const { error } = await supabase.from(PHOTOS_TABLE).upsert(
    dirty.map((row) => ({
      user_id: userId,
      entry_date: row.entry_date,
      slot: row.slot,
      position: row.position,
      path: row.path,
    })),
    { onConflict: 'user_id,entry_date,slot,position' }
  );
  if (error) throw error;

  for (const row of dirty) {
    await db.runAsync(
      `UPDATE entry_photos SET dirty = 0
        WHERE entry_date = ? AND slot = ? AND position = ? AND updated_at = ?`,
      [row.entry_date, row.slot, row.position, row.updated_at]
    );
  }
}

async function pushDays(userId: string): Promise<void> {
  const db = await getDb();
  const supabase = getSupabase()!;

  const dirty = await db.getAllAsync<DayRow>('SELECT * FROM days WHERE dirty = 1');
  if (dirty.length === 0) return;

  const { error } = await supabase.from(DAYS_TABLE).upsert(
    dirty.map((row) => ({
      user_id: userId,
      entry_date: row.entry_date,
      mood: row.mood,
      favorite: row.favorite === 1,
      note: row.note,
      // lokalnie JSON, zdalnie natywna tablica text[] — konwersja tutaj,
      // zeby reszta aplikacji nie musiala o tej roznicy wiedziec
      tags: JSON.parse(row.tags || '[]'),
    })),
    { onConflict: 'user_id,entry_date' }
  );
  if (error) throw error;

  for (const row of dirty) {
    await db.runAsync('UPDATE days SET dirty = 0 WHERE entry_date = ? AND updated_at = ?', [
      row.entry_date,
      row.updated_at,
    ]);
  }
}

// --- pull -------------------------------------------------------------------

/**
 * Wspolny szkielet pobierania przyrostowego.
 *
 * Znacznik bierzemy z odpowiedzi SERWERA, nigdy z zegara urzadzenia —
 * rozjechany zegar telefonu inaczej przeskoczylby czesc zmian na zawsze.
 */
async function pullTable<T extends { updated_at: string }>(
  table: string,
  columns: string,
  watermarkKey: string,
  merge: (row: T) => Promise<void>
): Promise<void> {
  const supabase = getSupabase()!;
  let since = (await getState(watermarkKey)) ?? EPOCH;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .limit(PAGE_SIZE);
    if (error) throw error;

    const rows = (data ?? []) as unknown as T[];
    if (rows.length === 0) return;

    for (const row of rows) await merge(row);

    since = rows[rows.length - 1].updated_at;
    await setState(watermarkKey, since);

    if (rows.length < PAGE_SIZE) return;
  }
}

const pullRows = () =>
  pullTable<RemoteRow>(TABLE, 'entry_date,slot,text,updated_at', LAST_PULLED_KEY, async (remote) => {
    const db = await getDb();
    const local = await db.getFirstAsync<EntryRow>(
      'SELECT * FROM entries WHERE entry_date = ? AND slot = ?',
      [remote.entry_date, remote.slot]
    );

    if (!local) {
      await db.runAsync(
        'INSERT INTO entries (entry_date, slot, text, updated_at, dirty) VALUES (?, ?, ?, ?, 0)',
        [remote.entry_date, remote.slot, remote.text, remote.updated_at]
      );
      return;
    }

    // Lokalna zmiana, ktora jeszcze nie dojechala, ma pierwszenstwo — jej
    // znacznik pochodzi z innego zegara niz serwerowy, wiec porownywanie dat
    // nie mialoby sensu.
    if (local.dirty === 1) return;
    if (remote.updated_at <= local.updated_at) return;

    await db.runAsync(
      'UPDATE entries SET text = ?, updated_at = ?, dirty = 0 WHERE entry_date = ? AND slot = ?',
      [remote.text, remote.updated_at, remote.entry_date, remote.slot]
    );
  });

const pullPhotos = () =>
  pullTable<RemotePhotoRow>(
    PHOTOS_TABLE,
    'entry_date,slot,position,path,updated_at',
    LAST_PULLED_PHOTOS_KEY,
    async (remote) => {
      const db = await getDb();
      const local = await db.getFirstAsync<PhotoRow>(
        'SELECT * FROM entry_photos WHERE entry_date = ? AND slot = ? AND position = ?',
        [remote.entry_date, remote.slot, remote.position]
      );

      if (!local) {
        await db.runAsync(
          `INSERT INTO entry_photos (entry_date, slot, position, local_uri, path, updated_at, dirty, photo_dirty)
           VALUES (?, ?, ?, NULL, ?, ?, 0, 0)`,
          [remote.entry_date, remote.slot, remote.position, remote.path, remote.updated_at]
        );
        return;
      }

      if (local.dirty === 1 || local.photo_dirty === 1) return;
      if (remote.updated_at <= local.updated_at) return;

      // Zmiana sciezki oznacza inne zdjecie — stary plik lokalny jest juz
      // nieaktualny, wiec kasujemy go i pozwalamy pobrac nowy na zadanie.
      const changed = remote.path !== local.path;
      if (changed) deletePhotoFile(local.local_uri);

      await db.runAsync(
        `UPDATE entry_photos
            SET path = ?, updated_at = ?, dirty = 0, photo_dirty = 0
                ${changed ? ', local_uri = NULL' : ''}
          WHERE entry_date = ? AND slot = ? AND position = ?`,
        [remote.path, remote.updated_at, remote.entry_date, remote.slot, remote.position]
      );
    }
  );

const pullDays = () =>
  pullTable<RemoteDayRow>(
    DAYS_TABLE,
    'entry_date,mood,favorite,note,tags,updated_at',
    LAST_PULLED_DAYS_KEY,
    async (remote) => {
      const db = await getDb();
      const local = await db.getFirstAsync<DayRow>('SELECT * FROM days WHERE entry_date = ?', [
        remote.entry_date,
      ]);
      const tags = JSON.stringify(remote.tags ?? []);

      if (!local) {
        await db.runAsync(
          `INSERT INTO days (entry_date, mood, favorite, note, tags, updated_at, dirty)
           VALUES (?, ?, ?, ?, ?, ?, 0)`,
          [
            remote.entry_date,
            remote.mood,
            remote.favorite ? 1 : 0,
            remote.note,
            tags,
            remote.updated_at,
          ]
        );
        return;
      }

      if (local.dirty === 1) return;
      if (remote.updated_at <= local.updated_at) return;

      await db.runAsync(
        `UPDATE days SET mood = ?, favorite = ?, note = ?, tags = ?, updated_at = ?, dirty = 0
          WHERE entry_date = ?`,
        [
          remote.mood,
          remote.favorite ? 1 : 0,
          remote.note,
          tags,
          remote.updated_at,
          remote.entry_date,
        ]
      );
    }
  );

// --- sprzatanie -------------------------------------------------------------

async function purgeTrash(): Promise<void> {
  const db = await getDb();
  const supabase = getSupabase()!;

  const trash = await db.getAllAsync<{ storage_path: string }>(
    `SELECT storage_path FROM photo_trash
      WHERE storage_path NOT IN (SELECT path FROM entry_photos WHERE path IS NOT NULL)
      LIMIT 50`
  );
  if (trash.length === 0) return;

  const paths = trash.map((t) => t.storage_path);
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;

  for (const path of paths) {
    await db.runAsync('DELETE FROM photo_trash WHERE storage_path = ?', [path]);
  }
}

// --- leniwe pobieranie zdjec ------------------------------------------------

/**
 * Zwraca lokalna sciezke zdjecia, pobierajac je z chmury dopiero przy pierwszym
 * wyswietleniu. Odzyskiwanie konta na nowym telefonie nie moze sciagac calej
 * biblioteki zdjec na starcie — uzytkownik czekalby minutami na pusty ekran.
 */
export async function ensureLocalPhoto(
  date: string,
  slot: Slot,
  position: number
): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PhotoRow>(
    'SELECT * FROM entry_photos WHERE entry_date = ? AND slot = ? AND position = ?',
    [date, slot, position]
  );
  if (!row) return null;
  if (row.local_uri && photoExists(row.local_uri)) return row.local_uri;
  if (!row.path) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.path, 60 * 60);
  if (error || !data?.signedUrl) return null;

  const localUri = await downloadPhoto(data.signedUrl, date, slot, position);
  // Pobranie pliku to nie jest zmiana tresci wpisu — `dirty` zostaje nietkniete,
  // inaczej kazde otwarcie historii generowaloby ruch do serwera.
  await db.runAsync(
    'UPDATE entry_photos SET local_uri = ? WHERE entry_date = ? AND slot = ? AND position = ?',
    [localUri, date, slot, position]
  );
  return localUri;
}

// --- wyzwalacze -------------------------------------------------------------

let debounce: ReturnType<typeof setTimeout> | null = null;

/** Zapis w UI wola to po kazdej zmianie; realny sync leci 2 s po ostatniej. */
export function scheduleSync(delayMs = 2000): void {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    void syncNow();
  }, delayMs);
}

export function startSyncTriggers(): () => void {
  const appState = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncNow();
  });

  const netInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) void syncNow();
  });

  void syncNow();

  return () => {
    appState.remove();
    netInfo();
    if (debounce) clearTimeout(debounce);
  };
}

/** Po zalogowaniu na nowym urzadzeniu ciagniemy cala historie od zera. */
export async function resetPullWatermark(): Promise<void> {
  await setState(LAST_PULLED_KEY, EPOCH);
  await setState(LAST_PULLED_DAYS_KEY, EPOCH);
  await setState(LAST_PULLED_PHOTOS_KEY, EPOCH);
}
