-- Wdzięczność — pełna konfiguracja bazy w jednym pliku.
--
-- WYGENEROWANE przez scripts/build-setup-sql.mjs. Nie edytuj tego pliku ręcznie;
-- zmieniaj migracje w supabase/migrations/ i uruchom `npm run setup-sql`.
--
-- Jak użyć:
--   1. Otwórz swój projekt na supabase.com
--   2. SQL Editor -> New query
--   3. Wklej całą zawartość tego pliku i uruchom
--
-- Skleja 4 migracji w kolejności: 0001_gratitude.sql, 0002_days.sql, 0003_slots_and_photos.sql, 0004_app_config.sql
-- Wykonanie jest bezpieczne wielokrotnie z jednym wyjątkiem: polityki RLS
-- tworzone są bez IF NOT EXISTS, więc druga próba zgłosi "policy already
-- exists". To znaczy, że baza jest już skonfigurowana, a nie że coś się zepsuło.

-- ======================================================================
-- 0001_gratitude.sql
-- ======================================================================

-- Schemat aplikacji "Trzy wdziecznosci".
--
-- Dzien ma trzy STALE sloty (slot 1..3), a nie liste wpisow. Tozsamosc wiersza to
-- (user_id, entry_date, slot). Konsekwencja: "usuniecie" wdziecznosci to wyczyszczenie
-- slotu (text = NULL, photo_path = NULL), a nie DELETE. Dzieki temu synchronizacja
-- nie potrzebuje tombstone'ow — pusty wiersz sam w sobie niesie informacje "slot pusty"
-- i propaguje sie na inne urzadzenia zwyklym LWW.
--
-- Kolumna nazywa sie `slot`, a nie `position`, bo POSITION jest w Postgresie slowem
-- kluczowym gramatyki (COL_NAME_KEYWORD) i wymagaloby cytowania w czesci kontekstow.

create table if not exists public.gratitude_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  slot        smallint not null check (slot >= 1 and slot <= 3),
  text        text check (text is null or char_length(text) <= 280),
  -- Sciezka w prywatnym buckecie 'gratitude-photos'. NULL = slot bez zdjecia.
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Limit 3 wdziecznosci na dzien egzekwuje baza, nie tylko UI:
  -- CHECK ogranicza slot do 1..3, UNIQUE nie pozwala zdublowac slotu.
  unique (user_id, entry_date, slot)
);

-- Delta-pull klienta: "daj wszystko zmienione po znaczniku X".
create index if not exists gratitude_entries_sync_idx
  on public.gratitude_entries (user_id, updated_at);

-- updated_at MUSI pochodzic z zegara serwera ----------------------------------
-- Gdyby klient wysylal wlasne updated_at, urzadzenie ze spieszacym sie zegarem
-- wstawiloby wiersz z data z przyszlosci; drugie urzadzenie zapisaloby wtedy
-- last_pulled_at z przyszlosci i przestaloby widziec kolejne, prawidlowe zmiany.
-- Trigger odbiera klientowi kontrole nad ta kolumna.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists gratitude_entries_touch_updated_at on public.gratitude_entries;
create trigger gratitude_entries_touch_updated_at
  before insert or update on public.gratitude_entries
  for each row execute function public.touch_updated_at();

-- RLS -------------------------------------------------------------------------
alter table public.gratitude_entries enable row level security;

create policy gratitude_entries_select_own on public.gratitude_entries
  for select to authenticated using (auth.uid() = user_id);
create policy gratitude_entries_insert_own on public.gratitude_entries
  for insert to authenticated with check (auth.uid() = user_id);
create policy gratitude_entries_update_own on public.gratitude_entries
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy gratitude_entries_delete_own on public.gratitude_entries
  for delete to authenticated using (auth.uid() = user_id);

-- Storage ---------------------------------------------------------------------
-- Prywatny bucket. Sciezka pliku: {userId}/{entry_date}/{slot}-{rand}.jpg
-- Pierwszy segment sciezki to userId — na tym stoi izolacja miedzy kontami.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gratitude-photos', 'gratitude-photos', false,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do nothing;

create policy gratitude_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'gratitude-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gratitude_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gratitude-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gratitude_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'gratitude-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gratitude_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'gratitude-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ======================================================================
-- 0002_days.sql
-- ======================================================================

-- Wlasciwosci calego dnia: nastroj, ulubiony, notatka dodatkowa, tagi.
--
-- Osobna tabela od gratitude_entries, bo te dane nie naleza do slotu — dzien ma
-- jeden nastroj, nie trzy. Tozsamosc wiersza to (user_id, entry_date), wiec
-- upsert z klienta jest idempotentny tak samo jak przy wpisach.

create table if not exists public.gratitude_days (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  mood        smallint check (mood is null or (mood >= 1 and mood <= 5)),
  favorite    boolean not null default false,
  note        text check (note is null or char_length(note) <= 1000),
  -- Klucze kategorii ('family', 'health', ...), nie etykiety — tlumaczenie
  -- dzieje sie w aplikacji, wiec zmiana napisu nie wymaga ruszania danych.
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, entry_date)
);

create index if not exists gratitude_days_sync_idx
  on public.gratitude_days (user_id, updated_at);

-- Ten sam trigger co przy wpisach: updated_at musi pochodzic z zegara serwera,
-- inaczej urzadzenie ze zlym zegarem rozjechaloby znacznik pobierania.
drop trigger if exists gratitude_days_touch_updated_at on public.gratitude_days;
create trigger gratitude_days_touch_updated_at
  before insert or update on public.gratitude_days
  for each row execute function public.touch_updated_at();

alter table public.gratitude_days enable row level security;

create policy gratitude_days_select_own on public.gratitude_days
  for select to authenticated using (auth.uid() = user_id);
