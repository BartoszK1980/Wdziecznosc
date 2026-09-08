-- Notatki glosowe: jedno nagranie przy KAZDEJ wdziecznosci.
--
-- Ta sama zasada co przy zdjeciach — tozsamosc wiersza to (user_id, entry_date,
-- slot), wiec skasowanie nagrania jest wyzerowaniem `path`, a nie DELETE.
-- Synchronizacja dalej nie potrzebuje znacznikow usuniecia.
--
-- Jedno nagranie na slot, nie lista: zdjecie ilustruje, a nagranie OPOWIADA.
-- Drugie nagranie przy tym samym zdaniu nie dopowiada nic, czego nie zalatwia
-- dluzsze pierwsze.
--
-- W przeciwienstwie do wczesniejszych migracji polityki maja `drop ... if exists`,
-- wiec ten plik mozna wykonac w bazie, ktora juz raz przeszla setup.sql.

create table if not exists public.gratitude_audio (
  user_id     uuid not null references auth.users(id) on delete cascade,
  entry_date  date not null,
  slot        smallint not null check (slot >= 1 and slot <= 10),
  -- Sciezka w prywatnym buckecie 'gratitude-audio'. NULL = slot bez nagrania.
  path        text,
  -- Dlugosc w milisekundach. Trzymana przy wierszu, zeby lista wpisow mogla
  -- pokazac "0:14" bez pobierania samego pliku z chmury.
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, entry_date, slot)
);

create index if not exists gratitude_audio_sync_idx
  on public.gratitude_audio (user_id, updated_at);

drop trigger if exists gratitude_audio_touch_updated_at on public.gratitude_audio;
create trigger gratitude_audio_touch_updated_at
  before insert or update on public.gratitude_audio
  for each row execute function public.touch_updated_at();

alter table public.gratitude_audio enable row level security;

drop policy if exists gratitude_audio_select_own on public.gratitude_audio;
drop policy if exists gratitude_audio_insert_own on public.gratitude_audio;
drop policy if exists gratitude_audio_update_own on public.gratitude_audio;
drop policy if exists gratitude_audio_delete_own on public.gratitude_audio;

create policy gratitude_audio_select_own on public.gratitude_audio
  for select to authenticated using (auth.uid() = user_id);
create policy gratitude_audio_insert_own on public.gratitude_audio
  for insert to authenticated with check (auth.uid() = user_id);
create policy gratitude_audio_update_own on public.gratitude_audio
  for update to authenticated using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy gratitude_audio_delete_own on public.gratitude_audio
  for delete to authenticated using (auth.uid() = user_id);

-- Bucket na nagrania ---------------------------------------------------------
--
-- Osobny od zdjec, bo tamten ma liste dozwolonych typow MIME ograniczona do
-- obrazow. Limit 10 MB przy 128 kb/s to okolo dziesiec minut mowy — znacznie
-- wiecej, niz potrzebuje jedno zdanie wdziecznosci.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gratitude-audio', 'gratitude-audio', false,
  10485760, -- 10 MB
  array['audio/m4a','audio/mp4','audio/aac','audio/x-m4a','audio/3gpp','audio/mpeg']
)
on conflict (id) do nothing;

drop policy if exists gratitude_audio_files_select on storage.objects;
drop policy if exists gratitude_audio_files_insert on storage.objects;
drop policy if exists gratitude_audio_files_update on storage.objects;
drop policy if exists gratitude_audio_files_delete on storage.objects;

-- Pierwszy segment sciezki to user_id wlasciciela — dokladnie ten sam wzorzec
-- co przy zdjeciach. Bez tego kazdy zalogowany widzialby cudze nagrania.
create policy gratitude_audio_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'gratitude-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gratitude_audio_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'gratitude-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gratitude_audio_files_update on storage.objects
  for update to authenticated
  using (bucket_id = 'gratitude-audio' and (storage.foldername(name))[1] = auth.uid()::text);
create policy gratitude_audio_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'gratitude-audio' and (storage.foldername(name))[1] = auth.uid()::text);
