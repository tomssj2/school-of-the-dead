// Pixel-art zombies in the same 32x40 chibi style as the character sprites (sprite.js): the same
// big head, the same light from the top-left and the same dark outline — but grey-green skin,
// sunken glowing eyes and a jaw full of teeth. Every kind has its own silhouette so a fight
// reads at a glance: a walker shambling with one arm out, a runner leaning into a sprint, a
// brute in football pads, a bloated spitter, a screamer with its arms in the air, the boss in a
// suit — and the raid bosses in their uniforms. They face left, toward whoever they're fighting.

import { shadowOf, lightOf, outlineOf, mix } from "./sprite.js";

const W = 32;
const H = 40;

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
  points(pts, k) {
    for (const [x, y] of pts) this.set(x, y, k);
  }
  onto(pts, k, keys) {
    for (const [x, y] of pts) if (keys.includes(this.get(x, y))) this.set(x, y, k);
  }
}

// ---------- the looks ----------
// `frame` is the body (FRAMES below), the rest are its colours and extras.
const LOOKS = {
  walker: { frame: "shamble", skin: "#9fb38a", hair: "#4a3a2a", hairStyle: "messy", shirt: "#6b7a8f", pants: "#3e4f6a", shoes: "#2a2420", eyes: "#ff5a3a", neck: "tee", bareFoot: true },
  runner: { frame: "runner", skin: "#93b27e", hair: "#6b4a2f", hairStyle: "short", shirt: "#3f6fb5", pants: "#2a3a6a", shoes: "#e8e8e8", eyes: "#ff5a3a", stripe: "#f4f4f4", band: "#d64545" },
  jersey: { frame: "brute", skin: "#87a672", hair: "#2a2020", shirt: "#b03030", pants: "#c9ccd2", shoes: "#1e1e22", eyes: "#f4d35e", helmet: "#b03030", number: "#f4f4f4", stripe: "#b03030" },
  spitter: { frame: "bloated", skin: "#b0bf5a", shirt: "#cfc6a0", pants: "#4a5a30", shoes: "#2a2420", eyes: "#d0ff40", drool: "#c8f050" },
  screamer: { frame: "screamer", skin: "#b4bfa6", hair: "#9a958a", shirt: "#7a4a8a", pants: "#34343f", shoes: "#2a2420", eyes: "#ffffff", strings: "#e8e0f0" },
  boss: { frame: "brute", skin: "#7f9e6c", hair: "#1a1a1a", hairStyle: "combover", shirt: "#2e3140", pants: "#23252f", shoes: "#141416", eyes: "#ff2a2a", suit: true, tie: "#b02030" },
  // the raid bosses and the rooms' zombies
  soldier: { frame: "shamble", skin: "#8fae7a", shirt: "#5a6a3a", pants: "#4a5a30", shoes: "#2a2420", eyes: "#ff3b3b", camo: ["#4a5a2e", "#6b7a45"], helmet: "#465533" },
  labcoat: { frame: "shamble", skin: "#a9b89a", hair: "#8a8e96", hairStyle: "messy", shirt: "#6b8fb0", pants: "#3a3f48", shoes: "#2a2420", eyes: "#c07fff", coat: "#e4eaec", goggles: "#9fd8f0", stitches: true },
  guard: { frame: "brute", skin: "#8fae7a", shirt: "#2c3e6b", pants: "#23252f", shoes: "#141416", eyes: "#ff3b3b", cap: "#1e2a4a", badge: "#f2c14e", tie: "#1e2a4a" },
  surgeon: { frame: "shamble", skin: "#a3b88e", shirt: "#4a9a8a", pants: "#3a7a6a", shoes: "#e8e8e8", eyes: "#ff5a3a", coat: "#8ac8b8", cap: "#5ab0a0", mask: "#cfe6ee", gloves: "#cfe6ee" },
};

// Which look each kind of zombie in the night horde wears, and how big it's drawn.
export const HORDE_LOOK = {
  walker: { look: "walker", scale: 1 },
  runner: { look: "runner", scale: 0.95 },
  brute: { look: "jersey", scale: 1.2 },
  spitter: { look: "spitter", scale: 1 },
  screamer: { look: "screamer", scale: 0.95 },
  boss: { look: "boss", scale: 1.35 },
};
export const hordeSprite = (type, sizePx) => {
  const h = HORDE_LOOK[type] || HORDE_LOOK.walker;
  return zombieSprite(h.look, Math.round(sizePx * h.scale));
};

