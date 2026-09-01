// Zamiana maski binarnej na gladkie sciezki SVG.
//
// Kroki: krawedzie pikseli -> zamkniete petle -> uproszczenie RDP -> Catmull-Rom
// zamieniony na krzywe szescienne. Dzieki temu obrys pochodzi z pikseli, a nie
// z odrysowania na oko, i pozostaje ostry w kazdej skali.

const key = (x, y) => `${x},${y}`;

/**
 * Sklada zamkniete petle z krawedzi pikseli granicznych.
 * Kierunek obiegu: obrysy zewnetrzne zgodnie z ruchem wskazowek, dziury
 * przeciwnie — czyli dokladnie to, czego potrzebuje fill-rule="evenodd".
 */
export function traceContours(mask, width, height) {
  const inside = (x, y) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x];
  const edges = new Map();

  const push = (ax, ay, bx, by) => {
    const k = key(ax, ay);
    if (!edges.has(k)) edges.set(k, []);
    edges.get(k).push([bx, by]);
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inside(x, y)) continue;
      if (!inside(x, y - 1)) push(x, y, x + 1, y);
      if (!inside(x + 1, y)) push(x + 1, y, x + 1, y + 1);
      if (!inside(x, y + 1)) push(x + 1, y + 1, x, y + 1);
      if (!inside(x - 1, y)) push(x, y + 1, x, y);
    }
  }

  const contours = [];
  for (const [start, list] of edges) {
    while (list.length) {
      const loop = [];
      let [cx, cy] = start.split(',').map(Number);
      let next = list.pop();

      while (next) {
        loop.push([cx, cy]);
        [cx, cy] = next;
        if (key(cx, cy) === start) break;
        const outgoing = edges.get(key(cx, cy));
        if (!outgoing || outgoing.length === 0) break;
        next = outgoing.pop();
      }

      if (loop.length > 8) contours.push(loop);
    }
  }
  return contours;
}

/** Ramer-Douglas-Peucker: usuwa punkty lezace praktycznie na prostej. */
export function simplify(points, epsilon) {
  if (points.length < 3) return points;

  const distance = (p, a, b) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
    return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
  };

  const run = (pts) => {
    if (pts.length < 3) return pts;
    let index = 0;
    let max = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = distance(pts[i], pts[0], pts[pts.length - 1]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (max <= epsilon) return [pts[0], pts[pts.length - 1]];
    return [...run(pts.slice(0, index + 1)).slice(0, -1), ...run(pts.slice(index))];
  };

  return run(points);
}

/**
 * Zamyka petle gladka krzywa. Napiecie 0.9 daje ksztalt organiczny, ale wciaz
 * trzymajacy sie oryginalu — wyzsze wartosci zaczynaja "puchnac" na ostrych
 * czubkach listkow.
 */
export function toSmoothPath(points, tension = 0.9, precision = 2) {
  const n = points.length;
  if (n < 3) return '';

  const p = (i) => points[((i % n) + n) % n];
  const round = (v) => Number(v.toFixed(precision));

  let d = `M${round(p(0)[0])} ${round(p(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += `C${round(c1x)} ${round(c1y)} ${round(c2x)} ${round(c2y)} ${round(p2[0])} ${round(p2[1])}`;
  }
  return `${d}Z`;
}
