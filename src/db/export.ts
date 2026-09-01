import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { dateKey, getDb, type EntryRow } from './db';

type ExportedEntry = Pick<EntryRow, 'entry_date' | 'slot' | 'text' | 'updated_at'> & {
  has_photo: boolean;
};

/**
 * Eksport tekstow do JSON-a, przez systemowy arkusz udostepniania.
 *
 * Zdjecia zostaja poza plikiem — sa w chmurze i w katalogu aplikacji, a wrzucenie
 * ich w base64 zrobiloby z eksportu plik nie do otwarcia. Zamiast tego kazdy wpis
 * niesie flage `has_photo`, zeby bylo widac, gdzie zdjecie istnieje.
 *
 * Plik ladatuje w cache — jest jednorazowy, po udostepnieniu system moze go usunac.
 */
export async function exportEntriesJson(): Promise<boolean> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT entry_date, slot, text, photo_path, photo_local_uri, updated_at
       FROM entries
      WHERE (text IS NOT NULL AND trim(text) <> '') OR photo_path IS NOT NULL OR photo_local_uri IS NOT NULL
      ORDER BY entry_date DESC, slot`
  );

  const entries: ExportedEntry[] = rows.map((row) => ({
    entry_date: row.entry_date,
    slot: row.slot,
    text: row.text,
    updated_at: row.updated_at,
    has_photo: Boolean(row.photo_path || row.photo_local_uri),
  }));

  const file = new File(Paths.cache, `wdziecznosc-${dateKey()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify({ version: 1, exported_at: new Date().toISOString(), entries }, null, 2));

  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
  });
  return true;
}
