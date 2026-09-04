// Sprawdza, czy projekt Supabase jest gotowy dla aplikacji.
//
//   npm run check-supabase
//
// Najwazniejszy jest test izolacji: zaklada DWA konta anonimowe, pisze wpis
// z pierwszego i probuje przeczytac go z drugiego. Jesli sie uda, polityki RLS
// nie dzialaja i prywatne zapiski jednego uzytkownika sa widoczne dla innych.
// To jedyny blad z tej listy, ktory konczy sie wyciekiem danych.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
const { supabaseUrl: url, supabaseKey: key } = config.expo.extra ?? {};

if (!url || !key) {
  console.error('Brak supabaseUrl / supabaseKey w app.json.');
  console.error('Najpierw: npm run set-supabase -- <adres> <klucz>');
  process.exit(1);
}

let failures = 0;
const ok = (msg) => console.log(`  OK   ${msg}`);
const bad = (msg) => {
  console.log(`  BLAD ${msg}`);
  failures += 1;
};

const rest = (path, token, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${token ?? key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20000),
  });

async function signInAnonymously() {
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token ? { token: data.access_token, id: data.user?.id } : null;
}

console.log('\nTabele i konfiguracja');

const TABLES = ['gratitude_entries', 'gratitude_days', 'gratitude_photos', 'app_config'];
for (const table of TABLES) {
  const response = await rest(`${table}?select=*&limit=1`);
  if (response.status === 404) bad(`brak tabeli ${table} — czy wykonales supabase/setup.sql?`);
  else if (response.ok || response.status === 401) ok(`tabela ${table}`);
  else bad(`tabela ${table}: HTTP ${response.status}`);
}

const bucket = await fetch(`${url}/storage/v1/bucket/gratitude-photos`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(20000),
});
if (bucket.ok) ok('bucket gratitude-photos');
else bad(`bucket gratitude-photos: HTTP ${bucket.status}`);

const policy = await rest('app_config?key=eq.ad_policy&select=value');
if (policy.ok && (await policy.json()).length > 0) ok('konfiguracja reklam (app_config)');
else bad('brak wiersza ad_policy w app_config');

console.log('\nLogowanie anonimowe');

const alice = await signInAnonymously();
if (!alice) {
  bad('nie udalo sie zalogowac anonimowo — wlacz Anonymous sign-ins w panelu');
  console.log(`\n${failures} problem(ow). Dalszych testow nie da sie wykonac.\n`);
  process.exit(1);
}
ok('konto anonimowe utworzone');

console.log('\nIzolacja danych (RLS)');

const today = new Date().toISOString().slice(0, 10);
const write = await rest('gratitude_entries', alice.token, {
  method: 'POST',
  headers: { Prefer: 'return=representation' },
  body: JSON.stringify({
    user_id: alice.id,
    entry_date: today,
    slot: 1,
    text: 'test izolacji RLS',
  }),
});

if (!write.ok) {
  bad(`zapis wlasnego wpisu nie powiodl sie: HTTP ${write.status} ${await write.text()}`);
} else {
  ok('wlasny wpis zapisany');

  const bob = await signInAnonymously();
  if (!bob) {
    bad('nie udalo sie utworzyc drugiego konta — testu izolacji nie wykonano');
  } else {
    const leak = await rest(`gratitude_entries?select=*&user_id=eq.${alice.id}`, bob.token);
    const rows = leak.ok ? await leak.json() : [];

    if (rows.length === 0) {
      ok('drugie konto NIE widzi cudzych wpisow');
    } else {
      bad(`WYCIEK: drugie konto odczytalo ${rows.length} cudzych wpisow. Polityki RLS nie dzialaja.`);
    }

    // Proba zapisu na cudze konto — RLS musi ja odrzucic.
    const forge = await rest('gratitude_entries', bob.token, {
      method: 'POST',
      body: JSON.stringify({ user_id: alice.id, entry_date: today, slot: 2, text: 'podszycie' }),
    });
    if (forge.ok) bad('WYCIEK: drugie konto zapisalo wpis na cudze user_id.');
    else ok('drugie konto NIE moze pisac na cudze user_id');
  }

  // sprzatanie
  await rest(`gratitude_entries?user_id=eq.${alice.id}`, alice.token, { method: 'DELETE' });
}

console.log(
  failures === 0
    ? '\nWszystko gotowe. Mozesz uruchomic aplikacje.\n'
    : `\n${failures} problem(ow) do naprawienia.\n`
);
process.exit(failures === 0 ? 0 : 1);
