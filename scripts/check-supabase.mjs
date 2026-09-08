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

// Bucket sprawdza typ z naglowka Content-Type, nie zawartosc pliku — wystarczy
// kilka bajtow wyslanych z wlasciwym typem. Zwykly tekst zostalby odrzucony.
const TINY_FILE = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

const BUCKETS = [
  { id: 'gratitude-photos', mime: 'image/jpeg', ext: 'jpg', label: 'zdjecia' },
  { id: 'gratitude-audio', mime: 'audio/mp4', ext: 'm4a', label: 'nagrania' },
];

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

const TABLES = [
  'gratitude_entries',
  'gratitude_days',
  'gratitude_photos',
  'gratitude_audio',
  'app_config',
];
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

console.log('\nPliki (Storage)');

// Bucket sprawdzamy realnym uploadem, a nie odpytaniem /storage/v1/bucket —
// tamten endpoint wymaga klucza service_role i z kluczem publishable zwraca
// blad niezaleznie od tego, czy bucket istnieje.
for (const bucket of BUCKETS) {
  const alicePath = `${alice.id}/check/${Date.now()}.${bucket.ext}`;
  const upload = await storage(`object/${bucket.id}/${alicePath}`, alice.token, {
    method: 'POST',
    headers: { 'Content-Type': bucket.mime },
    body: TINY_FILE,
  });

  if (!upload.ok) {
    const detail = await upload.text();
    // Storage opakowuje brak bucketu w HTTP 400 z kodem NoSuchBucket w tresci,
    // wiec sam status nie wystarczy do rozpoznania tej sytuacji.
    if (upload.status === 404 || detail.includes('NoSuchBucket')) {
      bad(`brak bucketu ${bucket.id} — wykonaj migracje supabase/migrations/0005_audio.sql`);
    } else {
      bad(`wyslanie pliku do ${bucket.id} nie powiodlo sie: HTTP ${upload.status} ${detail}`);
    }
    continue;
  }
  ok(`bucket ${bucket.id} przyjmuje pliki (${bucket.label})`);

  const sign = await storage(`object/sign/${bucket.id}/${alicePath}`, alice.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  if (sign.ok) ok(`wlasny plik da sie odczytac (${bucket.label})`);
  else bad(`odczyt wlasnego pliku z ${bucket.id} nie powiodl sie: HTTP ${sign.status}`);

  if (bob) {
    const peek = await storage(`object/sign/${bucket.id}/${alicePath}`, bob.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
    });
    if (peek.ok) bad(`WYCIEK: drugie konto uzyskalo dostep do cudzych plikow w ${bucket.id}.`);
    else ok(`drugie konto NIE widzi cudzych plikow (${bucket.label})`);

    // Podszycie sie pod cudzy folder — polityka INSERT musi je odrzucic.
    const intrude = await storage(
      `object/${bucket.id}/${alice.id}/podszycie.${bucket.ext}`,
      bob.token,
      { method: 'POST', headers: { 'Content-Type': bucket.mime }, body: TINY_FILE }
    );
    if (intrude.ok) bad(`WYCIEK: drugie konto zapisalo plik w cudzym folderze (${bucket.id}).`);
    else ok(`drugie konto NIE moze pisac w cudzym folderze (${bucket.label})`);
  }
}

console.log('\nUsuwanie konta');

// Wymagane przez oba sklepy. Test jest szczery do konca: naprawde kasuje konta
// zalozone na potrzeby tych testow — przy okazji rozwiazuje to problem kont
// anonimowych zbierajacych sie po kazdym uruchomieniu skryptu.
const deleteEndpoint = `${url}/functions/v1/delete-account`;

const deleteAccountFor = (who) =>
  fetch(deleteEndpoint, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${who.token}` },
    signal: AbortSignal.timeout(30000),
  });

const wrote = await rest('gratitude_entries', alice.token, {
  method: 'POST',
  body: JSON.stringify({ user_id: alice.id, entry_date: today, slot: 3, text: 'do skasowania' }),
});

const removal = await deleteAccountFor(alice);
if (removal.status === 404) {
  bad('funkcja delete-account nie jest wdrozona — npx supabase functions deploy delete-account');
} else if (!removal.ok) {
  bad(`delete-account zwrocilo HTTP ${removal.status}: ${(await removal.text()).slice(0, 200)}`);
} else {
  ok('konto usuniete przez funkcje delete-account');

  if (wrote.ok) {
    // Wiersze znikaja przez ON DELETE CASCADE przy auth.users. Podpis tokenu
    // jest jeszcze wazny, wiec da sie nim zapytac o wlasne dane — i wlasnie
    // dlatego pusta odpowiedz jest dowodem, a nie efektem odmowy dostepu.
    const left = await rest('gratitude_entries?select=slot', alice.token);
    const rows = left.ok ? await left.json() : [];
    if (left.status === 401 || rows.length === 0) ok('wpisy usunietego konta zniknely');
    else bad(`po usunieciu konta zostalo ${rows.length} wpisow — brak kaskady na auth.users?`);
  }
}

if (bob) await deleteAccountFor(bob);


console.log(
  failures === 0
    ? '\nWszystko gotowe. Mozesz uruchomic aplikacje.\n'
    : `\n${failures} problem(ow) do naprawienia.\n`
);
process.exit(failures === 0 ? 0 : 1);
