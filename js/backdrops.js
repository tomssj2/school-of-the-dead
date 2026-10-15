// Backdrops for the fight scenes, drawn in code as pixel art and lit the way the Night Watch board
// is (nightwatch.js buffer + lightUp): an interior for each raid — the mall atrium, the hospital
// ward, the army hangar, the lab — a street at night for the chase and the scouts' scraps, and a
// street at dusk behind each expedition team. Each is a CSS url(), cached.
//
// The arena scenes are AW x AH art pixels, shown at 4x (728 x 288); the fighters stand on the
// floor (from FLOOR down, deep enough for three ranks), so the busy detail stays above it.

import { buffer, lightUp, hash, hash2 } from "./lighting.js";
import { mix } from "./sprite.js";

const AW = 182;
const AH = 72;
const FLOOR = 40;

const WARM = [1.0, 0.74, 0.42];
const LAMP = [1.0, 0.9, 0.66];
const FIRE = [1.0, 0.52, 0.2];

const cache = new Map();
const cached = (key, make) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
const toUrl = (p, lights, ambient) => `url('${lightUp(p, lights, { ambient, mist: false })}')`;
const speckle = (p, x0, y0, x1, y1, cols, n, seed) => {
  for (let i = 0; i < n; i++) p.set(x0 + Math.floor(hash(i, seed) * (x1 - x0 + 1)), y0 + Math.floor(hash(i, seed + 1) * (y1 - y0 + 1)), cols[i % cols.length]);
};
const stars = (p, x0, x1, y1, seed) => {
  for (let i = 0; i < 12; i++) p.set(x0 + Math.floor(hash(i, seed) * (x1 - x0)), Math.floor(hash(i, seed + 1) * y1), i % 3 ? "#8a98d0" : "#dce4ff", 1);
};
// A trail of blood smeared along the floor.
const bloodTrail = (p, x0, x1, y, seed) => {
  for (let x = x0; x <= x1; x++) if (hash(x, seed) < 0.55) p.set(x, y + Math.round(Math.sin(x / 6) * 1.5), hash(x, seed + 1) < 0.5 ? "#6a1818" : "#7a1f1f");
};

// ===== the City Mall: a moonlit atrium, neon over the shops, an escalator to nowhere =====
function mall() {
  const p = buffer(AW, AH);
  const L = [];
  // the roof and its skylight
  p.r(0, 0, AW - 1, 8, "#2a2833");
  p.r(34, 0, 147, 5, "#141c3c", 1);
  stars(p, 36, 146, 5, 10);
  for (let x = 34; x <= 147; x += 10) p.r(x, 0, x, 5, "#3a3844");
  p.r(34, 3, 147, 3, "#3a3844");
  p.r(30, 6, 151, 8, "#4a4654");
  p.r(30, 6, 151, 6, "#5e5a68");
  for (const x of [62, 120]) L.push({ x, y: 7, len: 42, w0: 4, spread: 0.32, k: 0.55, c: [0.72, 0.84, 1.0] });
  // the upper floor: dark shopfronts behind a glass balcony
  p.r(0, 9, AW - 1, 15, "#4a4558");
  for (const [x0, x1, band] of [[4, 34, "#3f6fb5"], [44, 70, "#4caf7d"], [112, 140, "#e0a536"], [148, 178, "#8a5ad6"]]) {
    p.r(x0, 10, x1, 15, "#1c2230", 1);
    p.r(x0, 10, x1, 10, band);
  }
  p.r(0, 13, AW - 1, 15, "#4a6078");
  p.r(0, 12, AW - 1, 12, "#9aa0a8");
  for (let x = 2; x < AW; x += 6) p.r(x, 12, x, 15, "#6a7078");
  p.r(0, 16, AW - 1, 17, "#8a8478");
  p.r(0, 16, AW - 1, 16, "#a8a294");
  // the lower floor: walls and pillars
  p.r(0, 18, AW - 1, 39, "#3a3646");
  for (const x of [0, 54, 104, 178]) {
    p.r(x, 18, x + 3, 39, "#5a5664");
    p.r(x, 18, x, 39, "#6e6a78");
  }
  // shop on the left: a pink neon sign, its shutter jammed half down over dark glass
  p.r(5, 18, 52, 21, "#2a2630");
  for (let x = 8; x <= 48; x += 3) if (hash(x, 11) < 0.75) {
    p.set(x, 19, "#ff4fa0", 1);
    p.set(x + 1, 19, "#ff8ac4", 1);
    p.set(x, 20, "#ff4fa0", 1);
  }
  p.r(5, 22, 52, 39, "#121822", 1);
  for (let i = 0; i < 6; i++) p.line(8 + i * 8, 39, 14 + i * 8, 31, "#22304a", 1); // reflections on the glass
  p.r(5, 22, 52, 30, "#7a7e86");
  for (let y = 22; y <= 30; y += 2) p.r(5, y, 52, y, "#5e626a");
  p.r(5, 30, 52, 30, "#4a4e56");
  for (const x of [20, 21, 36]) p.set(x, 30, "#121822", 1); // a bent slat
  L.push({ x: 28, y: 20, r: 34, sy: 1.2, k: 0.65, c: [1.0, 0.35, 0.7] });
  // the escalator, climbing to the balcony
  for (let x = 60; x <= 100; x++) {
    const top = Math.round(39 - ((x - 60) * 21) / 40);
    p.r(x, top, x, 39, x % 3 ? "#2a2d34" : "#22252b");
    p.set(x, top, "#8a909a");
    p.set(x, top - 1, "#1a1c22");
  }
  p.r(58, 34, 60, 39, "#6a6e78");
  p.r(100, 16, 102, 39, "#5a5e68");
  // shop on the right: cyan neon, a lit window, mannequins, broken glass
  p.r(108, 18, 176, 21, "#2a2630");
  for (let x = 112; x <= 172; x += 3) if (hash(x, 12) < 0.7) {
    p.set(x, 19, "#4ff0ff", 1);
    p.set(x, 20, "#2ac8e0", 1);
  }
  for (let y = 22; y <= 39; y++) p.r(108, y, 176, y, mix("#d8b878", "#8a6a3a", (y - 22) / 17), 1);
  for (const mx of [118, 134, 156]) {
    p.oval(mx, 25, 2, 2, "#2a2420", 1);
    p.r(mx - 2, 27, mx + 2, 34, "#2a2420", 1);
    p.r(mx - 1, 35, mx - 1, 39, "#2a2420", 1);
    p.r(mx + 1, 35, mx + 1, 39, "#2a2420", 1);
  }
  for (let i = 0; i < 9; i++) p.line(140 + i * 3, 22, 137 + i * 4, 28 + (i % 3), "#fff0c8", 1); // cracks
  L.push({ x: 142, y: 20, r: 34, sy: 1.2, k: 0.6, c: [0.35, 0.9, 1.0] });
  L.push({ x: 142, y: 34, r: 30, sy: 1.4, k: 0.55, c: WARM });
  // the floor: checker tiles, a toppled cart, a planter, papers, blood
  p.r(0, 39, AW - 1, 39, "#1e1c24");
  for (let y = FLOOR; y < AH; y++) for (let x = 0; x < AW; x++) p.set(x, y, ((x >> 3) + (y >> 2)) % 2 ? "#b8b0a0" : "#a09888");
  for (let y = FLOOR; y < AH; y += 4) p.r(0, y, AW - 1, y, "#8e8678");
  speckle(p, 0, FLOOR, AW - 1, AH - 1, ["#f0eee8", "#d8d4cc"], 26, 13);
  p.r(30, 45, 44, 50, "#9aa0a8");
  p.r(31, 46, 43, 49, "#a09888");
  for (let x = 33; x < 43; x += 3) p.r(x, 46, x, 49, "#9aa0a8");
  p.oval(32, 52, 1.5, 1.5, "#22252b");
  p.oval(42, 52, 1.5, 1.5, "#22252b");
  p.oval(164, 52, 6, 3, "#8a5f33");
  for (const [dx, dy] of [[-8, -4], [-5, -6], [2, -6], [6, -4], [9, -2]]) p.line(164, 49, 164 + dx, 49 + dy, "#3f7a42");
  bloodTrail(p, 70, 128, 50, 14);
  return toUrl(p, L, [0.3, 0.3, 0.46]);
}

