// Oprawia surowe zrzuty z emulatora w obrazy gotowe do Google Play.
//
//   npm run frame-screenshots
//
// Wejscie:  store/zrzuty/<jezyk>/<n>-<ekran>.png     (1080x2400, z emulatora)
// Wyjscie:  store/zrzuty-sklep/<jezyk>/<n>-<ekran>.png (1080x1920)
//
// Surowe zrzuty NIE nadaja sie do wyslania: Google Play dopuszcza proporcje
// najwyzej 2:1, a zrzut 1080x2400 ma 2,22:1 — sklep go odrzuci. Standardem jest
// 1080x1920 (9:16), PNG bez kanalu alfa, do 8 MB, od 2 do 8 zrzutow na jezyk.
//
// Z surowego zrzutu obcinamy pasek statusu (godzina z emulatora, ikony) i pasek
// nawigacji systemu — w materiale sklepowym to szum, a godzina 9:00 wyglada
// na przypadkowa.
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const input = join(root, 'store', 'zrzuty');
const output = join(root, 'store', 'zrzuty-sklep');

const W = 1080;
const H = 1920;
const COLORS = { bg: '#FBF6F0', text: '#263A32' };

// Obciecie surowego zrzutu 1080x2400: pasek statusu i pasek gestow.
const CROP_TOP = 70;
const CROP_BOTTOM = 45;

// Uklad: podpis u gory, pod nim ekran telefonu.
const CAPTION_TOP = 150;
const SHOT_TOP = 400;
const SHOT_BOTTOM_MARGIN = 70;
const RADIUS = 44;

// Podpisy nad ekranami. Klucz = nazwa ekranu z pliku (<n>-<ekran>.png).
const CAPTIONS = {
  pl: { dzis: 'Kilka zdań dziennie', edytor: 'Tekstem, zdjęciem albo głosem', notatki: 'Wszystkie dobre chwile w jednym miejscu', kalendarz: 'Wróć do każdego dnia', statystyki: 'Zobacz, jak rośnie Twoja praktyka' },
  en: { dzis: 'A few lines a day', edytor: 'In words, photos or your voice', notatki: 'All your good moments in one place', kalendarz: 'Revisit any day', statystyki: 'Watch your practice grow' },
  de: { dzis: 'Ein paar Zeilen am Tag', edytor: 'Mit Text, Foto oder Stimme', notatki: 'Alle guten Momente an einem Ort', kalendarz: 'Zu jedem Tag zurückkehren', statystyki: 'Sieh, wie deine Praxis wächst' },
  es: { dzis: 'Unas líneas al día', edytor: 'Con texto, fotos o tu voz', notatki: 'Todos tus buenos momentos en un lugar', kalendarz: 'Vuelve a cualquier día', statystyki: 'Mira cómo crece tu hábito' },
  fr: { dzis: 'Quelques lignes par jour', edytor: 'En texte, en photo ou à voix haute', notatki: 'Tous vos bons moments au même endroit', kalendarz: 'Revenez à chaque journée', statystyki: 'Voyez votre pratique grandir' },
  it: { dzis: 'Qualche riga al giorno', edytor: 'Con testo, foto o voce', notatki: 'Tutti i momenti belli in un solo posto', kalendarz: 'Torna a ogni giornata', statystyki: 'Guarda crescere la tua abitudine' },
  pt: { dzis: 'Algumas linhas por dia', edytor: 'Em texto, foto ou voz', notatki: 'Todos os bons momentos num só lugar', kalendarz: 'Volta a qualquer dia', statystyki: 'Vê a tua prática a crescer' },
};

const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Lamanie po slowach — librsvg nie lamie tekstu sam. */
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

function captionSvg(text) {
  const lines = wrap(text, 24);
  const size = 70;
  const lineHeight = 84;
  // Jedna linia stoi nizej niz dwie, zeby obie wersje byly wizualnie wysrodkowane.
  const firstY = CAPTION_TOP + (lines.length === 1 ? 60 : 0) + size;
  const tspans = lines
    .map((line, i) => `<tspan x="${W / 2}" y="${firstY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<text text-anchor="middle" font-family="Georgia, serif" font-weight="bold" font-size="${size}" fill="${COLORS.text}">${tspans}</text>` +
      `</svg>`
  );
}

async function frame(file, lang, screen) {
  const raw = sharp(file);
  const meta = await raw.metadata();
  const cropHeight = meta.height - CROP_TOP - CROP_BOTTOM;
  const maxHeight = H - SHOT_TOP - SHOT_BOTTOM_MARGIN;
  const scale = maxHeight / cropHeight;
  const shotW = Math.round(meta.width * scale);
  const shotH = Math.round(cropHeight * scale);
  const left = Math.round((W - shotW) / 2);

  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${shotW}" height="${shotH}"><rect width="${shotW}" height="${shotH}" rx="${RADIUS}" ry="${RADIUS}" fill="#fff"/></svg>`
  );
  const screenImage = await sharp(file)
    .extract({ left: 0, top: CROP_TOP, width: meta.width, height: cropHeight })
    .resize(shotW, shotH)
    .composite([{ input: roundedMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Cien: rozmyty prostokat tego samego ksztaltu, lekko przesuniety w dol.
  const shadow = await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${shotW + 120}" height="${shotH + 120}"><rect x="60" y="72" width="${shotW}" height="${shotH}" rx="${RADIUS}" ry="${RADIUS}" fill="#263A32" fill-opacity="0.16"/></svg>`
    )
  )
    .blur(22)
    .png()
    .toBuffer();

  const caption = CAPTIONS[lang]?.[screen];
  if (!caption) throw new Error(`brak podpisu dla ${lang}/${screen}`);

  const target = join(output, lang, file.split(/[\\/]/).pop());
  const composed = await sharp({ create: { width: W, height: H, channels: 3, background: COLORS.bg } })
    .composite([
      { input: shadow, left: left - 60, top: SHOT_TOP - 60 },
      { input: screenImage, left, top: SHOT_TOP },
      { input: captionSvg(caption), left: 0, top: 0 },
    ])
    .png()
    .toBuffer();

  // Osobny krok, bo sharp wykonuje composite ZAWSZE na koncu potoku — flatten
  // w tym samym wywolaniu zadzialalby przed nalozeniem warstw, a polprzezroczysty
  // cien przywrocilby kanal alfa. Google Play odrzuca PNG z przezroczystoscia.
  await sharp(composed).flatten({ background: COLORS.bg }).removeAlpha().png().toFile(target);
  return target;
}

// Opcjonalnie tylko wybrane jezyki: npm run frame-screenshots -- pl en
const only = process.argv.slice(2);

let count = 0;
for (const lang of readdirSync(input).sort()) {
  const dir = join(input, lang);
  if (!CAPTIONS[lang] || !existsSync(dir)) continue;
  if (only.length && !only.includes(lang)) continue;
  mkdirSync(join(output, lang), { recursive: true });
  const files = readdirSync(dir).filter((f) => /^\d-[a-z]+\.png$/.test(f)).sort();
  for (const name of files) {
    const screen = name.replace(/^\d-/, '').replace(/\.png$/, '');
    await frame(join(dir, name), lang, screen);
    count += 1;
  }
  console.log(`${lang}: ${files.length} zrzutow`);
}
console.log(`razem: ${count}`);
