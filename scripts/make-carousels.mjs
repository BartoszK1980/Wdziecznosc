// Generuje karuzele na Instagram (1080x1350, 4:5) do store/promocja/karuzele/.
//
//   npm run carousels
//
// Kazdy slajd to strona HTML (Lora z node_modules, kolory z aplikacji),
// zrzucana do PNG przez Chrome/Edge w trybie headless.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store', 'promocja', 'karuzele');
const W = 1080;
const H = 1350;

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

const BASE_CSS = `
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

function cta({ title, sub }, i, n) {
  return `
<div class="blob" style="width:700px;height:700px;right:-260px;top:-260px;background:rgba(255,255,255,.06)"></div>
<div class="pad" style="justify-content:center;align-items:center;text-align:center">
  <img src="${icon}" style="width:230px;height:230px;border-radius:52px;box-shadow:0 20px 50px rgba(0,0,0,.25)">
  <h2 class="serif" style="font-size:88px;line-height:1.12;font-weight:600;margin-top:64px">${title}</h2>
  <p style="font-size:42px;line-height:1.4;margin-top:32px;color:#DCE8DF;max-width:820px">${sub}</p>
  <div style="margin-top:64px;background:${C.gold};color:${C.text};font-size:42px;font-weight:700;padding:30px 60px;border-radius:999px">Za darmo w Google Play</div>
  <div style="margin-top:36px;font-size:34px;color:#DCE8DF">Link w bio ↑</div>
</div>
<div class="foot" style="justify-content:center"><span>Wdzięczność – dziennik · Android · 7 języków</span></div>`;
}

const RENDER = { cover, question, point, step, day, cta };

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

// --- Render -------------------------------------------------------------

const tmp = mkdtempSync(join(tmpdir(), 'karuzele-'));
const only = process.argv[2];
let count = 0;
for (const [name, slides] of Object.entries(CAROUSELS)) {
  if (only && !name.startsWith(only)) continue;
  const dir = join(out, name);
  mkdirSync(dir, { recursive: true });
  slides.forEach((slide, k) => {
    const body = RENDER[slide.type](slide, k + 1, slides.length);
    const cls = slide.type === 'cta' ? 'dark' : '';
    const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body class="${cls}">${body}</body></html>`;
    const page = join(tmp, `${name}-${k}.html`);
    writeFileSync(page, html);
    const png = join(dir, `${String(k + 1).padStart(2, '0')}.png`);
    execFileSync(browser, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--allow-file-access-from-files', '--virtual-time-budget=3000',
      `--window-size=${W},${H}`, `--screenshot=${png}`, pathToFileURL(page).href,
    ], { stdio: 'ignore' });
    count++;
  });
  console.log(`${name}: ${slides.length} slajdów`);
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Gotowe: ${count} plików w ${out}`);
