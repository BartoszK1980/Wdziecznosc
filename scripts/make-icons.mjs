// Generuje komplet ikon z wektora assets/brand/mark.svg.
//
//   npm run make-icons
//
// Dostarczona ikona 1024 miala symbol na ~13% kadru i szeroki margines wokolo.
// Sklepy przycinaja ikone wlasna maska i jeszcze ja pomniejszaja na liscie
// aplikacji, wiec taki znak bylby na telefonie nieczytelny. Tutaj znak wypelnia
// kadr na tyle, na ile pozwalaja wytyczne obu platform.
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'assets', 'brand');
const images = join(root, 'assets', 'images');

const CREAM = { r: 0xfb, g: 0xf6, b: 0xf0, alpha: 1 };
const markSvg = readFileSync(join(brand, 'mark.svg'), 'utf8');

const render = (svg, size) =>
  sharp(Buffer.from(svg), { density: 1200 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

/** Znak wysrodkowany na plotnie o zadanym tle. */
async function compose({ size, markSize, background, svg = markSvg, out }) {
  const mark = await render(svg, markSize);
  const offset = Math.round((size - markSize) / 2);
  const canvas = sharp({
    create: { width: size, height: size, channels: 4, background },
  });
  await canvas.composite([{ input: mark, left: offset, top: offset }]).png().toFile(out);
  console.log(`  ${out.replace(root + '\\', '').replace(root + '/', '')}  ${size}px`);
}

mkdirSync(images, { recursive: true });
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

console.log('ikona aplikacji (iOS + fallback Android):');
// Znak ma proporcje 0.83 (iskry dokladaja wysokosci), wiec przy wpisaniu w 660 px
// zajmuje 64% wysokosci i 53% szerokosci kadru. Margines musi zostac — iOS
// zaokragla rogi i docina wszystko, co podejdzie za blisko krawedzi.
await compose({ size: 1024, markSize: 660, background: CREAM, out: join(images, 'icon.png') });

console.log('\nikona adaptacyjna Androida:');
// Android przycina warstwe do ksztaltu wybranego przez producenta (kolo, kwadrat,
// kropla). Bezpieczna jest srodkowa strefa o srednicy ~61% kadru, czyli 625 px.
// Przy 560 px znak miesci sie w niej na wysokosc (560) i na szerokosc (465),
// wiec zadna maska nie utnie ani iskier u gory, ani czubka serca u dolu.
await compose({
  size: 1024,
  markSize: 560,
  background: transparent,
  out: join(images, 'android-icon-foreground.png'),
});
await compose({
  size: 1024,
  markSize: 1,
  background: CREAM,
  out: join(images, 'android-icon-background.png'),
});

console.log('\nwariant monochromatyczny (motyw dynamiczny Androida):');
// Android 13+ przemalowuje te warstwe na kolory tapety uzytkownika, wiec liczy
// sie wylacznie ksztalt — kolory zastepujemy jednolita czernia.
const monochrome = markSvg.replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="#000000"');
await compose({
  size: 1024,
  markSize: 560,
  background: transparent,
  svg: monochrome,
  out: join(images, 'android-icon-monochrome.png'),
});

console.log('\nekran powitalny:');
await compose({
  size: 512,
  markSize: 512,
  background: transparent,
  out: join(images, 'splash-icon.png'),
});

console.log('\npodglad na kafelku (do obejrzenia, nie trafia do aplikacji):');
await compose({ size: 512, markSize: 330, background: CREAM, out: join(brand, 'icon-preview.png') });
