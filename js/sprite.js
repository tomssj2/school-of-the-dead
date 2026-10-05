// Procedural 32x40 chibi pixel-art portraits, deterministic per character (spriteSeed or id).
// Parts are stamped onto a grid of palette keys back-to-front, then two automatic passes give it
// a finished look: rim shading (light from the top-left, cool hue-shifted shadows) and a dark
// outline around the whole silhouette. Appearance also reflects state — injuries show bandages,
// legendary survivors get a gold outline and sparkle, the dead go gray with closed eyes.

const W = 32;
const H = 40;

// ---------- palettes ([value, weight] pairs are picked with wpick) ----------

const SKIN = [["#ffe3c8", 2], ["#f6cba5", 3], ["#e8b185", 3], ["#d29a6c", 2], ["#b77a4f", 2], ["#8e5a3b", 2], ["#6a3f27", 1.5]];
const HAIR_STUDENT = [
  ["#1e1a22", 3], ["#3a2419", 3], ["#6a4125", 3], ["#8c4a28", 2], ["#a33e28", 1.2], ["#e2bf6c", 1.5], ["#ece5cf", 0.6],
  ["#e27fa8", 0.35], ["#4d7ed6", 0.35], ["#46a878", 0.25], ["#8a5ad6", 0.35], ["#d24848", 0.3],
];
const HAIR_TEACHER = [
  ["#1e1a22", 3], ["#3a2419", 3], ["#6a4125", 2.5], ["#8c4a28", 1.5], ["#e2bf6c", 1], ["#8d9096", 2], ["#d8d8d8", 0.8], ["#a33e28", 0.8],
];
const EYES = [["#4a2e1e", 4], ["#2e5f92", 2], ["#3d7f4d", 1.5], ["#7a5a28", 1.5], ["#59616f", 1], ["#7b3f92", 0.35], ["#b0302f", 0.2]];
const UNIFORM = ["#263a66", "#1c2540", "#334556", "#2c4656", "#5a1f2c", "#3b2a50", "#2b4734", "#4a3a2a"];
const TEACHER_CLOTHES = ["#6b5a45", "#4b3621", "#5c3d2e", "#3d4a2b", "#565b66", "#6b2737", "#2d4d4d", "#3b3f58"];
const CASUAL = ["#6b7a8f", "#8f3b3b", "#3b6b8f", "#555a60", "#7a6a4f", "#4f7a5a", "#8a6a9f", "#c47a2c"];
const TRACK = ["#2e6bd6", "#d24848", "#34945a", "#e0a030", "#7a4fd6"];
const ACCENT = ["#d64545", "#e0a536", "#4caf7d", "#3fa7d6", "#8e44ad", "#e27fa8", "#f0f0f0"];
const PANTS = ["#22242c", "#2b2f3a", "#3a3f4b", "#5a4a3a", "#26384f", "#4a4f58"];
const SKIRTS = ["#3a3f58", "#5a2a2a", "#2f4f3f", "#2b2f3a"];
const SHOES = [["#161416", 3], ["#3b2a1e", 2], ["#e9e9e9", 1.5], ["#7a2222", 0.8], ["#2e4a7a", 0.6]];
const SOCKS = ["#ececec", "#232326", "#26384f"];
const HATS = ["#d64545", "#2e6bd6", "#e0a536", "#34945a", "#262626", "#e27fa8", "#7a4fd6"];
const GLASSES = ["#1d1418", "#6b3f22", "#b03030", "#c9a227", "#2e5f92"];
const WHITE = "#eceff3";

// ---------- deterministic randomness ----------

