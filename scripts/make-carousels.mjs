// Generuje grafiki do mediow spolecznosciowych w store/promocja/:
//   karuzele/  — Instagram, 1080x1350 (4:5)
//   tiktok/    — TikTok (tryb zdjec), 1080x1920 (9:16), z marginesami na przyciski i podpis TikToka
//
//   npm run carousels            (wszystko)
//   npm run carousels -- tiktok  (tylko jeden format albo seria, np. "1-10")
//
// Kazdy slajd to strona HTML (Lora z node_modules, kolory z aplikacji),
// zrzucana do PNG przez Chrome/Edge w trybie headless.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];
const browser = BROWSERS.find((p) => existsSync(p));
if (!browser) throw new Error('Nie znaleziono Chrome ani Edge.');

const url = (p) => pathToFileURL(join(root, p)).href;
const font = (file) => url(`node_modules/@expo-google-fonts/lora/${file.split('_').slice(1).join('_').replace('.ttf', '')}/${file}`);
const mark = readFileSync(join(root, 'assets', 'brand', 'mark.svg'), 'utf8').replace(/<title>[\s\S]*?<\/title>/, '');
const icon = url('assets/images/icon.png');
const shot = (name) => url(`store/zrzuty/pl/${name}`);

const C = {
  bg: '#FBF6F0', surface: '#FFFDFC', warm: '#F1E4D6', text: '#263A32', muted: '#817B73',
  gold: '#ECAF44', green: '#3E6654', sage: '#738C78', border: '#EAE1D6',
};

const baseCss = (W, H) => `
@font-face { font-family: Lora; font-weight: 400; src: url(${font('Lora_400Regular.ttf')}); }
@font-face { font-family: Lora; font-weight: 400; font-style: italic; src: url(${font('Lora_400Regular_Italic.ttf')}); }
@font-face { font-family: Lora; font-weight: 600; src: url(${font('Lora_600SemiBold.ttf')}); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { background: ${C.bg}; color: ${C.text}; font-family: 'Segoe UI', Roboto, sans-serif; position: relative; }
.serif { font-family: Lora, Georgia, serif; }
.pad { position: absolute; inset: 0; padding: 110px 100px 150px; display: flex; flex-direction: column; }
.kicker { font-size: 30px; letter-spacing: 4px; text-transform: uppercase; color: ${C.sage}; font-weight: 600; }
.foot { position: absolute; left: 100px; right: 100px; bottom: 64px; display: flex; align-items: center; justify-content: space-between; font-size: 28px; color: ${C.muted}; }
.brand { display: flex; align-items: center; gap: 16px; }
.brand svg { height: 46px; width: auto; }
.swipe { color: ${C.green}; font-weight: 600; }
.blob { position: absolute; border-radius: 50%; filter: blur(2px); }
.dark { background: ${C.green}; color: ${C.bg}; }
.dark .foot, .dark .kicker { color: #CFE0D4; }
/* TikTok: u gory zakladki, po prawej przyciski, na dole podpis i nazwa konta. */
.tt .pad { padding: 240px 170px 520px 100px; }
.tt .foot { bottom: 440px; right: 170px; }
`;

const footer = (i, n, swipe) => `
<div class="foot">
  <div class="brand">${mark}<span>Wdzięczność – dziennik</span></div>
  <div>${swipe ? '<span class="swipe">Przesuń →</span>' : `${i} / ${n}`}</div>
</div>`;

// --- Typy slajdow -------------------------------------------------------

function cover({ kicker, title, sub }, i, n) {
  return `
<div class="blob" style="width:620px;height:620px;right:-220px;top:-200px;background:${C.warm}"></div>
<div class="blob" style="width:260px;height:260px;left:-170px;bottom:-130px;background:#F6E3BC"></div>
<div class="pad" style="justify-content:center">
  <div style="width:150px;margin-bottom:56px">${mark.replace('<svg', '<svg style="width:150px;height:auto"')}</div>
  <div class="kicker">${kicker}</div>
  <h1 class="serif" style="font-size:108px;line-height:1.08;font-weight:600;margin-top:28px">${title}</h1>
  ${sub ? `<p style="font-size:40px;line-height:1.4;color:${C.muted};margin-top:44px;max-width:820px">${sub}</p>` : ''}
</div>${footer(i, n, true)}`;
}

