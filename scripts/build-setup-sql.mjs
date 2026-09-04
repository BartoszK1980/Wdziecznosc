// Skleja migracje w JEDEN plik do wklejenia w SQL Editor Supabase.
//
//   npm run setup-sql
//
// Powod: cztery osobne migracje trzeba wykonac w scislej kolejnosci, a pomylka
// w niej konczy sie bledem "function touch_updated_at does not exist" albo
// brakiem tabeli. Jeden plik usuwa te klase bledow — wklejasz raz i gotowe.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrations = join(root, 'supabase', 'migrations');
const target = join(root, 'supabase', 'setup.sql');

const files = readdirSync(migrations)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const header = `-- Wdzięczność — pełna konfiguracja bazy w jednym pliku.
--
-- WYGENEROWANE przez scripts/build-setup-sql.mjs. Nie edytuj tego pliku ręcznie;
-- zmieniaj migracje w supabase/migrations/ i uruchom \`npm run setup-sql\`.
--
-- Jak użyć:
--   1. Otwórz swój projekt na supabase.com
--   2. SQL Editor -> New query
--   3. Wklej całą zawartość tego pliku i uruchom
--
-- Skleja ${files.length} migracji w kolejności: ${files.join(', ')}
-- Wykonanie jest bezpieczne wielokrotnie z jednym wyjątkiem: polityki RLS
-- tworzone są bez IF NOT EXISTS, więc druga próba zgłosi "policy already
-- exists". To znaczy, że baza jest już skonfigurowana, a nie że coś się zepsuło.

`;

const body = files
  .map((file) => {
    const sql = readFileSync(join(migrations, file), 'utf8').trimEnd();
    return `-- ${'='.repeat(70)}\n-- ${file}\n-- ${'='.repeat(70)}\n\n${sql}\n`;
  })
  .join('\n');

writeFileSync(target, header + body, 'utf8');

const lines = (header + body).split('\n').length;
console.log(`Sklejono ${files.length} migracji -> supabase/setup.sql (${lines} linii)`);
files.forEach((f) => console.log(`  - ${f}`));
