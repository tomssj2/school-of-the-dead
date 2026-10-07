// The Night Watch board's art: the school's front at night, drawn in code as pixel art in the
// campus colours (cream walls, blue trim, the red sign), then lit — moonlight everywhere, a warm
// glow from the lit windows — and small pixel sprites for the defenses built on it. The board is
// the entrance grid: the school's doors across the top, the front steps (rows 0-2),
// the open lawn of the courtyard (rows 3-4), the pavement (row 5) and the road the horde comes up
// (row 6). Nothing stands in the lanes but what's placed there.

import { shadowOf, lightOf, mix } from "./sprite.js";
import { ENTRANCE_ROWS } from "./data.js";

// The art's bands, by row: the three front steps, the two rows of lawn, then the pavement and the
// road (where students, walls and the horde go is data.js ENTRANCE_ZONES — the art doesn't move).
const STEP_ROWS = 3;
const LAWN_ROW0 = 3;
const PAVEMENT_ROW = 5;
import { hash, hash2, buffer, lightUp } from "./lighting.js";

// Art pixels: each square is CELL_W x CELL_H, under a facade FACADE_H tall.
export const CELL_W = 32;
export const CELL_H = 20;
export const FACADE_H = 36;

// 3x5 letters for the sign and the graffiti.
const FONT = {
  S: ["111", "100", "111", "001", "111"], C: ["111", "100", "100", "100", "111"],
  H: ["101", "101", "111", "101", "101"], O: ["111", "101", "101", "101", "111"],
  L: ["100", "100", "100", "100", "111"], E: ["111", "100", "110", "100", "111"],
  P: ["111", "101", "111", "100", "100"],
};
function text(p, str, x, y, c, e = 0) {
  [...str].forEach((ch, i) => FONT[ch].forEach((row, dy) => [...row].forEach((b, dx) => b === "1" && p.set(x + i * 4 + dx, y + dy, c, e))));
}

// Light colours (multipliers).
const WARM = [1.0, 0.74, 0.42];

// The campus palette (map.js's school tile).
const WALL = "#ece4d0";
const WALL_LT = "#f4efe2";
const WALL_DK = shadowOf(WALL);
const TRIM = "#2f6f9f";
const STONE = "#d6cfbd";
const STONE_LT = "#ece6d6";
const STONE_DK = "#aaa294";
const IRON_LT = "#4a5060";
const BLOOD = "#7a1e1e";
const LIT = ["#fff0b8", "#f8d888", "#f2c060", "#e6a848"];
const GLASS_DARK = "#1a2340";

