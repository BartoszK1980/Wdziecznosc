// Generuje grafiki do mediow spolecznosciowych we wszystkich jezykach aplikacji:
//   store/promocja/<format>/<jezyk>/<seria>/01.png …   (karuzele)
//   store/promocja/<format>/<jezyk>/<seria>.png        (pojedyncze grafiki)
// Formaty: karuzele (Instagram 4:5), tiktok (9:16), facebook (4:5), linkedin (4:5 + PDF karuzeli).
// Teksty sa w scripts/promo-texts/<jezyk>.mjs, a uklad slajdow tutaj.
//
//   npm run carousels                  (wszystko)
//   npm run carousels -- tiktok        (jeden format)
//   npm run carousels -- tiktok de     (jeden format, jeden jezyk)
//
// Kazdy slajd to strona HTML (Lora z node_modules, kolory z aplikacji),
// zrzucana do PNG przez Chrome/Edge w trybie headless.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
// Zrzuty ekranu aplikacji w danym jezyku (nazwy plikow roznia sie numeracja).
// Zastepcze zrzuty, gdy w danym jezyku brakuje poprawnego. pt/4-statystyki.png pokazuje
// liste notatek z bledem i prywatnym wpisem, wiec do czasu nowego zrzutu bierzemy hiszpanski.
const SHOT_FALLBACK = { pt: { statystyki: 'es' } };

const shot = (lang, key) => {
  lang = SHOT_FALLBACK[lang]?.[key] ?? lang;
  const file = readdirSync(join(root, 'store', 'zrzuty', lang)).find((f) => f.includes(key));
  if (!file) throw new Error(`Brak zrzutu "${key}" dla ${lang}`);
  return url(`store/zrzuty/${lang}/${file}`);
};

// Teksty interfejsu slajdow dla biezacego jezyka (ustawiane w petli renderowania).
let U = {};

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
  <div class="brand">${mark}<span>${U.app}</span></div>
  <div>${swipe ? `<span class="swipe">${U.swipe}</span>` : `${i} / ${n}`}</div>
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
    <div style="font-size:30px;color:${C.muted};margin-bottom:44px;font-style:italic" class="serif">${U.answer}</div>
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
  <div class="kicker">${U.step} ${num}</div>
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
    <div style="font-size:30px;color:${C.muted};margin-bottom:28px">${U.dayPrompt}</div>
    <p class="serif" style="font-size:68px;line-height:1.3">${text}</p>
    <div style="margin-top:44px;width:90px;height:8px;border-radius:4px;background:${C.gold}"></div>
  </div>
</div>${footer(i, n)}`;
}

function cta({ title, sub = U.ctaSub, where = U.linkBio }, i, n) {
  return `
<div class="blob" style="width:700px;height:700px;right:-260px;top:-260px;background:rgba(255,255,255,.06)"></div>
<div class="pad" style="justify-content:center;align-items:center;text-align:center">
  <img src="${icon}" style="width:230px;height:230px;border-radius:52px;box-shadow:0 20px 50px rgba(0,0,0,.25)">
  <h2 class="serif" style="font-size:88px;line-height:1.12;font-weight:600;margin-top:64px">${title}</h2>
  <p style="font-size:42px;line-height:1.4;margin-top:32px;color:#DCE8DF;max-width:820px">${sub}</p>
  <div style="margin-top:64px;background:${C.gold};color:${C.text};font-size:42px;font-weight:700;padding:30px 60px;border-radius:999px">${U.getIt}</div>
  <div style="margin-top:36px;font-size:34px;color:#DCE8DF">${where}</div>
</div>
<div class="foot" style="justify-content:center"><span>${U.app} · ${U.ctaMeta}</span></div>`;
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
  appName = U.app, appMeta = U.appMeta }) {
  const ink = dark ? C.bg : C.text;
  const soft = dark ? '#DCE8DF' : C.muted;
  return `
<div class="blob" style="width:640px;height:640px;right:-240px;top:-240px;background:${dark ? 'rgba(255,255,255,.06)' : C.warm}"></div>
<div style="position:absolute;left:100px;right:100px;top:100px">
  <div class="kicker">${kicker}</div>
  <h1 class="serif" style="font-size:80px;line-height:1.12;font-weight:600;margin-top:22px;color:${ink}">${title}</h1>