// ---------- parts ----------

const shift = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// The head — the same big round chibi head as the students — its ears and neck.
function head(g, dx = 0, dy = 0) {
  g.rect(8 + dx, 4 + dy, 23 + dx, 18 + dy, "s");
  g.points(shift([[8, 4], [9, 4], [8, 5], [23, 4], [22, 4], [23, 5]], dx, dy), null);
  for (let i = 0; i < 2; i++) for (let x = 0; x < 2 - i; x++) {
    g.set(8 + dx + x, 18 + dy - i, null);
    g.set(23 + dx - x, 18 + dy - i, null);
  }
  g.points(shift([[7, 11], [7, 12], [7, 13], [24, 11], [24, 12], [24, 13]], dx, dy), "s");
  g.points(shift([[7, 12], [24, 12]], dx, dy), "S");
  g.rect(14 + dx, 19 + dy, 17 + dx, 20 + dy, "s");
  g.rect(14 + dx, 19 + dy, 17 + dx, 19 + dy, "S");
}

// Sunken sockets with a glint looking left, the right one drooping; a slack jaw full of teeth;
// mottled skin and a bite on the cheek.
function face(g, dx, dy, { mouth = "jaw", brows = "heavy" } = {}) {
  g.rect(11 + dx, 10 + dy, 12 + dx, 12 + dy, "e");
  g.rect(19 + dx, 11 + dy, 20 + dx, 13 + dy, "e");
  g.points(shift([[11, 11], [19, 12]], dx, dy), "i");
  g.points(shift([[12, 10], [20, 11]], dx, dy), "E"); // a dim edge of the glow
  if (brows === "heavy") g.points(shift([[10, 9], [11, 9], [12, 9], [19, 10], [20, 10], [21, 10]], dx, dy), "S");
  if (mouth === "jaw") {
    g.rect(13 + dx, 15 + dy, 17 + dx, 16 + dy, "m");
    g.rect(14 + dx, 17 + dy, 16 + dx, 17 + dy, "m");
    g.points(shift([[13, 15], [15, 15], [17, 15], [14, 17], [16, 17]], dx, dy), "t");
  }
  if (mouth === "scream") {
    g.rect(13 + dx, 12 + dy, 18 + dx, 17 + dy, "m");
    g.points(shift([[13, 12], [18, 12], [13, 17], [18, 17]], dx, dy), "s");
    g.points(shift([[14, 12], [16, 12], [17, 12], [15, 17], [17, 17]], dx, dy), "t");
    g.rect(15 + dx, 14 + dy, 16 + dx, 15 + dy, "M"); // the throat
  }
  g.points(shift([[10, 6], [21, 7], [9, 15], [22, 16], [12, 7]], dx, dy), "S");
  g.points(shift([[21, 14], [22, 14], [21, 15]], dx, dy), "w");
}

function hair(g, look, dx, dy) {
  const style = look.hairStyle;
  if (!look.hair || !style) return;
  if (style === "messy") {
    g.rect(10 + dx, 2 + dy, 21 + dx, 3 + dy, "h");
    g.rect(8 + dx, 4 + dy, 23 + dx, 6 + dy, "h");
    g.points(shift([[7, 5], [7, 6], [24, 5], [24, 6], [7, 7], [24, 7], [24, 8], [8, 7], [9, 7], [13, 7], [18, 7], [22, 7], [23, 7], [12, 1], [17, 1]], dx, dy), "h");
    g.points(shift([[12, 4], [16, 3], [19, 5], [11, 6], [20, 4]], dx, dy), "s"); // patches torn out
  }
  if (style === "short") {
    g.rect(10 + dx, 3 + dy, 21 + dx, 3 + dy, "h");
    g.rect(8 + dx, 4 + dy, 23 + dx, 6 + dy, "h");
    g.points(shift([[8, 7], [23, 7], [24, 7], [24, 8]], dx, dy), "h");
  }
  if (style === "combover") {
    g.points(shift([[7, 8], [7, 9], [7, 10], [24, 8], [24, 9], [24, 10]], dx, dy), "h");
    for (let x = 10; x <= 20; x += 2) g.set(x + dx, 5 + dy + (x % 4 ? 0 : 1), "h");
  }
}