// One classroom window on the facade: lit (curtains, someone's silhouette, a bloody handprint),
// dark, broken or boarded up.
function facadeWindow(p, x, y0, kind, lights) {
  const y1 = y0 + 16;
  p.r(x - 1, y0 - 1, x + 14, y0 - 1, STONE_LT); // lintel
  p.r(x, y0, x + 13, y1, shadowOf(TRIM)); // frame
  const gx0 = x + 1, gx1 = x + 12, gy0 = y0 + 1, gy1 = y1 - 1;
  if (kind.startsWith("lit")) {
    for (let y = gy0; y <= gy1; y++) p.r(gx0, y, gx1, y, LIT[Math.min(3, Math.floor((y - gy0) / 4))], 1);
    if (kind === "lit") {
      for (let y = gy0; y <= gy1; y++) {
        p.r(gx0, y, gx0 + 1, y, y % 2 ? "#d8805a" : "#c86a4a", 1); // curtains
        p.r(gx1 - 1, y, gx1, y, y % 2 ? "#d8805a" : "#c86a4a", 1);
      }
    }
    if (kind === "litFigure") {
      p.oval(x + 4, y0 + 9, 1.4, 1.5, "#2a1e1a", 1);
      p.r(x + 2, y0 + 11, x + 6, gy1, "#2a1e1a", 1);
    }
    if (kind === "litHand") {
      for (const [dx, dy] of [[9, 5], [10, 5], [9, 6], [10, 6], [8, 4], [9, 3], [10, 3], [11, 4], [10, 7], [10, 8], [9, 9]]) p.set(x + dx, y0 + dy, "#9a2424", 1);
    }
    lights.push({ x: x + 7, y: y0 + 8, r: 17, k: 0.55, c: WARM });
  } else {
    p.r(gx0, gy0, gx1, gy1, GLASS_DARK, 1);
    for (let i = 0; i < 4; i++) p.set(gx0 + 1 + i, gy0 + 4 - i, "#3a4c7a", 1); // the moon on the glass
    p.set(gx1 - 2, gy0 + 1, "#6a80b8", 1);
    if (kind === "broken") {
      for (let y = y0 + 7; y <= y0 + 13; y++) for (let xx = x + 7; xx <= x + 11; xx++) if (hash2(xx, y, 3) < 0.7 - Math.abs(y - y0 - 10) * 0.1) p.set(xx, y, "#070a14", 1);
      for (const [dx, dy] of [[6, 8], [8, 6], [11, 7], [7, 13], [12, 12], [9, 14]]) p.set(x + dx, y0 + dy, "#8ea6d4", 1);
    }
  }
  p.r(x + 6, gy0, x + 7, gy1, shadowOf(TRIM)); // mullions
  p.r(gx0, y0 + 7, gx1, y0 + 7, shadowOf(TRIM));
  p.r(x, y0, x + 13, y0, TRIM);
  if (kind === "boarded") {
    for (const py of [y0 + 3, y0 + 10]) {
      p.r(x - 1, py, x + 14, py + 2, "#9a6a3a");
      p.r(x - 1, py, x + 14, py, "#c08a50");
      p.r(x - 1, py + 2, x + 14, py + 2, "#5e3e22");
      for (const nx of [x, x + 13]) p.set(nx, py + 1, "#d0d4dc");
      for (let gx = x + 2; gx < x + 13; gx += 4) p.set(gx + (py % 3), py + 1, "#86592e");
    }
    p.line(x, y0 + 14, x + 13, y0 + 1, "#8a5f33");
    p.line(x + 1, y0 + 14, x + 13, y0 + 2, "#5e3e22");
  }
  p.r(x - 1, y1 + 1, x + 14, y1 + 1, STONE_LT); // sill, its shadow, the stains under it
  p.r(x, y1 + 2, x + 13, y1 + 2, WALL_DK);
  for (const dx of [3, 10]) p.r(x + dx, y1 + 3, x + dx, y1 + 4, mix(WALL, WALL_DK, 0.5));
}

const cache = new Map();

