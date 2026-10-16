// The Night Watch board's art: the school's front at night, drawn in code as pixel art in the
// campus colours (cream walls, blue trim, the red sign), then lit — moonlight everywhere, a warm
// glow from the lit windows — and small pixel sprites for the defenses built on it. The board is
// the entrance grid: the school's doors across the top, the front steps, the lawn of the courtyard,
// the pavement and the road the horde comes up (data.js ENTRANCE_ZONES). Nothing stands in the
// lanes but what's placed there.

import { shadowOf, lightOf, mix } from "./sprite.js";
import { ENTRANCE_ROWS, ENTRANCE_ZONES, DEFENSE_ROW0, STREET_ROW0 } from "./data.js";

// The art's bands, by row: the front steps, the lawn, the pavement and the road.
const STEP_ROWS = ENTRANCE_ZONES.steps;
const LAWN_ROW0 = STEP_ROWS;
const PAVEMENT_ROW0 = DEFENSE_ROW0;
const ROAD_ROW0 = STREET_ROW0;
import { hash, hash2, buffer, lightUp, bayer } from "./lighting.js";

// Art pixels: each square is CELL_W x CELL_H, under a facade FACADE_H tall, with a MARGIN either
// side of the squares for the stairs' side walls (the squares start and end at the handrails).
export const CELL_W = 32;
export const CELL_H = 20;
export const FACADE_H = 26;
export const MARGIN = 8;

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

