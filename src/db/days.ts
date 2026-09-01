import { dateKey, getDb, nowIso, type DayRow, type Mood, type Tag } from './db';

export type DayMeta = {
  date: string;
  mood: Mood | null;
  favorite: boolean;
  note: string;
  tags: Tag[];
};

export const MAX_NOTE_LENGTH = 1000;

const parseTags = (raw: string): Tag[] => {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Tag[]) : [];
  } catch {
    // uszkodzony JSON nie moze wywrocic ekranu — dzien po prostu nie ma tagow
    return [];
  }
};

const toMeta = (row: DayRow): DayMeta => ({
  date: row.entry_date,
  mood: (row.mood as Mood) ?? null,
  favorite: row.favorite === 1,
  note: row.note ?? '',
  tags: parseTags(row.tags),
});

const emptyMeta = (date: string): DayMeta => ({
  date,
  mood: null,
  favorite: false,
  note: '',
  tags: [],
});

export async function loadDayMeta(date: string): Promise<DayMeta> {
  const db = await getDb();
  const row = await db.getFirstAsync<DayRow>('SELECT * FROM days WHERE entry_date = ?', [date]);
  return row ? toMeta(row) : emptyMeta(date);
}

/** Metadane wielu dni naraz — lista notatek potrzebuje ich do serduszek. */
export async function loadDayMetaMap(dates: string[]): Promise<Map<string, DayMeta>> {
  if (dates.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.getAllAsync<DayRow>(
    `SELECT * FROM days WHERE entry_date IN (${dates.map(() => '?').join(',')})`,
    dates
  );
  return new Map(rows.map((row) => [row.entry_date, toMeta(row)]));
}

async function ensureDay(date: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO days (entry_date, updated_at, dirty) VALUES (?, ?, 1)
     ON CONFLICT(entry_date) DO NOTHING`,
    [date, nowIso()]
  );
}

async function patchDay(date: string, column: string, value: unknown): Promise<void> {
  const db = await getDb();
  await ensureDay(date);
  await db.runAsync(
    `UPDATE days SET ${column} = ?, updated_at = ?, dirty = 1 WHERE entry_date = ?`,
    [value as never, nowIso(), date]
  );
}

/** Ponowne stukniecie w ten sam nastroj go zdejmuje — bez osobnego "wyczysc". */
export const setMood = (date: string, mood: Mood | null) => patchDay(date, 'mood', mood);

export const setNote = (date: string, note: string) =>
  patchDay(date, 'note', note.trim() === '' ? null : note.slice(0, MAX_NOTE_LENGTH));

export const setTags = (date: string, tags: Tag[]) =>
  patchDay(date, 'tags', JSON.stringify(tags));

export async function toggleFavorite(date: string): Promise<boolean> {
  const current = await loadDayMeta(date);
  const next = !current.favorite;
  await patchDay(date, 'favorite', next ? 1 : 0);
  return next;
}

// --- statystyki -------------------------------------------------------------

export type Stats = {
  streak: number;
  days: number;
  entries: number;
  moods: { date: string; mood: Mood }[];
  tags: { tag: Tag; count: number }[];
};

const CONTENT = `((text IS NOT NULL AND trim(text) <> '') OR photo_local_uri IS NOT NULL OR photo_path IS NOT NULL)`;

/**
 * Seria = liczba kolejnych dni z wpisem, liczona wstecz.
 *
 * Start jest dzisiaj ALBO wczoraj: gdyby liczyc wylacznie od dzisiaj, seria
 * kasowalaby sie o polnocy i przez caly dzien pokazywala zero, dopoki uzytkownik
 * czegos nie zapisze. To karalo za to, ze ktos jeszcze nie zdazyl.
 */
async function currentStreak(dates: Set<string>): Promise<number> {
  const day = new Date();
  if (!dates.has(dateKey(day))) {
    day.setDate(day.getDate() - 1);
    if (!dates.has(dateKey(day))) return 0;
  }

  let streak = 0;
  while (dates.has(dateKey(day))) {
    streak += 1;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}

export async function loadStats(moodWindow = 14): Promise<Stats> {
  const db = await getDb();

  const dayRows = await db.getAllAsync<{ entry_date: string }>(
    `SELECT DISTINCT entry_date FROM entries WHERE ${CONTENT} ORDER BY entry_date DESC`
  );
  const dates = new Set(dayRows.map((r) => r.entry_date));

  const entryCount = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM entries WHERE ${CONTENT}`
  );

  const moodRows = await db.getAllAsync<{ entry_date: string; mood: number }>(
    `SELECT entry_date, mood FROM days
      WHERE mood IS NOT NULL
      ORDER BY entry_date DESC
      LIMIT ?`,
    [moodWindow]
  );

  const tagRows = await db.getAllAsync<{ tags: string }>(
    `SELECT tags FROM days WHERE tags <> '[]'`
  );
  const counts = new Map<Tag, number>();
  tagRows.forEach((row) =>
    parseTags(row.tags).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1))
  );

  return {
    streak: await currentStreak(dates),
    days: dates.size,
    entries: entryCount?.n ?? 0,
    // z powrotem chronologicznie — wykres rysuje sie od lewej do prawej
    moods: moodRows.reverse().map((r) => ({ date: r.entry_date, mood: r.mood as Mood })),
    tags: [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}
