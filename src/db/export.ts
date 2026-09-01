import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { dateKey, getDb, type EntryRow } from './db';

type ExportedEntry = Pick<EntryRow, 'entry_date' | 'slot' | 'text' | 'updated_at'> & {
  /** Liczba zdjec przy tym wpisie — same pliki zostaja poza eksportem. */
  photos: number;
};

/**
 * Eksport tekstow do JSON-a, przez systemowy arkusz udostepniania.
 *
 * Zdjecia zostaja poza plikiem — sa w chmurze i w katalogu aplikacji, a wrzucenie
 * ich w base64 zrobiloby z eksportu plik nie do otwarcia. Zamiast tego kazdy wpis
 * niesie LICZBE zdjec, zeby bylo widac, gdzie i ile ich jest.
 *
 * Plik ladatuje w cache — jest jednorazowy, po udostepnieniu system moze go usunac.
 */
export async function exportEntriesJson(): Promise<boolean> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow & { photos: number }>(
    `SELECT e.entry_date, e.slot, e.text, e.updated_at,
            (SELECT COUNT(*) FROM entry_photos p
              WHERE p.entry_date = e.entry_date AND p.slot = e.slot
                AND (p.local_uri IS NOT NULL OR p.path IS NOT NULL)) AS photos
       FROM entries e
      WHERE (e.text IS NOT NULL AND trim(e.text) <> '')
         OR EXISTS (SELECT 1 FROM entry_photos p
                     WHERE p.entry_date = e.entry_date AND p.slot = e.slot
                       AND (p.local_uri IS NOT NULL OR p.path IS NOT NULL))
      ORDER BY e.entry_date DESC, e.slot`
  );

  const entries: ExportedEntry[] = rows.map((row) => ({
    entry_date: row.entry_date,
    slot: row.slot,
    text: row.text,
    updated_at: row.updated_at,
    photos: row.photos,
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