// ===== the General Hospital: a ward under flickering tubes, curtains, beds, a red cross =====
function hospital() {
  const p = buffer(AW, AH);
  const L = [];
  p.r(0, 0, AW - 1, 4, "#b8bcb8");
  for (let x = 0; x < AW; x += 12) p.r(x, 0, x, 4, "#9a9e9a");
  // the tubes, one of them broken and hanging
  for (const [x0, ok] of [[18, true], [80, true], [142, false]]) {
    p.r(x0, 2, x0 + 24, 3, "#d8dcd8");
    if (ok) {
      p.r(x0 + 1, 3, x0 + 23, 3, "#e8fff4", 1);
      L.push({ x: x0 + 12, y: 4, len: 46, w0: 10, spread: 0.3, k: 0.62, c: [0.85, 1.0, 0.92] });
    } else {
      p.line(x0 + 2, 3, x0 + 22, 9, "#6a706c");
      p.line(x0 + 2, 4, x0 + 22, 10, "#4a504c");
    }
  }
  // the walls: pale green above a handrail, darker below
  p.r(0, 5, AW - 1, 26, "#9ab8a8");
  p.r(0, 27, AW - 1, 27, "#c8ccd0");
  p.r(0, 28, AW - 1, 28, "#8a9094");
  p.r(0, 29, AW - 1, 39, "#5e7c70");
  speckle(p, 0, 5, AW - 1, 26, ["#8eaa9c"], 60, 20);
  // a window with the blinds down, moonlight through the slats
  p.r(5, 7, 31, 23, "#e0e4e0");
  for (let y = 8; y <= 22; y++) p.r(6, y, 30, y, y % 2 ? "#2a3440" : "#6a7a8a", 1);
  L.push({ x: 18, y: 15, r: 20, k: 0.35, c: [0.7, 0.8, 1.0] });
  // the red cross, lit, and the exit sign
  p.r(86, 7, 97, 18, "#f4f4f0", 1);
  p.r(90, 8, 93, 17, "#d03030", 1);
  p.r(87, 11, 96, 14, "#d03030", 1);
  L.push({ x: 91, y: 13, r: 18, k: 0.45, c: [1.0, 0.45, 0.45] });
  p.r(165, 6, 177, 10, "#40e070", 1);
  for (let x = 167; x <= 175; x += 2) p.set(x, 8, "#0a3a1a", 1);
  L.push({ x: 171, y: 9, r: 14, k: 0.4, c: [0.4, 1.0, 0.55] });
  // the ward door, its porthole
  p.r(150, 12, 163, 39, "#8aa49a");
  p.r(150, 12, 150, 39, "#a8c0b6");
  p.oval(156, 19, 3, 3, "#1a2428", 1);
  p.r(160, 27, 161, 31, "#c8ccd0");
  // curtains on their rails, pulled half across
  for (const [x0, x1] of [[38, 82], [108, 146]]) p.r(x0, 6, x1, 6, "#c8ccd0");
  for (const [x0, x1] of [[38, 50], [136, 146]]) for (let x = x0; x <= x1; x++) p.r(x, 7, x, 34 - (x % 3), x % 2 ? "#6a8ab0" : "#5a7aa0");
  // two beds: rails, mattress, pillow, a sheet half on the floor, blood
  for (const [bx, spilled] of [[54, false], [106, true]]) {
    p.r(bx - 2, 22, bx, 33, "#a8b0b8");
    p.r(bx, 32, bx + 30, 33, "#a8b0b8");
    p.r(bx, 28, bx + 30, 31, "#e8ecee");
    p.r(bx + 1, 26, bx + 6, 28, "#f8f8f8");
    for (let x = bx + 8; x < bx + 30; x += 4) p.set(x, 29, "#c8d0d4");
    p.oval(bx + 18, 29, 4, 1.5, "#7a1f1f");
    for (const lx of [bx + 1, bx + 28]) {
      p.r(lx, 34, lx, 37, "#8a9096");
      p.r(lx - 1, 38, lx + 1, 39, "#2a2d34");
    }
    if (spilled) p.r(bx + 26, 30, bx + 31, 39, "#d8dee2");
  }
  // an IV stand
  p.r(92, 16, 92, 38, "#c8ccd0");
  p.r(89, 16, 95, 16, "#c8ccd0");
  p.r(89, 17, 91, 21, "#d8f0f8");
  p.r(90, 38, 94, 39, "#6a706c");
  // the floor: linoleum, a blood smear, spilled pills
  p.r(0, 39, AW - 1, 39, "#3a4a44");
  p.r(0, FLOOR, AW - 1, AH - 1, "#8a9a94");
  for (let x = 0; x < AW; x += 10) p.r(x, FLOOR, x, AH - 1, "#7a8a84");
  for (let y = FLOOR + 4; y < AH; y += 5) p.r(0, y, AW - 1, y, "#7a8a84");
  for (let x = 0; x < AW; x += 23) p.r(x, FLOOR + 2, x + 8, FLOOR + 2, "#a8b8b2");
  bloodTrail(p, 84, 150, 47, 21);
  speckle(p, 30, 44, 80, 54, ["#f0f0f0", "#4a8ad0", "#f4d35e"], 14, 22);
  return toUrl(p, L, [0.26, 0.31, 0.32]);
}

