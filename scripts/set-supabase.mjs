// Wpisuje adres i klucz Supabase do app.json i sprawdza, czy dzialaja.
//
//   npm run set-supabase -- https://twoj-projekt.supabase.co sb_publishable_xxx
//
// Zamiast recznej edycji app.json, bo latwo tam wkleic zly klucz i zorientowac
// sie dopiero na urzadzeniu. Ten skrypt od razu odpytuje serwer i mowi, co jest
// nie tak.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(root, 'app.json');

const [url, key] = process.argv.slice(2);

if (!url || !key) {
  console.error('Uzycie: npm run set-supabase -- <adres-projektu> <klucz-publishable>');
  console.error('Oba znajdziesz w panelu Supabase: Project Settings -> API');
  process.exit(1);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  console.error(`Adres wyglada niepoprawnie: ${url}`);
  console.error('Oczekiwany format: https://abcdefgh.supabase.co');
  process.exit(1);
}

/**
 * Klucz service_role omija RLS i daje dostep do danych WSZYSTKICH uzytkownikow.
 * W aplikacji mobilnej jest jawny, wiec wpisanie go tutaj byloby wyciekiem
 * calej bazy. Sprawdzamy to, zanim trafi do pliku.
 */
if (key.includes('service_role') || key.startsWith('sbp_')) {
  console.error('To wyglada na klucz service_role albo token dostepu — NIE WOLNO go tu wpisywac.');
  console.error('Potrzebny jest klucz publishable (anon), ten przeznaczony dla klientow.');
  process.exit(1);
}

const cleanUrl = url.replace(/\/$/, '');

// --- sprawdzenie polaczenia ---------------------------------------------
process.stdout.write('Sprawdzam polaczenie... ');
try {
  const response = await fetch(`${cleanUrl}/auth/v1/settings`, {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });

  if (response.status === 401) {
    console.error('\nSerwer odpowiedzial, ale odrzucil klucz (401). Sprawdz, czy klucz nalezy do tego projektu.');
    process.exit(1);
  }
  if (!response.ok) {
    console.error(`\nSerwer odpowiedzial bledem HTTP ${response.status}.`);
    process.exit(1);
  }

  const settings = await response.json();
  console.log('OK');

  // Logowanie anonimowe to warunek dzialania aplikacji od pierwszego uruchomienia.
  if (settings.external_anonymous_users_enabled === false) {
    console.warn('\nUWAGA: logowanie anonimowe jest WYLACZONE w tym projekcie.');
    console.warn('Wlacz je: Authentication -> Sign In / Providers -> Anonymous sign-ins.');
    console.warn('Bez tego aplikacja nie zapisze niczego w chmurze.');
  }
} catch (error) {
  console.error(`\nNie udalo sie polaczyc: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

// --- zapis do app.json ---------------------------------------------------
const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.expo.extra = { ...config.expo.extra, supabaseUrl: cleanUrl, supabaseKey: key };
writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

console.log(`Zapisano w app.json -> expo.extra`);
console.log('\nPozostalo:');
console.log('  1. Wklej supabase/setup.sql w SQL Editor i uruchom');
console.log('  2. Podmien szablony e-mail na {{ .Token }}');
console.log('     (Authentication -> Emails: Confirm signup, Magic Link, Change Email Address)');
console.log('  3. npm run check-supabase');