// One classroom window on the facade, `h` tall: lit (curtains, someone's silhouette, a bloody
// handprint), dark, broken or boarded up.
function facadeWindow(p, x, y0, kind, lights, h = 16) {
  const y1 = y0 + h;
  const at = (f) => y0 + Math.round(h * f); // a height inside it, as a share of it
  p.r(x - 1, y0 - 1, x + 14, y0 - 1, STONE_LT); // lintel
  p.r(x, y0, x + 13, y1, shadowOf(TRIM)); // frame
  const gx0 = x + 1, gx1 = x + 12, gy0 = y0 + 1, gy1 = y1 - 1;
  if (kind.startsWith("lit")) {
    for (let y = gy0; y <= gy1; y++) p.r(gx0, y, gx1, y, LIT[Math.min(3, Math.floor(((y - gy0) / (gy1 - gy0 + 1)) * 4))], 1);
    if (kind === "lit") {
      for (let y = gy0; y <= gy1; y++) {
        p.r(gx0, y, gx0 + 1, y, y % 2 ? "#d8805a" : "#c86a4a", 1); // curtains
        p.r(gx1 - 1, y, gx1, y, y % 2 ? "#d8805a" : "#c86a4a", 1);
      }
    }
    if (kind === "litFigure") {
      p.oval(x + 4, at(0.5), 1.4, 1.5, "#2a1e1a", 1);
      p.r(x + 2, at(0.5) + 2, x + 6, gy1, "#2a1e1a", 1);
    }
    if (kind === "litHand") {
      for (const [dx, dy] of [[9, 2], [10, 2], [9, 3], [10, 3], [8, 1], [9, 0], [10, 0], [11, 1], [10, 4], [10, 5], [9, 6]]) p.set(x + dx, at(0.2) + dy, "#9a2424", 1);
    }
    lights.push({ x: x + 7, y: at(0.5), r: 17, k: 0.55, c: WARM });
  } else {
    p.r(gx0, gy0, gx1, gy1, GLASS_DARK, 1);
    for (let i = 0; i < 4; i++) p.set(gx0 + 1 + i, gy0 + 4 - i, "#3a4c7a", 1); // the moon on the glass
    p.set(gx1 - 2, gy0 + 1, "#6a80b8", 1);
    if (kind === "broken") {
      const cy = at(0.62);
      for (let y = at(0.44); y <= y1 - 3; y++) for (let xx = x + 7; xx <= x + 11; xx++) if (hash2(xx, y, 3) < 0.7 - Math.abs(y - cy) * 0.1) p.set(xx, y, "#070a14", 1);
      for (const [dx, f] of [[6, 0.5], [8, 0.38], [11, 0.44], [7, 0.8], [12, 0.75], [9, 0.88]]) p.set(x + dx, at(f), "#8ea6d4", 1);
    }
  }
  p.r(x + 6, gy0, x + 7, gy1, shadowOf(TRIM)); // mullions
  p.r(gx0, at(0.45), gx1, at(0.45), shadowOf(TRIM));
  p.r(x, y0, x + 13, y0, TRIM);
  if (kind === "boarded") {
    for (const py of [at(0.18), at(0.62)]) {
      p.r(x - 1, py, x + 14, py + 2, "#9a6a3a");
      p.r(x - 1, py, x + 14, py, "#c08a50");
      p.r(x - 1, py + 2, x + 14, py + 2, "#5e3e22");
      for (const nx of [x, x + 13]) p.set(nx, py + 1, "#d0d4dc");
      for (let gx = x + 2; gx < x + 13; gx += 4) p.set(gx + (py % 3), py + 1, "#86592e");
    }
    p.line(x, y1 - 2, x + 13, y0 + 1, "#8a5f33");
    p.line(x + 1, y1 - 2, x + 13, y0 + 2, "#5e3e22");
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
  const W = cols * CELL_W + 2 * MARGIN;
  const H = FACADE_H + ENTRANCE_ROWS * CELL_H;
  const rowY = (row) => FACADE_H + row * CELL_H;
  const mid = Math.round(W / 2);
  const p = buffer(W, H);
  const lights = [];

  // ===== the school's front (no roofline: the wall runs off the top of the board) =====
  // the wings: cream walls
  p.r(0, 0, W - 1, 21, WALL);
  for (let i = 0; i < W * 2; i++) p.set(Math.floor(hash(i, 42) * W), Math.floor(hash(i, 43) * 22), mix(WALL, "#c8bfa8", 0.5));
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
      p.r(px, 0, px + 2, 21, WALL_LT);
      p.r(px + 2, 0, px + 2, 21, mix(WALL, WALL_DK, 0.6));
    });
    xs.forEach((x, i) => facadeWindow(p, x, 3, kinds[i % kinds.length], lights, 14));
  }
  // corner quoins
  for (let y = 1; y <= 19; y += 4) {
    p.r(0, y, 2, y + 1, STONE_LT);
    p.r(W - 3, y, W - 1, y + 1, STONE_LT);
  }
  // the entrance block in the middle: a lighter wall, lit on its left edge, its shadow on the right
  p.r(cb0, 0, cb1, 21, WALL_LT);
  p.r(cb0, 0, cb0 + 2, 21, "#fbf8f0");
  p.r(cb1 - 2, 0, cb1, 21, mix(WALL_LT, WALL_DK, 0.45));
  p.r(cb1 + 1, 0, cb1 + 2, 21, WALL_DK);
  // the red sign over the doors
  p.r(mid - 14, 0, mid + 14, 6, "#8a2a2a");
  p.r(mid - 13, 1, mid + 13, 5, "#d64545");
  p.r(mid - 13, 1, mid + 13, 1, lightOf("#d64545"));
  text(p, "SCHOOL", mid - 11, 1, WALL_LT);
  for (const [x, y] of [[mid - 13, 1], [mid + 13, 1], [mid - 13, 5], [mid + 13, 5]]) p.set(x, y, "#f4d35e");
  // the doors: steel double doors in a dark frame, a lit transom, chained shut
  const d0 = mid - 17;
  const d1 = mid + 16;
  p.r(d0, 8, d1, 25, "#2c3444");
  p.r(d0, 8, d0, 25, "#3e4a60");
  p.r(d0 + 2, 9, d1 - 2, 10, LIT[1], 1);
  p.r(d0 + 2, 9, d1 - 2, 9, LIT[0], 1);
  for (let x = d0 + 7; x < d1 - 2; x += 6) p.r(x, 9, x, 10, "#2c3444");
  for (const [l0, l1] of [[d0 + 2, mid - 1], [mid, d1 - 2]]) {
    p.r(l0, 11, l1, 25, "#5a7fa0");
    p.r(l0, 11, l1, 11, "#7a9fc0");
    p.r(l0 + 1, 12, l0 + 1, 24, "#6a8fb0");
    p.r(l0 + 2, 13, l1 - 2, 13, "#46688a");
    p.r(l0 + 2, 23, l1 - 2, 23, "#46688a");
    p.r(l0 + 2, 13, l0 + 2, 23, "#46688a");
    p.r(l1 - 2, 13, l1 - 2, 23, "#46688a");
    p.r(l0 + 1, 19, l1 - 1, 19, "#c8d0dc"); // push bar
    p.r(l0 + 1, 20, l1 - 1, 20, "#3f5f7f");
    p.r(l0, 24, l1, 24, "#8aa0b8"); // kick plate
  }
  for (const wx of [d0 + 5, d1 - 7]) {
    p.r(wx, 14, wx + 2, 17, LIT[2], 1);
    p.r(wx, 14, wx + 2, 14, LIT[0], 1);
    p.set(wx + 1, 16, LIT[3], 1);
  }
  p.r(mid - 1, 11, mid, 25, "#22303f"); // the seam
  for (let x = mid - 9; x <= mid + 8; x++) p.set(x, 17 + (Math.abs(x - mid + 0.5) < 6 ? 1 : 0), x % 2 ? "#9aa0a8" : "#6a7078"); // the chain
  p.r(mid - 2, 19, mid + 1, 21, "#d8b040");
  p.r(mid - 2, 19, mid + 1, 19, "#f4d35e");
  p.set(mid - 1, 20, "#7a5a1a");
  for (let i = 0; i < 3; i++) p.line(d0 + 4 + i * 2, 23, d0 + 7 + i * 2, 20, "#2e4058"); // claw marks
  for (const [x, y] of [[d1 - 5, 20], [d1 - 4, 21], [d1 - 5, 22], [d1 - 4, 23], [d1 - 6, 21], [d1 - 4, 24]]) p.set(x, y, BLOOD);
  // ivy up the corners
  for (let y = 2; y <= 25; y++) {
    const reach = Math.round(((y - 2) / 23) * 7);
    for (let x = 0; x <= reach; x++) if (hash2(x, y, 44) < 0.5) p.set(x, y, hash2(x, y, 45) < 0.3 ? "#5a9a54" : "#3f7a42");
    const reachR = Math.round(((y - 9) / 16) * 4);
    for (let x = 0; x <= reachR; x++) if (hash2(x, y, 46) < 0.45) p.set(W - 1 - x, y, hash2(x, y, 47) < 0.3 ? "#5a9a54" : "#3f7a42");
  }
  // the plinth, some graffiti, a bloody hand dragged down the wall
  p.r(0, 22, d0 - 1, 25, "#b0a894");
  p.r(d1 + 1, 22, W - 1, 25, "#b0a894");
  p.r(0, 22, d0 - 1, 22, "#cfc7b4");
  p.r(d1 + 1, 22, W - 1, 22, "#cfc7b4");
  for (let x = 6; x < W; x += 14) if (x < d0 || x > d1) p.r(x, 23, x, 25, "#8e8676");
  p.r(0, 25, d0 - 1, 25, "#8e8676");
  p.r(d1 + 1, 25, W - 1, 25, "#8e8676");
  p.r(d0, 25, d1, 25, STONE_LT); // threshold
  text(p, "HELP", 28 + MARGIN, 21, "#c23838");
  const hx = W - 46;
  for (const [dx, dy] of [[0, 10], [1, 10], [0, 11], [1, 11], [-1, 9], [0, 8], [1, 8], [2, 9]]) p.set(hx + dx, dy, BLOOD);
  for (let y = 12; y <= 19; y++) if (hash(y, 48) < 0.8) p.r(hx, y, hx + (y < 15 ? 1 : 0), y, BLOOD);

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
  const yardEnd = rowY(PAVEMENT_ROW0); // the edging, where the lawn meets the pavement
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
  // bushes down both sides of the lawn, past the rails' line
  for (const side of [0, 1]) {
    for (let i = 0; i < 5; i++) {
      const cx = side ? W - 4 - Math.round(hash(i, 130 + side) * 3) : 3 + Math.round(hash(i, 130 + side) * 3);
      const cy = yardTop + 3 + i * 8 + Math.round(hash(i, 132 + side) * 3);
      const rx = 6 + Math.round(hash(i, 134 + side) * 2);
      p.oval(cx, cy + 1, rx, 5, "#24482a");
      p.oval(cx, cy, rx - 1, 4.5, "#2f5e34");
      for (let k = 0; k < 18; k++) {
        const x = cx - rx + Math.floor(hash2(i * 31 + k, side, 135) * rx * 2);
        const y = cy - 4 + Math.floor(hash2(i * 17 + k, side, 136) * 7);
        if (((x - cx) / rx) ** 2 + ((y - cy) / 4.5) ** 2 <= 1) p.set(x, y, hash2(x, y, 137) < 0.45 ? "#3f7a42" : y < cy - 1 ? "#5a9a54" : "#356b3a");
      }
      if (hash(i, 138 + side) < 0.5) p.set(cx + (side ? -2 : 2), cy - 2, ["#e98fb0", "#f4f4f4", "#c83a3a"][i % 3]); // a flower or a berry
    }
  }
  // the stone edging
  p.r(0, yardEnd, W - 1, yardEnd + 1, "#b8ae96");
  p.r(0, yardEnd, W - 1, yardEnd, STONE_LT);
  for (let x = 4; x < W; x += 10) p.set(x, yardEnd + 1, "#968c76");

  // ===== the pavement: square slabs on the board's grid (two a square each way), a kerb =====
  const sideTop = yardEnd + 2;
  const kerbY = rowY(ROAD_ROW0) - 3;
  const slabRows = [sideTop];
  for (let row = PAVEMENT_ROW0; row < ROAD_ROW0; row++) slabRows.push(rowY(row) + 10, rowY(row + 1));
  slabRows[slabRows.length - 1] = kerbY; // (the last one ends at the kerb)
  for (let r = 0; r + 1 < slabRows.length; r++) {
    const y0 = r === 0 ? sideTop : slabRows[r] + 1;
    const y1 = slabRows[r + 1] - 1;
    for (let x0 = (MARGIN % 16) - 16; x0 < W; x0 += 16) { // (on the squares' grid)
      const tone = ["#a6a298", "#a29e94", "#9c988e", "#aaa69c"][Math.floor(hash2(x0, r, 100) * 4)];
      p.r(x0, y0, x0 + 15, y1, tone);
      for (let i = 0; i < 18; i++) p.set(x0 + Math.floor(hash2(i, x0 + r * 97, 101) * 16), y0 + Math.floor(hash2(i, x0 + r * 89, 102) * (y1 - y0 + 1)), hash(i + x0, 103 + r) < 0.5 ? "#929086" : "#b2aea4");
      p.r(x0, y0, x0 + 15, y0, mix(tone, "#ffffff", 0.12)); // a lit top edge
      p.r(x0 + 15, y0, x0 + 15, y1, "#86827a"); // the joint
      if (hash2(x0, r, 104) < 0.18) { // a crack across it
        let cx = x0 + 3 + Math.floor(hash2(x0, r, 105) * 10);
        for (let y = y0 + 1; y < y1; y++) {
          p.set(cx, y, "#77736b");
          cx += hash2(cx, y, 106) < 0.5 ? -1 : 1;
          cx = Math.max(x0 + 1, Math.min(x0 + 14, cx));
        }
      }
      if (hash2(x0, r, 107) < 0.3) for (let y = y0; y <= Math.min(y1, y0 + 2); y++) p.set(x0 + 15, y, "#5a8a4a"); // weeds in the joint
    }
    if (r > 0) p.r(0, y0 - 1, W - 1, y0 - 1, "#86827a");
  }
  // a chalk hopscotch someone drew before it all went wrong
  const hop = W - 58;
  const chalk = (x0, y0, x1, y1) => {
    for (let x = x0; x <= x1; x++) for (const y of [y0, y1]) if (hash2(x, y, 108) < 0.8) p.set(x, y, "#d8d2e6");
    for (let y = y0; y <= y1; y++) for (const x of [x0, x1]) if (hash2(x, y, 109) < 0.8) p.set(x, y, "#d8d2e6");
  };
  const hy = sideTop + 3;
  chalk(hop, hy, hop + 7, hy + 6);
  chalk(hop - 4, hy + 6, hop + 3, hy + 12);
  chalk(hop + 3, hy + 6, hop + 11, hy + 12);
  chalk(hop, hy + 12, hop + 7, hy + 18);
  for (const [dx, dy] of [[3, 2], [3, 3], [3, 4], [0, 8], [1, 9], [7, 8], [8, 9], [3, 14], [4, 15]]) p.set(hop + dx, hy + dy, "#e6a8c8"); // the numbers, smudged
  // tactile paving where the path meets the crossing
  for (let y = kerbY - 5; y < kerbY; y++) for (let x = pa; x <= pb; x++) p.set(x, y, (x + y) % 3 ? "#c8a838" : "#e4c458");
  // fallen leaves, a dropped schoolbag's papers, the blood trail carrying on
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(hash(i, 110) * (W - 2));
    const y = sideTop + Math.floor(hash(i, 111) * (kerbY - sideTop - 2));
    const c = ["#b8642a", "#c88a30", "#8a4a22", "#a8743a"][i % 4];
    p.set(x, y, c);
    p.set(x + 1, y + (i % 2), c);
  }
  for (const [x, y] of [[34, sideTop + 9], [40, sideTop + 21]]) {
    p.r(x, y, x + 3, y + 2, "#e8e4d8");
    p.r(x + 1, y + 1, x + 2, y + 1, "#9aa8c0");
  }
  for (let y = sideTop; y < kerbY; y++) if (hash(y, 112) < 0.4) p.set(mid - 3 + Math.round(Math.sin(y / 6) * 2), y, BLOOD);
  // the kerb, a storm drain in it
  p.r(0, kerbY, W - 1, kerbY, "#d2cec4");
  p.r(0, kerbY + 1, W - 1, kerbY + 1, "#a8a49a");
  p.r(0, kerbY + 2, W - 1, kerbY + 2, "#26292f");
  for (let x = 10; x < W; x += 16) p.set(x, kerbY + 1, "#8e8a80");
  p.r(20, kerbY, 33, kerbY + 2, "#16181d");
  for (let x = 21; x < 33; x += 2) p.r(x, kerbY, x, kerbY + 1, "#5a5e66");

  // ===== the road: two lanes, the crossing from the school path, SCHOOL painted on it =====
  const roadTop = rowY(ROAD_ROW0);
  const roadH = H - roadTop;
  p.r(0, roadTop, W - 1, H - 1, "#434750");
  for (let i = 0; i < W * 4; i++) p.set(Math.floor(hash(i, 113) * W), roadTop + Math.floor(hash(i, 114) * (H - roadTop)), hash(i, 115) < 0.5 ? "#4c505a" : "#3a3e46");
  p.r(0, roadTop, W - 1, roadTop + 1, "#3a3d45"); // the gutter
  // patched tarmac, potholes, cracks
  for (const [x, y, w, h] of [[W * 0.18, roadTop + 6, 14, 7], [W * 0.7, roadTop + roadH - 9, 11, 6]]) p.r(Math.round(x), y, Math.round(x) + w, y + h, "#3d4048");
  for (const [x, y] of [[W - 8, roadTop + roadH - 5], [W * 0.28, roadTop + 9]]) {
    p.oval(Math.round(x), y, 3.5, 1.6, "#26282e");
    p.r(Math.round(x) - 2, y - 1, Math.round(x) + 2, y - 1, "#2e3036");
  }
  for (let c = 0; c < 5; c++) {
    let cx = Math.floor(hash(c, 116) * W);
    for (let cy = roadTop + 2 + c * 6; cy < H; cy++) {
      if (hash2(cx, cy, 117) < 0.2) break;
      p.set(cx, cy, "#2a2d33");
      cx += hash2(cx, cy, 118) < 0.5 ? -1 : 1;
    }
  }
  // the lane line between the road's rows (if it has two), broken by the crossing
  const laneY = rowY(ROAD_ROW0 + 1);
  if (laneY < H) for (let x = 0; x < W; x++) if ((x + 3) % 16 < 9 && (x < pa - 3 || x > pb + 3) && hash2(x, laneY, 119) > 0.1) p.r(x, laneY - 1, x, laneY, "#d8c060");
  // the zebra crossing
  for (let x = pa + 1; x <= pb; x++) if ((x - pa - 1) % 7 < 4) for (let y = roadTop + 3; y < H; y++) if (hash2(x, y, 120) > 0.05) p.set(x, y, hash2(x, y, 126) < 0.12 ? "#b8b8b0" : "#d4d4cc");
  // SCHOOL in faded paint on the near lane
  const sx = pb + 14;
  [..."SCHOOL"].forEach((ch, i) => FONT[ch].forEach((row, dy) => [...row].forEach((b, dx) => {
    if (b !== "1") return;
    for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) if (hash2(sx + i * 8 + dx * 2 + xx, dy * 2 + yy, 121) > 0.22) p.set(sx + i * 8 + dx * 2 + xx, roadTop + 5 + dy * 2 + yy, "#b8b4a8");
  })));
  // skid marks, a manhole, puddles catching the moon, glass and litter
  for (let x = 8; x < 62; x++) {
    const y = roadTop + 12 + Math.round(Math.sin(x / 14) * 3);
    if (hash2(x, y, 122) < 0.8) { p.set(x, y, "#2c2f35"); p.set(x, y + 4, "#2c2f35"); }
  }
  const mh = pa - 12; // the manhole, left of the crossing
  p.oval(mh, H - 9, 5, 2.4, "#373a41");
  p.oval(mh, H - 9, 3.4, 1.3, "#4a4e56");
  p.r(mh - 4, H - 9, mh + 4, H - 9, "#30333a");
  for (const [x, y, rx] of [[30, H - 5, 7], [W * 0.56, roadTop + 7, 6]]) {
    p.oval(Math.round(x), y, rx, 1.8, "#1e2a48", 1);
    p.r(Math.round(x) - 3, y, Math.round(x) - 1, y, "#5a70a8", 1);
    p.set(Math.round(x) + 2, y - 1, "#8ea6d4", 1);
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i, 123) * W);
    const y = roadTop + 3 + Math.floor(hash(i, 124) * (H - roadTop - 5));
    if (i % 3 === 0) p.set(x, y, "#a8c8e8", 1); // a glint of broken glass
    else p.r(x, y, x + 1, y, i % 2 ? "#d8d8d0" : "#3a2a20");
  }
  for (let y = roadTop; y < H; y++) if (hash(y, 125) < 0.45) p.set(mid - 2 + Math.round(Math.sin(y / 5) * 1.5), y, "#6a1818");
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

