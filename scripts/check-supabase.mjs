// Sprawdza, czy projekt Supabase jest gotowy dla aplikacji.
//
//   npm run check-supabase
//
// Najwazniejsze sa testy izolacji: zakladaja DWA konta anonimowe, pisza wpis
// i zdjecie z pierwszego i probuja siegnac po nie z drugiego. Jesli sie uda,
// polityki RLS nie dzialaja i prywatne zapiski jednego uzytkownika sa widoczne
// dla innych. To jedyne bledy z tej listy, ktore koncza sie wyciekiem danych.
//
// Wszystkie zapytania po zalogowaniu ida z TOKENEM UZYTKOWNIKA, nie z samym
// kluczem publishable. Polityki tego projektu sa pisane `to authenticated`,
// wiec zapytanie bez tokenu zwraca pusta liste i wyglada jak brak danych,
// mimo ze wszystko jest na miejscu.
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

const BUCKET = 'gratitude-photos';
// Najkrotszy poprawny JPEG: sam znacznik poczatku i konca obrazu. Bucket ma
// liste dozwolonych typow MIME, wiec zwykly tekst zostalby odrzucony.
const TINY_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

let failures = 0;
const ok = (msg) => console.log(`  OK   ${msg}`);
const bad = (msg) => {
  console.log(`  BLAD ${msg}`);
  failures += 1;
};

const headers = (token, extra = {}) => ({
  apikey: key,
  Authorization: `Bearer ${token ?? key}`,
  ...extra,
});

const rest = (path, token, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: headers(token, { 'Content-Type': 'application/json', ...(init.headers ?? {}) }),
    signal: AbortSignal.timeout(20000),
  });

const storage = (path, token, init = {}) =>
  fetch(`${url}/storage/v1/${path}`, {
    ...init,
    headers: headers(token, init.headers ?? {}),
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

console.log('\nTabele');

const TABLES = ['gratitude_entries', 'gratitude_days', 'gratitude_photos', 'app_config'];
for (const table of TABLES) {
  const response = await rest(`${table}?select=*&limit=1`);
  if (response.status === 404) bad(`brak tabeli ${table} — czy wykonales supabase/setup.sql?`);
  else if (response.ok || response.status === 401) ok(`tabela ${table}`);
  else bad(`tabela ${table}: HTTP ${response.status}`);
}

console.log('\nLogowanie anonimowe');

const alice = await signInAnonymously();
if (!alice) {
  bad('nie udalo sie zalogowac anonimowo — wlacz Anonymous sign-ins w panelu');
  console.log(`\n${failures} problem(ow). Dalszych testow nie da sie wykonac.\n`);
  process.exit(1);
}
ok('konto anonimowe utworzone');

const bob = await signInAnonymously();
if (!bob) bad('nie udalo sie utworzyc drugiego konta — testow izolacji nie wykonano');

console.log('\nKonfiguracja reklam');

const policy = await rest('app_config?key=eq.ad_policy&select=value', alice.token);
if (!policy.ok) {
  bad(`odczyt app_config: HTTP ${policy.status}`);
} else {
  const rows = await policy.json();
  if (rows.length === 0) {
    bad('brak wiersza ad_policy w app_config');
  } else {
    const on = Object.entries(rows[0].value?.banners ?? {})
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
    ok(`ad_policy wczytana (banery: ${on.join(', ') || 'zadnych'})`);
  }
}

console.log('\nIzolacja wpisow (RLS)');

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

  if (bob) {
    const leak = await rest(`gratitude_entries?select=*&user_id=eq.${alice.id}`, bob.token);
    const rows = leak.ok ? await leak.json() : [];

    if (rows.length === 0) ok('drugie konto NIE widzi cudzych wpisow');
    else bad(`WYCIEK: drugie konto odczytalo ${rows.length} cudzych wpisow. Polityki RLS nie dzialaja.`);

    // Proba zapisu na cudze konto — RLS musi ja odrzucic.
    const forge = await rest('gratitude_entries', bob.token, {
      method: 'POST',
      body: JSON.stringify({ user_id: alice.id, entry_date: today, slot: 2, text: 'podszycie' }),
    });
    if (forge.ok) bad('WYCIEK: drugie konto zapisalo wpis na cudze user_id.');
    else ok('drugie konto NIE moze pisac na cudze user_id');
  }

  await rest(`gratitude_entries?user_id=eq.${alice.id}`, alice.token, { method: 'DELETE' });
}

console.log('\nZdjecia (Storage)');

// Bucket sprawdzamy realnym uploadem, a nie odpytaniem /storage/v1/bucket —
// tamten endpoint wymaga klucza service_role i z kluczem publishable zwraca
// blad niezaleznie od tego, czy bucket istnieje.
const alicePath = `${alice.id}/check/${Date.now()}.jpg`;
const upload = await storage(`object/${BUCKET}/${alicePath}`, alice.token, {
  method: 'POST',
  headers: { 'Content-Type': 'image/jpeg' },
  body: TINY_JPEG,
});

if (!upload.ok) {
  const detail = await upload.text();
  if (upload.status === 404) bad(`brak bucketu ${BUCKET} — czy wykonales supabase/setup.sql?`);
  else bad(`wyslanie zdjecia nie powiodlo sie: HTTP ${upload.status} ${detail}`);
} else {
  ok(`bucket ${BUCKET} przyjmuje zdjecia`);

  const sign = await storage(`object/sign/${BUCKET}/${alicePath}`, alice.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (sign.ok) ok('wlasne zdjecie da sie odczytac');
  else bad(`odczyt wlasnego zdjecia nie powiodl sie: HTTP ${sign.status}`);

  if (bob) {
    const peek = await storage(`object/sign/${BUCKET}/${alicePath}`, bob.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
    });
    if (peek.ok) bad('WYCIEK: drugie konto uzyskalo dostep do cudzego zdjecia.');
    else ok('drugie konto NIE widzi cudzych zdjec');

    // Podszycie sie pod cudzy folder — polityka INSERT musi je odrzucic.
    const intrude = await storage(`object/${BUCKET}/${alice.id}/podszycie.jpg`, bob.token, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg' },
      body: TINY_JPEG,
    });
    if (intrude.ok) bad('WYCIEK: drugie konto zapisalo plik w cudzym folderze.');
    else ok('drugie konto NIE moze pisac w cudzym folderze');
  }

  await storage(`object/${BUCKET}/${alicePath}`, alice.token, { method: 'DELETE' });
}

console.log(
  failures === 0
    ? '\nWszystko gotowe. Mozesz uruchomic aplikacje.\n'
    : `\n${failures} problem(ow) do naprawienia.\n`
);
process.exit(failures === 0 ? 0 : 1);