// A shirt over the standard chest; torn at the hem, stained with blood.
function torso(g, rng, x0 = 9, x1 = 22, y0 = 21, y1 = 30) {
  g.rect(x0, y0, x1, y1, "u");
  g.points([[x0, y0], [x1, y0]], null);
  for (let x = x0 + 1; x < x1; x++) if (rng() < 0.3) g.set(x, y1, "S");
  for (let i = 0; i < 5; i++) g.set(x0 + 2 + Math.floor(rng() * (x1 - x0 - 3)), y0 + 2 + Math.floor(rng() * (y1 - y0 - 3)), "w");
}

// An arm reaching out to the left at shoulder height (`thick` for the brutes).
function reachArm(g, y = 22, thick = false) {
  const h = thick ? 3 : 2;
  g.rect(thick ? 3 : 4, y, 8, y + h, "l");
  g.rect(0, y, thick ? 2 : 3, y + h + 1, "s");
  g.points([[0, y + h + 1], [thick ? 2 : 3, y + h + 1]], null);
  g.set(0, y + 1, "S");
}
// The other arm hanging limp at the side (or, for the brutes, a fist down by the knee).
function limpArm(g, x0 = 23, x1 = 25, y0 = 22, y1 = 28) {
  g.rect(x0, y0, x1, y1, "l");
  g.rect(x0, y1 + 1, x1, y1 + 2, "s");
  g.set(x1, y1 + 2, null);
}

// Shambling legs: one forward, the other dragging a step behind (`bare` — it's lost a shoe).
function shambleLegs(g, bare = false, y0 = 31) {
  g.rect(10, y0, 21, y0 + 1, "p");
  g.rect(9, y0 + 2, 14, y0 + 5, "p");
  g.rect(17, y0 + 2, 21, y0 + 4, "p");
  g.points([[11, y0 + 3], [12, y0 + 3]], "S"); // a torn knee
  g.rect(8, y0 + 6, 14, y0 + 7, "f");
  if (bare) {
    g.rect(17, y0 + 5, 21, y0 + 6, "s");
    g.points([[17, y0 + 6]], "S");
  } else g.rect(17, y0 + 5, 22, y0 + 6, "f");
}

// ---------- the bodies ----------