function question({ num, text }, i, n) {
  const lines = Array.from({ length: 4 }, (_, k) =>
    `<div style="height:2px;background:${C.border};margin-top:${k ? 74 : 0}px"></div>`).join('');
  return `
<div class="pad">
  <div class="serif" style="font-size:180px;line-height:1;color:${C.gold};font-weight:600">${String(num).padStart(2, '0')}</div>
  <h2 class="serif" style="font-size:84px;line-height:1.18;font-weight:600;margin-top:40px">${text}</h2>
  <div style="margin-top:auto">
    <div style="font-size:30px;color:${C.muted};margin-bottom:44px;font-style:italic" class="serif">Twoja odpowiedź:</div>
    ${lines}
  </div>
</div>${footer(i, n)}`;
}

function point({ num, title, text }, i, n) {
  return `
<div class="blob" style="width:520px;height:520px;right:-180px;bottom:-140px;background:${C.warm}"></div>
<div class="pad" style="justify-content:center">
  <div style="width:110px;height:110px;border-radius:50%;background:${C.gold};color:#fff;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:700">${num}</div>
  <h2 class="serif" style="font-size:96px;line-height:1.1;font-weight:600;margin-top:60px">${title}</h2>
  <p style="font-size:44px;line-height:1.45;color:${C.muted};margin-top:44px;max-width:860px">${text}</p>
</div>${footer(i, n)}`;
}

function step({ num, title, img }, i, n) {
  return `
<div class="pad" style="padding-top:96px">
  <div class="kicker">Krok ${num}</div>
  <h2 class="serif" style="font-size:66px;line-height:1.16;font-weight:600;margin-top:20px;max-width:900px">${title}</h2>
</div>
<div style="position:absolute;left:50%;transform:translateX(-50%);top:400px;width:540px;height:790px;border-radius:60px;background:#1E2A25;padding:16px;box-shadow:0 30px 70px rgba(62,50,38,.22)">
  <div style="position:relative;width:100%;height:100%;border-radius:46px;overflow:hidden;background:${C.bg}">
    <img src="${img}" style="width:100%;display:block;margin-top:-36px">
    <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:linear-gradient(to bottom, rgba(251,246,240,0), ${C.bg})"></div>
  </div>
</div>
${footer(i, n)}`;
}

function day({ label, text }, i, n) {
  return `
<div class="pad" style="justify-content:center">
  <div class="kicker">${label}</div>
  <div style="margin-top:40px;background:${C.surface};border:2px solid ${C.border};border-radius:48px;padding:64px 60px;box-shadow:0 12px 40px rgba(62,50,38,.08)">
    <div style="font-size:30px;color:${C.muted};margin-bottom:28px">Za co dziś jestem wdzięczny/a?</div>
    <p class="serif" style="font-size:68px;line-height:1.3">${text}</p>
    <div style="margin-top:44px;width:90px;height:8px;border-radius:4px;background:${C.gold}"></div>
  </div>
</div>${footer(i, n)}`;
}

function cta({ title, sub, where = 'Link w bio ↑' }, i, n) {
  return `
<div class="blob" style="width:700px;height:700px;right:-260px;top:-260px;background:rgba(255,255,255,.06)"></div>
<div class="pad" style="justify-content:center;align-items:center;text-align:center">
  <img src="${icon}" style="width:230px;height:230px;border-radius:52px;box-shadow:0 20px 50px rgba(0,0,0,.25)">
  <h2 class="serif" style="font-size:88px;line-height:1.12;font-weight:600;margin-top:64px">${title}</h2>
  <p style="font-size:42px;line-height:1.4;margin-top:32px;color:#DCE8DF;max-width:820px">${sub}</p>
  <div style="margin-top:64px;background:${C.gold};color:${C.text};font-size:42px;font-weight:700;padding:30px 60px;border-radius:999px">Za darmo w Google Play</div>
  <div style="margin-top:36px;font-size:34px;color:#DCE8DF">${where}</div>
</div>
<div class="foot" style="justify-content:center"><span>Wdzięczność – dziennik · Android · 7 języków</span></div>`;
}

