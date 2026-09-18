// Trwale usuniecie konta wraz z calą zawartoscia.
//
// Wymagane przez OBA sklepy dla aplikacji zakladajacych konto:
//   - Apple, wytyczna 5.1.1(v): "If your app supports account creation, you
//     must also offer account deletion within the app."
//   - Google Play: sciezka w aplikacji ORAZ publiczny adres WWW dla osob,
//     ktore aplikacje juz odinstalowaly (patrz docs/usun-konto.html).
//
// Dlaczego funkcja brzegowa, a nie kod w aplikacji: skasowanie wiersza
// z auth.users wymaga klucza service_role, ktory omija RLS i daje dostep do
// danych WSZYSTKICH uzytkownikow. W aplikacji mobilnej kazdy klucz jest jawny,
// wiec umieszczenie go tam oznaczaloby oddanie calej bazy. Tutaj klucz zostaje
// na serwerze, a jedyne, co przyjmujemy z zewnatrz, to token uzytkownika —
// i kasujemy dokladnie to konto, do ktorego ten token nalezy.
//
// Wdrozenie:
//   npx supabase functions deploy delete-account
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const BUCKETS = ['gratitude-photos', 'gratitude-audio'];

/** Ile poziomow katalogow schodzimy. Sciezki maja ksztalt {uid}/{data}/{plik}. */
const MAX_DEPTH = 3;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Zbiera sciezki wszystkich plikow pod danym prefiksem.
 *
 * Storage nie ma listowania rekurencyjnego — `list` zwraca wpisy jednego
 * poziomu, przy czym katalog rozpoznaje sie po braku `id`. Stad wlasne
 * schodzenie w glab.
 */
async function collectFiles(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
  depth = 0
): Promise<string[]> {
  if (depth >= MAX_DEPTH) return [];

  const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error || !data) return [];

  const files: string[] = [];
  for (const entry of data) {
    const path = `${prefix}/${entry.name}`;
    if (entry.id === null) files.push(...(await collectFiles(admin, bucket, path, depth + 1)));
    else files.push(path);
  }
  return files;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'not-configured' }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Tozsamosc bierzemy WYLACZNIE z tokenu. Gdyby id konta przychodzilo
  // w tresci zadania, kazdy zalogowany mogl by skasowac cudze konto.
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return json({ error: 'unauthorized' }, 401);

  // Pliki najpierw. Wiersze w tabelach znikaja same przez ON DELETE CASCADE
  // przy auth.users, ale Storage nie jest z nim powiazany zadnym kluczem obcym —
  // bez tego kroku zdjecia i nagrania zostalyby w buckecie na zawsze.
  for (const bucket of BUCKETS) {
    const files = await collectFiles(admin, bucket, user.id);
    for (let i = 0; i < files.length; i += 100) {
      await admin.storage.from(bucket).remove(files.slice(i, i + 100));
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true });
});