create policy gratitude_days_insert_own on public.gratitude_days
  for insert to authenticated with check (auth.uid() = user_id);
create policy gratitude_days_update_own on public.gratitude_days
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy gratitude_days_delete_own on public.gratitude_days
  for delete to authenticated using (auth.uid() = user_id);

-- ======================================================================
-- 0003_slots_and_photos.sql
-- ======================================================================

-- Rozszerzenie: 10 wdziecznosci dziennie zamiast 3, i do 3 zdjec przy kazdej.

-- 1. Limit slotow -----------------------------------------------------------
-- Nazwa ograniczenia pochodzi z domyslnego nazewnictwa Postgresa dla CHECK-a
-- zapisanego przy kolumnie w migracji 0001.
alter table public.gratitude_entries
  drop constraint if exists gratitude_entries_slot_check;

alter table public.gratitude_entries
  add constraint gratitude_entries_slot_check check (slot >= 1 and slot <= 10);

-- 2. Zdjecia jako osobna tabela ----------------------------------------------
-- Wczesniej wpis mial jedna kolumne photo_path. Teraz zdjecia maja wlasne
-- wiersze ze STALA pozycja 1..3 w obrebie slotu — ta sama zasada co przy
-- slotach w dniu, wiec usuniecie zdjecia to wyzerowanie wiersza, a nie DELETE,
-- i synchronizacja dalej nie potrzebuje znacznikow usuniecia.
create table if not exists public.gratitude_photos (
  user_id    uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  slot       smallint not null check (slot >= 1 and slot <= 10),
  position   smallint not null check (position >= 1 and position <= 3),
  path       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date, slot, position)
);

create index if not exists gratitude_photos_sync_idx
  on public.gratitude_photos (user_id, updated_at);

drop trigger if exists gratitude_photos_touch_updated_at on public.gratitude_photos;
create trigger gratitude_photos_touch_updated_at
  before insert or update on public.gratitude_photos
  for each row execute function public.touch_updated_at();

alter table public.gratitude_photos enable row level security;

create policy gratitude_photos_select_own on public.gratitude_photos
  for select to authenticated using (auth.uid() = user_id);
create policy gratitude_photos_insert_own on public.gratitude_photos
  for insert to authenticated with check (auth.uid() = user_id);
create policy gratitude_photos_update_own on public.gratitude_photos
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy gratitude_photos_delete_own on public.gratitude_photos
  for delete to authenticated using (auth.uid() = user_id);

-- 3. Przeniesienie dotychczasowych zdjec -------------------------------------
-- Kazde istniejace photo_path staje sie zdjeciem na pozycji 1 swojego slotu.
insert into public.gratitude_photos (user_id, entry_date, slot, position, path)
select user_id, entry_date, slot, 1, photo_path
  from public.gratitude_entries
 where photo_path is not null
on conflict (user_id, entry_date, slot, position) do nothing;

-- Kolumna zostaje do czasu, az wszystkie urzadzenia zaktualizuja aplikacje —
-- starsza wersja klienta nadal ja czyta i wysyla. Do usuniecia w 0004, po
-- wygaszeniu poprzedniej wersji w sklepach.
comment on column public.gratitude_entries.photo_path is
  'PRZESTARZALE: zastapione przez gratitude_photos. Do usuniecia po wygaszeniu klientow sprzed 10 slotow.';

-- ======================================================================
-- 0004_app_config.sql
-- ======================================================================

-- Zdalna konfiguracja rozmieszczenia reklam.
--
-- Bez niej kazda zmiana kanalu monetyzacji (przeniesienie banera, skrocenie
-- okresu bez reklam, wlaczenie reklamy pelnoekranowej) wymagalaby nowego
-- wydania i przegladu w sklepie — czyli dni albo tygodni na sprawdzenie jednej
-- hipotezy o przychodzie. Tutaj wystarczy UPDATE.
--
-- Tabela jest WSPOLNA dla wszystkich uzytkownikow i tylko do odczytu z aplikacji.

create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_config_touch_updated_at on public.app_config;
create trigger app_config_touch_updated_at
  before insert or update on public.app_config
  for each row execute function public.touch_updated_at();

alter table public.app_config enable row level security;

-- Konfiguracja nie ma kolumny user_id, wiec USING (true). Zapis wylacznie
-- z panelu Supabase (service_role omija RLS) — celowo brak polityk
-- INSERT/UPDATE/DELETE, zeby nikt nie przestawil reklam z poziomu telefonu.
create policy app_config_select_all on public.app_config
  for select to authenticated using (true);

-- Wartosc poczatkowa = to, co jest zaszyte w aplikacji jako domyslne.
-- Pola pominiete w JSON-ie sa uzupelniane wartosciami domyslnymi po stronie
-- klienta, wiec mozna nadpisac tylko jedna rzecz.
insert into public.app_config (key, value)
values (
  'ad_policy',
  '{
     "enabled": true,
     "banners": { "today": false, "notes": true, "stats": true, "settings": false, "editor": false },
     "interstitialEveryNDays": 0,
     "graceDays": 7
   }'::jsonb
)
on conflict (key) do nothing;

-- Przyklady zmian bez wydawania nowej wersji aplikacji:
--
--   -- baner takze na ekranie glownym
--   update public.app_config
--      set value = jsonb_set(value, '{banners,today}', 'true')
--    where key = 'ad_policy';
--
--   -- skrocenie okresu bez reklam do 3 dni
--   update public.app_config
--      set value = jsonb_set(value, '{graceDays}', '3')
--    where key = 'ad_policy';
--
--   -- calkowite wylaczenie reklam (np. na czas awarii AdMob)
--   update public.app_config
--      set value = jsonb_set(value, '{enabled}', 'false')
--    where key = 'ad_policy';