const FRAMES = {
  // a walker: one arm out, one hanging, one foot dragging
  shamble(g, L, rng) {
    if (L.coat) {
      g.rect(9, 21, 22, 33, "c"); // a long coat behind the legs' tops
    }
    shambleLegs(g, L.bareFoot);
    torso(g, rng);
    if (L.coat) {
      g.rect(9, 21, 12, 33, "c");
      g.rect(19, 21, 22, 33, "c");
      g.points([[9, 21], [22, 21]], null);
      for (let i = 0; i < 4; i++) g.set(9 + Math.floor(rng() * 4), 24 + Math.floor(rng() * 9), "w");
    }
    if (L.camo) for (let i = 0; i < 14; i++) g.onto([[10 + Math.floor(rng() * 12), 22 + Math.floor(rng() * 8)]], rng() < 0.5 ? "a" : "A", ["u"]);
    if (L.neck === "tee") g.rect(14, 21, 17, 21, "s");
    reachArm(g, 22);
    g.rect(5, 26, 8, 27, "U"); // the far arm, a little lower
    g.rect(2, 26, 4, 27, "S");
    limpArm(g);
    head(g);
    face(g, 0, 0);
    hair(g, L, 0, 0);
    // a bite on the neck
    g.points([[16, 20], [17, 19]], "w");
  },
  // a runner: leaning into the sprint, arms pumping, legs mid-stride
  runner(g, L, rng) {
    // back leg kicked out behind, front leg reaching forward
    g.rect(14, 31, 19, 33, "p");
    g.rect(19, 32, 23, 34, "p");
    g.rect(22, 34, 26, 35, "f");
    g.rect(8, 31, 13, 33, "p");
    g.rect(5, 34, 9, 36, "p");
    g.rect(2, 37, 8, 38, "f");
    if (L.stripe) {
      g.points([[9, 32], [10, 32], [8, 33], [6, 35], [7, 35]], "a");
      g.points([[16, 32], [17, 32], [20, 33], [21, 33]], "a");
    }
    // the far arm swinging back
    g.rect(21, 23, 26, 25, "U");
    g.rect(27, 23, 28, 25, "S");
    torso(g, rng, 8, 20, 22, 30);
    if (L.stripe) g.rect(8, 23, 8, 30, "a");
    // the near arm driving forward, bent
    g.rect(3, 24, 8, 26, "l");
    g.rect(1, 22, 3, 25, "s");
    head(g, -2, 1);
    face(g, -2, 1);
    hair(g, L, -2, 1);
    if (L.band) g.rect(6, 7, 21, 8, "a2");
  },
  // a brute: wide shoulders and pads, a thick arm out and a fist hanging down, a lower head
  brute(g, L, rng) {
    g.rect(9, 32, 22, 33, "p");
    g.rect(8, 34, 14, 36, "p");
    g.rect(17, 34, 23, 35, "p");
    if (L.stripe && !L.suit) g.points([[8, 34], [8, 35], [8, 36], [23, 34], [23, 35]], "a2");
    g.rect(7, 37, 14, 38, "f");
    g.rect(17, 36, 24, 37, "f");
    torso(g, rng, 7, 24, 21, 31);
    g.rect(5, 20, 26, 23, L.suit ? "u" : "U"); // the shoulders (pads, or a big suit jacket)
    g.points([[5, 20], [26, 20]], null);
    if (L.suit) {
      // a white shirt and the tie down the middle, lapels either side
      g.rect(14, 21, 17, 24, "c");
      g.rect(15, 22, 16, 29, "a");
      g.points([[13, 21], [13, 22], [12, 23], [18, 21], [18, 22], [19, 23]], "U");
      g.points([[22, 26], [23, 26]], "c"); // a pocket square
    } else if (L.number) {
      // a big 7 on the chest
      g.rect(12, 24, 17, 24, "a");
      g.rect(16, 25, 17, 25, "a");
      g.rect(15, 26, 16, 27, "a");
      g.rect(14, 28, 15, 29, "a");
    }
    if (L.badge) {
      g.rect(10, 24, 11, 25, "y");
      g.rect(15, 22, 16, 29, "a");
      g.set(15, 25, "y");
    }
    reachArm(g, 23, true);
    limpArm(g, 25, 28, 23, 30);
    head(g, 0, 1);
    face(g, 0, 1);
    hair(g, L, 0, 1);
  },
  // a spitter: a bloated belly bursting out of its shirt, acid dripping from its mouth
  bloated(g, L, rng) {
    g.rect(10, 32, 21, 33, "p");
    g.rect(10, 34, 14, 36, "p");
    g.rect(17, 34, 21, 35, "p");
    g.rect(9, 37, 14, 38, "f");
    g.rect(17, 36, 22, 37, "f");
    g.rect(9, 21, 22, 23, "u");
    g.rect(7, 24, 24, 30, "u");
    g.rect(6, 26, 25, 29, "u");
    g.rect(8, 31, 23, 31, "u");
    g.points([[9, 21], [22, 21], [7, 24], [24, 24], [6, 26], [25, 26], [6, 29], [25, 29], [7, 30], [24, 30]], null);
    g.rect(11, 24, 20, 31, "k"); // the swollen belly bursting out of the torn vest
    g.points([[11, 24], [20, 24], [11, 31], [20, 31], [12, 24], [19, 24]], "u");
    g.points([[10, 25], [21, 25], [10, 30], [21, 30]], "S");
    g.set(15, 28, "S");
    for (let i = 0; i < 4; i++) g.set(13 + Math.floor(rng() * 6), 26 + Math.floor(rng() * 4), "K");
    g.rect(4, 23, 7, 25, "l");
    g.rect(1, 23, 3, 26, "s");
    g.set(3, 26, null);
    limpArm(g, 24, 26, 24, 29);
    head(g);
    face(g, 0, 0);
    // pustules and the drool
    g.points([[10, 6], [19, 5], [21, 8], [13, 4]], "k");
    g.points([[15, 17], [15, 18], [15, 19], [16, 20], [16, 21], [16, 22], [15, 24], [17, 26], [14, 27]], "d");
    g.points([[14, 16], [16, 16]], "d");
  },
  // a screamer: head thrown back, mouth wide open, both arms up in the air
  screamer(g, L, rng) {
    // long hair behind
    g.rect(6, 4, 25, 25, "h");
    g.points([[6, 24], [6, 25], [25, 24], [25, 25], [7, 25], [24, 25]], null);
    shambleLegs(g, false);
    torso(g, rng);
    g.rect(11, 27, 20, 29, "U"); // the hoodie's pocket
    g.points([[13, 22], [13, 23], [13, 24], [18, 22], [18, 23], [18, 24]], "a"); // its strings
    // arms raised
    g.rect(4, 15, 7, 22, "l");
    g.rect(24, 15, 27, 22, "l");
    g.rect(3, 10, 7, 14, "s");
    g.rect(24, 10, 28, 14, "s");
    g.points([[4, 9], [6, 9], [25, 9], [27, 9], [3, 10], [28, 10]], "s");
    g.points([[4, 10], [6, 10], [25, 10], [27, 10]], null);
    head(g, 0, -1);
    face(g, 0, -1, { mouth: "scream", brows: "none" });
    // the hair over the crown and down the sides of the face
    g.rect(9, 1, 22, 3, "h");
    g.rect(7, 3, 24, 5, "h");
    g.rect(7, 6, 8, 14, "h");
    g.rect(23, 6, 24, 14, "h");
    g.points([[11, 0], [20, 0]], "h");
    // strands, a parting, ragged ends
    for (let x = 7; x <= 24; x += 3) for (let y = 2; y <= 25; y++) if (g.get(x, y) === "h" && (x + y) % 4 !== 0) g.set(x, y, "H");
    g.points([[15, 1], [16, 1], [15, 2], [16, 3]], "H");
    for (const x of [6, 7, 9, 22, 24, 25]) g.set(x, 24 + (x % 2), null);
  },
};

