// Pilnuje, zeby wszystkie 7 tlumaczen mialo DOKLADNIE ten sam zestaw kluczy co en.json.
// Brakujacy klucz w jednym jezyku objawia sie w apce jako goly identyfikator
// ("account.protectCta") zamiast tekstu — i to zwykle dopiero po publikacji.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'i18n', 'locales');

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );

const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const reference = flatten(JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'))).sort();

let failed = false;
for (const file of files) {
  const keys = flatten(JSON.parse(readFileSync(join(dir, file), 'utf8'))).sort();
  const missing = reference.filter((k) => !keys.includes(k));
  const extra = keys.filter((k) => !reference.includes(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`${file}: ${missing.length} brakuje, ${extra.length} nadmiarowych`);
    missing.forEach((k) => console.error(`  - ${k}`));
    extra.forEach((k) => console.error(`  + ${k}`));
  } else {
    console.log(`${file}: ok (${keys.length} kluczy)`);
  }
}
process.exit(failed ? 1 : 0);