// ===== the Military Base: a hangar under floodlights, crates, sandbags, a jeep, an alarm =====
function militaryBase() {
  const p = buffer(AW, AH);
  const L = [];
  // the roof trusses
  p.r(0, 0, AW - 1, 8, "#1e2228");
  for (let x = 0; x < AW; x += 12) {
    p.line(x, 0, x + 6, 8, "#4a525c");
    p.line(x + 12, 0, x + 6, 8, "#4a525c");
  }
  p.r(0, 0, AW - 1, 0, "#5a626c");
  p.r(0, 8, AW - 1, 8, "#5a626c");
  // floodlights on their cables
  for (const fx of [46, 136]) {
    p.r(fx, 0, fx, 5, "#2a2e36");
    p.r(fx - 3, 6, fx + 3, 7, "#30343e");
    p.r(fx - 2, 8, fx + 2, 8, "#fff4d0", 1);
    L.push({ x: fx, y: 9, len: 47, w0: 4, spread: 0.55, k: 0.78, c: LAMP });
  }
  // corrugated walls, rust streaks
  for (let x = 0; x < AW; x++) p.r(x, 9, x, 39, x % 3 === 0 ? "#48515a" : x % 3 === 1 ? "#626c76" : "#56606a");
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, 30) * AW);
    p.r(x, 10 + Math.floor(hash(i, 31) * 6), x, 22 + Math.floor(hash(i, 32) * 12), "#6a4a34");
  }
  // the hangar door slid half open on the night outside, a searchlight sweeping
  p.r(64, 11, 118, 12, "#3a4048");
  p.r(64, 13, 80, 39, "#6a7480");
  p.r(102, 13, 118, 39, "#6a7480");
  for (let x = 66; x <= 116; x += 4) if (x <= 80 || x >= 102) p.r(x, 13, x, 39, "#56606a");
  p.r(81, 13, 101, 39, "#0e1428", 1);
  stars(p, 81, 101, 20, 33);
  for (let i = 0; i < 14; i++) p.set(84 + i, 26 - i, "#3a4870", 1);
  for (let x = 81; x <= 101; x += 3) p.r(x, 33, x, 39, "#1a2034", 1); // the fence outside
  p.r(81, 34, 101, 34, "#1a2034", 1);
  // a RESTRICTED sign and the red alarm lamp
  p.r(18, 14, 42, 19, "#b03030");
  p.r(18, 14, 42, 14, "#c84848");
  for (let x = 20; x <= 40; x += 2) if (hash(x, 34) < 0.8) p.set(x, 16 + (x % 4 ? 0 : 1), "#f4f4f4");
  p.r(90, 9, 94, 10, "#2a2e36");
  p.r(91, 11, 93, 12, "#ff3a2a", 1);
  L.push({ x: 92, y: 12, r: 32, k: 0.5, c: [1.0, 0.22, 0.15] });
  // camouflage netting slung from the roof
  for (let x = 0; x <= 34; x++) {
    const sag = Math.round(Math.sin((x / 34) * Math.PI) * 6);
    for (let y = 9; y <= 12 + sag; y++) if (hash2(x, y, 35) < 0.8) p.set(x, y, ["#3f5a2e", "#5a6a3a", "#6b5a3a", "#2e4a26"][Math.floor(hash2(x, y, 36) * 4)]);
  }
  // crates, sandbags, drums, a jeep
  for (const [x0, y0, x1, y1] of [[6, 31, 17, 39], [18, 31, 29, 39], [12, 23, 23, 30]]) {
    p.r(x0, y0, x1, y1, "#5a6a3a");
    p.r(x0, y0, x1, y0, "#7a8a54");
    p.r(x1, y0, x1, y1, "#3e4a28");
    p.r(x0, Math.round((y0 + y1) / 2), x1, Math.round((y0 + y1) / 2), "#4a5830");
    p.r(x0 + 3, y0 + 2, x0 + 6, y0 + 2, "#d8d4c0");
  }
  for (let row = 0; row < 2; row++) for (let x = 34 + row * 3; x + 6 <= 58 - row * 3; x += 7) {
    const y = 35 - row * 3;
    p.r(x, y, x + 6, y + 3, "#b8a47a");
    p.r(x, y, x + 6, y, "#d0bc92");
    p.r(x, y + 3, x + 6, y + 3, "#8a7654");
  }
  for (const [dx, col] of [[120, "#8a2a20"], [128, "#4a5a30"]]) {
    p.r(dx, 30, dx + 6, 39, col);
    p.r(dx, 30, dx + 6, 30, "#2a2420");
    for (const y of [33, 36]) p.r(dx, y, dx + 6, y, "#2a2420");
    p.r(dx, 31, dx, 39, mix(col, "#ffffff", 0.2));
  }
  p.r(138, 30, 178, 35, "#4a5a30");
  p.r(138, 30, 178, 30, "#6a7a48");
  p.r(150, 24, 168, 29, "#4a5a30");
  p.r(151, 25, 158, 29, "#1a2030", 1);
  p.r(160, 25, 167, 29, "#1a2030", 1);
  p.r(174, 26, 179, 33, "#22252b");
  for (const wx of [144, 172]) {
    p.oval(wx, 37, 3, 3, "#16181c");
    p.r(wx - 1, 36, wx, 37, "#8a909a");
  }
  for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) p.set(161 + dx, 32 + dy, "#e8e4d0");
  // the floor: concrete, oil stains, a hazard stripe, a painted line
  p.r(0, 39, AW - 1, 39, "#2a2e36");
  p.r(0, FLOOR, AW - 1, AH - 1, "#6e7074");
  speckle(p, 0, FLOOR, AW - 1, AH - 1, ["#64666a", "#787a7e"], 160, 37);
  for (let x = 0; x < AW; x++) for (const y of [41, 42]) p.set(x, y, ((x + y) >> 2) % 2 ? "#e0b830" : "#1e1e22");
  for (const [x, y, rx] of [[40, 49, 7], [110, 53, 5], [150, 47, 8]]) p.oval(x, y, rx, 1.6, "#3a3c40");
  p.r(0, 62, AW - 1, 62, "#c8a830");
  return toUrl(p, L, [0.3, 0.32, 0.38]);
}

// ===== the Research Institute: specimen tanks glowing green, one of them shattered, consoles =====
function institute() {
  const p = buffer(AW, AH);
  const L = [];
  // pipes along the ceiling
  p.r(0, 0, AW - 1, 6, "#2a3038");
  p.r(0, 2, AW - 1, 3, "#7a828c");
  p.r(0, 2, AW - 1, 2, "#9aa2ac");
  p.r(0, 5, AW - 1, 5, "#5a626c");
  for (const vx of [40, 120]) {
    p.oval(vx, 2.5, 2, 2, "#b03030");
    p.set(vx, 2, "#2a3038");
  }
  p.r(80, 1, 100, 4, "#3a424c");
  for (let x = 81; x < 100; x += 2) p.r(x, 1, x, 4, "#22282e");
  // cold white wall panels
  p.r(0, 7, AW - 1, 29, "#8a96a8");
  p.r(0, 30, AW - 1, 39, "#6e7a8c");
  for (let x = 0; x < AW; x += 20) p.r(x, 7, x, 39, "#76829a");
  p.r(0, 22, AW - 1, 22, "#76829a");
  // a biohazard sign
  for (let y = 0; y < 9; y++) p.r(45 - Math.floor(y / 2), 12 + y, 45 + Math.floor(y / 2), 12 + y, "#e8c830", 1);
  p.oval(45, 17, 1.5, 1.5, "#1a1a1a", 1);
  // the tanks: a figure floating in green, bubbles; the middle one smashed open
  for (const [tx, broken] of [[10, false], [62, true], [150, false]]) {
    p.r(tx, 9, tx + 15, 11, "#9aa0a8");
    p.r(tx, 9, tx + 15, 9, "#c8ccd2");
    p.r(tx, 35, tx + 15, 38, "#7a828c");
    p.r(tx, 35, tx + 15, 35, "#9aa0a8");
    for (const lx of [tx + 3, tx + 7, tx + 11]) p.set(lx, 37, "#f4d35e", 1);
    if (!broken) {
      for (let y = 12; y <= 34; y++) p.r(tx + 1, y, tx + 14, y, mix("#5af0a8", "#1e7a4a", (y - 12) / 22), 1);
      p.oval(tx + 8, 18, 2.5, 2.5, "#123a26", 1);
      p.r(tx + 5, 21, tx + 11, 29, "#123a26", 1);
      p.r(tx + 6, 30, tx + 7, 33, "#123a26", 1);
      p.r(tx + 9, 30, tx + 10, 33, "#123a26", 1);
      for (let i = 0; i < 5; i++) p.set(tx + 2 + Math.floor(hash(i, tx) * 11), 13 + Math.floor(hash(i, tx + 1) * 20), "#c8ffe8", 1);
      p.r(tx + 2, 12, tx + 2, 34, "#a8ffd8", 1);
      L.push({ x: tx + 8, y: 24, r: 30, k: 0.7, c: [0.35, 1.0, 0.6] });
    } else {
      p.r(tx + 1, 12, tx + 14, 34, "#1a2028", 1);
      for (let x = tx + 1; x <= tx + 14; x++) {
        const h = 28 + Math.floor(hash(x, 40) * 6);
        p.r(x, h, x, 34, "#2a4a3a", 1);
        p.set(x, h, "#a8ffd8", 1);
      }
    }
  }
  // the consoles
  p.r(92, 30, 140, 39, "#4a525c");
  p.r(92, 30, 140, 30, "#6a727c");
  for (const [sx, col] of [[94, "#3a8ad0"], [110, "#3ad08a"], [126, "#d04a4a"]]) {
    p.r(sx, 20, sx + 12, 28, "#22282e");
    p.r(sx + 1, 21, sx + 11, 27, col, 1);
    for (let y = 22; y <= 26; y += 2) p.r(sx + 2, y, sx + 2 + Math.floor(hash(y, sx) * 8), y, mix(col, "#ffffff", 0.55), 1);
    p.r(sx + 5, 29, sx + 7, 29, "#22282e");
  }
  L.push({ x: 116, y: 26, r: 30, k: 0.5, c: [0.45, 0.65, 1.0] });
  // a bench of flasks
  p.r(168, 31, 181, 39, "#5a626c");
  p.r(168, 31, 181, 31, "#7a828c");
  for (const [fx, col] of [[170, "#c07fff"], [174, "#5af0a8"], [178, "#f4d35e"]]) {
    p.r(fx, 27, fx + 1, 30, col, 1);
    p.set(fx, 26, "#c8ccd2");
  }
  // the floor: white tiles, the spilled tank glowing in a puddle, glass
  p.r(0, 39, AW - 1, 39, "#3a424c");
  for (let y = FLOOR; y < AH; y++) for (let x = 0; x < AW; x++) p.set(x, y, ((x / 6 | 0) + (y / 3 | 0)) % 2 ? "#c0c8d0" : "#b0b8c2");
  p.oval(70, 45, 16, 2.6, "#2a6a4a", 1);
  p.oval(70, 45, 10, 1.4, "#3a8a5a", 1);
  speckle(p, 54, 41, 96, 51, ["#e8fff8", "#a8d8c8"], 18, 41);
  bloodTrail(p, 96, 150, 51, 42);
  L.push({ x: 70, y: 45, r: 18, sy: 1.6, k: 0.4, c: [0.35, 1.0, 0.6] });
  return toUrl(p, L, [0.24, 0.28, 0.38]);
}

