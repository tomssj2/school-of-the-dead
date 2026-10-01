// Backdrops for the fight scenes, drawn in code as pixel art and lit the way the Night Watch board
// is (nightwatch.js buffer + lightUp): an interior for each raid — the mall atrium, the hospital
// ward, the army hangar, the lab — a street at night for the chase and the scouts' scraps, and a
// street at dusk behind each expedition team. Each is a CSS url(), cached.
//
// The arena scenes are AW x AH art pixels, shown at 4x behind a 728-wide arena; the fighters stand
// on the floor (from FLOOR down), so the busy detail stays above it.

import { buffer, lightUp, hash, hash2 } from "./nightwatch.js";
import { mix } from "./sprite.js";

const AW = 182;
const AH = 56;
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
  p.r(0, 52, AW - 1, 52, "#c8a830");
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

// ===== a street at night: the chase, and the scouts' scraps out in town =====
function street() {
  const p = buffer(AW, AH);
  const L = [];
  p.r(0, 0, AW - 1, 12, "#141c3c", 1);
  stars(p, 0, AW - 1, 10, 50);
  p.oval(160, 3, 2.5, 2.5, "#e8ecff", 1);
  p.oval(161, 2, 2.5, 2.5, "#141c3c", 1);
  // a row of buildings, a few windows still lit
  let x = 0;
  let i = 0;
  while (x < AW) {
    const w = 26 + Math.floor(hash(i, 51) * 22);
    const top = 3 + Math.floor(hash(i, 52) * 9);
    const col = ["#6a3a32", "#4a4e5a", "#5a4a3a", "#3a4a5a", "#5a3a4a"][i % 5];
    p.r(x, top, x + w - 1, 37, col);
    p.r(x, top, x + w - 1, top, mix(col, "#ffffff", 0.18));
    p.r(x + w - 1, top, x + w - 1, 37, mix(col, "#000000", 0.3));
    for (let wy = top + 3; wy < 27; wy += 6) for (let wx = x + 3; wx + 3 < x + w - 2; wx += 6) {
      const lit = hash2(wx, wy, 53) < 0.22;
      p.r(wx, wy, wx + 2, wy + 3, lit ? "#e8c35a" : "#1a2030", lit ? 1 : 0);
      if (lit) L.push({ x: wx + 1, y: wy + 2, r: 9, k: 0.4, c: WARM });
    }
    // a shop at street level
    p.r(x + 2, 29, x + w - 3, 37, "#7a7e86");
    for (let sy = 29; sy <= 37; sy += 2) p.r(x + 2, sy, x + w - 3, sy, "#62666e");
    if (hash(i, 54) < 0.4) for (let k = 0; k < 6; k++) p.set(x + 4 + Math.floor(hash(k, i + 55) * (w - 8)), 31 + Math.floor(hash(k, i + 56) * 5), ["#d64545", "#4ff0ff", "#f4d35e"][k % 3]); // graffiti
    x += w;
    i++;
  }
  // a neon sign still buzzing
  p.r(30, 22, 42, 25, "#2a2630");
  for (let k = 31; k <= 41; k += 2) p.set(k, 23, "#ff4fa0", 1);
  L.push({ x: 36, y: 24, r: 18, k: 0.5, c: [1.0, 0.35, 0.7] });
  // sidewalk, kerb, road
  p.r(0, 38, AW - 1, 42, "#8a867c");
  for (let sx = 6; sx < AW; sx += 12) p.r(sx, 38, sx, 42, "#76726a");
  p.r(0, 43, AW - 1, 43, "#b0aca2");
  p.r(0, 44, AW - 1, 44, "#22252b");
  p.r(0, 45, AW - 1, AH - 1, "#3c4048");
  speckle(p, 0, 45, AW - 1, AH - 1, ["#464a52", "#34383f"], 180, 57);
  for (let sx = 2; sx < AW; sx += 18) p.r(sx, 50, sx + 9, 50, "#c8a838");
  // a streetlight
  p.r(70, 12, 71, 42, "#30343e");
  p.r(70, 12, 79, 12, "#30343e");
  p.r(76, 13, 80, 13, "#fff2c0", 1);
  L.push({ x: 78, y: 14, len: 34, w0: 3, spread: 0.45, k: 0.8, c: LAMP });
  // a wrecked car burning
  p.r(122, 40, 156, 46, "#3a5a8a");
  p.r(122, 40, 156, 40, "#5a7aaa");
  p.r(130, 35, 148, 39, "#3a5a8a");
  p.r(132, 36, 139, 39, "#1a2030", 1);
  p.r(141, 36, 147, 39, "#1a2030", 1);
  for (const wx of [128, 150]) {
    p.oval(wx, 46, 2.2, 2.2, "#16181c");
    p.set(wx, 46, "#8a909a");
  }
  for (let fx = 123; fx <= 131; fx++) {
    const h = 3 + Math.round(hash(fx, 58) * 5);
    for (let k = 0; k < h; k++) p.set(fx, 39 - k, k > h - 2 ? "#fff3b0" : k > h - 4 ? "#ffd36a" : "#f4943a", 1);
  }
  L.push({ x: 127, y: 37, r: 34, k: 0.95, c: FIRE });
  bloodTrail(p, 20, 100, 53, 59);
  speckle(p, 0, 45, AW - 1, AH - 1, ["#d8d8d0"], 10, 60);
  return toUrl(p, L, [0.3, 0.34, 0.55]);
}