// ---------- Turn 2: the inside of a place, for an expedition's fight ----------
// The same squares as the Night Watch board: the wall the team came in through across the top (the
// doorway, the dusk behind it), shelves down the sides, the floor running off into the dark the
// zombies come out of — lit only by the team's torches, a beam down each lane. Wooden floors in
// homes and barns, a tiled one everywhere else — and in the school's own rooms (ground "school",
// Turn 1's clearing fights): the campus colours, a chalkboard, lockers and the desks knocked over.
const ROOM_LOOK = {
  school: { wall: WALL, trim: TRIM, floor: ["#c9c3b0", "#aea896"], seam: "#8f8a7a" },
  wood: { wall: "#8e7a68", trim: "#5a4636", floor: ["#8a6440", "#7a5634"], seam: "#4a3220" },
  tile: { wall: "#8fa39a", trim: "#4e5e58", floor: ["#b8b4a8", "#9a968c"], seam: "#77746b" },
};
const WOODEN = ["houses", "apartments", "field", "park"];
export function roomBackground(cols, rows, ground = "", seed = 1) {
  if (["farm", "barn", "scrapyard"].includes(ground)) return yardBackground(cols, rows, ground);
  const kind = ground === "school" ? "school" : WOODEN.includes(ground) ? "wood" : "tile";
  const key = `room${cols}x${rows}:${kind}:${seed}`;
  if (cache.has(key)) return cache.get(key);
  const L = ROOM_LOOK[kind];
  const W = cols * CELL_W + 2 * MARGIN;
  const H = FACADE_H + rows * CELL_H;
  const mid = Math.round(W / 2);
  const p = buffer(W, H);
  const lights = [];

  // the floor
  for (let y = FACADE_H; y < H; y++) {
    const fy = y - FACADE_H;
    for (let x = 0; x < W; x++) {
      let c;
      if (kind === "wood") {
        const plank = Math.floor(fy / 5);
        const joint = (x + plank * 13) % 29 === 0;
        c = fy % 5 === 4 || joint ? L.seam : mix(L.floor[0], L.floor[1], hash(plank * 7 + Math.floor((x + plank * 13) / 29), seed));
        if (hash2(x, y, seed + 3) < 0.07) c = mix(c, L.seam, 0.4);
      } else {
        c = x % 8 === 0 || fy % 8 === 0 ? L.seam : L.floor[(Math.floor(x / 8) + Math.floor(fy / 8)) % 2];
        if (hash2(x, y, seed) < 0.06) c = mix(c, "#4a463e", 0.5);
      }
      p.set(x, y, c);
    }
  }
  // what's left on it: papers, cans, a blood trail off into the dark
  for (let i = 0; i < 10; i++) {
    const x = 4 + Math.floor(hash(i, seed + 11) * (W - 8));
    const y = FACADE_H + 6 + Math.floor(hash(i, seed + 12) * (H - FACADE_H - 10));
    if (i % 3) p.r(x, y, x + 2, y + 1, i % 2 ? "#e8e4d8" : "#d8d0b8");
    else p.r(x, y, x + 1, y + 1, ["#c84a3a", "#3a7ac8", "#d8b040"][i % 3 === 0 ? Math.floor(hash(i, seed + 13) * 3) : 0]);
  }
  // the desks, shoved about and knocked over
  if (kind === "school") for (let i = 0; i < 2 + cols * 2; i++) {
    const x = MARGIN + 2 + Math.floor(hash(i, seed + 30) * (cols * CELL_W - 12));
    const y = FACADE_H + 8 + Math.floor(hash(i, seed + 31) * (H - FACADE_H - 22));
    const over = hash(i, seed + 32) < 0.5;
    p.r(x, y, x + 7, y + 2, "#b08a5a");
    p.r(x, y + 2, x + 7, y + 2, "#7a5a38");
    for (const lx of [x + 1, x + 6]) p.r(lx, over ? y - 3 : y + 3, lx, over ? y - 1 : y + 5, "#6a6a72");
  }
  const trail = MARGIN + Math.floor(hash(1, seed + 14) * cols) * CELL_W + 10 + Math.floor(hash(2, seed + 14) * 12);
  for (let y = FACADE_H + 30; y < H; y++) if (hash(y, seed + 15) < 0.45) p.set(trail + Math.round(Math.sin(y / 6) * 3), y, BLOOD);
  p.oval(trail + 2, FACADE_H + 28, 3, 2, BLOOD);

  // shelves down both sides (past the squares)
  for (const [a, b] of [[0, MARGIN - 1], [W - MARGIN, W - 1]]) {
    if (kind === "school") { // (lockers)
      p.r(a, FACADE_H, b, H - 1, "#4a6a8a");
      for (let y = FACADE_H; y < H; y += 14) {
        p.r(a, y, b, y, "#2e4560");
        for (let k = 2; k <= 6; k += 2) p.r(a + 2, y + k, b - 2, y + k, "#3a5676");
        p.set(b - 2, y + 9, "#c8d0d8");
      }
      continue;
    }
    p.r(a, FACADE_H, b, H - 1, "#3a3a42");
    for (let y = FACADE_H + 4; y < H; y += 9) {
      p.r(a, y, b, y, "#5a5a66");
      for (let x = a + 1; x < b; x += 2) if (hash2(x, y, seed + 16) < 0.55) p.r(x, y - 3, x, y - 1, ["#c84a3a", "#e0c060", "#4a8ac8", "#8ac860", "#d8d0c0"][Math.floor(hash2(x, y, seed + 17) * 5)]);
    }
  }

  // the wall they came in through
  p.r(0, 0, W - 1, FACADE_H - 1, L.wall);
  for (let i = 0; i < W * 2; i++) p.set(Math.floor(hash(i, seed + 20) * W), Math.floor(hash(i, seed + 21) * (FACADE_H - 3)), mix(L.wall, L.trim, 0.3));
  p.r(0, FACADE_H - 3, W - 1, FACADE_H - 1, L.trim); // skirting
  p.r(0, FACADE_H - 3, W - 1, FACADE_H - 3, mix(L.trim, "#ffffff", 0.2));
  // the doorway: dusk outside, the door kicked open
  const d0 = mid - 8;
  const d1 = mid + 7;
  p.r(d0 - 1, 3, d1 + 1, FACADE_H - 1, "#2a2420");
  const school = kind === "school";
  for (let y = 4; y < FACADE_H; y++) p.r(d0, y, d1, y, school ? mix("#c8d0dc", "#7a8498", (y - 4) / (FACADE_H - 4)) : mix("#f0a860", "#a85a48", (y - 4) / (FACADE_H - 4)), 1);
  p.r(d0, FACADE_H - 6, d1, FACADE_H - 1, school ? "#8a8478" : "#4a3a3a", 1); // the corridor's floor / the street's far side
  p.r(d1 + 2, 4, d1 + 5, FACADE_H - 2, "#6a4a30");
  p.r(d1 + 2, 4, d1 + 2, FACADE_H - 2, "#8a6440");
  lights.push({ x: mid, y: FACADE_H, r: 30, sy: 1.4, k: 0.5, c: school ? [0.85, 0.9, 1.0] : [1.0, 0.72, 0.45] });
  if (school) {
    // the chalkboard, the last lesson still on it, and the clock
    p.r(3, 3, d0 - 5, 16, "#8a6440");
    p.r(4, 4, d0 - 6, 15, "#2f4a3a");
    for (const [y, len] of [[6, 0.7], [8, 0.5], [10, 0.8], [12, 0.4]]) p.r(6, y, 6 + Math.round((d0 - 14) * len), y, "#a8b8a8");
    p.r(4, 16, d0 - 6, 16, "#c8c0b0"); // the chalk ledge
    p.oval(W - 14, 9, 4, 4, "#f4f0e4");
    p.oval(W - 14, 9, 4, 4, "#2a2a2a");
    p.oval(W - 14, 9, 3, 3, "#f4f0e4");
    p.r(W - 14, 7, W - 14, 9, "#2a2a2a");
    p.r(W - 14, 9, W - 12, 9, "#2a2a2a");
    for (const [dx, dy] of [[0, 0], [1, 1], [0, 2], [2, 1], [1, 3]]) p.set(W - 24 + dx, 14 + dy, "#5a1818"); // a handprint
  } else {
    // a sign and a poster either side of it
    p.r(6, 5, 22, 10, "#d8d0b8");
    p.r(7, 7, 21, 7, "#6a6a72");
    p.r(7, 9, 16, 9, "#6a6a72");
    p.r(W - 22, 4, W - 9, 15, "#c84a3a");
    p.r(W - 20, 6, W - 11, 13, "#e8c8a0");
    p.line(W - 19, 12, W - 12, 7, "#5a2a2a");
    for (const [dx, dy] of [[0, 0], [1, 1], [0, 2], [2, 1], [1, 3]]) p.set(14 + dx, 13 + dy, "#5a1818"); // a handprint
  }

  // the far end: dark, darker the further in
  for (let y = H - CELL_H * 2; y < H; y++) {
    const t = (y - (H - CELL_H * 2)) / (CELL_H * 2);
    for (let x = 0; x < W; x++) if (bayer(x, y) < t * 0.9) p.set(x, y, mix(p.col[y * W + x] || "#000000", "#06060a", 0.7));
  }

  // the team's torches, a beam down each lane
  for (let col = 0; col < cols; col++) {
    lights.push({ x: MARGIN + col * CELL_W + CELL_W / 2, y: FACADE_H + CELL_H, len: (rows - 1) * CELL_H, w0: 5, spread: 0.32, k: 0.42, c: [1.0, 0.94, 0.75] });
  }
  const url = `url('${lightUp(p, lights, { ambient: [0.2, 0.22, 0.34], mist: false })}')`;
  cache.set(key, url);
  return url;
}