// ===== a street at night: the chase, the scouts' scraps out in town, the Assault banner =====
// `w` x `h` art pixels: a wider street gets more buildings, streetlights and signs, a taller one more
// sky over the rooftops; the scene is `depth` rows at the bottom (a deeper road for a deeper one).
function street(w = AW, h = AH, depth = AH) {
  const base = buffer(w, h);
  const dy = Math.max(0, h - depth);
  base.r(0, 0, w - 1, 12 + dy, "#141c3c", 1);
  stars(base, 0, w - 1, 10 + dy, 50);
  // everything else is drawn for AH rows and sits at the bottom
  const p = {
    set: (x, y, c, e) => base.set(x, y + dy, c, e),
    r: (x0, y0, x1, y1, c, e) => base.r(x0, y0 + dy, x1, y1 + dy, c, e),
    oval: (cx, cy, rx, ry, c, e) => base.oval(cx, cy + dy, rx, ry, c, e),
    line: (x0, y0, x1, y1, c, e) => base.line(x0, y0 + dy, x1, y1 + dy, c, e),
  };
  const L = [];
  const light = (l) => L.push({ ...l, y: l.y + dy });
  p.oval(w - 22, 3, 2.5, 2.5, "#e8ecff", 1);
  p.oval(w - 21, 2, 2.5, 2.5, "#141c3c", 1);
  // a row of buildings, a few windows still lit
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 26 + Math.floor(hash(i, 51) * 22);
    const top = 3 + Math.floor(hash(i, 52) * 9);
    const col = ["#6a3a32", "#4a4e5a", "#5a4a3a", "#3a4a5a", "#5a3a4a"][i % 5];
    p.r(x, top, x + bw - 1, 37, col);
    p.r(x, top, x + bw - 1, top, mix(col, "#ffffff", 0.18));
    p.r(x + bw - 1, top, x + bw - 1, 37, mix(col, "#000000", 0.3));
    for (let wy = top + 3; wy < 27; wy += 6) for (let wx = x + 3; wx + 3 < x + bw - 2; wx += 6) {
      const lit = hash2(wx, wy, 53) < 0.22;
      p.r(wx, wy, wx + 2, wy + 3, lit ? "#e8c35a" : "#1a2030", lit ? 1 : 0);
      if (lit) light({ x: wx + 1, y: wy + 2, r: 9, k: 0.4, c: WARM });
    }
    // a shop at street level
    p.r(x + 2, 29, x + bw - 3, 37, "#7a7e86");
    for (let sy = 29; sy <= 37; sy += 2) p.r(x + 2, sy, x + bw - 3, sy, "#62666e");
    if (hash(i, 54) < 0.4) for (let k = 0; k < 6; k++) p.set(x + 4 + Math.floor(hash(k, i + 55) * (bw - 8)), 31 + Math.floor(hash(k, i + 56) * 5), ["#d64545", "#4ff0ff", "#f4d35e"][k % 3]); // graffiti
    x += bw;
    i++;
  }
  // neon signs still buzzing
  for (let nx = 30; nx + 12 < w; nx += 210) {
    p.r(nx, 22, nx + 12, 25, "#2a2630");
    for (let k = nx + 1; k <= nx + 11; k += 2) p.set(k, 23, "#ff4fa0", 1);
    light({ x: nx + 6, y: 24, r: 18, k: 0.5, c: [1.0, 0.35, 0.7] });
  }
  // sidewalk, kerb, road
  p.r(0, 38, w - 1, 42, "#8a867c");
  for (let sx = 6; sx < w; sx += 12) p.r(sx, 38, sx, 42, "#76726a");
  p.r(0, 43, w - 1, 43, "#b0aca2");
  p.r(0, 44, w - 1, 44, "#22252b");
  p.r(0, 45, w - 1, depth - 1, "#3c4048");
  speckle(p, 0, 45, w - 1, depth - 1, ["#464a52", "#34383f"], Math.round((180 * w * (depth - 45)) / (AW * 11)), 57);
  const lane = Math.round((45 + depth) / 2);
  for (let sx = 2; sx < w; sx += 18) p.r(sx, lane, sx + 9, lane, "#c8a838");
  // streetlights
  for (let sx = 70; sx + 10 < w; sx += 130) {
    p.r(sx, 12, sx + 1, 42, "#30343e");
    p.r(sx, 12, sx + 9, 12, "#30343e");
    p.r(sx + 6, 13, sx + 10, 13, "#fff2c0", 1);
    light({ x: sx + 8, y: 14, len: 34, w0: 3, spread: 0.45, k: 0.8, c: LAMP });
  }
  // a wrecked car burning, two-thirds of the way along
  const cx = Math.round(w * 0.67);
  p.r(cx, 40, cx + 34, 46, "#3a5a8a");
  p.r(cx, 40, cx + 34, 40, "#5a7aaa");
  p.r(cx + 8, 35, cx + 26, 39, "#3a5a8a");
  p.r(cx + 10, 36, cx + 17, 39, "#1a2030", 1);
  p.r(cx + 19, 36, cx + 25, 39, "#1a2030", 1);
  for (const wx of [cx + 6, cx + 28]) {
    p.oval(wx, 46, 2.2, 2.2, "#16181c");
    p.set(wx, 46, "#8a909a");
  }
  for (let fx = cx + 1; fx <= cx + 9; fx++) {
    const fh = 3 + Math.round(hash(fx - cx + 123, 58) * 5);
    for (let k = 0; k < fh; k++) p.set(fx, 39 - k, k > fh - 2 ? "#fff3b0" : k > fh - 4 ? "#ffd36a" : "#f4943a", 1);
  }
  light({ x: cx + 5, y: 37, r: 34, k: 0.95, c: FIRE });
  bloodTrail(p, 20, Math.round(w * 0.55), depth - 5, 59);
  speckle(p, 0, 45, w - 1, depth - 1, ["#d8d8d0"], Math.round((10 * w) / AW), 60);
  return toUrl(base, L, [0.3, 0.34, 0.55]);
}