// Hats and gear over the head, by look.
function headgear(g, L) {
  const dy = L.frame === "brute" ? 1 : 0;
  if (L.helmet && L.frame === "brute") {
    // a football helmet with a stripe and a face cage
    g.rect(7, 2 + dy, 24, 9 + dy, "r");
    g.points([[7, 2 + dy], [8, 2 + dy], [24, 2 + dy], [23, 2 + dy]], null);
    g.rect(15, 2 + dy, 16, 9 + dy, "a2");
    g.rect(22, 9 + dy, 24, 14 + dy, "r"); // the ear guard
    g.points([[23, 11 + dy]], "R");
    for (const y of [12, 14, 16]) g.rect(7, y + dy, 14, y + dy, "g");
    g.rect(7, 12 + dy, 7, 16 + dy, "g");
    g.rect(10, 12 + dy, 10, 16 + dy, "g");
    g.points([[11, 13 + dy], [12, 13 + dy], [19, 14 + dy], [20, 14 + dy]], "e"); // eye black
  } else if (L.helmet) {
    // an army helmet and its strap
    g.rect(7, 2, 24, 7, "r");
    g.points([[7, 2], [24, 2]], null);
    g.rect(6, 8, 25, 8, "R");
    g.rect(8, 9, 8, 15, "R");
  }
  if (L.cap && L.frame === "brute") {
    // a security cap with a peak pulled low, a gold badge on the front
    g.rect(8, 3 + dy, 23, 7 + dy, "r");
    g.points([[8, 3 + dy], [23, 3 + dy]], null);
    g.rect(4, 8 + dy, 14, 8 + dy, "R");
    g.set(15, 5 + dy, "y");
  } else if (L.cap) {
    // a surgical cap, the mask pulled down under the chin, gloves
    g.rect(8, 2, 23, 7, "r");
    g.points([[8, 2], [23, 2]], null);
    for (const x of [11, 15, 19]) g.set(x, 4, "R");
    g.rect(10, 18, 21, 19, "g");
    g.points([[9, 17], [22, 17]], "g");
    g.onto([[0, 22], [1, 22], [2, 22], [3, 22], [0, 23], [1, 23], [2, 23], [3, 23], [0, 24], [1, 24], [2, 24], [3, 24], [1, 25], [2, 25], [23, 29], [24, 29], [25, 29], [23, 30], [24, 30]], "g", ["s", "S"]);
  }
  if (L.goggles) {
    g.rect(8, 6, 23, 7, "R2");
    g.rect(10, 5, 13, 7, "G");
    g.rect(18, 5, 21, 7, "G");
    g.points([[10, 5], [18, 5]], "G2");
  }
  if (L.stitches) g.points([[9, 13], [10, 14], [9, 15], [10, 16]], "x");
}

