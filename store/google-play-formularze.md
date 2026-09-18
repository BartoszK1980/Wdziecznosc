# Google Play — odpowiedzi do formularzy

Gotowe odpowiedzi do przeklikania w Play Console → **Zasady aplikacji → Treści aplikacji**
oraz **Główna strona aplikacji w sklepie**. Stan kodu na 18 września 2026.

> Każdą zmianę zbieranych danych (nowa biblioteka, analityka, logowanie przez Google)
> trzeba odzwierciedlić **w trzech miejscach naraz**: tutaj, w polityce prywatności
> (`docs/polityka-prywatnosci.html`) i w samym formularzu w Play Console. Sklep porównuje
> je ze sobą i z tym, co faktycznie wysyła aplikacja.

---

## Adresy (GitHub Pages, bez domeny)

Po włączeniu GitHub Pages (patrz niżej) strony będą pod adresami:

| Do czego | Adres |
|---|---|
| Polityka prywatności | `https://bartoszk1980.github.io/Wdziecznosc/polityka-prywatnosci.html` |
| Usunięcie konta | `https://bartoszk1980.github.io/Wdziecznosc/usun-konto.html` |
| Witryna aplikacji | `https://bartoszk1980.github.io/Wdziecznosc/` |

**Włączenie GitHub Pages (jednorazowo, Ty):** repozytorium na GitHubie → *Settings* →
*Pages* → *Source: Deploy from a branch* → *Branch: `main`*, folder **`/docs`** → *Save*.
Strona pojawia się po 1–2 minutach.

**Przed publikacją** podmień w `docs/polityka-prywatnosci.html` i `docs/usun-konto.html`:
`ADMINISTRATOR` (imię i nazwisko) oraz `ADRES-KONTAKTOWY` (e-mail).

---

## Bezpieczeństwo danych (Data safety)

### Pytania ogólne

| Pytanie | Odpowiedź |
|---|---|
| Czy aplikacja zbiera lub udostępnia wymagane typy danych użytkowników? | **Tak** |
| Czy wszystkie dane są szyfrowane podczas przesyłania? | **Tak** |
| Czy użytkownicy mogą poprosić o usunięcie danych? | **Tak** |
| Czy aplikacja umożliwia tworzenie kont? | **Tak** — nazwa użytkownika/hasło: nie; *inny sposób*: konto anonimowe tworzone automatycznie, opcjonalnie powiązane z adresem e-mail przez jednorazowy kod |
| Adres URL do usunięcia konta | adres „Usunięcie konta” z tabeli wyżej |

### Typy danych

„Udostępniane” w rozumieniu Google = przekazywane stronie trzeciej, która używa ich
**we własnych celach**. Usługodawcy działający w naszym imieniu (Supabase, Brevo,
RevenueCat) **nie** czynią danych udostępnianymi. Google AdMob — tak, bo używa ich
do własnej reklamy i analityki.

| Kategoria → typ | Zbierane | Udostępniane | Cel | Opcjonalne |
|---|---|---|---|---|
| Lokalizacja → **Przybliżona lokalizacja** | tak | **tak** | Reklamy lub marketing; Statystyki; Zapobieganie oszustwom, bezpieczeństwo i zgodność | nie |
| Informacje osobiste → **Adres e-mail** | tak | nie | Zarządzanie kontem | **tak** |
| Informacje osobiste → **Identyfikatory użytkownika** | tak | nie | Funkcje aplikacji; Zarządzanie kontem | nie |
| Informacje finansowe → **Historia zakupów** | tak | nie | Funkcje aplikacji | **tak** |
| Zdjęcia i filmy → **Zdjęcia** | tak | nie | Funkcje aplikacji | **tak** |
| Pliki audio → **Nagrania głosowe lub dźwiękowe** | tak | nie | Funkcje aplikacji | **tak** |
| Aktywność w aplikacji → **Interakcje z aplikacją** | tak | **tak** | Reklamy lub marketing; Statystyki; Zapobieganie oszustwom… | nie |
| Aktywność w aplikacji → **Inne treści generowane przez użytkowników** | tak | nie | Funkcje aplikacji | nie |
| Informacje o aplikacji i wydajności → **Diagnostyka** | tak | **tak** | Reklamy lub marketing; Statystyki; Zapobieganie oszustwom… | nie |
| Identyfikatory urządzenia lub inne → **Identyfikatory urządzenia lub inne** | tak | **tak** | Reklamy lub marketing; Statystyki; Zapobieganie oszustwom… | nie |