// ===== a street at dusk behind each expedition team (SW x SH at 3x), varied by the place: lit by
// the low sun, a few windows and the first streetlights =====
const SW = 327;
const SH = 32;
function duskStreet(seed) {
  const p = buffer(SW, SH);
  const L = [];
  // the sky and the low sun give off their own light, and so does the far skyline against it
  for (let y = 0; y < 16; y++) p.r(0, y, SW - 1, y, mix("#2a2450", "#d0785a", y / 15), 1);
  const sunX = 40 + Math.floor(hash(seed, 1) * 240);
  p.oval(sunX, 15, 5, 5, "#f4b060", 1);
  p.oval(sunX, 15, 3, 3, "#ffd890", 1);
  L.push({ x: sunX, y: 15, r: 150, sy: 1.4, k: 0.42, c: [1.0, 0.7, 0.45] });
  for (let x = 0; x < SW; ) {
    const w = 8 + Math.floor(hash(x, seed + 2) * 16);
    const top = 5 + Math.floor(hash(x, seed + 3) * 9);
    p.r(x, top, x + w - 1, 18, "#3a2c48", 1);
    for (let k = 0; k < 3; k++) if (hash(x + k, seed + 4) < 0.5) p.set(x + 2 + Math.floor(hash(x + k, seed + 5) * (w - 3)), top + 2 + Math.floor(hash(x + k, seed + 6) * (16 - top)), "#e8a858", 1);
    x += w;
  }
  // the near street, lit by the sun going down, a few windows and the first streetlights
  for (let x = 0; x < SW; ) {
    const w = 18 + Math.floor(hash(x, seed + 7) * 24);
    const top = 9 + Math.floor(hash(x, seed + 8) * 6);
    const col = ["#7a5248", "#5a5e6a", "#6a5a4a", "#4a5a6a", "#6a4a5a"][Math.floor(hash(x, seed + 9) * 5)];
    p.r(x, top, x + w - 1, 25, col);
    p.r(x, top, x + w - 1, top, mix(col, "#ffd0a0", 0.3));
    p.r(x + w - 1, top, x + w - 1, 25, mix(col, "#000000", 0.3));
    for (let wx = x + 2; wx + 2 < x + w - 1; wx += 5) for (let wy = top + 2; wy < 20; wy += 4) {
      const lit = hash2(wx, wy, seed) < 0.15;
      p.r(wx, wy, wx + 1, wy + 1, lit ? "#e8a858" : "#2a2438", lit ? 1 : 0);
      if (lit) L.push({ x: wx + 0.5, y: wy + 0.5, r: 6, k: 0.45, c: WARM });
    }
    p.r(x + 1, 21, x + w - 2, 25, mix(col, "#1a1820", 0.5));
    x += w;
  }
  p.r(0, 26, SW - 1, 27, "#9a8478");
  p.r(0, 28, SW - 1, 28, "#c8aa98");
  p.r(0, 29, SW - 1, SH - 1, "#4a4048");
  for (let x = 4; x < SW; x += 16) p.r(x, 30, x + 7, 30, "#c8a060");
  for (let x = 40 + Math.floor(hash(seed, 12) * 40); x < SW - 4; x += 96) {
    p.r(x, 14, x, 27, "#2a2630");
    p.r(x, 14, x + 3, 14, "#2a2630");
    p.r(x + 2, 15, x + 4, 15, "#fff2c0", 1);
    L.push({ x: x + 3, y: 16, len: 16, w0: 2, spread: 0.5, k: 0.55, c: LAMP });
  }
  // a couple of wrecks along the kerb
  for (let k = 0; k < 2; k++) {
    const cx = 30 + Math.floor(hash(k, seed + 10) * 260);
    const col = ["#8a3030", "#3a5a8a", "#c89a3a"][Math.floor(hash(k, seed + 11) * 3)];
    p.r(cx, 25, cx + 13, 28, col);
    p.r(cx + 3, 23, cx + 10, 24, col);
    p.r(cx + 4, 23, cx + 9, 24, "#2a2438");
  }
  return toUrl(p, L, [0.72, 0.62, 0.66]);
}

// ===== the intro (IW x IH, shown at 3x): the city burning, then the Academy holding out =====
const IW = 252;
const IH = 88;
// A shambling silhouette, feet on row `y`, arms out toward `dir` (1 right, -1 left).
function shambler(p, x, y, c, dir = 1) {
  p.r(x, y - 9, x + 1, y - 8, c);
  p.r(x, y - 7, x + 1, y - 3, c);
  p.r(dir > 0 ? x + 2 : x - 2, y - 6, dir > 0 ? x + 3 : x - 1, y - 6, c);
  p.set(dir > 0 ? x + 2 : x - 1, y - 5, c);
  p.r(x, y - 2, x, y, c);
  p.r(x + 1, y - 2, x + 1 + dir, y, c);
}
// Flames `w` either side of x, licking up from row `y` (emissive): white-hot tips, red at the base.
function flames(p, x, y, w, seed) {
  for (let fx = Math.round(x - w); fx <= x + w; fx++) {
    const edge = 1 - Math.abs(fx - x) / (w + 1);
    const fh = Math.max(1, Math.round((2 + hash(fx, seed) * 7) * edge + 1));
    for (let k = 0; k < fh; k++) p.set(fx, y - k, k > fh - 2 ? "#fff3b0" : k > fh - 4 ? "#ffc85a" : k > fh - 6 ? "#f4843a" : "#c83a22", 1);
  }
}
// "SOS" in a 3x5 pixel font.
const SOS = ["111 111 111", "100 101 100", "111 101 111", "001 101 001", "111 111 111"];

