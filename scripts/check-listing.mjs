// Sprawdza opisy do Google Play pod katem limitow znakow.
//
//   npm run check-listing
//
// Play Console odrzuca za dlugi tekst dopiero przy zapisie, pojedynczo dla
// kazdego jezyka i pola — przy siedmiu jezykach to dwadziescia jeden szans na
// odbicie sie od formularza. Lepiej wiedziec wczesniej.
//
// Znaki liczymy jako punkty kodowe Unicode (for...of), a nie jednostki UTF-16
// (.length) — inaczej emoji i czesc znakow liczylaby sie podwojnie i skrypt
// odrzucalby teksty, ktore Play przyjmuje.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'store', 'opisy');

const FIELDS = [
  { header: '## Nazwa (max 30)', label: 'nazwa', max: 30 },
  { header: '## Krotki opis (max 80)', label: 'krotki', max: 80 },
  { header: '## Pelny opis (max 4000)', label: 'pelny', max: 4000 },
];

const length = (text) => [...text].length;

function section(content, header) {
  const start = content.indexOf(header);
  if (start < 0) return null;
  const from = start + header.length;
  const next = content.indexOf('\n## ', from);
  return content.slice(from, next < 0 ? undefined : next).trim();
}

let failed = false;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
  const content = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  const parts = [];
  for (const field of FIELDS) {
    const text = section(content, field.header);
    if (text === null || text === '') {
      parts.push(`${field.label}: BRAK`);
      failed = true;
      continue;
    }
    const n = length(text);
    const over = n > field.max;
    if (over) failed = true;
    parts.push(`${field.label} ${n}/${field.max}${over ? ' ZA DLUGI' : ''}`);
  }
  console.log(`${file.padEnd(6)} ${parts.join(' | ')}`);
}
process.exit(failed ? 1 : 0);