Źródło danych reklamowych: dokumentacja Google
[Play data disclosure dla Google Mobile Ads SDK](https://developers.google.com/admob/android/privacy/play-data-disclosure)
— SDK zbiera i udostępnia adres IP (szacowanie lokalizacji), interakcje, diagnostykę
i identyfikatory urządzenia.

**Nie zaznaczaj:** dokładnej lokalizacji, kontaktów, wiadomości, historii przeglądania,
plików i dokumentów, kalendarza, danych o zdrowiu i fitnessie.

Przy każdym typie pytanie „Czy dane są przetwarzane tymczasowo?” → **nie**
(wszystkie są przechowywane).

---

## Pozostałe deklaracje treści

| Deklaracja | Odpowiedź | Uwagi |
|---|---|---|
| **Reklamy** — czy aplikacja zawiera reklamy? | **Tak** | baner AdMob |
| **Identyfikator wyświetlania reklam** — czy aplikacja go używa? | **Tak** → Reklamy lub marketing; Statystyki | uprawnienie `AD_ID` jest w scalonym manifeście |
| **Dostęp do aplikacji** | Wszystkie funkcje dostępne bez specjalnego dostępu | konto zakłada się samo, bez logowania |
| **Grupa docelowa** | **16–17 lat i 18+** | zgodne z polityką prywatności („nie dla osób poniżej 16 lat”). **Nie zaznaczaj** grup poniżej 13 lat — to uruchamia program Rodzina i wyklucza reklamy spersonalizowane |
| **Aplikacja informacyjna (News)** | Nie | |
| **Aplikacje związane ze zdrowiem** | Nie jest aplikacją medyczną | patrz uwaga niżej |
| **Funkcje finansowe** | Brak | subskrypcja to zakup w aplikacji, nie usługa finansowa |
| **Aplikacja rządowa** | Nie | |

**Uwaga o zdrowiu — decyzja do przemyślenia.** Aplikacja zapisuje nastrój, co Google
może uznać za funkcję „dobrostanu”. Moja rekomendacja: deklarować jako dziennik
ogólnego przeznaczenia, bez twierdzeń medycznych — tak też są napisane opisy w
`store/opisy/`. Nie dodawaj do opisów sformułowań w rodzaju „leczy”, „terapia”,
„zdrowie psychiczne”, bo przesuwają aplikację w stronę surowszych wymogów.

---

## Ankieta klasyfikacji treści (IARC)

Kategoria aplikacji: **Wszystkie inne typy aplikacji** (nie gra).

| Pytanie | Odpowiedź |
|---|---|
| Przemoc, krew, treści seksualne, wulgaryzmy, substancje, hazard | **Nie** na wszystkie |
| Czy użytkownicy mogą komunikować się lub wymieniać treści z innymi? | **Nie** — wpisy są prywatne, bez udostępniania innym |
| Czy aplikacja udostępnia lokalizację użytkownika innym użytkownikom? | **Nie** |
| Czy aplikacja umożliwia zakupy produktów cyfrowych? | **Tak** — roczna subskrypcja bez reklam |
| Nieograniczony dostęp do internetu (przeglądarka)? | **Nie** |

Spodziewana klasyfikacja: **PEGI 3 / Dla wszystkich**, z oznaczeniem zakupów w aplikacji.

---

## Główna strona aplikacji w sklepie

| Pole | Wartość |
|---|---|
| Nazwa, krótki i pełny opis | `store/opisy/<język>.md` — sprawdzone `npm run check-listing` |
| Język domyślny | polski (pl-PL) |
| Pozostałe tłumaczenia | en-US, de-DE, es-ES, fr-FR, it-IT, **pt-PT** — teksty są w portugalskim europejskim, jak interfejs aplikacji (nie pt-BR) |
| Kategoria | **Styl życia** — rekomendacja zamiast „Zdrowie i fitness”, z powodu opisanego wyżej |
| Adres e-mail kontaktowy | **publiczny**, widoczny w sklepie — ten sam co `ADRES-KONTAKTOWY` |
| Witryna | adres „Witryna aplikacji” z tabeli na górze |
| Ikona 512×512 | `store/grafiki/ikona-512.png` |
| Grafika promocyjna 1024×500 | `store/grafiki/promo-<język>.png` |
| Zrzuty ekranu telefonu | `store/zrzuty/<język>/` — od 2 do 8 na język |

---

## Subskrypcja (po założeniu konta Google Play)

| Pole | Wartość |
|---|---|
| Identyfikator produktu | `wdziecznosc_bez_reklam_rok` (nie da się go później zmienić) |
| Okres | 1 rok |
| Cena bazowa | **49,99 zł** (decyzja z 16 września 2026) |
| RevenueCat — uprawnienie | `no_ads` (tak nazywa się w kodzie: `src/monetization/entitlement.ts`) |
| RevenueCat — pakiet | `annual` |