function cityBurning() {
  const p = buffer(IW, IH);
  const L = [];
  // a sky lit from below by the fires
  for (let y = 0; y < 70; y++) p.r(0, y, IW - 1, y, mix("#140a18", "#d0582a", (y / 69) ** 1.7), 1);
  // the far skyline, black against the glow, windows burning here and there
  for (let x = 0, i = 0; x < IW; i++) {
    const w = 5 + Math.floor(hash(i, 81) * 9);
    const top = 42 + Math.floor(hash(i, 82) * 14);
    p.r(x, top, x + w - 1, 70, "#2e1820", 1);
    for (let k = 0; k < 2; k++) if (hash(i * 3 + k, 83) < 0.45) p.set(x + 1 + Math.floor(hash(i + k, 84) * (w - 2)), top + 2 + Math.floor(hash(i + k, 85) * (68 - top)), "#ff9a40", 1);
    x += w;
  }
  // the near city: taller blocks, every third with its roof on fire
  const blocks = [];
  for (let x = -3, i = 0; x < IW; i++) {
    const w = 14 + Math.floor(hash(i, 86) * 18);
    const top = 26 + Math.floor(hash(i, 87) * 26);
    blocks.push({ x, w, top, fire: i % 3 === 1 });
    x += w + 1 + Math.floor(hash(i, 88) * 3);
  }
  // smoke from the fires, leaning on the wind (behind the blocks)
  for (const b of blocks.filter((b) => b.fire)) {
    const fx = b.x + b.w / 2;
    for (let k = 0; k < 16; k++) p.oval(fx + k * 2.4 + hash(k, b.x + 9) * 3, b.top - 4 - k * 2.6, 3 + k * 0.9, 2 + k * 0.45, k < 5 ? "#3a2628dd" : "#2a1e24b0");
  }
  blocks.forEach((b, i) => {
    p.r(b.x, b.top, b.x + b.w - 1, 76, "#1a1014");
    p.r(b.x + b.w - 1, b.top, b.x + b.w - 1, 76, "#3a1c1a");
    p.r(b.x, b.top, b.x + b.w - 1, b.top, "#2a1a1c");
    if (hash(i, 89) < 0.5) p.r(b.x + 3, b.top - 4, b.x + 3, b.top - 1, "#1a1014");
    for (let wy = b.top + 4; wy < 72; wy += 5) for (let wx = b.x + 2; wx + 2 < b.x + b.w - 1; wx += 4) {
      const h = hash2(wx, wy, 90);
      if (h < (b.fire ? 0.35 : 0.08)) {
        p.r(wx, wy, wx + 1, wy + 2, h < 0.05 ? "#fff0a0" : "#ff8a30", 1);
        if (h < 0.04) L.push({ x: wx, y: wy + 1, r: 8, k: 0.4, c: FIRE });
      } else p.r(wx, wy, wx + 1, wy + 2, "#0e0a0c");
    }
    if (b.fire) {
      flames(p, b.x + b.w / 2, b.top - 1, Math.round(b.w / 2) - 1, b.x + 50);
      L.push({ x: b.x + b.w / 2, y: b.top - 3, r: 44, k: 0.95, c: FIRE });
    }
  });
  // the street: a burning car, and the dead walking toward us
  p.r(0, 76, IW - 1, IH - 1, "#241a1c");
  p.r(0, 76, IW - 1, 76, "#4a2a22");
  speckle(p, 0, 77, IW - 1, IH - 1, ["#2e2224", "#1c1416"], 160, 91);
  for (let sx = 4; sx < IW; sx += 20) p.r(sx, 82, sx + 9, 82, "#6a5a3a");
  p.r(160, 74, 186, 79, "#3a2a2e");
  p.r(166, 70, 182, 73, "#3a2a2e");
  for (const wx of [164, 182]) p.oval(wx, 80, 2, 2, "#0c0a0c");
  flames(p, 172, 72, 8, 92);
  L.push({ x: 172, y: 70, r: 36, k: 1.0, c: FIRE });
  for (const [x, y, d] of [[14, 87, 1], [30, 86, 1], [52, 87, 1], [74, 85, 1], [110, 87, -1], [128, 86, 1], [204, 87, -1], [222, 85, -1], [238, 87, -1]]) shambler(p, x, y, "#0c080a", d);
  // embers on the wind
  for (let i = 0; i < 50; i++) p.set(Math.floor(hash(i, 93) * IW), Math.floor(hash(i, 94) * 70), i % 3 ? "#ffb060" : "#fff0a0", 1);
  return toUrl(p, L, [0.42, 0.3, 0.32]);
}

function academy() {
  const p = buffer(IW, IH);
  const L = [];
  // the night sky, the horizon still glowing from the city's fires
  for (let y = 0; y < 62; y++) p.r(0, y, IW - 1, y, mix("#0c1230", "#6a2a34", (y / 61) ** 2.2), 1);
  stars(p, 0, IW - 1, 28, 95);
  p.oval(214, 12, 4, 4, "#eef0ff", 1);
  p.oval(216, 11, 3.6, 3.6, "#0c1230", 1);
  // the burning city far off
  for (let x = 0, i = 0; x < IW; i++) {
    const w = 4 + Math.floor(hash(i, 96) * 8);
    const top = 46 + Math.floor(hash(i, 97) * 10);
    p.r(x, top, x + w - 1, 62, "#140e18", 1);
    if (hash(i, 98) < 0.2) {
      flames(p, x + w / 2, top - 1, 2, i);
      L.push({ x: x + w / 2, y: top, r: 14, k: 0.6, c: FIRE });
    }
    x += w;
  }
  // the school: a brick front, worn and cracked, under its clock tower
  const BR = "#7a3e32";
  p.r(52, 32, 200, 72, BR);
  for (let y = 34; y < 72; y += 3) for (let x = 52 + ((y / 3) % 2) * 3; x < 200; x += 6) p.set(x, y, "#6a342a");
  p.r(48, 28, 204, 31, "#2e2228");
  p.r(48, 28, 204, 28, "#4a3a40");
  p.r(114, 8, 138, 31, BR);
  for (let i = 0; i < 7; i++) p.r(112 + i, 7 - i, 140 - i, 7 - i, "#2e2228");
  p.oval(126, 17, 5, 5, "#d8d2b8", 1);
  p.line(126, 17, 126, 13, "#2a2228", 1);
  p.line(126, 17, 129, 18, "#2a2228", 1);
  L.push({ x: 126, y: 17, r: 10, k: 0.3, c: LAMP });
  // a flag, torn, still flying
  p.r(142, 2, 142, 9, "#2a2a2e");
  p.r(143, 2, 149, 5, "#b03030");
  p.set(149, 5, "#0c1230", 1);
  p.line(60, 40, 64, 46, "#4a2420");
  p.line(184, 50, 189, 58, "#4a2420");
  // the windows: most boarded up — a few lit, someone's in there
  const LIT = new Set(["72,38", "156,38", "96,52", "168,52"]);
  for (const wy of [38, 52]) for (let wx = 60; wx < 196; wx += 12) {
    if (wx > 104 && wx < 142) continue; // the tower and the doors
    p.r(wx - 1, wy - 1, wx + 6, wy + 7, "#4a2a24");
    if (LIT.has(`${wx},${wy}`)) {
      p.r(wx, wy, wx + 5, wy + 6, "#ffd27a", 1);
      p.r(wx + 2, wy, wx + 3, wy + 6, "#c89040", 1);
      L.push({ x: wx + 3, y: wy + 3, r: 16, k: 0.7, c: WARM });
    } else {
      p.r(wx, wy, wx + 5, wy + 6, "#120e14");
      p.line(wx, wy + 1, wx + 5, wy + 5, "#8a6040");
      p.line(wx, wy + 5, wx + 5, wy + 1, "#7a5232");
    }
  }
  // a bedsheet hung from a window: SOS
  p.r(82, 37, 94, 47, "#e8e2d4");
  p.r(82, 47, 94, 47, "#c8c2b4");
  SOS.forEach((row, y) => [...row].forEach((ch, x) => ch === "1" && p.set(83 + x, 39 + y, "#b02a2a")));
  // the front doors, nailed shut, sandbags piled in front
  p.r(116, 50, 136, 72, "#2a1c1a");
  for (const y of [54, 60, 66]) p.r(114, y, 138, y + 1, "#8a6040");
  for (let row = 0; row < 3; row++) for (let x = 108 + row * 3; x < 146 - row * 3; x += 6) p.oval(x + 3, 71 - row * 3, 3, 1.6, row % 2 ? "#a8946a" : "#988458");
  // the yard, the fence and its wire, and a fire barrel by the gate
  p.r(0, 72, IW - 1, IH - 1, "#26242c");
  speckle(p, 0, 73, IW - 1, IH - 1, ["#302e36", "#1e1c22"], 140, 99);
  const fenced = (x) => x < 104 || x > 150;
  for (let x = 2; x < IW; x += 9) if (fenced(x)) p.r(x, 66, x, 78, "#4a4a52");
  for (const y of [67, 71, 75]) for (let x = 0; x < IW; x++) if (fenced(x) && (x + y) % 3) p.set(x, y, "#6a6a72");
  for (let x = 0; x < IW; x += 2) if (fenced(x)) p.set(x, x % 4 ? 65 : 64, "#8a8a92");
  p.r(96, 76, 102, 84, "#3a3a42");
  p.r(96, 76, 102, 76, "#5a5a62");
  flames(p, 99, 75, 3, 100);
  L.push({ x: 99, y: 73, r: 26, k: 0.9, c: FIRE });
  // the dead outside the fence, pressing in
  for (const [x, y, d] of [[16, 87, 1], [36, 86, 1], [204, 86, -1], [228, 87, -1], [244, 85, -1]]) shambler(p, x, y, "#0a0a10", d);
  return toUrl(p, L, [0.34, 0.36, 0.58]);
}