// ===== a street at dusk behind each expedition team (SW x SH at 3x), varied by the place =====
const SW = 327;
const SH = 32;
function duskStreet(seed) {
  const p = buffer(SW, SH);
  for (let y = 0; y < 16; y++) p.r(0, y, SW - 1, y, mix("#2a2450", "#d0785a", y / 15), 1);
  const sunX = 40 + Math.floor(hash(seed, 1) * 240);
  p.oval(sunX, 15, 5, 5, "#f4b060", 1);
  // the far skyline
  for (let x = 0; x < SW; ) {
    const w = 8 + Math.floor(hash(x, seed + 2) * 16);
    const top = 5 + Math.floor(hash(x, seed + 3) * 9);
    p.r(x, top, x + w - 1, 18, "#3a2c48", 1);
    for (let k = 0; k < 3; k++) if (hash(x + k, seed + 4) < 0.5) p.set(x + 2 + Math.floor(hash(x + k, seed + 5) * (w - 3)), top + 2 + Math.floor(hash(x + k, seed + 6) * (16 - top)), "#e8a858", 1);
    x += w;
  }
  // the near street: facades, dark windows, storefronts
  for (let x = 0; x < SW; ) {
    const w = 18 + Math.floor(hash(x, seed + 7) * 24);
    const top = 9 + Math.floor(hash(x, seed + 8) * 6);
    const col = ["#7a5248", "#5a5e6a", "#6a5a4a", "#4a5a6a", "#6a4a5a"][Math.floor(hash(x, seed + 9) * 5)];
    p.r(x, top, x + w - 1, 25, col, 1);
    p.r(x, top, x + w - 1, top, mix(col, "#ffd0a0", 0.3), 1);
    p.r(x + w - 1, top, x + w - 1, 25, mix(col, "#000000", 0.3), 1);
    for (let wx = x + 2; wx + 2 < x + w - 1; wx += 5) for (let wy = top + 2; wy < 20; wy += 4) p.r(wx, wy, wx + 1, wy + 1, hash2(wx, wy, seed) < 0.15 ? "#e8a858" : "#2a2438", 1);
    p.r(x + 1, 21, x + w - 2, 25, mix(col, "#1a1820", 0.5), 1);
    x += w;
  }
  p.r(0, 26, SW - 1, 27, "#9a8478", 1);
  p.r(0, 28, SW - 1, 28, "#c8aa98", 1);
  p.r(0, 29, SW - 1, SH - 1, "#4a4048", 1);
  for (let x = 4; x < SW; x += 16) p.r(x, 30, x + 7, 30, "#c8a060", 1);
  // a couple of wrecks along the kerb
  for (let k = 0; k < 2; k++) {
    const cx = 30 + Math.floor(hash(k, seed + 10) * 260);
    const col = ["#8a3030", "#3a5a8a", "#c89a3a"][Math.floor(hash(k, seed + 11) * 3)];
    p.r(cx, 25, cx + 13, 28, col, 1);
    p.r(cx + 3, 23, cx + 10, 24, col, 1);
    p.r(cx + 4, 23, cx + 9, 24, "#2a2438", 1);
  }
  return toUrl(p, [], [1, 1, 1]);
}

// ---------- what the UI uses ----------

const RAIDS = { mall, hospital, military_base: militaryBase, institute };
export const raidBackdrop = (landmarkId) => cached(`raid:${landmarkId}`, () => (RAIDS[landmarkId] || street)());
export const streetBackdrop = () => cached("street", street);
export const duskBackdrop = (placeId = "") => cached(`dusk:${placeId}`, () => duskStreet([...placeId].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7)));