function list({ kicker, title, items }, i, n) {
  return `
<div class="pad" style="justify-content:center">
  <div class="kicker">${kicker}</div>
  <h2 class="serif" style="font-size:88px;line-height:1.1;font-weight:600;margin-top:24px">${title}</h2>
  <div style="margin-top:64px;display:flex;flex-direction:column;gap:44px">
    ${items.map((t, k) => `
    <div style="display:flex;gap:30px;align-items:flex-start">
      <div style="flex:none;width:72px;height:72px;border-radius:50%;background:${C.gold};color:#fff;display:flex;align-items:center;justify-content:center;font-size:38px;font-weight:700">${k + 1}</div>
      <p style="font-size:44px;line-height:1.35;margin-top:6px">${t}</p>
    </div>`).join('')}
  </div>
</div>${footer(i, n)}`;
}

function grid({ kicker, title, sub, days = 30 }, i, n) {
  const cells = Array.from({ length: days }, (_, k) => `
    <div style="aspect-ratio:1;border-radius:50%;border:3px solid ${C.sage};display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:600;color:${C.green};background:${C.surface}">${k + 1}</div>`).join('');
  return `
<div class="pad" style="justify-content:center">
  <div class="kicker">${kicker}</div>
  <h2 class="serif" style="font-size:68px;line-height:1.12;font-weight:600;margin-top:20px">${title}</h2>
  <div style="margin-top:44px;display:grid;grid-template-columns:repeat(6,1fr);gap:18px">${cells}</div>
  <p style="font-size:34px;line-height:1.4;color:${C.muted};margin-top:40px">${sub}</p>
</div>${footer(i, n)}`;
}

// Pojedyncza grafika do posta (Facebook): tytul, opcjonalnie ekran aplikacji
// albo lista punktow, na dole pasek z ikona i nazwa aplikacji.
function poster({ kicker, title, sub, img, items, chips, dark, badge = true,
  appName = 'Wdzięczność – dziennik', appMeta = 'Android · 7 języków · za darmo' }) {
  const ink = dark ? C.bg : C.text;
  const soft = dark ? '#DCE8DF' : C.muted;
  const col = img ? 'right:560px' : 'right:100px';
  return `
<div class="blob" style="width:640px;height:640px;right:-240px;top:-240px;background:${dark ? 'rgba(255,255,255,.06)' : C.warm}"></div>
<div style="position:absolute;left:100px;right:100px;top:100px">
  <div class="kicker">${kicker}</div>
  <h1 class="serif" style="font-size:80px;line-height:1.12;font-weight:600;margin-top:22px;color:${ink}">${title}</h1>
</div>
<div style="position:absolute;left:100px;${col};top:${img ? 600 : 500}px">
  ${sub ? `<p style="font-size:40px;line-height:1.42;color:${soft}">${sub}</p>` : ''}
  ${items ? `<div style="margin-top:${sub ? 48 : 0}px;display:flex;flex-direction:column;gap:34px">${items.map((t, k) => `
    <div style="display:flex;gap:26px;align-items:flex-start">
      <div style="flex:none;width:64px;height:64px;border-radius:50%;background:${C.gold};color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700">${k + 1}</div>
      <p class="serif" style="font-size:46px;line-height:1.3;color:${ink}">${t}</p>
    </div>`).join('')}</div>` : ''}
  ${chips ? `<div style="margin-top:${sub ? 52 : 0}px;display:flex;flex-wrap:wrap;gap:20px">${chips.map((t) =>
    `<span style="font-size:38px;padding:18px 34px;border-radius:999px;background:${C.surface};border:2px solid ${C.border};color:${C.green};font-weight:600">${t}</span>`).join('')}</div>` : ''}
</div>
${img ? `
<div style="position:absolute;right:100px;top:560px;width:420px;height:620px;border-radius:52px;background:#1E2A25;padding:14px;box-shadow:0 26px 60px rgba(62,50,38,.25)">
  <div style="position:relative;width:100%;height:100%;border-radius:40px;overflow:hidden;background:${C.bg}">
    <img src="${img}" style="width:100%;display:block;margin-top:-28px">
    <div style="position:absolute;left:0;right:0;bottom:0;height:90px;background:linear-gradient(to bottom, rgba(251,246,240,0), ${C.bg})"></div>
  </div>
</div>` : ''}
<div style="position:absolute;left:0;right:0;bottom:0;height:190px;background:${dark ? 'rgba(0,0,0,.14)' : C.surface};border-top:2px solid ${dark ? 'transparent' : C.border};display:flex;align-items:center;gap:28px;padding:0 100px">
  <img src="${icon}" style="width:104px;height:104px;border-radius:26px;box-shadow:0 6px 18px rgba(0,0,0,.12)">
  <div style="flex:1">
    <div class="serif" style="font-size:40px;font-weight:600;color:${ink};white-space:nowrap">${appName}</div>
    <div style="font-size:28px;color:${soft};margin-top:4px">${appMeta}</div>
  </div>
  ${badge ? `<div style="background:${C.gold};color:${C.text};font-size:32px;font-weight:700;padding:22px 38px;border-radius:999px;white-space:nowrap">Google Play</div>` : ''}
</div>`;
}

