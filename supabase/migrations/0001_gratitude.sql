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