function hashStr(str, salt) {
  let h = 2166136261;
  const s = `${str}::${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}
const roll = (seed, salt) => (hashStr(seed, salt) % 10000) / 10000;
const pick = (arr, seed, salt) => arr[hashStr(seed, salt) % arr.length];
function wpick(pairs, seed, salt) {
  const total = pairs.reduce((sum, [, w]) => sum + w, 0);
  let r = roll(seed, salt) * total;
  for (const [value, w] of pairs) if ((r -= w) < 0) return value;
  return pairs[pairs.length - 1][0];
}

// ---------- color helpers ----------

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}
export function mix(a, b, t) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex(A.map((v, i) => v + (B[i] - v) * t));
}
export const shadowOf = (c) => mix(c, "#2a1f3d", 0.32);
export const lightOf = (c) => mix(c, "#fff4dc", 0.28);
export const outlineOf = (c) => mix(c, "#120c18", 0.75);
function grayOf(c) {
  const [r, g, b] = toRgb(c);
  const v = (r * 0.3 + g * 0.59 + b * 0.11) * 0.8;
  return toHex([v, v, v * 1.05]);
}

// ---------- grid ----------

class Grid {
  constructor() {
    this.cells = Array.from({ length: H }, () => Array(W).fill(null));
  }
  get(x, y) {
    return x >= 0 && x < W && y >= 0 && y < H ? this.cells[y][x] : null;
  }
  set(x, y, k) {
    if (x >= 0 && x < W && y >= 0 && y < H) this.cells[y][x] = k;
  }
  rect(x0, y0, x1, y1, k) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, k);
  }
  // Only paints over cells that currently hold one of `onto` (e.g. brows only on bare skin).
  paintOnto(points, k, onto) {
    for (const [x, y] of points) if (onto.includes(this.get(x, y))) this.set(x, y, k);
  }
  points(points, k) {
    for (const [x, y] of points) this.set(x, y, k);
  }
  // A 16-wide '#'/'.' mask across the head (x 8..23) on row y.
  mask(y, m, k) {
    for (let i = 0; i < m.length; i++) if (m[i] === "#") this.set(8 + i, y, k);
  }
}

// ---------- body parts ----------

const HEAD = { x0: 8, y0: 4, x1: 23, y1: 18 };

function drawHead(g, chin) {
  g.rect(HEAD.x0, HEAD.y0, HEAD.x1, HEAD.y1, "s");
  // rounded crown
  g.points([[8, 4], [9, 4], [8, 5], [23, 4], [22, 4], [23, 5]], null);
  // jaw: a staircase off each bottom corner — deeper reads as a pointier chin
  for (let i = 0; i < chin; i++) {
    for (let x = 0; x < chin - i; x++) {
      g.set(HEAD.x0 + x, HEAD.y1 - i, null);
      g.set(HEAD.x1 - x, HEAD.y1 - i, null);
    }
  }
  g.points([[7, 11], [7, 12], [7, 13], [24, 11], [24, 12], [24, 13]], "s"); // ears
  g.points([[7, 12], [24, 12]], "S");
  g.rect(14, 19, 17, 20, "s"); // neck
  g.rect(14, 19, 17, 19, "S"); // shadow under the chin
}

const EYE_STYLES = {
  big: { L: ["ee", "wi", "ii"], R: ["ee", "wi", "ii"] },
  gentle: { L: ["..", "ee", "ii"], R: ["..", "ee", "ii"] },
  sharp: { L: ["e.", "ee", "ii"], R: [".e", "ee", "ii"] },
  closed: { L: ["..", "..", "ee"], R: ["..", "..", "ee"] },
  dot: { L: ["..", ".e", ".e"], R: ["..", "e.", "e."] },
};
function drawEyes(g, style) {
  const s = EYE_STYLES[style];
  for (const [ox, rows] of [[11, s.L], [19, s.R]]) {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < 2; dx++) if (row[dx] !== ".") g.set(ox + dx, 10 + dy, row[dx]);
    });
  }
}

const BROWS = {
  flat: [[11, 9], [12, 9], [19, 9], [20, 9]],
  thick: [[10, 9], [11, 9], [12, 9], [19, 9], [20, 9], [21, 9]],
  worried: [[11, 9], [12, 8], [19, 8], [20, 9]],
  fierce: [[11, 8], [12, 9], [19, 9], [20, 8]],
};

const MOUTHS = {
  smile: { m: [[14, 15], [17, 15], [15, 16], [16, 16]] },
  small: { m: [[15, 16], [16, 16]] },
  open: { m: [[15, 15], [16, 15]], q: [[15, 16], [16, 16]] },
  grin: { m: [[14, 15], [17, 15], [15, 16], [16, 16]], w: [[15, 15], [16, 15]] },
  smirk: { m: [[15, 16], [16, 16], [17, 15]] },
  flat: { m: [[14, 16], [15, 16], [16, 16], [17, 16]] },
};
function drawMouth(g, style) {
  const m = MOUTHS[style];
  g.points(m.m, "m");
  if (m.q) g.points(m.q, "q");
  if (m.w) g.points(m.w, "w");
}

function drawFacialHair(g, kind) {
  if (kind === "mustache") g.points([[14, 15], [15, 15], [16, 15], [17, 15]], "h");
  if (kind === "beard") {
    const pts = [];
    for (let y = 15; y <= 18; y++) for (let x = 8; x <= 23; x++) if (!(y >= 15 && y <= 16 && x >= 15 && x <= 16)) pts.push([x, y]);
    g.paintOnto(pts, "h", ["s", "S", "k"]);
    g.paintOnto([[14, 15], [15, 15], [16, 15], [17, 15]], "h", ["s", "m"]);
  }
  if (kind === "stubble") g.paintOnto([[11, 16], [13, 17], [15, 17], [17, 17], [19, 16], [12, 15], [20, 15]], "S", ["s"]);
}

// ----- hair -----

function hairDome(g) {
  g.rect(11, 2, 20, 2, "h");
  g.rect(9, 3, 22, 3, "h");
  g.rect(8, 4, 23, 4, "h");
  g.rect(7, 5, 24, 7, "h");
}
function hairSides(g, yEnd) {
  g.rect(7, 8, 8, yEnd, "h");
  g.rect(23, 8, 24, yEnd, "h");
}

const HAIR_FRONT = {
  parted(g, side) {
    hairDome(g);
    g.mask(8, "#######..#######", "h");
    g.mask(9, "###..........###", "h");
    hairSides(g, side);
  },
  hime(g, side) {
    hairDome(g);
    g.mask(8, "################", "h");
    g.mask(9, "################", "h");
    hairSides(g, side);
    g.rect(9, 10, 9, side, "h");
    g.rect(22, 10, 22, side, "h");
  },
  swept(g, side) {
    hairDome(g);
    g.mask(8, "..##############", "h");
    g.mask(9, "......##########", "h");
    hairSides(g, side);
  },
  messy(g, side) {
    hairDome(g);
    g.points([[12, 1], [13, 1], [18, 1], [6, 6]], "h");
    g.mask(8, "################", "h");
    g.mask(9, "#.##.#..##.#.###", "h");
    hairSides(g, side);
  },
  spiky(g, side) {
    hairDome(g);
    g.points([[10, 1], [11, 1], [11, 0], [15, 1], [16, 1], [15, 0], [20, 1], [21, 1], [20, 0], [6, 5], [6, 6], [25, 5], [25, 6]], "h");
    g.mask(8, "################", "h");
    g.mask(9, "#..#...##...#..#", "h");
    hairSides(g, side);
  },
  buzz(g) {
    g.rect(10, 3, 21, 3, "h");
    g.rect(8, 4, 23, 6, "h");
    g.points([[8, 7], [8, 8], [23, 7], [23, 8]], "h");
  },
  curly(g) {
    g.rect(12, 0, 19, 0, "h");
    g.rect(9, 1, 22, 1, "h");
    g.rect(6, 2, 25, 8, "h");
    g.points([[6, 2], [25, 2], [6, 5], [25, 4], [6, 8], [25, 7], [9, 0], [22, 0]], null);
    g.points([[10, 0], [21, 0]], "h");
    g.mask(9, "#.#.#.#.#.#.#.#.", "h");
    g.rect(6, 9, 8, 13, "h");
    g.rect(23, 9, 25, 13, "h");
    g.points([[6, 13], [25, 13], [6, 10], [25, 11]], null);
  },
  mohawk(g) {
    g.paintOnto([...Array(6)].flatMap((_, i) => [[8 + i, 5], [8 + i, 6], [8 + i, 7], [18 + i, 5], [18 + i, 6], [18 + i, 7]]), "S", ["s"]);
    g.rect(14, 0, 17, 8, "h");
  },
  bald(g) {
    g.rect(7, 7, 8, 12, "h");
    g.rect(23, 7, 24, 12, "h");
  },
};

const HAIR_BACK = {
  none() {},
  long(g) {
    g.rect(6, 5, 25, 27, "h");
    g.rect(5, 12, 5, 26, "h");
    g.rect(26, 12, 26, 26, "h");
    g.points([[5, 26], [26, 26], [6, 27], [25, 27]], null);
  },
  wavy(g) {
    HAIR_BACK.long(g);
    for (let y = 12; y <= 27; y++) {
      const out = Math.floor(y / 2) % 2 === 0;
      g.set(4, y, out && y < 26 ? "h" : null);
      g.set(27, y, !out && y < 26 ? "h" : null);
    }
    g.points([[8, 28], [12, 28], [19, 28], [23, 28]], "h");
  },
  bob(g) {
    g.rect(6, 5, 25, 16, "h");
    g.rect(5, 9, 5, 15, "h");
    g.rect(26, 9, 26, 15, "h");
    g.points([[5, 15], [26, 15], [6, 16], [25, 16]], null);
  },
  twintails(g) {
    // left tail hangs from x4-5 near the head and widens out to x2-5; the right mirrors it
    g.rect(4, 9, 5, 10, "h");
    g.rect(2, 11, 5, 18, "h");
    g.rect(3, 19, 4, 20, "h");
    g.set(3, 21, "h");
    g.rect(26, 9, 27, 10, "h");
    g.rect(26, 11, 29, 18, "h");
    g.rect(27, 19, 28, 20, "h");
    g.set(28, 21, "h");
    g.points([[6, 8], [6, 9], [25, 8], [25, 9]], "a");
  },
  ponytail(g) {
    g.rect(24, 6, 27, 9, "h");
    g.rect(25, 10, 28, 16, "h");
    g.rect(26, 17, 27, 19, "h");
    g.points([[24, 7], [24, 8]], "a");
  },
  bun(g) {
    g.rect(13, 0, 18, 2, "h");
    g.points([[13, 0], [18, 0]], null);
  },
};

// Bundled front + back looks, weighted by gender. `side` is how far the side locks fall.
const HAIR_PRESETS = {
  neat: { front: "parted", back: "none", side: 11, w: { M: 4, F: 0.8 } },
  swept: { front: "swept", back: "none", side: 11, w: { M: 3, F: 1 } },
  messy: { front: "messy", back: "none", side: 11, w: { M: 3, F: 1 } },
  spiky: { front: "spiky", back: "none", side: 11, w: { M: 2.5, F: 0.4 }, youthful: true },
  buzz: { front: "buzz", back: "none", w: { M: 1.5, F: 0.3 } },
  curly: { front: "curly", back: "none", w: { M: 1.5, F: 1.5 } },
  mohawk: { front: "mohawk", back: "none", w: { M: 0.5, F: 0.2 }, youthful: true },
  bob: { front: "hime", back: "bob", side: 15, w: { M: 0.3, F: 3 } },
  long: { front: "parted", back: "long", side: 14, w: { M: 0.4, F: 3 } },
  hime: { front: "hime", back: "long", side: 14, w: { M: 0, F: 2 } },
  wavy: { front: "messy", back: "wavy", side: 14, w: { M: 0.3, F: 2 } },
  twintails: { front: "parted", back: "twintails", side: 11, w: { M: 0, F: 2.2 }, youthful: true },
  ponytail: { front: "swept", back: "ponytail", side: 11, w: { M: 0.5, F: 2.5 } },
  bun: { front: "parted", back: "bun", side: 11, w: { M: 0.3, F: 1.5 } },
  balding: { front: "bald", back: "none", w: { M: 1.5, F: 0 }, teacherOnly: true },
};

// ----- clothes -----

function drawTorso(g) {
  g.rect(9, 21, 22, 30, "u");
  g.points([[9, 21], [22, 21]], null);
  g.rect(6, 22, 8, 28, "l");
  g.rect(23, 22, 25, 28, "l");
  g.points([[6, 22], [25, 22]], null);
  g.rect(6, 29, 8, 30, "s");
  g.rect(23, 29, 25, 30, "s");
  g.points([[6, 30], [25, 30]], null);
}

function shirtV(g) {
  g.rect(13, 21, 18, 21, "c");
  g.rect(14, 22, 17, 22, "c");
  g.rect(15, 23, 16, 23, "c");
}

const OUTFITS = {
  blazer(g) {
    shirtV(g);
    g.rect(15, 22, 16, 27, "a");
    g.points([[13, 22], [14, 23], [14, 24], [18, 22], [17, 23], [17, 24]], "U");
    g.points([[10, 27], [11, 27], [12, 27], [19, 27], [20, 27], [21, 27]], "U");
  },
  suit(g) {
    OUTFITS.blazer(g);
    g.points([[14, 26], [14, 28]], "y");
  },
  gakuran(g) {
    g.rect(12, 21, 19, 22, "U");
    g.rect(16, 23, 16, 30, "U");
    g.points([[15, 24], [15, 26], [15, 28]], "y");
  },
  sailor(g) {
    g.rect(9, 21, 22, 30, "c");
    g.points([[9, 21], [22, 21]], null);
    g.rect(9, 21, 13, 23, "u");
    g.rect(18, 21, 22, 23, "u");
    g.points([[14, 21], [17, 21]], "u");
    g.rect(9, 22, 12, 22, "v");
    g.rect(19, 22, 22, 22, "v");
    g.rect(14, 22, 17, 23, "a");
    g.points([[15, 24], [16, 24], [14, 25], [17, 25]], "a");
    g.rect(6, 28, 8, 28, "u");
    g.rect(23, 28, 25, 28, "u");
  },
  vest(g) {
    shirtV(g);
    g.rect(15, 22, 16, 25, "a");
    g.rect(9, 30, 22, 30, "U");
    g.points([[12, 26], [19, 26], [11, 27], [13, 27], [18, 27], [20, 27], [12, 28], [19, 28]], "v");
  },
  hoodie(g) {
    g.rect(10, 20, 21, 21, "U");
    g.points([[14, 22], [14, 23], [14, 24], [17, 22], [17, 23], [17, 24]], "c");
    g.rect(11, 27, 20, 28, "U");
  },
  track(g) {
    g.rect(13, 21, 18, 21, "U");
    g.rect(15, 21, 15, 30, "v");
    g.rect(7, 23, 7, 28, "v");
    g.rect(24, 23, 24, 28, "v");
  },
  tracksuit(g) {
    OUTFITS.track(g);
    g.points([[12, 21], [12, 22], [12, 23]], "a");
    g.points([[12, 24], [13, 24], [12, 25], [13, 25]], "y");
  },
  varsity(g) {
    g.rect(12, 21, 19, 21, "v");
    g.rect(9, 30, 22, 30, "v");
    g.rect(11, 23, 12, 25, "a");
    g.points([[15, 23], [15, 25], [15, 27]], "y");
  },
  cardigan(g) {
    g.rect(13, 21, 18, 21, "c");
    g.points([[14, 22], [17, 22]], "c");
    g.rect(16, 22, 16, 30, "U");
    g.points([[15, 23], [15, 25], [15, 27], [15, 29]], "y");
  },
  labcoat(g) {
    g.rect(9, 21, 22, 30, "c");
    g.points([[9, 21], [22, 21]], null);
    g.rect(14, 21, 17, 22, "u");
    g.rect(15, 22, 16, 25, "a");
    g.points([[13, 21], [13, 22], [14, 23], [14, 24], [18, 21], [18, 22], [17, 23], [17, 24]], "C");
    g.rect(19, 26, 21, 26, "C");
    g.set(20, 25, "a");
  },
};

function drawLower(g, lower) {
  if (lower === "skirt") {
    g.rect(9, 31, 22, 32, "p");
    g.rect(8, 33, 23, 33, "p");
    g.points([[11, 32], [14, 32], [17, 32], [20, 32], [10, 33], [13, 33], [16, 33], [19, 33], [22, 33]], "P");
    g.rect(11, 34, 13, 34, "s");
    g.rect(18, 34, 20, 34, "s");
    g.rect(11, 35, 13, 36, "x");
    g.rect(18, 35, 20, 36, "x");
    g.rect(10, 37, 14, 38, "f");
    g.rect(17, 37, 21, 38, "f");
  } else {
    g.rect(10, 31, 21, 32, "p");
    g.rect(10, 33, 14, 36, "p");
    g.rect(17, 33, 21, 36, "p");
    g.rect(9, 37, 14, 38, "f");
    g.rect(17, 37, 22, 38, "f");
    g.points([[9, 37], [22, 37]], null);
  }
}

// ----- accessories -----

function drawGlasses(g, round) {
  for (const x0 of [10, 18]) {
    g.rect(x0, 9, x0 + 3, 9, "g");
    g.rect(x0, 13, x0 + 3, 13, "g");
    g.rect(x0, 10, x0, 12, "g");
    g.rect(x0 + 3, 10, x0 + 3, 12, "g");
    if (round) g.points([[x0, 9], [x0 + 3, 9], [x0, 13], [x0 + 3, 13]], "s");
  }
  g.rect(14, 10, 17, 10, "g");
  g.paintOnto([[8, 10], [9, 10], [22, 10], [23, 10]], "g", ["s"]);
}

const HATS_DRAW = {
  beanie(g) {
    g.rect(7, 1, 24, 6, "r");
    g.points([[7, 1], [8, 1], [7, 2], [24, 1], [23, 1], [24, 2]], null);
    g.rect(7, 6, 24, 7, "R");
    g.rect(15, 0, 16, 0, "a");
  },
  cap(g) {
    g.rect(8, 2, 23, 6, "r");
    g.points([[8, 2], [23, 2]], null);
    g.rect(6, 7, 25, 7, "R");
    g.rect(15, 1, 16, 1, "R");
    g.rect(15, 4, 16, 4, "a");
  },
};

const HAIR_ACCESSORIES = {
  bow(g) {
    // sits on the hair at the top-right, where the dome is widest, so it doesn't float
    g.points([[19, 4], [19, 5], [19, 6], [20, 5], [22, 5], [23, 4], [23, 5], [23, 6]], "a");
    g.set(21, 5, "A");
  },
  clip(g) {
    g.points([[19, 7], [20, 7], [21, 7], [20, 6]], "a");
  },
  headband(g) {
    g.rect(8, 5, 23, 5, "a");
    g.points([[7, 6], [24, 6]], "a");
  },
  flower(g) {
    g.points([[20, 4], [22, 4], [21, 3], [21, 5]], "a");
    g.set(21, 4, "y");
  },
};

function drawInjury(g, level, hatted) {
  g.rect(19, 13, 21, 14, "d");
  g.points([[20, 13], [20, 14]], "D");
  if (level >= 2 && !hatted) {
    g.rect(7, 6, 24, 7, "d");
    g.points([[10, 6], [11, 7], [15, 6], [16, 7], [20, 6], [21, 7]], "D");
    g.points([[18, 6], [19, 6]], "z");
  }
}

// ---------- appearance ----------

function appearance(c) {
  const seed = c.spriteSeed || c.id;
  const isTeacher = c.role === "teacher";
  const sex = c.gender === "F" ? "F" : "M";

  const presets = Object.entries(HAIR_PRESETS)
    .filter(([, p]) => isTeacher || !p.teacherOnly)
    .map(([name, p]) => [name, p.w[sex] * (isTeacher && p.youthful ? 0.25 : 1)])
    .filter(([, w]) => w > 0);
  const hair = HAIR_PRESETS[wpick(presets, seed, "hair")];

  let outfit;
  if (isTeacher) {
    const subj = c.teachSubject;
    outfit = subj === "PE" || subj === "Gymnastics" ? "tracksuit" : subj === "Biology" || subj === "Physics" ? "labcoat" : wpick([["suit", 2], ["cardigan", 2]], seed, "outfit");
  } else {
    outfit = wpick(
      sex === "F"
        ? [["sailor", 3], ["blazer", 2], ["vest", 2], ["hoodie", 1.2], ["track", 0.8], ["varsity", 1]]
        : [["gakuran", 3], ["blazer", 2], ["vest", 1.5], ["hoodie", 2], ["track", 1.2], ["varsity", 1.2]],
      seed,
      "outfit"
    );
  }

  const skirtChance = isTeacher ? (outfit === "tracksuit" || outfit === "labcoat" ? 0 : 0.4) : outfit === "sailor" ? 0.9 : 0.6;
  const lower = sex === "F" && roll(seed, "lower") < skirtChance ? "skirt" : "pants";

  const main =
    outfit === "tracksuit" || outfit === "track" ? pick(TRACK, seed, "main")
    : outfit === "hoodie" || outfit === "varsity" ? pick(CASUAL, seed, "main")
    : isTeacher ? pick(TEACHER_CLOTHES, seed, "main")
    : pick(UNIFORM, seed, "main");
  const sleeve = outfit === "sailor" || outfit === "vest" || outfit === "labcoat" ? WHITE : outfit === "varsity" ? "#efe6d2" : main;
  const trim = outfit === "varsity" ? "#efe6d2" : "#f4f4f4";

  const hatKind = roll(seed, "hat") < (isTeacher ? (outfit === "labcoat" ? 0 : 0.06) : 0.12) ? pick(["beanie", "cap"], seed, "hatkind") : null;
  const hairAcc = !hatKind && roll(seed, "hairacc") < (sex === "F" ? 0.45 : 0.06) ? wpick([["bow", sex === "F" ? 3 : 0.2], ["clip", 2], ["headband", 1.5], ["flower", sex === "F" ? 1.5 : 0]], seed, "hairacckind") : null;

  return {
    skin: wpick(SKIN, seed, "skin"),
    hairColor: wpick(isTeacher ? HAIR_TEACHER : HAIR_STUDENT, seed, "haircolor"),
    eyeColor: wpick(EYES, seed, "eyecolor"),
    hair,
    chin: pick([3, 3, 4], seed, "chin"),
    eyes: wpick([["big", 3.5], ["gentle", 2.5], ["sharp", 2], ["closed", 0.8], ["dot", 1.2]], seed, "eyes"),
    brows: wpick([["flat", 3], ["thick", 1.5], ["worried", 1], ["fierce", 1.2]], seed, "brows"),
    mouth: wpick([["smile", 3], ["small", 3], ["open", 1], ["grin", 1.2], ["smirk", 1.2], ["flat", 1]], seed, "mouth"),
    blush: roll(seed, "blush") < (sex === "F" ? 0.55 : 0.25),
    freckles: roll(seed, "freckles") < 0.18,
    facialHair: sex === "M" ? (isTeacher ? (roll(seed, "fh") < 0.5 ? pick(["mustache", "beard", "stubble"], seed, "fhkind") : null) : roll(seed, "fh") < 0.04 ? "stubble" : null) : null,
    glasses: roll(seed, "glasses") < (isTeacher ? 0.45 : 0.2) ? { color: pick(GLASSES, seed, "glasscolor"), round: roll(seed, "round") < 0.5 } : null,
    outfit,
    lower,
    main,
    sleeve,
    trim,
    accent: pick(ACCENT, seed, "accent"),
    pants: lower === "skirt" && outfit === "sailor" ? main : lower === "skirt" ? pick(SKIRTS, seed, "skirt") : pick(PANTS, seed, "pants"),
    socks: pick(SOCKS, seed, "socks"),
    shoes: wpick(SHOES, seed, "shoes"),
    hatKind,
    hatColor: pick(HATS, seed, "hatcolor"),
    hairAcc,
  };
}

// ---------- rendering ----------

const GROUP = {
  s: "skin", S: "skin", e: "skin", i: "skin", w: "skin", b: "skin", m: "skin", q: "skin", k: "skin", g: "skin", d: "skin", D: "skin", z: "skin",
  h: "hair", j: "hair",
  u: "body", U: "body", c: "body", C: "body", a: "body", A: "body", y: "body", v: "body",
  l: "sleeve",
  p: "legs", P: "legs", x: "legs",
  f: "shoes",
  r: "hat", R: "hat",
  t: "fx",
};
const RIM_SHADED = new Set(["s", "h", "u", "l", "p", "f", "r", "c"]);

function build(c, injury) {
  const look = appearance(c);
  const dead = !c.alive;
  if (dead) {
    look.eyes = "closed";
    look.mouth = "flat";
  }
  const g = new Grid();

  HAIR_BACK[look.hair.back](g);
  drawLower(g, look.lower);
  drawTorso(g);
  OUTFITS[look.outfit](g);
  if (look.outfit === "labcoat") {
    g.rect(9, 31, 14, 33, "c");
    g.rect(17, 31, 22, 33, "c");
  }
  drawHead(g, look.chin);

  g.paintOnto(BROWS[look.brows], "b", ["s"]);
  drawEyes(g, look.eyes);
  g.set(16, 14, "S");
  drawMouth(g, look.facialHair === "mustache" ? "small" : look.mouth);
  if (look.blush) g.points([[10, 14], [11, 14], [20, 14], [21, 14]], "k");
  if (look.freckles) g.paintOnto([[10, 13], [12, 13], [11, 14], [19, 13], [21, 13], [20, 14]], "S", ["s", "k"]);
  if (look.facialHair) drawFacialHair(g, look.facialHair);

  HAIR_FRONT[look.hair.front](g, look.hair.side || 11);
  if (!look.hatKind) g.paintOnto([[10, 4], [11, 4], [12, 3], [13, 3], [11, 5]], "j", ["h"]);

  if (look.glasses) drawGlasses(g, look.glasses.round);
  if (look.hatKind) HATS_DRAW[look.hatKind](g);
  else if (look.hairAcc) HAIR_ACCESSORIES[look.hairAcc](g);
  if (injury && !dead) drawInjury(g, injury, !!look.hatKind);
  if (c.legendary && !dead) g.points([[27, 1], [26, 2], [27, 2], [28, 2], [27, 3]], "t");

  const base = {
    s: look.skin, S: shadowOf(look.skin),
    e: "#1d1418", i: look.eyeColor, w: "#ffffff",
    b: mix(look.hairColor, "#140c10", 0.45),
    m: "#7a2f3a", q: "#d96b78",
    k: mix(look.skin, "#ee5f7e", 0.4),
    h: look.hairColor, j: lightOf(lightOf(look.hairColor)),
    u: look.main, U: shadowOf(look.main), l: look.sleeve,
    c: WHITE, C: shadowOf(WHITE), v: look.trim,
    a: look.accent, A: shadowOf(look.accent), y: "#e8c14a",
    p: look.pants, P: shadowOf(look.pants), x: look.socks,
    f: look.shoes,
    g: look.glasses ? look.glasses.color : "#1d1418",
    r: look.hatColor, R: shadowOf(look.hatColor),
    d: "#f2dcb5", D: "#d6b688", z: "#b3261e",
    t: "#ffe27a",
  };

  // Rim shading: light from the top-left. Skin right under the fringe gets the hair's shadow; hair
  // and clothes turn into shadow over two pixels on the right, so they look round, and the hair has
  // a soft sheen across the crown.
  const groupAt = (x, y) => GROUP[g.get(x, y)] || null;
  const color = Array.from({ length: H }, () => Array(W).fill(null));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = g.get(x, y);
      if (!k) continue;
      let col = base[k];
      if (RIM_SHADED.has(k)) {
        const grp = GROUP[k];
        if (k === "s" && groupAt(x, y - 1) === "hair") col = shadowOf(col);
        else if (groupAt(x + 1, y) !== grp || groupAt(x, y + 1) !== grp) col = shadowOf(col);
        else if (groupAt(x - 1, y) !== grp || groupAt(x, y - 1) !== grp) col = lightOf(col);
        else if (k !== "s" && groupAt(x + 2, y) !== grp) col = mix(col, shadowOf(col), 0.5);
        else if (k === "h" && y >= 2 && y <= 5 && x >= 12 && x <= 19 && Math.abs(x - 15.5 - (y - 3.5) * 1.5) < 2.2) col = mix(col, lightOf(col), 0.6);
      }
      color[y][x] = col;
    }
  }

  // Outline every empty pixel touching the figure, tinted by what it's outlining.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g.get(x, y)) continue;
      const touching = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => g.get(x + dx, y + dy) && color[y + dy][x + dx]).find(Boolean);
      if (touching) color[y][x] = c.legendary && !dead ? "#c9971c" : outlineOf(touching);
    }
  }

  // Run-length encode each row into as few rects as possible.
  let rects = "";
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      let col = color[y][x];
      if (!col) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < W && color[y][x + run] === col) run++;
      if (dead) col = grayOf(col);
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${col}"/>`;
      x += run;
    }
  }
  return rects;
}

// Sprites are pure functions of these fields, and the UI redraws a lot of them (the night battle
// re-renders every tick, a full school shows hundreds), so each is drawn once into an image (a
// data URI) and every portrait is just an <svg> holding that one <image> — two elements on the page
// instead of hundreds of pixel rects.
const cache = new Map();

export function characterSprite(c, sizePx = 112) {
  const ratio = c.maxHp ? c.hp / c.maxHp : 1;
  const injury = c.alive ? (ratio < 0.25 ? 2 : ratio < 0.5 ? 1 : 0) : 0;
  const key = [c.spriteSeed || c.id, c.role, c.gender, c.teachSubject || "", c.alive ? 1 : 0, injury, c.legendary ? 1 : 0].join("|");
  let uri = cache.get(key);
  if (!uri) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">${build(c, injury)}</svg>`;
    uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    cache.set(key, uri);
  }
  const h = Math.round(sizePx * (H / W));
  return `<svg viewBox="0 0 ${W} ${H}" width="${sizePx}" height="${h}" xmlns="http://www.w3.org/2000/svg"><image href="${uri}" width="${W}" height="${H}" style="image-rendering:pixelated"/></svg>`;
}