const RENDER = { cover, question, point, step, day, cta, list, grid, poster };

// --- Tresc karuzel ------------------------------------------------------

const CTA = (title, sub = 'Minuta dziennie na to, co dobre. Tekstem, zdjęciem albo głosem.') => ({ type: 'cta', title, sub });

const CAROUSELS = {
  '1-10-pytan': [
    { type: 'cover', kicker: 'Dziennik wdzięczności', title: '10 pytań, gdy nie wiesz, co napisać', sub: 'Zapisz ten post i wróć do niego wieczorem.' },
    ...[
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
    ].map((text, k) => ({ type: 'question', num: k + 1, text })),
    CTA('Odpowiadaj na jedno pytanie dziennie'),
  ],
  '2-dlaczego-dziala': [
    { type: 'cover', kicker: 'Mały nawyk', title: 'Dlaczego warto zapisywać, za co jesteś wdzięczny', sub: '4 powody. Bez obietnic cudów.' },
    { type: 'point', num: 1, title: 'Uczysz się zauważać dobre', text: 'Gdy wiesz, że wieczorem coś zapiszesz, w ciągu dnia łatwiej wyłapujesz dobre chwile.' },
    { type: 'point', num: 2, title: 'Zły dzień nie jest cały zły', text: 'Nawet w trudny dzień zwykle znajdzie się jedna mała rzecz. To zmienia perspektywę.' },
    { type: 'point', num: 3, title: 'Minuta to łatwy nawyk', text: 'Trzy krótkie zdania. Tak mało, że trudno znaleźć wymówkę.' },
    { type: 'point', num: 4, title: 'Masz do czego wracać', text: 'Po miesiącu masz własne archiwum dobrych chwil. Na gorsze dni jak znalazł.' },
    CTA('Spróbuj przez 7 dni'),
  ],
  '3-jak-zaczac': [
    { type: 'cover', kicker: 'Poradnik', title: 'Jak zacząć dziennik wdzięczności w&nbsp;1&nbsp;minutę', sub: '3 kroki w aplikacji Wdzięczność.' },
    { type: 'step', num: 1, title: 'Otwórz dzisiejszą notatkę na ekranie „Dziś”', img: shot('1-dzis.png') },
    { type: 'step', num: 2, title: 'Wpisz 3 małe rzeczy. Dodaj zdjęcie albo nagraj głos', img: shot('2-edytor.png') },
    { type: 'step', num: 3, title: 'Wracaj codziennie i patrz, jak rośnie Twoja seria', img: shot('5-statystyki.png') },
    CTA('Twoja pierwsza notatka czeka'),
  ],
  '4-moj-tydzien': [
    { type: 'cover', kicker: 'Dziennik wdzięczności', title: 'Mój tydzień wdzięczności', sub: '7 dni, po jednej małej rzeczy.' },
    { type: 'day', label: 'Poniedziałek', text: 'Za kawę wypitą w ciszy, zanim wszyscy wstali.' },
    { type: 'day', label: 'Wtorek', text: 'Za kolegę, który bez proszenia pomógł mi z projektem.' },
    { type: 'day', label: 'Środa', text: 'Za spacer w deszczu bez parasola. Było zabawnie.' },
    { type: 'day', label: 'Czwartek', text: 'Za telefon od siostry, chociaż nic nie musiała.' },
    { type: 'day', label: 'Piątek', text: 'Za autobus, który tym razem na mnie poczekał.' },
    { type: 'day', label: 'Sobota', text: 'Za długie śniadanie z całą rodziną.' },
    { type: 'day', label: 'Niedziela', text: 'Za ciszę, dobrą książkę i ciepły koc.' },
    CTA('A jak wyglądałby Twój tydzień?'),
  ],
};

