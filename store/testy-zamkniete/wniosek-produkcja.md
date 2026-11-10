# Wniosek o dostęp do wersji produkcyjnej — gotowe odpowiedzi

Kiedy: **najwcześniej 9 listopada 2026** (12 testerów od 26.10 + 14 dni), i tylko jeśli przez
cały ten czas w Play Console było co najmniej 12 testerów.

Gdzie: Play Console → Panel → **Prześlij prośbę o możliwość udostępnienia aplikacji w wersji
produkcyjnej**. Formularz ma 3 części; każdą zatwierdza się przyciskiem **Dalej** (ostatnią
**Zastosuj**) — bez tego wpisane odpowiedzi przepadają.

Odpowiedzi są po angielsku — formularz czytają recenzenci Google. Miejsca oznaczone `[[…]]`
uzupełnij tuż przed wysłaniem (dane z ostatnich dni testu). Pisz prawdę: Google widzi
statystyki instalacji i aktywności testerów i porównuje je z odpowiedziami.

Źródło struktury pytań: [Centrum pomocy Play Console](https://support.google.com/googleplay/android-developer/answer/14151465#production)
— dokładne brzmienie i listy wyboru widać dopiero w formularzu.

---

## Część 1. O teście zamkniętym

### Jak łatwo było znaleźć testerów? (wybór z listy)

Wybierz opcję w rodzaju **„Trudno” / „Somewhat difficult”** — zgodnie z prawdą: pierwsze dni
to 1 tester, potrzebne były społeczności wymiany testów.

### Describe the engagement you received from testers during your closed test

> The closed test ran on the Alpha track in 178 countries from 20 October 2026. Testers were
> recruited through Android developer testing communities (the google-play-test-users and
> testers-20 Google Groups) and from people who replied to our posts there, and joined via a dedicated
> Google Group. We reached 12 opted-in testers on 26 October and kept at least 12 for the
> following 14 days.
>
> Testers installed the app on a mix of physical phones (e.g. a Motorola Moto g06 on
> Android 15) and emulators. They used the core flow — writing daily gratitude entries,
> choosing categories, setting the day's mood — and checked that entries persist after
> force-stopping and reopening the app, appear in "My notes", and update the statistics
> (streak, counters, mood chart). Several testers sent written reports with screenshots;
> in total 5 testers sent written feedback, and others confirmed by e-mail that the app
> installed and ran without problems.

### Did testers' usage match how you expect production users to use the app? Describe any differences.

> Mostly yes. In production we expect short daily sessions: open the app once a day (often
> after the evening reminder), write one to three gratitudes, optionally add a photo or a voice
> note, and occasionally browse past days or statistics. Testers followed the same core flow.
> The main difference is that testers were mostly other developers, so they explored many
> screens in a single session and wrote placeholder entries, while real users will build up
> entries over weeks. Long-term features — streaks, the mood chart and the calendar — were
> therefore tested with only a few days of data. Voice notes and photo attachments were used
> less than we expect from real users.

### Summarize the feedback you received from testers and how you collected it

> Feedback came through the Play Store private feedback channel, e-mail
> (bartoszkubiak2@o2.pl) and replies in the testing community threads. Testers reported no
> crashes. The main points were:
> 1. The Today card asked to "write down 3 things", but a new note starts with a single field
>    and the "Add another" button only appears after typing — the copy did not match the UI.
> 2. Reopening an already saved entry for today still showed "New note" as the title.
> 3. The statistics screen used incorrect plurals ("1 Notes").
> 4. In our own testing we found that denying the notification permission showed the message
>    "Reminders are not available in this build" instead of explaining that permission is
>    missing.
> Testers confirmed that saving, reopening and listing entries, categories and statistics
> 5. The streak card showed "1 days in a row" — plural forms were wrong in several languages
>    (reported by two testers).
> 6. The ad consent screen greets users with the app's Polish name ("Wdziecznosc"), while the
>    store listing uses "Gratitude"; a tester suggested using the same name in both places.
> Testers confirmed that saving, reopening and listing entries, categories and statistics
> worked correctly on real devices.

---

## Część 2. O aplikacji

### Who is the intended audience of your app?

> Adults and older teens (16+) who want to build a simple daily gratitude or journaling
> habit — people interested in well-being, mindfulness and self-reflection who prefer a short,
> private daily routine on their phone instead of a paper journal. The app is available in
> 7 languages (English, Polish, German, Spanish, French, Italian, Portuguese). It is a
> general-purpose journal and makes no medical or therapeutic claims.

### Describe how your app provides value to users

> Gratitude is a simple daily journal: each day the user writes down a few things they are
> grateful for, which takes about a minute. Each gratitude can include up to three photos or a
> voice note, and the day can have a mood, categories and an extra note. The app works fully
> offline and saves everything on the device immediately; an optional cloud backup lets users
> restore entries on a new phone. Users can browse past days in a list or calendar, search and
> filter entries, see their streak, a mood chart and what they are most often grateful for, set
> a daily reminder, lock the app with biometrics and export all their data. Entries are private —
> they are never read, sold or used for advertising. The app is free with a banner ad; an
> optional yearly subscription removes ads, and all features are available without it.

### Estimated installs in the first year (wybór z listy)

Wybierz **najniższy realistyczny przedział**, np. **„0–1 000”** albo **„1 000–10 000”**.
Aplikacja nie ma budżetu na reklamę, a zawyżona prognoza nic nie daje.

---

## Część 3. Gotowość do publikacji

### What changes did you make to your app based on what you learned during closed testing?

> We published two updates during the closed test:
> - **Version 1.0.0 (3)** enabled code shrinking and optimisation (R8) and resource shrinking,
>   which Play Console flagged as below the recommended level. The download size for new
>   installs went down to about 26 MB. Before releasing it we tested the optimised build on a
>   clean emulator (saving entries, statistics, settings, notification permission, reminders,
>   the ad consent form) to make sure the optimisation did not break any features.
> - **Version 1.0.1 (5)** fixed all issues reported by testers: the Today card copy now matches
>   the editor; an already saved entry is titled "Note" instead of "New note"; the statistics
>   use correct singular and plural forms in all 7 languages (including Polish, which has three
>   plural forms); and denying the notification permission now shows a clear message explaining
>   how to enable notifications in the phone settings.
> - **Version 1.0.2 (6)** fixed singular and plural forms everywhere (the streak card and the
>   editor limits) in all 7 languages, after two testers still saw "1 days in a row".
> - **Version 1.0.3 (7)** switched to production AdMob ad units and added the GDPR consent form
>   (with a "Do not consent" option) for users in the EU.
> - **Version 1.0.4 (8)** added the optional yearly "No ads" subscription via Google Play
>   Billing; all app features remain free.
> - The tester's note about the app name on the ad consent screen will be addressed by
>   aligning the name shown there with the store listing.

### How did you decide that your app is ready for production?

> - At least 12 testers kept the app installed for over 14 days on different devices and
>   Android versions; testers reported no crashes or ANRs, and Android vitals shows no crash or
>   ANR data for the test period.
> - Every functional issue reported during the test was fixed and verified (versions 1.0.1 and
>   1.0.2).
> - Core flows (writing entries, attachments, reminders, statistics, backup, data export and
>   account deletion) were tested on emulators and real devices.
> - Play Console's pre-launch checks and the policy status show no issues; the store listing,
>   privacy policy, data safety form and account-deletion page are complete and consistent.
> - The latest release was approved by Play review without problems.

---

## Lista kontrolna przed wysłaniem (9.11)

- [ ] Play Console: krok „14 dni z co najmniej 12 testerami” odhaczony
- [ ] Android Vitals: brak awarii (crash rate / ANR) — sprawdź i uzupełnij część 3
- [ ] Uzupełnione wszystkie `[[…]]`
- [ ] Wersja 1.0.1 (5) zatwierdzona na ścieżce testu zamkniętego
- [ ] Aplikacje z wymian nadal zainstalowane (nie odinstalowuj przed decyzją Google)

Rozpatrzenie wniosku trwa zwykle do 7 dni. Po zgodzie odblokuje się ścieżka Produkcyjna —
wtedy przenosimy wersję z testu do produkcji.

---

## Wersja wpisana do formularza 10.11.2026 (limit 300 znaków na odpowiedź)

1. Recruiting: Through Android developer test-exchange communities (Google Groups such as testers-20 and google-play-test-users) and direct e-mail swaps with other indie developers: I tested their apps and they tested mine. No paid testing services were used.
2. Trudność: **Trudno**.
3. Engagement: 12+ testers on real phones (e.g. Moto g06, Android 15) and emulators wrote daily entries, set moods and categories, used statistics, reminders and photos, and checked data after restarts. This matches real daily use, but testers explored more screens per session and had only days of history.
4. Feedback: Collected by e-mail, Play private feedback and community threads; 5 testers sent written reports, some with screenshots. No crashes reported. Issues: Today card text, saved-entry title, wrong plurals ("1 days in a row"), notification-permission message, app name on the consent screen.
5. Audience: Adults and older teens (16+) who want a simple daily gratitude or journaling habit: people interested in well-being, mindfulness and self-reflection who prefer a short, private routine on their phone. Available in 7 languages. A general journal with no medical or therapeutic claims.
6. Value: In about a minute a day users note what they are grateful for, with photos, voice notes, mood and categories. Works offline with optional cloud backup; calendar, search, streaks, mood chart, reminders, biometric lock, data export. Entries stay private. Free with ads; optional yearly no-ads plan.
7. Instalacje w 1. roku: **0 – 10 tys.**
8. Changes: 1.0.1 fixed the Today card text, saved-entry title, plurals and the notification-permission message, and enabled R8. 1.0.2 fixed plural forms in all 7 languages. 1.0.3 added production ads with a GDPR consent form; 1.0.4 an optional no-ads subscription. Consent screen name to match the listing.
9. Readiness: 12+ testers kept it over 14 days on varied devices with no crashes or ANRs reported; every functional issue was fixed and verified; core flows tested on real devices and emulators; no policy issues; listing, privacy policy, data safety and account deletion are complete; releases passed review.
