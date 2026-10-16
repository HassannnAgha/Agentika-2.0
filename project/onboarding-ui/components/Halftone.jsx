/**
 * Halftone field.
 *
 * A dot matrix whose radii come from a field, so form emerges from the grid
 * rather than from an image. Everything is deterministic — the same grid on
 * every build — so the figure in the report and the figure on screen are the
 * same picture.
 *
 *   variant  cat | terrain | ridge | wave | peak
 *   tone     blue | mono | warm | slate | ginger
 *
 * Two kinds of field. The landscapes are one-dimensional: a height per column.
 * The cat is two-dimensional: an insideness per cell, positive within the
 * silhouette and larger the deeper in, which is what gives the edge its dither.
 */

const CELL = 16;

function hash(i, j) {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/* ---------- one-dimensional fields: a horizon per column ---------------- */

const HORIZONS = {
  terrain: {
    front: (x) =>
      0.30 + 0.16 * Math.sin(x * 3.1 + 0.6) + 0.10 * Math.sin(x * 6.9 + 2.3) +
      0.06 * Math.sin(x * 12.4 + 4.1) + 0.04 * Math.sin(x * 21.0 + 1.2),
    back: (x) => 0.46 + 0.12 * Math.sin(x * 2.3 + 1.9) + 0.07 * Math.sin(x * 5.1 + 0.4),
  },
  ridge: {
    front: (x) => 0.34 + 0.14 * Math.sin(x * 2.2 + 1.4) + 0.07 * Math.sin(x * 5.7 + 3.0),
    back: (x) => 0.52 + 0.09 * Math.sin(x * 1.6 + 0.3),
  },
  wave: {
    front: (x) => 0.42 + 0.20 * Math.sin(x * 4.4 + 0.9) + 0.09 * Math.sin(x * 9.1 + 2.6),
    back: (x) => 0.66 + 0.10 * Math.sin(x * 3.0 + 2.2),
  },
  peak: {
    front: (x) => 0.18 + 0.52 * Math.exp(-((x - 0.46) ** 2) / 0.045) + 0.06 * Math.sin(x * 11.0),
    back: (x) => 0.34 + 0.18 * Math.exp(-((x - 0.74) ** 2) / 0.07),
  },
};

/* ---------- the cat ----------------------------------------------------- */

function disc(x, y, cx, cy, r) {
  return 1 - Math.hypot(x - cx, y - cy) / r;
}

function oval(x, y, cx, cy, rx, ry) {
  return 1 - Math.hypot((x - cx) / rx, (y - cy) / ry);
}

/** Signed distance to the line ab, positive on the left, scaled to read as insideness. */
function edge(x, y, ax, ay, bx, by) {
  const ux = bx - ax;
  const uy = by - ay;
  const len = Math.hypot(ux, uy) || 1e-6;
  return ((x - ax) * uy - (y - ay) * ux) / len;
}

function wedge(x, y, a, b, c) {
  return Math.min(
    edge(x, y, a[0], a[1], b[0], b[1]),
    edge(x, y, b[0], b[1], c[0], c[1]),
    edge(x, y, c[0], c[1], a[0], a[1]),
  ) / 0.055;
}

/** Cubic bezier, for the tail. */
function bez(t, p0, p1, p2, p3) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

/** Discs sampled along a cubic bezier, tapering from r0 to r1. */
function along(x, y, p0, p1, p2, p3, r0, r1, step = 0.02) {
  let v = -9;
  for (let t = 0; t <= 1.0001; t += step) {
    const p = bez(t, p0, p1, p2, p3);
    v = Math.max(v, disc(x, y, p[0], p[1], r0 + (r1 - r0) * t));
  }
  return v;
}

/** A sitting cat, seen head on, tail sweeping out to the right and curling back. */
function cat(x, y) {
  let v = oval(x, y, 0.45, 0.33, 0.175, 0.245);          // body
  v = Math.max(v, oval(x, y, 0.45, 0.20, 0.205, 0.105)); // haunches
  v = Math.max(v, oval(x, y, 0.45, 0.525, 0.145, 0.140)); // chest, bridging the neck
  v = Math.max(v, disc(x, y, 0.45, 0.695, 0.140));        // head
  v = Math.max(v, oval(x, y, 0.45, 0.655, 0.152, 0.102)); // cheeks
  v = Math.max(v, wedge(x, y, [0.352, 0.784], [0.306, 0.952], [0.438, 0.830]));
  v = Math.max(v, wedge(x, y, [0.463, 0.830], [0.598, 0.952], [0.552, 0.784]));
  v = Math.max(v, along(x, y, [0.58, 0.13], [0.88, 0.17], [0.90, 0.52], [0.72, 0.57], 0.040, 0.026));
  return v;
}

const catEyes = (x, y) =>
  Math.max(oval(x, y, 0.400, 0.726, 0.026, 0.030), oval(x, y, 0.500, 0.726, 0.026, 0.030));

const catCig = (x, y) =>
  along(x, y, [0.575, 0.630], [0.625, 0.620], [0.675, 0.610], [0.725, 0.600], 0.012, 0.012, 0.06);

const catEmber = (x, y) => disc(x, y, 0.733, 0.598, 0.017);

const catSmoke = (x, y) =>
  along(x, y, [0.750, 0.618], [0.880, 0.700], [0.700, 0.810], [0.820, 0.985], 0.016, 0.042);

/** Trailing vine down the left, leaves alternating off the stem. */
function catVine(x, y) {
  let v = along(x, y, [0.045, 1.02], [0.165, 0.84], [0.030, 0.62], [0.125, 0.40], 0.019, 0.014);
  const leaves = [
    [0.100, 0.93], [0.128, 0.845], [0.072, 0.760], [0.118, 0.672],
    [0.055, 0.588], [0.100, 0.500], [0.088, 0.432],
  ];
  leaves.forEach((p, k) => {
    v = Math.max(v, oval(x, y, p[0] + (k % 2 ? 0.038 : -0.030), p[1], 0.046, 0.027));
  });
  return v;
}

/** The table top it sits on. */
const catTable = (x, y) =>
  y < 0.075 ? 1 - Math.hypot((x - 0.5) / 0.99, y / 0.078) : -9;

/* ---------- palettes ---------------------------------------------------- */

const TONES = {
  blue:   { fore: ['#121212', '#1F1F1F', '#2C2C2C', '#3A3A3A'], accent: ['#B9722E', '#CE9152', '#D9AE78'], mid: ['#8395A6', '#9FB0BE'], sky: '#A9C5DA', void: '#CFE0EE' },
  slate:  { fore: ['#1B2430', '#263244', '#324257', '#405068'], accent: ['#4E6279', '#5E7390', '#7D8FA8'], mid: ['#7E8CA0', '#95A2B4'], sky: '#BBC8D6', void: '#D8E2EC' },
  mono:   { fore: ['#0A0A0A', '#262626', '#404040', '#525252'], accent: ['#737373', '#8A8A8A', '#A1A1A1'], mid: ['#A1A1A1', '#B4B4B4'], sky: '#D4D4D4', void: '#E8E8E8' },
  warm:   { fore: ['#2A1A0E', '#4A2F17', '#6B4620', '#8A5C2A'], accent: ['#B9722E', '#CE9152', '#D9AE78'], mid: ['#B08E6A', '#C4A685'], sky: '#E4D2BC', void: '#F0E4D4' },
  ginger: { fore: ['#7A3C10', '#9A5218', '#B96B22', '#D08A3A'], accent: ['#2B1B10', '#F0C98A', '#E8B36A'], mid: ['#C79A66', '#D8B489'], sky: '#A9C5DA', void: '#1E1A16' },
  // taken from the painting: black cat, amber eyes, cream cigarette, green foliage
  noir: {
    fore: ['#080A09', '#121715', '#1B221E', '#262F29'],
    accent: ['#2F3D35', '#394940', '#161C19'],
    mid: ['#5C7A64', '#6E8B75'],
    sky: '#587A60',
    void: '#F5A02A',
    eyes: '#F7A72E',
    cig: '#EFEADC',
    ember: '#FF6A2A',
    smoke: '#CBD2C6',
    vine: ['#22402A', '#32573B', '#44704C'],
    table: ['#9C5C36', '#B06B3F'],
  },
};

/* ---------- build ------------------------------------------------------- */

const cache = new Map();

function build(variant, tone, cols, rows) {
  const key = `${variant}|${tone}|${cols}|${rows}`;
  if (cache.has(key)) return cache.get(key);

  const pal = TONES[tone] || TONES.blue;
  const out = [];
  const half = CELL / 2;
  const isCat = variant === 'cat';
  const horizon = HORIZONS[variant] || HORIZONS.terrain;

  for (let i = 0; i < cols; i += 1) {
    const xN = i / (cols - 1);
    const fy = isCat ? 0 : horizon.front(xN);
    const by = isCat ? 0 : horizon.back(xN);

    for (let j = 0; j < rows; j += 1) {
      const yN = 1 - (j + 0.5) / rows;
      const h = hash(i, j);
      let r = 0;
      let fill = '';

      if (isCat) {
        const ins = cat(xN, yN);
        const eye = catEyes(xN, yN);
        const em = catEmber(xN, yN);
        const cg = catCig(xN, yN);
        const sm = catSmoke(xN, yN);
        const vn = catVine(xN, yN);
        const tb = catTable(xN, yN);
        const vine = pal.vine || pal.mid;
        const table = pal.table || pal.mid;

        if (eye > 0 && ins > 0) {
          r = half * Math.min(1, 0.62 + eye * 2.0);
          fill = pal.eyes || pal.void;
        } else if (em > 0) {
          r = half * Math.min(1, 0.70 + em * 1.4);
          fill = pal.ember || pal.accent[0];
        } else if (cg > 0) {
          r = half * Math.min(1, 0.52 + cg * 1.2);
          fill = pal.cig || pal.sky;
        } else if (ins > 0) {
          r = half * Math.min(1, 0.36 + ins * 3.4);
          fill =
            h < 0.17 + Math.min(ins, 0.25) * 0.5
              ? pal.accent[Math.floor(hash(j, i) * pal.accent.length)]
              : pal.fore[Math.min(pal.fore.length - 1, Math.floor((1 - Math.min(ins * 2.6, 1)) * pal.fore.length))];
        } else if (sm > 0 && h > 0.44) {
          // smoke reads as wisps: sparse, small, never a solid mass
          r = half * Math.min(0.46, 0.18 + sm * 1.1);
          fill = pal.smoke || pal.sky;
        } else if (vn > 0) {
          r = half * Math.min(1, 0.34 + vn * 2.2);
          fill = vine[Math.floor(hash(j, i) * vine.length)];
        } else if (tb > 0) {
          r = half * Math.min(1, 0.34 + tb * 1.6);
          fill = table[h < 0.5 ? 0 : 1];
        } else {
          const d = Math.min(-ins, 1);
          r = half * (0.40 - d * 0.55);
          if (h < d * 1.25) r = 0;
          fill = pal.sky;
        }
      } else if (yN < fy) {
        const depth = (fy - yN) / Math.max(fy, 0.001);
        r = half * Math.min(1, 0.34 + depth * 0.95);
        fill =
          h < 0.14 + depth * 0.18
            ? pal.accent[Math.floor(hash(j, i) * pal.accent.length)]
            : pal.fore[Math.min(pal.fore.length - 1, Math.floor((1 - depth) * pal.fore.length))];
      } else if (yN < by) {
        const d = (by - yN) / Math.max(by, 0.001);
        r = half * Math.min(1, 0.22 + d * 0.55);
        fill = h < 0.3 ? pal.mid[0] : pal.mid[1];
      } else {
        const d = yN - by;
        r = half * (0.40 - d * 0.62);
        if (h < d * 1.1) r = 0;
        fill = pal.sky;
      }

      if (r > 0.4) {
        out.push({ cx: i * CELL + half, cy: j * CELL + half, r: Number(r.toFixed(2)), fill });
      }
    }
  }

  cache.set(key, out);
  return out;
}

export default function Halftone({
  variant = 'terrain',
  tone = 'blue',
  cols = 64,
  rows = 38,
  fit = 'xMidYMax slice',
  style,
}) {
  const dots = build(variant, tone, cols, rows);
  return (
    <svg
      viewBox={`0 0 ${cols * CELL} ${rows * CELL}`}
      preserveAspectRatio={fit}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {dots.map((d, n) => (
        <circle key={n} cx={d.cx} cy={d.cy} r={d.r} fill={d.fill} />
      ))}
    </svg>
  );
}