// TikTok: link w bio dopiero od 1000 obserwujacych, wiec odsylamy do wyszukiwarki sklepu.
const TT_WHERE = 'Wpisz w Google Play: „Wdzięczność dziennik”';
const TT_CTA = (title) => ({ ...CTA(title), where: TT_WHERE });

const TIKTOK = {
  '1-3-rzeczy': [
    { type: 'cover', kicker: 'Dziennik wdzięczności', title: '3 rzeczy, za które jestem dziś wdzięczny', sub: 'Minuta dziennie. Spróbuj ze mną.' },
    { type: 'day', label: 'Pierwsza', text: 'Za poranną kawę wypitą w ciszy.' },
    { type: 'day', label: 'Druga', text: 'Za spacer z psem w parku.' },
    { type: 'day', label: 'Trzecia', text: 'Za telefon od siostry, chociaż nic nie musiała.' },
    TT_CTA('A Ty? Napisz jedną rzecz w komentarzu'),
  ],
  '2-5-pytan': [
    { type: 'cover', kicker: 'Na wieczór', title: '5 pytań, gdy nie wiesz, za co być wdzięcznym', sub: 'Zapisz, przyda się dziś wieczorem.' },
    ...[
      'Jaka mała rzecz poszła dziś dobrze?',
      'Kto dziś wywołał Twój uśmiech?',
      'Co dziś Cię rozbawiło?',
      'Komu chcesz dziś podziękować i za co?',
      'Na co czekasz z radością jutro?',
    ].map((text, k) => ({ type: 'question', num: k + 1, text })),
    TT_CTA('Odpowiadaj na jedno pytanie dziennie'),
  ],
  '3-zrobilem-sam': [
    { type: 'cover', kicker: 'Po godzinach', title: 'Sam zrobiłem aplikację do dziennika wdzięczności', sub: 'Oto, co w niej jest.' },
    { type: 'point', num: 1, title: 'Minuta dziennie', text: 'Zapisujesz 3 małe rzeczy. Tekstem, zdjęciem albo głosem.' },
    { type: 'point', num: 2, title: 'Tylko dla Ciebie', text: 'Działa bez internetu, a wpisy blokujesz odciskiem palca. Nikt ich nie czyta.' },
    { type: 'point', num: 3, title: 'Widzisz postęp', text: 'Seria dni z rzędu, wykres nastroju i to, za co najczęściej dziękujesz.' },
    { type: 'point', num: 4, title: 'Za darmo', text: 'Wszystkie funkcje bez opłat. 7 języków. Bez zakładania konta.' },
    TT_CTA('Daj znać, co o niej myślisz'),
  ],
  '4-wyzwanie-30-dni': [
    { type: 'cover', kicker: 'Wyzwanie', title: '30 dni wdzięczności', sub: 'Zaczynasz razem ze mną?' },
    { type: 'list', kicker: 'Zasady', title: 'Proste jak minuta', items: [
      'Codziennie zapisz 3 rzeczy, za które jesteś wdzięczny.',
      'Nie powtarzaj się. Szukaj nowych, małych rzeczy.',
      'Zaznacz dzień na kalendarzu z kolejnego slajdu.',
    ] },
    { type: 'grid', kicker: 'Twój kalendarz', title: 'Zrób zrzut ekranu i zaznaczaj dni', sub: 'Wróć tu za 30 dni i napisz, co się zmieniło.' },
    TT_CTA('Dzień 1 zaczyna się dziś'),
  ],
};

