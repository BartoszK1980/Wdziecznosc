# Test zamknięty w Google Play — plan krok po kroku

Nowe konto prywatne w Google Play musi przejść **test zamknięty: co najmniej 12 testerów
zapisanych bez przerwy przez 14 dni**. Dopiero potem można poprosić o dostęp do wersji
produkcyjnej. Jeśli liczba testerów spadnie poniżej 12, licznik 14 dni zaczyna się od zera.

Pliki w tym folderze:

| Plik | Do czego |
|---|---|
| `README.md` | ten plan i lista kontrolna |
| `zaproszenie-znajomi.md` | gotowe wiadomości do znajomych i instrukcja dla testera (PL) |
| `wymiana-testow.md` | grupy wzajemnego testowania + gotowy post po angielsku |
| `dziennik-testow.md` | lista testerów, zebrane uwagi i szkic odpowiedzi dla Google |

---

## Lista kontrolna przed startem

- [ ] Weryfikacja konta w Play Console zakończona (tożsamość, telefon, urządzenie)
- [x] Administrator i adres kontaktowy uzupełnione w `docs/polityka-prywatnosci.html` i `docs/usun-konto.html`
- [ ] GitHub Pages włączone, polityka prywatności otwiera się pod
      `https://bartoszk1980.github.io/Wdziecznosc/polityka-prywatnosci.html`
- [x] Zrzuty „Moje notatki” z wpisem demonstracyjnym
- [ ] `npx.cmd eas login` wykonane
- [ ] Plik AAB zbudowany (`eas build -p android --profile production`)
- [ ] Grupa Google dla testerów założona
- [ ] Co najmniej 15 osób zadeklarowało udział (zapas na rezygnacje)

---

## Krok 1. Grupa Google dla testerów

Dzięki grupie testerzy zapisują się sami, a Ty nie przepisujesz adresów do Play Console.

1. Wejdź na https://groups.google.com → **Utwórz grupę**.
2. Nazwa: `Testerzy Wdzięczność`, adres np. `testerzy-wdziecznosc@googlegroups.com`.
3. **Kto może wyszukać grupę:** każdy w internecie.
   **Kto może dołączyć:** każdy może dołączyć (bez zatwierdzania — inaczej testerzy z
   wymiany będą czekać na Ciebie).
   **Kto może publikować / wyświetlać wątki:** tylko właściciele (żeby grupa nie zbierała spamu).
4. Zapisz link do grupy: `https://groups.google.com/g/testerzy-wdziecznosc`.

## Krok 2. Aplikacja w Play Console

1. **Utwórz aplikację** → nazwa `Wdzięczność – dziennik`, język domyślny polski,
   aplikacja (nie gra), bezpłatna. Zaakceptuj oświadczenia.
2. **Zasady aplikacji → Treści aplikacji** — wypełnij według `store/google-play-formularze.md`.
3. **Główna strona aplikacji w sklepie** — teksty z `store/opisy/`, grafiki z `store/grafiki/`,
   zrzuty z `store/zrzuty/`.

## Krok 3. Ścieżka testu zamkniętego

1. **Testowanie → Test zamknięty → Alpha → Zarządzaj ścieżką**.
2. **Kraje/regiony:** zaznacz **wszystkie kraje**. Testerzy z grup wymiany są z całego
   świata — jeśli zostawisz tylko Polskę, nie zainstalują aplikacji.
3. **Testerzy:** dodaj **Grupę Google** (`testerzy-wdziecznosc@googlegroups.com`).
4. **Adres URL lub e-mail do przesyłania opinii:** `bartoszkubiak2@o2.pl`.
5. **Utwórz wersję** → wgraj plik AAB.
   Pole „Informacje o wersji” — wklej:

   ```
   <pl-PL>
   Pierwsza wersja testowa. Dziękuję, że pomagasz! Uwagi wysyłaj przez Sklep Play (sekcja „Opinia prywatna”) lub e-mailem.
   </pl-PL>
   <en-US>
   First test version. Thank you for helping! Please send feedback through the Play Store (private feedback) or by e-mail.
   </en-US>
   ```

6. **Sprawdź i wdróż** → **Wyślij do sprawdzenia** (Przegląd publikacji). Sprawdzenie trwa
   zwykle od kilku dni do tygodnia.
7. Po zatwierdzeniu skopiuj **link dla testerów** (zakładka *Testerzy* na dole). Ma postać
   `https://play.google.com/apps/testing/com.bartoszkubiak.wdziecznosc`.
   Ten link idzie do wszystkich zaproszeń.

> Zaproszenia możesz rozsyłać już w trakcie sprawdzania — ludzie zapiszą się do grupy,
> a link do instalacji dostaną, gdy Google zatwierdzi wersję.

## Krok 4. 14 dni testów

- **Codziennie** zajrzyj w Play Console → *Test zamknięty* → liczba testerów. Jeśli zbliża
  się do 12, dobierz kogoś z zapasu.
- **Wypełniaj `dziennik-testow.md`** — kto dołączył, jakie uwagi, co poprawiłeś.
- **Wydaj 1–2 aktualizacje** w trakcie (nawet drobne poprawki). Google patrzy, czy aplikacja
  jest rozwijana na podstawie testów.
- W tym czasie: konto AdMob i prawdziwe identyfikatory reklam, produkt subskrypcji
  `wdziecznosc_bez_reklam_rok` i RevenueCat.
- Jeśli korzystasz z wymiany testów — **testuj aplikacje innych rzetelnie przez 14 dni**.
  Inaczej oni też odinstalują Twoją.

## Krok 5. Wniosek o dostęp do produkcji

Po 14 dniach w Play Console pojawi się **Wyślij prośbę o dostęp do wersji produkcyjnej**.
Pytania dotyczą przebiegu testów — szkic odpowiedzi jest w `dziennik-testow.md`.
Rozpatrzenie trwa zwykle do 7 dni. Testerów **nie wypisuj** przed decyzją Google.
