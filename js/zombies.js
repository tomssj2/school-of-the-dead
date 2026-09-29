// Pixel-art zombies in the same 32x40 style as the character sprites (sprite.js) — used for the
// raid bosses and anywhere a scout or squad comes face to face with one. Each look is a zombie in
// what it wore when it turned; they face left, arms out, toward whoever they're fighting.

import { shadowOf, lightOf, outlineOf } from "./sprite.js";

const W = 32;
const H = 40;

const LOOKS = {
  walker: { shirt: "#6b7a8f", pants: "#4a4a5a", hair: "#4a3a2a", eyes: "#ff5a3a", skin: "#8fae7a" },
  soldier: { shirt: "#5a6a3a", pants: "#4a5a30", hair: null, eyes: "#ff3b3b", skin: "#8fae7a", helmet: "#465533" },
  jersey: { shirt: "#b03030", pants: "#c9ccd2", hair: "#2a2020", eyes: "#f4d35e", skin: "#87a672", pads: true },
  labcoat: { shirt: "#6b8fb0", pants: "#3a3f48", hair: null, eyes: "#c07fff", skin: "#a9b89a", coat: "#e4eaec" },
  // the Night Watch's horde: a runner in a tracksuit, a bloated spitter, and the boss in a suit
  runner: { shirt: "#3f6fb5", pants: "#2a3a6a", hair: "#6b4a2f", eyes: "#ff5a3a", skin: "#93b27e", stripe: "#f4f4f4" },
  spitter: { shirt: "#6a8a3a", pants: "#4a5a30", hair: null, eyes: "#d0ff40", skin: "#b0bf5a", drool: "#c8f050" },
  boss: { shirt: "#2e3140", pants: "#23252f", hair: "#1a1a1a", eyes: "#ff2a2a", skin: "#7f9e6c", tie: "#b02030" },
};

// Which look each kind of zombie in the night horde wears, and how big it's drawn.
export const HORDE_LOOK = {
  walker: { look: "walker", scale: 1 },
  runner: { look: "runner", scale: 0.9 },
  brute: { look: "jersey", scale: 1.25 },
  spitter: { look: "spitter", scale: 1 },
  boss: { look: "boss", scale: 1.4 },
};
export const hordeSprite = (type, sizePx) => {
  const h = HORDE_LOOK[type] || HORDE_LOOK.walker;
  return zombieSprite(h.look, Math.round(sizePx * h.scale));
};