// The school's basement, where the survivors hide: concrete and damp, pipes along the ceiling, the
// stairs coming down from a door with cold light behind it, one bulb, the boiler glowing, shelves of
// tins, and "SAFE" chalked on the wall.
const CHALK = {
  S: ["111", "100", "111", "001", "111"], A: ["010", "101", "111", "101", "101"],
  F: ["111", "100", "110", "100", "100"], E: ["111", "100", "110", "100", "111"],
};
function basement() {
  const p = buffer(IW, IH);
  const L = [];
  // the back wall: concrete blocks, damp creeping down from the pipes
  p.r(0, 0, IW - 1, 62, "#3e3c44");
  for (let y = 4; y < 62; y += 6) {
    p.r(0, y, IW - 1, y, "#34323a");
    for (let x = (y / 6) % 2 ? 6 : 0; x < IW; x += 12) p.r(x, y + 1, x, y + 5, "#34323a");
  }
  speckle(p, 0, 0, IW - 1, 61, ["#46444c", "#36343c"], 380, 120);
  for (const [x, w, h] of [[30, 10, 18], [118, 14, 26], [174, 8, 14], [236, 10, 20]]) for (let y = 9; y < 9 + h; y++) p.r(x + Math.round(Math.sin(y / 3) * 1.5), y, x + w - Math.round((y - 9) / 4), y, "#2e2c33aa");
  p.line(88, 14, 94, 26, "#2a282e");
  p.line(94, 26, 92, 34, "#2a282e");
  // "SAFE" in chalk, and a tally of days under it
  [..."SAFE"].forEach((ch, i) => CHALK[ch].forEach((row, y) => [...row].forEach((b, x) => b === "1" && p.set(100 + i * 5 + x, 24 + y, "#cfcfc4"))));
  for (let i = 0; i < 4; i++) p.r(101 + i * 2, 32, 101 + i * 2, 35, "#b8b8ae");
  p.line(100, 35, 108, 32, "#b8b8ae");
  // pipes along the ceiling, a valve, and one coming down to the boiler
  p.r(0, 3, IW - 1, 5, "#6a5a4a");
  p.r(0, 3, IW - 1, 3, "#8a7a62");
  p.r(0, 8, IW - 1, 9, "#5a5f68");
  p.r(0, 8, IW - 1, 8, "#7a808a");
  for (let x = 20; x < IW; x += 46) p.r(x, 2, x + 2, 6, "#4a3e32");
  p.oval(150, 5, 2, 2, "#b03030");
  p.r(212, 9, 214, 30, "#5a5f68");
  p.r(212, 9, 212, 30, "#7a808a");
  for (const [x, y] of [[60, 10], [61, 12], [140, 10], [141, 13]]) p.set(x, y, "#8ab0d0", 1); // drips
  // the stairs down from the door, cold light behind it
  p.r(2, 0, 30, 22, "#1c1c24");
  p.r(6, 2, 26, 22, "#a8c4e8", 1);
  p.r(6, 2, 10, 22, "#6a86b0", 1);
  p.r(26, 2, 28, 22, "#2a2a34");
  L.push({ x: 16, y: 14, r: 46, k: 0.85, c: [0.6, 0.75, 1.0] });
  for (let i = 0; i < 9; i++) {
    const x = 2 + i * 7;
    const y = 22 + i * 5;
    p.r(x, y, x + 14, y + 4, "#55525a");
    p.r(x, y, x + 14, y, "#6e6a72");
    p.r(x, y + 4, x + 14, 62, "#3a383e");
  }
  for (let i = 0; i <= 64; i += 2) p.set(14 + i, 12 + Math.round(i * 0.72), "#7a7a82");
  for (let i = 0; i < 5; i++) p.r(14 + i * 16, 12 + Math.round(i * 16 * 0.72), 14 + i * 16, 22 + Math.round(i * 16 * 0.72), "#6a6a72");
  // shelves of tins and jars
  for (const y of [32, 42, 52]) {
    p.r(150, y, 184, y + 1, "#6b4a2f");
    for (let x = 152; x < 183; x += 4) {
      const c = ["#c0392b", "#d8b84a", "#4a7ab0", "#8a8a92", "#3f8a4a"][(x + y) % 5];
      p.r(x, y - 4, x + 2, y - 1, c);
      p.set(x, y - 4, "#c9ccd2");
    }
  }
  p.r(150, 30, 150, 62, "#5a3b24");
  p.r(184, 30, 184, 62, "#5a3b24");
  // the boiler, its grate glowing
  p.r(196, 24, 240, 64, "#7a3a2a");
  p.r(196, 24, 240, 26, "#9a4a32");
  p.r(238, 24, 240, 64, "#5a2a20");
  for (const y of [32, 44, 56]) p.r(196, y, 240, y, "#5a2a20");
  for (const [x, y] of [[198, 28], [238, 28], [198, 60], [238, 60]]) p.set(x, y, "#c9a227");
  p.oval(208, 36, 3, 3, "#e8e2d0");
  p.line(208, 36, 210, 34, "#1d2026");
  p.oval(226, 36, 3, 3, "#e8e2d0");
  p.line(226, 36, 224, 38, "#1d2026");
  p.r(206, 48, 230, 58, "#1a1010");
  for (let x = 208; x <= 228; x += 3) p.r(x, 49, x + 1, 57, "#2a1a14");
  for (let x = 208; x <= 228; x++) for (let y = 52; y <= 57; y++) if (hash2(x, y, 121) < 0.5) p.set(x, y, y > 55 ? "#fff0a0" : y > 53 ? "#ffb040" : "#e0602a", 1);
  L.push({ x: 218, y: 54, r: 60, k: 1.0, c: FIRE });
  // the bulb hanging in the middle
  p.r(126, 9, 126, 17, "#2a2a2e");
  p.r(125, 17, 127, 18, "#4a4a52");
  p.oval(126, 20, 1.6, 2, "#fff3c4", 1);
  L.push({ x: 126, y: 21, r: 70, sy: 0.8, k: 0.9, c: LAMP });
  // the floor: bare concrete, a cot and a blanket, a puddle catching the light
  p.r(0, 62, IW - 1, IH - 1, "#2c2a2e");
  p.r(0, 62, IW - 1, 62, "#46444a");
  speckle(p, 0, 63, IW - 1, IH - 1, ["#34323a", "#242226"], 260, 122);
  p.r(70, 58, 98, 62, "#4a5a3a");
  p.r(70, 58, 98, 58, "#5a6a48");
  for (const x of [71, 97]) p.r(x, 62, x, 64, "#2a2a2e");
  p.r(76, 56, 84, 58, "#c8c0a8");
  p.oval(150, 76, 18, 2.4, "#3a4458");
  p.oval(146, 76, 6, 1, "#8aa0c0", 1);
  return toUrl(p, L, [0.3, 0.3, 0.42]);
}

