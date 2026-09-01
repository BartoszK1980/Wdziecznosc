// Minimalny dekoder PNG (8-bitowa glebia) — tylko zlib z biblioteki standardowej.
// Uzywany przez trace-mark.mjs; nie trafia do paczki aplikacji.
import { inflateSync } from 'node:zlib';

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** @returns {{width:number,height:number,at:(x:number,y:number)=>[number,number,number,number]}} */
export function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let palette = null;
  let trns = null;
  const idat = [];

  while (pos < buffer.length) {
    const length = buffer.readUInt32BE(pos);
    const type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`nieobslugiwana glebia bitowa: ${bitDepth}`);

  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`nieobslugiwany typ koloru: ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) v += paeth(a, b, c);
      out[y * stride + x] = v & 0xff;
    }
  }

  const at = (x, y) => {
    const i = y * stride + x * channels;
    if (colorType === 6) return [out[i], out[i + 1], out[i + 2], out[i + 3]];
    if (colorType === 2) return [out[i], out[i + 1], out[i + 2], 255];
    if (colorType === 4) return [out[i], out[i], out[i], out[i + 1]];
    if (colorType === 3) {
      const p = out[i];
      return [
        palette[p * 3],
        palette[p * 3 + 1],
        palette[p * 3 + 2],
        trns && p < trns.length ? trns[p] : 255,
      ];
    }
    return [out[i], out[i], out[i], 255];
  };

  return { width, height, at };
}
