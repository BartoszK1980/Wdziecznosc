// Grafiki profili w mediach spolecznosciowych (@mygratitudeapp), zbudowane z zasobow marki
// i grafiki promocyjnej ze sklepu (store/grafiki/promo-en.png): kremowe tlo, cieple kolo ze znakiem,
// nazwa w Lorze i ekrany aplikacji po angielsku.
//
//   npm run profile-graphics
//
// Tworzy w store/promocja/profile/:
//   avatar-1080.png           zdjecie profilowe (FB, IG, TikTok, YouTube, LinkedIn) – bezpieczne po przycieciu do kola
//   facebook-cover.png        1640x624 – okladka strony na Facebooku (tresc w srodku, telefon przycina boki)
//   youtube-banner.png        2560x1440 – baner kanalu (tresc w strefie 1546x423 widocznej na kazdym urzadzeniu)
//   linkedin-cover.png        1128x191 – okladka strony firmowej na LinkedIn
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store', 'promocja', 'profile');
mkdirSync(out, { recursive: true });

const browser = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p));
if (!browser) throw new Error('Nie znaleziono Chrome ani Edge.');

const url = (p) => pathToFileURL(join(root, p)).href;
const mark = readFileSync(join(root, 'assets', 'brand', 'mark.svg'), 'utf8').replace(/<title>[\s\S]*?<\/title>/, '');
const C = { bg: '#FBF6F0', warm: '#F1E4D6', text: '#263A32', muted: '#817B73', gold: '#ECAF44', green: '#3E6654' };
const NAME = 'Gratitude – Daily Journal';
const TAGLINE = 'One minute a day for what was good.';
const META = 'Free gratitude journal for Android · 7 languages';

const css = (W, H) => `
@font-face { font-family: Lora; font-weight: 600; src: url(${url('node_modules/@expo-google-fonts/lora/600SemiBold/Lora_600SemiBold.ttf')}); }
@font-face { font-family: Lora; font-weight: 400; src: url(${url('node_modules/@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf')}); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { background: ${C.bg}; color: ${C.text}; font-family: 'Segoe UI', Roboto, sans-serif; position: relative; }
.serif { font-family: Lora, Georgia, serif; }
.abs { position: absolute; }
`;

// Znak w cieplym kole – ten sam motyw co na grafice promocyjnej w sklepie.
const badge = (size, markScale = 0.62) => `
<div style="width:${size}px;height:${size}px;border-radius:50%;background:${C.warm};display:flex;align-items:center;justify-content:center;flex:none">
  ${mark.replace('<svg', `<svg style="width:${size * markScale}px;height:auto;margin-top:-${size * 0.03}px"`)}
</div>`;

const phone = (shot, w, h) => `
<div style="width:${w}px;height:${h}px;border-radius:${w * 0.11}px;background:#1E2A25;padding:${w * 0.03}px;box-shadow:0 ${w * 0.06}px ${w * 0.14}px rgba(62,50,38,.22);flex:none">
  <div style="width:100%;height:100%;border-radius:${w * 0.085}px;overflow:hidden;background:${C.bg}">
    <img src="${url(`store/zrzuty/en/${shot}`)}" style="width:100%;display:block;margin-top:-${w * 0.07}px">
  </div>
</div>`;

const text = (nameSize, tagSize, metaSize) => `
<div>
  <div class="serif" style="font-size:${nameSize}px;font-weight:600;line-height:1.1;white-space:nowrap">${NAME}</div>
  <div class="serif" style="font-size:${tagSize}px;color:${C.muted};margin-top:${tagSize * 0.5}px;white-space:nowrap">${TAGLINE}</div>
  ${metaSize ? `<div style="display:inline-block;margin-top:${metaSize * 1.1}px;font-size:${metaSize}px;font-weight:600;color:${C.green};background:#fff;border:2px solid #EAE1D6;border-radius:999px;padding:${metaSize * 0.45}px ${metaSize * 0.9}px;white-space:nowrap">${META}</div>` : ''}
</div>`;

const GRAPHICS = {
  'avatar-1080': {
    W: 1080, H: 1080,
    body: `<div class="abs" style="inset:0;display:flex;align-items:center;justify-content:center">${badge(1080, 0.6)}</div>`,
  },
  'facebook-cover': {
    W: 1640, H: 624,
    body: `
<div class="abs" style="left:-140px;top:-160px;width:520px;height:520px;border-radius:50%;background:${C.warm}"></div>
<div class="abs" style="right:70px;top:80px;display:flex;gap:24px;transform:rotate(-4deg)">
  ${phone('2-edytor.png', 220, 480)}${phone('4-statystyki.png', 220, 480)}
</div>
<div class="abs" style="left:250px;top:0;bottom:0;display:flex;align-items:center;gap:34px">
  ${badge(180)}${text(50, 27, 19)}
</div>`,
  },
  'youtube-banner': {
    W: 2560, H: 1440,
    body: `
<div class="abs" style="left:-200px;top:-260px;width:900px;height:900px;border-radius:50%;background:${C.warm}"></div>
<div class="abs" style="right:-160px;bottom:-300px;width:760px;height:760px;border-radius:50%;background:#F6E3BC"></div>
<div class="abs" style="left:507px;width:1546px;top:509px;height:423px;display:flex;align-items:center;justify-content:center;gap:56px">
  ${badge(300)}${text(92, 46, 30)}
</div>`,
  },
  'linkedin-cover': {
    W: 1128, H: 191,
    body: `
<div class="abs" style="right:-60px;top:-120px;width:340px;height:340px;border-radius:50%;background:${C.warm}"></div>
<div class="abs" style="left:300px;top:0;bottom:0;display:flex;align-items:center;gap:22px">
  ${badge(118)}${text(40, 21, 0)}
</div>`,
  },
};

const tmp = mkdtempSync(join(tmpdir(), 'profile-'));
for (const [name, { W, H, body }] of Object.entries(GRAPHICS)) {
  const page = join(tmp, `${name}.html`);
  writeFileSync(page, `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css(W, H)}</style></head><body>${body}</body></html>`);
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    '--allow-file-access-from-files', '--virtual-time-budget=3000',
    `--window-size=${W},${H}`, `--screenshot=${join(out, `${name}.png`)}`, pathToFileURL(page).href,
  ], { stdio: 'ignore' });
  console.log(`${name}.png  ${W}x${H}`);
}
rmSync(tmp, { recursive: true, force: true });
