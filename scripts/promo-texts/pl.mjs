// Teksty grafik promocyjnych – polski. Uklad slajdow: scripts/make-carousels.mjs.
// &nbsp; trzyma razem krotkie slowa, zeby nie zostawaly same na koncu linii.
export default {
  ui: {
    app: 'Wdzięczność – dziennik',
    swipe: 'Przesuń →',
    answer: 'Twoja odpowiedź:',
    step: 'Krok',
    dayPrompt: 'Za co dziś jestem wdzięczny/a?',
    getIt: 'Za darmo w Google Play',
    linkBio: 'Link w bio ↑',
    searchPlay: 'Wpisz w Google Play: „Wdzięczność dziennik”',
    liWhere: 'Moja aplikacja: „Wdzięczność – dziennik” w Google Play',
    ctaSub: 'Minuta dziennie na to, co dobre. Tekstem, zdjęciem albo głosem.',
    ctaMeta: 'Android · 7 języków',
    appMeta: 'Android · 7 języków · za darmo',
    weekdays: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'],
  },

  instagram: {
    questions: {
      cover: { kicker: 'Dziennik wdzięczności', title: '10 pytań, gdy nie wiesz, co napisać', sub: 'Zapisz ten post i wróć do niego wieczorem.' },
      items: [
        'Jaka mała rzecz poszła dziś dobrze?',
        'Kto dziś wywołał Twój uśmiech?',
        'Co dziś Cię rozbawiło?',
        'Za co możesz dziś podziękować swojemu ciału?',
        'Jaki smak, zapach lub dźwięk chcesz zapamiętać z dzisiaj?',
        'Co nowego dziś Cię zaciekawiło?',
        'Komu chcesz dziś podziękować i za co?',
        'Co okazało się dziś prostsze, niż wyglądało rano?',
        'Jaka rzecz w Twoim domu ułatwia Ci życie?',
        'Na co czekasz z radością jutro?',
      ],
      cta: 'Odpowiadaj na jedno pytanie dziennie',
    },
    why: {
      cover: { kicker: 'Dziennik wdzięczności', title: 'Dlaczego warto zapisywać, za co jesteś wdzięczny', sub: '4 powody. Bez obietnic cudów.' },
      points: [
        { title: 'Uczysz się zauważać dobre', text: 'Gdy wiesz, że wieczorem coś zapiszesz, w ciągu dnia łatwiej wyłapujesz dobre chwile.' },
        { title: 'Zły dzień nie jest cały zły', text: 'Nawet w trudny dzień zwykle znajdzie się jedna mała rzecz. To zmienia perspektywę.' },
        { title: 'Minuta to łatwy nawyk', text: 'Trzy krótkie zdania. Tak mało, że trudno znaleźć wymówkę.' },
        { title: 'Masz do czego wracać', text: 'Po miesiącu masz własne archiwum dobrych chwil. Na gorsze dni jak znalazł.' },
      ],
      cta: 'Spróbuj przez 7 dni',
    },
    start: {
      cover: { kicker: 'Poradnik', title: 'Jak zacząć dziennik wdzięczności w&nbsp;1&nbsp;minutę', sub: '3 kroki w aplikacji Wdzięczność.' },
      steps: [
        'Otwórz dzisiejszą notatkę na ekranie „Dziś”',
        'Wpisz 3 małe rzeczy. Dodaj zdjęcie albo nagraj głos',
        'Wracaj codziennie i patrz, jak rośnie Twoja seria',
      ],
      cta: 'Twoja pierwsza notatka czeka',
    },
    week: {
      cover: { kicker: 'Dziennik wdzięczności', title: 'Mój tydzień wdzięczności', sub: '7 dni, po jednej małej rzeczy.' },
      days: [
        'Za kawę wypitą w ciszy, zanim wszyscy wstali.',
        'Za kolegę, który bez proszenia pomógł mi z projektem.',
        'Za spacer w deszczu bez parasola. Było zabawnie.',
        'Za telefon od siostry, chociaż nic nie musiała.',
        'Za autobus, który tym razem na mnie poczekał.',
        'Za długie śniadanie z całą rodziną.',
        'Za ciszę, dobrą książkę i ciepły koc.',
      ],
      cta: 'A jak wyglądałby Twój tydzień?',
    },
  },

  tiktok: {
    three: {
      cover: { kicker: 'Dziennik wdzięczności', title: '3 rzeczy, za które jestem dziś wdzięczny', sub: 'Minuta dziennie. Spróbuj ze mną.' },
      labels: ['Pierwsza', 'Druga', 'Trzecia'],
      items: ['Za poranną kawę wypitą w ciszy.', 'Za spacer z psem w parku.', 'Za telefon od siostry, chociaż nic nie musiała.'],
      cta: 'A Ty? Napisz jedną rzecz w komentarzu',
    },
    questions: {
      cover: { kicker: 'Na wieczór', title: '5 pytań, gdy nie wiesz, za co być wdzięcznym', sub: 'Zapisz, przyda się dziś wieczorem.' },
      cta: 'Odpowiadaj na jedno pytanie dziennie',
    },
    solo: {
      cover: { kicker: 'Po godzinach', title: 'Sam zrobiłem aplikację do dziennika wdzięczności', sub: 'Oto, co w niej jest.' },
      points: [
        { title: 'Minuta dziennie', text: 'Zapisujesz 3 małe rzeczy. Tekstem, zdjęciem albo głosem.' },
        { title: 'Tylko dla Ciebie', text: 'Działa bez internetu, a wpisy blokujesz odciskiem palca. Nikt ich nie czyta.' },
        { title: 'Widzisz postęp', text: 'Seria dni z rzędu, wykres nastroju i to, za co najczęściej dziękujesz.' },
        { title: 'Za darmo', text: 'Wszystkie funkcje bez opłat. 7 języków. Bez zakładania konta.' },
      ],
      cta: 'Daj znać, co o niej myślisz',
    },
    challenge: {
      cover: { kicker: 'Wyzwanie', title: '30 dni wdzięczności', sub: 'Zaczynasz razem ze mną?' },
      rules: {
        kicker: 'Zasady', title: 'Proste jak minuta',
        items: [
          'Codziennie zapisz 3 rzeczy, za które jesteś wdzięczny.',
          'Nie powtarzaj się. Szukaj nowych, małych rzeczy.',
          'Zaznacz dzień na kalendarzu z kolejnego slajdu.',
        ],
      },
      grid: { kicker: 'Twój kalendarz', title: 'Zrób zrzut ekranu i zaznaczaj dni', sub: 'Wróć tu za 30 dni i napisz, co się zmieniło.' },
      cta: 'Dzień 1 zaczyna się dziś',
    },
  },

  facebook: {
    launch: { kicker: 'Nowość w Google Play', title: 'Po godzinach zrobiłem aplikację do dziennika wdzięczności',
      sub: 'Minuta dziennie na to, co dobre. Działa bez internetu, a wpisy blokujesz odciskiem palca.' },
    group: { kicker: 'Na wieczór', title: '3 pytania, gdy nie wiesz, co wpisać do dziennika',
      items: ['Jaka mała rzecz poszła dziś dobrze?', 'Kto dziś zrobił dla mnie coś miłego?', 'Co dziś mnie rozbawiło?'] },
    feedback: { kicker: 'Szukam opinii', title: 'Twoja szczera opinia bardzo mi pomoże',
      sub: 'Zainstaluj, używaj przez tydzień i napisz, co działa, a co nie. Każda uwaga się liczy.' },
    challenge: { kicker: 'Wyzwanie', title: '30 dni wdzięczności. Kto wchodzi?',
      sub: 'Codziennie 3 małe rzeczy. Po miesiącu zobaczysz na wykresie, jak zmieniał się Twój nastrój.' },
    thanks: { kicker: 'Dziękuję', title: 'Dziękuję za pierwsze instalacje i opinie!',
      sub: 'Każda opinia w Sklepie Play pomaga małej aplikacji dotrzeć do kolejnych osób. Jeśli masz chwilę, zostaw swoją. Będzie mi bardzo miło.' },
  },

  linkedin: {
    launch: { kicker: 'Moja pierwsza aplikacja', title: 'Od pomysłu do Google Play – po godzinach, w&nbsp;pojedynkę',
      sub: 'Dziennik wdzięczności na Androida. Projekt, kod, 7 języków i test zamknięty z 12 testerami.' },
    test: {
      cover: { kicker: 'Poradnik dla twórców aplikacji', title: 'Jak przeszedłem test zamknięty Google Play', sub: '12 testerów, 14 dni i 5 rzeczy, które warto wiedzieć wcześniej.' },
      points: [
        { title: '12 testerów przez 14 dni', text: 'Nowe prywatne konto dewelopera nie opublikuje aplikacji bez testu zamkniętego. Testerzy muszą być zapisani przez 14 dni bez przerwy.' },
        { title: 'Testerzy przez Grupę Google', text: 'Jedna grupa zamiast listy e-maili. Ustaw dołączanie „dla każdego”, inaczej zatwierdzasz każdą osobę ręcznie.' },
        { title: 'Znajomi to za mało', text: 'Najwięcej testerów dały mi wymiany z innymi twórcami: ja testuję ich aplikacje, oni moją.' },
        { title: 'Testerzy naprawdę pomagają', text: 'W trakcie testu wydałem 4 poprawki, od 1.0.2 do 1.0.5, na podstawie ich uwag.' },
        { title: 'Pilnuj licznika', text: 'Gdy liczba testerów spadnie poniżej 12, odliczanie może zacząć się od nowa. Sprawdzaj to co kilka dni.' },
      ],
      cta: { title: 'Wniosek o produkcję zatwierdzony w&nbsp;2&nbsp;dni', sub: 'Masz pytania o publikację w Google Play? Napisz w komentarzu.' },
    },
    languages: { kicker: 'Lekcja z projektu', title: 'Jedna aplikacja, 7 języków od pierwszego dnia',
      sub: 'Tłumaczenia, opisy w sklepie i zrzuty ekranu w każdym języku. Więcej pracy na starcie, ale aplikacja od razu trafia do ludzi w całej Europie i obu Amerykach.' },
    work: { kicker: 'Na piątkowe popołudnie', title: '3 pytania na koniec tygodnia w pracy',
      items: ['Co w tym tygodniu poszło dobrze?', 'Komu z zespołu chcę podziękować?', 'Jaka lekcja z tego tygodnia mi się przyda?'] },
  },
};