// Which parts get the light from the top-left and the shadow on the bottom-right.
const GROUP = {
  s: "skin", S: "skin", k: "skin", K: "skin", e: "skin", E: "skin", i: "skin", m: "skin", M: "skin", t: "skin", w: "skin", d: "skin", x: "skin",
  h: "hair", H: "hair", u: "body", U: "body", c: "body", a: "body", y: "body", l: "sleeve", p: "legs", f: "shoes",
  r: "hat", R: "hat", a2: "hat", g: "gear", G: "gear", G2: "gear", R2: "gear",
};
const RIM_SHADED = new Set(["s", "h", "u", "l", "p", "f", "r", "c", "k"]);

function build(lookId) {
  const L = LOOKS[lookId] || LOOKS.walker;
  let seed = [...lookId].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7);
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const g = new Grid();
  FRAMES[L.frame](g, L, rng);
  headgear(g, L);

  const skin = L.skin;
  const base = {
    s: skin, S: shadowOf(skin), k: mix(skin, "#e8f0a0", 0.35), K: mix(skin, "#7a8a20", 0.4),
    e: "#1e1414", E: mix(L.eyes, "#1e1414", 0.55), i: L.eyes, m: "#3a1212", M: "#1a0808", t: "#e8e2c0",
    w: "#7a1f1f", d: L.drool || "#c8f050", x: "#2a1a1a",
    h: L.hair || "#3a3030", H: shadowOf(L.hair || "#3a3030"),
    u: L.shirt, U: shadowOf(L.shirt), l: L.shirt,
    c: L.coat || "#e8e4dc", a: L.stripe || L.number || L.tie || L.strings || (L.camo ? L.camo[0] : "#e8e4dc"), A: L.camo ? L.camo[1] : shadowOf(L.shirt),
    y: L.badge || "#f2c14e",
    p: L.pants, f: L.shoes,
    r: L.helmet || L.cap || "#465533", R: shadowOf(L.helmet || L.cap || "#465533"), a2: L.band || L.stripe || "#f4f4f4",
    g: L.mask || "#9aa0aa", G: L.goggles || "#9fd8f0", G2: "#ffffff", R2: "#3a3f48",
  };
  if (L.suit) base.c = "#e8e4dc";

  // Rim shading: light from the top-left, shadow on the bottom-right, as on the students — and,
  // like them, clothes and hair turning into the shadow over two pixels so they look round.
  const groupAt = (x, y) => GROUP[g.get(x, y)] || null;
  const color = Array.from({ length: H }, () => Array(W).fill(null));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = g.get(x, y);
      if (!k) continue;
      let col = base[k] || "#ff00ff";
      if (RIM_SHADED.has(k)) {
        const grp = GROUP[k];
        if (k === "s" && groupAt(x, y - 1) === "hair") col = shadowOf(col);
        else if (groupAt(x + 1, y) !== grp || groupAt(x, y + 1) !== grp) col = shadowOf(col);
        else if (groupAt(x - 1, y) !== grp || groupAt(x, y - 1) !== grp) col = lightOf(col);
        else if (k !== "s" && groupAt(x + 2, y) !== grp) col = mix(col, shadowOf(col), 0.5);
      }
      color[y][x] = col;
    }
  }
  // A dark outline around the whole figure, tinted by what it outlines.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (g.get(x, y)) continue;
      const touching = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => g.get(x + dx, y + dy) && color[y + dy][x + dx]).find(Boolean);
      if (touching) color[y][x] = outlineOf(touching);
    }
  }
  let rects = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; ) {
      const c = color[y][x];
      let run = 1;
      while (x + run < W && color[y][x + run] === c) run++;
      if (c) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  }
  return rects;
}

const cache = new Map();

export function zombieSprite(look = "walker", sizePx = 64) {
  const id = LOOKS[look] ? look : "walker";
  if (!cache.has(id)) cache.set(id, build(id));
  const h = Math.round(sizePx * (H / W));
  return `<svg class="zombie-sprite" viewBox="0 0 ${W} ${H}" width="${sizePx}" height="${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${cache.get(id)}</svg>`;
}