// The tutorial's last fight: the Headmaster's Office as a raid arena — the door they came in by at
// the top, oak panels and two old headmasters' portraits; a parquet floor for the squad with a long
// carpet down the middle lane; and at the far end his dais, a magic circle burning green on it,
// candles all round, cracks glowing out across the floor. Bookcases down both sides, and the moon
// through the tall windows beside the dais.
export function officeArena(cols, rows) {
  const key = `arena${cols}x${rows}`;
  if (cache.has(key)) return cache.get(key);
  const W = cols * CELL_W + 2 * MARGIN;
  const H = FACADE_H + rows * CELL_H;
  const mid = Math.round(W / 2);
  const DAIS = FACADE_H + (rows - 1) * CELL_H; // the last row: his
  const p = buffer(W, H);
  const lights = [];
  const GREEN = "#7dff9a";

  // the floor: dark oak parquet, blocks staggered row by row
  for (let y = FACADE_H; y < DAIS; y++) {
    const band = Math.floor((y - FACADE_H) / 4);
    for (let x = 0; x < W; x++) {
      const off = band % 2 ? 0 : 3;
      const block = Math.floor((x + off) / 7);
      const seam = (y - FACADE_H) % 4 === 3 || (x + off) % 7 === 0;
      let c = seam ? "#22140c" : mix("#4a2e1c", "#5e3c26", hash(block * 13 + band * 7, 3));
      if (!seam && hash2(x, y, 9) < 0.06) c = mix(c, "#7a5236", 0.4); // the polish catching the light
      p.set(x, y, c);
    }
  }
  // the carpet down the middle lane: deep red, gold edging, a diamond every few squares
  const c0 = MARGIN + CELL_W + 4;
  const c1 = MARGIN + 2 * CELL_W - 5;
  p.r(c0, FACADE_H, c1, DAIS - 1, "#6a1820");
  p.r(c0, FACADE_H, c0, DAIS - 1, "#c9a43a");
  p.r(c1, FACADE_H, c1, DAIS - 1, "#c9a43a");
  for (let y = FACADE_H + 6; y < DAIS - 4; y += 10) {
    p.set(mid, y, "#c9a43a");
    p.r(mid - 1, y + 1, mid + 1, y + 1, "#a8323c");
    p.r(mid - 2, y + 2, mid + 2, y + 2, "#c9a43a");
    p.r(mid - 1, y + 3, mid + 1, y + 3, "#a8323c");
    p.set(mid, y + 4, "#c9a43a");
  }
  // what the fight before this left: papers, a fallen book, a snapped chair leg
  for (let i = 0; i < 14; i++) {
    const x = MARGIN + 2 + Math.floor(hash(i, 41) * (cols * CELL_W - 6));
    const y = FACADE_H + 2 * CELL_H + Math.floor(hash(i, 42) * (CELL_H * 3 - 4));
    if (i % 4 === 0) p.r(x, y, x + 3, y + 2, ["#3a5a8a", "#8a2a2a", "#2a6a4a"][i % 3]); // a book
    else if (i % 4 === 1) p.r(x, y, x + 5, y, "#5a3a24");
    else p.r(x, y, x + 2, y + 1, "#e8e2d0");
  }
  // cracks spreading from the dais, glowing faintly where his magic got in
  for (let k = 0; k < 5; k++) {
    let x = MARGIN + 6 + Math.floor(hash(k, 51) * (cols * CELL_W - 12));
    for (let y = DAIS - 1; y > DAIS - CELL_H * 2 + Math.floor(hash(k, 52) * 10); y--) {
      x += hash(y, k + 53) < 0.33 ? -1 : hash(y, k + 54) < 0.5 ? 1 : 0;
      p.set(x, y, "#140c08");
      if (hash(y, k + 55) < 0.35) p.set(x + 1, y, GREEN, 1);
    }
  }

  // the dais: two steps up to dark stone, the magic circle burning on it
  p.r(0, DAIS, W - 1, H - 1, "#2e2838");
  for (let y = DAIS + 3; y < H; y++) for (let x = 0; x < W; x++) {
    if ((x + (Math.floor((y - DAIS) / 5) % 2) * 4) % 8 === 0 || (y - DAIS) % 5 === 2) p.set(x, y, "#221e2a");
    else if (hash2(x, y, 61) < 0.05) p.set(x, y, "#3e3650");
  }
  p.r(0, DAIS, W - 1, DAIS, "#5a5270");
  p.r(0, DAIS + 1, W - 1, DAIS + 2, "#3e3650");
  const cy = DAIS + 11;
  for (let a = 0; a < 360; a += 3) {
    const t = (a * Math.PI) / 180;
    p.set(mid + Math.round(Math.cos(t) * 14), cy + Math.round(Math.sin(t) * 6), GREEN, 1);
    if (a % 6 === 0) p.set(mid + Math.round(Math.cos(t) * 10), cy + Math.round(Math.sin(t) * 4), "#4acf6a", 1);
  }
  for (let i = 0; i < 6; i++) { // runes round it, and the star inside
    const t = (i / 6) * Math.PI * 2;
    const rx = mid + Math.round(Math.cos(t) * 12);
    const ry = cy + Math.round(Math.sin(t) * 5);
    p.r(rx, ry - 1, rx, ry, "#b8ffc8", 1);
    const t2 = ((i + 2) / 6) * Math.PI * 2;
    p.line(mid + Math.round(Math.cos(t) * 9), cy + Math.round(Math.sin(t) * 3.5), mid + Math.round(Math.cos(t2) * 9), cy + Math.round(Math.sin(t2) * 3.5), "#3a9a5a", 1);
  }
  lights.push({ x: mid, y: cy, r: 40, sy: 0.55, k: 0.85, c: [0.45, 1.0, 0.6] });
  // candles round the dais: a stick, a drip, a flame
  for (const cx of [MARGIN + 3, MARGIN + CELL_W - 3, MARGIN + 2 * CELL_W + 3, W - MARGIN - 4, mid - 18, mid + 18]) {
    const by = DAIS + (cx === mid - 18 || cx === mid + 18 ? 15 : 6);
    p.r(cx, by - 4, cx + 1, by, "#e8e0c8");
    p.set(cx + 1, by - 2, "#f4efe2");
    p.r(cx, by - 6, cx + 1, by - 5, "#ffd27a", 1);
    p.set(cx, by - 7, "#fff0b8", 1);
    lights.push({ x: cx, y: by - 5, r: 13, sy: 0.8, k: 0.55, c: WARM });
  }

  // bookcases down both sides — and, beside the dais, the tall windows and the moon
  for (const [a, b] of [[0, MARGIN - 1], [W - MARGIN, W - 1]]) {
    p.r(a, FACADE_H, b, DAIS - 1, "#2a1a10");
    for (let y = FACADE_H + 2; y < DAIS - 1; y += 9) {
      p.r(a, y + 7, b, y + 7, "#4a2e1c");
      for (let x = a + 1; x < b; x++) if (hash2(x, y, 71) < 0.8) p.r(x, y + 2 + Math.floor(hash2(x, y, 72) * 2), x, y + 6, ["#7a2a2a", "#2a4a7a", "#2a6a3a", "#c9a43a", "#5a3a6a", "#8a7a5a"][Math.floor(hash2(x, y, 73) * 6)]);
    }
    p.r(a + 1, DAIS - 2, b - 1, H - 2, "#1a1424");
    for (let y = DAIS - 1; y < H - 2; y++) p.r(a + 2, y, b - 2, y, mix("#9fb8e8", "#3a4a7a", (y - DAIS) / CELL_H), 1);
    p.r((a + b) >> 1, DAIS - 1, (a + b) >> 1, H - 2, "#1a1424"); // the mullion
    lights.push({ x: (a + b) / 2, y: DAIS + 6, r: 16, sy: 1, k: 0.4, c: [0.6, 0.72, 1.0] });
  }

  // the wall they came in through: oak panels, two old headmasters glaring down, the doors flung open
  p.r(0, 0, W - 1, FACADE_H - 1, "#3a2414");
  for (let x = 2; x < W; x += 9) p.r(x, 2, x, FACADE_H - 4, "#2a1a10");
  p.r(0, FACADE_H - 3, W - 1, FACADE_H - 1, "#22140c");
  p.r(0, FACADE_H - 3, W - 1, FACADE_H - 3, "#5a3a24");
  for (const [px, tint] of [[6, "#4a3a5a"], [W - 22, "#3a4a3a"]]) {
    p.r(px, 3, px + 15, 17, "#c9a43a");
    p.r(px + 1, 4, px + 14, 16, tint);
    p.oval(px + 8, 9, 3, 3, "#c8b8a0");
    p.r(px + 4, 13, px + 11, 16, "#2a2030");
    p.set(px + 7, 9, "#1a1414");
    p.set(px + 9, 9, "#1a1414");
  }
  const d0 = mid - 9;
  const d1 = mid + 8;
  p.r(d0 - 1, 2, d1 + 1, FACADE_H - 1, "#22140c");
  for (let y = 3; y < FACADE_H; y++) p.r(d0, y, d1, y, mix("#f0c890", "#8a6a48", (y - 3) / (FACADE_H - 3)), 1);
  p.r(d0 - 4, 3, d0 - 2, FACADE_H - 2, "#5a3a24"); // the doors, flung back
  p.r(d1 + 2, 3, d1 + 4, FACADE_H - 2, "#5a3a24");
  p.r(mid - 4, 0, mid + 3, 1, "#c9a43a"); // the plaque over it
  lights.push({ x: mid, y: FACADE_H, r: 26, sy: 1.3, k: 0.45, c: WARM });

  // the squad's torches, a beam down each lane
  for (let col = 0; col < cols; col++) {
    lights.push({ x: MARGIN + col * CELL_W + CELL_W / 2, y: FACADE_H + CELL_H, len: (rows - 2) * CELL_H, w0: 5, spread: 0.3, k: 0.3, c: [1.0, 0.92, 0.75] });
  }
  const url = `url('${lightUp(p, lights, { ambient: [0.24, 0.2, 0.36], mist: false })}')`;
  cache.set(key, url);
  return url;
}

