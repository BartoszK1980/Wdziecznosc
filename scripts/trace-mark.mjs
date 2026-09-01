// Przerysowuje znak marki z assets/brand/mark.png (189 px) na wektor.
//
// Dostarczona ikona 1024 ma symbol zajmujacy ~13% kadru, a jedyny czysty symbol
// ma 189 px — za malo na ikone sklepowa. Wektor rozwiazuje oba problemy naraz.
//
//   npm run trace-mark
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { simplify, toSmoothPath, traceContours } from './lib/trace.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'assets', 'brand', 'mark.png');
const target = join(root, 'assets', 'brand', 'mark.svg');

const SAGE = '#738C78';
const GOLD = '#ECAF44';

/**
 * Obrys liczymy na masce nadprobkowanej 6x.
 *
 * Bez tego kroku krzywa goni schodki pojedynczych pikseli i krawedz wychodzi
 * pofalowana. Wygladzenie lanczosem daje granice podpikselowa, a RDP moze
 * wtedy usunac duzo wiecej punktow bez utraty ksztaltu.
 */
const SCALE = 6;
const EPSILON = 3.4; // w pikselach nadprobkowanych, czyli ~0.57 px zrodla
const TENSION = 0.8;
/**
 * Zrodlowy PNG ma szumiacy antyaliasing, a lanczos przy powiekszaniu jeszcze go
 * podbija. Delikatne rozmycie przed progowaniem sciera ten szum i zostawia
 * gladka granice. Sigma jest na tyle mala (~0.65 px zrodla), ze lodyga
 * i nerwy listkow to przezywaja.
 */
const BLUR = SCALE * 0.65;

const meta = await sharp(source).metadata();
const { width: W, height: H } = meta;
const sw = W * SCALE;
const sh = H * SCALE;

const { data } = await sharp(source)
  .resize(sw, sh, { kernel: 'lanczos3' })
  .ensureAlpha()
  .blur(BLUR)
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = (x, y) => {
  const i = (y * sw + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
};

const isGold = ([r, g, b, a]) => a > 128 && r > 195 && g > 135 && b < 135;
const isSage = ([r, g, b, a]) => a > 128 && !isGold([r, g, b, a]);

const maskOf = (predicate) => {
  const mask = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) mask[y * sw + x] = predicate(px(x, y)) ? 1 : 0;
  }
  return mask;
};

const loopsFor = (predicate, epsilon) =>
  traceContours(maskOf(predicate), sw, sh)
    .map((loop) => simplify(loop, epsilon))
    .filter((loop) => loop.length > 6)
    // z powrotem do ukladu zrodla
    .map((loop) => loop.map(([x, y]) => [x / SCALE, y / SCALE]));

/**
 * Serce z wycietym pedem. Wnetrze pedu jest w zrodle przezroczyste, wiec
 * pojawia sie jako dziury w masce — evenodd przepuszcza je na wylot i znak
 * dziala na dowolnym tle, nie tylko na kremowym.
 */
const heartLoops = loopsFor(isSage, EPSILON);
const sparkleLoops = loopsFor(isGold, EPSILON * 0.8);

/**
 * viewBox przyciety do samej grafiki.
 *
 * Zrodlowy PNG ma wokol znaku spory pusty margines. Gdyby zostal w viewBoxie,
 * kazde uzycie znaku (ikona, splash, naglowek) rysowaloby go mniejszym, niz
 * wynika z zadanego rozmiaru, i trzeba by to kompensowac w kazdym miejscu z
 * osobna.
 */
const all = [...heartLoops, ...sparkleLoops].flat();
const PAD = 1;
const minX = Math.min(...all.map((p) => p[0])) - PAD;
const minY = Math.min(...all.map((p) => p[1])) - PAD;
const boxW = Math.max(...all.map((p) => p[0])) + PAD - minX;
const boxH = Math.max(...all.map((p) => p[1])) + PAD - minY;

const round = (v) => Number(v.toFixed(2));
const heartPaths = heartLoops.map((loop) => toSmoothPath(loop, TENSION));
const sparklePaths = sparkleLoops.map((loop) => toSmoothPath(loop, TENSION));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${round(minX)} ${round(minY)} ${round(boxW)} ${round(boxH)}" role="img" aria-label="Wdzięczność">
  <title>Wdzięczność</title>
  <path fill="${SAGE}" fill-rule="evenodd" d="${heartPaths.join('')}"/>
  <path fill="${GOLD}" fill-rule="evenodd" d="${sparklePaths.join('')}"/>
</svg>
`;

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, svg, 'utf8');

console.log(`zrodlo       ${W}x${H}, nadprobkowane do ${sw}x${sh}`);
console.log(`viewBox      ${round(minX)} ${round(minY)} ${round(boxW)} ${round(boxH)}  (proporcja ${(boxW / boxH).toFixed(3)})`);
console.log(`serce        ${heartPaths.length} kontur(y) (obrys + wyciety ped)`);
console.log(`iskry        ${sparklePaths.length} kontur(y)`);
console.log(`zapisano     ${target}  (${(svg.length / 1024).toFixed(1)} kB)`);
