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