// Facebook: pojedyncze grafiki do postow z planu (profil prywatny i grupy).
// Kazda "seria" to jeden plik; w grupach (2-pytania) bez przycisku Google Play,
// bo tam najpierw dajemy wartosc, a nie reklame.
const FACEBOOK = {
  '1-premiera': [{ type: 'poster', kicker: 'Nowość w Google Play', title: 'Po godzinach zrobiłem aplikację do dziennika wdzięczności',
    sub: 'Minuta dziennie na to, co dobre. Działa bez internetu, a wpisy blokujesz odciskiem palca.', img: shot('1-dzis.png') }],
  '2-pytania-do-grupy': [{ type: 'poster', kicker: 'Na wieczór', title: '3 pytania, gdy nie wiesz, co wpisać do dziennika', badge: false,
    items: ['Jaka mała rzecz poszła dziś dobrze?', 'Kto dziś zrobił dla mnie coś miłego?', 'Co dziś mnie rozbawiło?'] }],
  '3-prosba-o-opinie': [{ type: 'poster', kicker: 'Szukam opinii', title: 'Twoja szczera opinia bardzo mi pomoże',
    sub: 'Zainstaluj, używaj przez tydzień i napisz, co działa, a co nie. Każda uwaga się liczy.', img: shot('2-edytor.png') }],
  '4-wyzwanie-30-dni': [{ type: 'poster', kicker: 'Wyzwanie', title: '30 dni wdzięczności. Kto wchodzi?',
    sub: 'Codziennie 3 małe rzeczy. Po miesiącu zobaczysz na wykresie, jak zmieniał się Twój nastrój.', img: shot('5-statystyki.png') }],
  '5-dziekuje': [{ type: 'poster', dark: true, kicker: 'Dziękuję', title: 'Dziękuję za pierwsze instalacje i opinie!',
    sub: 'Każda opinia w Sklepie Play pomaga małej aplikacji dotrzeć do kolejnych osób. Jeśli masz chwilę, zostaw swoją. Będzie mi bardzo miło.' }],
};

// LinkedIn: historia tworcy (build in public). Karuzele dodatkowo jako PDF,
// bo LinkedIn pokazuje karuzele tylko jako wgrany dokument.
const LI_CTA = (title, sub) => ({ type: 'cta', title, sub, where: 'Moja aplikacja: „Wdzięczność – dziennik” w Google Play' });

const LINKEDIN = {
  '1-premiera': [{ type: 'poster', kicker: 'Moja pierwsza aplikacja', title: 'Od pomysłu do Google Play – po godzinach, w&nbsp;pojedynkę',
    sub: 'Dziennik wdzięczności na Androida. Projekt, kod, 7 języków i test zamknięty z 12 testerami.', img: shot('1-dzis.png') }],
  '2-premiera-en': [{ type: 'poster', kicker: 'My first app', title: 'From idea to Google Play – after hours, on&nbsp;my&nbsp;own',
    sub: 'A gratitude journal for Android. Design, code, 7 languages and a closed test with 12 testers.',
    img: url('store/zrzuty/en/1-dzis.png'), appName: 'Gratitude – Daily Journal', appMeta: 'Android · 7 languages · free' }],
  '3-test-zamkniety': [
    { type: 'cover', kicker: 'Poradnik dla twórców aplikacji', title: 'Jak przeszedłem test zamknięty Google Play', sub: '12 testerów, 14 dni i 5 rzeczy, które warto wiedzieć wcześniej.' },
    { type: 'point', num: 1, title: '12 testerów przez 14 dni', text: 'Nowe prywatne konto dewelopera nie opublikuje aplikacji bez testu zamkniętego. Testerzy muszą być zapisani przez 14 dni bez przerwy.' },
    { type: 'point', num: 2, title: 'Testerzy przez Grupę Google', text: 'Jedna grupa zamiast listy e-maili. Ustaw dołączanie „dla każdego”, inaczej zatwierdzasz każdą osobę ręcznie.' },
    { type: 'point', num: 3, title: 'Znajomi to za mało', text: 'Najwięcej testerów dały mi wymiany z innymi twórcami: ja testuję ich aplikacje, oni moją.' },
    { type: 'point', num: 4, title: 'Testerzy naprawdę pomagają', text: 'W trakcie testu wydałem 4 poprawki, od 1.0.2 do 1.0.5, na podstawie ich uwag.' },
    { type: 'point', num: 5, title: 'Pilnuj licznika', text: 'Gdy liczba testerów spadnie poniżej 12, odliczanie może zacząć się od nowa. Sprawdzaj to co kilka dni.' },
    LI_CTA('Wniosek o produkcję zatwierdzony w&nbsp;2&nbsp;dni', 'Masz pytania o publikację w Google Play? Napisz w komentarzu.'),
  ],
  '4-siedem-jezykow': [{ type: 'poster', kicker: 'Lekcja z projektu', title: 'Jedna aplikacja, 7 języków od pierwszego dnia',
    sub: 'Tłumaczenia, opisy w sklepie i zrzuty ekranu w każdym języku. Więcej pracy na starcie, ale aplikacja od razu trafia do ludzi w całej Europie i obu Amerykach.',
    chips: ['Polski', 'English', 'Deutsch', 'Español', 'Français', 'Italiano', 'Português'] }],
  '5-wdziecznosc-w-pracy': [{ type: 'poster', kicker: 'Na piątkowe popołudnie', title: '3 pytania na koniec tygodnia w pracy', badge: false,
    items: ['Co w tym tygodniu poszło dobrze?', 'Komu z zespołu chcę podziękować?', 'Jaka lekcja z tego tygodnia mi się przyda?'] }],
};

