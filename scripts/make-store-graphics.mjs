// Generuje grafiki do Google Play z zasobow marki.
//
//   npm run store-graphics
//
// Tworzy w store/grafiki/:
//   ikona-512.png        — ikona sklepu (512x512, wymog Google Play)
//   promo-<jezyk>.png    — grafika promocyjna 1024x500, po jednej na jezyk
//
// Zrodlem sa zasoby marki (assets/images/icon.png, assets/brand/mark.svg),
// wiec po zmianie znaku albo tekstow wystarczy uruchomic skrypt ponownie.
//
// Czcionka: marka uzywa Lory, ale librsvg (silnik SVG w sharp) nie laduje
// czcionek z pliku przez @font-face — widzi tylko czcionki systemowe. Georgia
// jest najblizszym dostepnym szeryfem. Gdyby grafiki mialy trafic do druku
// albo na strone, lepiej zlozyc je w edytorze graficznym z prawdziwa Lora.
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'store', 'grafiki');
mkdirSync(out, { recursive: true });

// Paleta z design-manifest.json — te same wartosci co w aplikacji.
const COLORS = { bg: '#FBF6F0', warm: '#F1E4D6', text: '#263A32', muted: '#817B73', gold: '#ECAF44' };

// Nazwa na grafice jest KROTSZA niz nazwa w sklepie (bez dopisku "dziennik"),
// bo sama grafika juz pokazuje, co to za aplikacja.
const LOCALES = {
  pl: { name: 'Wdzięczność', tagline: 'Codziennie kilka zdań o tym, co było dobre.' },
  en: { name: 'Gratitude', tagline: 'A few lines a day about what was good.' },
  de: { name: 'Dankbarkeit', tagline: 'Jeden Tag ein paar Zeilen über das Gute.' },
  es: { name: 'Gratitud', tagline: 'Cada día, unas líneas sobre lo bueno.' },
  fr: { name: 'Gratitude', tagline: 'Chaque jour, quelques lignes sur ce qui va bien.' },
  it: { name: 'Gratitudine', tagline: 'Ogni giorno qualche riga su ciò che è andato bene.' },
  pt: { name: 'Gratidão', tagline: 'Todos os dias, algumas linhas sobre o que foi bom.' },
};

const escapeXml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Lamanie linii po slowach. librsvg nie lamie tekstu sam, a dluzsze hasla
 * (francuskie, wloskie) nie mieszcza sie w jednej linii obok znaku.
 * Szerokosc liczona z przyblizonej sredniej szerokosci znaku — wystarczy,
 * bo tekst i tak ma zapas miejsca po prawej.
 */
function wrap(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Znak marki: zawartosc mark.svg zagniezdzona jako osobny <svg> z wlasnym
// viewBox, zeby dalo sie go przeskalowac i ustawic bez przeliczania sciezek.
const markSource = readFileSync(join(root, 'assets', 'brand', 'mark.svg'), 'utf8');
const viewBox = markSource.match(/viewBox="([^"]+)"/)[1];
const markInner = markSource
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<title>[\s\S]*?<\/title>/, '');
const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);

function promoSvg({ name, tagline }) {
  const W = 1024;
  const H = 500;
  const markHeight = 270;
  const markWidth = (markHeight * vbWidth) / vbHeight;
  const markX = 150 - markWidth / 2 + 60;
  const markY = (H - markHeight) / 2;

  const textX = 410;
  const lines = wrap(tagline, 30);
  // Pionowe wysrodkowanie bloku: nazwa + odstep + linie hasla.
  const blockHeight = 78 + 26 + lines.length * 40;
  const nameY = (H - blockHeight) / 2 + 66;

  const taglineLines = lines
    .map(
      (line, i) =>
        `<text x="${textX}" y="${nameY + 70 + i * 40}" font-family="Georgia, serif" font-size="31" fill="${COLORS.muted}">${escapeXml(line)}</text>`
    )
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${COLORS.bg}"/>
  <circle cx="${markX + markWidth / 2}" cy="${H / 2}" r="190" fill="${COLORS.warm}"/>
  <svg x="${markX}" y="${markY}" width="${markWidth}" height="${markHeight}" viewBox="${viewBox}">${markInner}</svg>
  <text x="${textX}" y="${nameY}" font-family="Georgia, serif" font-weight="bold" font-size="76" fill="${COLORS.text}">${escapeXml(name)}</text>
  ${taglineLines}
</svg>`;
}

// 1. Ikona sklepu — pelny kwadrat; Google Play sam naklada zaokraglenie.
await sharp(join(root, 'assets', 'images', 'icon.png'))
  .resize(512, 512)
  .png()
  .toFile(join(out, 'ikona-512.png'));
console.log('ikona-512.png');

// 2. Grafiki promocyjne. Bez kanalu alfa — Google Play wymaga dla nich
// pelnego tla (JPEG albo 24-bitowy PNG).
for (const [code, locale] of Object.entries(LOCALES)) {
  await sharp(Buffer.from(promoSvg(locale)))
    .flatten({ background: COLORS.bg })
    .png()
    .toFile(join(out, `promo-${code}.png`));
  console.log(`promo-${code}.png`);
}
