/**
 * Turns the reference painting into halftone dot data.
 *
 * Run once, by hand; the app imports the JSON it writes and never decodes an
 * image at build or request time.
 *
 *   node tools/gen-dots.mjs <source.png> components/catDots.json
 *
 * Two things matter here. Cells are aggregated by hand rather than by a plain
 * resize, because the cat's eyes are only fifteen pixels tall and averaging
 * dissolves them into the black fur — so each cell keeps the most saturated
 * pixel it saw and uses that when it stands well clear of the cell's mean.
 * And the cigarette and its smoke are blurred away before sampling, below and
 * to the right of the eyes so the mask never touches them.
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SRC = process.argv[2];
const OUT = process.argv[3];

const CROP = { left: 300, top: 425, width: 420, height: 365 };
const COLS = 100;
const ROWS = 87;
const CELL = 16;

// the cigarette, then its smoke; both clear of the eyes, which end at y 531
const MASKS = [
  { left: 438, top: 536, width: 280, height: 76 },
  { left: 520, top: 332, width: 205, height: 206 },
];

const sat = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx === 0 ? 0 : (mx - mn) / mx;
};
const lum = (r, g, b) => (r * 0.299 + g * 0.587 + b * 0.114) / 255;
const hex = (r, g, b) =>
  `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

const patches = [];
for (const m of MASKS) {
  patches.push({ input: await sharp(SRC).extract(m).blur(26).toBuffer(), left: m.left, top: m.top });
}

const { data, info } = await sharp(await sharp(SRC).composite(patches).toBuffer())
  .extract(CROP)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H } = info;
const cw = W / COLS;
const ch = H / ROWS;

const cells = [];
for (let j = 0; j < ROWS; j += 1) {
  for (let i = 0; i < COLS; i += 1) {
    const x0 = Math.floor(i * cw);
    const x1 = Math.max(x0 + 1, Math.floor((i + 1) * cw));
    const y0 = Math.floor(j * ch);
    const y1 = Math.max(y0 + 1, Math.floor((j + 1) * ch));

    let sr = 0; let sg = 0; let sb = 0; let n = 0;
    let best = null; let bestScore = -1;

    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const o = (y * W + x) * 3;
        const r = data[o]; const g = data[o + 1]; const b = data[o + 2];
        sr += r; sg += g; sb += b; n += 1;
        const score = sat(r, g, b) * (0.35 + lum(r, g, b));
        if (score > bestScore) { bestScore = score; best = [r, g, b]; }
      }
    }

    const mean = [sr / n, sg / n, sb / n];
    const meanScore = sat(...mean) * (0.35 + lum(...mean));
    // a small bright feature in a dark cell keeps its colour
    const standout = bestScore > meanScore * 1.9 && bestScore > 0.22;
    const pick = standout ? best : mean;

    cells.push({ i, j, rgb: pick, l: lum(...mean), standout });
  }
}

const sortedL = cells.map((c) => c.l).sort((a, b) => a - b);
const bg = sortedL[Math.floor(sortedL.length * 0.55)];

// the painting's own background, for the plate behind the dots
const bgCells = cells.filter((c) => Math.abs(c.l - bg) < 0.05);
const avg = [0, 1, 2].map((ch) => Math.round(bgCells.reduce((a, c) => a + c.rgb[ch], 0) / bgCells.length));

const half = CELL / 2;
const dots = cells.map((c) => {
  const [r0, g0, b0] = c.rgb;
  const m = (r0 + g0 + b0) / 3;
  const k = 1.45;
  const d = Math.abs(c.l - bg);
  const rad = half * Math.max(0.46, Math.min(1, (c.standout ? 0.86 : 0.58) + d * 1.5));
  return {
    x: c.i * CELL + half,
    y: c.j * CELL + half,
    r: Number(rad.toFixed(2)),
    c: hex(m + (r0 - m) * k, m + (g0 - m) * k, m + (b0 - m) * k),
  };
});

// written as a standalone SVG file: the browser caches and gzips it, where
// eight thousand inline <circle> elements would weigh the page down instead
const body = dots
  .map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${Number(d.r.toFixed(1))}" fill="${d.c}"/>`)
  .join('');
writeFileSync(
  OUT,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${COLS * CELL} ${ROWS * CELL}">` +
    `<rect width="100%" height="100%" fill="${hex(...avg)}"/>${body}</svg>`,
);
console.log(
  `wrote ${dots.length} dots, grid ${COLS}x${ROWS}, bg lum ${bg.toFixed(3)}, ` +
  `${cells.filter((c) => c.standout).length} standout cells`,
);
console.log('plate colour', hex(...avg));

const ramp = ' .:-=+*#%@';
for (let j = 0; j < ROWS; j += 2) {
  let s = '';
  for (let i = 0; i < COLS; i += 1) {
    const c = cells[j * COLS + i];
    s += c.standout ? 'O' : ramp[Math.min(9, Math.floor(c.l * 10))];
  }
  console.log(s);
}