function build(look) {
  const L = LOOKS[look];
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const r = (x0, y0, x1, y1, c) => {
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) g[y][x] = c;
  };
  let seed = [...look].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7);
  const rng = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const skin = L.skin;
  const skinDark = shadowOf(skin);

  // legs, shuffling: the back leg a step behind
  r(12, 29, 15, 36, L.pants);
  r(17, 29, 20, 35, shadowOf(L.pants));
  r(11, 37, 15, 38, "#2a2420");
  r(17, 36, 21, 37, "#2a2420");
  // torso
  r(11, 17, 21, 28, L.shirt);
  r(11, 17, 12, 28, lightOf(L.shirt));
  r(20, 17, 21, 28, shadowOf(L.shirt));
  if (L.pads) r(9, 16, 23, 19, shadowOf(L.shirt));
  if (L.coat) {
    r(10, 17, 13, 34, L.coat);
    r(19, 17, 22, 34, shadowOf(L.coat));
    r(14, 17, 18, 28, L.shirt);
  }
  if (look === "jersey") {
    r(14, 20, 18, 20, "#f4f4f4");
    r(17, 21, 17, 25, "#f4f4f4");
  }
  if (look === "soldier") {
    for (let i = 0; i < 10; i++) r(11 + Math.floor(rng() * 10), 17 + Math.floor(rng() * 11), 12 + Math.floor(rng() * 10), 17 + Math.floor(rng() * 11), rng() < 0.5 ? "#4a5a2e" : "#6b7a45");
    r(11, 26, 21, 26, "#3a3020");
    r(15, 18, 15, 21, "#c9ccd2");
  }
  // ragged hem and blood
  for (let x = 11; x <= 21; x++) if (rng() < 0.35) g[28][x] = null;
  for (let i = 0; i < 6; i++) r(11 + Math.floor(rng() * 10), 18 + Math.floor(rng() * 9), 11 + Math.floor(rng() * 10), 18 + Math.floor(rng() * 9), "#7a1f1f");
  // arms reaching forward (left)
  r(7, 18, 11, 20, L.coat || L.shirt);
  r(2, 18, 6, 20, skin);
  r(2, 20, 6, 20, skinDark);
  r(1, 18, 1, 19, skin);
  r(8, 22, 11, 24, shadowOf(L.coat || L.shirt));
  r(4, 22, 7, 24, skinDark);
  r(3, 22, 3, 23, skinDark);
  // neck and head
  r(14, 15, 17, 16, skinDark);
  r(11, 5, 20, 14, skin);
  r(11, 5, 12, 14, lightOf(skin));
  r(19, 5, 20, 14, skinDark);
  r(12, 14, 19, 14, skinDark);
  // eyes: dark sockets with a glow
  r(12, 8, 13, 10, "#2a1a1a");
  r(16, 8, 17, 10, "#2a1a1a");
  g[9][12] = L.eyes;
  g[9][16] = L.eyes;
  // slack jaw
  r(12, 12, 16, 13, "#3a1a1a");
  g[12][13] = "#e8e2c0";
  g[12][15] = "#e8e2c0";
  // hair / helmet
  if (L.hair) {
    r(11, 4, 20, 5, L.hair);
    r(19, 5, 20, 8, L.hair);
    g[4][13] = null;
    g[4][17] = null;
  }
  if (L.helmet) {
    r(10, 2, 21, 6, L.helmet);
    r(9, 6, 22, 6, shadowOf(L.helmet));
    r(11, 2, 20, 2, lightOf(L.helmet));
    r(20, 7, 20, 13, "#3a3020");
  }
  if (look === "jersey") {
    // eye black
    r(11, 10, 13, 10, "#1a1a1a");
    r(16, 10, 17, 10, "#1a1a1a");
  }
  if (look === "labcoat") {
    for (const [x, y] of [[18, 6], [19, 7], [18, 11], [12, 6]]) g[y][x] = "#9a6ad0";
    r(12, 4, 13, 4, "#6b6b6b");
  }
  if (L.stripe) {
    // tracksuit stripes down the side and the legs
    r(12, 17, 12, 28, L.stripe);
    r(13, 29, 13, 36, L.stripe);
  }
  if (L.drool) {
    // swollen and dripping: a bulging belly and acid at the mouth
    r(10, 21, 22, 27, L.shirt);
    r(21, 22, 22, 26, shadowOf(L.shirt));
    r(13, 13, 15, 16, L.drool);
    g[17][14] = L.drool;
    g[19][13] = L.drool;
  }
  if (L.tie) {
    // a suit and tie, a principal's badge
    r(15, 17, 16, 26, L.tie);
    r(13, 17, 14, 19, "#e8e2d0");
    r(17, 17, 18, 19, "#e8e2d0");
    g[20][19] = "#f4d35e";
  }
  // bite wound on the neck
  g[15][16] = "#7a1f1f";
  g[16][17] = "#7a1f1f";

  // outline
  const out = g.map((row) => [...row]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    const n = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => g[y + dy]?.[x + dx]).find(Boolean);
    if (n) out[y][x] = outlineOf(n);
  }
  let rects = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; ) {
      const c = out[y][x];
      let run = 1;
      while (x + run < W && out[y][x + run] === c) run++;
      if (c) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
      x += run;
    }
  }
  return rects;
}

const cache = new Map();

export function zombieSprite(look = "walker", sizePx = 64) {
  if (!cache.has(look)) cache.set(look, build(LOOKS[look] ? look : "walker"));
  const h = Math.round(sizePx * (H / W));
  return `<svg class="zombie-sprite" viewBox="0 0 ${W} ${H}" width="${sizePx}" height="${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${cache.get(look)}</svg>`;
}