// The courtyard's fights, out behind the school at night: the school's back wall at the top (the
// barn's own wall, inside it) with the door they came out of, and the ground the zombies come across —
// the Farm's grass and furrows with corn down both sides, the Barn's straw-strewn dirt between its
// stalls and bales, the Scrapyard's oily gravel between stacks of tyres and wrecked cars.
function yardBackground(cols, rows, site) {
  const key = `yard${cols}x${rows}:${site}`;
  if (cache.has(key)) return cache.get(key);
  const W = cols * CELL_W + 2 * MARGIN;
  const H = FACADE_H + rows * CELL_H;
  const mid = Math.round(W / 2);
  const p = buffer(W, H);
  const lights = [];
  const seed = site.length * 7;

  // the ground
  for (let y = FACADE_H; y < H; y++) for (let x = 0; x < W; x++) {
    const n = hash2(x, y, seed);
    let c;
    if (site === "farm") {
      c = mix("#3e6a32", "#4e7e3a", hash2(x >> 1, y >> 1, seed + 1));
      if (n < 0.08) c = "#5e8e44";
      if ((y - FACADE_H) % 12 >= 9 && (x < MARGIN + 2 || x > W - MARGIN - 3 || hash(Math.floor(y / 12), seed + 2) < 0.3)) c = mix("#5a3e26", "#4a3220", n); // a furrow
    } else if (site === "barn") {
      c = mix("#5a4430", "#6a5038", hash2(x >> 1, y >> 1, seed + 1));
      if (n < 0.12) c = mix("#c8a858", "#a88a40", hash2(x, y, seed + 3)); // straw
    } else {
      c = mix("#4a4a50", "#5a5a5e", hash2(x >> 1, y >> 1, seed + 1));
      if (n < 0.1) c = "#6a6a70";
      if (n > 0.97) c = "#3a3a3e";
    }
    p.set(x, y, c);
  }
  if (site === "farm") {
    // sprouts in the furrows, a trampled path down the middle lane
    for (let y = FACADE_H + 10; y < H; y += 12) for (let x = 2; x < W - 2; x += 5) if (hash2(x, y, seed + 4) < 0.6) p.r(x, y - 2, x, y, "#7ab84a");
    for (let y = FACADE_H; y < H; y++) if (hash(y, seed + 5) < 0.5) p.r(mid - 3 + Math.round(hash(y, seed + 6) * 2), y, mid + 2, y, "#5a4a32");
  } else if (site === "barn") {
    // a bale burst open, a pitchfork, the odd feather
    p.r(mid - 18, FACADE_H + 46, mid - 10, FACADE_H + 50, "#d8b858");
    p.line(mid + 12, FACADE_H + 70, mid + 22, FACADE_H + 62, "#8a6a40");
    for (let i = 0; i < 8; i++) p.set(MARGIN + Math.floor(hash(i, seed + 7) * cols * CELL_W), FACADE_H + Math.floor(hash(i, seed + 8) * (H - FACADE_H)), "#f0ece0");
  } else {
    // oil stains, bolts and a hubcap
    for (let i = 0; i < 6; i++) p.oval(MARGIN + 6 + Math.floor(hash(i, seed + 9) * (cols * CELL_W - 12)), FACADE_H + 10 + Math.floor(hash(i, seed + 10) * (H - FACADE_H - 20)), 4, 2, "#24242a");
    for (let i = 0; i < 12; i++) p.set(MARGIN + Math.floor(hash(i, seed + 11) * cols * CELL_W), FACADE_H + Math.floor(hash(i, seed + 12) * (H - FACADE_H)), "#a8a8b0");
    p.oval(mid + 20, FACADE_H + 58, 3, 3, "#b8bcc4");
    p.oval(mid + 20, FACADE_H + 58, 1, 1, "#6a6a72");
  }
  // down both sides, past the squares
  for (const [a, b] of [[0, MARGIN - 1], [W - MARGIN, W - 1]]) {
    for (let y = FACADE_H; y < H; y++) {
      if (site === "farm") { // corn: tall stalks, a cob here and there
        for (let x = a; x <= b; x++) if ((x + Math.floor(y / 3)) % 3 === 0) p.set(x, y, hash2(x, y, seed + 13) < 0.5 ? "#4a8a3a" : "#3a6a2a");
        if (y % 9 === 0) p.r(a + 2, y, a + 3, y + 2, "#e8c040");
      } else if (site === "barn") { // the stalls: plank walls, a bale stacked in each
        p.r(a, y, b, y, y % 6 === 0 ? "#3a2414" : "#6a3e22");
        if ((y - FACADE_H) % 22 > 12) p.r(a + 1, y, b - 1, y, y % 3 ? "#d8b858" : "#b89838");
      } else { // tyres stacked up, a crushed car
        const t = (y - FACADE_H) % 16;
        if (t < 10) {
          const cy = y - t + 5;
          for (let x = a; x <= b; x++) if ((x - (a + b) / 2) ** 2 / 16 + (y - cy) ** 2 / 25 <= 1) p.set(x, y, (x - (a + b) / 2) ** 2 / 4 + (y - cy) ** 2 / 6 < 1 ? "#4a4a50" : "#1e1e22");
        } else p.r(a, y, b, y, mix("#8a4a2a", "#6a3a22", hash(y, seed + 14)));
      }
    }
  }

  // the wall at the top: the school's back wall (the barn's own, inside it), the door they came out of
  if (site === "barn") {
    p.r(0, 0, W - 1, FACADE_H - 1, "#7a3424");
    for (let x = 0; x < W; x += 4) p.r(x, 0, x, FACADE_H - 1, "#5a2418");
    p.r(0, 4, W - 1, 4, "#e8e0d0");
  } else {
    for (let y = 0; y < FACADE_H; y++) for (let x = 0; x < W; x++) {
      const mortar = y % 4 === 3 || (x + (Math.floor(y / 4) % 2) * 4) % 8 === 0;
      p.set(x, y, mortar ? "#5a3a32" : mix("#8a4a3a", "#9a5644", hash2(x >> 2, y >> 2, seed + 15)));
    }
  }
  const d0 = mid - 8;
  const d1 = mid + 7;
  p.r(d0 - 1, 3, d1 + 1, FACADE_H - 1, "#2a2420");
  for (let y = 4; y < FACADE_H; y++) p.r(d0, y, d1, y, mix("#f0c890", "#8a6a48", (y - 4) / (FACADE_H - 4)), 1);
  lights.push({ x: mid, y: FACADE_H, r: 30, sy: 1.4, k: 0.5, c: [1.0, 0.8, 0.55] });
  if (site !== "barn") {
    p.r(d1 + 4, 6, d1 + 6, 9, "#f8e0a0", 1); // a lamp over the door
    lights.push({ x: d1 + 5, y: 9, r: 22, sy: 1.2, k: 0.4, c: [1.0, 0.86, 0.6] });
  }

  // the far end, into the dark
  for (let y = H - CELL_H * 2; y < H; y++) {
    const t = (y - (H - CELL_H * 2)) / (CELL_H * 2);
    for (let x = 0; x < W; x++) if (bayer(x, y) < t * 0.9) p.set(x, y, mix(p.col[y * W + x] || "#000000", "#06060a", 0.7));
  }
  // the squad's torches, a beam down each lane
  for (let col = 0; col < cols; col++) {
    lights.push({ x: MARGIN + col * CELL_W + CELL_W / 2, y: FACADE_H + CELL_H, len: (rows - 1) * CELL_H, w0: 5, spread: 0.32, k: 0.4, c: [1.0, 0.94, 0.75] });
  }
  if (site === "barn") lights.push({ x: mid, y: FACADE_H + 46, r: 46, sy: 1, k: 0.55, c: WARM }); // (a lantern hung from the beam)
  const url = `url('${lightUp(p, lights, { ambient: site === "barn" ? [0.34, 0.3, 0.38] : [0.3, 0.34, 0.55], mist: site !== "barn" })}')`;
  cache.set(key, url);
  return url;
}
