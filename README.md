# Wdzięczność

Aplikacja mobilna (Android + iOS) do codziennego zapisywania **trzech rzeczy, za które jest się wdzięcznym**. Do każdej można dołączyć zdjęcie. Wszystko zapisuje się lokalnie i — po podpięciu e-maila — w chmurze, żeby dało się odzyskać wpisy na nowym telefonie.

Stos: **Expo SDK 57 / React Native 0.86 / TypeScript**, backend na **Supabase** (Postgres + Storage + Auth).

Warstwa wizualna pochodzi z konceptu klienta (`assets/brand/`): kremowe tło, szałwiowa zieleń, złote akcenty, nagłówki krojem Lora.

## Uruchomienie

```bash
npm install
```

```bash
npx expo start
```

Aplikacja działa **bez skonfigurowanej chmury** — zapisuje wtedy tylko lokalnie i nie synchronizuje. To celowe: da się ją rozwijać i testować, zanim powstanie projekt Supabase.

## Konfiguracja Supabase

1. Utwórz nowy projekt na [supabase.com](https://supabase.com).
2. Wykonaj **obie** migracje w SQL Editor, po kolei:
   - [`supabase/migrations/0001_gratitude.sql`](supabase/migrations/0001_gratitude.sql) — wpisy, zdjęcia, RLS, bucket
   - [`supabase/migrations/0002_days.sql`](supabase/migrations/0002_days.sql) — nastrój, ulubione, tagi, notatka dodatkowa
3. W **Authentication → Providers → Email** włącz **Anonymous sign-ins**.
4. W **Authentication → Email Templates** podmień w szablonach *Confirm signup*, *Magic Link* i *Change Email Address* odnośnik na sam kod:

   ```
   {{ .Token }}
   ```

   Bez tego Supabase wyśle **link**, a aplikacja prosi o **sześciocyfrowy kod** — logowanie nie przejdzie.
5. Wklej dane projektu do `app.json` → `expo.extra`:

   ```json
   "extra": {
     "supabaseUrl": "https://twoj-projekt.supabase.co",
     "supabaseKey": "sb_publishable_..."
   }
   ```

   Klucz publishable w aplikacji mobilnej jest jawny — i tak da się go wyciągnąć z paczki. Bezpieczeństwo stoi **wyłącznie** na RLS, dlatego każda tabela i bucket mają polityki `auth.uid() = user_id`.

## Ekrany

| Zakładka | Plik | Co robi |
|---|---|---|
| Dzisiaj | [`(tabs)/index.tsx`](src/app/(tabs)/index.tsx) | Powitanie, karta zachęty, wybór nastroju, skrót do statystyk |
| Notatki | [`(tabs)/notes.tsx`](src/app/(tabs)/notes.tsx) | Lista dni, wyszukiwarka, filtry Wszystkie / Ulubione / Zdjęcia |
| **+** | [`note/[date].tsx`](src/app/note/[date].tsx) | Edytor dnia — trzy sloty, tagi, notatka dodatkowa |
| Statystyki | [`(tabs)/stats.tsx`](src/app/(tabs)/stats.tsx) | Seria, liczniki, wykres nastroju, najczęstsze kategorie |
| Ustawienia | [`(tabs)/settings.tsx`](src/app/(tabs)/settings.tsx) | Przypomnienie, motyw, język, kopia zapasowa, konto, eksport, blokada |

Przycisk „+" nie jest zakładką — otwiera edytor jako okno modalne. Dlatego pasek jest własny ([`tab-bar.tsx`](src/components/tab-bar.tsx)), a nie systemowy.

## Jak to działa

### Trzy stałe sloty zamiast listy wpisów

Tożsamość wiersza to `(user_id, entry_date, slot)`, gdzie `slot ∈ {1,2,3}`. „Usunięcie" wdzięczności to wyczyszczenie slotu, a nie `DELETE`. Dzięki temu synchronizacja nie potrzebuje tombstone'ów — pusty slot sam niesie informację i propaguje się zwykłym last-write-wins. Limit trzech na dzień egzekwuje baza (`CHECK` + `UNIQUE`), nie tylko interfejs.

Właściwości całego dnia — nastrój, ulubiony, tagi, notatka dodatkowa — siedzą w osobnej tabeli `days`. Dzień ma jeden nastrój, nie trzy.

### Lokalnie najpierw

SQLite ([`src/db/`](src/db)) jest źródłem prawdy dla interfejsu — ekrany nigdy nie czekają na sieć. Synchronizacja ([`src/sync/sync.ts`](src/sync/sync.ts)) dokleja się w tle: upload zdjęć → upsert wpisów → upsert dni → delta-pull → sprzątanie osieroconych plików. Wyzwalacze: powrót aplikacji na pierwszy plan, 2 s po ostatniej edycji, odzyskanie sieci.

Znacznik `last_pulled_at` bierzemy **z odpowiedzi serwera**, nigdy z zegara telefonu — a `updated_at` w Postgresie nadpisuje trigger. Rozjechany zegar urządzenia inaczej przeskoczyłby część zmian na zawsze.

### Konto anonimowe → konto z e-mailem

Pierwsze uruchomienie loguje anonimowo. Anonimowy użytkownik ma prawdziwy wiersz w `auth.users`, więc RLS działa od pierwszej sekundy i wpisy trafiają do chmury zanim ktokolwiek poda adres. Podpięcie e-maila **nie zmienia `user_id`** — cała historia zostaje.

Dopóki e-mail nie jest podpięty, odinstalowanie aplikacji kasuje dostęp bezpowrotnie. Stąd pasek zachęty po piątym zapisanym dniu ([`protect-banner.tsx`](src/components/protect-banner.tsx)).

### Zdjęcia

Żyją w `documentDirectory/photos/`, nigdy w cache — system czyści cache przy braku miejsca, a wpis wyglądałby wtedy na uszkodzony. Kompresja (dłuższa krawędź do 1600 px, JPEG 0.8) idzie **przed** zapisem lokalnym. Po pull-cie na nowym urządzeniu pliki pobierają się **leniwie**, dopiero gdy trafią na ekran.

### Języki

Siedem: EN, ES, PT, FR, DE, IT, PL. Daty formatuje `Intl.DateTimeFormat`, nigdy ręczne sklejanie.

```bash
npm run check-locales
```

pilnuje, żeby wszystkie pliki miały ten sam zestaw kluczy. Brakujący klucz objawia się w aplikacji jako goły identyfikator i zwykle zauważa się to dopiero po publikacji.

## Znak marki i ikony

Dostarczona ikona 1024 px miała symbol na ~13% kadru — po masce sklepu byłby nieczytelny. Znak został przerysowany na wektor:

```bash
npm run trace-mark && npm run verify-mark && npm run make-icons
```

- `trace-mark` — nadpróbkowuje `mark.png` 6×, rozmywa antyaliasing, obrysowuje krawędzie pikseli, upraszcza RDP i zamienia na krzywe → `assets/brand/mark.svg`
- `verify-mark` — liczy pokrycie maski względem oryginału (obecnie **98,5%**) i składa obrazek porównawczy
- `make-icons` — z wektora generuje ikonę 1024, warstwę adaptacyjną Androida (w bezpiecznej strefie 61%), wariant monochromatyczny i splash

Chcesz inny stopień wygładzenia? Podnieś `EPSILON` i `BLUR` w [`scripts/trace-mark.mjs`](scripts/trace-mark.mjs) i uruchom ponownie.

## Odstępstwa od makiet

| Makieta | Tutaj | Dlaczego |
|---|---|---|
| Przycisk „Zapisz notatkę" | Zapis automatyczny | Nie da się stracić wpisu przez zamknięcie okna ani ubicie aplikacji |
| Jedno zdjęcie na notatkę | Jedno na każdą z trzech wdzięczności | Pierwotne wymaganie zamawiającego |
| Tagi tylko na Statystykach | Chipy do wyboru w edytorze | Makiety nigdzie nie pozwalają ich wpisać, więc sekcja nie miałaby skąd brać danych |
| „Hasło / Blokada" | Odcisk palca / kod urządzenia | Własne hasło trzeba przechowywać i resetować; zapomniane = utrata dostępu |
| „Kopia zapasowa" | Stan synchronizacji z Supabase | Nie ma osobnego mechanizmu kopii — wpisy i tak jadą do chmury po każdej zmianie |

## Weryfikacja

```bash
npm run typecheck && npm run check-locales && npx expo-doctor
```

Scenariusze do przejścia na **fizycznym urządzeniu** (emulator nie sprawdzi aparatu, odcisku palca ani realnego zachowania offline):

| Co | Jak |
|---|---|
| Trwałość lokalna | Zapisz 3 wdzięczności ze zdjęciami → ubij aplikację z listy zadań → otwórz ponownie |
| Izolacja RLS | Z drugiego konta spróbuj `select * from gratitude_entries` i `createSignedUrl` na cudzej ścieżce — oba muszą zwrócić pusto |
| Offline | Tryb samolotowy → zapisz wpis i zdjęcie → włącz sieć → sprawdź w Supabase Studio, że wiersz i plik doleciały |
| Przerwany upload | To samo, ale ubij aplikację w trakcie wysyłki — po restarcie sync musi dokończyć |
| **Odzyskanie** | Podepnij e-mail → **odinstaluj** → zainstaluj → zaloguj się tym samym adresem → wpisy i zdjęcia wracają |
| Blokada | Włącz blokadę → przełącz aplikację w tło → wróć: musi poprosić o odcisk palca |
| Seria dni | Zapisz wpis, poczekaj do północy: seria ma się utrzymać, a nie wyzerować |
| i18n | Zmień język systemu na niemiecki i włoski — żaden napis nie może wyjść poza przycisk |

## Publikacja

Buildy przez EAS (`eas build --platform all`). Wymaga konta Apple Developer (99 USD/rok) i Google Play Console (25 USD jednorazowo). Oba sklepy wymagają polityki prywatności pod publicznym URL — aplikacja zbiera zdjęcia i adres e-mail.

## Struktura

```
src/
  app/              ekrany (expo-router)
    (tabs)/         Dzisiaj, Notatki, Statystyki, Ustawienia
    note/[date].tsx edytor dnia (modal spod przycisku +)
    backup.tsx      stan synchronizacji
    account.tsx     podpięcie e-maila / odzyskanie konta
  db/               SQLite: wpisy, dni, statystyki, eksport JSON
  sync/             klient Supabase, silnik synchronizacji
  photos/           picker, kompresja, przechowywanie
  i18n/             i18next + 7 plików tłumaczeń, formatowanie dat
  lock/             blokada aplikacji (odcisk palca / kod)
  theme/            provider motywu Jasny / Ciemny / Systemowy
  notifications/    lokalne przypomnienie dzienne
  components/       pasek zakładek, edytor, nastrój, wykres, karty
assets/brand/       materiały od klienta + wygenerowany mark.svg
scripts/            tracer znaku, generator ikon, test tłumaczeń
supabase/migrations/
```
