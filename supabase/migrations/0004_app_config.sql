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
