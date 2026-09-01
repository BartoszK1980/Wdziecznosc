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