// The whole board as a CSS url(): `cols` squares wide, the entrance's rows tall.
export function courtyardBackground(cols) {
  const key = `yard${cols}`;
  if (cache.has(key)) return cache.get(key);
  const W = cols * CELL_W;
  const H = FACADE_H + ENTRANCE_ROWS * CELL_H;
  const rowY = (row) => FACADE_H + row * CELL_H;
  const mid = Math.round(W / 2);
  const p = buffer(W, H);
  const lights = [];

  // ===== the school's front =====
  // the sky over the roof, a crescent moon
  p.r(0, 0, W - 1, 3, "#141c3c", 1);
  for (let i = 0; i < 9; i++) p.set(Math.floor(hash(i, 40) * W), Math.floor(hash(i, 41) * 4), i % 3 ? "#8a98d0" : "#dce4ff", 1);
  p.oval(W - 20, 1.5, 2, 2, "#e8ecff", 1);
  p.oval(W - 19, 1, 2, 2, "#141c3c", 1);
  // the wings: cream walls under a blue cornice with dentils
  p.r(0, 4, W - 1, 30, WALL);
  for (let i = 0; i < W * 2; i++) p.set(Math.floor(hash(i, 42) * W), 8 + Math.floor(hash(i, 43) * 23), mix(WALL, "#c8bfa8", 0.5));
  p.r(0, 4, W - 1, 4, lightOf(TRIM));
  p.r(0, 5, W - 1, 6, TRIM);
  for (let x = 1; x < W; x += 3) p.set(x, 6, shadowOf(TRIM));
  p.r(0, 7, W - 1, 7, WALL_DK);
  // classroom windows, three a wing, pilasters between them
  const cb0 = mid - 28;
  const cb1 = mid + 27;
  const wings = [[0, cb0 - 1, ["lit", "boarded", "dark"]], [cb1 + 1, W - 1, ["litFigure", "broken", "litHand"]]];
  for (const [a, b, kinds] of wings) {
    const width = b - a + 1;
    const n = Math.max(1, Math.floor((width + 4) / 22));
    const step = width / n;
    const xs = Array.from({ length: n }, (_, i) => a + Math.round(i * step + (step - 14) / 2));
    xs.slice(1).forEach((x, i) => {
      const px = Math.round((xs[i] + 14 + x) / 2) - 1;
      p.r(px, 8, px + 2, 30, WALL_LT);
      p.r(px + 2, 8, px + 2, 30, mix(WALL, WALL_DK, 0.6));
    });
    xs.forEach((x, i) => facadeWindow(p, x, 10, kinds[i % kinds.length], lights));
  }
  // corner quoins
  for (let y = 8; y <= 30; y += 4) {
    p.r(0, y, 2, y + 1, STONE_LT);
    p.r(W - 3, y, W - 1, y + 1, STONE_LT);
  }
  // the entrance block in the middle: taller, a lighter wall, its own cornice
  p.r(cb0, 0, cb1, 30, WALL_LT);
  p.r(cb0, 0, cb1, 0, lightOf(TRIM));
  p.r(cb0, 1, cb1, 2, TRIM);
  for (let x = cb0 + 1; x < cb1; x += 3) p.set(x, 2, shadowOf(TRIM));
  p.r(cb0, 3, cb1, 3, mix(WALL_LT, WALL_DK, 0.6));
  p.r(cb0, 4, cb0 + 2, 30, "#fbf8f0");
  p.r(cb1 - 2, 4, cb1, 30, mix(WALL_LT, WALL_DK, 0.45));
  p.r(cb1 + 1, 7, cb1 + 2, 30, WALL_DK); // its shadow on the right wing
  // the red sign
  p.r(mid - 14, 9, mid + 14, 15, "#8a2a2a");
  p.r(mid - 13, 10, mid + 13, 14, "#d64545");
  p.r(mid - 13, 10, mid + 13, 10, lightOf("#d64545"));
  text(p, "SCHOOL", mid - 11, 10, WALL_LT);
  for (const [x, y] of [[mid - 13, 10], [mid + 13, 10], [mid - 13, 14], [mid + 13, 14]]) p.set(x, y, "#f4d35e");
  // the doors — the gate: steel double doors in a dark frame, a lit transom, chained shut
  const d0 = mid - 17;
  const d1 = mid + 16;
  p.r(d0, 17, d1, 35, "#2c3444");
  p.r(d0, 17, d0, 35, "#3e4a60");
  p.r(d0 + 2, 18, d1 - 2, 20, LIT[1], 1);
  p.r(d0 + 2, 18, d1 - 2, 18, LIT[0], 1);
  for (let x = d0 + 7; x < d1 - 2; x += 6) p.r(x, 18, x, 20, "#2c3444");
  for (const [l0, l1] of [[d0 + 2, mid - 1], [mid, d1 - 2]]) {
    p.r(l0, 21, l1, 35, "#5a7fa0");
    p.r(l0, 21, l1, 21, "#7a9fc0");
    p.r(l0 + 1, 22, l0 + 1, 34, "#6a8fb0");
    p.r(l0 + 2, 23, l1 - 2, 23, "#46688a");
    p.r(l0 + 2, 33, l1 - 2, 33, "#46688a");
    p.r(l0 + 2, 23, l0 + 2, 33, "#46688a");
    p.r(l1 - 2, 23, l1 - 2, 33, "#46688a");
    p.r(l0 + 1, 29, l1 - 1, 29, "#c8d0dc"); // push bar
    p.r(l0 + 1, 30, l1 - 1, 30, "#3f5f7f");
    p.r(l0, 34, l1, 34, "#8aa0b8"); // kick plate
  }
  for (const wx of [d0 + 5, d1 - 7]) {
    p.r(wx, 24, wx + 2, 27, LIT[2], 1);
    p.r(wx, 24, wx + 2, 24, LIT[0], 1);
    p.set(wx + 1, 26, LIT[3], 1);
  }
  p.r(mid - 1, 21, mid, 35, "#22303f"); // the seam
  for (let x = mid - 9; x <= mid + 8; x++) p.set(x, 27 + (Math.abs(x - mid + 0.5) < 6 ? 1 : 0), x % 2 ? "#9aa0a8" : "#6a7078"); // the chain
  p.r(mid - 2, 29, mid + 1, 31, "#d8b040");
  p.r(mid - 2, 29, mid + 1, 29, "#f4d35e");
  p.set(mid - 1, 30, "#7a5a1a");
  for (let i = 0; i < 3; i++) p.line(d0 + 4 + i * 2, 33, d0 + 7 + i * 2, 30, "#2e4058"); // claw marks
  for (const [x, y] of [[d1 - 5, 30], [d1 - 4, 31], [d1 - 5, 32], [d1 - 4, 33], [d1 - 6, 31], [d1 - 4, 34]]) p.set(x, y, BLOOD);
  // ivy up the corners
  for (let y = 9; y <= 35; y++) {
    const reach = Math.round(((y - 9) / 26) * 7);
    for (let x = 0; x <= reach; x++) if (hash2(x, y, 44) < 0.5) p.set(x, y, hash2(x, y, 45) < 0.3 ? "#5a9a54" : "#3f7a42");
    const reachR = Math.round(((y - 18) / 17) * 4);
    for (let x = 0; x <= reachR; x++) if (hash2(x, y, 46) < 0.45) p.set(W - 1 - x, y, hash2(x, y, 47) < 0.3 ? "#5a9a54" : "#3f7a42");
  }
  // the plinth, some graffiti, a bloody hand dragged down the wall
  p.r(0, 31, d0 - 1, 35, "#b0a894");
  p.r(d1 + 1, 31, W - 1, 35, "#b0a894");
  p.r(0, 31, d0 - 1, 31, "#cfc7b4");
  p.r(d1 + 1, 31, W - 1, 31, "#cfc7b4");
  for (let x = 6; x < W; x += 14) if (x < d0 || x > d1) p.r(x, 32, x, 35, "#8e8676");
  p.r(0, 35, d0 - 1, 35, "#8e8676");
  p.r(d1 + 1, 35, W - 1, 35, "#8e8676");
  p.r(d0, 35, d1, 35, STONE_LT); // threshold
  text(p, "HELP", 28, 31, "#c23838");
  const hx = W - 46;
  for (const [dx, dy] of [[0, 21], [1, 21], [0, 22], [1, 22], [-1, 20], [0, 19], [1, 19], [2, 20]]) p.set(hx + dx, dy, BLOOD);
  for (let y = 23; y <= 30; y++) if (hash(y, 48) < 0.8) p.r(hx, y, hx + (y < 27 ? 1 : 0), y, BLOOD);

  // ===== the front steps: one stone step a row, lit along the nosing, a shadowed riser =====
  const stepsEnd = rowY(STEP_ROWS) - 1;
  for (let row = 0; row < STEP_ROWS; row++) {
    const y0 = rowY(row);
    p.r(0, y0, W - 1, y0 + 13, STONE);
    for (let i = 0; i < W * 1.4; i++) p.set(Math.floor(hash(i, 50 + row) * W), y0 + Math.floor(hash(i, 60 + row) * 14), hash(i, 70 + row) < 0.5 ? "#cdc6b3" : "#ddd7c6");
    if (row > 0) p.r(0, y0, W - 1, y0, "#c4bca8"); // the riser above throws a little shadow
    const off = row % 2 ? 12 : 0;
    for (let x = off; x < W; x += 24) p.r(x, y0, x, y0 + 13, "#b0a896");
    p.r(0, y0 + 14, W - 1, y0 + 14, STONE_LT); // nosing
    p.r(0, y0 + 15, W - 1, y0 + 15, "#7e786c");
    p.r(0, y0 + 16, W - 1, y0 + 19, STONE_DK);
    p.r(0, y0 + 19, W - 1, y0 + 19, "#99917f");
    for (let x = off + 6; x < W; x += 24) p.r(x, y0 + 16, x, y0 + 19, "#99917f");
    for (let x = 0; x < W; x++) if (hash2(x, row, 51) < 0.05) p.set(x, y0 + 14, STONE_DK); // chips
    for (let c = 0; c < 2; c++) {
      let cx = Math.floor(hash(row * 7 + c, 52) * (W - 20)) + 10;
      for (let cy = y0 + 2 + c * 4; cy < y0 + 13; cy++) {
        p.set(cx, cy, "#9a9282");
        cx += hash2(cx, cy, 53) < 0.5 ? -1 : 1;
      }
    }
    for (let x = off; x < W; x += 24) if (hash(x + row, 54) < 0.5) p.r(x, y0 + 11, x, y0 + 13, "#5f7f4a"); // moss
  }
  // side walls and handrails
  for (const [a, b, rail] of [[0, 4, 6], [W - 5, W - 1, W - 7]]) {
    p.r(a, rowY(0), b, stepsEnd + 2, "#c4bca8");
    p.r(a, rowY(0), a, stepsEnd + 2, STONE_LT);
    p.r(b, rowY(0), b, stepsEnd + 2, "#a29a86");
    for (let y = rowY(0) + 5; y < stepsEnd; y += 6) {
      p.r(a, y, b, y, "#a29a86");
      p.set(a + ((y / 6) % 2 ? 1 : 3), y + 2, "#a29a86");
    }
    p.r(a, rowY(0), b, rowY(0) + 1, STONE_LT);
    p.r(rail, rowY(0) + 2, rail, stepsEnd, "#9aa2ae");
    for (let y = rowY(0) + 2; y < stepsEnd; y += 2) p.set(rail, y, "#d0d8e2");
    p.r(rail + (rail < mid ? 1 : -1), rowY(0) + 3, rail + (rail < mid ? 1 : -1), stepsEnd, "#7e786c");
    for (let row = 0; row < STEP_ROWS; row++) p.r(rail - 1, rowY(row) + 11, rail + 1, rowY(row) + 13, IRON_LT);
  }
  // a blood trail down the middle, spent shells, a dropped bat, a backpack
  for (let y = rowY(0) + 1; y < stepsEnd; y++) if (hash(y, 55) < 0.4) p.set(mid + 3 + Math.round(Math.sin(y / 7) * 3), y, BLOOD);
  p.oval(mid + 4, rowY(1) + 6, 1.5, 1, "#6a1818");
  for (let i = 0; i < 10; i++) {
    const x = 12 + Math.floor(hash(i, 56) * (W - 24));
    const y = rowY(0) + 2 + Math.floor(hash(i, 57) * 30);
    p.set(x, y, "#d8b040");
    p.set(x + 1, y, "#9a7a2a");
  }
  p.line(30, rowY(1) + 9, 41, rowY(1) + 5, "#b8865a");
  p.line(36, rowY(1) + 8, 41, rowY(1) + 6, "#c8966a");
  p.r(29, rowY(1) + 9, 31, rowY(1) + 9, "#3a2a1e");
  p.r(W - 36, rowY(2) + 7, W - 31, rowY(2) + 11, "#3f6fb5");
  p.r(W - 36, rowY(2) + 7, W - 31, rowY(2) + 8, "#5a8ad0");
  p.r(W - 35, rowY(2) + 10, W - 32, rowY(2) + 10, "#2a4a80");

  // ===== the courtyard: open lawn and the paved path, down to a stone edging at the pavement =====
  // Nothing stands in the lanes — students hold this ground now, and the horde walks across it.
  const yardTop = rowY(LAWN_ROW0);
  const yardEnd = rowY(PAVEMENT_ROW); // the edging, where the lawn meets the pavement
  for (let x = 0; x < W; x++) p.r(x, yardTop, x, yardEnd - 1, (x >> 3) & 1 ? "#5a9653" : "#4f8a4a");
  for (let i = 0; i < W * 2.2; i++) {
    const x = Math.floor(hash(i, 60) * W);
    const y = yardTop + Math.floor(hash(i, 61) * (yardEnd - yardTop));
    p.set(x, y, hash(i, 62) < 0.55 ? "#3f7a42" : "#6aa860");
    if (hash(i, 63) < 0.15) p.set(x, y - 1, "#7ab870");
  }
  for (const [x, y, rx] of [[22, yardTop + 26, 5], [W - 30, yardTop + 14, 4], [W - 62, yardTop + 30, 3]]) p.oval(x, y, rx, 1.6, "#6e5a40");
  for (const [x, y] of [[18, yardTop + 20], [W - 22, yardTop + 24]]) p.oval(x, y, 4, 2, "#3f7a42");
  const pa = mid - 16;
  const pb = mid + 15;
  p.r(pa, yardTop, pb, yardEnd - 1, "#d9d2c0");
  for (let y = yardTop + 5; y < yardEnd; y += 6) p.r(pa, y, pb, y, "#c4bca8");
  for (let y = yardTop; y < yardEnd; y++) for (let x = pa + (Math.floor((y - yardTop) / 6) % 2 ? 4 : 0); x <= pb; x += 8) p.set(x, y, "#c4bca8");
  p.r(pa - 1, yardTop, pa - 1, yardEnd - 1, "#a8a090");
  p.r(pb + 1, yardTop, pb + 1, yardEnd - 1, "#a8a090");
  for (let y = yardTop + 3; y < yardEnd; y++) if (hash(y, 64) < 0.3) p.set(mid - 4 + Math.round(Math.sin(y / 5) * 2), y, BLOOD);
  // a flowerbed along the foot of the steps
  for (const [a, b] of [[2, pa - 3], [pb + 3, W - 3]]) {
    p.r(a, yardTop, b, yardTop + 1, "#5e4632");
    for (let x = a; x <= b; x += 2) if (hash(x, 66) < 0.7) p.set(x, yardTop + (x % 4 ? 0 : 1), ["#e98fb0", "#f4d35e", "#8a5ad6", "#f4f4f4"][Math.floor(hash(x, 67) * 4)]);
  }
  // the stone edging
  p.r(0, yardEnd, W - 1, yardEnd + 1, "#b8ae96");
  p.r(0, yardEnd, W - 1, yardEnd, STONE_LT);
  for (let x = 4; x < W; x += 10) p.set(x, yardEnd + 1, "#968c76");

  // ===== the street: sidewalk, kerb, the road the horde comes up =====
  const streetTop = rowY(PAVEMENT_ROW) + 2;
  const kerbY = streetTop + 12;
  p.r(0, streetTop, W - 1, kerbY - 1, "#a29e94");
  for (let i = 0; i < W * 1.5; i++) p.set(Math.floor(hash(i, 72) * W), streetTop + Math.floor(hash(i, 73) * 12), hash(i, 74) < 0.5 ? "#98948a" : "#aeaaa0");
  for (let x = 6; x < W; x += 12) p.r(x, streetTop, x, kerbY - 1, "#8a867c");
  p.r(0, streetTop + 6, W - 1, streetTop + 6, "#8a867c");
  for (let x = 6; x < W; x += 12) if (hash(x, 75) < 0.4) p.r(x, streetTop + 4, x, streetTop + 5, "#5a8a4a");
  for (let y = streetTop; y < streetTop + 5; y++) for (let x = pa; x <= pb; x++) if (hash2(x, y, 76) < 0.03) p.set(x, y, "#d9d2c0");
  p.r(0, kerbY, W - 1, kerbY, "#cdc9bf");
  p.r(0, kerbY + 1, W - 1, kerbY + 1, "#9a968c");
  p.r(0, kerbY + 2, W - 1, kerbY + 2, "#2a2d34");
  const roadTop = kerbY + 3;
  p.r(0, roadTop, W - 1, H - 1, "#434750");
  for (let i = 0; i < W * 2.5; i++) p.set(Math.floor(hash(i, 77) * W), roadTop + Math.floor(hash(i, 78) * (H - roadTop)), hash(i, 79) < 0.5 ? "#4c505a" : "#3a3e46");
  for (const [x, y, w, h] of [[W * 0.3, roadTop + 4, 12, 5], [W * 0.62, roadTop + 13, 9, 4]]) p.r(x, y, x + w, y + h, "#3e424a");
  for (let c = 0; c < 4; c++) {
    let cx = Math.floor(hash(c, 80) * W);
    for (let cy = roadTop + 1 + c * 3; cy < H; cy++) {
      if (hash2(cx, cy, 81) < 0.25) break;
      p.set(cx, cy, "#2a2d33");
      cx += hash2(cx, cy, 82) < 0.5 ? -1 : 1;
    }
  }
  const roadMid = Math.round((roadTop + H - 1) / 2);
  for (let x = 0; x < W; x++) if ((x + 4) % 20 < 10 && (x < pa - 2 || x > pb + 2)) p.r(x, roadMid, x, roadMid + 1, "#d8b040");
  for (let x = pa + 1; x <= pb; x++) if ((x - pa - 1) % 6 < 4) for (let y = roadTop + 1; y < H; y++) if (hash2(x, y, 83) > 0.12) p.set(x, y, "#dcdcd4");
  // a storm drain, a manhole, puddles, litter
  p.r(22, kerbY + 1, 31, kerbY + 2, "#1a1c22");
  for (let x = 23; x < 31; x += 2) p.set(x, kerbY + 1, "#5a5e66");
  p.oval(62, H - 6, 5, 2.4, "#3a3d44");
  p.oval(62, H - 6, 3, 1.2, "#4a4e56");
  p.r(59, H - 6, 65, H - 6, "#33363d");
  p.oval(36, H - 4, 7, 1.8, "#1e2a48", 1);
  p.r(32, H - 5, 34, H - 5, "#4a5e8e", 1);
  p.oval(52, roadTop + 4, 6, 1.8, "#1e2a48", 1);
  p.r(50, roadTop + 4, 52, roadTop + 4, "#4a5e8e", 1);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(hash(i, 84) * W);
    const y = streetTop + 2 + Math.floor(hash(i, 85) * (H - streetTop - 4));
    p.r(x, y, x + 1, y, i % 3 ? "#d8d8d0" : "#3a2a20");
  }
  for (let y = streetTop; y < H; y++) if (hash(y, 86) < 0.45) p.set(mid - 2 + Math.round(Math.sin(y / 5) * 1.5), y, "#6a1818");
  const url = `url('${lightUp(p, lights)}')`;
  cache.set(key, url);
  return url;
}