// The school yard at dusk, half wrecked: the court cracked and littered, a burnt-out car, the
// school's side wall with a corner caved in — and at its foot the cellar door, one leaf thrown open
// on warm light, a "STILL ALIVE!" sign propped up beside it.
const SIGN_FONT = {
  S: ["111", "100", "111", "001", "111"], T: ["111", "010", "010", "010", "010"], I: ["111", "010", "010", "010", "111"],
  L: ["100", "100", "100", "100", "111"], A: ["010", "101", "111", "101", "101"], V: ["101", "101", "101", "101", "010"],
  E: ["111", "100", "110", "100", "111"], "!": ["1", "1", "1", "0", "1"], " ": ["0", "0", "0", "0", "0"],
};
function yard() {
  const p = buffer(IW, IH);
  const L = [];
  // the dusk sky, smoke going up from the city
  for (let y = 0; y < 60; y++) p.r(0, y, IW - 1, y, mix("#1a1430", "#8a4232", (y / 59) ** 1.6), 1);
  stars(p, 0, IW - 1, 18, 130);
  for (const [x0, k0] of [[40, 0], [118, 3]]) for (let k = 0; k < 14; k++) p.oval(x0 + k * 2 + hash(k, x0) * 3, 44 - k * 3, 3 + k * 0.7, 2 + k * 0.4, "#2a1e26aa");
  for (let x = 0, i = 0; x < IW; i++) {
    const w = 5 + Math.floor(hash(i, 131) * 9);
    const top = 40 + Math.floor(hash(i, 132) * 12);
    p.r(x, top, x + w - 1, 60, "#24182a", 1);
    if (hash(i, 133) < 0.15) p.set(x + 2, top + 3, "#ff9a40", 1);
    x += w;
  }
  // the court: cracked asphalt, its faded lines, rubbish blown across it
  p.r(0, 60, IW - 1, IH - 1, "#3a3640");
  p.r(0, 60, IW - 1, 60, "#4e4a54");
  speckle(p, 0, 61, IW - 1, IH - 1, ["#43404a", "#302d36"], 300, 134);
  for (let x = 6; x < 150; x++) if (hash(x, 135) < 0.85) p.set(x, 74, "#8a8270");
  for (let y = 61; y < IH; y++) if (hash(y, 136) < 0.85) p.set(70, y, "#8a8270");
  for (const [x0, y0, x1, y1] of [[20, 66, 34, 80], [96, 64, 88, 86], [130, 70, 146, 84]]) p.line(x0, y0, x1, y1, "#26232b");
  for (let i = 0; i < 26; i++) p.r(Math.floor(hash(i, 137) * 150), 62 + Math.floor(hash(i, 138) * 24), Math.floor(hash(i, 137) * 150) + 1, 62 + Math.floor(hash(i, 138) * 24), ["#6a6458", "#8a3a2a", "#5a5f68"][i % 3]);
  // a bent basketball hoop, and a burnt-out car still smouldering
  p.r(10, 30, 11, 66, "#5a5f68");
  p.r(6, 26, 20, 34, "#c8c4b8");
  p.line(14, 36, 20, 40, "#e0602a");
  p.r(30, 66, 64, 73, "#2a2426");
  p.r(36, 61, 58, 66, "#2a2426");
  p.r(38, 62, 44, 65, "#141012");
  p.r(48, 62, 56, 65, "#141012");
  for (const wx of [36, 58]) p.oval(wx, 74, 3, 3, "#0e0c0e");
  for (let k = 0; k < 6; k++) p.set(44 + k, 60 - (k % 3), k % 2 ? "#ff8a30" : "#ffc85a", 1);
  L.push({ x: 47, y: 62, r: 22, k: 0.55, c: FIRE });
  // the school's side wall, a corner caved in, its windows boarded or smashed
  const BR = "#7a3e32";
  p.r(150, 8, IW - 1, 66, BR);
  for (let y = 10; y < 66; y += 3) for (let x = 150 + ((y / 3) % 2) * 3; x < IW; x += 6) p.set(x, y, "#6a342a");
  p.r(150, 6, IW - 1, 8, "#2e2228");
  for (let y = 6; y < 30; y++) p.r(150, y, 150 + Math.max(0, 30 - y - Math.round(hash(y, 139) * 4)), y, mix("#1a1430", "#8a4232", (y / 59) ** 1.6), 1);
  for (let i = 0; i < 40; i++) p.r(140 + Math.floor(hash(i, 140) * 30), 56 + Math.floor(hash(i, 141) * 10), 141 + Math.floor(hash(i, 140) * 30), 57 + Math.floor(hash(i, 141) * 10), i % 2 ? "#7a3e32" : "#5a2a22");
  for (const [wx, wy, kind] of [[172, 18, "boards"], [198, 18, "smashed"], [224, 18, "boards"], [198, 36, "boards"], [224, 36, "smashed"]]) {
    p.r(wx - 1, wy - 1, wx + 10, wy + 11, "#4a2a24");
    p.r(wx, wy, wx + 9, wy + 10, "#120e14");
    if (kind === "boards") { p.line(wx, wy + 1, wx + 9, wy + 9, "#8a6040"); p.line(wx, wy + 9, wx + 9, wy + 1, "#7a5232"); }
    else for (const [dx, dy] of [[1, 1], [3, 0], [8, 2], [9, 8], [0, 9]]) p.set(wx + dx, wy + dy, "#9ab8d0");
  }
  p.line(240, 10, 246, 26, "#4a2420");
  p.line(246, 26, 243, 40, "#4a2420");
  // the cellar door at the foot of the wall: one leaf shut, one thrown open on the light below
  p.r(186, 58, 230, 66, "#4a4a52");
  p.r(186, 58, 207, 66, "#5a5f68");
  for (let x = 188; x < 206; x += 4) p.r(x, 59, x, 65, "#4a4f58");
  p.r(208, 59, 229, 66, "#1a1210");
  for (let y = 60; y <= 66; y++) p.r(209, y, 228, y, mix("#ffd27a", "#8a4a20", (y - 60) / 6), 1);
  for (let i = 0; i < 3; i++) p.r(210 + i * 6, 61 + i * 2, 228, 61 + i * 2, "#c89040", 1);
  for (let i = 0; i < 9; i++) p.r(208 + i, 58 - i * 2, 230 + i, 59 - i * 2, i === 8 ? "#7a808a" : "#5a5f68");
  L.push({ x: 219, y: 62, r: 40, k: 0.9, c: WARM });
  // the sign, propped up on two posts: STILL ALIVE!
  p.r(140, 36, 141, 66, "#5a3b24");
  p.r(180, 36, 181, 66, "#5a3b24");
  p.r(134, 36, 186, 46, "#c49a64");
  p.r(134, 36, 186, 36, "#e0b884");
  p.r(134, 46, 186, 46, "#8a6440");
  let cx = 137;
  for (const ch of "STILL ALIVE!") {
    const glyph = SIGN_FONT[ch];
    glyph.forEach((row, y) => [...row].forEach((b, x) => b === "1" && p.set(cx + x, 39 + y, "#b0201a")));
    cx += glyph[0].length + 1;
  }
  p.set(cx - 1, 45, "#b0201a");
  p.set(137, 45, "#b0201a");
  return toUrl(p, L, [0.62, 0.5, 0.56]);
}

// ---------- what the UI uses ----------

const RAIDS = { mall, hospital, military_base: militaryBase, institute };
export const raidBackdrop = (landmarkId) => cached(`raid:${landmarkId}`, () => (RAIDS[landmarkId] || street)());
export const streetBackdrop = (w = AW, h = AH, depth = AH) => cached(`street:${w}x${h}x${depth}`, () => street(w, h, depth));
export const introBackdrop = (which) => cached(`intro:${which}`, () => ({ city: cityBurning, academy, yard, basement }[which] || academy)());
export const duskBackdrop = (placeId = "") => cached(`dusk:${placeId}`, () => duskStreet([...placeId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7)));
