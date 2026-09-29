// The Night Watch board's art: the school's front at night, drawn in code as pixel art like the
// room banners, and small pixel sprites for the defenses built on it. The board is the entrance
// grid (ENTRANCE_GRID_SIZE squares a side): the school's doors — the gate — across the top, the
// front steps where defenders stand (rows 0-1), the courtyard where defenses go (rows 2-3) and
// the street the horde comes up from (rows 4-5).

import { shadowOf, lightOf, mix } from "./sprite.js";

// Art pixels: each square is CELL_W x CELL_H, under a facade FACADE_H tall.
export const CELL_W = 32;
export const CELL_H = 20;
export const FACADE_H = 26;

function painter() {
  let rects = "";
  const r = (x0, y0, x1, y1, c) => {
    if (x1 < x0 || y1 < y0) return;
    rects += `<rect x="${x0}" y="${y0}" width="${x1 - x0 + 1}" height="${y1 - y0 + 1}" fill="${c}"/>`;
  };
  return { r, svg: (w, h) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>` };
}

function hash(i, s) {
  let x = Math.imul(i + 17, 2654435761) ^ Math.imul(s + 3, 40503);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

const cache = new Map();

// The whole board as a CSS url(): `size` squares a side.
export function courtyardBackground(size) {
  const key = `yard${size}`;
  if (cache.has(key)) return cache.get(key);
  const W = size * CELL_W;
  const third = Math.floor(size / 3);
  const H = FACADE_H + size * CELL_H;
  const rowY = (row) => FACADE_H + row * CELL_H;
  const { r, svg } = painter();

  // --- the school's front: dark brick, lit windows, the double doors in the middle ---
  r(0, 0, W - 1, FACADE_H - 1, "#3a2a2e");
  for (let y = 2; y < FACADE_H - 4; y += 3) {
    r(0, y, W - 1, y, "#2e2226");
    for (let x = (y / 3) % 2 ? 0 : 4; x < W; x += 8) r(x, y - 2, x, y - 1, "#2e2226");
  }
  r(0, 0, W - 1, 1, "#4a3a3e");
  const doorW = 30;
  const doorX = Math.round(W / 2 - doorW / 2);
  // windows either side, a few lit
  for (let x = 8; x < W - 14; x += 22) {
    if (x + 14 > doorX - 4 && x < doorX + doorW + 4) continue;
    const lit = hash(x, 1) < 0.55;
    r(x, 5, x + 13, 16, "#1d1a22");
    r(x + 1, 6, x + 12, 15, lit ? "#e8c35a" : "#20283a");
    if (lit) r(x + 1, 6, x + 12, 7, "#f4dc8a");
    r(x + 7, 6, x + 7, 15, "#1d1a22");
    r(x + 1, 11, x + 12, 11, "#1d1a22");
    if (!lit) for (let i = 0; i < 3; i++) r(x - 1, 8 + i * 3, x + 14, 8 + i * 3, "#6b4a2f"); // boarded up
  }
  // the doors (the gate), a porch light over them
  r(doorX - 3, 2, doorX + doorW + 2, FACADE_H - 1, "#2a2024");
  r(doorX, 4, doorX + doorW - 1, FACADE_H - 1, "#4a5a78");
  r(doorX + Math.floor(doorW / 2) - 1, 4, doorX + Math.floor(doorW / 2), FACADE_H - 1, "#2a3448");
  for (const dx of [5, doorW - 9]) r(doorX + dx, 8, doorX + dx + 3, 14, "#9ab8d8");
  r(doorX - 2, 1, doorX + doorW + 1, 2, "#6b6f78");
  r(doorX + Math.floor(doorW / 2) - 3, 0, doorX + Math.floor(doorW / 2) + 2, 1, "#f4d35e");

  // --- the front steps (the defenders' rows): stone slabs, sandbags at the ends ---
  const stepTop = rowY(0);
  const stepBottom = rowY(third) - 1;
  // stone stairs down from the doors: each step lit along its edge, shadowed under the lip
  r(0, stepTop, W - 1, stepBottom, "#3a3d47");
  for (let y = stepTop; y <= stepBottom; y += 8) {
    r(0, y, W - 1, y, "#4e525e");
    r(0, y + 1, W - 1, y + 1, "#454955");
    r(0, y + 7, W - 1, y + 7, "#2c2e36");
    for (let x = (y / 8) % 2 ? 6 : 18; x < W; x += 24) r(x, y + 2, x, y + 6, "#33363f");
  }
  // warm light spilling out of the doors
  for (let i = 0; i < 7; i++) r(doorX - 4 - i * 4, stepTop + i * 3, doorX + doorW + 3 + i * 4, stepTop + i * 3 + 2, mix("#3a3d47", "#e8c35a", 0.2 - i * 0.026));
  for (const x of [2, W - 12]) {
    for (let i = 0; i < 3; i++) {
      r(x, stepTop + 3 + i * 4, x + 9, stepTop + 6 + i * 4, "#a8946a");
      r(x, stepTop + 6 + i * 4, x + 9, stepTop + 6 + i * 4, "#7a6a4a");
    }
  }
  r(0, stepBottom, W - 1, stepBottom, "#3a3e48");

  // --- the courtyard (the defenses' rows): dark lawn, a paved path, lamp posts ---
  const yardTop = rowY(third);
  const yardBottom = rowY(third * 2) - 1;
  r(0, yardTop, W - 1, yardBottom, "#253b2a");
  for (let i = 0; i < 90; i++) r(Math.floor(hash(i, 5) * W), yardTop + Math.floor(hash(i, 6) * (yardBottom - yardTop)), Math.floor(hash(i, 5) * W), yardTop + Math.floor(hash(i, 6) * (yardBottom - yardTop)), i % 2 ? "#2f4a33" : "#1e3122");
  r(doorX + 4, yardTop, doorX + doorW - 5, yardBottom, "#4a4e56");
  for (let y = yardTop + 3; y < yardBottom; y += 6) r(doorX + 4, y, doorX + doorW - 5, y, "#3e424a");
  // pools of lamp light, and the lamps
  for (const lx of [Math.round(W * 0.2), Math.round(W * 0.8)]) {
    const cy = Math.round((yardTop + yardBottom) / 2) + 6;
    for (let i = 0; i < 5; i++) r(lx - 16 + i * 3, cy - 4 + i, lx + 16 - i * 3, cy + 4 - i, mix("#253b2a", "#e8d88a", 0.08 + i * 0.03));
    r(lx, yardTop + 2, lx + 1, cy, "#2a2e36");
    r(lx - 2, yardTop, lx + 3, yardTop + 2, "#f4e8a8");
  }
  // a bench and a flagpole
  r(8, yardBottom - 7, 22, yardBottom - 6, "#6b4a2f");
  r(9, yardBottom - 5, 9, yardBottom - 3, "#4a3020");
  r(21, yardBottom - 5, 21, yardBottom - 3, "#4a3020");
  r(W - 20, yardTop + 1, W - 20, yardBottom - 2, "#9aa0a8");
  r(W - 19, yardTop + 1, W - 13, yardTop + 4, "#8a2a2a");

  // --- a broken fence, then the street (where the horde spawns) ---
  const streetTop = rowY(third * 2);
  r(0, streetTop, W - 1, H - 1, "#23262d");
  for (let i = 0; i < 70; i++) r(Math.floor(hash(i, 8) * W), streetTop + 3 + Math.floor(hash(i, 9) * (H - streetTop - 4)), Math.floor(hash(i, 8) * W) + 1, streetTop + 3 + Math.floor(hash(i, 9) * (H - streetTop - 4)), "#2b2f37");
  const mid = Math.round((streetTop + H) / 2);
  for (let x = 4; x < W; x += 16) r(x, mid, x + 7, mid, "#8a7a4a");
  r(0, streetTop, W - 1, streetTop + 1, "#4a4e56"); // the kerb
  for (let x = 0; x < W; x += 6) {
    if (hash(x, 4) < 0.3) continue; // missing pickets
    r(x, streetTop - 5, x + 1, streetTop, "#6b5a44");
  }
  r(0, streetTop - 3, W - 1, streetTop - 3, "#7a6a50");
  // an abandoned car, puddles
  const carX = Math.round(W * 0.68);
  r(carX, mid + 3, carX + 22, mid + 9, "#5a2a2a");
  r(carX + 5, mid + 1, carX + 16, mid + 3, "#3a2020");
  r(carX + 6, mid + 1, carX + 15, mid + 2, "#3a4a5a");
  for (const dx of [2, 16]) r(carX + dx, mid + 9, carX + dx + 3, mid + 10, "#111418");
  for (const [x, y] of [[Math.round(W * 0.15), mid + 5], [Math.round(W * 0.45), mid - 4]]) {
    r(x, y, x + 9, y + 2, "#2e3a4e");
    r(x + 2, y, x + 5, y, "#4a5a78");
  }
  // mist rolling in from the bottom
  for (let i = 0; i < 6; i++) r(0, H - 1 - i * 2, W - 1, H - 1 - i * 2, mix("#23262d", "#6a7488", 0.28 - i * 0.04));

  const url = `url('data:image/svg+xml,${encodeURIComponent(svg(W, H))}')`;
  cache.set(key, url);
  return url;
}

// A defense on the board, 32x20 like a square: a barricade, sandbags, spikes, razor wire — or,
// once smashed, rubble.
export function structureSprite(id, sizePx = 64) {
  const key = `st:${id}`;
  if (!cache.has(key)) {
    const { r, svg } = painter();
    if (id === "barricade") {
      for (const [x0, x1] of [[4, 27]]) {
        r(x0, 9, x1, 12, "#8a5f33");
        r(x0, 9, x1, 9, "#a8753f");
        r(x0, 14, x1, 17, "#7a5230");
      }
      for (let x = 4; x <= 27; x += 4) r(x, 10, x + 1, 11, x % 8 ? "#f4f4f4" : "#d64545");
      for (const x of [7, 24]) r(x, 6, x + 1, 18, "#5a3b24");
      r(3, 18, 28, 18, "#3a2a1e");
    } else if (id === "sandbag_wall") {
      for (const [y, off] of [[13, 0], [9, 3], [5, 6]]) {
        for (let x = 3 + off; x + 6 <= 29 - off; x += 7) {
          r(x, y, x + 6, y + 3, "#b8a47a");
          r(x, y, x + 6, y, "#d0bc92");
          r(x, y + 3, x + 6, y + 3, "#8a7654");
        }
      }
      r(2, 17, 29, 17, "#5a4e38");
    } else if (id === "spike_trap") {
      r(4, 14, 27, 16, "#4a4e56");
      r(4, 14, 27, 14, "#6b6f78");
      for (let x = 5; x < 27; x += 4) {
        r(x + 1, 8, x + 1, 13, "#c9ccd2");
        r(x, 11, x + 2, 13, "#9aa0a8");
        r(x + 1, 8, x + 1, 8, "#ffffff");
      }
      r(8, 12, 9, 13, "#8a2020");
    } else if (id === "razor_wire") {
      for (let x = 3; x < 29; x += 1) {
        const y = 11 + Math.round(Math.sin(x / 1.6) * 3);
        r(x, y, x, y, "#b6bbc3");
        const y2 = 11 + Math.round(Math.cos(x / 1.6) * 3);
        r(x, y2, x, y2, "#8a909a");
      }
      for (const x of [3, 28]) r(x, 6, x, 17, "#5a3b24");
      for (let x = 5; x < 28; x += 5) r(x, 9, x, 9, "#ffffff");
    } else {
      // rubble
      for (let i = 0; i < 16; i++) r(4 + Math.floor(hash(i, 2) * 22), 12 + Math.floor(hash(i, 3) * 5), 6 + Math.floor(hash(i, 2) * 22), 13 + Math.floor(hash(i, 3) * 5), i % 2 ? "#6b6f78" : "#5a4e38");
    }
    cache.set(key, svg(32, 20));
  }
  return cache.get(key).replace("<svg ", `<svg class="nw-structure-sprite" style="width:${sizePx}px;height:auto" `);
}
