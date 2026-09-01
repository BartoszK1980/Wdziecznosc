// Porownuje przerysowany wektor z oryginalnym PNG: liczbowo (IoU maski) oraz
// wizualnie (obrazek porownawczy do obejrzenia).
//
//   npm run verify-mark
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import { decodePng } from './lib/png.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = join(root, 'assets', 'brand');
const SIZE = 189;
const ZOOM = 3;

// Sciezki uzywaja wspolrzednych zrodla, wiec do porownania wystarczy przywrocic
// pelny viewBox — inaczej przyciety kadr przesunalby znak wzgledem oryginalu.
const svg = Buffer.from(
  readFileSync(join(brand, 'mark.svg'), 'utf8').replace(
    /viewBox="[^"]+"/,
    `viewBox="0 0 ${SIZE} ${SIZE}"`
  )
);

const rendered = await sharp(svg, { density: 600 })
  .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const original = decodePng(readFileSync(join(brand, 'mark.png')));
const vector = decodePng(rendered);

let intersection = 0;
let union = 0;
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const a = original.at(x, y)[3] > 128;
    const b = vector.at(x, y)[3] > 128;
    if (a && b) intersection++;
    if (a || b) union++;
  }
}
const iou = ((intersection / union) * 100).toFixed(2);

// obrazek porownawczy: oryginal | wektor | wektor duzy
const cream = { r: 0xfb, g: 0xf6, b: 0xf0, alpha: 1 };
const big = SIZE * ZOOM;
const gap = 24;

const upscaledOriginal = await sharp(readFileSync(join(brand, 'mark.png')))
  .resize(big, big, { kernel: 'nearest' })
  .toBuffer();
const upscaledVector = await sharp(svg, { density: 900 }).resize(big, big, {
  fit: 'contain',
  background: { r: 0, g: 0, b: 0, alpha: 0 },
}).toBuffer();

await sharp({
  create: { width: big * 2 + gap * 3, height: big + gap * 2, channels: 4, background: cream },
})
  .composite([
    { input: upscaledOriginal, left: gap, top: gap },
    { input: upscaledVector, left: gap * 2 + big, top: gap },
  ])
  .png()
  .toFile(join(brand, 'mark-comparison.png'));

console.log(`pokrycie maski (IoU): ${iou}%`);
console.log(`porownanie:           assets/brand/mark-comparison.png  (lewa: oryginal 189px powiekszony, prawa: wektor)`);
if (Number(iou) < 95) console.log('UWAGA: pokrycie ponizej 95% — obrys wymaga poprawki.');