${img
    // Z ekranem aplikacji: tekst w lewej kolumnie obok telefonu.
    ? '</div>\n<div style="position:absolute;left:100px;right:560px;top:600px">'
    // Bez ekranu: tekst plynie pod tytulem, wiec dluzszy tytul (np. po francusku) go nie zaslania.
    : '<div style="margin-top:72px">'}
  ${sub ? `<p style="font-size:40px;line-height:1.42;color:${soft}">${sub}</p>` : ''}
  ${items ? `<div style="margin-top:${sub ? 48 : 0}px;display:flex;flex-direction:column;gap:34px">${items.map((t, k) => `
    <div style="display:flex;gap:26px;align-items:flex-start">
      <div style="flex:none;width:64px;height:64px;border-radius:50%;background:${C.gold};color:#fff;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700">${k + 1}</div>
      <p class="serif" style="font-size:46px;line-height:1.3;color:${ink}">${t}</p>
    </div>`).join('')}</div>` : ''}
  ${chips ? `<div style="margin-top:${sub ? 52 : 0}px;display:flex;flex-wrap:wrap;gap:20px">${chips.map((t) =>
    `<span style="font-size:38px;padding:18px 34px;border-radius:999px;background:${C.surface};border:2px solid ${C.border};color:${C.green};font-weight:600">${t}</span>`).join('')}</div>` : ''}
</div>${img ? '' : '\n</div>'}
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

// --- Uklad serii (teksty z scripts/promo-texts/<jezyk>.mjs) -------------

const LANGS = ['pl', 'en', 'de', 'es', 'fr', 'it', 'pt'];
const LANGUAGE_NAMES = ['Polski', 'English', 'Deutsch', 'Español', 'Français', 'Italiano', 'Português'];

function buildSets(t, lang) {
  const img = (key) => shot(lang, key);
  const ig = t.instagram;
  const tt = t.tiktok;
  const fb = t.facebook;
  const li = t.linkedin;
  const ttCta = (title) => ({ type: 'cta', title, where: t.ui.searchPlay });
  return {
    karuzele: {
      '1-10-pytan': [
        { type: 'cover', ...ig.questions.cover },
        ...ig.questions.items.map((text, k) => ({ type: 'question', num: k + 1, text })),
        { type: 'cta', title: ig.questions.cta },
      ],
      '2-dlaczego-dziala': [
        { type: 'cover', ...ig.why.cover },
        ...ig.why.points.map((p, k) => ({ type: 'point', num: k + 1, ...p })),
        { type: 'cta', title: ig.why.cta },
      ],
      '3-jak-zaczac': [
        { type: 'cover', ...ig.start.cover },
        ...ig.start.steps.map((title, k) => ({ type: 'step', num: k + 1, title, img: img(['dzis', 'edytor', 'statystyki'][k]) })),
        { type: 'cta', title: ig.start.cta },
      ],
      '4-moj-tydzien': [
        { type: 'cover', ...ig.week.cover },
        ...ig.week.days.map((text, k) => ({ type: 'day', label: t.ui.weekdays[k], text })),
        { type: 'cta', title: ig.week.cta },
      ],
    },
    tiktok: {
      '1-3-rzeczy': [
        { type: 'cover', ...tt.three.cover },
        ...tt.three.items.map((text, k) => ({ type: 'day', label: tt.three.labels[k], text })),
        ttCta(tt.three.cta),
      ],
      '2-5-pytan': [
        { type: 'cover', ...tt.questions.cover },
        // te same pytania co w karuzeli na Instagram: 1, 2, 3, 7 i 10
        ...[0, 1, 2, 6, 9].map((q, k) => ({ type: 'question', num: k + 1, text: ig.questions.items[q] })),
        ttCta(tt.questions.cta),
      ],
      '3-zrobilem-sam': [
        { type: 'cover', ...tt.solo.cover },
        ...tt.solo.points.map((p, k) => ({ type: 'point', num: k + 1, ...p })),
        ttCta(tt.solo.cta),
      ],
      '4-wyzwanie-30-dni': [
        { type: 'cover', ...tt.challenge.cover },
        { type: 'list', ...tt.challenge.rules },
        { type: 'grid', ...tt.challenge.grid },
        ttCta(tt.challenge.cta),
      ],
    },
    facebook: {
      '1-premiera': [{ type: 'poster', ...fb.launch, img: img('dzis') }],
      '2-pytania-do-grupy': [{ type: 'poster', ...fb.group, badge: false }],
      '3-prosba-o-opinie': [{ type: 'poster', ...fb.feedback, img: img('edytor') }],
      '4-wyzwanie-30-dni': [{ type: 'poster', ...fb.challenge, img: img('statystyki') }],
      '5-dziekuje': [{ type: 'poster', ...fb.thanks, dark: true }],
    },
    linkedin: {
      '1-premiera': [{ type: 'poster', ...li.launch, img: img('dzis') }],
      '3-test-zamkniety': [
        { type: 'cover', ...li.test.cover },
        ...li.test.points.map((p, k) => ({ type: 'point', num: k + 1, ...p })),
        { type: 'cta', ...li.test.cta, where: t.ui.liWhere },
      ],
      '4-siedem-jezykow': [{ type: 'poster', ...li.languages, chips: LANGUAGE_NAMES }],
      '5-wdziecznosc-w-pracy': [{ type: 'poster', ...li.work, badge: false }],
    },
  };
}