// --- Render -------------------------------------------------------------

const FORMATS = [
  { name: 'linkedin', dir: 'linkedin', W: 1080, H: 1350, cls: '', sets: LINKEDIN, pdf: true },
  { name: 'facebook', dir: 'facebook', W: 1080, H: 1350, cls: '', sets: FACEBOOK },
  { name: 'instagram', dir: 'karuzele', W: 1080, H: 1350, cls: '', sets: CAROUSELS },
  { name: 'tiktok', dir: 'tiktok', W: 1080, H: 1920, cls: 'tt', sets: TIKTOK },
];

const tmp = mkdtempSync(join(tmpdir(), 'karuzele-'));
const only = process.argv[2];
let count = 0;
for (const { name: format, dir: sub, W, H, cls: formatCls, sets, pdf } of FORMATS) {
  const formatMatch = only === format;
  for (const [name, slides] of Object.entries(sets)) {
    if (only && !formatMatch && !name.startsWith(only)) continue;
    // Pojedyncza grafika trafia jako <seria>.png, karuzela do folderu <seria>/01.png…
    const single = slides.length === 1;
    const dir = join(root, 'store', 'promocja', sub, single ? '' : name);
    mkdirSync(dir, { recursive: true });
    slides.forEach((slide, k) => {
      const body = RENDER[slide.type](slide, k + 1, slides.length);
      const cls = [formatCls, slide.type === 'cta' || slide.dark ? 'dark' : ''].join(' ');
      const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>${baseCss(W, H)}</style></head><body class="${cls}">${body}</body></html>`;
      const page = join(tmp, `${format}-${name}-${k}.html`);
      writeFileSync(page, html);
      const png = join(dir, single ? `${name}.png` : `${String(k + 1).padStart(2, '0')}.png`);
      execFileSync(browser, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
        '--allow-file-access-from-files', '--virtual-time-budget=3000',
        `--window-size=${W},${H}`, `--screenshot=${png}`, pathToFileURL(page).href,
      ], { stdio: 'ignore' });
      count++;
    });
    if (pdf && !single) {
      // Slajdy jako strony PDF w rozmiarze grafiki, bez marginesow i stopek przegladarki.
      const pages = slides.map((_, k) =>
        `<img src="${pathToFileURL(join(dir, `${String(k + 1).padStart(2, '0')}.png`)).href}">`).join('');
      const doc = join(tmp, `${format}-${name}-pdf.html`);
      writeFileSync(doc, `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${W}px ${H}px; margin: 0; } * { margin: 0; padding: 0; }
img { display: block; width: ${W}px; height: ${H}px; page-break-after: always; }
</style></head><body>${pages}</body></html>`);
      execFileSync(browser, [
        '--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=3000',
        '--no-pdf-header-footer', `--print-to-pdf=${join(dir, `${name}.pdf`)}`, pathToFileURL(doc).href,
      ], { stdio: 'ignore' });
    }
    console.log(`${sub}/${name}: ${slides.length} slajdów${pdf && !single ? ' + PDF' : ''}`);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Gotowe: ${count} plików w store/promocja/`);