// ===== the defenses =====

// A sprite as SVG: each row's runs of one colour become a rect.
function spriteSvg(p) {
  let rects = "";
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; ) {
      const c = p.col[y * p.w + x];
      let n = 1;
      while (x + n < p.w && p.col[y * p.w + x + n] === c) n++;
      if (c) rects += `<rect x="${x}" y="${y}" width="${n}" height="1" fill="${c}"/>`;
      x += n;
    }
  }
  return `<svg viewBox="0 0 ${p.w} ${p.h}" width="${p.w}" height="${p.h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

const SHADOW = "#05070c66";

// One plump sandbag, `w` wide: rounded ends, lit on top, a crease and a seam.
function sandbag(p, x, y, w = 8) {
  p.r(x + 1, y, x + w - 2, y + 3, "#c2ad7e");
  p.r(x, y + 1, x + w - 1, y + 2, "#c2ad7e");
  p.r(x + 1, y, x + w - 2, y, "#dccb9e");
  p.r(x + 1, y + 3, x + w - 2, y + 3, "#8f7a52");
  p.set(x, y + 1, "#a8935f");
  p.set(x + w - 1, y + 2, "#6e5c3c");
  p.set(x + w - 1, y + 1, "#8f7a52");
  p.set(x + Math.floor(w / 2), y + 1, "#a8935f");
  p.set(x + 2, y + 2, "#b39e70");
  p.set(x + w - 3, y + 2, "#b39e70");
}

// A defense on the board, 32x20 like a square: sandbags, razor wire, and their upgrades — a
// concrete barricade and an electric fence — or, once smashed, rubble.
export function structureSprite(id, sizePx = 64) {
  const key = `st:${id}`;
  if (!cache.has(key)) {
    const p = buffer(32, 20);
    p.oval(16, 18, 14, 1.4, SHADOW);
    if (id === "concrete_barricade") {
      // a jersey barrier: two concrete segments, a lit top, a sloped foot, a hazard band, reflectors
      p.r(4, 5, 27, 6, "#d2d6dc");
      p.r(4, 7, 27, 12, "#a8adb5");
      p.r(2, 13, 29, 17, "#959aa3");
      p.r(2, 13, 29, 13, "#b8bcc4");
      p.r(2, 17, 29, 17, "#6b7080");
      p.r(4, 7, 4, 12, "#c4c8ce");
      p.r(27, 7, 27, 12, "#7e8490");
      p.r(2, 14, 2, 16, "#aab0b8");
      p.r(29, 14, 29, 16, "#7e8490");
      for (let x = 4; x <= 27; x++) for (const y of [9, 10]) p.set(x, y, (x + y) % 6 < 3 ? "#f08a24" : "#f0f0ea");
      p.r(15, 5, 16, 17, "#6b7080"); // the joint between the two segments
      p.set(15, 5, "#8a909a");
      for (const x of [8, 23]) p.r(x, 15, x + 1, 15, "#f4d35e");
      for (const [x, y] of [[7, 7], [21, 11], [25, 8], [11, 16], [19, 14]]) p.set(x, y, "#8a8f98"); // chips and grime
      p.line(22, 6, 24, 9, "#8a8f98");
    } else if (id === "sandbag_wall") {
      for (const x of [1, 8, 15, 22]) sandbag(p, x, 13);
      for (const x of [4, 11, 18]) sandbag(p, x, 9);
      for (const x of [8, 15]) sandbag(p, x, 5);
      sandbag(p, 22, 6, 6);
      for (const [x, y] of [[27, 17], [28, 18], [29, 17], [26, 18], [30, 18]]) p.set(x, y, "#b39e70"); // a split bag
      for (let x = 10; x < 22; x += 2) p.set(x, 6, "#efe2bc"); // stitching
    } else if (id === "electric_fence") {
      // two posts with insulators, four live wires, a warning sign, sparks
      for (const x of [3, 27]) {
        p.r(x, 3, x + 1, 17, "#5a606c");
        p.r(x, 3, x, 17, "#7e8490");
        p.r(x - 1, 2, x + 2, 2, "#8a909a");
      }
      for (const y of [6, 9, 12, 15]) {
        p.r(5, y, 26, y, "#b8bec8");
        for (let x = 6; x < 26; x += 4) p.set(x, y, "#e8ecf0");
        for (const x of [4, 26]) p.set(x, y, "#f0f0ea"); // insulators
      }
      p.r(13, 8, 18, 13, "#f4d35e");
      p.r(13, 8, 18, 8, "#fff0a0");
      p.r(13, 13, 18, 13, "#c8a830");
      for (const [x, y] of [[16, 9], [15, 10], [16, 10], [15, 11], [14, 12]]) p.set(x, y, "#2a2a2a");
      for (const [x, y] of [[8, 5], [9, 4], [7, 4], [22, 11], [23, 10], [21, 10], [10, 14], [24, 16]]) p.set(x, y, "#fff3a0");
      for (const [x, y] of [[8, 4], [22, 10]]) p.set(x, y, "#ffffff");
    } else if (id === "razor_wire") {
      // a coil of concertina wire between two crossed posts
      for (const lx of [3, 28]) {
        p.line(lx - 2, 18, lx + 2, 4, "#5e3e22");
        p.line(lx + 2, 18, lx - 2, 4, "#7a5230");
      }
      for (let cx = 5; cx <= 27; cx += 3) {
        for (let t = 0; t < Math.PI * 2; t += 0.12) {
          const x = cx + Math.cos(t) * 3.2;
          const y = 11 + Math.sin(t) * 5.2;
          const front = Math.cos(t) < 0;
          p.set(x, y, front ? "#c8d0da" : "#5a6270");
        }
      }
      for (let cx = 5; cx <= 27; cx += 3) {
        p.set(cx - 3, 8, "#ffffff");
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) p.set(cx - 2 + dx, 14 + dy, "#e8ecf0"); // barbs
      }
    } else {
      // rubble: concrete chunks, splintered planks, a bit of the hazard stripes, dust
      p.oval(16, 15.5, 13, 2.6, "#5a544a");
      for (const [x, y, w, h] of [[5, 12, 5, 3], [12, 10, 6, 5], [20, 12, 5, 3], [9, 14, 4, 2], [24, 14, 4, 2]]) {
        p.r(x, y, x + w - 1, y + h - 1, "#7c8088");
        p.r(x, y, x + w - 1, y, "#a0a4ac");
        p.r(x + w - 1, y, x + w - 1, y + h - 1, "#5a5e66");
      }
      p.line(4, 15, 14, 9, "#7a5230");
      p.line(5, 15, 14, 10, "#5e3e22");
      p.line(18, 9, 28, 14, "#8a5f33");
      for (let x = 19; x <= 23; x++) p.set(x, 9 + Math.round((x - 18) / 2), (x >> 1) % 2 ? "#c83a3a" : "#e8e4dc");
      for (const [x, y] of [[14, 9], [28, 14], [13, 8]]) p.set(x, y, "#d8b890"); // splinters
      for (let i = 0; i < 12; i++) p.set(3 + Math.floor(hash(i, 90) * 26), 14 + Math.floor(hash(i, 91) * 4), i % 2 ? "#8a8478" : "#4a453c");
    }
    cache.set(key, spriteSvg(p));
  }
  return cache.get(key).replace("<svg ", `<svg class="nw-structure-sprite" style="width:${sizePx}px;height:auto" `);
}