// --- Render -------------------------------------------------------------

const FORMATS = [
  { name: 'karuzele', W: 1080, H: 1350, cls: '' },
  { name: 'tiktok', W: 1080, H: 1920, cls: 'tt' },
  { name: 'facebook', W: 1080, H: 1350, cls: '' },
  { name: 'linkedin', W: 1080, H: 1350, cls: '', pdf: true },
];

const [onlyFormat, onlyLang] = process.argv.slice(2);
const tmp = mkdtempSync(join(tmpdir(), 'karuzele-'));
let count = 0;
for (const lang of LANGS) {
  if (onlyLang && lang !== onlyLang) continue;
  const texts = (await import(pathToFileURL(join(root, 'scripts', 'promo-texts', `${lang}.mjs`)).href)).default;
  U = texts.ui;
  const all = buildSets(texts, lang);
  for (const { name: format, W, H, cls: formatCls, pdf } of FORMATS) {
    if (onlyFormat && onlyFormat !== format) continue;
    for (const [name, slides] of Object.entries(all[format])) {
      // Pojedyncza grafika trafia jako <seria>.png, karuzela do folderu <seria>/01.png…
      const single = slides.length === 1;
      const dir = join(root, 'store', 'promocja', format, lang, single ? '' : name);
      mkdirSync(dir, { recursive: true });
      slides.forEach((slide, k) => {
        const body = RENDER[slide.type](slide, k + 1, slides.length);
        const cls = [formatCls, slide.type === 'cta' || slide.dark ? 'dark' : ''].join(' ');
        const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>${baseCss(W, H)}</style></head><body class="${cls}">${body}</body></html>`;
        const page = join(tmp, `${lang}-${format}-${name}-${k}.html`);
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
        const doc = join(tmp, `${lang}-${format}-${name}-pdf.html`);
        writeFileSync(doc, `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: ${W}px ${H}px; margin: 0; } * { margin: 0; padding: 0; }
img { display: block; width: ${W}px; height: ${H}px; page-break-after: always; }
</style></head><body>${pages}</body></html>`);
        execFileSync(browser, [
          '--headless=new', '--disable-gpu', '--allow-file-access-from-files', '--virtual-time-budget=3000',
          '--no-pdf-header-footer', `--print-to-pdf=${join(dir, `${name}.pdf`)}`, pathToFileURL(doc).href,
        ], { stdio: 'ignore' });
      }
    }
    console.log(`${format}/${lang}: ${Object.keys(all[format]).length} serii`);
  }
}
rmSync(tmp, { recursive: true, force: true });
console.log(`Gotowe: ${count} grafik w store/promocja/`);
