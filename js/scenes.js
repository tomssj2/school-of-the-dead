// Procedural pixel-art backdrops for each room and a small set of pixel icons, drawn in the same
// style as the character sprites (no image assets). Scenes are anchored to the floor, and wider
// cards tile them sideways; the UI stands the room's characters on top of them.

import { shadowOf, lightOf, outlineOf, mix } from "./sprite.js";
import { buffer, lightUp } from "./lighting.js";

// ---------- high-resolution room scenes ----------
// 192x48, twice the detail of the old 96x24 ones, and drawn by room level: a level-1 room is
// run-down (boarded windows, cracks, boxes), each level adds equipment, light and decor, and a
// maxed room is fully kitted out. Rows 0-31 are wall (the wainscot from 22), 32-47 the floor.
// They're lit like the Night Watch board and the fight backdrops (lighting.js): the drawing gets
// `r.glow` (a rect that gives off its own light) and `r.light` (a light pool or beam) next to `r`.
// The banner's labels cover the top corners (roughly x < 70 and x > 100 above y 14) and the crowd
// the floor, so the pieces that should be seen hang on the wall between y 10 and 30.

const HW = 192;
const HH = 48;

// A filled box with a darker 1px edge; a big enough one is lit along its top and shaded along
// its bottom, so it has some depth.
function box(r, x0, y0, x1, y1, fill, edge = shadowOf(fill)) {
  r(x0, y0, x1, y1, edge);
  if (x1 - x0 > 1 && y1 - y0 > 1) r(x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill);
  if (x1 - x0 >= 5 && y1 - y0 >= 4) {
    r(x0 + 1, y0 + 1, x1 - 1, y0 + 1, mix(fill, "#fff4dc", 0.16));
    r(x0 + 1, y1 - 1, x1 - 1, y1 - 1, mix(fill, "#1a1424", 0.14));
  }
}

// A pixel-noise texture over a rect: a few pixels a shade darker or lighter than `c`, so painted
// walls, planks and dirt read as surfaces instead of flat fills.
function grain(r, x0, y0, x1, y1, c, seed, amount = 0.05, dark = 0.07, light = 0.05) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const h = hash01(x * 977 + y * 131, seed);
    if (h < amount) r(x, y, x, y, mix(c, "#1a1424", dark));
    else if (h > 1 - amount * 0.6) r(x, y, x, y, mix(c, "#fff4dc", light));
  }
}

// Walls of painted cinder block (each block a shade off its neighbours, lit along its top) over a
// panelled wainscot, a baseboard, and a plank floor, every plank its own tone with a grain. A
// run-down room (r.lv 1-2) has water stains down the wall, grime along the bottom and dust and
// rubbish on the floor — and blood at level 1.
function hiRoom(r, { wall, wainscot, floor, floorLine, blocks = true, tiles = null, concrete = false }) {
  const lv = r.lv || 5;
  r(0, 0, HW - 1, 31, wall);
  if (blocks) {
    const mortar = mix(wall, "#1d2330", 0.2);
    for (let row = 0; row < 5; row++) {
      const y0 = row * 5;
      const y1 = Math.min(21, y0 + 3);
      for (let x = row % 2 ? -8 : 0, i = 0; x < HW; x += 16, i++) {
        const t = hash01(i * 7 + row * 31, 5) - 0.5;
        const c = t < 0 ? mix(wall, "#1d2330", -t * 0.12) : mix(wall, "#fff4dc", t * 0.1);
        r(Math.max(0, x + 1), y0, Math.min(HW - 1, x + 15), y1, c);
        r(Math.max(0, x + 1), y0, Math.min(HW - 1, x + 15), y0, mix(c, "#fff4dc", 0.08));
        if (x >= 0) r(x, y0, x, y1, mortar);
      }
      if (y0 + 4 < 22) r(0, y0 + 4, HW - 1, y0 + 4, mortar);
    }
  }
  grain(r, 0, 0, HW - 1, 21, wall, 3, 0.035);
  // the wainscot: panels with a lit edge and a shaded seam, a rail on top
  r(0, 22, HW - 1, 30, wainscot);
  for (let x = 0; x < HW; x += 24) {
    r(x, 24, x, 30, shadowOf(wainscot));
    r(x + 1, 24, x + 1, 30, mix(wainscot, "#fff4dc", 0.1));
  }
  grain(r, 0, 24, HW - 1, 30, wainscot, 4, 0.03);
  r(0, 22, HW - 1, 22, lightOf(wainscot));
  r(0, 23, HW - 1, 23, shadowOf(wainscot));
  r(0, 30, HW - 1, 30, mix(wainscot, "#1a1424", 0.25));
  r(0, 31, HW - 1, 31, "#241c2a");
  r(0, 32, HW - 1, 47, floor);
  if (tiles) {
    // chequered lino (`tiles`: its two colours), scuffed
    for (let x = 0; x < HW; x += 8) for (let y = 32; y < HH; y += 4) r(x, y, x + 7, Math.min(HH - 1, y + 3), ((x / 8) + (y - 32) / 4) % 2 ? tiles[1] : tiles[0]);
    grain(r, 0, 32, HW - 1, 47, tiles[0], 15, 0.05, 0.12, 0.06);
  } else if (concrete) {
    // poured concrete in slabs, gritty, stained with oil
    grain(r, 0, 32, HW - 1, 47, floor, 17, 0.12, 0.12, 0.07);
    r(0, 39, HW - 1, 39, floorLine);
    for (let x = 20; x < HW; x += 48) r(x, 32, x, 47, floorLine);
    for (const [x, y, w] of [[34, 42, 9], [118, 36, 6], [160, 44, 11]]) {
      r(x, y, x + w, y + 1, mix(floor, "#1a1424", 0.28));
      r(x + 2, y + 2, x + w - 3, y + 2, mix(floor, "#1a1424", 0.2));
    }
  } else {
    // planks, each a little lighter or darker, with a grain and their joints staggered
    for (let y = 32, row = 0; y < HH; y += 4, row++) {
      for (let x = row % 2 ? -22 : -8, i = 0; x < HW; x += 28, i++) {
        const t = hash01(i * 13 + row * 57, 6) - 0.5;
        const c = t < 0 ? mix(floor, "#1a1424", -t * 0.14) : mix(floor, "#fff4dc", t * 0.12);
        r(Math.max(0, x + 1), y, Math.min(HW - 1, x + 27), Math.min(HH - 1, y + 2), c);
        if (x >= 0) r(x, y, x, Math.min(HH - 1, y + 2), floorLine);
      }
      r(0, y + 3, HW - 1, y + 3, floorLine);
    }
    grain(r, 0, 32, HW - 1, 47, floor, 7, 0.06, 0.1, 0.06);
  }
  if (lv <= 2) {
    // water stains running down from the ceiling
    for (const [x, len, wd] of [[18, 12, 2], [77, 8, 1], [121, 15, 3], [176, 10, 2]].slice(0, lv === 1 ? 4 : 2)) {
      for (let y = 0; y < len; y++) {
        const ww = Math.max(1, Math.round(wd * (1 - y / len) + 0.4));
        r(x, y, x + ww - 1, y, `${mix(wall, "#3a3020", 0.2)}`);
      }
    }
    // grime along the bottom of the wall
    for (let x = 0; x < HW; x++) {
      const top = 27 + Math.floor(hash01(x, 8) * 3);
      r(x, top, x, 29, mix(wainscot, "#2a2018", 0.16));
    }
    // dust, scraps of paper and grit on the floor
    for (let i = 0; i < (lv === 1 ? 46 : 22); i++) {
      const x = Math.floor(hash01(i, 9) * HW);
      const y = 33 + Math.floor(hash01(i, 10) * 14);
      const k = hash01(i, 11);
      if (k < 0.25) r(x, y, x + 1, y, "#d8d2c0");
      else if (k < 0.6) r(x, y, x, y, mix(floor, "#e8e2d0", 0.35));
      else r(x, y, x, y, mix(floor, "#1a1424", 0.35));
    }
    if (lv === 1) {
      // dried blood: a splash by the wall and a smear dragged across the floor
      for (const [x, y] of [[102, 33], [103, 33], [101, 34], [104, 34], [102, 35], [106, 33], [99, 33]]) r(x, y, x, y, "#5e1a1a");
      for (let x = 108; x < 150; x++) if (hash01(x, 12) < 0.6) r(x, 38 + Math.round(Math.sin(x / 7) * 1.4), x, 38 + Math.round(Math.sin(x / 7) * 1.4), hash01(x, 13) < 0.5 ? "#5a1818" : "#6a1d1d");
    }
  }
  r.shellDone?.();
}

// A hanging pendant lamp: a cord, a metal shade lit along its edge and a rim and bulb glowing
// underneath when it's `on`; off (or broken) it hangs dark.
function lamp(r, x, len, on) {
  const glow = (on && r.glow) || r;
  r(x, 0, x, len - 1, "#2e323a");
  r(x - 1, len, x + 1, len, "#4a505a");
  r(x - 2, len + 1, x + 2, len + 1, on ? "#6a707a" : "#454a52");
  r(x - 3, len + 2, x + 3, len + 2, on ? "#8a909a" : "#545962");
  r(x - 2, len + 1, x - 2, len + 1, on ? "#9aa0aa" : "#5a5f68");
  r(x - 3, len + 2, x - 2, len + 2, on ? "#b0b6c0" : "#646a74");
  glow(x - 4, len + 3, x + 4, len + 3, on ? "#f4d35e" : "#3a3f48");
  glow(x - 1, len + 3, x + 1, len + 3, on ? "#fff6d0" : "#5a5f68");
  if (on) {
    r.light?.({ x, y: len + 4, r: 24, k: 0.42, c: LAMP_LIGHT });
    r.light?.({ x, y: len + 4, len: 46, w0: 4, spread: 0.62, k: 0.32, c: LAMP_LIGHT });
  }
}

// A window `w` x `h` on the wall over a sill. From level 2 the glass glows with the day outside —
// the sky over the ruined skyline — and throws a shaft of daylight; level 2 still has a plank
// nailed across it, and level 1 is boarded up, light leaking between the planks.
function hiWindow(r, x, y, w, h, lv) {
  const glass = r.glow || r;
  const [gx0, gx1, gy0, gy1] = [x + 1, x + w - 1, y + 1, y + h - 1];
  box(r, x, y, x + w, y + h, "#3a4150", "#262a34");
  r(x, y, x + w, y, "#525a6a");
  r(x - 1, y + h + 1, x + w + 1, y + h + 1, "#a8aeb6");
  r(x - 1, y + h + 2, x + w + 1, y + h + 2, "#5a5f68");
  if (lv >= 2) {
    for (let yy = gy0; yy <= gy1; yy++) glass(gx0, yy, gx1, yy, mix("#78a8d4", "#d4eaf6", (yy - gy0) / Math.max(1, gy1 - gy0)));
    for (let xx = gx0; xx <= gx1; xx++) {
      const bh = 1 + Math.floor(hash01(xx * 3 + x, 40) * Math.max(1, Math.min(4, Math.floor(h / 2) - 1)));
      glass(xx, gy1 - bh + 1, xx, gy1, hash01(xx, 41) < 0.12 ? "#5e6e84" : "#7e8ea4");
    }
    for (let i = 0; i < 3 && gx0 + 2 + i <= gx1 && gy0 + i < gy1; i++) glass(gx0 + 2 + i, gy0 + i, gx0 + 2 + i, gy0 + i, "#ffffff");
    r.light?.({ x: x + w / 2, y: y + h / 2, r: w + 6, sy: 0.9, k: 0.28, c: DAYLIGHT });
    r.light?.({ x: x + w / 2, y: y + h, len: 60, w0: w / 2 - 1, spread: 0.35, k: 0.2, c: DAYLIGHT });
  } else {
    r(gx0, gy0, gx1, gy1, "#1a1e28");
    for (let yy = gy0; yy <= gy1; yy++) for (let xx = gx0; xx <= gx1; xx++) if (hash01(xx * 7 + yy, 42) < 0.35) glass(xx, yy, xx, yy, "#8aa2ba");
    r.light?.({ x: x + w / 2, y: y + h / 2, r: w + 4, k: 0.14, c: DAYLIGHT });
  }
  r(x + Math.floor(w / 2), gy0, x + Math.floor(w / 2), gy1, "#3a4150");
  const board = (yy, k) => {
    r(x - 1, yy, x + w + 1, yy + 1, k ? "#7a5530" : "#8a5f33");
    r(x - 1, yy, x + w + 1, yy, k ? "#966a3a" : "#a8753f");
    r(x, yy + 1, x, yy + 1, "#c9ccd2");
    r(x + w, yy + 1, x + w, yy + 1, "#c9ccd2");
  };
  if (lv <= 1) {
    board(y + 1, 0);
    board(y + Math.floor(h / 2), 1);
    board(y + h - 2, 0);
  } else if (lv === 2) board(y + Math.floor(h / 2), 1);
}

// ---- shared props ----
const crack = (r, x, y, c = "#2e3440") => {
  for (const [dx, dy] of [[0, 0], [1, 1], [1, 2], [2, 3], [3, 5], [2, 6], [4, 6]]) r(x + dx, y + dy, x + dx, y + dy, c);
};
// A cardboard box: taped shut down the middle, a printed mark in the corner, and its flaps sticking
// up if it's `open`.
function carton(r, x0, y0, x1, y1, c, open = false) {
  box(r, x0, y0, x1, y1, c, shadowOf(c));
  r(x0 + 1, y0 + 1, x1 - 1, y0 + 1, lightOf(c));
  const mid = Math.round((x0 + x1) / 2);
  r(mid, y0, mid + 1, y1, mix(c, "#efe0b8", 0.35));
  r(x0 + 2, y1 - 3, x0 + 4, y1 - 3, mix(c, "#2a1e14", 0.45));
  r(x0 + 2, y1 - 2, x0 + 3, y1 - 2, mix(c, "#2a1e14", 0.45));
  if (open) {
    r(x0 - 1, y0 - 2, x0 + 4, y0 - 1, lightOf(c));
    r(x0 - 1, y0 - 1, x0 + 4, y0 - 1, c);
    r(x1 - 4, y0 - 2, x1 + 1, y0 - 1, shadowOf(c));
  }
}
// Level-1 clutter: cardboard boxes stacked against the wall, the top one open.
function boxes(r, x) {
  carton(r, x, 20, x + 16, 31, "#a8814f");
  carton(r, x + 4, 12, x + 16, 19, "#b58e5a", true);
  carton(r, x + 18, 24, x + 32, 31, "#9c7747");
}
// A potted plant: a terracotta pot with a rim and leaves fanning out in three greens.
function plant(r, x, base) {
  box(r, x, base - 4, x + 6, base, "#b0673a", "#7a4424");
  r(x - 1, base - 5, x + 7, base - 5, "#c98050");
  r(x + 1, base - 4, x + 5, base - 4, "#4a3020");
  const cx = x + 3;
  for (const [dx, dy, n] of [[-4, -2, 4], [-3, -5, 4], [-1, -7, 5], [1, -7, 5], [3, -5, 4], [4, -2, 4], [0, -4, 3]]) {
    for (let k = 1; k <= n; k++) {
      const px = Math.round(cx + (dx * k) / n);
      const py = Math.round(base - 5 + (dy * k) / n);
      r(px, py, px, py, k === n ? "#7cd6a2" : k === 1 ? "#2f7a55" : "#4caf7d");
    }
  }
}
// A wall shelf on two brackets with items [dx, height, color] standing on it.
function shelf(r, x0, x1, y, items) {
  r(x0, y, x1, y, "#a8753f");
  r(x0, y + 1, x1, y + 1, "#5a3b24");
  for (const bx of [x0 + 2, x1 - 2]) {
    r(bx, y + 2, bx, y + 3, "#4a3020");
    r(bx + 1, y + 2, bx + 1, y + 2, "#4a3020");
  }
  for (const [dx, h, c] of items) {
    box(r, x0 + dx, y - h, x0 + dx + 2, y - 1, c);
    r(x0 + dx, y - h, x0 + dx + 2, y - h, lightOf(c));
  }
}
// A chalkboard in a wooden frame, smudged where it's been wiped, a tray of chalk and a duster along
// the bottom; a `dirty` one is grey with dust.
function chalkboard(r, x0, y0, x1, y1, dirty) {
  const board = dirty ? "#3b423b" : "#2f4a3a";
  box(r, x0, y0, x1, y1, board, "#4a3020");
  r(x0 - 1, y0 - 1, x1 + 1, y0 - 1, "#a8753f");
  r(x0 - 1, y0, x0 - 1, y1, "#8a5f33");
  r(x1 + 1, y0, x1 + 1, y1, "#5a3b24");
  for (let i = 0; i < 6; i++) {
    const sx = x0 + 3 + Math.floor(hash01(i + x0, 50) * Math.max(1, x1 - x0 - 14));
    const sy = y0 + 2 + Math.floor(hash01(i + x0, 51) * Math.max(1, y1 - y0 - 4));
    const len = 5 + Math.floor(hash01(i + x0, 52) * 7);
    r(sx, sy, sx + len, sy, mix(board, "#e8efe8", dirty ? 0.14 : 0.07));
    r(sx + 1, sy + 1, sx + len - 2, sy + 1, mix(board, "#e8efe8", dirty ? 0.1 : 0.05));
  }
  r(x0 - 1, y1 + 1, x1 + 1, y1 + 1, "#a8753f");
  r(x0 - 1, y1 + 2, x1 + 1, y1 + 2, "#5a3b24");
  r(x0 + 4, y1, x0 + 7, y1, "#f4f6f8");
  r(x0 + 9, y1, x0 + 10, y1, dirty ? "#c9ccd2" : "#f4d35e");
  r(x1 - 10, y1 - 1, x1 - 6, y1 - 1, "#8a6a4a");
  r(x1 - 10, y1, x1 - 6, y1, "#c9ccd2");
}
// A bookcase: a dark wood frame, the shelves deep in shadow, books of every height and colour on
// them (the odd gap), each spine lit along its top.
function bookcase(r, x0, y0, x1, y1) {
  box(r, x0, y0, x1, y1, "#4a3020", "#2e1e14");
  r(x0, y0, x1, y0, "#7a5536");
  const colors = ["#b04848", "#3f6fb5", "#d8b04a", "#4c9f6d", "#7a5ab6", "#c8602a", "#e8e2d0", "#5a6a7a", "#9a3a3a"];
  for (let y = y0 + 2, row = 0; y + 5 < y1; y += 6, row++) {
    r(x0 + 1, y, x1 - 1, y + 4, "#24170e");
    for (let x = x0 + 2, i = row * 17; x < x1 - 1; i++) {
      if (hash01(i + x0 * 3, 60) < 0.07) {
        x += 2;
        continue;
      }
      const ww = hash01(i + x0 * 3, 61) < 0.3 ? 2 : 1;
      const top = y + (hash01(i + x0 * 3, 62) < 0.4 ? 1 : 0) + (hash01(i + x0 * 3, 64) < 0.15 ? 1 : 0);
      const c = colors[Math.floor(hash01(i + x0 * 3, 63) * colors.length)];
      const xe = Math.min(x1 - 2, x + ww - 1);
      r(x, top, xe, y + 4, c);
      r(x, top, xe, top, lightOf(c));
      if (xe > x) r(xe, top + 1, xe, y + 4, shadowOf(c));
      x = xe + 1;
    }
    r(x0 + 1, y + 5, x1 - 1, y + 5, "#7a5536");
  }
}
// A desk: a top with a lit edge and a shadow under its lip, steel legs and a footbar.
function desk(r, x0, x1, y, top = "#c49a64") {
  r(x0, y, x1, y + 1, top);
  r(x0, y, x1, y, lightOf(top));
  r(x0 + 1, y + 2, x1 - 1, y + 2, mix(top, "#1a1424", 0.4));
  for (const lx of [x0 + 1, x1 - 1]) {
    r(lx, y + 3, lx, 31, "#6b707a");
    r(lx, y + 3, lx, y + 3, "#8a909a");
  }
  r(x0 + 2, 29, x1 - 2, 29, "#545962");
}
// A hospital bed against the wall: a steel frame on wheels, a mattress, a pillow and a blanket with
// its folds — or the bare frame and its springs (level 1).
function hiBed(r, x, bare) {
  box(r, x, 15, x + 3, 31, "#9aa5b1", "#5a626c");
  r(x + 1, 16, x + 1, 30, "#c9d2dc");
  r(x + 3, 24, x + 36, 25, "#8a95a1");
  r(x + 3, 24, x + 36, 24, "#c9d2dc");
  box(r, x + 34, 21, x + 36, 31, "#9aa5b1", "#5a626c");
  for (const lx of [x + 5, x + 33]) {
    r(lx, 26, lx, 29, "#6b737d");
    r(lx - 1, 30, lx + 1, 31, "#2a2d33");
  }
  if (bare) {
    for (let sx = x + 5; sx < x + 33; sx += 2) r(sx, 23, sx, 23, "#6b737d");
    r(x + 4, 22, x + 33, 22, "#7a828c");
    return;
  }
  box(r, x + 4, 20, x + 34, 23, "#eef2f6", "#b9c4ce");
  box(r, x + 5, 17, x + 12, 21, "#ffffff", "#c9d2dc");
  r(x + 6, 17, x + 11, 17, "#ffffff");
  r(x + 6, 20, x + 11, 20, "#dde4ea");
  box(r, x + 14, 19, x + 34, 23, "#7fa8dc", "#5a80b4");
  r(x + 15, 19, x + 33, 19, "#a8c8f0");
  r(x + 15, 20, x + 33, 20, "#e8f0f8");
  for (const fx of [x + 20, x + 27]) r(fx, 21, fx, 22, "#6a90c4");
}

// Outdoors: a sky (grey and smoky at level 1, clearing up level by level) over the ruined city,
// and the ground from row 24.
function hiOutdoor(r, lv, ground) {
  const sky = ["#8b95a0", "#95b8d8", "#8fc0e6", "#8cc4ec", "#92cbf2"][lv - 1];
  for (let i = 0; i < 4; i++) r(0, i * 6, HW - 1, i * 6 + 5, mix(sky, "#f4f0e0", i * 0.12));
  if (lv >= 2) for (const [x, y, w] of [[20, 4, 14], [84, 2, 18], [150, 6, 12]].slice(0, lv >= 4 ? 3 : 2)) {
    r(x, y, x + w, y + 1, "#f4f8fc");
    r(x + 3, y - 1, x + w - 4, y - 1, "#f4f8fc");
  }
  const city = mix(sky, "#2a3140", 0.55);
  const skyline = [[0, 10, 9], [11, 7, 14], [19, 12, 7], [32, 9, 12], [42, 14, 6], [57, 6, 10], [64, 11, 16], [76, 8, 8], [85, 12, 12],
    [98, 7, 9], [106, 13, 15], [120, 9, 7], [130, 11, 11], [142, 6, 13], [149, 12, 8], [162, 9, 14], [172, 11, 6], [184, 8, 10]];
  for (const [x, w, h] of skyline) {
    r(x, 24 - h, x + w, 23, city);
    r(x + w - 2, 24 - h, x + w, 24 - h + 1, sky); // a broken corner
    for (let wy = 26 - h; wy < 22; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 3) r(wx, wy, wx, wy, mix(city, "#10141c", 0.4));
  }
  if (lv <= 1) for (const x of [40, 120]) for (let y = 2; y < 16; y += 2) r(x + (y % 4 === 0 ? 1 : 0), y, x + 2 + (y % 4 === 0 ? 1 : 0), y + 1, "#6a707a88");
  r(0, 24, HW - 1, 47, ground);
  r(0, 24, HW - 1, 24, lightOf(ground));
  for (let i = 0; i < 60; i++) {
    const x = (i * 37) % HW;
    const y = 26 + ((i * 11) % 21);
    r(x, y, x + 1, y, shadowOf(ground));
  }
}
function fence(r, x0, x1, y, broken) {
  for (let x = x0; x <= x1; x += 10) if (!broken || (x / 10) % 3 !== 1) r(x, y - 7, x + 1, y, "#8a5f33");
  for (const dy of [5, 2]) for (let x = x0; x < x1; x += 10) if (!broken || (x / 10) % 3 === 0) r(x, y - dy, Math.min(x + 10, x1), y - dy, "#c49a64");
}
function barn(r, x) {
  box(r, x, 12, x + 34, 31, "#b03a2e", "#7a2620");
  // boards, the sunlit side and the shaded one
  for (let px = x + 3; px < x + 34; px += 3) r(px, 13, px, 30, "#9a3228");
  r(x + 1, 13, x + 1, 30, "#c84a3c");
  r(x + 33, 13, x + 33, 30, "#7a2620");
  for (let i = 0; i < 6; i++) {
    r(x + 6 - i, 11 - i, x + 28 + i, 11 - i, i ? "#8a3a2e" : "#b03a2e");
    r(x + 6 - i, 11 - i, x + 7 - i, 11 - i, "#a84a3c");
  }
  r(x + 1, 6, x + 33, 6, "#6b2a22");
  r(x, 12, x + 34, 12, "#5a1e18");
  box(r, x + 11, 20, x + 23, 31, "#f4f6f8", "#c9ccd2");
  for (let i = 0; i < 6; i++) { r(x + 12 + i * 2, 21 + i * 2, x + 13 + i * 2, 22 + i * 2, "#c9ccd2"); r(x + 22 - i * 2, 21 + i * 2, x + 21 - i * 2, 22 + i * 2, "#c9ccd2"); }
  box(r, x + 14, 13, x + 20, 17, "#3a2a24", "#f4f6f8");
}
function silo(r, x) {
  // a steel cylinder: lit down its left side, round into shadow on the right, a domed cap
  const cols = ["#8a96a3", "#d8e0e8", "#e4eaf0", "#ccd4dc", "#bcc6d0", "#b0bac4", "#a4aeb8", "#98a2ae", "#8c96a2", "#7e8894", "#6e7884"];
  cols.forEach((c, i) => r(x + i, 8, x + i, 31, c));
  for (const [y, w] of [[7, 0], [6, 1], [5, 2], [4, 3]]) r(x + w, y, x + 10 - w, y, y === 4 ? "#c9d2dc" : mix("#b0bac4", "#6e7884", (7 - y) * 0.1));
  r(x + 2, 5, x + 3, 6, "#e4eaf0");
  for (const y of [13, 19, 25]) r(x, y, x + 10, y, "#7e8894");
  r(x + 8, 9, x + 8, 30, "#6e7884");
  for (let y = 10; y < 30; y += 2) r(x + 9, y, x + 9, y, "#9aa5b1");
}
function windmill(r, x) {
  for (let y = 8; y < 32; y++) r(x + Math.floor((y - 8) / 6), y, x + 6 - Math.floor((y - 8) / 6), y, y % 3 ? "#9aa0a8" : "#6b6f78");
  // four sails
  for (let i = 1; i <= 6; i++) for (const [dx, dy] of [[i, -i], [-i, i], [i, i], [-i, -i]]) r(x + 3 + dx, 7 + dy, x + 3 + dx, 7 + dy, "#e8e2d0");
  box(r, x + 2, 6, x + 4, 8, "#5a5f68");
}

// ---- small round things and furniture pieces the rooms share ----
// An oval (`rx` x `ry` around cx, cy) in one colour, lit at the top left and shaded at the bottom
// right when it's big enough.
function disc(r, cx, cy, rx, ry, c, shade = true) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const t = (y - cy) / (ry + 0.35);
    if (Math.abs(t) > 1) continue;
    const half = (rx + 0.35) * Math.sqrt(1 - t * t);
    const x0 = Math.ceil(cx - half - 0.01);
    const x1 = Math.floor(cx + half + 0.01);
    if (x1 < x0) continue;
    r(x0, y, x1, y, c);
    if (shade && rx >= 1.5 && ry >= 1.5) {
      if (y < cy) r(x0, y, x0, y, lightOf(c));
      if (y > cy) r(x1, y, x1, y, shadowOf(c));
    }
  }
}
// Little 3x5 digits, glowing (a scoreboard, a clock).
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001010010010", "111101111101111", "111101111001111"];
function digits(r, x, y, text, c) {
  const glow = r.glow || r;
  [...text].forEach((d, n) => {
    const bits = DIGITS[Number(d)] || "";
    for (let k = 0; k < 15; k++) if (bits[k] === "1") glow(x + n * 4 + (k % 3), y + Math.floor(k / 3), x + n * 4 + (k % 3), y + Math.floor(k / 3), c);
  });
}
// A row of pennants on a sagging string from x0 to x1, hung at y.
function pennants(r, x0, x1, y, colors = ["#d64545", "#f4d35e", "#3f6fb5", "#4caf7d"]) {
  const sag = (x) => y + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 2);
  for (let x = x0; x <= x1; x++) r(x, sag(x), x, sag(x), "#e8e2d0");
  for (let x = x0 + 2, i = 0; x + 4 <= x1; x += 6, i++) {
    const c = colors[i % colors.length];
    const t = sag(x + 2) + 1;
    r(x, t, x + 4, t, c);
    r(x + 1, t + 1, x + 3, t + 1, c);
    r(x + 2, t + 2, x + 2, t + 2, shadowOf(c));
    r(x, t, x + 1, t, lightOf(c));
  }
}
// A trophy standing on y: a cup with handles on a stem and a dark base.
function trophy(r, x, y, c = "#e0b040") {
  r(x, y - 6, x + 3, y - 6, lightOf(c));
  r(x, y - 5, x + 3, y - 4, c);
  r(x, y - 5, x, y - 4, "#fff0b0");
  r(x - 1, y - 5, x - 1, y - 4, shadowOf(c));
  r(x + 4, y - 5, x + 4, y - 4, shadowOf(c));
  r(x + 1, y - 3, x + 2, y - 3, c);
  r(x + 1, y - 2, x + 2, y - 2, shadowOf(c));
  r(x, y - 1, x + 3, y, "#4a3020");
  r(x, y - 1, x + 3, y - 1, "#6b4a2f");
}
// A lamp's reflection in a polished floor under it: a soft vertical streak.
function floorShine(r, x) {
  for (const [dy, w, a] of [[1, 2, "44"], [2, 1, "38"], [3, 1, "30"], [4, 0, "28"], [6, 0, "1c"]]) r.shade(x - w, 32 + dy, x + w, 32 + dy, `#fff4c8${a}`);
}
// A heavy punching bag on a chain: round-shouldered, lit down its left side, taped round.
function punchingBag(r, x) {
  for (let y = 0; y <= 12; y++) r(x, y, x, y, y % 2 ? "#8a909a" : "#5d6168");
  r(x - 3, 13, x + 3, 14, "#2a2d33");
  r(x - 2, 13, x + 2, 13, "#4a4f58");
  for (let y = 15; y <= 29; y++) {
    const inset = y === 15 || y === 29 ? 1 : 0;
    r(x - 4 + inset, y, x + 4 - inset, y, "#b03030");
    r(x - 4 + inset, y, x - 4 + inset, y, "#d0453e");
    r(x - 3 + inset, y, x - 3 + inset, y, "#c83e38");
    r(x + 3 - inset, y, x + 4 - inset, y, "#7a2020");
  }
  r(x - 2, 16, x - 2, 21, "#e8786a");
  for (const y of [18, 26]) {
    r(x - 4, y, x + 4, y, "#2a2d33");
    r(x - 4, y, x - 3, y, "#4a4f58");
  }
}
// A weight rack: two uprights, two bars of round plates, dumbbells on the floor below.
function weightRack(r, x) {
  for (const ux of [x, x + 16]) {
    r(ux, 14, ux + 1, 31, "#3a3f48");
    r(ux, 14, ux, 31, "#5a5f68");
  }
  r(x - 1, 14, x + 17, 14, "#5a5f68");
  for (const [y, colors] of [[19, ["#c83a3a", "#3f6fb5", "#e0b040"]], [25, ["#2a2d33", "#c83a3a", "#3f6fb5"]]]) {
    r(x + 1, y, x + 15, y, "#b8bec8");
    r(x + 1, y + 1, x + 15, y + 1, "#6b707a");
    colors.forEach((c, i) => disc(r, x + 4 + i * 4, y, 1.3, 2.6, c));
  }
  for (const dx of [3, 10]) {
    r(dx + x, 30, dx + x + 4, 30, "#8a909a");
    disc(r, dx + x, 30, 0.6, 1.2, "#2a2d33", false);
    disc(r, dx + x + 4, 30, 0.6, 1.2, "#2a2d33", false);
  }
}
// Wall bars: two posts and the rungs between them, each rung lit on top.
function wallBars(r, x) {
  for (const px of [x, x + 14]) {
    r(px, 11, px + 1, 30, "#a8753f");
    r(px, 11, px, 30, "#d4a468");
  }
  for (let y = 13; y < 30; y += 3) {
    r(x + 2, y, x + 13, y, "#d9b27c");
    r(x + 2, y + 1, x + 13, y + 1, "#8a6a3f");
  }
}
// A basketball hoop: a backboard on a bracket, the rim and a net.
function hoop(r, x) {
  r(x + 9, 6, x + 11, 9, "#3a3f48");
  box(r, x, 9, x + 20, 21, "#f4f6f8", "#8a909a");
  r(x + 1, 10, x + 19, 10, "#ffffff");
  box(r, x + 6, 14, x + 14, 19, "#f4f6f8", "#d64545");
  r(x + 5, 22, x + 15, 22, "#e0602a");
  r(x + 5, 22, x + 8, 22, "#f08a50");
  for (let y = 23, w = 5; y <= 27; y++, w -= 0.6) {
    const c0 = Math.round(x + 10 - w);
    const c1 = Math.round(x + 10 + w);
    for (let xx = c0; xx <= c1; xx++) if ((xx + y) % 2 === 0) r(xx, y, xx, y, "#e8e8e8");
  }
}
// A basketball on the floor at `base`: orange with its seams.
function ball(r, x, base) {
  disc(r, x + 2.5, base - 2, 2.6, 2.4, "#e0602a");
  r(x, base - 2, x + 5, base - 2, "#8a3a1a");
  r(x + 2, base - 4, x + 2, base, "#8a3a1a");
  r(x + 1, base - 4, x + 1, base - 4, "#f4a070");
}

// A wall mirror in a steel frame: brighter at the top, with two streaks of glare.
function mirror(r, x0, y0, x1, y1) {
  box(r, x0, y0, x1, y1, "#a8d0e2", "#7a808a");
  r(x0, y0, x1, y0, "#b0b6c0");
  for (let y = y0 + 1; y < y1; y++) r(x0 + 1, y, x1 - 1, y, mix("#bfe0ee", "#7ea8c0", (y - y0) / (y1 - y0)));
  for (const gx of [x0 + 5, x0 + Math.round((x1 - x0) * 0.6)]) {
    for (let i = 0; i < y1 - y0 - 1; i++) {
      const xx = gx + i;
      const yy = y1 - 1 - i;
      if (xx < x1 && yy > y0) {
        r(xx, yy, xx, yy, "#e8f6fc");
        if (xx + 1 < x1) r(xx + 1, yy, xx + 1, yy, "#cfeaf4");
      }
    }
  }
}
// A conical lab flask standing on `base`: a glass neck with a rim, `c` liquid in its belly.
function flask(r, x, base, c) {
  r(x + 1, base - 8, x + 3, base - 8, "#c9ccd2");
  r(x + 2, base - 7, x + 2, base - 5, "#d8eef4");
  r(x + 1, base - 4, x + 3, base - 4, "#d8eef4");
  r(x + 1, base - 3, x + 3, base - 3, c);
  r(x, base - 2, x + 4, base - 1, c);
  r(x, base, x + 4, base, shadowOf(c));
  r(x + 1, base - 3, x + 1, base - 2, lightOf(c));
}
// A blue crash mat lying against the wall from x0 to x1, its top at y: a lit top edge, stitched
// corners and a carrying handle.
function mat(r, x0, x1, y) {
  box(r, x0, y, x1, 31, "#3f6fb5", "#2a4a80");
  r(x0 + 1, y + 1, x1 - 1, y + 1, "#6a90d8");
  for (const x of [x0 + 3, x1 - 3]) r(x, y + 2, x, 30, "#35609e");
  r(Math.round((x0 + x1) / 2) - 2, y + 2, Math.round((x0 + x1) / 2) + 2, y + 2, "#2a4a80");
}

const HI_SCENES = {
  // The Gymnasium, level 1 to 5: an abandoned hall with boxes and a rusty barbell, then a punching
  // bag and a bench, a weight rack and wall bars, a basketball hoop and mats, and at the top a
  // scoreboard, a trophy shelf and pennants under bright lights, the lamps shining in the polish.
  gym(r, lv) {
    const wall = ["#4f5a6c", "#5a6c8c", "#6078a0", "#6680aa", "#6c88b2"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#20283a", 0.35), floor: lv <= 1 ? "#8f6a48" : "#bd8a55", floorLine: lv <= 1 ? "#7a5a3c" : "#a37545" });
    // high windows, in the middle so the labels don't hide them
    for (let i = 0; i < 3; i++) hiWindow(r, 70 + i * 17, 2, 13, 8, lv);
    const lamps = lv <= 1 ? [] : lv >= 3 ? [34, 96, 158] : [96];
    if (lv <= 1) lamp(r, 96, 12, false);
    else for (const x of lamps) lamp(r, x, lv >= 5 ? 3 : 5, true);
    if (lv <= 2) {
      // cracks in the plaster and a taped-up X
      crack(r, 20, 14);
      crack(r, 120, 13);
      for (let i = 0; i < 6; i++) {
        r(142 + i, 14 + i, 142 + i, 14 + i, "#c9b58c");
        r(147 - i, 14 + i, 147 - i, 14 + i, "#c9b58c");
      }
    }
    if (lv <= 1) {
      // boxes stacked against the wall and a rusty barbell on the floor
      boxes(r, 150);
      r(52, 29, 80, 29, "#6b6259");
      r(52, 28, 80, 28, "#857a6e");
      for (const x of [52, 78]) {
        disc(r, x, 28, 1.6, 3, "#4a443e");
        r(x - 1, 26, x - 1, 28, "#6a625a");
      }
      return;
    }
    punchingBag(r, 40);
    // a bench with a pad on it
    r(102, 26, 126, 27, "#3f5f95");
    r(102, 26, 126, 26, "#6a8ac8");
    r(103, 28, 125, 28, "#4a3020");
    for (const x of [104, 123]) r(x, 29, x + 1, 31, "#545962");
    if (lv >= 3) {
      weightRack(r, 50);
      wallBars(r, 132);
    }
    if (lv >= 4) {
      hoop(r, 166);
      // crash mats against the wall, and a ball by them
      box(r, 108, 20, 126, 25, "#3f6fb5", "#2a4a80");
      r(109, 21, 125, 21, "#6a90d8");
      for (const x of [114, 120]) r(x, 22, x, 24, "#35609e");
      ball(r, 152, 31);
    }
    if (lv >= 5) {
      // the scoreboard, home 12 : 08 guest
      box(r, 66, 12, 100, 22, "#16191e", "#3a3f48");
      r(67, 12, 99, 12, "#5a5f68");
      digits(r, 69, 15, "12", "#ff5b5b");
      digits(r, 89, 15, "08", "#ff5b5b");
      (r.glow || r)(83, 16, 83, 16, "#7fe0a8");
      (r.glow || r)(83, 18, 83, 18, "#7fe0a8");
      // the trophy shelf
      shelf(r, 100, 128, 18, []);
      for (const x of [103, 110, 117, 123]) trophy(r, x, 17, x === 110 ? "#c9ccd2" : "#e0b040");
      // the court line, and the lamps shining in the polished floor
      r(0, 38, HW - 1, 38, "#efe6cf");
      for (const x of lamps) floorShine(r, x);
    }
  },

  // Acrobatics: a cracked mirror and a torn mat, then a mirror wall with a barre, rings and a
  // balance beam, a vault box and crash mats, and a medal board with streamers at the top.
  acrobatics(r, lv) {
    const wall = ["#686078", "#7f72a3", "#8c7db2", "#9787bc", "#a192c6"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#2a2240", 0.35), floor: lv <= 1 ? "#9a7a55" : "#d6ae78", floorLine: lv <= 1 ? "#846647" : "#bf9764" });
    for (let i = 0; i < 2; i++) hiWindow(r, 132 + i * 20, 2, 14, 8, lv);
    if (lv <= 1) {
      lamp(r, 96, 12, false);
      crack(r, 30, 14);
      crack(r, 124, 15);
      // a mirror off its hooks, cracked across
      mirror(r, 70, 14, 100, 21);
      for (const [x, y] of [[80, 15], [81, 16], [82, 17], [83, 18], [84, 19], [85, 20], [90, 16], [91, 17], [92, 18], [86, 17], [87, 16]]) r(x, y, x, y, "#e8f4f8");
      boxes(r, 150);
      // a torn mat, its stuffing coming out
      mat(r, 30, 58, 28);
      r(50, 28, 58, 29, "#9a7a55");
      for (const [x, y] of [[49, 28], [50, 27], [47, 28]]) r(x, y, x, y, "#e8e2d0");
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, lv >= 5 ? 3 : 5, true);
    // the mirror wall, and the barre along it on brackets
    const mx1 = lv >= 3 ? 124 : 104;
    mirror(r, 68, 9, mx1, 23);
    for (let x = 86; x < mx1; x += 18) r(x, 10, x, 22, "#9aa0a8");
    r(66, 19, mx1 + 2, 19, "#c48a50");
    r(66, 20, mx1 + 2, 20, "#7a5230");
    for (const x of [66, Math.round((66 + mx1) / 2), mx1 + 2]) r(x, 21, x, 23, "#8a909a");
    if (lv >= 3) {
      // rings on their straps
      for (const x of [38, 50]) {
        r(x, 0, x, 13, "#c9b58c");
        r(x, 0, x, 13, "#c9b58c");
        for (let y = 1; y < 13; y += 3) r(x, y, x, y, "#a8946a");
        disc(r, x, 17, 2.4, 2.4, "#d8c08a", false);
        disc(r, x, 17, 1.2, 1.2, wall, false);
        r(x - 2, 15, x - 1, 15, "#f0dcaa");
      }
      // the balance beam on two stands
      r(128, 22, 164, 24, "#c8a070");
      r(128, 22, 164, 22, "#e8c898");
      r(128, 24, 164, 24, "#8a6a40");
      for (const x of [132, 160]) {
        r(x, 25, x + 1, 30, "#8a909a");
        r(x, 25, x, 30, "#b0b6c0");
        r(x - 2, 31, x + 3, 31, "#545962");
      }
    }
    if (lv >= 4) {
      // a vaulting box in stacked sections, a padded top, and the crash mats
      for (let y = 21, k = 0; y < 31; y += 3, k++) {
        r(170 + k, y, 186 - k, y + 2, "#a8753f");
        r(170 + k, y, 186 - k, y, "#c99a5e");
        r(170 + k, y + 2, 186 - k, y + 2, "#6b4a2f");
      }
      r(171, 31, 189, 31, "#6b4a2f");
      r(171, 18, 185, 20, "#e8d8b0");
      r(171, 18, 185, 18, "#fff0d0");
      r(171, 20, 185, 20, "#b8a47c");
      mat(r, 12, 56, 26);
    }
    if (lv >= 5) {
      // a cork board of medals on their ribbons
      box(r, 12, 13, 28, 24, "#b88a5a", "#4a3120");
      grain(r, 13, 14, 27, 23, "#b88a5a", 14, 0.18, 0.12, 0.08);
      for (const [x, c] of [[15, "#f4d35e"], [20, "#d8dce2"], [25, "#d0904c"]]) {
        r(x - 1, 14, x - 1, 17, "#3f6fb5");
        r(x, 14, x, 17, "#d64545");
        disc(r, x - 0.5, 19.5, 1.4, 1.4, c);
        r(x - 1, 19, x - 1, 19, "#ffffff");
      }
      // streamers twisting down from the ceiling
      for (let x = 70; x < 124; x += 5) {
        const c = ["#d64545", "#f4d35e", "#3f6fb5", "#4caf7d"][(x / 5) % 4 | 0];
        for (let y = 0; y <= 2 + (x % 3); y++) r(x + (y % 2), y, x + (y % 2), y, y % 2 ? shadowOf(c) : c);
      }
      r(0, 38, HW - 1, 38, "#f4e3c0");
      floorShine(r, 34);
      floorShine(r, 96);
      floorShine(r, 158);
    }
  },

  // The Cafeteria: an empty, dusty hall with an overturned table, then a serving counter with a
  // pot, a menu board, trays of food and a fridge, tables and shelves of jars, and at the top
  // bunting, a coffee machine and warm lights.
  cafeteria(r, lv) {
    const wall = ["#7a7262", "#bca97e", "#c6b386", "#cfbc90", "#d6c49a"][lv - 1];
    hiRoom(r, { wall, wainscot: lv <= 1 ? "#5e5d52" : "#56806a", floor: lv <= 1 ? "#7d7a70" : "#e8e2d0", floorLine: lv <= 1 ? "#6e6b62" : "#c9c2ad", blocks: false, tiles: lv <= 1 ? ["#7d7a70", "#6e6b62"] : ["#e2dccb", "#c8bfa6"] });
    // painted stripes along the wall
    if (lv >= 2) for (let y = 3; y < 22; y += 3) r(0, y, HW - 1, y, mix(wall, "#ffffff", 0.14));
    r.shellDone?.();
    // the menu board
    chalkboard(r, 68, 10, 102, 25, lv <= 1);
    if (lv >= 2) {
      for (const [y, w, n] of [[13, 18, 0], [16, 22, 1], [19, 14, 2], [22, 20, 3]]) {
        const c = lv >= 4 ? ["#f4f6f8", "#f4d35e", "#9fe8b8", "#f4f6f8"][n] : "#d8e0d8";
        for (let x = 72; x <= 72 + w; x++) if (hash01(x * 5 + y, 70) < 0.82) r(x, y, x, y, c);
      }
      if (lv >= 4) for (const y of [13, 16, 19, 22]) r(95, y, 98, y, "#f4d35e");
    }
    if (lv <= 1) {
      lamp(r, 96, 12, false);
      crack(r, 40, 14);
      crack(r, 140, 13);
      // a table on its back, legs in the air, and a chair on its side
      r(22, 26, 52, 28, "#7a5c40");
      r(22, 26, 52, 26, "#9a7a58");
      for (const x of [24, 50]) r(x, 18, x + 1, 25, "#6b707a");
      r(58, 29, 66, 30, "#3f5f85");
      r(64, 23, 65, 30, "#3f5f85");
      r(58, 31, 59, 31, "#545962");
      boxes(r, 150);
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, 4, true);
    // the serving counter: steel, a pot steaming on it, a ladle
    box(r, 108, 21, 164, 31, "#9aa5b1", "#5e6670");
    r(108, 21, 164, 21, "#e8eef4");
    r(109, 22, 163, 22, "#c0c8d2");
    for (const x of [126, 145]) r(x, 23, x, 30, "#7a848e");
    box(r, 113, 15, 125, 21, "#5a5f68", "#3a3f48");
    r(112, 15, 126, 15, "#9aa0a8");
    r(114, 16, 124, 16, "#7a808a");
    r(126, 14, 128, 14, "#c9ccd2");
    r(128, 14, 128, 20, "#c9ccd2");
    if (lv >= 3) {
      // steam, a sneeze guard and trays of food
      for (const [x, y0] of [[116, 10], [119, 9], [122, 11]]) for (let y = y0; y <= 13; y++) r(x + (y % 2), y, x + (y % 2), y, "#e8eef466");
      r(110, 12, 162, 12, "#d8eef8");
      for (const x of [110, 162]) r(x, 13, x, 20, "#9aa5b1");
      for (const [x, food, bits] of [[130, "#e0782a", "#f4b060"], [141, "#e8d8a0", "#ffffff"], [152, "#4caf7d", "#8ad8a0"]]) {
        box(r, x, 17, x + 9, 20, "#c0c8d2", "#7a848e");
        r(x + 1, 18, x + 8, 19, food);
        for (let k = 0; k < 4; k++) r(x + 1 + ((k * 3) % 8), 18 + (k % 2), x + 1 + ((k * 3) % 8), 18 + (k % 2), bits);
      }
      // the fridge, a note stuck to it
      box(r, 168, 8, 182, 31, "#dfe6ee", "#8a95a1");
      r(169, 9, 169, 30, "#f4f8fc");
      r(169, 18, 181, 18, "#8a95a1");
      r(179, 11, 179, 15, "#5a626c");
      r(179, 21, 179, 26, "#5a626c");
      r(171, 21, 174, 24, "#f4d35e");
      r(171, 21, 174, 21, "#d64545");
    }
    // a table and its bench
    desk(r, 16, 52, 25, "#c49a64");
    r(20, 29, 48, 29, "#8a6a4a");
    r(20, 28, 48, 28, "#a8845a");
    if (lv >= 4) {
      // jars and tins on a shelf, a tray on the table
      shelf(r, 14, 54, 17, []);
      for (const [dx, h, c] of [[2, 4, "#e0602a"], [7, 5, "#f4d35e"], [12, 3, "#d64545"], [17, 5, "#4caf7d"], [24, 4, "#e8e2d0"], [30, 5, "#8a5ad6"], [36, 4, "#e0602a"]]) {
        r(14 + dx, 17 - h + 1, 16 + dx, 16, c);
        r(14 + dx, 17 - h + 1, 14 + dx, 16, lightOf(c));
        r(14 + dx, 17 - h, 16 + dx, 17 - h, "#c9ccd2");
      }
      box(r, 27, 23, 35, 24, "#c0c8d2", "#7a848e");
      r(29, 23, 32, 23, "#e0602a");
    }
    if (lv >= 5) {
      // bunting, a coffee machine on the counter, a plant, a cake on the table
      pennants(r, 66, 90, 0, ["#d64545", "#f4d35e", "#4caf7d", "#3f6fb5"]);
      box(r, 152, 12, 160, 20, "#3a3f48", "#1d2026");
      r(153, 13, 159, 13, "#5a5f68");
      (r.glow || r)(154, 15, 155, 15, "#ff5b5b");
      r(155, 17, 157, 19, "#e8e2d0");
      plant(r, 184, 31);
      r(38, 23, 45, 24, "#f4d35e");
      r(38, 22, 45, 22, "#fff4f0");
      r(41, 20, 41, 21, "#f4f6f8");
      (r.glow || r)(41, 19, 41, 19, "#ffd27a");
    }
  },

  // The Nurse's Office: a bare bed frame and boxes, then a made bed and a red cross, a second bed
  // and an IV stand, a privacy curtain and a medicine cabinet, and a heart monitor and plants at
  // the top.
  infirmary(r, lv) {
    const wall = ["#7f8a85", "#bcd6cc", "#c4dcd2", "#cae2d8", "#d0e7de"][lv - 1];
    hiRoom(r, { wall, wainscot: lv <= 1 ? "#5f6c66" : "#7fb4a8", floor: lv <= 1 ? "#8a8f8a" : "#dfe6ea", floorLine: lv <= 1 ? "#737873" : "#c2cbd0", blocks: false, tiles: lv <= 1 ? ["#878c87", "#7a7f7a"] : ["#dfe6ea", "#cfd8de"] });
    if (lv >= 2) for (let x = 0; x < HW; x += 8) r(x, 0, x, 21, mix(wall, "#6b8a80", 0.12));
    r.shellDone?.();
    if (lv <= 1) {
      lamp(r, 96, 12, false);
      crack(r, 66, 13);
      crack(r, 130, 14);
      hiBed(r, 20, true);
      // the red cross torn half off the wall
      box(r, 80, 11, 92, 21, "#c9ccc4", "#9aa098");
      r(85, 12, 87, 20, "#8a5050");
      r(81, 15, 91, 17, "#8a5050");
      r(88, 18, 92, 21, "#5f6c66");
      boxes(r, 150);
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, 3, true);
    // the red cross
    box(r, 78, 9, 94, 23, "#f4f6f8", "#b9c4ce");
    const cross = lv >= 3 ? "#d64545" : "#c98080";
    r(84, 11, 88, 21, cross);
    r(80, 14, 92, 18, cross);
    r(84, 11, 84, 21, lightOf(cross));
    r(80, 14, 92, 14, lightOf(cross));
    hiBed(r, 16, false);
    if (lv >= 3) {
      hiBed(r, 124, false);
      // an IV stand by the first bed, the bag half full, its line down to the bed
      r(58, 11, 58, 30, "#9aa0a8");
      r(57, 11, 57, 30, "#c9ccd2");
      r(55, 31, 61, 31, "#545962");
      r(55, 11, 61, 11, "#9aa0a8");
      box(r, 55, 12, 61, 18, "#e8f6ff", "#9ab8cc");
      r(56, 15, 60, 17, "#bfe4f4");
      r(58, 19, 58, 20, "#d64545");
      for (let y = 20; y < 24; y++) r(57 - (y - 20), y, 57 - (y - 20), y, "#cfe0ea");
    }
    if (lv >= 4) {
      // a privacy curtain on its rail, hanging in folds
      r(99, 7, 119, 7, "#9aa0a8");
      for (let x = 101; x < 118; x += 2) r(x, 7, x, 7, "#5a5f68");
      for (let x = 100; x < 119; x++) r(x, 8, x, 29 - (x % 3 === 0 ? 1 : 0), ["#a8d8cc", "#8fc4b8", "#7aaea2"][x % 3]);
      r(100, 8, 118, 8, "#c4e8de");
      // the medicine cabinet: glass doors, bottles and boxes on two shelves
      box(r, 164, 11, 184, 30, "#dfe6ee", "#8a95a1");
      r(165, 12, 183, 29, "#c8d4de");
      r(174, 12, 174, 29, "#8a95a1");
      r(165, 20, 183, 20, "#8a95a1");
      for (const [x, y, w, h, c] of [[166, 15, 2, 4, "#d64545"], [169, 16, 1, 3, "#f4d35e"], [171, 14, 2, 5, "#3f6fb5"], [176, 15, 3, 4, "#4caf7d"], [180, 16, 2, 3, "#e8e2d0"], [166, 24, 3, 5, "#e8e2d0"], [170, 25, 2, 4, "#d64545"], [176, 23, 2, 6, "#8a5ad6"], [180, 25, 2, 4, "#e0602a"]]) {
        r(x, y, x + w - 1, y + h - 1, c);
        r(x, y, x, y + h - 1, lightOf(c));
      }
      for (let i = 0; i < 4; i++) r(166 + i, 13 + i, 166 + i, 13 + i, "#ffffff88");
      r(172, 24, 172, 25, "#5a626c");
      r(176, 24, 176, 25, "#5a626c");
    }
    if (lv >= 5) {
      // a heart monitor on its stand, its trace glowing
      box(r, 63, 12, 77, 21, "#1d2026", "#4a4f58");
      r(64, 12, 76, 12, "#6a707a");
      const trace = [17, 17, 17, 16, 17, 17, 13, 20, 17, 17, 16, 17, 17];
      trace.forEach((ty, i) => (r.glow || r)(64 + i, ty, 64 + i, ty, "#7fe0a8"));
      (r.glow || r)(73, 14, 75, 14, "#ff5b5b");
      r(70, 22, 70, 30, "#6b707a");
      r(67, 31, 73, 31, "#3a3f48");
      plant(r, 186, 31);
      plant(r, 110, 31);
    }
  },

  // Classrooms share a base (chalkboard, desks, a window, a bookcase from level 4); each subject
  // adds its own props by level. Level-1 rooms are dusty, with a cracked board and boxes.
  classroom_empty(r, lv) { classroomBase(r, lv, "#8a9a8e"); },
  classroom_Biology(r, lv) {
    classroomBase(r, lv, "#9cc9a8");
    if (lv <= 1) return;
    // a DNA helix on the board, its rungs between the two strands
    for (let x = 66; x < 126; x++) {
      const a = Math.round(Math.sin(x / 3) * 4);
      if (x % 3 === 0) r(x, 17 - Math.abs(a), x, 17 + Math.abs(a), "#5a7a68");
      r(x, 17 + a, x, 17 + a, "#e8efe8");
      r(x, 17 - a, x, 17 - a, "#f4d35e");
    }
    if (lv >= 3) {
      // a poster of a plant cell, pinned at the top
      poster(r, 24, 12, 44, 24, "#f4f6f8");
      disc(r, 34, 18, 8, 4, "#b8e0b0", false);
      r(26, 18, 42, 18, "#b8e0b0");
      for (let x = 26; x <= 42; x++) for (const y of [14, 22]) if (Math.abs(x - 34) < 6) r(x, y, x, y, "#4caf7d");
      disc(r, 35, 18, 2.4, 1.8, "#8a5ad6");
      r(34, 17, 34, 17, "#b89af0");
      for (const [x, y] of [[28, 17], [30, 20], [39, 16], [40, 20]]) r(x, y, x + 1, y, "#4caf7d");
    }
    if (lv >= 4) {
      // the skeleton on its stand
      disc(r, 150, 11, 2.6, 2.4, "#f4f4ec");
      r(149, 11, 149, 11, "#3a3f48");
      r(151, 11, 151, 11, "#3a3f48");
      r(149, 13, 151, 13, "#c9c8bc");
      r(150, 14, 150, 25, "#e8e6da");
      for (const y of [16, 18, 20]) {
        r(147, y, 153, y, "#f4f4ec");
        r(147, y + 1, 153, y + 1, "#c9c8bc");
      }
      r(146, 15, 146, 22, "#f4f4ec");
      r(154, 15, 154, 22, "#f4f4ec");
      r(147, 24, 153, 25, "#f4f4ec");
      r(148, 26, 148, 30, "#f4f4ec");
      r(152, 26, 152, 30, "#f4f4ec");
      r(150, 26, 150, 30, "#6b737d");
      r(146, 31, 154, 31, "#545962");
    }
    if (lv >= 5) {
      // an aquarium (lit, bubbling, a fish in it) and a microscope on the teacher's desk
      const glow = r.glow || r;
      box(r, 11, 18, 23, 24, "#3a4150", "#2a2f3a");
      for (let y = 19; y <= 23; y++) glow(12, y, 22, y, mix("#8fd8f0", "#3f8ab0", (y - 19) / 4));
      glow(12, 23, 22, 23, "#c8b078");
      glow(19, 21, 20, 22, "#4caf7d");
      glow(14, 20, 16, 20, "#e0602a");
      glow(13, 20, 13, 20, "#f4a030");
      for (const [x, y] of [[18, 19], [17, 20], [18, 21]]) glow(x, y, x, y, "#e8f8ff");
      r.light?.({ x: 17, y: 21, r: 12, k: 0.35, c: [0.55, 0.9, 1.0] });
      r(25, 24, 29, 24, "#3a3f48");
      r(28, 19, 28, 23, "#545962");
      r(25, 21, 28, 21, "#545962");
      r(26, 17, 27, 20, "#3a3f48");
      r(26, 17, 26, 20, "#6b707a");
      plant(r, 160, 31);
      plant(r, 58, 31);
    }
  },
  classroom_Physics(r, lv) {
    classroomBase(r, lv, "#9fb3d6");
    if (lv <= 1) return;
    // formulas and an atom on the board
    for (const [x, y, w] of [[66, 13, 16], [66, 17, 12], [66, 21, 18]]) for (let xx = x; xx <= x + w; xx++) if (hash01(xx * 3 + y, 71) < 0.8) r(xx, y, xx, y, "#e8efe8");
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      r(110 + Math.round(Math.cos(a) * 10), 18 + Math.round(Math.sin(a) * 4), 110 + Math.round(Math.cos(a) * 10), 18 + Math.round(Math.sin(a) * 4), "#7fc8f0");
      r(110 + Math.round(Math.cos(a) * 4), 18 + Math.round(Math.sin(a) * 6), 110 + Math.round(Math.cos(a) * 4), 18 + Math.round(Math.sin(a) * 6), "#f4d35e");
    }
    disc(r, 110, 18, 1.4, 1.4, "#d64545");
    if (lv >= 3) {
      // a poster of the solar system: the sun, the planets on their orbits
      poster(r, 24, 12, 46, 24, "#1d2240");
      for (const rr of [6, 10, 14]) for (let x = 28; x <= 44; x++) if (Math.abs(x - 28) <= rr && (x + rr) % 2 === 0) r(x, 18 - Math.round(Math.sqrt(Math.max(0, rr * rr - (x - 28) ** 2)) * 0.35), x, 18 - Math.round(Math.sqrt(Math.max(0, rr * rr - (x - 28) ** 2)) * 0.35), "#3a4270");
      disc(r, 27, 18, 2.6, 2.6, "#f4c542");
      (r.glow || r)(26, 17, 27, 18, "#fff3c4");
      for (const [x, y, c] of [[33, 18, "#c98a4a"], [36, 16, "#3f8fd0"], [40, 19, "#d64545"], [43, 17, "#e0b884"]]) {
        r(x, y, x + 1, y + 1, c);
        r(x, y, x, y, lightOf(c));
      }
    }
    if (lv >= 4) {
      // a Tesla coil: a base, the copper winding, the ring on top
      box(r, 146, 26, 156, 31, "#3a3f48", "#1d2026");
      r(147, 27, 155, 27, "#5a5f68");
      r(149, 14, 153, 25, "#b8783a");
      for (let y = 14; y < 26; y++) r(149, y, 153, y, y % 2 ? "#d89050" : "#a86830");
      r(149, 14, 149, 25, "#f0b070");
      disc(r, 151, 11.5, 4.4, 1.8, "#c9ccd2");
      r(148, 10, 152, 10, "#ffffff");
    }
    if (lv >= 5) {
      // sparks off the coil, a model rocket, a pendulum swinging
      const glow = r.glow || r;
      for (const [x0, y0, x1, y1] of [[146, 11, 142, 7], [156, 11, 160, 6], [151, 9, 152, 4]]) {
        const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) glow(Math.round(x0 + ((x1 - x0) * k) / n) + (k % 2), Math.round(y0 + ((y1 - y0) * k) / n), Math.round(x0 + ((x1 - x0) * k) / n) + (k % 2), Math.round(y0 + ((y1 - y0) * k) / n), "#d8f0ff");
      }
      r.light?.({ x: 151, y: 9, r: 16, k: 0.4, c: [0.7, 0.85, 1.0] });
      r(16, 13, 20, 22, "#f4f6f8");
      r(16, 13, 16, 22, "#ffffff");
      r(20, 13, 20, 22, "#c9ccd2");
      r(17, 11, 19, 12, "#d64545");
      r(18, 10, 18, 10, "#d64545");
      disc(r, 18, 16, 1, 1, "#3f8fd0", false);
      r(14, 20, 15, 24, "#d64545");
      r(21, 20, 22, 24, "#d64545");
      r(17, 23, 19, 24, "#5a5f68");
      r(56, 21, 64, 21, "#5a5f68");
      r(60, 22, 61, 23, "#9aa0a8");
      r(62, 24, 62, 25, "#9aa0a8");
      r(63, 26, 63, 27, "#9aa0a8");
      disc(r, 63.5, 28.5, 1.4, 1.4, "#c9a227");
    }
  },
  classroom_History(r, lv) {
    classroomBase(r, lv, "#c9b28a");
    if (lv <= 1) return;
    // a timeline on the board, its dates in chalk
    r(66, 19, 126, 19, "#e8efe8");
    for (let x = 68; x < 126; x += 10) {
      r(x, 17, x, 21, "#e8efe8");
      r(x - 1, 14, x + 1, 14, "#f4d35e");
      r(x - 1, 23, x + 1, 23, "#c8d0c8");
    }
    if (lv >= 3) {
      // a world map
      box(r, 20, 12, 48, 25, "#6fa8d0", "#6b4a2f");
      r(21, 13, 47, 13, "#8fc0e0");
      for (const [x0, y0, x1, y1] of [[22, 15, 28, 17], [24, 18, 27, 19], [26, 20, 27, 23], [31, 14, 35, 15], [32, 16, 36, 18], [33, 19, 35, 22], [37, 14, 45, 17], [41, 18, 43, 19], [43, 21, 46, 23]]) r(x0, y0, x1, y1, "#7cae5a");
      for (const [x, y] of [[22, 15], [31, 14], [37, 14], [43, 21]]) r(x, y, x + 1, y, "#a8d080");
      r(38, 13, 44, 13, "#f4f6f8");
      r(22, 24, 46, 24, "#f4f6f8");
    }
    if (lv >= 4) {
      // a globe on its stand
      disc(r, 151, 17, 5.4, 5.4, "#3f8fd0");
      for (const [x0, y0, x1, y1] of [[148, 14, 150, 16], [151, 18, 154, 20], [153, 13, 154, 15], [147, 19, 148, 20]]) r(x0, y0, x1, y1, "#6fae6a");
      r(148, 13, 149, 13, "#8fc8f0");
      for (let y = 11; y <= 23; y++) r(157 - Math.round(Math.abs(y - 17) * 0.25), y, 157 - Math.round(Math.abs(y - 17) * 0.25), y, "#c9a227");
      r(151, 23, 151, 29, "#8a5f33");
      r(147, 30, 155, 31, "#6b4a2f");
      r(147, 30, 155, 30, "#8a6a4a");
    }
    if (lv >= 5) {
      // a marble bust on a pedestal, and two flags on poles
      box(r, 11, 23, 23, 31, "#d8d2c0", "#a8a294");
      r(12, 24, 22, 24, "#f0ece0");
      r(13, 21, 21, 22, "#e8e2d0");
      r(12, 22, 22, 22, "#d8d2c0");
      disc(r, 17, 16, 3, 3.6, "#e8e2d0");
      r(15, 15, 15, 15, "#a8a294");
      r(19, 15, 19, 15, "#a8a294");
      r(17, 17, 17, 18, "#c8c2b0");
      r(14, 12, 20, 12, "#4caf7d");
      r(13, 13, 13, 14, "#4caf7d");
      r(21, 13, 21, 14, "#4caf7d");
      for (const [x, c] of [[53, "#d64545"]]) {
        r(x, 12, x, 30, "#8a5f33");
        r(x, 11, x, 11, "#c9a227");
        for (let dx = 1; dx <= 7; dx++) r(x + dx, 13 + (dx > 4 ? 1 : 0), x + dx, 18 + (dx > 4 ? 1 : 0), dx % 3 === 0 ? shadowOf(c) : c);
        r(x + 2, 15, x + 4, 16, "#f4d35e");
      }
    }
  },
  classroom_SocialStudies(r, lv) {
    classroomBase(r, lv, "#d6a8a0");
    if (lv <= 1) return;
    // speech bubbles on the board
    for (const [x, y, w] of [[68, 12, 16], [92, 15, 20], [74, 18, 14]]) {
      box(r, x, y, x + w, y + 4, "#2f4a3a", "#e8efe8");
      r(x + 3, y + 5, x + 4, y + 5, "#e8efe8");
      for (let xx = x + 2; xx < x + w - 1; xx += 2) r(xx, y + 2, xx, y + 2, "#9ab0a0");
    }
    if (lv >= 3) {
      // flags of the world
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i % 3) * 10;
        const y = 12 + Math.floor(i / 3) * 7;
        const c = ["#d64545", "#3f6fb5", "#4caf7d", "#f4d35e", "#8a5ad6", "#e0602a"][i];
        box(r, x, y, x + 7, y + 5, c, "#3a3f48");
        r(x + 1, y + 2, x + 6, y + 3, i % 2 ? "#f4f6f8" : shadowOf(c));
        if (i % 3 === 1) r(x + 3, y + 1, x + 4, y + 4, "#f4f6f8");
        r(x + 1, y + 1, x + 6, y + 1, lightOf(c));
      }
    }
    if (lv >= 4) {
      // a debate podium with a seal on its front and a microphone
      box(r, 144, 18, 158, 31, "#8a5f33", "#4a3020");
      r(143, 17, 159, 18, "#c49a64");
      r(143, 17, 159, 17, "#e0b884");
      disc(r, 151, 23.5, 3, 3, "#f4d35e");
      disc(r, 151, 23.5, 1.4, 1.4, "#c9a227", false);
      r(151, 12, 151, 16, "#3a3f48");
      r(150, 10, 152, 11, "#545962");
      r(150, 10, 150, 10, "#8a909a");
    }
    if (lv >= 5) {
      // a cork board of pinned photos, and pennants
      box(r, 10, 12, 18, 24, "#b88a5a", "#6b4a2f");
      for (const [x, y, c] of [[11, 13, "#7fb0d8"], [14, 16, "#e0b884"], [11, 19, "#a8d090"]]) {
        box(r, x, y, x + 3, y + 3, "#f4f6f8", "#9aa5b1");
        r(x + 1, y + 1, x + 2, y + 2, c);
        r(x + 1, y, x + 1, y, "#d64545");
      }
      pennants(r, 66, 128, 0, ["#d64545", "#f4f6f8", "#3f6fb5"]);
    }
  },
};

// A paper poster pinned to the wall: its sheet (`paper`), a curling shadow under its lower edge
// and a pin at the top.
function poster(r, x0, y0, x1, y1, paper) {
  box(r, x0, y0, x1, y1, paper, mix(paper, "#1a1424", 0.35));
  r(x0 + 1, y0 + 1, x1 - 1, y0 + 1, lightOf(paper));
  r(Math.round((x0 + x1) / 2), y0, Math.round((x0 + x1) / 2), y0, "#d64545");
}
// A round wall clock: a white face in a dark rim, its two hands.
function clock(r, x, y) {
  disc(r, x, y, 3.4, 3.4, "#2a2d33", false);
  disc(r, x, y, 2.4, 2.4, "#f4f6f8", false);
  r(x - 2, y - 1, x - 2, y - 1, "#ffffff");
  r(x, y - 2, x, y, "#1d2026");
  r(x, y, x + 2, y, "#1d2026");
  r(x, y, x, y, "#d64545");
}

// A classroom at a level: dusty with a cracked board and boxes at level 1; then clean, with a
// teacher's desk and student desks, lamps, a bookcase (level 4) and plants and a clock (level 5).
function classroomBase(r, lv, tint) {
  const wall = mix(tint, lv <= 1 ? "#4a4a50" : "#fff4dc", lv <= 1 ? 0.45 : [0, 0.22, 0.14, 0.08, 0.02][lv - 1]);
  hiRoom(r, { wall, wainscot: mix(wall, "#2a2230", 0.4), floor: lv <= 1 ? "#8a7058" : "#b98a5e", floorLine: lv <= 1 ? "#735c47" : "#9d7249" });
  chalkboard(r, 62, 10, 130, 25, lv <= 1);
  hiWindow(r, 160, 2, 16, 10, lv);
  if (lv <= 1) {
    lamp(r, 96, 22, false);
    for (const [x, y] of [[80, 12], [81, 13], [83, 14], [84, 16], [86, 17], [87, 19]]) r(x, y, x, y, "#1d2026");
    crack(r, 30, 14);
    // a desk on its side, a chair kicked over, papers on the floor
    r(20, 24, 42, 26, "#8a6a4a");
    r(20, 24, 42, 24, "#a8845a");
    r(22, 20, 23, 23, "#6b707a");
    r(39, 20, 40, 23, "#6b707a");
    r(48, 29, 55, 30, "#a8753f");
    r(54, 23, 55, 30, "#6b707a");
    boxes(r, 146);
    for (const [x, y] of [[60, 34], [100, 38], [130, 35], [75, 42]]) {
      r(x, y, x + 3, y, "#e8e2d0");
      r(x + 1, y + 1, x + 3, y + 1, "#c9c2ad");
    }
    return;
  }
  for (const x of lv >= 3 ? [34, 158] : [34]) lamp(r, x, 3, true);
  // the teacher's desk and a row of student desks against the back wall
  desk(r, 8, 30, 25, "#a8753f");
  for (const x of [64, 88, 112]) desk(r, x, x + 16, 27);
  if (lv >= 2 && lv <= 4) {
    // a pile of books and an apple on the teacher's desk
    for (const [y, c] of [[24, "#3f6fb5"], [23, "#d64545"], [22, "#e8e2d0"]]) r(11 + (y % 2), y, 17 + (y % 2), y, c);
    r(24, 23, 25, 24, "#d64545");
    r(25, 22, 25, 22, "#4caf7d");
  }
  if (lv >= 4) bookcase(r, 170, 12, 186, 31);
  if (lv >= 5) {
    clock(r, 137, 16);
    plant(r, 44, 31);
  }
}

Object.assign(HI_SCENES, {
  // The Headmaster's Office (it has no levels): wood panelling, a bookcase, a window onto the
  // ruined city at sunset, a flag, a diploma, a trophy cabinet and the big desk on a red rug.
  headmaster(r) {
    hiRoom(r, { wall: "#5f4634", wainscot: "#4a3424", floor: "#5a3a26", floorLine: "#45291a", blocks: false });
    for (let x = 4; x < HW; x += 12) {
      r(x, 0, x, 21, "#4f3828");
      r(x + 1, 0, x + 1, 21, "#6e543f");
    }
    for (let x = 0; x < HW; x += 8) r(x, 24, x, 30, "#3a2818");
    // a red rug with a gold border and a faint pattern, fringed at the edges
    r(0, 33, HW - 1, 46, "#7a2f3a");
    for (let y = 35; y <= 44; y++) for (let x = 0; x < HW; x++) if ((x + y * 3) % 12 === 0 || (x - y * 3 + 600) % 12 === 0) r(x, y, x, y, "#6a2832");
    grain(r, 0, 34, HW - 1, 45, "#7a2f3a", 16, 0.05, 0.12, 0.05);
    r(0, 34, HW - 1, 34, "#c9a227");
    r(0, 45, HW - 1, 45, "#c9a227");
    for (let x = 0; x < HW; x += 2) {
      r(x, 33, x, 33, "#d8c8a0");
      r(x, 46, x, 46, "#d8c8a0");
    }
    r.shellDone?.();
    bookcase(r, 12, 12, 40, 31);
    // the window onto the ruined city at sunset, red velvet curtains either side
    const glow = r.glow || r;
    box(r, 70, 2, 102, 17, "#e8a56a", "#2a1c12");
    for (let y = 3; y <= 16; y++) glow(71, y, 101, y, mix("#8a4a6a", "#f0b070", (y - 3) / 13));
    disc(glow, 80, 12, 3, 3, "#ffe0a0", false);
    for (const [x, y, w] of [[88, 5, 9], [74, 7, 6], [92, 8, 6]]) glow(x, y, x + w, y, "#f8c8a0");
    r.light?.({ x: 86, y: 10, r: 54, sy: 0.8, k: 0.42, c: [1.0, 0.7, 0.45] });
    for (const [x0, x1, top] of [[71, 74, 12], [75, 77, 10], [78, 81, 13], [82, 85, 11], [86, 88, 9], [89, 93, 12], [94, 96, 10], [97, 101, 13]]) {
      r(x0, top, x1, 16, "#3a2a34");
      if (x1 - x0 >= 2) r(x0 + 1, top + 2, x0 + 1, top + 2, "#e8a858");
    }
    r(73, 9, 73, 11, "#3a2a34");
    r(86, 3, 86, 16, "#2a1c12");
    r(71, 10, 101, 10, "#2a1c12");
    for (const [x0, x1, edge] of [[66, 70, 70], [102, 106, 102]]) {
      for (let x = x0; x <= x1; x++) r(x, 1, x, 20 - (x === edge ? 3 : 0), ["#8a1f2a", "#6e1820", "#a02a36"][x % 3]);
      r(x0, 0, x1, 0, "#c9a227");
    }
    // a flag on a pole
    r(52, 8, 52, 30, "#c9a227");
    r(52, 7, 52, 7, "#f4d35e");
    box(r, 53, 9, 63, 16, "#b03030", "#7a2020");
    for (let x = 54; x < 63; x += 3) r(x, 10, x, 15, "#9a2828");
    disc(r, 58, 12.5, 2, 2, "#f4d35e", false);
    r(57, 12, 57, 12, "#fff0b0");
    // the diploma, framed, with its seal
    box(r, 110, 13, 126, 22, "#efe4c8", "#c9a227");
    r(110, 13, 126, 13, "#f4d35e");
    for (const y of [15, 17, 19]) for (let x = 113; x <= 123; x++) if (hash01(x + y * 9, 72) < 0.8) r(x, y, x, y, "#8a7a5a");
    disc(r, 123, 20, 1.2, 1.2, "#b03030", false);
    // the trophy cabinet: glass doors, two shelves of cups
    box(r, 150, 11, 176, 31, "#7e9aaa", "#3a2618");
    r(150, 11, 176, 11, "#6b4a2f");
    for (let y = 12; y <= 30; y++) r(151, y, 175, y, mix("#a8c0cc", "#6e8a9a", (y - 12) / 18));
    r(151, 21, 175, 21, "#4a3120");
    r(163, 12, 163, 30, "#4a3120");
    for (const [x, y, c] of [[154, 20, "#e0b040"], [158, 20, "#c9ccd2"], [167, 20, "#e0b040"], [155, 30, "#d0904c"], [168, 30, "#e0b040"]]) trophy(r, x, y, c);
    for (let i = 0; i < 5; i++) r(152 + i, 26 - i, 152 + i, 26 - i, "#e8f4f8");
    // the Headmaster in his big leather chair behind the desk (he'll hand out missions): a grey,
    // balding head with glasses and a moustache over a dark suit, white shirt and red tie
    box(r, 85, 4, 101, 21, "#6e1f28", "#4a1218");
    r(86, 5, 100, 5, "#8a2c36");
    r(86, 6, 86, 20, "#8a2c36");
    for (const x of [87, 93, 99]) r(x, 6, x, 6, "#c9a227");
    box(r, 86, 15, 100, 21, "#2c3140", "#1c2029");
    r(92, 15, 94, 19, "#f4f6f8");
    r(93, 16, 93, 21, "#b03030");
    r(90, 16, 91, 18, "#3a4052");
    r(95, 16, 96, 18, "#3a4052");
    box(r, 90, 7, 96, 14, "#e8b894", "#c48f6a");
    r(91, 8, 91, 12, "#f4cca8");
    r(90, 7, 96, 7, "#c4c8d0");
    r(89, 8, 89, 11, "#b8bcc4");
    r(97, 8, 97, 11, "#b8bcc4");
    r(91, 10, 92, 10, "#1d2026");
    r(94, 10, 95, 10, "#1d2026");
    r(93, 10, 93, 10, "#5a5f68");
    r(92, 12, 94, 12, "#c4c8d0");
    // the headmaster's desk: panelled, a gold nameplate, a banker's lamp, a globe and papers
    box(r, 66, 22, 132, 31, "#5a3620", "#3a2414");
    for (const x0 of [69, 108]) {
      box(r, x0, 25, x0 + 20, 30, "#4e2e1a", "#3a2414");
      r(x0 + 1, 25, x0 + 19, 25, "#6e4a30");
    }
    r(89, 22, 91, 22, "#e8b894");
    r(95, 22, 97, 22, "#e8b894");
    r(66, 22, 132, 22, "#a8753f");
    r(66, 23, 132, 23, "#7a4e2c");
    box(r, 93, 25, 105, 29, "#c9a227", "#8a6a1a");
    r(94, 26, 104, 26, "#f4d35e");
    for (let x = 95; x <= 103; x += 2) r(x, 27, x, 27, "#6a4a10");
    r(72, 16, 72, 21, "#c9a227");
    r(70, 21, 74, 21, "#8a6a1a");
    box(glow, 69, 14, 76, 16, "#2f8a5a", "#1f5a38");
    glow(70, 16, 75, 16, "#fff0b0");
    r.light?.({ x: 72, y: 17, r: 22, k: 0.45, c: LAMP_LIGHT });
    disc(r, 121.5, 17.5, 3.4, 3.4, "#3f8fd0");
    r(120, 16, 122, 18, "#6fae6a");
    r(123, 15, 123, 16, "#6fae6a");
    r(121, 21, 122, 21, "#c9a227");
    for (let i = 0; i < 3; i++) r(100 + i, 20 - i, 110 + i, 21 - i, i % 2 ? "#e0d6bc" : "#efe4c8");
    r(111, 19, 114, 19, "#1d2026");
  },

  // The Radio Station: dead equipment and a boarded window, then a transmitter and an ON AIR
  // sign, a receiver and a map of the city, racks of blinking gear with a microphone, and at the
  // top monitors and the satellite dish outside.
  radio(r, lv) {
    const wall = ["#424a45", "#4e6256", "#546c5e", "#597565", "#5f7d6d"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#1d2026", 0.4), floor: lv <= 1 ? "#5a5550" : "#6a6058", floorLine: lv <= 1 ? "#4a4540" : "#5a5048" });
    // the window, with the antenna mast (or, at the top, the satellite dish) outside it
    hiWindow(r, 70, 2, 30, 12, lv);
    if (lv <= 1) {
      lamp(r, 40, 12, false);
      crack(r, 130, 14);
      // dead equipment: a smashed set and a cabinet, wires hanging
      box(r, 110, 20, 126, 31, "#3a3f48", "#1d2026");
      r(112, 22, 124, 26, "#22252b");
      for (const [x, y] of [[114, 23], [115, 24], [117, 23], [119, 25], [121, 24]]) r(x, y, x, y, "#8a909a");
      box(r, 20, 22, 36, 31, "#4a4f58", "#2a2d33");
      for (let y = 24; y < 31; y += 2) r(22, y, 34, y, "#3a3f48");
      for (let y = 20; y < 31; y++) r(38 + Math.round(Math.sin(y / 2)), y, 38 + Math.round(Math.sin(y / 2)), y, "#2a2d33");
      boxes(r, 150);
      return;
    }
    if (lv >= 5) {
      disc(r, 85, 7.5, 6, 3.4, "#e8eef4");
      r(80, 6, 84, 6, "#ffffff");
      r(85, 11, 85, 12, "#9aa5b1");
      r(84, 7, 86, 8, "#9aa5b1");
      (r.glow || r)(85, 3, 85, 3, "#ff5b5b");
    } else {
      r(85, 3, 85, 12, "#4a4f58");
      for (const y of [5, 8, 11]) r(82, y, 88, y, "#4a4f58");
      (r.glow || r)(85, 2, 85, 2, "#ff5b5b");
    }
    for (const x of lv >= 3 ? [40, 150] : [40]) lamp(r, x, 3, true);
    // the ON AIR sign under the window, lit
    r(73, 18, 97, 24, "#3a1a1a");
    r(74, 19, 96, 23, "#ff5b5b");
    const GLYPHS = { O: "111101101101111", N: "110101101101101", A: "010101111101101", I: "11111", R: "110101110101101" };
    let gx = 76;
    for (const ch of "ON AIR") {
      if (ch === " ") {
        gx += 2;
        continue;
      }
      const bits = GLYPHS[ch];
      const wide = bits.length === 15 ? 3 : 1;
      for (let k = 0; k < bits.length; k++) if (bits[k] === "1") r(gx + (k % wide), 19 + Math.floor(k / wide), gx + (k % wide), 19 + Math.floor(k / wide), "#5a1414");
      gx += wide + 1;
    }
    // the long desk with the transmitter: dials, a level meter, switches
    box(r, 104, 23, 188, 31, "#6b5a48", "#4a3e32");
    r(104, 23, 188, 23, "#8a7560");
    r(105, 24, 187, 24, "#5a4a3a");
    box(r, 108, 13, 124, 22, "#3a3f48", "#1d2026");
    r(109, 14, 123, 14, "#545962");
    for (let x = 110; x <= 117; x++) (r.glow || r)(x, 16, x, 16, x < 115 ? "#7fe0a8" : "#f4d35e");
    for (const x of [110, 115, 120]) {
      disc(r, x + 0.5, 19.5, 1.2, 1.2, "#c9ccd2", false);
      r(x, 19, x, 19, "#ffffff");
    }
    if (lv >= 3) {
      // a receiver with its big tuning dial, and a map of the city stuck with pins
      box(r, 128, 14, 142, 22, "#6b5038", "#3a2e24");
      r(129, 15, 141, 15, "#8a6a4a");
      disc(r, 133, 18.5, 2.6, 2.6, "#e8e2d0", false);
      r(133, 17, 133, 18, "#d64545");
      for (let x = 137; x <= 140; x++) r(x, 17 + (x % 2), x, 17 + (x % 2), "#3a2e24");
      box(r, 16, 12, 50, 26, "#e8e2d0", "#8a7a5a");
      r(17, 13, 49, 25, "#cfd8c0");
      for (const [x0, y0, x1, y1] of [[18, 14, 24, 17], [26, 19, 31, 24], [36, 14, 41, 16], [43, 20, 48, 24]]) r(x0, y0, x1, y1, "#b8c8a8");
      r(17, 18, 49, 18, "#9aa88a");
      r(32, 13, 32, 25, "#9aa88a");
      r(17, 22, 30, 22, "#8fb8d0");
      for (const [x, y, c] of [[24, 15, "#d64545"], [40, 21, "#d64545"], [36, 16, "#3f6fb5"], [27, 22, "#f4d35e"]]) {
        r(x, y, x, y, c);
        r(x + 1, y + 1, x + 1, y + 1, "#5a5f68");
      }
    }
    if (lv >= 4) {
      // a rack of gear with blinking lights, a microphone and headphones
      box(r, 146, 10, 162, 22, "#2a2d33", "#1d2026");
      for (let y = 12; y < 21; y += 3) {
        r(147, y + 1, 161, y + 1, "#1d2026");
        for (let x = 148; x < 161; x += 3) (r.glow || r)(x, y, x, y, ["#7fe0a8", "#f4d35e", "#ff5b5b"][(x + y) % 3]);
      }
      r(166, 17, 167, 21, "#2a2d33");
      r(166, 16, 167, 16, "#8a909a");
      r(165, 22, 168, 22, "#8a8e96");
      r(170, 19, 174, 19, "#2a2d33");
      r(170, 20, 170, 22, "#2a2d33");
      r(174, 20, 174, 22, "#2a2d33");
      r(169, 21, 170, 22, "#3a3f48");
      r(174, 21, 175, 22, "#3a3f48");
    }
    if (lv >= 5) {
      // monitors with the world map and a signal wave
      box(r, 176, 11, 188, 22, "#1d2240", "#3a3f48");
      for (const [x0, y0, x1, y1] of [[178, 13, 181, 15], [183, 14, 186, 17], [179, 17, 180, 20]]) (r.glow || r)(x0, y0, x1, y1, "#4caf7d");
      r.light?.({ x: 182, y: 16, r: 12, k: 0.3, c: [0.5, 0.9, 0.6] });
      box(r, 54, 13, 64, 21, "#1d2026", "#3a3f48");
      for (let x = 55; x < 64; x++) r(x, 17 + Math.round(Math.sin(x) * 2), x, 17 + Math.round(Math.sin(x) * 2), "#7fe0a8");
    }
  },

  // The Research Room: broken glass and empty shelves, then a whiteboard and a bench of flasks, a
  // microscope and books, a computer, and at the top a glowing machine.
  research(r, lv) {
    const wall = ["#6e767f", "#b4c4d2", "#bccad8", "#c4d0de", "#cad6e4"][lv - 1];
    hiRoom(r, { wall, wainscot: lv <= 1 ? "#525860" : "#647e94", floor: lv <= 1 ? "#6a6e72" : "#9aa5b1", floorLine: lv <= 1 ? "#5a5e62" : "#8a96a3", blocks: false, tiles: lv <= 1 ? ["#6a6e72", "#5f6367"] : ["#a4aeb8", "#949fab"] });
    if (lv >= 2) for (let x = 0; x < HW; x += 10) r(x, 0, x, 21, mix(wall, "#6f8aa0", 0.15));
    r.shellDone?.();
    // the whiteboard in its aluminium frame, a tray of markers under it
    box(r, 68, 10, 104, 25, lv <= 1 ? "#a9acb0" : "#f4f6f8", "#8a95a1");
    r(68, 10, 104, 10, "#c9d2dc");
    r(67, 26, 105, 26, "#9aa5b1");
    if (lv <= 1) {
      // scrawled over and smeared, glass on the floor, an empty shelf
      for (let x = 72; x < 100; x++) r(x, 16 + Math.round(Math.sin(x / 2) * 2), x, 16 + Math.round(Math.sin(x / 2) * 2), "#7a6a6a");
      lamp(r, 96, 20, false);
      crack(r, 30, 14);
      crack(r, 120, 13);
      shelf(r, 16, 50, 20, []);
      for (const [x, y] of [[112, 34], [114, 35], [120, 33], [140, 36], [117, 37], [133, 34]]) r(x, y, x + 1, y, "#bfe0f5");
      boxes(r, 150);
      return;
    }
    // notes and a graph on the board, a magnet holding a sheet
    for (const [x, y, w, c] of [[71, 13, 14, "#3f6fb5"], [71, 16, 18, "#3a3f48"], [71, 19, 10, "#d64545"], [71, 22, 14, "#3a3f48"]]) for (let xx = x; xx <= x + w; xx++) if (hash01(xx + y * 7, 73) < 0.85) r(xx, y, xx, y, c);
    r(90, 13, 90, 23, "#3a3f48");
    r(90, 23, 101, 23, "#3a3f48");
    for (let x = 91; x <= 101; x++) r(x, 22 - Math.round(((x - 91) / 10) ** 2 * 8), x, 22 - Math.round(((x - 91) / 10) ** 2 * 8), "#d64545");
    for (const [x, c] of [[72, "#d64545"], [75, "#3f6fb5"], [78, "#3a3f48"]]) r(x, 25, x + 1, 25, c);
    for (const x of lv >= 3 ? [34, 150] : [150]) lamp(r, x, 3, true);
    // the lab bench: cupboards under a steel top
    box(r, 108, 23, 188, 31, "#3a4a4a", "#1d2a2a");
    r(107, 22, 189, 22, "#9aa5b1");
    r(107, 23, 189, 23, "#5e6670");
    for (let x = 109; x < 186; x += 16) {
      box(r, x, 24, x + 14, 30, "#425454", "#2a3838");
      r(x + 12, 26, x + 12, 28, "#9aa5b1");
    }
    // flasks and a rack of test tubes, each with its liquid
    for (const [x, c] of [[114, "#4caf7d"], [130, "#e0602a"]]) flask(r, x, 21, c);
    disc(r, 123, 19.5, 2.2, 2.2, "#c9e4ee", false);
    r(122, 19, 124, 21, "#3fa7d6");
    r(121, 20, 125, 20, "#3fa7d6");
    r(123, 15, 123, 17, "#c9e4ee");
    r(122, 14, 124, 14, "#c9ccd2");
    r(136, 21, 145, 21, "#8a6a4a");
    r(136, 17, 145, 17, "#8a6a4a");
    for (const [x, c] of [[137, "#8a5ad6"], [140, "#f4d35e"], [143, "#4caf7d"]]) {
      r(x, 15, x, 20, "#d8eef4");
      r(x, 18, x, 20, c);
    }
    if (lv >= 3) {
      // a microscope, and books on shelves
      r(147, 21, 153, 21, "#2a2d33");
      r(151, 15, 152, 20, "#3a3f48");
      r(152, 15, 152, 20, "#5a5f68");
      r(148, 18, 151, 18, "#3a3f48");
      r(148, 12, 149, 16, "#545962");
      r(148, 12, 148, 16, "#7a808a");
      r(147, 11, 150, 11, "#2a2d33");
      bookcase(r, 14, 12, 40, 31);
    }
    if (lv >= 4) {
      // a computer: a monitor glowing with green text, a keyboard on the desk
      desk(r, 44, 64, 29, "#9aa5b1");
      box(r, 46, 15, 62, 26, "#3a3f48", "#22252b");
      r(46, 15, 62, 15, "#5a5f68");
      (r.glow || r)(48, 17, 60, 24, "#10241a");
      for (const y of [18, 20, 22]) for (let x = 49; x < 49 + ((y * 3) % 9) + 3; x++) (r.glow || r)(x, y, x, y, "#7fe0a8");
      r(53, 27, 55, 28, "#3a3f48");
      r(48, 28, 52, 28, "#c9ccd2");
    }
    if (lv >= 5) {
      // a glowing machine of tubes on the bench, bubbling, piped together, a gauge on it
      box(r, 160, 8, 182, 21, "#3a3f48", "#1d2026");
      r(161, 9, 181, 9, "#5a5f68");
      for (const x of [163, 169, 175]) {
        box(r, x, 11, x + 4, 19, "#7fe0a8", "#3a8f63");
        r(x + 1, 12, x + 1, 17, "#d8ffe8");
        for (const [dx, dy] of [[2, 16], [3, 14], [2, 12]]) r(x + dx, dy, x + dx, dy, "#d8ffe8");
      }
      r(167, 13, 168, 13, "#8a909a");
      r(173, 15, 174, 15, "#8a909a");
      disc(r, 180, 11, 1.2, 1.2, "#e8e2d0", false);
      r(180, 11, 180, 11, "#d64545");
      for (const [x, y] of [[166, 6], [172, 5], [178, 6]]) r(x, y, x, y, "#7fe0a8aa");
    }
  },

  // The Crafting Room: piles of junk, then a workbench under a pegboard of tools, a vise and a
  // drill press, a welding station throwing sparks, and at the top finished barricade panels.
  crafting(r, lv) {
    const wall = ["#5e5044", "#7a624e", "#836a56", "#8c725e", "#957a66"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#1d1a18", 0.4), floor: lv <= 1 ? "#5e5a55" : "#77736c", floorLine: lv <= 1 ? "#4e4a45" : "#66625b", concrete: true });
    if (lv <= 1) {
      lamp(r, 96, 14, false);
      crack(r, 80, 13);
      junkPile(r, 20, 26, 9, "#6b6f78");
      junkPile(r, 60, 20, 7, "#8a5f33");
      junkPile(r, 104, 24, 10, "#5a5f68");
      boxes(r, 150);
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, 3, true);
    // the pegboard and its tools: a hammer, a wrench, a screwdriver, a saw, pliers
    box(r, 68, 10, 104, 25, "#c9a878", "#8a6f4a");
    for (let y = 12; y < 25; y += 3) for (let x = 70; x < 104; x += 3) r(x, y, x, y, "#9a7a50");
    r(74, 14, 74, 22, "#8a5f33");
    r(74, 14, 74, 18, "#a8753f");
    r(72, 12, 76, 13, "#6b707a");
    r(72, 12, 76, 12, "#9aa0aa");
    r(80, 14, 80, 22, "#9aa0a8");
    r(79, 12, 81, 13, "#9aa0a8");
    r(80, 13, 80, 13, "#c9a878");
    r(84, 12, 84, 17, "#c9ccd2");
    r(84, 18, 84, 22, "#d64545");
    box(r, 87, 14, 98, 17, "#c9ccd2", "#8a8e96");
    for (let x = 88; x < 98; x += 2) r(x, 17, x, 17, "#8a8e96");
    r(98, 13, 101, 18, "#8a5f33");
    r(99, 15, 100, 16, "#c9a878");
    r(90, 19, 90, 23, "#3f6fb5");
    r(93, 19, 93, 23, "#3f6fb5");
    r(91, 19, 92, 20, "#6b707a");
    // the workbench: a thick top, a toolbox and planks on the shelf under it
    r(108, 21, 170, 23, "#9a6a3a");
    r(108, 21, 170, 21, "#c08a50");
    r(108, 23, 170, 23, "#6b4a2f");
    for (const x of [110, 167]) r(x, 24, x + 1, 31, "#5a3b24");
    r(112, 28, 166, 28, "#7a5232");
    box(r, 120, 25, 130, 27, "#c83a3a", "#7a2020");
    r(124, 24, 126, 24, "#2a2d33");
    r(138, 26, 160, 26, "#c49a64");
    r(140, 27, 158, 27, "#a8784a");
    for (const [x, y] of [[132, 20], [150, 20], [156, 20]]) r(x, y, x + 1, y, "#e0c08a");
    if (lv >= 3) {
      // a vise on the bench, and a drill press
      box(r, 114, 17, 122, 20, "#6b707a", "#3a3f48");
      r(115, 17, 121, 17, "#9aa0aa");
      r(117, 15, 119, 16, "#6b707a");
      r(123, 18, 125, 18, "#9aa0aa");
      box(r, 174, 29, 186, 31, "#3a3f48", "#1d2026");
      r(179, 13, 180, 29, "#8a909a");
      r(179, 13, 179, 29, "#b0b6c0");
      box(r, 175, 9, 185, 15, "#c83a3a", "#7a2020");
      r(176, 10, 184, 10, "#e85a50");
      r(180, 16, 180, 19, "#c9ccd2");
      r(181, 20, 181, 21, "#9aa0aa");
      r(185, 13, 188, 13, "#3a3f48");
      r(176, 22, 184, 23, "#6b707a");
    }
    if (lv >= 4) {
      // the welding set: the machine with its dial, a mask on a hook, the torch throwing sparks
      box(r, 16, 18, 34, 31, "#3a3f48", "#1d2026");
      r(17, 19, 33, 19, "#5a5f68");
      disc(r, 22, 23, 2, 2, "#e8e2d0", false);
      r(22, 22, 22, 23, "#d64545");
      (r.glow || r)(28, 22, 31, 23, "#f4d35e");
      r(26, 27, 31, 28, "#2a2d33");
      for (let k = 0; k < 8; k++) r(34 + k, 26 - Math.round(Math.sin(k / 2) * 2), 34 + k, 26 - Math.round(Math.sin(k / 2) * 2), "#1d2026");
      box(r, 36, 23, 48, 31, "#6b707a", "#3a3f48");
      r(37, 23, 47, 23, "#9aa0aa");
      r(5, 14, 11, 20, "#2a2d33");
      r(6, 16, 10, 17, "#3a6a5a");
      const glow = r.glow || r;
      glow(42, 22, 42, 22, "#ffffff");
      for (const [x, y, c] of [[38, 21, "#ffd27a"], [40, 19, "#ffd27a"], [44, 20, "#fff4b0"], [45, 18, "#f4a030"], [39, 17, "#f4a030"], [46, 22, "#ffd27a"], [41, 20, "#fff4b0"], [43, 17, "#ffd27a"]]) glow(x, y, x, y, c);
      r.light?.({ x: 42, y: 21, r: 16, k: 0.55, c: [0.75, 0.85, 1.0] });
    }
    if (lv >= 5) {
      // finished barricade panels leaning on the wall, strapped and spiked, and a safety sign
      for (const x of [132, 144]) {
        box(r, x, 10, x + 10, 20, "#8a5f33", "#5a3b24");
        for (let px = x + 3; px < x + 10; px += 3) r(px, 11, px, 19, "#6e4a28");
        for (const y of [13, 17]) {
          r(x + 1, y, x + 9, y, "#6b707a");
          r(x + 2, y, x + 2, y, "#c9ccd2");
          r(x + 8, y, x + 8, y, "#c9ccd2");
        }
        for (let px = x + 1; px <= x + 9; px += 2) r(px, 9, px, 9, "#c9ccd2");
      }
      for (let y = 13; y <= 20; y++) r(57 - Math.round((y - 13) * 0.75), y, 57 + Math.round((y - 13) * 0.75), y, "#f4d35e");
      r(51, 20, 63, 20, "#c9a227");
      r(57, 15, 57, 18, "#1d2026");
      r(57, 19, 57, 19, "#1d2026");
    }
  },

  // The Farm and the Scrapyard span the whole page, so they're drawn as one wide
  // landscape each (see wideOutdoor below) rather than a 192-wide scene tiled sideways.

  // The Farm, laid out like its page: crop fields on the left, the barn in the middle, animal pens
  // on the right. Level 1 is weeds, a caved-in shed, a knocked-over trough and a dead tree; then
  // tilled fields with sprouts, a shed, a trough, a coop and chickens; cabbages, corn and a
  // scarecrow, hay and a cow; a barn, tomatoes and pumpkins, sheep and a pig in the mud; and at
  // the top golden wheat and sunflowers, a windmill, a silo with a vane, a horse and a tractor.
  farm(r, lv) {
    wideOutdoor(r, lv, lv <= 1 ? "#8a8457" : "#6f9a4f");
    track(r, lv);
    const FIELDS = [36, 80, 124]; // each 40 wide
    const kinds = [
      null,
      null,
      ["sprout", "sprout", null],
      ["cabbage", "corn", "carrot"],
      ["cabbage", "corn", "tomato"],
      ["wheat", "corn", "pumpkin"],
    ][lv];
    if (lv <= 1) {
      for (let i = 0; i < 90; i++) weed(r, 30 + ((i * 53) % 380), 24 + ((i * 7) % 9), i % 3 ? "#9a9a55" : "#7a7a45");
      shed(r, 186, true);
      rail(r, 30, 170, 33, true);
      trough(r, 314, 31, "tipped");
      deadTree(r, 288, 31);
      coop(r, 386, true);
      rail(r, 250, 414, 33, true);
      wheelbarrow(r, 120, 41, "tipped");
      for (const x of [60, 140, 300, 370]) crow(r, x, 26);
      for (const [x, y] of [[80, 36], [170, 44], [260, 37], [380, 43]]) crack(r, x, y, "#6e6440");
      return;
    }

    // the fields
    FIELDS.forEach((x0, i) => {
      if (!kinds[i]) return;
      furrows(r, x0, x0 + 39, 23, 31);
      for (const y of [25, 28, 31]) for (let x = x0 + 3; x < x0 + 38; x += 5) crop(r, x, y, kinds[i]);
    });
    if (lv >= 3) scarecrow(r, 121);
    if (lv >= 5) {
      for (const x of [31, 77]) crop(r, x, 31, "sunflower");
      windmill(r, 168);
    }
    rail(r, 30, 172, 33, false);

    // the building in the middle
    if (lv <= 3) {
      shed(r, 186, false);
      toolRack(r, 212);
    } else barn(r, 180);
    if (lv >= 5) {
      silo(r, 216);
      vane(r, 197, 1);
    }
    if (lv >= 3) hay(r, 229);

    // the pens
    trough(r, 314, 31, "full");
    coop(r, 386, false);
    for (const x of [362, 370]) chicken(r, x, 31);
    if (lv >= 3) cow(r, 276, 31, "#f4f6f8");
    if (lv >= 4) {
      r(295, 29, 312, 31, "#6b4a2f");
      r(297, 28, 310, 28, "#6b4a2f");
      pig(r, 297, 31);
      for (const x of [337, 349]) sheep(r, x, 31);
      chicken(r, 378, 31);
    }
    if (lv >= 5) horse(r, 254, 31);
    rail(r, 250, 414, 33, false);

    // the front: flowers, a full wheelbarrow, a tractor on the track
    if (lv >= 4) {
      for (let i = 0; i < 24; i++) r(12 + ((i * 67) % 390), 44 + (i % 3), 12 + ((i * 67) % 390), 44 + (i % 3), ["#f4d35e", "#e98fb0", "#f4f6f8"][i % 3]);
      wheelbarrow(r, 150, 41, "full");
    }
    if (lv >= 5) tractor(r, 60, 42);
  },

  // The Scrapyard, laid out like its page: salvage on the left, the shed in the middle, workbenches
  // on the right. Level 1 is junk heaps, a burnt-out car and loose tyres under smoke; then a chain
  // fence, a tyre stack, a workbench and oil drums; wrecks stacked three high, a weapon rack and an
  // armor stand; a crane lifting a car, a trap table and welding sparks in the shed; and at the top
  // a crusher with a stack of cubes, colour-sorted bins, floodlights and a forklift.
  scrapyard(r, lv) {
    wideOutdoor(r, lv, lv <= 1 ? "#5e554a" : "#6b5d4d", 150);
    // oil stains and gravel across the yard
    for (let i = 0; i < 26; i++) {
      const x = (i * 71) % 400;
      const y = 34 + ((i * 13) % 12);
      r(x, y, x + 4 + (i % 4), y + 1, "#4a4038");
    }
    if (lv >= 2) chainFence(r);

    // the salvage side
    if (lv >= 5) crusher(r, 8);
    else junkPile(r, 8, 30, 11, "#7a7f88");
    junkPile(r, 66, 40, 15, "#8a6a4a");
    if (lv >= 3) {
      wreck(r, 120, 31, "#3a3230", true);
      wreck(r, 122, 25, "#3f6fb5");
      wreck(r, 119, 19, "#c9a236");
      junkPile(r, 150, 30, 12, "#6b6f78");
    } else wreck(r, 120, 31, "#3a3230", true);
    if (lv >= 2) for (let i = 0; i < 4; i++) tyre(r, 56, 30 - i * 3);
    if (lv >= 4) crane(r, 4);

    // the shed in the middle (a welder at work from level 4)
    shed(r, 197, lv <= 1, lv >= 4);

    // the workbench side
    if (lv <= 2) junkPile(r, 300, 32, 9, "#6b6f78");
    if (lv <= 1) {
      for (const [x, y] of [[40, 40], [100, 44], [240, 38], [352, 42]]) tyre(r, x, y);
      box(r, 250, 27, 262, 31, "#3f6fb5", "#2a4a80"); // a drum on its side
      for (const x of [110, 300]) for (let k = 0; k < 8; k++) r(x + k - 2 + Math.round(Math.sin(k) * 2), 20 - k * 2, x + k + 1 + Math.round(Math.sin(k) * 2), 21 - k * 2, "#3a3a3e99");
      sign(r, 176, true);
      return;
    }
    workbench(r, 232);
    for (const x of [258, 266]) drum(r, x, 31, x === 258 ? "#3f6fb5" : "#b03030");
    if (lv >= 3) {
      weaponRack(r, 280);
      armorStand(r, 305);
    }
    if (lv >= 4) {
      trapTable(r, 322);
      for (const [x, y] of [[356, 44], [364, 42]]) { r(x, y, x + 9, y + 1, "#a8753f"); r(x, y + 2, x + 9, y + 2, "#6b4a2f"); }
    }
    if (lv >= 5) {
      for (const [x, c] of [[352, "#3f6fb5"], [366, "#4caf7d"], [380, "#d64545"]]) {
        box(r, x, 22, x + 11, 31, c, shadowOf(c));
        r(x + 3, 25, x + 8, 25, "#f4f6f8");
        r(x + 1, 22, x + 10, 22, lightOf(c));
      }
      for (const x of [112, 404]) floodlight(r, x);
            forklift(r, 290, 42);
    }
  },

  // The Greenhouse, laid out like its page: herb beds on the left, the glasshouse in the middle,
  // the still room on the right. Level 1 is dead beds in the weeds, a glasshouse with its panes
  // smashed and a caved-in shed; then cleared beds with seedlings, patched glass and a chili rack;
  // aloe, echinacea and willow grown in, a weeping willow and a copper still; coffee bushes in pots,
  // a potting bench with flasks and sacks of beans; and at the top grow lamps glowing through the
  // glass, a sprinkler line over the beds and a second still with its fire lit.
  greenhouse(r, lv) {
    wideOutdoor(r, lv, lv <= 1 ? "#7a7a50" : "#6a9a52", 120);
    // the herb beds: three raised planters, one a herb
    const BEDS = [[20, "aloe"], [66, "echinacea"], [112, "willow"]];
    for (const [x0, kind] of BEDS) {
      box(r, x0, 26, x0 + 40, 31, "#8a5f33", "#5a3b24");
      r(x0 + 1, 26, x0 + 39, 26, "#a8753f");
      for (let x = x0 + 4; x < x0 + 40; x += 10) r(x, 28, x, 30, "#6e4a28");
      if (lv <= 1) {
        for (let x = x0 + 3; x < x0 + 38; x += 4) weed(r, x, 25, x % 8 ? "#8a8a50" : "#6e6a40");
        continue;
      }
      for (let x = x0 + 4; x < x0 + 38; x += 7) herb(r, x, 25, lv === 2 ? "sprout" : kind);
    }
    if (lv <= 1) {
      deadTree(r, 160, 31);
      for (const [x, y] of [[40, 40], [150, 43]]) crack(r, x, y, "#5e5a3a");
    } else if (lv >= 3) willowTree(r, 162, 31);
    if (lv >= 5) {
      // a sprinkler line over the beds, misting
      r(18, 12, 156, 12, "#6b6f78");
      for (const x of [20, 156]) r(x, 13, x, 25, "#6b6f78");
      for (let x = 30; x < 156; x += 22) {
        r(x, 13, x, 14, "#9aa0a8");
        for (const [dx, dy] of [[-2, 3], [0, 4], [2, 3], [-3, 6], [3, 6], [0, 7]]) r(x + dx, 13 + dy, x + dx, 13 + dy, "#d8eef488");
      }
    }

    glasshouse(r, 178, 266, lv);

    // the still room
    shed(r, 284, lv <= 1);
    if (lv <= 1) {
      for (const [x, y] of [[320, 31], [342, 31], [372, 31]]) brokenPot(r, x, y);
      for (const [x, y] of [[330, 42], [388, 40]]) crack(r, x, y, "#5e5a3a");
      sign(r, 400, true);
      return;
    }
    chiliRack(r, 316, lv);
    if (lv >= 3) {
      still(r, 340, false);
      for (const x of [368, 382]) coffeeBush(r, x, 31);
    } else for (const x of [346, 372]) plant(r, x, 31);
    if (lv >= 4) {
      // a potting bench: flasks, a mortar, and sacks of coffee beans under it
      r(296, 37, 330, 38, "#8a5f33");
      r(296, 37, 330, 37, "#a8753f");
      for (const x of [297, 329]) r(x, 39, x, 44, "#5a3b24");
      flask(r, 300, 36, "#4fc46a");
      flask(r, 308, 36, "#e06aa8");
      box(r, 316, 33, 321, 36, "#9aa0a8", "#5a5f68");
      for (const x of [338, 346]) {
        box(r, x, 38, x + 7, 44, "#c9a87a", "#8a6a4a");
        r(x + 2, 38, x + 5, 38, "#6b4220");
      }
    }
    if (lv >= 5) {
      still(r, 398, true);
      // string lights along the shed eaves
      const glow = r.glow || r;
      for (let x = 282; x <= 310; x += 4) glow(x, 16 + (x % 8 ? 1 : 0), x, 16 + (x % 8 ? 1 : 0), x % 12 ? "#fff3c4" : "#f4d35e");
      r.light?.({ x: 296, y: 17, r: 18, k: 0.3, c: LAMP_LIGHT });
    }
  },
});

// ---------- wide outdoor scenes ----------
// 416 x 48: about the width of a full-page banner at its 130px height, so the Farm and the
// Scrapyard show one continuous landscape. The sky, the ruined city and the ground clear up
// level by level; the ground starts at row 22, props stand on row 31, and the crowd covers the
// bottom rows (the plaque hides the top-left corner, the Upgrade button the bottom-left one).

const WW = 416;
export const SCENE_WIDTH = { farm: WW, scrapyard: WW, greenhouse: WW };

function hash01(i, s) {
  let x = Math.imul(i + 11, 2654435761) ^ Math.imul(s + 7, 40503);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

function wideOutdoor(r, lv, ground, sunX = 360) {
  const top = ["#5f6770", "#6f95bd", "#6aa2d6", "#66a8e0", "#6aaee6"][lv - 1];
  const low = ["#9a948a", "#c4d0d6", "#cfe2ec", "#d8ecf4", "#e4f2f8"][lv - 1];
  const skyAt = (y) => mix(top, low, Math.min(1, Math.max(0, y / 21) ** 0.85));
  for (let y = 0; y < 22; y++) r(0, y, WW - 1, y, skyAt(y));
  // the sun, from level 3, a faint ring round it
  if (lv >= 3) {
    const glow = r.glow || r;
    disc(glow, sunX, 6, 4.6, 4.6, "#fff3c4", false);
    disc(glow, sunX, 6, 2.6, 2.6, "#fffbe8", false);
    for (let a = 0; a < 40; a++) {
      const x = Math.round(sunX + Math.cos((a / 40) * Math.PI * 2) * 8);
      const y = Math.round(6 + Math.sin((a / 40) * Math.PI * 2) * 8);
      if (a % 2 === 0 && y >= 0) r(x, y, x, y, "#fff6d855");
    }
    // its halo over the sky and the warm light it throws across the yard
    r.light?.({ x: sunX, y: 6, r: 150, sy: 1.8, k: 0.28, c: [1.0, 0.88, 0.62] });
  }
  // clouds, puffed up, lit on top and grey underneath, more of them as the smoke clears
  if (lv >= 2) {
    for (const [x, y, w] of [[96, 6, 26], [196, 4, 34], [290, 8, 22], [392, 5, 18], [150, 10, 14]].slice(0, lv)) {
      const under = mix("#f4f8fc", top, 0.35);
      r(x, y + 1, x + w, y + 2, "#eef4fa");
      r(x + 1, y + 3, x + w - 1, y + 3, under);
      for (const [dx, rr] of [[0.25, 2.6], [0.5, 3.4], [0.75, 2.2]]) disc(r, x + w * dx, y, rr * (w / 26) + 1, rr * 0.8, "#f4f8fc", false);
      r(x + Math.round(w * 0.35), y - 2, x + Math.round(w * 0.6), y - 2, "#ffffff");
    }
  }
  // birds
  if (lv >= 4) for (const [x, y] of [[250, 6], [258, 4], [265, 7], [120, 3]]) { r(x, y, x + 1, y, "#3a3f48"); r(x + 2, y - 1, x + 2, y - 1, "#3a3f48"); r(x + 3, y, x + 4, y, "#3a3f48"); }
  // the far city, hazy with distance
  const far = mix(low, "#5a6478", 0.32);
  for (let x = 0, i = 0; x < WW; i++) {
    const w = 8 + Math.floor(hash01(i, 31) * 14);
    const h = 7 + Math.floor(hash01(i, 32) * 10);
    r(x, 22 - h, x + w - 1, 21, far);
    if (hash01(i, 33) < 0.25) r(x + Math.floor(w / 2), 22 - h - 3, x + Math.floor(w / 2), 22 - h - 1, far);
    x += w;
  }
  // smoke rising over the city at levels 1-2
  if (lv <= 2) {
    for (const x of lv === 1 ? [80, 230, 330] : [230]) {
      for (let k = 0; k < 8; k++) {
        const cx = x + k * 1.5 + Math.sin(k * 0.9) * 3;
        disc(r, cx, 18 - k * 2.6, 1.4 + k * 0.5, 1.2 + k * 0.3, lv === 1 ? "#4a4d52aa" : "#6a6d7277", false);
      }
    }
  }
  // the ruined city on the horizon: broken towers, lit windows from level 4, a water tower, a
  // crane and a radio mast with its red light
  const city = mix(low, "#2c3340", 0.58);
  const win = mix(city, "#10141c", 0.35);
  for (let x = 0, i = 0; x < WW; i++) {
    const w = 6 + Math.floor(hash01(i, 1) * 12);
    const h = 4 + Math.floor(hash01(i, 2) * 11);
    r(x, 22 - h, x + w - 1, 21, city);
    r(x, 22 - h, x, 21, mix(city, low, 0.12));
    if (hash01(i, 3) < 0.45) {
      // a broken corner, jagged
      for (let k = 0; k < 3; k++) r(x + w - 3 + k, 22 - h, x + w - 1, 22 - h + k + Math.floor(hash01(i, 4) * 2), skyAt(22 - h + k));
    }
    for (let wy = 24 - h; wy < 20; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) {
      const lit = lv >= 4 && hash01(wx, wy) < 0.08;
      (lit ? r.glow || r : r)(wx, wy, wx, wy, lit ? "#f4d35e" : win);
    }
    x += w + (hash01(i, 5) < 0.3 ? 2 : 0);
  }
  for (const tx of [44, 270]) {
    r(tx, 11, tx + 6, 14, city);
    r(tx + 1, 10, tx + 5, 10, city);
    for (const lx of [tx + 1, tx + 5]) r(lx, 15, lx, 21, city);
    r(tx + 1, 18, tx + 5, 18, city);
  }
  r(338, 4, 338, 21, city);
  for (const y of [8, 13, 18]) r(337, y, 339, y, city);
  (r.glow || r)(338, 3, 338, 3, "#ff5b5b");
  r(180, 6, 180, 21, city);
  r(170, 6, 200, 6, city);
  r(198, 7, 198, 10, city);
  // a hazy tree line in front of it, crowns lit from the sun's side
  const trees = lv <= 1 ? mix("#5a5a44", low, 0.35) : mix("#3f6a3a", low, 0.28);
  for (let x = 0; x < WW; x++) {
    const h = 1 + Math.round(1.2 + Math.sin(x / 7) * 1.2 + Math.sin(x / 19 + 1) * 1.4 + hash01(x, 9));
    r(x, 22 - h, x, 21, trees);
    r(x, 22 - h, x, 22 - h, x % 7 < 3 ? mix(trees, low, 0.3) : trees);
  }
  // the ground: lighter at the horizon, tufts of grass (or grit) all over it, darker at the front
  r(0, 22, WW - 1, 47, ground);
  r(0, 22, WW - 1, 22, mix(ground, "#f4f0e0", 0.25));
  r(0, 23, WW - 1, 24, mix(ground, "#f4f0e0", 0.1));
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash01(i, 23) * WW);
    const y = 27 + Math.floor(hash01(i, 24) * 16);
    const w = 14 + Math.floor(hash01(i, 25) * 26);
    for (let dy = 0; dy < 3; dy++) r(x + dy * 2, y + dy, x + w - dy * 2, y + dy, mix(ground, i % 2 ? "#1a1424" : "#f4f0e0", 0.07));
  }
  r(0, 44, WW - 1, 47, shadowOf(ground));
  for (let i = 0; i < 420; i++) {
    const x = Math.floor(hash01(i, 21) * WW);
    const y = 25 + Math.floor(hash01(i, 22) ** 0.7 * 22);
    const k = i % 4;
    if (k === 0) r(x, y, x + 1, y, shadowOf(ground));
    else if (k === 1) r(x, y - 1, x, y, mix(ground, "#f4f0e0", 0.22));
    else if (k === 2) r(x, y - 1, x, y, mix(ground, "#1a1424", 0.2));
    else r(x, y, x, y, lightOf(ground));
  }
  r.shellDone?.();
}

// A dirt track across the front of the yard.
function track(r, lv) {
  const dirt = lv <= 1 ? "#9a8a64" : "#a8906a";
  r(0, 38, WW - 1, 41, dirt);
  r(0, 38, WW - 1, 38, shadowOf(dirt));
  for (let x = 4; x < WW; x += 9) r(x, 40, x + 2, 40, shadowOf(dirt));
}

// A post-and-rail fence, posts every 12; a broken one is missing posts and rails.
function rail(r, x0, x1, y, broken) {
  for (let x = x0, i = 0; x <= x1; x += 12, i++) {
    if (broken && i % 3 === 1) continue;
    r(x, y - 6, x + 1, y, "#7a5230");
    r(x, y - 6, x + 1, y - 6, "#a8753f");
  }
  for (const dy of [4, 1]) {
    for (let x = x0, i = 0; x < x1; x += 12, i++) {
      if (broken && (i % 3 !== 0 || (dy === 1 && i % 2))) continue;
      r(x, y - dy, Math.min(x + 12, x1), y - dy, "#c49a64");
    }
  }
}

function weed(r, x, y, c) {
  r(x, y - 1, x, y, c);
  r(x - 1, y - 2, x - 1, y - 1, c);
  r(x + 1, y - 2, x + 1, y - 2, c);
}
function crow(r, x, y) {
  r(x, y - 2, x + 2, y - 1, "#1d2026");
  r(x + 3, y - 3, x + 3, y - 2, "#1d2026");
  r(x + 4, y - 2, x + 4, y - 2, "#c9a236");
}
function deadTree(r, x, base) {
  r(x, base - 18, x + 1, base, "#4a3a2c");
  for (const [dx, dy] of [[-2, 14], [-3, 15], [-4, 16], [2, 12], [3, 13], [4, 14], [5, 15], [-1, 9], [-2, 8], [2, 7], [3, 6]]) r(x + dx, base - dy - 4, x + dx, base - dy - 4, "#4a3a2c");
}
function appleTree(r, x, base) {
  r(x, base - 9, x + 2, base, "#6b4a2f");
  const rows = [[4, 5], [6, 7], [7, 8], [8, 8], [8, 8], [7, 7], [6, 6], [4, 4]];
  rows.forEach(([a, b], i) => r(x + 1 - a, base - 21 + i * 2, x + 1 + b, base - 20 + i * 2, i < 3 ? "#5aa84a" : "#3f8a3a"));
  for (const [dx, dy] of [[-4, 17], [3, 15], [-2, 12], [5, 11], [0, 19]]) r(x + dx, base - dy, x + dx + 1, base - dy, "#d64545");
}

// Tilled soil, row by row.
function furrows(r, x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y++) r(x0, y, x1, y, (y - y0) % 3 === 2 ? "#6e5234" : (y - y0) % 3 === 1 ? "#5a4228" : "#4e3a24");
}

function crop(r, x, y, kind) {
  if (kind === "sprout") {
    r(x, y - 1, x, y, "#7fc86a");
    r(x - 1, y - 2, x - 1, y - 2, "#5a9a45");
    r(x + 1, y - 2, x + 1, y - 2, "#7fc86a");
  } else if (kind === "cabbage") {
    box(r, x - 1, y - 2, x + 2, y, "#6fbf5a", "#3f7f3a");
    r(x, y - 2, x + 1, y - 2, "#9fdc80");
  } else if (kind === "carrot") {
    r(x, y - 3, x, y - 1, "#5a9a45");
    r(x - 1, y - 3, x - 1, y - 3, "#7fc86a");
    r(x + 1, y - 4, x + 1, y - 4, "#7fc86a");
    r(x, y, x, y, "#e0782a");
  } else if (kind === "corn") {
    r(x, y - 8, x, y, "#5a9a45");
    r(x - 1, y - 4, x - 1, y - 3, "#7fc86a");
    r(x + 1, y - 6, x + 1, y - 5, "#7fc86a");
    r(x + 1, y - 4, x + 1, y - 2, "#f4d35e");
    r(x, y - 9, x, y - 9, "#e0c070");
  } else if (kind === "tomato") {
    r(x, y - 6, x, y, "#8a5f33");
    r(x - 1, y - 5, x + 1, y - 1, "#4f9a45");
    r(x - 1, y - 4, x - 1, y - 4, "#e04040");
    r(x + 1, y - 2, x + 1, y - 2, "#e04040");
    r(x, y - 5, x, y - 5, "#e04040");
  } else if (kind === "pumpkin") {
    r(x - 2, y, x + 2, y, "#5a9a45");
    box(r, x - 1, y - 2, x + 2, y, "#e0782a", "#a8501a");
    r(x, y - 3, x, y - 3, "#5a7a35");
  } else if (kind === "wheat") {
    r(x, y - 5, x, y, "#c9a650");
    r(x - 1, y - 3, x - 1, y, "#b8963f");
    r(x + 1, y - 4, x + 1, y, "#b8963f");
    r(x, y - 7, x, y - 6, "#f0cf6a");
    r(x - 1, y - 5, x - 1, y - 4, "#f0cf6a");
    r(x + 1, y - 6, x + 1, y - 5, "#f0cf6a");
  } else if (kind === "sunflower") {
    r(x, y - 12, x, y, "#4f8a3a");
    r(x + 1, y - 6, x + 2, y - 6, "#5a9a45");
    r(x - 2, y - 9, x - 1, y - 9, "#5a9a45");
    r(x - 2, y - 15, x + 2, y - 13, "#f4c430");
    r(x - 1, y - 16, x + 1, y - 12, "#f4c430");
    r(x - 1, y - 15, x + 1, y - 13, "#6b4a2f");
  }
}

function scarecrow(r, x) {
  r(x, 10, x, 31, "#8a5f33");
  r(x - 7, 15, x + 7, 15, "#8a5f33");
  box(r, x - 3, 13, x + 3, 21, "#3f6fb5", "#2a4a80");
  r(x - 1, 16, x + 1, 16, "#d64545");
  for (const dx of [-7, 7]) r(x + dx, 16, x + dx, 17, "#e0c070");
  box(r, x - 2, 8, x + 2, 12, "#e0b884", "#a8844f");
  r(x - 1, 10, x - 1, 10, "#3a2a24");
  r(x + 1, 10, x + 1, 10, "#3a2a24");
  r(x - 4, 7, x + 4, 7, "#c9a236");
  r(x - 2, 5, x + 2, 6, "#c9a236");
}

// A wooden shed; caved in at level 1. `sparks`: a welder at work inside.
function shed(r, x, broken, sparks = false) {
  box(r, x, 18, x + 22, 31, "#8a6a4a", "#5a4430");
  for (let yy = 20; yy < 31; yy += 3) {
    r(x + 1, yy, x + 21, yy, "#7a5c40");
    r(x + 1, yy + 1, x + 21, yy + 1, "#9a7a58");
  }
  r(x + 21, 19, x + 21, 30, "#6a4e36");
  r(x - 1, 16, x + 23, 17, "#5a5e66");
  r(x - 2, 15, x + 24, 15, "#6b6f78");
  for (let px = x - 1; px <= x + 23; px += 3) r(px, 16, px, 17, "#4a4e56");
  r(x - 2, 15, x + 24, 15, "#8a909a");
  box(r, x + 8, 23, x + 14, 31, broken ? "#2a2420" : "#4a3626", "#3a2a1e");
  if (broken) {
    r(x + 10, 15, x + 18, 18, "#2a2420");
    r(x + 16, 19, x + 20, 21, "#2a2420");
    r(x + 20, 24, x + 26, 25, "#8a6a4a");
    return;
  }
  box(r, x + 2, 20, x + 6, 23, "#a9d4ef", "#5a4430");
  if (sparks) {
    r(x + 9, 24, x + 13, 31, "#1d2026");
    for (const [dx, dy, c] of [[11, 27, "#fff4b0"], [10, 26, "#f4d35e"], [12, 25, "#f4d35e"], [13, 28, "#f08a3a"], [9, 28, "#f08a3a"], [14, 24, "#fff4b0"]]) (r.glow || r)(x + dx, dy, x + dx, dy, c);
    r.light?.({ x: x + 11, y: 26, r: 12, k: 0.5, c: [0.75, 0.85, 1.0] });
  }
}
function toolRack(r, x) {
  r(x, 22, x + 8, 22, "#8a5f33");
  for (const [dx, head] of [[1, "#9aa0a8"], [4, "#6b6f78"], [7, "#9aa0a8"]]) {
    r(x + dx, 20, x + dx, 31, "#a8753f");
    r(x + dx - 1, 19, x + dx + 1, 19, head);
  }
}
function barrel(r, x, base) {
  box(r, x, base - 7, x + 5, base, "#6b4a2f", "#4a3020");
  r(x, base - 5, x + 5, base - 5, "#9aa0a8");
  r(x, base - 2, x + 5, base - 2, "#9aa0a8");
  r(x + 1, base - 7, x + 4, base - 7, "#5fa8d8");
}
function wheelbarrow(r, x, base, how) {
  if (how === "tipped") {
    r(x, base - 5, x + 8, base - 1, "#8a5a3a");
    r(x + 1, base - 4, x + 7, base - 2, "#6b4a2f");
    box(r, x + 9, base - 3, x + 11, base, "#2a2d33");
    r(x - 4, base - 1, x, base, "#6b4a2f");
    return;
  }
  box(r, x, base - 6, x + 10, base - 2, "#3f6fb5", "#2a4a80");
  box(r, x + 3, base - 2, x + 6, base + 1, "#2a2d33");
  r(x + 10, base - 3, x + 15, base - 1, "#8a5f33");
  for (const dx of [1, 4, 7]) box(r, x + dx, base - 9, x + dx + 2, base - 7, "#e0782a", "#a8501a");
}
function tractor(r, x, base) {
  box(r, x + 4, base - 9, x + 22, base - 4, "#c0392b", "#8a2a1e");
  r(x + 5, base - 9, x + 21, base - 9, "#e0564a");
  box(r, x + 14, base - 16, x + 22, base - 9, "#c0392b", "#8a2a1e");
  r(x + 16, base - 14, x + 20, base - 11, "#a9d4ef");
  r(x + 7, base - 14, x + 7, base - 10, "#3a3f48");
  r(x + 6, base - 15, x + 8, base - 15, "#3a3f48");
  box(r, x + 14, base - 8, x + 23, base, "#1d2026", "#0e1014");
  r(x + 17, base - 5, x + 20, base - 3, "#f4d35e");
  box(r, x + 1, base - 4, x + 7, base, "#1d2026", "#0e1014");
  r(x + 3, base - 2, x + 5, base - 2, "#f4d35e");
}

// Pen pieces.
function trough(r, x, base, how) {
  if (how === "tipped") {
    box(r, x + 2, base - 7, x + 18, base - 3, "#8a5f33", "#5a3b24");
    r(x + 3, base - 2, x + 17, base, "#5a3b24");
    return;
  }
  box(r, x, base - 5, x + 20, base, "#8a5f33", "#5a3b24");
  r(x + 1, base - 5, x + 19, base - 5, "#5fa8d8");
  r(x + 3, base - 5, x + 6, base - 5, "#9fd0f0");
}
function coop(r, x, broken) {
  box(r, x, 20, x + 20, 28, "#c9a36a", "#8a6a3f");
  for (let i = 0; i < 4; i++) r(x - 1 + i, 19 - i, x + 21 - i, 19 - i, i ? "#b04a3a" : "#7a2e22");
  for (const dx of [2, 18]) r(x + dx, 28, x + dx, 31, "#6b4a2f");
  if (broken) {
    r(x + 6, 16, x + 13, 21, "#2a2420");
    r(x + 16, 23, x + 22, 26, "#2a2420");
    return;
  }
  box(r, x + 8, 22, x + 12, 27, "#3a2a1e");
  for (let i = 0; i < 5; i++) r(x + 12 + i * 2, 27 + i, x + 13 + i * 2, 27 + i, "#a8753f");
}
function hay(r, x) {
  for (const [dx, dy] of [[0, 0], [11, 0], [5, -6]]) {
    box(r, x + dx, 25 + dy, x + dx + 10, 31 + dy, "#e0b84a", "#a8843a");
    r(x + dx + 1, 27 + dy, x + dx + 9, 27 + dy, "#c49a3a");
    r(x + dx + 1, 29 + dy, x + dx + 9, 29 + dy, "#f0cf6a");
  }
}
function vane(r, x, y) {
  r(x, y, x, y + 5, "#3a3f48");
  r(x - 3, y + 1, x + 3, y + 1, "#3a3f48");
  r(x + 1, y, x + 3, y, "#3a3f48");
}
function chicken(r, x, b) {
  box(r, x, b - 3, x + 3, b - 1, "#f4f6f8", "#c9ccd2");
  r(x + 3, b - 5, x + 4, b - 3, "#f4f6f8");
  r(x + 4, b - 6, x + 4, b - 6, "#d64545");
  r(x + 5, b - 4, x + 5, b - 4, "#f4a030");
  r(x - 1, b - 4, x - 1, b - 3, "#e0e2e6");
  r(x + 1, b, x + 2, b, "#f4a030");
}
function cow(r, x, b, coat) {
  box(r, x, b - 9, x + 14, b - 3, coat, "#3a3f48");
  r(x + 1, b - 8, x + 13, b - 8, lightOf(coat));
  for (const [x0, y0, x1, y1] of [[x + 3, b - 8, x + 6, b - 6], [x + 9, b - 6, x + 12, b - 4]]) r(x0, y0, x1, y1, "#2a2d33");
  box(r, x + 14, b - 11, x + 18, b - 6, coat, "#3a3f48");
  r(x + 17, b - 8, x + 18, b - 6, "#e8a0a8");
  r(x + 16, b - 10, x + 16, b - 10, "#1d2026");
  r(x + 14, b - 12, x + 14, b - 12, "#e0d0b0");
  r(x + 18, b - 12, x + 18, b - 12, "#e0d0b0");
  for (const dx of [1, 3, 11, 13]) r(x + dx, b - 2, x + dx, b, "#3a3f48");
  r(x + 7, b - 2, x + 8, b - 2, "#e8a0a8");
  r(x - 1, b - 8, x - 1, b - 4, "#3a3f48");
}
function sheep(r, x, b) {
  box(r, x, b - 6, x + 8, b - 2, "#f4f0e0", "#c9c2ad");
  for (const dx of [1, 4, 7]) r(x + dx, b - 7, x + dx + 1, b - 7, "#f4f0e0");
  box(r, x + 8, b - 7, x + 10, b - 4, "#3a3f48", "#2a2d33");
  r(x + 9, b - 6, x + 9, b - 6, "#f4f6f8");
  for (const dx of [1, 7]) r(x + dx, b - 1, x + dx, b, "#3a3f48");
}
function pig(r, x, b) {
  box(r, x, b - 5, x + 9, b - 1, "#f0a0a8", "#c07078");
  r(x + 1, b - 5, x + 8, b - 5, "#f8c0c6");
  box(r, x + 9, b - 5, x + 12, b - 2, "#f0a0a8", "#c07078");
  r(x + 12, b - 3, x + 13, b - 3, "#d07880");
  r(x + 10, b - 4, x + 10, b - 4, "#1d2026");
  r(x - 1, b - 5, x - 1, b - 4, "#d07880");
  for (const dx of [1, 8]) r(x + dx, b, x + dx, b, "#c07078");
  r(x + 2, b - 1, x + 6, b - 1, "#8a5a3a");
}
function horse(r, x, b) {
  box(r, x, b - 12, x + 14, b - 7, "#8a5a33", "#5a3a20");
  r(x + 1, b - 12, x + 13, b - 12, "#a8703f");
  r(x + 12, b - 17, x + 15, b - 12, "#8a5a33");
  box(r, x + 14, b - 18, x + 19, b - 14, "#8a5a33", "#5a3a20");
  r(x + 18, b - 16, x + 19, b - 14, "#6b4424");
  r(x + 16, b - 17, x + 16, b - 17, "#1d2026");
  r(x + 11, b - 18, x + 13, b - 13, "#3a2618");
  for (const dx of [1, 3, 11, 13]) r(x + dx, b - 6, x + dx, b, "#5a3a20");
  r(x - 2, b - 12, x - 1, b - 6, "#3a2618");
}

// Scrapyard pieces.
function chainFence(r) {
  r(0, 13, WW - 1, 13, "#6b6f78");
  for (let x = 0; x < WW; x += 2) for (let y = 14 + (x % 4 ? 1 : 0); y < 23; y += 2) r(x, y, x, y, "#8a909a");
  for (let x = 0; x < WW; x += 24) r(x, 12, x, 23, "#5a5e66");
  for (let x = 1; x < WW; x += 4) r(x, 11, x, 11, "#9aa0a8");
}
// A lumpy heap of scrap in 2x2 chunks of mixed metal, with a pipe, a tyre and a few painted
// panels sticking out.
function junkPile(r, x, w, h, c) {
  const junk = [c, shadowOf(c), lightOf(c), "#6b6f78", "#5a524a", "#8a6a4a", "#9aa0a8", shadowOf(c)];
  for (let dx = 0; dx <= w; dx += 2) {
    const t = 1 - Math.abs(dx - w / 2) / (w / 2);
    const top = Math.max(1, Math.round(h * Math.sqrt(t) + (hash01(x + dx, 31) - 0.5) * 3));
    for (let dy = 0; dy < top; dy += 2) r(x + dx, 31 - dy - 1, x + dx + 1, 31 - dy, junk[Math.floor(hash01(x + dx, dy + 40) * junk.length)]);
    r(x + dx, 31 - top, x + dx + 1, 31 - top, lightOf(junk[Math.floor(hash01(x + dx, 77) * junk.length)]));
  }
  const mid = x + Math.round(w / 2);
  for (let i = 0; i < 6; i++) r(mid - 6 + i, 31 - h + 1 - Math.floor(i / 2), mid - 6 + i, 31 - h + 1 - Math.floor(i / 2), "#9aa0a8");
  box(r, x + Math.round(w * 0.7), 26, x + Math.round(w * 0.7) + 5, 29, "#1d2026", "#0e1014");
  for (const [f, dy, cc] of [[0.25, 3, "#b03030"], [0.55, Math.max(2, h - 4), "#3f6fb5"], [0.85, 2, "#c9a236"]]) r(x + Math.round(w * f), 31 - dy, x + Math.round(w * f) + 3, 31 - dy + 1, cc);
}
function wreck(r, x, base, c, burnt) {
  box(r, x, base - 5, x + 26, base, c, shadowOf(c));
  box(r, x + 6, base - 8, x + 19, base - 5, mix(c, "#1d2026", 0.35));
  r(x + 8, base - 7, x + 17, base - 7, burnt ? "#1d2026" : "#8fb1c4");
  for (const dx of [3, 19]) box(r, x + dx, base - 2, x + dx + 4, base, "#1d2026");
  if (burnt) for (const [dx, dy] of [[4, 4], [12, 3], [20, 4], [9, 6]]) r(x + dx, base - dy, x + dx + 1, base - dy, "#8a4a2a");
}
function tyre(r, x, y) {
  box(r, x, y - 2, x + 7, y, "#1d2026", "#0e1014");
  r(x + 2, y - 1, x + 5, y - 1, "#3a3f48");
}
function drum(r, x, base, c) {
  // an oil drum: round, so lit on the left and shaded on the right, two ribs and a lid
  for (let i = 0; i <= 6; i++) r(x + i, base - 8, x + i, base, [shadowOf(c), lightOf(c), lightOf(c), c, c, shadowOf(c), mix(c, "#1a1424", 0.45)][i]);
  r(x, base - 6, x + 6, base - 6, shadowOf(c));
  r(x, base - 2, x + 6, base - 2, shadowOf(c));
  r(x, base - 9, x + 6, base - 9, mix(c, "#c9ccd2", 0.5));
  r(x + 4, base - 9, x + 4, base - 9, "#3a3f48");
}
function workbench(r, x) {
  r(x, 23, x + 22, 24, "#8a5f33");
  r(x, 23, x + 22, 23, "#a8753f");
  for (const dx of [1, 20]) r(x + dx, 25, x + dx, 31, "#5a3b24");
  r(x + 2, 29, x + 19, 29, "#5a3b24");
  box(r, x + 3, 20, x + 7, 22, "#d64545", "#8a2a2a");
  r(x + 11, 21, x + 16, 22, "#9aa0a8");
  r(x + 18, 19, x + 18, 22, "#6b6f78");
  r(x + 2, 14, x + 20, 14, "#5a3b24");
  for (const [dx, h, c] of [[3, 3, "#9aa0a8"], [8, 4, "#6b6f78"], [13, 2, "#e0a536"], [17, 3, "#9aa0a8"]]) r(x + dx, 14 - h, x + dx, 13, c);
}
// A crane: its tower at x, the arm reaching right, a magnet lifting a car at the far end.
function crane(r, x) {
  r(x, 3, x + 2, 31, "#e0a536");
  for (let y = 6; y < 31; y += 4) r(x - 2, y, x + 4, y, "#c98a2a");
  r(x - 4, 3, x + 70, 4, "#e0a536");
  for (let xx = x + 6; xx < x + 68; xx += 6) r(xx, 5, xx + 2, 5, "#c98a2a");
  box(r, x + 4, 6, x + 10, 11, "#3a3f48", "#1d2026");
  r(x + 58, 5, x + 58, 9, "#3a3f48");
  box(r, x + 53, 10, x + 63, 12, "#3a3f48", "#1d2026");
  box(r, x + 47, 13, x + 69, 17, "#b03030", "#7a2020");
  box(r, x + 52, 11, x + 64, 13, "#8a2a2a");
  for (const dx of [49, 64]) box(r, x + dx, 16, x + dx + 3, 18, "#1d2026");
}
// Workbench pieces: a rack of weapons being made, a stand with armor, a table of traps.
function weaponRack(r, x) {
  for (const dx of [0, 18]) r(x + dx, 15, x + dx + 1, 31, "#6b4a2f");
  r(x, 15, x + 19, 16, "#8a5f33");
  r(x + 3, 18, x + 4, 30, "#a8753f"); // a bat
  r(x + 3, 17, x + 4, 18, "#c49a64");
  r(x + 8, 19, x + 8, 30, "#8a5f33"); // an axe
  r(x + 6, 19, x + 10, 21, "#9aa0a8");
  r(x + 12, 18, x + 12, 30, "#6b6f78"); // a pipe
  r(x + 15, 20, x + 15, 30, "#8a5f33"); // a spear
  r(x + 14, 18, x + 16, 19, "#d0d4da");
}
function armorStand(r, x) {
  r(x + 5, 18, x + 5, 31, "#5a3b24");
  r(x + 2, 31, x + 8, 31, "#5a3b24");
  box(r, x + 1, 17, x + 9, 25, "#4a5a3a", "#2e3a24");
  r(x + 3, 18, x + 3, 24, "#6b7a45");
  r(x + 7, 18, x + 7, 24, "#6b7a45");
  r(x + 2, 21, x + 8, 21, "#8a8e96");
  box(r, x + 3, 12, x + 7, 16, "#d64545", "#8a2a2a");
  r(x + 3, 15, x + 7, 15, "#1d2026");
}
function trapTable(r, x) {
  r(x, 24, x + 24, 25, "#8a5f33");
  r(x, 24, x + 24, 24, "#a8753f");
  for (const dx of [1, 22]) r(x + dx, 26, x + dx + 1, 31, "#5a3b24");
  for (let i = 0; i < 3; i++) { r(x + 2 + i * 3, 21, x + 2 + i * 3, 23, "#d64545"); r(x + 1 + i * 3, 23, x + 3 + i * 3, 23, "#a83232"); } // spikes
  for (const [dx, dy] of [[13, 20], [15, 19], [17, 19], [19, 20], [20, 22], [19, 23], [17, 23], [15, 23], [13, 23], [12, 22]]) r(x + dx, dy, x + dx, dy, "#b6bbc3"); // a coil of wire
  r(x + 15, 21, x + 17, 21, "#8a909a");
  box(r, x + 5, 28, x + 12, 30, "#6b6f78", "#3a3f48"); // a bear trap under the table
  r(x + 6, 27, x + 11, 27, "#9aa0a8");
}
function sign(r, x, broken) {
  r(x + 2, 18, x + 3, 31, "#6b6f78");
  box(r, x - 6, 12, x + 11, 18, broken ? "#8a8457" : "#f4d35e", "#3a3f48");
  if (broken) r(x + 6, 12, x + 11, 14, mix("#a39c8f", "#6f7780", 0.5));
  r(x - 4, 15, x + 7, 15, "#3a3f48");
}
function crusher(r, x) {
  box(r, x, 12, x + 26, 31, "#6b7a8a", "#3a4450");
  r(x + 1, 12, x + 25, 12, "#8a9aaa");
  box(r, x + 4, 16, x + 22, 22, "#2a2d33", "#1d2026");
  box(r, x + 6, 22, x + 20, 27, "#c9a236", "#8a6a1a");
  for (let xx = x + 2; xx < x + 25; xx += 4) r(xx, 29, xx + 1, 29, "#f4d35e");
  r(x + 12, 5, x + 14, 12, "#4a5460");
  // crushed cubes stacked beside it
  for (const [dx, dy, c] of [[28, 0, "#b03030"], [36, 0, "#3f6fb5"], [32, -7, "#9aa0a8"]]) {
    box(r, x + dx, 24 + dy, x + dx + 7, 31 + dy, c, shadowOf(c));
    r(x + dx + 2, 26 + dy, x + dx + 5, 26 + dy, lightOf(c));
  }
}
function floodlight(r, x) {
  const glow = r.glow || r;
  r(x, 4, x + 1, 31, "#6b6f78");
  box(glow, x - 3, 2, x + 4, 5, "#f4d35e", "#c9a227");
  glow(x - 2, 3, x + 3, 3, "#fffbe8");
  r.light?.({ x: x + 0.5, y: 6, len: 40, w0: 4, spread: 0.6, k: 0.32, c: LAMP_LIGHT });
  for (let i = 1; i < 5; i++) r(x - 3 - i, 5 + i, x + 4 + i, 5 + i, "#fff4b01a");
}
function forklift(r, x, base) {
  box(r, x + 6, base - 9, x + 20, base - 3, "#e0a536", "#a8761a");
  r(x + 12, base - 16, x + 12, base - 9, "#3a3f48");
  r(x + 19, base - 16, x + 19, base - 9, "#3a3f48");
  r(x + 12, base - 16, x + 19, base - 16, "#3a3f48");
  r(x + 2, base - 14, x + 3, base - 1, "#3a3f48");
  r(x - 3, base - 2, x + 3, base - 1, "#3a3f48");
  box(r, x - 4, base - 8, x + 1, base - 3, "#8a6a4a", "#5a4430");
  box(r, x + 6, base - 3, x + 10, base, "#1d2026");
  box(r, x + 15, base - 3, x + 19, base, "#1d2026");
}

// ---------- the Greenhouse's props ----------
// A herb in a bed, standing on `base`: a seedling, spiky aloe, a pink-and-orange echinacea, or a
// young willow switch.
function herb(r, x, base, kind) {
  if (kind === "sprout") return crop(r, x, base, "sprout");
  if (kind === "aloe") {
    for (const [dx, h, c] of [[-2, 3, "#4f9a5a"], [-1, 5, "#6fbf7a"], [0, 6, "#8ad89a"], [1, 5, "#6fbf7a"], [2, 3, "#4f9a5a"]]) r(x + dx, base - h + 1, x + dx, base, c);
    r(x - 3, base - 1, x - 3, base, "#4f9a5a");
    r(x + 3, base - 1, x + 3, base, "#3f7f4a");
    return;
  }
  if (kind === "echinacea") {
    r(x, base - 6, x, base, "#4f8a3a");
    r(x + 1, base - 2, x + 2, base - 2, "#5a9a45");
    for (const [dx, dy] of [[-2, 6], [-1, 7], [1, 7], [2, 6], [-2, 5], [2, 5]]) r(x + dx, base - dy, x + dx, base - dy, "#e06aa8");
    r(x - 1, base - 8, x + 1, base - 7, "#e0782a");
    r(x, base - 8, x, base - 8, "#f4a050");
    return;
  }
  // a willow switch: a thin stem with drooping strands
  r(x, base - 7, x, base, "#6b4a2f");
  for (const dx of [-2, -1, 1, 2]) r(x + dx, base - 6 + Math.abs(dx), x + dx, base - 2 + Math.abs(dx), dx < 0 ? "#7fc86a" : "#5aa84a");
}

// A weeping willow on `base`: a trunk and long curtains of leaves.
function willowTree(r, x, base) {
  r(x, base - 14, x + 2, base, "#5a3b24");
  r(x, base - 14, x, base, "#7a5232");
  const crown = [[-9, 9], [-11, 11], [-12, 12], [-12, 12], [-11, 11]];
  crown.forEach(([a, b], i) => r(x + 1 + a, base - 24 + i, x + 1 + b, base - 24 + i, i < 2 ? "#8ac86a" : "#6aa84f"));
  for (let dx = -12; dx <= 12; dx += 2) {
    const len = 8 + ((dx * 7 + 30) % 5);
    r(x + 1 + dx, base - 19, x + 1 + dx, base - 19 + len, dx % 4 ? "#5a9a45" : "#7fbf5a");
  }
}

// The glasshouse between x0 and x1: plants inside, a low brick wall, glass walls and a pitched
// glass roof on a white frame. Smashed at level 1; grow lamps glowing inside at level 5.
function glasshouse(r, x0, x1, lv) {
  const mid = Math.round((x0 + x1) / 2);
  const half = Math.round((x1 - x0) / 2);
  // what grows inside, seen through the glass
  if (lv >= 2) {
    for (let x = x0 + 6; x < x1 - 4; x += 9) {
      r(x, 18, x, 26, "#4f8a3a");
      for (const [dx, dy] of [[-2, 0], [-1, -2], [1, -1], [2, 1], [-1, 3], [1, 4]]) r(x + dx, 20 + dy, x + dx + (dx > 0 ? 1 : 0), 20 + dy, lv >= 3 ? "#6fbf5a" : "#7fc86a");
      if (lv >= 3) r(x - 1, 17, x + 1, 17, x % 2 ? "#e06aa8" : "#f4d35e");
    }
    if (lv >= 4) for (let x = x0 + 3; x < x1 - 2; x += 5) plant(r, x, 26 + (x % 2));
  }
  // the low brick wall
  box(r, x0, 27, x1, 31, "#9a5a48", "#6a3a30");
  r(x0, 27, x1, 27, "#b87060");
  for (let x = x0 + 3; x < x1; x += 6) r(x, 29, x, 29, "#7a4438");
  // glass: the walls, then the roof narrowing to the ridge
  const glass = lv <= 1 ? "#3a404a66" : "#c8ecf855";
  r(x0 + 1, 14, x1 - 1, 26, glass);
  // the roof catches the sky: a stronger tint, lighter on the left slope than the right
  for (let y = 6; y < 14; y++) {
    const w = Math.round(((y - 5) / 8) * half);
    r(mid - w, y, mid - 1, y, lv <= 1 ? "#3a404a88" : "#a8d8eacc");
    r(mid, y, mid + w, y, lv <= 1 ? "#2a303a88" : "#6aa8c4cc");
  }
  // the frame: eaves, ridge, roof edges and roof bars in steel, the wall mullions white
  const frame = lv <= 1 ? "#8a8c8a" : "#e8eef0";
  const steel = lv <= 1 ? "#5a5c5a" : "#6a7680";
  r(x0, 13, x1, 13, steel);
  for (let y = 6; y < 14; y++) {
    const w = Math.round(((y - 5) / 8) * half);
    r(mid - w - 1, y, mid - w, y, steel);
    r(mid + w, y, mid + w + 1, y, steel);
    for (let x = x0 + 11; x < x1; x += 11) if (Math.abs(x - mid) < w) r(x, y, x, y, steel);
  }
  r(mid, 5, mid, 13, steel);
  r(mid, 14, mid, 26, frame);
  for (let x = x0; x <= x1; x += 11) r(x, 14, x, 26, frame);
  r(x1, 14, x1, 26, frame);
  if (lv >= 2) {
    // glints on the panes
    for (let x = x0 + 3; x < x1; x += 11) r(x, 16, x + 1, 15, "#ffffffaa");
    for (const x of [mid - 20, mid + 14]) r(x, 9, x + 2, 8, "#ffffff88");
  }
  if (lv <= 1) {
    // smashed: dark holes in the panes, shards on the ground
    for (const [x, y, w, h] of [[x0 + 4, 16, 5, 4], [x0 + 26, 19, 6, 5], [mid + 6, 15, 4, 6], [x1 - 14, 20, 5, 3], [mid - 8, 9, 4, 2]]) r(x, y, x + w, y + h, "#1d2026aa");
    for (const [x, y] of [[x0 + 8, 33], [mid, 35], [x1 - 6, 34], [x0 + 30, 36]]) r(x, y, x + 1, y, "#c8ecf8");
    return;
  }
  if (lv === 2) for (const [x, y] of [[x0 + 26, 19], [x1 - 14, 20]]) r(x, y, x + 5, y + 4, "#a8753f99"); // boarded-up panes
  if (lv >= 5) {
    // grow lamps hanging under the roof, glowing pink-white
    const glow = r.glow || r;
    for (let x = x0 + 8; x < x1 - 6; x += 18) {
      r(x + 2, 12, x + 2, 14, "#6b6f78");
      glow(x, 15, x + 4, 15, "#fff3c4");
      r.light?.({ x: x + 2, y: 16, r: 14, k: 0.4, c: [1.0, 0.82, 0.95] });
    }
  }
}

// A cracked clay pot lying on its side.
function brokenPot(r, x, base) {
  r(x, base - 3, x + 5, base, "#b0673a");
  r(x + 1, base - 2, x + 4, base - 1, "#7a4424");
  r(x + 7, base, x + 8, base, "#b0673a");
  r(x - 2, base, x - 1, base, "#c98050");
}

// The chili rack: two posts and a line strung with red peppers drying (more of them with each level).
function chiliRack(r, x, lv) {
  for (const dx of [0, 18]) r(x + dx, 14, x + dx + 1, 31, "#7a5230");
  r(x, 14, x + 19, 14, "#a8753f");
  const n = Math.min(8, 2 + lv * 2);
  for (let i = 0; i < n; i++) {
    const px = x + 2 + i * 2;
    r(px, 15, px, 15, "#4caf50");
    r(px, 16, px, 18 + (i % 2), i % 3 ? "#e03a2a" : "#c02a20");
  }
  if (lv >= 3) for (let i = 0; i < n; i++) r(x + 2 + i * 2, 21, x + 2 + i * 2, 23 - (i % 2), i % 2 ? "#e03a2a" : "#b02a20");
}

// A copper still: a round pot on a stand, a pipe coiling over into a cooling barrel. `lit`: a fire
// under the pot.
function still(r, x, lit) {
  for (const dx of [1, 9]) r(x + dx, 27, x + dx, 31, "#3a3f48");
  disc(r, x + 5, 22, 5, 5, "#c87a3a");
  r(x + 2, 19, x + 4, 19, "#f0a868");
  r(x + 4, 14, x + 6, 17, "#a8602a");
  r(x + 6, 13, x + 13, 13, "#c87a3a");
  r(x + 13, 13, x + 13, 22, "#c87a3a");
  box(r, x + 11, 23, x + 17, 31, "#6b4a2f", "#4a3020");
  for (const y of [25, 29]) r(x + 11, y, x + 17, y, "#9aa0a8");
  if (lit) {
    const glow = r.glow || r;
    for (const [dx, c] of [[3, "#f08a3a"], [5, "#fff4b0"], [7, "#f4d35e"], [4, "#f4d35e"], [6, "#f08a3a"]]) glow(x + dx, 29, x + dx, 30, c);
    r.light?.({ x: x + 5, y: 29, r: 12, k: 0.5, c: [1.0, 0.7, 0.4] });
  }
}

// A coffee bush in a pot: dark glossy leaves with red cherries.
function coffeeBush(r, x, base) {
  box(r, x, base - 4, x + 7, base, "#b0673a", "#7a4424");
  r(x - 1, base - 5, x + 8, base - 5, "#c98050");
  const rows = [[2, 5], [0, 7], [-1, 8], [0, 7], [1, 6]];
  rows.forEach(([a, b], i) => r(x + a, base - 15 + i * 2, x + b, base - 14 + i * 2, i % 2 ? "#2f6a3a" : "#3f8a4a"));
  for (const [dx, dy] of [[1, 12], [5, 10], [3, 8], [6, 13], [0, 9]]) r(x + dx, base - dy, x + dx, base - dy, "#d64545");
}

const sceneCache = new Map();

// Returned as a CSS url() so the banner can tile it sideways — full-width cards get a longer
// room instead of a stretched or cropped one. `kind` may carry the room's level ("gym@3"); the
// scene is drawn for it (level 5 if none is given).
// `floorRows` > 0 adds that many rows of floor under the scene — its bottom 8 rows repeated — so a
// fight can stand people on a deeper floor in front of the room.
//
// Every scene is lit: indoors dim while the room's run-down and its lamps are out, brighter as it's
// done up (INDOOR_AMBIENT by level), lamps casting warm pools and cones, windows glowing with a
// shaft of daylight, screens and indicator lights glowing; outdoors (the Farm and the Scrapyard,
// Turn 2 tabs) in warm afternoon light.
const LAMP_LIGHT = [1.0, 0.86, 0.6];
const DAYLIGHT = [0.8, 0.9, 1.0];
const SCREEN_LIGHTS = { "#7fe0a8": [0.45, 1.0, 0.7], "#d8ffe8": [0.6, 1.0, 0.8], "#ff5b5b": [1.0, 0.4, 0.4], "#fff3c4": [1.0, 0.95, 0.75], "#fffbe8": [1.0, 0.95, 0.8] };
const INDOOR_AMBIENT = [[0.5, 0.5, 0.58], [0.58, 0.58, 0.65], [0.64, 0.64, 0.7], [0.68, 0.68, 0.73], [0.72, 0.72, 0.76]];
const AFTERNOON = [[0.68, 0.67, 0.68], [0.82, 0.79, 0.76], [0.89, 0.85, 0.8], [0.93, 0.88, 0.81], [0.96, 0.9, 0.82]];
const OUTDOOR_SCENES = new Set(["farm", "scrapyard", "greenhouse"]);

// Shadows, so the things in a room sit in it: indoors a drop shadow down and to the right of
// everything on the wall, the ceiling's shadow along the top, and the floor darker where it meets
// the wall and darker still under anything standing there; outdoors a shadow at the foot of
// everything on the ground. `prop` marks the things (see sceneBackground). The scene tiles
// sideways, so the shadows wrap round.
function finishScene(p, prop, w, h, outdoor) {
  const isProp = (x, y) => y >= 0 && y < h && prop[y * w + ((x + w) % w)];
  const dims = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (prop[i] || p.glow[i]) continue;
    let k = 0;
    if (outdoor) {
      if (y >= 22) k = isProp(x, y - 1) ? 0.34 : isProp(x, y - 2) ? 0.16 : isProp(x - 1, y - 1) || isProp(x + 1, y - 1) ? 0.12 : 0;
    } else if (y <= 31) {
      if (isProp(x - 1, y - 1)) k = 0.3;
      if (y <= 2) k = Math.max(k, [0.22, 0.12, 0.05][y]);
    } else {
      const d = y - 32;
      if (d < 4) {
        const under = isProp(x, 31) ? [0.32, 0.2, 0.08, 0.03] : isProp(x - 1, 31) || isProp(x + 1, 31) ? [0.16, 0.07, 0, 0] : [0, 0, 0, 0];
        k = [0.2, 0.1, 0.04, 0][d] + under[d];
      }
    }
    if (k) dims.push(i, k);
  }
  for (let n = 0; n < dims.length; n += 2) p.col[dims[n]] = mix(p.col[dims[n]] || "#000000", "#140f1e", dims[n + 1]);
}

export function sceneBackground(kind, floorRows = 0) {
  const key = floorRows ? `${kind}+${floorRows}` : kind;
  if (!sceneCache.has(key)) {
    const [name, lvText] = kind.split("@");
    const hi = HI_SCENES[name];
    const lv = Math.min(5, Math.max(1, Number(lvText) || 5));
    const [w, h] = [SCENE_WIDTH[name] || HW, HH];
    const p = buffer(w, h + floorRows);
    const lights = [];
    // Everything solid drawn after the room's shell (r.shellDone) is a thing in the room, and gets a
    // shadow (finishScene); see-through colours and r.shade (stains, shadows) don't.
    const prop = new Uint8Array(w * h);
    let shellOn = false;
    const mark = (x0, y0, x1, y1, c) => {
      if (!shellOn || !c || c.length !== 7) return;
      for (let y = Math.max(0, Math.round(y0)); y <= Math.min(h - 1, Math.round(y1)); y++)
        for (let x = Math.max(0, Math.round(x0)); x <= Math.min(w - 1, Math.round(x1)); x++) prop[y * w + x] = 1;
    };
    const r = (x0, y0, x1, y1, c) => {
      p.r(x0, y0, x1, y1, c);
      mark(x0, y0, x1, y1, c);
    };
    r.glow = (x0, y0, x1, y1, c) => {
      p.r(x0, y0, x1, y1, c, 1);
      mark(x0, y0, x1, y1, c);
    };
    r.shade = (x0, y0, x1, y1, c) => p.r(x0, y0, x1, y1, c);
    r.light = (l) => lights.push(l);
    r.lv = lv;
    r.shellDone = () => {
      shellOn = true;
      prop.fill(0);
    };
    (hi || HI_SCENES.classroom_empty)(r, lv);
    if (shellOn) finishScene(p, prop, w, h, OUTDOOR_SCENES.has(name));
    // screens, indicator lights, the sun: they glow, and each cluster of them lights its corner
    const cells = new Map();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = p.col[y * w + x];
      if (!SCREEN_LIGHTS[c]) continue;
      p.glow[y * w + x] = 1;
      const k = `${x >> 3},${y >> 3}`;
      const cell = cells.get(k) || { x: 0, y: 0, n: 0, c };
      cell.x += x;
      cell.y += y;
      cell.n++;
      cells.set(k, cell);
    }
    for (const cell of cells.values()) if (cell.n >= 2) lights.push({ x: cell.x / cell.n, y: cell.y / cell.n, r: 10 + Math.min(10, cell.n), k: 0.35, c: SCREEN_LIGHTS[cell.c] });
    // a deeper floor for a fight: the bottom 8 rows again and again, each copy slid sideways (the
    // scene wraps round) so the scuffs and planks don't line up in columns
    for (let y = h; y < h + floorRows; y++) {
      const band = Math.floor((y - h) / 8) + 1;
      const src = (h - 8 + ((y - h) % 8)) * w;
      for (let x = 0; x < w; x++) {
        const sx = (x + band * 61) % w;
        p.col[y * w + x] = p.col[src + sx];
        p.glow[y * w + x] = p.glow[src + sx];
      }
    }
    const ambient = (OUTDOOR_SCENES.has(name) ? AFTERNOON : INDOOR_AMBIENT)[lv - 1];
    sceneCache.set(key, `url('${lightUp(p, lights, { ambient, mist: false })}')`);
  }
  return sceneCache.get(key);
}

// ---------- pixel icons ----------
// 12x12 or 16x16 (the grid sets the size), filled shapes only — the dark outline is added
// automatically, like the sprites. The 16x16 ones are shaded: light top-left, dark bottom-right.

const IW = 12;
const blank = (n = IW) => Array.from({ length: n }, () => Array(n).fill(null));

function ascii(rows, palette) {
  const g = blank(rows.length);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== ".") g[y][x] = palette[ch];
  }));
  return g;
}
function disk(g, cx, cy, rad, color) {
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g.length; x++) {
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad) g[y][x] = color;
  }
  return g;
}
// A rod from (x0,y0) to (x1,y1), `rad` thick; paint(t, side) picks each pixel's colour from how
// far along the rod it is (0..1) and which side of the middle line it's on (− is up-left).
function rod(g, x0, y0, x1, y1, rad, paint) {
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy;
  for (let y = 0; y < g.length; y++) for (let x = 0; x < g.length; x++) {
    const px = x + 0.5 - x0, py = y + 0.5 - y0;
    const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
    const ox = px - t * dx, oy = py - t * dy;
    if (ox * ox + oy * oy <= rad * rad) g[y][x] = typeof paint === "function" ? paint(t, (ox * dy - oy * dx) / Math.sqrt(len2)) : paint;
  }
  return g;
}
// The round morale face: shaded yellow, then eyes/mouth/extras as [x, y, colour] pixels.
const FACE = { base: "#f4c542", light: "#fbe08a", shine: "#fff4c8", dark: "#d99a22", ink: "#4a2a14", mouth: "#8a3a1a", tongue: "#e0605a", tear: "#7fc8f0", blush: "#f08a5a" };
function face16(marks, base = FACE.base, dark = FACE.dark) {
  const g = blank(16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
    if (r > 6.9) continue;
    g[y][x] = dx + dy > 4.2 && r > 4.6 ? dark : dx + dy < -4.6 && r > 3.8 ? FACE.light : base;
  }
  for (const [x, y] of [[4, 4], [5, 3], [4, 5]]) g[y][x] = FACE.shine;
  for (const [x, y, c] of marks) g[y][x] = c;
  return g;
}
const px = (c, ...pts) => pts.map(([x, y]) => [x, y, c]);
const DOT_EYES = px(FACE.ink, [5, 6], [5, 7], [10, 6], [10, 7]);

// ---- item icon helpers ----
// rod() paints: light on the up-left side, dark on the down-right.
const sh = (light, mid, dark) => (t, side) => (side < -0.4 ? light : side > 0.5 ? dark : mid);
const STEEL = sh("#ffffff", "#c9ced4", "#8a93a0");
const IRON = sh("#9aa3ad", "#5b616d", "#3a3f48");
const WOOD = sh("#e8c08a", "#c99a5e", "#8a5a3a");
// A jacket or coat, front on: `b` body, `L`/`d` its light and dark edge, `s` sleeves, `k` cuffs,
// `c` collar, `z` zip/opening, `t` hem — recoloured per item, with optional extra pixels.
function garment(colors, extra = [], hood = false) {
  const g = ascii([
    "................",
    hood ? ".....hhhhhh....." : "................",
    hood ? "....hhkkkkhh...." : "......cccc......",
    "....sbbccbbs....",
    "...ssbbzzbbss...",
    "..sssLbzzbdsss..",
    "..ss.Lbzzbd.ss..",
    "..ss.Lbzzbd.ss..",
    "..ss.Lbzzbd.ss..",
    "..ss.Lbzzbd.ss..",
    "..kk.Lbzzbd.kk..",
    ".....Lbzzbd.....",
    ".....tttttt.....",
    "................",
    "................",
    "................",
  ], { h: colors.s, k: colors.k, c: colors.c, ...colors });
  for (const [x, y, c] of extra) g[y][x] = c;
  return g;
}
// A sleeveless vest (or apron): straps, body, hem; pockets as extra pixels.
function vest(colors, extra = []) {
  const g = ascii([
    "................",
    "................",
    "................",
    ".....bb..bb.....",
    ".....bb..bb.....",
    "....bbbbbbbb....",
    "...Lbbbbbbbbd...",
    "...Lbbbbbbbbd...",
    "...Lbbbbbbbbd...",
    "...Lbbbbbbbbd...",
    "...Lbbbbbbbbd...",
    "...Lbbbbbbbbd...",
    "...tttttttttt...",
    "................",
    "................",
    "................",
  ], colors);
  for (const [x, y, c] of extra) g[y][x] = c;
  return g;
}
// A legendary item: its base icon with a gold outline and a sparkle in the corner.
function legendary(base) {
  const g = ICONS[base]().map((row) => [...row]);
  for (const [x, y] of [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]]) if (!g[y][x]) g[y][x] = "#fff6c0";
  g.outline = "#e8b830";
  return g;
}

const ICONS = {
  // ---- resources (16x16) ----
  // Food: a tin of canned food — metal lid and rims, red label, yellow badge.
  food: () => ascii([
    "................",
    "................",
    "....nnnnnnnn....",
    "..nMMMMMMMMMMn..",
    "..nmmmmmmmmmmn..",
    "..nnnnnnnnnnnn..",
    "..RRrrrrrrrrrq..",
    "..Rrrrrrrrrrrq..",
    "..RrrrYyyyrrrq..",
    "..RrrYyyyyyrrq..",
    "..Rrryyyyyzrrq..",
    "..Rrrryzzzrrrq..",
    "..RRrrrrrrrrqq..",
    "..Mmmmmmmmmmmn..",
    "...nnnnnnnnnn...",
    "................",
  ], { n: "#7c8590", m: "#b8c0c8", M: "#e4e9ee", r: "#c8423a", R: "#e8705e", q: "#8e2a26", y: "#f2c14e", Y: "#fbe08a", z: "#c9912e" }),
  // Scrap: a shaded steel gear — the one scrap icon everywhere.
  scrap: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      const tooth = Math.cos(8 * Math.atan2(dy, dx) + Math.PI / 8) > 0.15;
      if (r < 2.1 || r > (tooth ? 7.1 : 5.3)) continue;
      g[y][x] = r < 3.1 ? "#6b7480" : dx + dy < -3 ? "#dde3e8" : dx + dy > 3.5 ? "#6f7985" : "#a3acb6";
    }
    return g;
  },
  // Medicine: a red medkit with a white cross.
  medicine: () => ascii([
    "................",
    "................",
    "......kkkk......",
    ".....k....k.....",
    "..rrrrrrrrrrrr..",
    "..rRRRRRRRRRRq..",
    "..rRrrrwwrrrrq..",
    "..rRrrrwwrrrrq..",
    "..rRrwwwwwwrrq..",
    "..rRrwwwwwwrrq..",
    "..rRrrrwwrrrrq..",
    "..rRrrrwwrrrrq..",
    "..rrrrrrrrrrrq..",
    "..qqqqqqqqqqqq..",
    "................",
    "................",
  ], { k: "#6b7380", r: "#d64545", R: "#f07a6a", q: "#9e2e2e", w: "#ffffff" }),
  // Serum: a syringe of green antiviral.
  serum: () => {
    const g = blank(16);
    rod(g, 1.5, 14.5, 4.2, 11.8, 0.5, "#c9ccd2");
    rod(g, 4.6, 11.4, 10.6, 5.4, 2.3, (t, side) => t < 0.62
      ? (side < -0.9 ? "#a8f0b0" : side > 1 ? "#2f9a4a" : "#4fc46a")
      : (side < -0.9 ? "#ffffff" : side > 1 ? "#9fb4c0" : "#dfeef5"));
    rod(g, 9.3, 2.7, 13.3, 6.7, 0.75, "#8a93a0");
    rod(g, 11.6, 4.4, 13.2, 2.8, 0.6, "#b6bcc4");
    rod(g, 12, 1.2, 14.8, 4, 0.75, "#8a93a0");
    return g;
  },
  // Research: a lab flask of bubbling purple.
  research: () => ascii([
    "................",
    ".....kkkkkk.....",
    "......gGgg......",
    "......gGgg......",
    "......gGgg......",
    ".....gGgggg.....",
    "....gGgggggg....",
    "...gGppppppgg...",
    "..gGpPpppppppg..",
    ".gGppppppppppqg.",
    ".gppbpppppppqqg.",
    ".gpppppppbppqqg.",
    ".gppppppppppqqg.",
    "..gggggggggggg..",
    "................",
    "................",
  ], { k: "#e6eef2", g: "#a9c6d2", G: "#f2fbff", p: "#8a5ad6", P: "#c3a3f5", q: "#6a3eb0", b: "#e3d3ff" }),
  // Population: a teacher at the back with two students in front.
  population: () => ascii([
    "................",
    "......hhhh......",
    "......ssss......",
    "......ssss......",
    "......sssS......",
    ".....NnwwnN.....",
    "..HHHHNnnnGGGG..",
    "..ssssNnnnssss..",
    "..ssssNnnnssss..",
    "..sssSNnnnsssS..",
    ".UuuuuvNnCcccce.",
    ".UuuuuvNnCcccce.",
    ".UuuuuvNnCcccce.",
    ".Uuuuuv..Ccccce.",
    ".Uuuuuv..Ccccce.",
    "................",
  ], { h: "#6b4a3a", s: "#f2c9a0", S: "#d9a47a", N: "#56679e", n: "#34406b", w: "#eef3f7", H: "#8a5a3a", G: "#2c2c34",
    U: "#7fb0f0", u: "#3f7fd6", v: "#2a5aa0", C: "#8ad8a8", c: "#4caf7d", e: "#2e7a52" }),
  // ---- combat (16x16): expedition roles, abilities, night actions, formations, defender roles,
  // zombie types — ui.js swaps them in for the data's emoji ----
  // Fighter: a sword.
  role_fighter: () => {
    const g = blank(16);
    rod(g, 5.6, 10.4, 13.4, 2.6, 1.25, (t, side) => (side < -0.2 ? "#f4f6f8" : "#a9b1ba"));
    rod(g, 1.9, 14.1, 4.6, 11.4, 0.8, "#8a5a3a");
    rod(g, 3.2, 9.0, 7.0, 12.8, 0.85, "#e8c14a");
    disk(g, 1.7, 14.3, 1.05, "#e8c14a");
    return g;
  },
  // Scout: binoculars.
  role_scout: () => {
    const g = blank(16);
    for (let y = 3; y <= 6; y++) for (const x of [3, 4, 5, 6, 9, 10, 11, 12]) g[y][x] = "#4a4f5a";
    for (let y = 6; y <= 9; y++) for (const x of [7, 8]) g[y][x] = "#3a3f48";
    disk(g, 5, 10, 3.4, "#5b616d");
    disk(g, 11, 10, 3.4, "#5b616d");
    disk(g, 5, 10, 2.1, "#3f8fd0");
    disk(g, 11, 10, 2.1, "#3f8fd0");
    for (const [x, y] of [[4, 9], [10, 9], [3, 4], [9, 4]]) g[y][x] = "#cfeaff";
    return g;
  },
  // Support: a lightbulb — the brains of the team.
  role_support: () => ascii([
    "................",
    "................",
    "......yyyy......",
    ".....yYYyyy.....",
    "....yYyyyyyy....",
    "....yYyyyyyy....",
    "....yyyyyyyz....",
    ".....yyyyyz.....",
    "......yyyz......",
    "......yyyz......",
    "......gggg......",
    "......Gggg......",
    "......gggg......",
    ".......gg.......",
    "................",
    "................",
  ], { y: "#f4d03f", Y: "#fff3b0", z: "#d4a017", g: "#9aa3ad", G: "#d0d6dc" }),
  // Cleave: a sweeping slash.
  ab_cleave: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const a = Math.hypot(x + 0.5 - 8, y + 0.5 - 8), b = Math.hypot(x + 0.5 - 10.2, y + 0.5 - 10.2);
      if (a <= 6.9 && b > 6.1) g[y][x] = b < 7.1 ? "#ffffff" : "#8fc1f5";
    }
    return g;
  },
  // Headshot: a scope's crosshair.
  ab_headshot: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x - 7, dy = y - 7, r = Math.hypot(dx, dy); // pixel (7, 7) is the middle
      const ring = r >= 4.6 && r <= 5.7;
      const line = (Math.abs(dx) < 0.5 && Math.abs(dy) >= 2 && Math.abs(dy) <= 7) || (Math.abs(dy) < 0.5 && Math.abs(dx) >= 2 && Math.abs(dx) <= 7);
      if (ring || line) g[y][x] = "#e04848";
    }
    g[7][7] = "#ff9a9a";
    return g;
  },
  // Rally Cry: a green heart with a plus.
  ab_rally: () => ascii([
    "................",
    "................",
    "...ggg....ggg...",
    "..gGGgg..ggggg..",
    ".gGGggggggggggg.",
    ".gGggggwwgggggd.",
    ".ggggggwwggggdd.",
    "..gggwwwwwwgdd..",
    "...ggwwwwwwdd...",
    "....gggwwgdd....",
    ".....ggwwdd.....",
    "......gggd......",
    ".......gd.......",
    "................",
    "................",
    "................",
  ], { g: "#4cc46a", G: "#a8f0b0", d: "#2e8a48", w: "#ffffff" }),
  // Molotov: a bottle with a burning rag.
  na_molotov: () => ascii([
    "................",
    ".......F........",
    "......FfF.......",
    "......fYfF......",
    ".....FfYYf......",
    "......fYYf......",
    ".......ww.......",
    ".......gG.......",
    ".......gG.......",
    "......gGgg......",
    ".....gGaaag.....",
    ".....gaAaag.....",
    ".....gaaaaq.....",
    ".....gaaaaq.....",
    "......gqqq......",
    "................",
  ], { F: "#f08a24", f: "#ffb347", Y: "#fff1a8", w: "#e8dcc0", g: "#4f8a5a", G: "#9fd8a8", a: "#c98a2e", A: "#f1c27d", q: "#2f5a3a" }),
  // Focus Fire: a bullseye.
  na_focus: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 8, y + 0.5 - 8);
      if (r <= 6.8) g[y][x] = r <= 1.6 ? "#d64545" : r <= 3.3 ? "#f4f4f4" : r <= 5.1 ? "#d64545" : "#f4f4f4";
    }
    return g;
  },
  // Patch Up: a sticking plaster.
  na_patch: () => rod(blank(16), 3.4, 12.6, 12.6, 3.4, 2.7, (t, side) => {
    const pad = t > 0.36 && t < 0.64;
    if (pad) return side < -1 ? "#ffffff" : "#f6ead6";
    return side < -1.2 ? "#f6d9b0" : side > 1.3 ? "#c99a66" : "#e6bd88";
  }),
  // Rally: a brass bell.
  na_rally: () => ascii([
    "................",
    "................",
    ".......yy.......",
    "......yYyy......",
    ".....yYyyyy.....",
    ".....yYyyyy.....",
    "....yYyyyyyy....",
    "....yYyyyyyy....",
    "....yyyyyyyz....",
    "...yyyyyyyyyz...",
    "..yyyyyyyyyyyz..",
    "..zzzzzzzzzzzz..",
    ".......kk.......",
    "................",
    "................",
    "................",
  ], { y: "#f2c14e", Y: "#fff0a8", z: "#b8862a", k: "#7a5a2a" }),
  // Guarded: a blue shield with a white cross.
  form_guarded: () => ascii([
    "................",
    "................",
    "..ssssssssssss..",
    "..sBBBBwwbbbbs..",
    "..sBBBBwwbbbbs..",
    "..swwwwwwwwwws..",
    "..swwwwwwwwwws..",
    "..sBBBBwwbbbbs..",
    "..sBBBBwwbbbbs..",
    "...sBBBwwbbbs...",
    "....sBBwwbbs....",
    ".....sBwwbs.....",
    "......swws......",
    ".......ss.......",
    "................",
    "................",
  ], { s: "#c9ccd2", B: "#5f8fe0", b: "#3a64b0", w: "#f4f6f8" }),
  // Shield Wall: two round shields side by side.
  form_shieldWall: () => {
    const g = blank(16);
    for (const cx of [5.3, 10.7]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - 8.5, r = Math.hypot(dx, dy);
        if (r > 4.5) continue;
        g[y][x] = r < 1.4 ? (dx + dy < 0 ? "#eef1f4" : "#9aa3ad") : r > 3.5 ? "#6e4a2c" : dx + dy < -1.5 ? "#c99a5e" : "#a8743f";
      }
    }
    return g;
  },
  // Crossfire: two crossed arrows.
  form_crossfire: () => {
    const g = blank(16);
    for (const flip of [false, true]) {
      const X = (x) => (flip ? 16 - x : x);
      rod(g, X(2.6), 13.4, X(12.4), 3.6, 0.55, "#c99a5e");
      rod(g, X(1.9), 14.1, X(3.8), 12.2, 1.0, "#d64545");
      rod(g, X(11.4), 4.6, X(13.4), 2.6, 1.15, "#d0d6dc");
    }
    return g;
  },
  // Brawler: a clenched fist.
  dr_brawler: () => ascii([
    "................",
    "................",
    "................",
    "...ssssssss.....",
    "..sSSsSSsSSs....",
    "..sSSsSSsSSss...",
    "..ssssssssssd...",
    "..sSSsSSsSSsd...",
    "..sssssssssssd..",
    "..ssssssSSSssd..",
    "...ssssssssssd..",
    "....sssssssdd...",
    ".....bbbbbb.....",
    ".....bBbbbb.....",
    "................",
    "................",
  ], { s: "#e8b48a", S: "#f6d2b0", d: "#b9805a", b: "#3f6fb5", B: "#7fa8e8" }),
  // Marksman: a drawn bow and arrow.
  dr_marksman: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 12.5, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if (r >= 6.4 && r <= 7.5 && dx < -3.2) g[y][x] = dy < 0 ? "#c99a5e" : "#a8743f";
    }
    rod(g, 8.6, 2.2, 8.6, 13.8, 0.4, "#e6e9ef");
    rod(g, 3.5, 8, 12.2, 8, 0.5, "#d8b07a");
    rod(g, 12.4, 8, 14.2, 8, 1.0, "#d0d6dc");
    rod(g, 2.2, 8, 3.8, 8, 1.0, "#d64545");
    return g;
  },
  // Tank: an army helmet.
  dr_tank: () => ascii([
    "................",
    "................",
    "................",
    "................",
    ".....hhhhhh.....",
    "....hHHhhhhh....",
    "...hHhhhhhhhh...",
    "...hHhhhhhhhh...",
    "..hHhhhhhhhhhd..",
    "..hhhhhhhhhhhd..",
    ".bbbbbbbbbbbbbb.",
    ".dddddddddddddd.",
    "................",
    "................",
    "................",
    "................",
  ], { h: "#6f7f4a", H: "#a3b47a", d: "#4a5632", b: "#5d6b3e" }),
  // Engineer: a spanner.
  dr_engineer: () => {
    const g = blank(16);
    rod(g, 4.2, 11.8, 11, 5, 1.15, (t, side) => (side < -0.2 ? "#dde3e8" : "#9aa3ad"));
    disk(g, 11.6, 4.4, 2.9, "#b6bcc4");
    disk(g, 13.2, 2.8, 1.6, null);
    disk(g, 3.4, 12.6, 2.1, "#b6bcc4");
    disk(g, 3.4, 12.6, 0.9, null);
    g[3][10] = "#eef2f5";
    return g;
  },
  // Spotter: a watchful eye.
  dr_spotter: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8;
      if (Math.abs(dy) < 4.6 * (1 - (dx / 7.3) ** 2)) g[y][x] = "#f4f4f4";
    }
    disk(g, 8, 8, 3, "#3f7fd6");
    disk(g, 8, 8, 1.4, "#14182a");
    g[6][6] = "#ffffff";
    return g;
  },
  // Rallier: a megaphone.
  dr_rallier: () => {
    const g = blank(16);
    for (let x = 4; x <= 13; x++) {
      const h = 1.3 + (x - 4) * 0.45;
      for (let y = 0; y < 16; y++) {
        const dy = y + 0.5 - 7.5;
        if (Math.abs(dy) <= h) g[y][x] = x >= 12 ? "#eef1f4" : dy < -h + 1.2 ? "#ff8a7a" : "#d64545";
      }
    }
    for (let y = 6; y <= 8; y++) for (const x of [2, 3]) g[y][x] = "#6b7380";
    for (let y = 9; y <= 12; y++) g[y][6] = "#4a4f5a";
    g[12][7] = "#4a4f5a";
    return g;
  },
  // Zombie types: Runner (speed lines), Brute (a green flexed arm), Spitter (a drop of acid), Boss (a crown).
  z_runner: () => ascii([
    "................",
    "................",
    "................",
    "......wwwwwwww..",
    "................",
    "...ggggggggggg..",
    "................",
    ".wwwwwwwwwwwww..",
    "................",
    "....gggggggggg..",
    "................",
    "......wwwwwwww..",
    "................",
    "................",
    "................",
    "................",
  ], { w: "#e6efe2", g: "#8ad13a" }),
  z_brute: () => ascii([
    "................",
    "................",
    "..ggg...........",
    ".gGGgg..........",
    ".gGggg..........",
    ".ggggd..........",
    "..ggd...........",
    "..ggd.....ggg...",
    "..ggd...gGGggg..",
    "..gggg.gGgggggd.",
    "..gGgggggggggd..",
    "...ggxgxgggggd..",
    "....ggggggggd...",
    "......dddddd....",
    "................",
    "................",
  ], { g: "#7fae4a", G: "#b8dc8a", d: "#4f7a2a", x: "#8a3a3a" }),
  z_spitter: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 10;
      const inDrop = Math.hypot(dx, dy) <= 4.2 || (y >= 2 && y <= 8 && Math.abs(dx) <= (y - 1.5) * 0.62);
      if (inDrop) g[y][x] = dx + dy < -2.5 ? "#d2f59a" : dx + dy > 3 ? "#4f8a1e" : "#8ad13a";
    }
    g[13][2] = "#8ad13a";
    g[12][13] = "#8ad13a";
    return g;
  },
  z_screamer: () => ascii([
    "................",
    "...GGGGGG.......",
    "..GggggggG......",
    ".Ggggggggggd....",
    ".Gxxggggxxgd..w.",
    ".Gxrggggxrgd.w..",
    ".ggggggggggd.w.w",
    ".gggmmmmgggd.w.w",
    ".ggmtmmtmggdw..w",
    ".ggmmmmmmggdw..w",
    ".ggmmmmmmggd.w.w",
    ".gggmmmmgggd.w.w",
    "..gggmmgggd..w..",
    "...gggggdd....w.",
    "....dddd........",
    "................",
  ], { g: "#a3b88e", G: "#cfe0b8", d: "#5e7a48", x: "#2a1a1a", r: "#ffffff", m: "#3a1010", t: "#e8e2c0", w: "#f4d35e" }),
  z_boss: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "..y....yy....y..",
    "..yy...yy...yy..",
    "..yyy.yyyy.yyy..",
    "..yyyyyyyyyyyy..",
    "..yYyyyyyyyyyy..",
    "..yyrryBByrryy..",
    "..yyrryBByrryy..",
    "..yyyyyyyyyyyy..",
    "..zzzzzzzzzzzz..",
    "................",
    "................",
    "................",
  ], { y: "#f2c14e", Y: "#fff0a8", z: "#b8862a", r: "#d64545", B: "#5f8fe0" }),
  // ---- tab and HUD icons ----
  menu: () => ascii([
    "............",
    "............",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "............",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "............",
    "..wwwwwwww..",
    "..wwwwwwww..",
    "............",
    "............",
  ], { w: "#dfe4ea" }),
  // ---- City Map places (16x16): every location and landmark has its own ----
  // The school itself: clock tower and flag.
  school: () => ascii([
    "................",
    ".......kff......",
    ".......k........",
    "......rrrr......",
    "......wccw......",
    "......wccw......",
    "..rrrrwwwwrrrr..",
    ".rrrrrrrrrrrrrr.",
    ".wwwwwwwwwwwwww.",
    ".wgwgwwddwwgwgw.",
    ".wwwwwwddwwwwww.",
    ".wgwgwwddwwgwgw.",
    ".wwwwwwddwwwwww.",
    ".ssssssssssssss.",
    "................",
    "................",
  ], { k: "#6b7380", f: "#d64545", r: "#c0583a", w: "#f0ece2", c: "#f4d35e", g: "#7fc8f0", d: "#7a4a2a", s: "#9aa3ad" }),
  corner_store: () => ascii([
    "................",
    "................",
    "................",
    ".rwrwrwrwrwrwrw.",
    ".rwrwrwrwrwrwrw.",
    "..rrrrrrrrrrrr..",
    "..bbbbbbbbbbbb..",
    "..bggggbbbddbb..",
    "..bgGggbbbddbb..",
    "..bggggbbbddbb..",
    "..bggggbbbdybb..",
    "..bbbbbbbbddbb..",
    ".ssssssssssssss.",
    "................",
    "................",
    "................",
  ], { r: "#d64545", w: "#f4f4f4", b: "#e3d6c0", g: "#7fc8f0", G: "#cfeaff", d: "#7a4a2a", y: "#e8c14a", s: "#9aa3ad" }),
  pharmacy: () => ascii([
    "................",
    "................",
    "......gGgd......",
    "......gGgd......",
    "......gGgd......",
    "......gGgd......",
    "..gGGGGGgggggd..",
    "..gGgggggggggd..",
    "..gggggggggggd..",
    "..ddddgggddddd..",
    "......gggd......",
    "......gggd......",
    "......gggd......",
    "......dddd......",
    "................",
    "................",
  ], { g: "#3fbf6a", G: "#9ff0b8", d: "#2a8a48" }),
  supermarket: () => ascii([
    "................",
    "................",
    "................",
    ".kk.............",
    "...k............",
    "...kccccccccccc.",
    "...kcwcwcwcwcwc.",
    "....cccccccccc..",
    "....cwcwcwcwcc..",
    ".....ccccccccc..",
    ".....k.......k..",
    ".....kkkkkkkkk..",
    "......oo....oo..",
    "......oo....oo..",
    "................",
    "................",
  ], { k: "#9aa3ad", c: "#3f7fd6", w: "#cfe0f5", o: "#2c2c34" }),
  hardware_store: () => {
    const g = blank(16);
    rod(g, 3.6, 12.8, 9.6, 6.8, 0.95, (t, side) => (side < 0 ? "#d9a86a" : "#8a5a3a"));
    rod(g, 7.4, 3.2, 12.8, 8.6, 1.7, (t, side) => (side < -0.4 ? "#eef1f4" : side > 0.6 ? "#7c8590" : "#b6bcc4"));
    return g;
  },
  hospital: () => ascii([
    "................",
    "................",
    ".....bbbbbb.....",
    ".....bwbbwb.....",
    ".....bwwwwb.....",
    ".....bwbbwb.....",
    ".....bbbbbb.....",
    "..wwwwwwwwwwww..",
    "..wgwgwwwwgwgw..",
    "..wwwwwwwwwwww..",
    "..wgwgwddwgwgw..",
    "..wwwwwddwwwww..",
    "..wwwwwddwwwww..",
    ".ssssssssssssss.",
    "................",
    "................",
  ], { b: "#3f7fd6", w: "#eef3f7", g: "#7fc8f0", d: "#5a6478", s: "#9aa3ad" }),
  police_station: () => ascii([
    "................",
    "................",
    "................",
    ".......rb.......",
    ".....wwwwww.....",
    "....wgggwggw....",
    "..kkkkkkkkkkkk..",
    ".kkkWWWWWWkkkkk.",
    ".kkkWWWWWWkkkkk.",
    ".kkkkkkkkkkkkkk.",
    "...oo......oo...",
    "...oo......oo...",
    "................",
    "................",
    "................",
    "................",
  ], { r: "#ff4a4a", b: "#4a8aff", w: "#eef3f7", g: "#7fc8f0", k: "#2c3e6b", W: "#eef3f7", o: "#1a1a22" }),
  mall: () => ascii([
    "................",
    "................",
    "......kkkk......",
    ".....k....k.....",
    ".....k....k.....",
    "...pppppppppp...",
    "...pPpppppppq...",
    "...pPpppppppq...",
    "...pPpppppppq...",
    "...pPpppppppq...",
    "...pPpppppppq...",
    "...pPpppppppq...",
    "...pppppppppq...",
    "...qqqqqqqqqq...",
    "................",
    "................",
  ], { k: "#7a5a8a", p: "#c04aa0", P: "#e88ad0", q: "#8a2a70" }),
  neighborhood: () => ascii([
    "................",
    "................",
    ".......rr.......",
    "......rrrr......",
    ".....rrRrrr.....",
    "....rrRrrrrr....",
    "...rrrrrrrrrr...",
    "..rrrrrrrrrrrr..",
    "...bbbbbbbbbb...",
    "...bggbbbbggb...",
    "...bggbddbggb...",
    "...bbbbddbbbb...",
    "...bbbbddbbbb...",
    ".ssssssssssssss.",
    "................",
    "................",
  ], { r: "#c0583a", R: "#e88a62", b: "#e8d8b0", g: "#7fc8f0", d: "#7a4a2a", s: "#6aa84f" }),
  farmstead: () => ascii([
    "................",
    "................",
    "......rrrr......",
    "....rrrrrrrr....",
    "...rRrrrrrrrr...",
    "..rRrrrrrrrrrr..",
    "..rrrrrwwrrrrr..",
    "..rrrrrwwrrrrr..",
    "..rrwwwwwwwwrr..",
    "..rrwddddddwrr..",
    "..rrwdwddwdwrr..",
    "..rrwddwwddwrr..",
    "..rrwdwddwdwrr..",
    "..rrwwwwwwwwrr..",
    "................",
    "................",
  ], { r: "#c0392b", R: "#e8705e", w: "#f4f4f4", d: "#7a2a20" }),
  gas_station: () => ascii([
    "................",
    "................",
    "...rrrrrr.......",
    "...rwwwwr..kk...",
    "...rwkkwr..k....",
    "...rwwwwr...k...",
    "...rrrrrr...k...",
    "...rRrrrr...k...",
    "...rRrrrrkkkk...",
    "...rRrrrr.......",
    "...rRrrrr.......",
    "...rrrrrr.......",
    "..ssssssss......",
    "................",
    "................",
    "................",
  ], { r: "#d64545", R: "#f07a6a", w: "#eef3f7", k: "#2c2c34", s: "#6b7380" }),
  garden_center: () => {
    const g = blank(16);
    rod(g, 8, 9.5, 8, 14.6, 0.6, "#4f8a2a");
    rod(g, 8, 12.6, 11.2, 11, 0.95, "#6aa84f");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 6.5, r = Math.hypot(dx, dy);
      if (r <= 4.9) g[y][x] = r <= 2.2 ? (dx + dy < -1 ? "#a87a4a" : "#6b4a2a") : dx + dy < -3 ? "#fff0a8" : "#f2c14e";
    }
    return g;
  },
  fire_station: () => ascii([
    "................",
    "................",
    "......rrrr......",
    ".....rRrrrr.....",
    ".....kkkkkk.....",
    "......rRrr......",
    "....kkrRrrkk....",
    "....kkrRrrkk....",
    "......rRrr......",
    "......rRrr......",
    "......rRrr......",
    ".....kkkkkk.....",
    "....kkkkkkkk....",
    "................",
    "................",
    "................",
  ], { r: "#d64545", R: "#f08a7a", k: "#b6bcc4" }),
  church: () => ascii([
    "................",
    ".......w........",
    "......www.......",
    ".......w........",
    "......rrr.......",
    ".....rrrrr......",
    ".....bbbbb......",
    ".....bbdbb......",
    "..rrrbbbbbrrr...",
    ".rrrrbbbbbrrrr..",
    ".bbbbbbbbbbbbb..",
    ".bbgbbdddbbgbb..",
    ".bbbbbdddbbbbb..",
    ".ssssssssssssss.",
    "................",
    "................",
  ], { w: "#f4f4f4", r: "#5a6478", b: "#e3d6c0", d: "#7a4a2a", g: "#7fc8f0", s: "#6aa84f" }),
  marina: () => ascii([
    "................",
    "......bbbb......",
    ".....b....b.....",
    "......bbbb......",
    ".......bb.......",
    "....bbbbbbbb....",
    ".......bb.......",
    ".......bb.......",
    ".......bb.......",
    ".......bb.......",
    ".b.....bb.....b.",
    ".bb....bb....bb.",
    "..bbb..bb..bbb..",
    "...bbbbbbbbbb...",
    ".....bbbbbb.....",
    "................",
  ], { b: "#7f9cc0" }),
  warehouse: () => ascii([
    "................",
    "................",
    "................",
    "..gggggggggggg..",
    ".gggggggggggggg.",
    ".bbbbbbbbbbbbbb.",
    ".bbllllllllllbb.",
    ".bbLLLLLLLLLLbb.",
    ".bbllllllllllbb.",
    ".bbLLLLLLLLLLbb.",
    ".bbllllllllllbb.",
    ".bbLLLLLLLLLLbb.",
    ".bbbbbbbbbbbbbb.",
    "................",
    "................",
    "................",
  ], { g: "#5a6478", b: "#9a8a6a", l: "#b6bcc4", L: "#8a93a0" }),
  library: () => ascii([
    "................",
    "................",
    ".....rrrrrrrr...",
    ".....rwwwwwwr...",
    ".....rrrrrrrr...",
    "...bbbbbbbbbb...",
    "...bwwwwwwwwb...",
    "...bbbbbbbbbb...",
    "....gggggggggg..",
    "....gwwwwwwwwg..",
    "....gggggggggg..",
    "..yyyyyyyyyyy...",
    "..ywwwwwwwwwy...",
    "..yyyyyyyyyyy...",
    "................",
    "................",
  ], { r: "#d64545", b: "#3f7fd6", g: "#4caf7d", y: "#e8c14a", w: "#f4f1e6" }),
  petting_zoo: () => ascii([
    "................",
    "..h..........h..",
    "..hh........hh..",
    "...hh......hh...",
    "....wwwwwwww....",
    "..eewwwwwwwwee..",
    "...ewkwwwwkwe...",
    ".....wwwwww.....",
    ".....wwwwww.....",
    "......wppw......",
    "......wwww......",
    ".......bb.......",
    ".......bb.......",
    "................",
    "................",
    "................",
  ], { h: "#8a7a6a", w: "#f0ece2", e: "#d9cfc0", k: "#3a2a1a", p: "#e8a0a0", b: "#d9cfc0" }),
  army_surplus: () => ascii([
    "................",
    ".....rrwwbb.....",
    ".....rrwwbb.....",
    ".....rrwwbb.....",
    ".....rrwwbb.....",
    "......rwwb......",
    ".......yy.......",
    "......yyyy......",
    ".....yYyyyy.....",
    ".....yYyzyy.....",
    ".....yyzzzy.....",
    ".....yyyzyz.....",
    "......yyyz......",
    "................",
    "................",
    "................",
  ], { r: "#d64545", w: "#f4f4f4", b: "#3f6fb5", y: "#e8c14a", Y: "#fff0a8", z: "#b8862a" }),
  // The new places: an Urgent Care clinic (its ambulance) and an Electronics Store (a monitor).
  urgent_care: () => ascii([
    "................",
    "................",
    "................",
    "........rb......",
    "..wwwwwwwwww....",
    "..wwwwwwwgggw...",
    "..wwrwwwwgggww..",
    "..wrrrwwwwwwwww.",
    "..wwrwwwwwwwwww.",
    "..rrrrrrrrrrrrr.",
    "..wwwwwwwwwwwww.",
    "...oo......oo...",
    "...oo......oo...",
    "................",
    "................",
    "................",
  ], { w: "#f4f6f8", r: "#d64545", b: "#4a8aff", g: "#7fc8f0", o: "#1a1a22" }),
  electronics_store: () => ascii([
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    "..kbbbbbbbbbbk..",
    "..kbBBbbbbbbbk..",
    "..kbBbbbpbbbbk..",
    "..kbbbbppbbbbk..",
    "..kbbbbbbbbbbk..",
    "..kbbbbbbbbbbk..",
    "..kkkkkkkkkkkk..",
    "......kkkk......",
    ".......kk.......",
    ".....ssssss.....",
    "................",
    "................",
    "................",
  ], { k: "#2c2c34", b: "#3f8fd0", B: "#bfe3f5", p: "#e0e8ff", s: "#6b7380" }),
  // The raids: the City Mall and General Hospital reuse their place icons (mall, hospital); the
  // Military Base is an army tent under a star flag, the Research Institute a DNA helix.
  military_base: () => ascii([
    "................",
    "...k............",
    "...kyyyy........",
    "...kyYyy........",
    "...kyyyy........",
    "...k............",
    "...k...gg.......",
    "...k..gGgg......",
    "...k.gGgggg.....",
    "...kgGgggggg....",
    "...gGggddgggg...",
    "..gGgggddggggg..",
    ".gggggddddggggg.",
    "dddddddddddddddd",
    "................",
    "................",
  ], { k: "#6b7380", y: "#e8c14a", Y: "#fff0a8", g: "#6f7f4a", G: "#93a86a", d: "#3a4a28" }),
  institute: () => {
    const g = blank(16);
    for (let y = 1; y <= 14; y++) {
      const s = Math.sin((y - 1) * 0.55);
      const a = Math.round(7.5 + 3.4 * s), b = Math.round(7.5 - 3.4 * s);
      if (y % 2 === 0) for (let x = Math.min(a, b) + 1; x < Math.max(a, b); x++) g[y][x] = "#9aa3ad";
      g[y][a] = "#5f8fe0";
      g[y][b] = "#e0605a";
    }
    return g;
  },
  // ---- on the City Map: a zombie nest, the supply drops, the horde, and a raid boss ----
  nest: () => ascii([
    "................",
    "................",
    ".....g.g.g......",
    ".....g.g.g......",
    ".....g.g.g......",
    ".....gggggg.....",
    ".....gGgggg.gg..",
    ".....gGgggggg...",
    ".....gggggg.....",
    "......gggg......",
    "......gggg......",
    "...dddddddddd...",
    "..dDdddddddddd..",
    ".dddddddddddddd.",
    "................",
    "................",
  ], { g: "#7fae4a", G: "#b8dc8a", d: "#6b4a2a", D: "#8a6a4a" }),
  crate: () => ascii([
    "................",
    "................",
    "................",
    "..qqqqqqqqqqqq..",
    "..qqwwwwwwwwqq..",
    "..qwqwwwwwwqwq..",
    "..qwwqwwwwqwwq..",
    "..qwwwqwwqwwwq..",
    "..qwwwwqqwwwwq..",
    "..qwwwqwwqwwwq..",
    "..qwwqwwwwqwwq..",
    "..qwqwwwwwwqwq..",
    "..qqwwwwwwwwqq..",
    "..qqqqqqqqqqqq..",
    "................",
    "................",
  ], { w: "#c99a5e", q: "#7a5230" }),
  wreck: () => ascii([
    "................",
    "................",
    "................",
    "................",
    ".....rrrrrr.....",
    "....rgggrkkr....",
    "..rrrrrrrrrrrr..",
    ".rrRrrrrrrrrrrr.",
    ".rrrrrrrxrrrrrr.",
    ".rrrxrrrrrrrrrr.",
    "...oo......oo...",
    "...oo......oo...",
    "................",
    "................",
    "................",
    "................",
  ], { r: "#a8643a", R: "#d08a5a", g: "#7fc8f0", k: "#2c2c34", x: "#6b3a1a", o: "#1a1a22" }),
  survivor: () => ascii([
    "................",
    "................",
    "......hhhh..ss..",
    "......ssss..ss..",
    "......ssss.cc...",
    ".....cccccccc...",
    "....cccccc......",
    "....cccccc......",
    "....s.cccc......",
    "......cccc......",
    "......bbbb......",
    "......b..b......",
    "......b..b......",
    ".....kk..kk.....",
    "................",
    "................",
  ], { h: "#6b4a3a", s: "#f2c9a0", c: "#e0a536", b: "#3f6fb5", k: "#2c2c34" }),
  horde: () => ascii([
    "................",
    "................",
    ".........g.g.g..",
    ".........ggggg..",
    "........gGgggg..",
    "........gggggg..",
    "..g.g.g..gggg...",
    "..ggggg..gggg...",
    ".gGggggg..gg....",
    ".gggggg.........",
    "..gggg..........",
    "..gggg..........",
    "...gg...........",
    "................",
    "................",
    "................",
  ], { g: "#8ad13a", G: "#c8f09a" }),
  skull: () => ascii([
    "................",
    "................",
    ".....wwwwww.....",
    "....wwwwwwww....",
    "...wWwwwwwwww...",
    "...wwwwwwwwww...",
    "...wkkwwwwkkw...",
    "...wkkwwwwkkw...",
    "...wwwwkkwwww...",
    "....wwwwwwww....",
    "....wwkwwkww....",
    ".....wwwwww.....",
    "................",
    "................",
    "................",
    "................",
  ], { w: "#eee8d8", W: "#ffffff", k: "#2c2430" }),
  // ---- the pantry, the Farm and the Scrapyard (16x16) ----
  potatoes: () => {
    const g = blank(16);
    for (const [cx, cy, rx, ry] of [[6, 7.5, 4.3, 3.3], [10.4, 10.6, 3.7, 2.9]]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) g[y][x] = dx + dy < -0.7 ? "#e8bc84" : dx + dy > 0.8 ? "#8a5a30" : "#c9935a";
      }
    }
    for (const [x, y] of [[5, 7], [7, 9], [10, 10], [12, 11]]) g[y][x] = "#6b4220";
    return g;
  },
  tomatoes: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 9.2, r = Math.hypot(dx, dy * 1.1);
      if (r <= 5.4) g[y][x] = dx + dy < -3.5 ? "#ff9a8a" : dx + dy > 3.5 ? "#a82a2a" : "#e04040";
    }
    for (const [x, y] of [[7, 3], [8, 3], [6, 4], [7, 4], [8, 4], [9, 4], [5, 5], [10, 5], [8, 2]]) g[y][x] = "#4caf50";
    return g;
  },
  flour: () => ascii([
    "................",
    "................",
    "......w..w......",
    ".....wwwwww.....",
    "......kkkk......",
    ".....wwwwww.....",
    "....wWwwwwww....",
    "...wWwwwwwwws...",
    "...wWwwyywwws...",
    "...wwwyYyywws...",
    "...wwwwyywwws...",
    "...wwwwwwwwws...",
    "....wwwwwwws....",
    ".....sssssss....",
    "................",
    "................",
  ], { w: "#efe6d2", W: "#ffffff", s: "#c9b994", k: "#a8753f", y: "#e8c14a", Y: "#f7e08a" }),
  eggs: () => {
    const g = blank(16);
    for (const [cx, cy] of [[6, 8.5], [10.5, 9.5]]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - cx) / 3.1, dy = (y + 0.5 - cy) / 4.1;
        if (dx * dx + dy * dy <= 1) g[y][x] = dx + dy < -0.6 ? "#ffffff" : dx + dy > 0.7 ? "#d9c9a8" : "#f4ead6";
      }
    }
    return g;
  },
  milk: () => ascii([
    "................",
    "......bbbb......",
    "......bBbb......",
    "......wwww......",
    "......wWww......",
    ".....wWwwwg.....",
    "....wWwwwwwg....",
    "....wWwwwwwg....",
    "....wbbbbbbg....",
    "....wbBbbbbg....",
    "....wbbbbbbg....",
    "....wWwwwwwg....",
    "....wwwwwwwg....",
    ".....gggggg.....",
    "................",
    "................",
  ], { b: "#3f7fd6", B: "#7fb0f0", w: "#f4f6f8", W: "#ffffff", g: "#c9d2dc" }),
  mutton: () => {
    const g = blank(16);
    rod(g, 3.2, 12.8, 7, 9, 0.9, "#f0ece2");
    disk(g, 2.6, 12.2, 1.1, "#f0ece2");
    disk(g, 3.8, 13.4, 1.1, "#f0ece2");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 9.6, dy = y + 0.5 - 6.4, r = Math.hypot(dx, dy);
      if (r <= 4.6) g[y][x] = r > 3.6 ? "#8a3a2a" : dx + dy < -2 ? "#f08a7a" : "#c8584a";
    }
    return g;
  },
  canned_meat: () => ascii([
    "................",
    "................",
    "................",
    "...........kk...",
    "..........k..k..",
    "..bbbbbbbbbbbb..",
    "..bBBBBBBBBBBb..",
    "..byyyyyyyyyyb..",
    "..byppppppppyb..",
    "..bypPppppppyb..",
    "..byyyyyyyyyyb..",
    "..bbbbbbbbbbbb..",
    "..dddddddddddd..",
    "................",
    "................",
    "................",
  ], { k: "#b6bcc4", b: "#3f6fb5", B: "#7fa8e8", d: "#2a4a80", y: "#f2c14e", p: "#e8909a", P: "#ffc0c8" }),
  spices: () => {
    const g = blank(16);
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, x = 4 + t * 8, y = 4.5 + Math.sin(t * Math.PI) * 6 + t * 2;
      disk(g, x, y, 2.1 - t * 1.3, t < 0.5 ? "#e03a2a" : "#c02a20");
    }
    for (const [x, y] of [[4, 5], [5, 4]]) g[y][x] = "#ff8a7a";
    rod(g, 4, 4.6, 2.4, 2.2, 0.6, "#4caf50");
    return g;
  },
  coffee: () => ascii([
    "................",
    "......w..w......",
    ".......w..w.....",
    "......w..w......",
    "................",
    "...mmmmmmmmm....",
    "...mccccccccm...",
    "...mMmmmmmmmmmm.",
    "...mMmmmmmmmm.m.",
    "...mMmmmmmmmm.m.",
    "...mMmmmmmmmmmm.",
    "...mmmmmmmmmm...",
    "....mmmmmmmm....",
    "..ssssssssssss..",
    "................",
    "................",
  ], { w: "#c9ced4", m: "#e9edf0", M: "#ffffff", c: "#6b4220", s: "#9aa3ad" }),
  wheat: () => ascii([
    "................",
    ".......y........",
    "......yYy.......",
    "..y...yyy...y...",
    ".yYy..yYy..yYy..",
    ".yyy..yyy..yyy..",
    ".yYy..yYy..yYy..",
    "..yy..yyy..yy...",
    "...g...g...g....",
    "...g...g...g....",
    "....g..g..g.....",
    ".....g.g.g......",
    "......ggg.......",
    ".....rrrrr......",
    "......ggg.......",
    "................",
  ], { y: "#e8c14a", Y: "#f7e08a", g: "#b8a24a", r: "#c0583a" }),
  chicken: () => ascii([
    "................",
    "................",
    "....rr..........",
    "...wwww.........",
    "..owkww.........",
    "...wwww.........",
    "....wwwwwwww.ww.",
    "....wwwwwwwwwww.",
    "....wWWWWwwwwww.",
    "....wwWWwwwwww..",
    ".....wwwwwwww...",
    ".......y..y.....",
    "......yy.yy.....",
    "................",
    "................",
    "................",
  ], { r: "#e04040", w: "#f4f4f4", W: "#d9dde2", k: "#2c2c34", o: "#f2a03a", y: "#e8a03a" }),
  cow: () => ascii([
    "................",
    "................",
    "..h..........h..",
    "..hh........hh..",
    ".ee.wwwwwwww.ee.",
    ".eeewkkwwwwweee.",
    "....wkkwwkkw....",
    "....wwkwwwww....",
    "....wwwwwwww....",
    "....pppppppp....",
    "....pPpkkppp....",
    "....pppppppp....",
    ".....pppppp.....",
    "................",
    "................",
    "................",
  ], { h: "#d9cfc0", e: "#f0ece2", w: "#f4f4f4", k: "#2c2c34", p: "#f0a8b0", P: "#ffd0d6" }),
  // A fluffy sheep with a black face, facing left.
  sheep: () => {
    const g = blank(16);
    for (const x of [6, 7, 11, 12]) for (const y of [11, 12, 13]) g[y][x] = "#3a3436";
    for (const [cx, cy] of [[7, 6.5], [10.5, 6.2], [12.6, 8.6], [10, 9.8], [6.8, 9.6]]) disk(g, cx, cy, 2.7, "#f4f1e6");
    for (const [x, y] of [[6, 4], [7, 4], [10, 4], [5, 5]]) g[y][x] = "#ffffff";
    for (let y = 5; y <= 9; y++) for (let x = 1; x <= 4; x++) if (!(y === 9 && x === 1)) g[y][x] = "#3a3436";
    g[5][4] = "#3a3436";
    g[4][3] = "#3a3436";
    g[6][2] = "#f4f1e6";
    return g;
  },
  // The Farm tab: a green tractor — cab, hood, big back wheel, small front one.
  tractor: () => {
    const g = blank(16);
    for (let y = 2; y <= 5; y++) for (let x = 3; x <= 7; x++) g[y][x] = x === 3 || x === 7 || y === 2 ? "#3a3f48" : "#bfe3f5";
    for (let y = 2; y <= 5; y++) g[y][11] = "#3a3f48";
    for (let y = 6; y <= 9; y++) for (let x = 2; x <= 13; x++) g[y][x] = y === 6 ? "#8ad48a" : y === 9 ? "#2e8a3a" : "#4caf50";
    disk(g, 4.5, 10.5, 3.6, "#2c2c34");
    disk(g, 4.5, 10.5, 1.5, "#9aa3ad");
    disk(g, 11.8, 11.8, 2.3, "#2c2c34");
    g[11][11] = "#9aa3ad";
    g[12][12] = "#9aa3ad";
    return g;
  },
  // Dishes.
  shepherds_stew: () => ascii([
    "................",
    "................",
    "....w...w.......",
    ".....w...w......",
    "....w...w.......",
    "................",
    "..ssssssssssss..",
    "..sOsbbobbsbbs..",
    "..bbbbbbbbbbbb..",
    "..wWwwwwwwwwwd..",
    "...wWwwwwwwwd...",
    "....wwwwwwwd....",
    ".....dddddd.....",
    "................",
    "................",
    "................",
  ], { s: "#a0603a", b: "#7a4a2a", O: "#f08a24", o: "#6aa84f", w: "#e9edf0", W: "#ffffff", d: "#9aa3ad" }),
  fresh_bread: () => ascii([
    "................",
    "................",
    "................",
    "................",
    ".....yyyyyy.....",
    "...yyYyyYyyyy...",
    "..yyYyyYyyYyyy..",
    ".yyyyyyyyyyyyyy.",
    ".yyYyyyYyyyYyyb.",
    ".yyyyyyyyyyyyyb.",
    ".bbbbbbbbbbbbbb.",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { y: "#e8b04a", Y: "#f6d58a", b: "#b77b34" }),
  firehouse_chili: () => ascii([
    "................",
    "................",
    "......F.........",
    ".....FfF..F.....",
    "......f..FfF....",
    "................",
    "...rrrrrrrrrr...",
    ".kkRrrrRrrrrrkk.",
    ".kkkkkkkkkkkkkk.",
    "..kKkkkkkkkkkk..",
    "..kKkkkkkkkkkk..",
    "..kkkkkkkkkkkk..",
    "...kkkkkkkkkk...",
    "................",
    "................",
    "................",
  ], { F: "#f08a24", f: "#ffd06a", r: "#c0392b", R: "#e8705e", k: "#3a3f48", K: "#6b7380" }),
  scholars_breakfast: () => {
    const g = blank(16);
    rod(g, 11.5, 11.5, 15, 15, 0.9, "#5a3b24");
    disk(g, 7.5, 7.5, 6.1, "#3a3f48");
    disk(g, 7.5, 7.5, 5, "#5b616d");
    disk(g, 7, 7.2, 3.2, "#ffffff");
    disk(g, 7.4, 7.4, 1.4, "#f2c14e");
    g[6][6] = "#fff0a8";
    for (const [x, y] of [[9, 10], [10, 10], [11, 9], [10, 11]]) g[y][x] = "#c0583a";
    return g;
  },
  // Tech tree.
  whetstones: () => {
    const g = blank(16);
    rod(g, 2.5, 12, 13.5, 8, 1.8, (t, side) => (side < -0.6 ? "#b6bcc4" : side > 0.8 ? "#5b616d" : "#8a93a0"));
    for (const [x, y, c] of [[9, 3, "#fff0a8"], [11, 2, "#ffd06a"], [12, 4, "#fff0a8"], [10, 5, "#ffd06a"], [7, 4, "#ffd06a"]]) g[y][x] = c;
    return g;
  },
  archery_club: () => ascii([
    "................",
    "......f.f.f.....",
    ".....fFfFfFf....",
    "......s.s.s.....",
    "......s.s.s.....",
    ".....qqqqqqq....",
    ".....qQqqqqq....",
    ".....qQqqqqq....",
    ".....qQqqqqq....",
    ".....qqqqqqq....",
    ".....qQqqqqq....",
    ".....qQqqqqq....",
    ".....qqqqqqq....",
    "......qqqqq.....",
    "................",
    "................",
  ], { f: "#d64545", F: "#ff8a7a", s: "#d8b07a", q: "#8a5a3a", Q: "#c99a5e" }),
  fortified_works: () => ascii([
    "................",
    "................",
    "................",
    ".bbbbbb.bbbbbbb.",
    ".bBbbbb.bBbbbbb.",
    "................",
    ".bbb.bbbbbb.bbb.",
    ".bBb.bBbbbb.bBb.",
    "................",
    ".bbbbbb.bbbbbbb.",
    ".bBbbbb.bBbbbbb.",
    "................",
    ".bbb.bbbbbb.bbb.",
    ".bBb.bBbbbb.bBb.",
    "................",
    "................",
  ], { b: "#b8583a", B: "#e08a62" }),
  field_medics: () => ascii([
    "................",
    "................",
    "................",
    ".....wwwwww.....",
    "....wWwwwwww....",
    "...wWwwrrwwww...",
    "...wWwrrrrwww...",
    "..wWwwwrrwwwww..",
    "..wwwwwwwwwwwd..",
    "..wwwwwwwwwwwd..",
    ".ssssssssssssss.",
    ".dddddddddddddd.",
    "................",
    "................",
    "................",
    "................",
  ], { w: "#f4f4f4", W: "#ffffff", r: "#d64545", d: "#b9c3cc", s: "#d9dde2" }),
  last_stand: () => ascii([
    "................",
    "..k.............",
    "..krrrrrrrr.....",
    "..kRrrrrrrrr....",
    "..kRrrrrrrr.r...",
    "..krrrrrrrrr....",
    "..krrrrr.rr.....",
    "..k.............",
    "..k.............",
    "..k.............",
    "..k.............",
    "..k.............",
    ".kkk............",
    "kkkkk...........",
    "................",
    "................",
  ], { k: "#8a5a3a", r: "#d64545", R: "#ff8a7a" }),
  scouts_eye: () => {
    const g = blank(16);
    rod(g, 2.5, 13.5, 6.5, 9.5, 1.3, "#8a5a3a");
    rod(g, 6.2, 9.8, 10.5, 5.5, 1.7, (t, side) => (side < -0.5 ? "#f2d07a" : "#c9a24a"));
    rod(g, 10.2, 5.8, 13.4, 2.6, 2.1, (t, side) => (side < -0.6 ? "#f2d07a" : "#b8862a"));
    disk(g, 13.6, 2.4, 1.1, "#7fc8f0");
    return g;
  },
  deep_pockets: () => ascii([
    "................",
    "......kkkk......",
    ".....k....k.....",
    "...gggggggggg...",
    "..gGgggggggggg..",
    "..gGgggggggggg..",
    "..gGkkkkkkkkgg..",
    "..gGgggggggggg..",
    "..gGgPPPPPPggg..",
    "..gGgPppppPggg..",
    "..gGgPppppPggg..",
    "..gggPPPPPPggg..",
    "..gggggggggggg..",
    "...dddddddddd...",
    "................",
    "................",
  ], { k: "#5a3b24", g: "#6b7f4a", G: "#93a86a", P: "#556a3a", p: "#7a8f5a", d: "#4a5632" }),
  treasure_hunters: () => ascii([
    "................",
    "................",
    "................",
    "...bbbbbbbbbb...",
    "..bBbbbbbbbbbb..",
    "..bbbbbbbbbbbb..",
    "..yyyyyyyyyyyy..",
    "..bbbbbyybbbbb..",
    "..bbbbbykbbbbb..",
    "..bBbbbbbbbbbb..",
    "..bBbbbbbbbbbb..",
    "..bbbbbbbbbbbb..",
    "..yyyyyyyyyyyy..",
    "................",
    "................",
    "................",
  ], { b: "#8a5a3a", B: "#b8834a", y: "#e8c14a", k: "#2c2c34" }),
  word_of_mouth: () => ascii([
    "................",
    "................",
    "...wwwwwwwwww...",
    "..wWwwwwwwwwww..",
    "..wwwwwwwwwwww..",
    "..wwkkwkkwkkww..",
    "..wwkkwkkwkkww..",
    "..wwwwwwwwwwww..",
    "..wwwwwwwwwwwd..",
    "...wwwwwwwwwd...",
    "....wwd.........",
    "....wd..........",
    "....d...........",
    "................",
    "................",
    "................",
  ], { w: "#f4f4f4", W: "#ffffff", k: "#5a6478", d: "#c9d2dc" }),
  ghost_walkers: () => ascii([
    "................",
    "......wwww......",
    ".....wWwwww.....",
    "....wWwwwwww....",
    "....wwwwwwww....",
    "....wkkwwkkw....",
    "....wkkwwkkw....",
    "....wwwwwwww....",
    "....wwwkkwww....",
    "....wwwwwwww....",
    "....wwwwwwww....",
    "....wwwwwwww....",
    "....w.ww.ww.....",
    "................",
    "................",
    "................",
  ], { w: "#dfe8f2", W: "#ffffff", k: "#3a3f58" }),
  study_groups: () => {
    const g = ascii([
      "................",
      "................",
      "..bbbbbbbbbb....",
      "..bwwwwwwwwb....",
      "..bwkkkkkkwb....",
      "..bwwwwwwwwb....",
      "..bwkkkkwwwb....",
      "..bwwwwwwwwb....",
      "..bwkkkkkkwb....",
      "..bwwwwwwwwb....",
      "..bwkkkwwwwb....",
      "..bwwwwwwwwb....",
      "..bbbbbbbbbb....",
      "................",
      "................",
      "................",
    ], { b: "#3f6fb5", w: "#f4f1e6", k: "#8a93a8" });
    rod(g, 9.5, 12.5, 13.6, 4.4, 0.8, "#f2c14e");
    g[13][9] = "#3a2a1a";
    g[3][13] = "#f08a9a";
    return g;
  },
  power_naps: () => ascii([
    "..........zzz...",
    "............z...",
    "...........z....",
    "..........zzz...",
    "......zz........",
    ".......z........",
    "......zz........",
    "................",
    "..wwwwwwwwwwww..",
    ".wWWwwwwwwwwwww.",
    ".wWwwwwwwwwwwwd.",
    ".wwwwwwwwwwwwwd.",
    "..wwwwwwwwwwdd..",
    "................",
    "................",
    "................",
  ], { z: "#9cc2ff", w: "#e9edf0", W: "#ffffff", d: "#b9c3cc" }),
  school_spirit: () => ascii([
    "................",
    "..k.............",
    "..kbbb..........",
    "..kbBbbbb.......",
    "..kbbbbbbbbb....",
    "..kbbwwbbbbbbbb.",
    "..kbbbbbbbbb....",
    "..kbbbbbb.......",
    "..kbbb..........",
    "..k.............",
    "..k.............",
    "..k.............",
    "..k.............",
    "..k.............",
    "................",
    "................",
  ], { k: "#8a5a3a", b: "#d64545", B: "#ff8a7a", w: "#f4f4f4" }),
  home_economics: () => ascii([
    "................",
    "................",
    "....ww.ww.ww....",
    "...wwwwwwwwww...",
    "..wWwwwwwwwwww..",
    "..wWwwwwwwwwwd..",
    "...wwwwwwwwwd...",
    "....wwwwwwww....",
    "....wwwwwwww....",
    "....wwwwwwww....",
    "....ssssssss....",
    "....wwwwwwww....",
    "................",
    "................",
    "................",
    "................",
  ], { w: "#f4f4f4", W: "#ffffff", d: "#c9d2dc", s: "#d9dde2" }),
  honor_roll: () => {
    const g = blank(16);
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.9 : 6.6;
      pts.push([8 + Math.cos(a) * r, 8.6 + Math.sin(a) * r]);
    }
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      if (inside(x + 0.5, y + 0.5)) g[y][x] = x + y < 14 ? "#fff0a8" : x + y > 18 ? "#c99a2e" : "#f2c14e";
    }
    return g;
  },
  // Scrapyard jobs.
  yard_cars: () => ascii([
    "................",
    "................",
    "................",
    "....bbbbbb......",
    "..bbggbbgbbbb...",
    ".bbbbbbbbbbbbb..",
    ".bBbbbbbbbbbbb..",
    "..rrrrrrr.......",
    ".rrggrrrggrrrrr.",
    ".rrrrrrrrrrrrrr.",
    ".rRrrrrxrrrrrrr.",
    ".rrrrrrrrrrrrrr.",
    "..oo.......oo...",
    "................",
    "................",
    "................",
  ], { b: "#5a7fa8", B: "#8aaad0", g: "#2c3440", r: "#a8643a", R: "#d08a5a", x: "#6b3a1a", o: "#1a1a22" }),
  yard_appliances: () => ascii([
    "................",
    "...wwwwwwwwww...",
    "...wWwwwwkkkw...",
    "...wwwwwwwwww...",
    "...ssssssssss...",
    "...wwwwwwwwww...",
    "...wwwggggwww...",
    "...wwgGggggww...",
    "...wwggggggww...",
    "...wwggggggww...",
    "...wwwggggwww...",
    "...wwwwwwwwww...",
    "...wwwwwwwwwd...",
    "...dddddddddd...",
    "................",
    "................",
  ], { w: "#e9edf0", W: "#ffffff", d: "#b9c3cc", s: "#c9d2dc", k: "#5a6478", g: "#5f8fb0", G: "#bfe3f5" }),
  yard_machinery: () => {
    const g = ascii([
    "................",
    "................",
    "....kk....kk....",
    "....kk....kk....",
    "..ssssssssssss..",
    "..sSssssssssss..",
    "..ssddssddssss..",
    "..ssddssddsssk..",
    "..ssssssssssskk.",
    "..sSssssssssss..",
    "..ssssssssssss..",
    "...dddddddddd...",
    "....kk....kk....",
    "................",
    "................",
    "................",
    ], { s: "#8a93a0", S: "#c9ced4", d: "#4a4f5a", k: "#3a3f48" });
    disk(g, 2.6, 8.6, 2.3, "#3a3f48");
    disk(g, 2.6, 8.6, 0.9, "#c9ced4");
    return g;
  },
  yard_weapons: () => ascii([
    "................",
    "................",
    "................",
    "................",
    ".kkkkkkkkkkkkk..",
    "kKKKKKKKKkkkkkk.",
    ".kkkkkkkkkkkkk..",
    "....kkkkkkkk....",
    ".....kkkkkk.....",
    ".....kkkkkk.....",
    "....kkkkkkkk....",
    "...kkkkkkkkkk...",
    "...dddddddddd...",
    "................",
    "................",
    "................",
  ], { k: "#5b616d", K: "#a9b1ba", d: "#3a3f48" }),
  yard_armor: () => ascii([
    "................",
    "................",
    "...ss......ss...",
    "..sSs......sss..",
    "..sSsssssssss...",
    "..sSssssssssss..",
    "...sSsssssssss..",
    "...sSssrrsssss..",
    "...sSssrrssss...",
    "...sssssssssss..",
    "....sssssssss...",
    "....sssssssss...",
    ".....sssssss....",
    "................",
    "................",
    "................",
  ], { s: "#8a93a0", S: "#d0d6dc", r: "#c9a24a" }),
  yard_traps: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = (y + 0.5 - 9) * 1.5, r = Math.hypot(dx, dy);
      if (r >= 5.4 && r <= 6.6) g[y][x] = dy < 0 ? "#c9ced4" : "#8a93a0";
    }
    for (const x of [3, 5, 7, 9, 11, 13]) { g[8][x] = "#e6eaee"; g[10][x - 1] = "#8a93a0"; }
    for (let x = 5; x <= 10; x++) g[9][x] = "#6b7380";
    g[9][7] = "#c9a24a";
    g[9][8] = "#c9a24a";
    return g;
  },
  // ---- items (16x16): every weapon, armour and accessory; legendaries are their base item in gold ----
  // Melee weapons.
  it_bat: () => {
    const g = blank(16);
    rod(g, 2.6, 13.4, 5.6, 10.4, 0.75, "#3a3f48");
    rod(g, 5.2, 10.8, 12.6, 3.4, 1.55, WOOD);
    disk(g, 2.3, 13.7, 1.0, "#3a3f48");
    return g;
  },
  it_knife: () => {
    const g = blank(16);
    rod(g, 2.6, 13.4, 6.2, 9.8, 0.95, "#3a3028");
    rod(g, 5.4, 8.8, 7.4, 10.8, 0.6, "#9aa3ad");
    rod(g, 7, 9, 12.4, 3.6, 1.1, STEEL);
    return g;
  },
  it_axe: () => {
    const g = blank(16);
    // a fire axe: the blade to one side of the handle, the pick to the other
    rod(g, 2.6, 13.4, 11.4, 4.6, 0.75, WOOD);
    rod(g, 10.8, 4.2, 12.8, 6.4, 1.8, sh("#ff8a7a", "#d64545", "#9e2e2e"));
    rod(g, 12.2, 7.8, 14.4, 5.6, 0.8, STEEL);
    rod(g, 10.6, 4.4, 8.2, 2.0, 0.75, "#d64545");
    return g;
  },
  it_crowbar: () => {
    const g = blank(16);
    rod(g, 3.4, 12.6, 12.2, 3.8, 0.85, sh("#ff8a7a", "#c0392b", "#8a2a20"));
    rod(g, 12.2, 3.8, 11.2, 1.8, 0.75, "#c0392b");
    rod(g, 3.4, 12.6, 1.8, 12.8, 0.75, "#c0392b");
    return g;
  },
  it_hockey_stick: () => {
    const g = blank(16);
    rod(g, 12.6, 1.6, 5.4, 11.4, 0.75, WOOD);
    rod(g, 4.4, 12.4, 10.6, 12.8, 1.15, "#2c2c34");
    rod(g, 11.6, 1.2, 13.2, 2.4, 0.9, "#2c2c34");
    return g;
  },
  it_cleaver: () => {
    const g = blank(16);
    rod(g, 2.4, 13.6, 5.4, 10.6, 0.95, "#5a3b24");
    rod(g, 7.4, 8.6, 11, 5, 2.9, STEEL);
    g[5][9] = "#3a3f48";
    return g;
  },
  it_broom_spear: () => {
    const g = blank(16);
    rod(g, 2.2, 13.8, 10.6, 5.4, 0.6, "#c99a5e");
    rod(g, 10.4, 5.6, 13.8, 2.2, 1.15, STEEL);
    rod(g, 9.6, 6.4, 10.8, 5.2, 0.95, "#d64545");
    return g;
  },
  it_tennis_racket: () => {
    const g = blank(16);
    rod(g, 7, 9, 2.6, 13.4, 0.9, "#3a3f48");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 10, y + 0.5 - 6);
      if (r <= 4.4) g[y][x] = r > 3.3 ? "#3fbf6a" : (x + y) % 2 ? "#e6e9ef" : null;
    }
    return g;
  },
  it_trophy: () => ascii([
    "................",
    "................",
    "..yy.yyyyyy.yy..",
    ".y...yYyyyyz..y.",
    ".y...yYyyyyz..y.",
    "..y..yYyyyyz.y..",
    "...yyyyyyyyzz...",
    "......yyyz......",
    ".......yz.......",
    ".......yz.......",
    "......yyyz......",
    ".....kkkkkk.....",
    ".....kKkkkk.....",
    ".....kkkkkk.....",
    "................",
    "................",
  ], { y: "#f2c14e", Y: "#fff0a8", z: "#b8862a", k: "#5a3b24", K: "#8a5a3a" }),
  it_wrench: () => {
    const g = blank(16);
    rod(g, 2.8, 13.2, 9.4, 6.6, 1.0, sh("#ff8a7a", "#c0392b", "#8a2a20"));
    rod(g, 8.6, 7.4, 11.6, 4.4, 1.5, IRON);
    rod(g, 11.2, 2.6, 13.6, 5.0, 1.0, IRON);
    rod(g, 11.2, 5.6, 12.6, 7.0, 0.7, IRON);
    return g;
  },
  it_shovel: () => {
    const g = blank(16);
    rod(g, 5, 11, 12.2, 3.8, 0.6, WOOD);
    rod(g, 11.4, 2.0, 14.0, 4.6, 0.65, "#3a3f48");
    rod(g, 2.8, 13.2, 5.0, 11.0, 2.0, STEEL);
    return g;
  },
  it_nail_bat: () => {
    const g = blank(16);
    rod(g, 2.6, 13.4, 5.6, 10.4, 0.75, "#3a3f48");
    rod(g, 5.2, 10.8, 12.4, 3.6, 1.5, sh("#d9b07a", "#a8834a", "#7a5a30"));
    for (const [x, y] of [[8, 5], [10, 3], [13, 5], [11, 8], [7, 9], [14, 2]]) g[y][x] = "#dde3e8";
    disk(g, 2.3, 13.7, 1.0, "#3a3f48");
    return g;
  },
  it_machete: () => {
    const g = blank(16);
    rod(g, 2.4, 13.6, 5.2, 10.8, 0.9, "#4f7a3a");
    rod(g, 5.4, 10.6, 12.8, 3.2, 1.35, STEEL);
    rod(g, 12.2, 3.8, 13.6, 2.4, 1.6, STEEL);
    return g;
  },
  it_sledgehammer: () => {
    const g = blank(16);
    rod(g, 2.6, 13.4, 10, 6, 0.75, WOOD);
    rod(g, 8.2, 3.6, 12.8, 8.2, 2.1, IRON);
    return g;
  },
  it_field_chainsaw: () => ascii([
    "................",
    "................",
    "................",
    "..........ttttt.",
    "....kk...tsssst.",
    "...k..k.tsssst..",
    "..ooooootsssst..",
    "..oOoooosssst...",
    "..ooooooosst....",
    "..oooooooot.....",
    "..kkkkkkkk......",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { o: "#f08a24", O: "#ffc07a", k: "#2c2c34", s: "#c9ced4", t: "#5b616d" }),
  it_pool_cue: () => rod(blank(16), 1.8, 14.2, 13.8, 2.2, 0.6, (t) => (t < 0.3 ? "#3a2418" : t > 0.95 ? "#5f8fe0" : t > 0.88 ? "#f4f1e6" : "#d9b07a")),
  it_fire_poker: () => {
    const g = blank(16);
    rod(g, 3.6, 12.4, 12.6, 3.4, 0.6, "#4a4f5a");
    rod(g, 12.6, 3.4, 13.8, 5.2, 0.6, "#4a4f5a");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 2.6, y + 0.5 - 13.4);
      if (r <= 1.9 && r >= 0.8) g[y][x] = "#b8862a";
    }
    g[2][13] = "#ff8a3a";
    return g;
  },
  // Ranged weapons.
  it_slingshot: () => {
    const g = blank(16);
    rod(g, 8, 14, 8, 9, 0.95, WOOD);
    rod(g, 8, 9.4, 4.4, 4, 0.8, WOOD);
    rod(g, 8, 9.4, 11.6, 4, 0.8, WOOD);
    rod(g, 4.4, 4.2, 11.6, 4.2, 0.35, "#d64545");
    disk(g, 8, 4.4, 1.1, "#8a3a2a");
    return g;
  },
  it_recurve_bow: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 13, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if (r >= 7 && r <= 8.1 && dx < -4.5) g[y][x] = dy < 0 ? "#8a4a2a" : "#6b3a1a";
    }
    for (const [x, y] of [[7, 1], [8, 0], [7, 14], [8, 15]]) g[y][x] = "#6b3a1a";
    rod(g, 7.4, 1.4, 7.4, 14.6, 0.35, "#e6e9ef");
    return g;
  },
  it_compound_bow: () => {
    const g = blank(16);
    rod(g, 6, 2.5, 3.5, 8, 0.8, "#3a3f48");
    rod(g, 3.5, 8, 6, 13.5, 0.8, "#3a3f48");
    disk(g, 6.4, 2.4, 1.4, "#9aa3ad");
    disk(g, 6.4, 13.6, 1.4, "#9aa3ad");
    rod(g, 6.4, 2.4, 9.4, 8, 0.35, "#e6e9ef");
    rod(g, 9.4, 8, 6.4, 13.6, 0.35, "#e6e9ef");
    rod(g, 3, 8, 13, 8, 0.45, "#5f8fe0");
    rod(g, 12.6, 8, 14.2, 8, 0.9, "#c9ced4");
    return g;
  },
  it_crossbow: () => ascii([
    "................",
    "................",
    "................",
    "...b............",
    "...bb...........",
    "....bb..........",
    ".....bw.........",
    "..wwwwbwwwwwwss.",
    ".kkkkkkkkkkkkk..",
    ".kKkkkkkkk......",
    ".....bw.k.......",
    "....bb..........",
    "...bb...........",
    "...b............",
    "................",
    "................",
  ], { b: "#3a3f48", w: "#c99a5e", s: "#c9ced4", k: "#8a5a3a", K: "#c99a5e" }),
  it_nerf_blaster: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "..oooooooooooo..",
    "..oOooooooooobb.",
    "..ooooooooooo...",
    "..bbbbobbb......",
    ".....ooo........",
    "....ooo.........",
    "....ooo.........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { o: "#f08a24", O: "#ffc07a", b: "#3f7fd6" }),
  it_dart_gun: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "..............r.",
    "...kkkkkkkkkkrr.",
    "..kKkkkkkkkkk...",
    "..kkkkkkk.......",
    "....kkk.........",
    "...kkk..........",
    "...kkk..........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#2c2c34", K: "#6b7380", r: "#e04848" }),
  it_paintball_marker: () => ascii([
    "................",
    "................",
    ".....ppp........",
    "....pPppp.......",
    "....ppppp.......",
    ".....ppp........",
    "..kkkkkkkkkkkk..",
    "..kKkkkkkkkkkk..",
    "..kkkkkkk.......",
    "....kkk.........",
    "...kkk..........",
    "...kkk..........",
    "................",
    "................",
    "................",
    "................",
  ], { p: "#c04aa0", P: "#f0a0e0", k: "#3a3f48", K: "#7c8590" }),
  it_potato_cannon: () => {
    const g = blank(16);
    rod(g, 5.6, 10.4, 13.2, 2.8, 1.0, sh("#ffffff", "#e9edf0", "#b9c3cc"));
    rod(g, 2.6, 13.4, 6, 10, 2.0, sh("#ffffff", "#e9edf0", "#b9c3cc"));
    disk(g, 13.6, 2.4, 1.0, "#c9935a");
    g[13][4] = "#d64545";
    return g;
  },
  it_water_balloon_launcher: () => {
    const g = blank(16);
    rod(g, 2, 3, 8, 11, 0.45, "#3fbf6a");
    rod(g, 14, 3, 8, 11, 0.45, "#3fbf6a");
    disk(g, 2, 3, 1.0, "#e8c14a");
    disk(g, 14, 3, 1.0, "#e8c14a");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = (y + 0.5 - 11) / 1.15, r = Math.hypot(dx, dy);
      if (r <= 3.3) g[y][x] = dx + dy < -1.6 ? "#bfe3f5" : "#3f8fd0";
    }
    return g;
  },
  it_throwing_knives: () => {
    const g = blank(16);
    for (const [x0, y0, x1, y1] of [[4, 14, 4, 4], [8, 14, 8, 3], [12, 14, 12, 4]]) {
      rod(g, x0, y0, x0, y0 - 3, 0.7, "#3a3028");
      rod(g, x0, y0 - 3.4, x1, y1, 0.9, STEEL);
    }
    return g;
  },
  it_javelin: () => {
    const g = blank(16);
    rod(g, 1.6, 14.4, 11.6, 4.4, 0.5, "#d9b07a");
    rod(g, 6, 10, 7.4, 8.6, 0.75, "#3a3f48");
    rod(g, 11.2, 4.8, 14.2, 1.8, 0.95, STEEL);
    return g;
  },
  it_discus: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = (y + 0.5 - 8) * 1.5, r = Math.hypot(dx, dy);
      if (r <= 6.6) g[y][x] = r <= 2.2 ? "#e8c14a" : r <= 3 ? "#b8862a" : dx + dy < -2 ? "#e6eaee" : "#9aa3ad";
    }
    return g;
  },
  it_fire_extinguisher: () => ascii([
    "................",
    "......kkkk......",
    ".....kk..kkk....",
    "......ss....k...",
    ".....rrrr...k...",
    "....rRrrrr..k...",
    "....rRrrrr..k...",
    "....rRwwrr..k...",
    "....rRwwrr..kk..",
    "....rRrrrr......",
    "....rRrrrr......",
    "....rrrrrr......",
    "....rrrrrr......",
    ".....dddd.......",
    "................",
    "................",
  ], { k: "#2c2c34", s: "#c9ced4", r: "#d64545", R: "#f08a7a", w: "#f4f4f4", d: "#8a2a2a" }),
  it_bottle_rocket: () => {
    const g = blank(16);
    rod(g, 2, 14, 8, 8, 0.4, "#c99a5e");
    rod(g, 7, 9, 12.4, 3.6, 1.3, sh("#ff8a7a", "#d64545", "#9e2e2e"));
    rod(g, 12, 4, 13.8, 2.2, 0.7, "#f4f4f4");
    for (const [x, y, c] of [[5, 10, "#ffd06a"], [4, 12, "#f08a24"], [6, 12, "#ffd06a"], [3, 11, "#f08a24"]]) g[y][x] = c;
    return g;
  },
  it_bb_gun: () => {
    const g = blank(16);
    rod(g, 1.8, 12.4, 6, 9.6, 1.5, WOOD);
    rod(g, 5.6, 9.6, 14.2, 4.4, 0.6, "#3a3f48");
    rod(g, 6, 9.6, 9.6, 7.6, 1.0, "#5b616d");
    g[10][7] = "#3a3f48";
    return g;
  },
  it_baseball_pitch: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if (r <= 6) g[y][x] = dx + dy < -3 ? "#ffffff" : dx + dy > 4 ? "#d9d4c8" : "#f4f1e6";
    }
    for (const [x, y] of [[4, 4], [5, 5], [4, 6], [5, 7], [4, 8], [5, 9], [4, 10], [11, 4], [10, 5], [11, 6], [10, 7], [11, 8], [10, 9], [11, 10]]) g[y][x] = "#d64545";
    return g;
  },
  it_fishing_rod_hook: () => {
    const g = blank(16);
    rod(g, 2, 14, 12.8, 2.2, 0.5, (t) => (t < 0.3 ? "#3a2418" : "#c99a5e"));
    disk(g, 4.6, 12.4, 1.3, "#9aa3ad");
    rod(g, 13, 2, 13, 11, 0.3, "#e6e9ef");
    for (const [x, y] of [[13, 11], [13, 12], [12, 12], [11, 11]]) g[y][x] = "#c9ced4";
    return g;
  },
  // Armour.
  it_jacket: () => garment({ b: "#3f6fb5", L: "#7fa8e8", d: "#2a4a80", s: "#3f6fb5", k: "#f2c14e", c: "#f2c14e", z: "#2a4a80", t: "#f2c14e" }),
  it_vest: () => vest({ b: "#3a4658", L: "#5a6a80", d: "#232b38", t: "#232b38" }, [[5, 7, "#f2c14e"], [6, 7, "#f2c14e"], [9, 7, "#f2c14e"], [10, 7, "#f2c14e"], [5, 9, "#4a5466"], [10, 9, "#4a5466"]]),
  it_pads: () => {
    const g = blank(16);
    for (const cx of [5, 11]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = (x + 0.5 - cx) / 2.6, dy = (y + 0.5 - 8) / 4.6;
        if (dx * dx + dy * dy <= 1) g[y][x] = Math.abs(dy) < 0.4 ? "#3a3f48" : dx < -0.3 ? "#7c8590" : "#5b616d";
      }
    }
    return g;
  },
  it_helmet: () => ascii([
    "................",
    "................",
    "................",
    "................",
    ".....rrrrrr.....",
    "....rRkrrkrr....",
    "...rRrrrrrrrr...",
    "..rRrkrrkrrkrr..",
    "..rrrrrrrrrrrr..",
    "..dddddddddddd..",
    "...k........k...",
    "....k......k....",
    "................",
    "................",
    "................",
    "................",
  ], { r: "#e04848", R: "#ff9a8a", d: "#3a3f48", k: "#2c2c34" }),
  it_letterman_jacket: () => garment({ b: "#b8302a", L: "#e0605a", d: "#7a1a18", s: "#f4f1e6", k: "#b8302a", c: "#f4f1e6", z: "#7a1a18", t: "#f4f1e6" },
    [[5, 6, "#f2c14e"], [6, 6, "#f2c14e"], [5, 7, "#f2c14e"], [6, 8, "#f2c14e"]]),
  it_hoodie: () => garment({ b: "#8a93a0", L: "#b6bcc4", d: "#5b616d", s: "#8a93a0", k: "#5b616d", c: "#5b616d", z: "#8a93a0", t: "#5b616d", h: "#8a93a0" },
    [[7, 8, "#5b616d"], [8, 8, "#5b616d"], [6, 9, "#5b616d"], [9, 9, "#5b616d"], [7, 5, "#e6e9ef"], [8, 5, "#e6e9ef"]], true),
  it_backpack_plate: () => ascii([
    "................",
    "......kkkk......",
    ".....k....k.....",
    "...bbbbbbbbbb...",
    "..bBbbbbbbbbbb..",
    "..bBssssssssbb..",
    "..bBsSssssssbb..",
    "..bBsSssssssbb..",
    "..bBssssssssbb..",
    "..bBbbbbbbbbbb..",
    "..bBbbbbbbbbbb..",
    "..bbbbbbbbbbbb..",
    "...dddddddddd...",
    "................",
    "................",
    "................",
  ], { k: "#3a3f48", b: "#6b4a8a", B: "#9a7ab8", s: "#9aa3ad", S: "#dde3e8", d: "#4a2a6a" }),
  it_catchers_gear: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - 8) / 5.4, dy = (y + 0.5 - 8) / 6.4, e = dx * dx + dy * dy;
      if (e > 1) continue;
      g[y][x] = e > 0.72 ? "#3a3f48" : x % 3 === 1 || y % 3 === 1 ? "#9aa3ad" : null;
    }
    for (const [x, y] of [[4, 4], [11, 4]]) g[y][x] = "#3f6fb5";
    return g;
  },
  it_football_pads: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "....ww....ww....",
    "..wwWww..wwwww..",
    ".wWwwwwwwwwwwww.",
    ".wWwwwwkkwwwwwd.",
    ".wwwwwwkkwwwwwd.",
    "..ddwwwkkwwwdd..",
    "....wwwkkwww....",
    ".....wwwwww.....",
    "......wwww......",
    "................",
    "................",
    "................",
  ], { w: "#e9edf0", W: "#ffffff", d: "#b9c3cc", k: "#d64545" }),
  it_trash_lid: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if (r > 6.8) continue;
      g[y][x] = r > 5.9 ? "#5b616d" : Math.round(r) % 2 ? (dx + dy < 0 ? "#c9ced4" : "#9aa3ad") : dx + dy < 0 ? "#b6bcc4" : "#8a93a0";
    }
    for (let x = 6; x <= 9; x++) g[7][x] = "#3a3f48";
    g[8][6] = "#3a3f48";
    g[8][9] = "#3a3f48";
    return g;
  },
  it_welding_mask: () => ascii([
    "................",
    "................",
    "....kkkkkkkk....",
    "...kKkkkkkkkk...",
    "..kKkkkkkkkkkk..",
    "..kKkggggggkkk..",
    "..kKkgGggggkkk..",
    "..kkkggggggkkk..",
    "..kkkkkkkkkkkk..",
    "..kkkkkkkkkkkk..",
    "...kkkkkkkkkk...",
    "....kkkkkkkk....",
    ".....kkkkkk.....",
    "................",
    "................",
    "................",
  ], { k: "#3a3f48", K: "#6b7380", g: "#2f8a5a", G: "#7fe0a8" }),
  it_motorcycle_jacket: () => garment({ b: "#2c2c34", L: "#5a5a66", d: "#14141a", s: "#2c2c34", k: "#5a5a66", c: "#5a5a66", z: "#c9ced4", t: "#14141a" },
    [[6, 4, "#c9ced4"], [9, 6, "#c9ced4"]]),
  it_kevlar_vest: () => vest({ b: "#6f7f4a", L: "#93a86a", d: "#4a5632", t: "#4a5632" }, [[5, 8, "#4a5632"], [6, 8, "#4a5632"], [9, 8, "#4a5632"], [10, 8, "#4a5632"], [5, 10, "#4a5632"], [10, 10, "#4a5632"]]),
  it_lab_coat: () => garment({ b: "#f4f6f8", L: "#ffffff", d: "#c9d2dc", s: "#f4f6f8", k: "#c9d2dc", c: "#c9d2dc", z: "#9aa3ad", t: "#c9d2dc" },
    [[5, 8, "#5f8fe0"], [10, 6, "#9aa3ad"]]),
  it_apron: () => vest({ b: "#f4f6f8", L: "#ffffff", d: "#c9d2dc", t: "#3f6fb5" }, [[3, 8, "#3f6fb5"], [4, 8, "#3f6fb5"], [11, 8, "#3f6fb5"], [12, 8, "#3f6fb5"], [7, 9, "#c9d2dc"], [8, 9, "#c9d2dc"], [7, 10, "#c9d2dc"], [8, 10, "#c9d2dc"]]),
  it_winter_coat: () => garment({ b: "#f08a24", L: "#ffc07a", d: "#b8601a", s: "#f08a24", k: "#b8601a", c: "#f4f1e6", z: "#b8601a", t: "#b8601a" },
    [[5, 7, "#b8601a"], [6, 7, "#b8601a"], [9, 7, "#b8601a"], [10, 7, "#b8601a"], [5, 9, "#b8601a"], [6, 9, "#b8601a"], [9, 9, "#b8601a"], [10, 9, "#b8601a"]]),
  it_riot_harness: () => ascii([
    "................",
    "................",
    "...ssssssssss...",
    "...sggggggggs...",
    "...sgGggggggs...",
    "...sgGggggggs...",
    "...sggggggggs...",
    "...sgkkkkkkgs...",
    "...sgkwwwwkgs...",
    "...sgkkkkkkgs...",
    "...sggggggggs...",
    "...sggggggggs...",
    "...ssssssssss...",
    "................",
    "................",
    "................",
  ], { s: "#3a3f48", g: "#9fc8e0", G: "#e6f4ff", k: "#2c2c34", w: "#f4f4f4" }),
  // Accessories.
  it_charm: () => {
    const g = blank(16);
    for (const [cx, cy] of [[6, 5.4], [10, 5.4], [6, 9.4], [10, 9.4]]) disk(g, cx, cy, 2.4, "#4caf50");
    for (const [x, y] of [[5, 4], [9, 4], [5, 8]]) g[y][x] = "#9fe0a0";
    rod(g, 8, 8, 11, 14, 0.5, "#2e7a3a");
    return g;
  },
  it_glasses: () => {
    const g = blank(16);
    for (const cx of [4.8, 11.2]) for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - 8.5);
      if (r <= 3.2) g[y][x] = r > 2.2 ? "#8a5a3a" : r < 1.2 ? "#ffffff" : "#bfe3f5";
    }
    for (const x of [7, 8]) g[7][x] = "#8a5a3a";
    g[7][1] = "#8a5a3a";
    g[7][14] = "#8a5a3a";
    return g;
  },
  it_watch: () => {
    const g = blank(16);
    rod(g, 8, 1.4, 8, 3.6, 0.6, "#c9a24a");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 9.4, r = Math.hypot(dx, dy);
      if (r <= 5.4) g[y][x] = r > 4.4 ? (dx + dy < -2 ? "#fff0a8" : "#c9a24a") : "#f4f1e6";
    }
    rod(g, 8, 9.4, 8, 6.4, 0.35, "#3a2a1a");
    rod(g, 8, 9.4, 10.2, 9.4, 0.35, "#3a2a1a");
    return g;
  },
  it_energy_drink: () => ascii([
    "................",
    "................",
    ".....ssssss.....",
    ".....kkkkkk.....",
    ".....kKkkkk.....",
    ".....kKkkgk.....",
    ".....kKkggk.....",
    ".....kKggkk.....",
    ".....kKkggk.....",
    ".....kKkgkk.....",
    ".....kKgkkk.....",
    ".....kKkkkk.....",
    ".....kkkkkk.....",
    ".....ssssss.....",
    "................",
    "................",
  ], { s: "#b6bcc4", k: "#2c2c34", K: "#5a5a66", g: "#8ad13a" }),
  it_photo: () => ascii([
    "................",
    "................",
    "..ffffffffffff..",
    "..fbbbbbbbbbbf..",
    "..fbbbbbbbbbbf..",
    "..fbbsbbbbsbbf..",
    "..fbsssbbsssbf..",
    "..fbbsbbbbsbbf..",
    "..fbrrrbbcccbf..",
    "..fbrrrbbcccbf..",
    "..fggggggggggf..",
    "..ffffffffffff..",
    "................",
    "................",
    "................",
    "................",
  ], { f: "#a8753f", b: "#bfe3f5", s: "#f2c9a0", r: "#d64545", c: "#3f7fd6", g: "#6aa84f" }),
  it_gloves: () => ascii([
    "................",
    "................",
    "....s.s.s.......",
    "....s.s.s.s.....",
    "...kkkkkkks.....",
    "...kKkkkkkk.....",
    "...kKkkkkkk.ss..",
    "...kKkkkkkkkks..",
    "...kkkkkkkkkk...",
    "...kkkkkkkkk....",
    "....kkkkkkk.....",
    "....ddddddd.....",
    "................",
    "................",
    "................",
    "................",
  ], { s: "#f2c9a0", k: "#3a3f48", K: "#6b7380", d: "#2c2c34" }),
  it_bracelet: () => {
    const g = blank(16);
    const beads = ["#d64545", "#f2c14e", "#4caf50", "#3f7fd6", "#c04aa0", "#f08a24"];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      disk(g, 8 + Math.cos(a) * 4.8, 8 + Math.sin(a) * 4.2, 1.15, beads[i % beads.length]);
    }
    return g;
  },
  it_class_ring: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = (y + 0.5 - 10) * 1.3, r = Math.hypot(dx, dy);
      if (r <= 5.4 && r >= 3.4) g[y][x] = dy < 0 ? "#fff0a8" : "#c9a24a";
    }
    disk(g, 8, 4.6, 2.4, "#c9a24a");
    disk(g, 8, 4.6, 1.5, "#d64545");
    g[4][7] = "#ff9a8a";
    return g;
  },
  it_harmonica: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "................",
    ".ssssssssssssss.",
    ".sSSSSSSSSSSSSs.",
    ".rkrkrkrkrkrkrr.",
    ".rkrkrkrkrkrkrr.",
    ".sssssssssssssd.",
    ".dddddddddddddd.",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { s: "#c9ced4", S: "#ffffff", d: "#8a93a0", r: "#3f6fb5", k: "#14141a" }),
  it_walkie_talkie: () => ascii([
    "................",
    "....k...........",
    "....k...........",
    "....k...........",
    "....kkkkkkk.....",
    "....kKkkkkk.....",
    "....kggggkk.....",
    "....kgGggkk.....",
    "....kkkkkkk.....",
    "....kdkdkdk.....",
    "....kkkkkkk.....",
    "....kdkdkdk.....",
    "....kkkkkkk.....",
    "....kkkkkkk.....",
    "................",
    "................",
  ], { k: "#2c2c34", K: "#5a5a66", g: "#7fe0a8", G: "#cfffe0", d: "#5a5a66" }),
  it_compass: () => ascii([
    "................",
    "................",
    "...pppppppppp...",
    "...pPppppppppd..",
    "...ppwwwwwwppd..",
    "...ppwwrrwwppd..",
    "...ppwwrrwwppd..",
    "...ppwwkkwwppd..",
    "...ppwwkkwwppd..",
    "...ppwwwwwwppd..",
    "...pppppppppppd.",
    "...ppprrrrpppd..",
    "...pppppppppp...",
    "................",
    "................",
    "................",
  ], { p: "#9fc8e0", P: "#e6f4ff", d: "#6a98b8", w: "#f4f4f4", r: "#d64545", k: "#3a3f48" }),
  it_notebook: () => ascii([
    "................",
    "................",
    "...s.s.s.s.s....",
    "..rrrrrrrrrrr...",
    "..rRrrrrrrrrr...",
    "..rRrwwwwwwrr...",
    "..rRrrrrrrrrr...",
    "..rRrrrrrrrrr...",
    "..rRrrrrrrrrr...",
    "..rRrrrrrrrrr...",
    "..rRrrrrrrrrr...",
    "..rrrrrrrrrrr...",
    "..ddddddddddd...",
    "................",
    "................",
    "................",
  ], { s: "#c9ced4", r: "#b8302a", R: "#e0605a", w: "#f4f1e6", d: "#7a1a18" }),
  it_headband: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = (y + 0.5 - 8) * 2.2, r = Math.hypot(dx, dy);
      if (r <= 6.6 && r >= 4.4) g[y][x] = Math.abs(dx) < 1.2 && dy > 0 ? "#f4f4f4" : dy < 0 ? "#e0605a" : "#b8302a";
    }
    return g;
  },
  it_whistle: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 6.4, y + 0.5 - 9.6);
      if (r <= 3.6) g[y][x] = r < 1.2 ? "#3a3f48" : x + y < 15 ? "#ffffff" : "#b6bcc4";
    }
    rod(g, 8, 7, 13.4, 7, 1.4, sh("#ffffff", "#c9ced4", "#8a93a0"));
    rod(g, 3.6, 7, 2, 2, 0.4, "#d64545");
    return g;
  },
  it_sunglasses: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kKggggkkggggk..",
    ".kgGgggkkgGgggk.",
    "..ggggg..ggggg..",
    "...ggg....ggg...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#14141a", K: "#5a5a66", g: "#2c3440", G: "#6a7a90" }),
  it_first_aid: () => ascii([
    "................",
    "................",
    "................",
    "..wwwwwwwwwwww..",
    "..wWWWWWWWWWWd..",
    "..wWwwwrrwwwwd..",
    "..wWwwwrrwwwwd..",
    "..wWwrrrrrrwwd..",
    "..wWwrrrrrrwwd..",
    "..wWwwwrrwwwwd..",
    "..wWwwwrrwwwwd..",
    "..wwwwwwwwwwwd..",
    "..dddddddddddd..",
    "................",
    "................",
    "................",
  ], { w: "#e9e4d4", W: "#ffffff", d: "#a89a80", r: "#d64545" }),
  it_energy_stash: () => {
    const g = blank(16);
    rod(g, 3, 11, 13, 5, 2.4, (t, side) => (t < 0.12 || t > 0.88 ? "#c9ced4" : side < -1 ? "#ffd06a" : t > 0.45 && t < 0.62 ? "#5a3b24" : "#e08a24"));
    return g;
  },
  // Legendaries: the base item in gold.
  it_legendary_bat: () => legendary("it_bat"),
  it_legendary_axe: () => legendary("it_axe"),
  it_legendary_chainsaw: () => legendary("it_field_chainsaw"),
  it_legendary_machete: () => legendary("it_machete"),
  it_legendary_recurve: () => legendary("it_recurve_bow"),
  it_legendary_crossbow: () => legendary("it_crossbow"),
  it_legendary_cannon: () => legendary("it_potato_cannon"),
  it_legendary_slingshot: () => legendary("it_slingshot"),
  it_legendary_vest: () => legendary("it_vest"),
  it_legendary_coat: () => legendary("it_winter_coat"),
  it_legendary_riotgear: () => legendary("it_riot_harness"),
  it_legendary_labcoat: () => legendary("it_lab_coat"),
  it_legendary_charm: () => legendary("it_charm"),
  it_legendary_glasses: () => legendary("it_glasses"),
  it_legendary_compass: () => legendary("it_compass"),
  it_legendary_ring: () => legendary("it_class_ring"),
  // ---- UI symbols (16x16): the emoji left in text, tooltips and labels (ui.js SYMBOL_ICON) ----
  heart: () => ascii([
    "................",
    "................",
    "...rrr....rrr...",
    "..rRRrr..rrrrr..",
    ".rRRrrrrrrrrrrr.",
    ".rRrrrrrrrrrrrd.",
    ".rrrrrrrrrrrrdd.",
    "..rrrrrrrrrrdd..",
    "...rrrrrrrrdd...",
    "....rrrrrrdd....",
    ".....rrrrdd.....",
    "......rrrd......",
    ".......rd.......",
    "................",
    "................",
    "................",
  ], { r: "#e04848", R: "#ff9a9a", d: "#a82a2a" }),
  bolt: () => ascii([
    "................",
    "........YYYY....",
    ".......YYyy.....",
    "......Yyyy......",
    ".....Yyyy.......",
    "....Yyyyyyyyy...",
    "...yyyyyyyyy....",
    ".......yyyy.....",
    "......yyyy......",
    ".....yyyz.......",
    "....yyz.........",
    "...yz...........",
    "..z.............",
    "................",
    "................",
    "................",
  ], { Y: "#fff3b0", y: "#f4d03f", z: "#c9a020" }),
  warn: () => ascii([
    "................",
    "................",
    ".......oo.......",
    "......oooo......",
    "......okko......",
    ".....ookkoo.....",
    ".....ookkoo.....",
    "....oookkooo....",
    "....oookkooo....",
    "...oooooooooo...",
    "...ooookkoooo...",
    "..oooookkooooo..",
    "..oooooooooooo..",
    ".dddddddddddddd.",
    "................",
    "................",
  ], { o: "#ff9f43", d: "#c86a1a", k: "#2c2c34" }),
  shield: () => ascii([
    "................",
    "................",
    "..ssssssssssss..",
    "..sBBBBbbbbbbs..",
    "..sBrBBbbbbrbs..",
    "..sBBBBbbbbbbs..",
    "..sBBBBbbbbbbs..",
    "..sBBBBbbbbbbs..",
    "..sBBBBbbbbbbs..",
    "...sBBBbbbbbs...",
    "....sBBbbbbs....",
    ".....sBbbbs.....",
    "......sbbs......",
    ".......ss.......",
    "................",
    "................",
  ], { s: "#6b7380", B: "#d0d6dc", b: "#9aa3ad", r: "#ffffff" }),
  zombie: () => ascii([
    "................",
    "................",
    "....gggggggg....",
    "...gGgggggggg...",
    "...gGggggggggd..",
    "...gkkggggkkd...",
    "...grkggggrkd...",
    "...gggggggggd...",
    "...ggmmmmmggd...",
    "...ggmwmwmggd...",
    "....gggggggd....",
    ".....gggggd.....",
    "................",
    "................",
    "................",
    "................",
  ], { g: "#7fae4a", G: "#b8dc8a", d: "#4f7a2a", k: "#2c1a1a", r: "#e04848", m: "#3a1a1a", w: "#e6e0c8" }),
  face_tired: () => face16([
    ...px(FACE.ink, [4, 7], [5, 7], [6, 7], [9, 7], [10, 7], [11, 7]),
    ...px(FACE.mouth, [7, 10], [8, 10], [7, 11], [8, 11]),
    ...px("#9cc2ff", [12, 0], [13, 0], [14, 0], [13, 1], [12, 2], [13, 2], [14, 2]),
  ]),
  face_nerd: () => face16([
    ...px("#3a2a1a", [3, 5], [4, 5], [5, 5], [6, 5], [3, 6], [6, 6], [3, 7], [4, 7], [5, 7], [6, 7], [9, 5], [10, 5], [11, 5], [12, 5], [9, 6], [12, 6], [9, 7], [10, 7], [11, 7], [12, 7], [7, 6], [8, 6]),
    ...px(FACE.ink, [5, 6], [10, 6]),
    ...px(FACE.mouth, [5, 10], [6, 11], [7, 11], [8, 11], [9, 11], [10, 10]),
    ...px("#ffffff", [7, 12], [8, 12]),
  ]),
  face_cool: () => face16([
    ...px("#14141a", [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [3, 6], [4, 6], [5, 6], [6, 6], [9, 6], [10, 6], [11, 6], [12, 6], [4, 7], [5, 7], [10, 7], [11, 7]),
    ...px("#6a7a90", [4, 6], [10, 6]),
    ...px(FACE.mouth, [5, 10], [6, 11], [7, 11], [8, 11], [9, 11], [10, 10]),
  ]),
  face_grimace: () => face16([
    ...DOT_EYES,
    ...px(FACE.mouth, [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [4, 10], [11, 10], [4, 11], [5, 11], [6, 11], [7, 11], [8, 11], [9, 11], [10, 11], [11, 11]),
    ...px("#ffffff", [5, 10], [6, 10], [8, 10], [9, 10], [10, 10]),
    ...px("#c9c2a8", [7, 10]),
  ]),
  lock: () => ascii([
    "................",
    "................",
    "......kkkk......",
    ".....k....k.....",
    ".....k....k.....",
    ".....k....k.....",
    "...yyyyyyyyyy...",
    "...yYyyyyyyyz...",
    "...yYyyddyyyz...",
    "...yYyyddyyyz...",
    "...yYyyydyyyz...",
    "...yyyyyyyyyz...",
    "...zzzzzzzzzz...",
    "................",
    "................",
    "................",
  ], { k: "#9aa3ad", y: "#e8c14a", Y: "#fff0a8", z: "#b8862a", d: "#5a3b24" }),
  unlock: () => ascii([
    "......kkkk......",
    ".....k....k.....",
    ".....k....k.....",
    ".....k..........",
    ".....k..........",
    ".....k..........",
    "...yyyyyyyyyy...",
    "...yYyyyyyyyz...",
    "...yYyyddyyyz...",
    "...yYyyddyyyz...",
    "...yYyyydyyyz...",
    "...yyyyyyyyyz...",
    "...zzzzzzzzzz...",
    "................",
    "................",
    "................",
  ], { k: "#9aa3ad", y: "#e8c14a", Y: "#fff0a8", z: "#b8862a", d: "#5a3b24" }),
  door: () => ascii([
    "................",
    "....ffffffff....",
    "....fddddddf....",
    "....fdDddddf....",
    "....fdDppddf....",
    "....fdDppddf....",
    "....fdDddddf....",
    "....fdDddydf....",
    "....fdDddddf....",
    "....fdDppddf....",
    "....fdDppddf....",
    "....fdDddddf....",
    "....fddddddf....",
    "...gggggggggg...",
    "................",
    "................",
  ], { f: "#5a3b24", d: "#a8753f", D: "#c99a5e", p: "#8a5a3a", y: "#e8c14a", g: "#9aa3ad" }),
  sparkle: () => {
    const g = blank(16);
    const star = (cx, cy, r, c, core) => {
      for (let i = -r; i <= r; i++) { g[cy][cx + i] = c; g[cy + i][cx] = c; }
      if (r > 2) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) g[cy + dy][cx + dx] = c;
      g[cy][cx] = core;
    };
    star(6, 8, 5, "#f4d03f", "#ffffff");
    star(12, 3, 2, "#fff0a8", "#ffffff");
    star(12, 12, 1, "#fff0a8", "#ffffff");
    return g;
  },
  star: () => {
    const g = ICONS.honor_roll().map((r) => [...r]);
    for (const [x, y] of [[1, 2], [14, 2], [0, 9], [15, 9], [8, 0]]) g[y][x] = "#fff6c0";
    return g;
  },
  helicopter: () => ascii([
    "................",
    "................",
    "................",
    ".kkkkkkkkkkkk...",
    "......k.........",
    ".....gggg.......",
    "....gwwggg......",
    "...gwwwgggggggg.",
    "...gggggggg...g.",
    "....gggggg......",
    ".....k...k......",
    "...kkkkkkkk.....",
    "................",
    "................",
    "................",
    "................",
  ], { g: "#d64545", w: "#bfe3f5", k: "#3a3f48" }),
  check: () => {
    const g = blank(16);
    for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) if (!((x === 2 || x === 13) && (y === 2 || y === 13))) g[y][x] = y === 2 ? "#7fe0a0" : y === 13 ? "#2e8a48" : "#3fbf6a";
    for (const [x, y] of [[11, 4], [11, 5], [10, 5], [10, 6], [9, 6], [9, 7], [8, 7], [8, 8], [7, 8], [7, 9], [6, 9], [6, 10], [5, 9], [5, 8], [4, 8], [4, 7]]) g[y][x] = "#ffffff";
    return g;
  },
  cross: () => {
    const g = blank(16);
    for (let y = 2; y <= 13; y++) for (let x = 2; x <= 13; x++) if (!((x === 2 || x === 13) && (y === 2 || y === 13))) g[y][x] = y === 2 ? "#ff9a8a" : y === 13 ? "#9e2e2e" : "#d64545";
    for (let i = 4; i <= 11; i++) { g[i][i] = "#ffffff"; g[i][15 - i] = "#ffffff"; }
    return g;
  },
  burst: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const edge = 4.6 + 2.4 * Math.max(0, Math.cos(a * 8));
      if (r <= edge) g[y][x] = r < 2.6 ? "#fff3b0" : r < 4.4 ? "#f4d03f" : "#f08a24";
    }
    return g;
  },
  sprout: () => ascii([
    "................",
    "................",
    "................",
    "..ggg.....ggg...",
    ".gGggg...ggggd..",
    ".gGgggg.gggggd..",
    "..ggggg.ggggd...",
    "....gggsggd.....",
    ".......s........",
    ".......s........",
    ".......s........",
    "....bbbbbbbb....",
    "...bBbbbbbbbb...",
    "...bbbbbbbbbb...",
    "................",
    "................",
  ], { g: "#6aa84f", G: "#a8dc8a", d: "#3f7a2a", s: "#4f8a2a", b: "#6b4a2a", B: "#8a6a4a" }),
  // The Greenhouse: a glass house on a white frame, plants inside.
  greenhouse: () => ascii([
    "................",
    ".......ff.......",
    "......fGGf......",
    ".....fGggGf.....",
    "....fGgggGgf....",
    "...fGgggggGgf...",
    "..ffffffffffff..",
    "..fGgfGgGfGggf..",
    "..fggfgggfgggf..",
    "..fglfgllfglgf..",
    "..fllflllflllf..",
    "..fllflllflllf..",
    "..ffffffffffff..",
    "..bbbbbbbbbbbb..",
    "................",
    "................",
  ], { f: "#eef2f4", G: "#d8f2fa", g: "#9ccfe0", l: "#5aa84a", b: "#9a5a48" }),
  // Aloe vera: spiky green leaves in a clay pot.
  gh_aloe: () => ascii([
    "................",
    ".......a........",
    "......aA.....a..",
    "..a...aA....aA..",
    "..aA..aAa..aAa..",
    "...aA.aAa.aAa...",
    "...aAaaAaaAa....",
    "....aAaAaAa.....",
    "....aaaAaaa.....",
    "...pppppppppp...",
    "...pPppppppppq..",
    "....pPpppppq....",
    "....pPpppppq....",
    "....pPpppppq....",
    ".....qqqqqq.....",
    "................",
  ], { a: "#4f9a5a", A: "#9ad8a0", p: "#b0673a", P: "#d08a5a", q: "#7a4424" }),
  // Echinacea: a pink coneflower with an orange cone.
  gh_echinacea: () => ascii([
    "................",
    "................",
    "......oOoo......",
    ".....oOoooo.....",
    "..pp..oooo..pp..",
    ".pPPp..oo..pPPp.",
    "..ppp......ppp..",
    "....pp....pp....",
    ".......g........",
    ".......g..ll....",
    ".......g.lLl....",
    "..ll...gll......",
    "..lLl..g........",
    "....ll.g........",
    ".......g........",
    "................",
  ], { o: "#e0782a", O: "#f4b070", p: "#e06aa8", P: "#f4a8d0", g: "#4f8a3a", l: "#5aa84a", L: "#8ad070" }),
  // Willow bark: a weeping willow.
  gh_willow: () => ascii([
    "................",
    ".....gggggg.....",
    "...gggGGgggg....",
    "..ggGGggggGgg...",
    ".gGg.gggg.gGgg..",
    ".gg.g.gg.g.ggg..",
    ".g.g.gttg.g.gg..",
    ".g.g.gttg.g.g...",
    "...g.gttg.g.g...",
    "...g..tt..g.....",
    "......tt........",
    "......tTt.......",
    ".....ttTtt......",
    "....tt.T.tt.....",
    "................",
    "................",
  ], { g: "#5a9a45", G: "#8ac86a", t: "#6b4a2f", T: "#8a6a4a" }),
  tools: () => {
    const g = blank(16);
    rod(g, 3, 13, 11, 5, 0.85, sh("#ffffff", "#c9ced4", "#8a93a0"));
    disk(g, 11.6, 4.4, 2.4, "#c9ced4");
    disk(g, 13, 3, 1.3, null);
    rod(g, 13, 13, 6, 6, 0.75, WOOD);
    rod(g, 3.6, 6.4, 7.4, 2.6, 1.5, IRON);
    return g;
  },
  fire: () => ascii([
    "................",
    ".......r........",
    "......rr........",
    "......rrr...r...",
    ".....rrorr..rr..",
    "....rroorrrrrr..",
    "....rooyoorrrr..",
    "...rrooyyoorrr..",
    "...roooyyyoorr..",
    "...rooyyWyyorr..",
    "...rooyWWyyorr..",
    "....rooyyyoor...",
    ".....rooooor....",
    "......rrrrr.....",
    "................",
    "................",
  ], { r: "#d64545", o: "#f08a24", y: "#ffd06a", W: "#fff7d6" }),
  pin: () => {
    const g = blank(16);
    rod(g, 7.4, 8.6, 2.4, 13.6, 0.45, "#9aa3ad");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 10, dy = y + 0.5 - 6, r = Math.hypot(dx, dy);
      if (r <= 3.8) g[y][x] = dx + dy < -2 ? "#ff9a8a" : dx + dy > 2.5 ? "#9e2e2e" : "#d64545";
    }
    rod(g, 6.6, 9.4, 8.6, 7.4, 1.0, "#b8302a");
    return g;
  },
  scroll: () => ascii([
    "................",
    "................",
    "...pppppppppp...",
    "..pPppppppppppp.",
    "...ppppppppppd..",
    "....wwwwwwwwd...",
    "....wkkkkkkwd...",
    "....wwwwwwwwd...",
    "....wkkkkwwwd...",
    "....wwwwwwwwd...",
    "....wkkkkkkwd...",
    "....wwwwwwwwd...",
    "...pppppppppp...",
    "..pPppppppppppp.",
    "...pppppppppp...",
    "................",
  ], { p: "#c9a26a", P: "#e8c890", w: "#f4e8c8", k: "#8a6a4a", d: "#c9b48a" }),
  refresh: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (r >= 3.9 && r <= 5.6 && !(Math.abs(a + 0.6) < 0.45 || Math.abs(a - 2.55) < 0.45)) g[y][x] = dy < 0 ? "#7fb0f0" : "#3f7fd6";
    }
    for (const [x, y] of [[12, 3], [13, 3], [14, 3], [13, 4], [13, 2], [3, 12], [2, 12], [1, 12], [2, 11], [2, 13]]) g[y][x] = x > 8 ? "#7fb0f0" : "#3f7fd6";
    return g;
  },
  toolbox: () => ascii([
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....k....k.....",
    "..rrrrrrrrrrrr..",
    "..rRRRRRRRRRRq..",
    "..rRrrrrrrrrrq..",
    "..kkkkkyykkkkk..",
    "..rRrrrrrrrrrq..",
    "..rRrrrrrrrrrq..",
    "..rrrrrrrrrrrq..",
    "..qqqqqqqqqqqq..",
    "................",
    "................",
    "................",
  ], { k: "#3a3f48", r: "#d64545", R: "#f07a6a", q: "#9e2e2e", y: "#e8c14a" }),
  stopwatch: () => {
    const g = blank(16);
    rod(g, 7, 1.4, 9, 1.4, 0.7, "#9aa3ad");
    rod(g, 8, 2, 8, 3.4, 0.5, "#9aa3ad");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 9, r = Math.hypot(dx, dy);
      if (r <= 5.6) g[y][x] = r > 4.6 ? (dx + dy < -2 ? "#e6eaee" : "#8a93a0") : "#ffffff";
    }
    rod(g, 8, 9, 10.6, 6.4, 0.4, "#d64545");
    g[9][8] = "#3a3f48";
    return g;
  },
  siren: () => ascii([
    "................",
    "..y..........y..",
    "...y........y...",
    "................",
    "......rrrr......",
    ".....rRRrrr.....",
    "y...rRrrrrrr...y",
    "....rRrrrrrr....",
    "....rrrrrrrr....",
    "....rrrrrrrr....",
    "...kkkkkkkkkk...",
    "...kKkkkkkkkk...",
    "...kkkkkkkkkk...",
    "................",
    "................",
    "................",
  ], { r: "#e04848", R: "#ffb0a0", k: "#3a3f48", K: "#6b7380", y: "#ffd06a" }),
  arm: () => ascii([
    "................",
    "................",
    "..ggg...........",
    ".gGGgg..........",
    ".gGggg..........",
    ".ggggd..........",
    "..ggd...........",
    "..ggd.....ggg...",
    "..ggd...gGGggg..",
    "..gggg.gGgggggd.",
    "..gGgggggggggd..",
    "...ggggggggggd..",
    "....ggggggggd...",
    "......dddddd....",
    "................",
    "................",
  ], { g: "#e8b48a", G: "#f6d2b0", d: "#b9805a" }),
  acrobat: () => ascii([
    "................",
    "..s..........s..",
    "...s........s...",
    "....s..hh..s....",
    ".....s.ss.s.....",
    "......cccc......",
    "......cccc......",
    "......cccc......",
    "......bbbb......",
    ".....bb..bb.....",
    "....bb....bb....",
    "...bb......bb...",
    "..kk........kk..",
    "................",
    "................",
    "................",
  ], { s: "#f2c9a0", h: "#6b4a3a", c: "#e0605a", b: "#3f6fb5", k: "#2c2c34" }),
  barbell: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "..kk........kk..",
    ".kKkk......kkKk.",
    ".kkkk......kkkk.",
    ".kkkkssssssskkkk",
    ".kkkk......kkkk.",
    ".kkkk......kkkk.",
    "..kk........kk..",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#3a3f48", K: "#7c8590", s: "#c9ced4" }),
  forbidden: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if ((r <= 6.6 && r >= 4.8) || (r < 4.8 && Math.abs(dx - dy) < 1.3)) g[y][x] = "#e04848";
    }
    return g;
  },
  handshake: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "bbbb........oooo",
    "bbbbbsss..ssoooo",
    "bbbbssssssssoooo",
    "bbbbsSsSsSssoooo",
    "bbbb.sssssss.ooo",
    "bbbb..sssss..ooo",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { b: "#3f6fb5", o: "#e08a24", s: "#e8b48a", S: "#b9805a" }),
  fog: () => ascii([
    "................",
    "................",
    "...wwwwwwwww....",
    "................",
    ".wwwwwwwwwwwww..",
    "................",
    "....wwwwwwwwwww.",
    "................",
    "..wwwwwwwwwww...",
    "................",
    ".....wwwwwwwww..",
    "................",
    "...wwwwwwww.....",
    "................",
    "................",
    "................",
  ], { w: "#c9d2dc" }),
  rain: () => ascii([
    "................",
    "......cccc......",
    "....ccCCcccc....",
    "...cCCccccccc...",
    "..cCccccccccccd.",
    "..cccccccccccdd.",
    "...ddddddddddd..",
    "................",
    "...b...b...b....",
    "..b...b...b.....",
    "................",
    ".....b...b...b..",
    "....b...b...b...",
    "................",
    "................",
    "................",
  ], { c: "#9aa3b8", C: "#c9d2dc", d: "#6b7380", b: "#5f9fe0" }),
  blackout: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if (r <= 6) g[y][x] = r > 5.1 ? "#6b7380" : (x * 3 + y * 5) % 7 === 0 ? "#3a3f48" : "#2c3040";
    }
    return g;
  },
  blood: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 10;
      if (Math.hypot(dx, dy) <= 4.2 || (y >= 2 && y <= 8 && Math.abs(dx) <= (y - 1.5) * 0.62)) g[y][x] = dx + dy < -2.5 ? "#ff8a8a" : dx + dy > 3 ? "#8a1a1a" : "#c82a2a";
    }
    return g;
  },
  ruler: () => {
    const g = rod(blank(16), 2.4, 12.4, 12.4, 2.4, 2.2, sh("#fff0a8", "#f2c14e", "#c99a2e"));
    for (const [x, y] of [[4, 10], [6, 8], [8, 6], [10, 4], [5, 9], [9, 5]]) g[y][x] = "#8a6a2a";
    return g;
  },
  candle: () => ascii([
    "................",
    ".......o........",
    "......oyo.......",
    "......oyo.......",
    ".......k........",
    "......wwww......",
    "......wWww......",
    "......wWww......",
    "......wWww......",
    "......wWww......",
    "......wwww......",
    "......wwww......",
    "....dddddddd....",
    "................",
    "................",
    "................",
  ], { o: "#f08a24", y: "#fff0a8", k: "#3a3f48", w: "#f0ece2", W: "#ffffff", d: "#c9a24a" }),
  tophat: () => ascii([
    "................",
    "................",
    "....kkkkkkkk....",
    "....kKkkkkkk....",
    "....kKkkkkkk....",
    "....kKkkkkkk....",
    "....kKkkkkkk....",
    "....rrrrrrrr....",
    "....kkkkkkkk....",
    ".kkkkkkkkkkkkkk.",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#2c2c34", K: "#5a5a66", r: "#d64545" }),
  trend_up: () => {
    const g = ascii([
      "................",
      ".wwwwwwwwwwwwww.",
      ".wllllllllllllw.",
      ".wwwwwwwwwwwwww.",
      ".wllllllllllllw.",
      ".wwwwwwwwwwwwww.",
      ".wllllllllllllw.",
      ".wwwwwwwwwwwwww.",
      ".wllllllllllllw.",
      ".wwwwwwwwwwwwww.",
      ".wllllllllllllw.",
      ".wwwwwwwwwwwwww.",
      ".wllllllllllllw.",
      ".wwwwwwwwwwwwww.",
      "................",
      "................",
    ], { w: "#f4f6f8", l: "#e3e8ee" });
    rod(g, 2.6, 11.4, 6.4, 7.4, 0.6, "#3fbf6a");
    rod(g, 6.4, 7.4, 8.6, 9.4, 0.6, "#3fbf6a");
    rod(g, 8.6, 9.4, 13, 3.6, 0.6, "#3fbf6a");
    return g;
  },
  trend_down: () => {
    const g = ICONS.trend_up().map((r) => r.map((c) => (c === "#3fbf6a" ? null : c)));
    for (let y = 1; y <= 13; y++) for (let x = 1; x <= 14; x++) if (!g[y][x]) g[y][x] = y % 2 ? "#f4f6f8" : "#e3e8ee";
    rod(g, 2.6, 3.6, 6.4, 7.4, 0.6, "#d64545");
    rod(g, 6.4, 7.4, 8.6, 5.6, 0.6, "#d64545");
    rod(g, 8.6, 5.6, 13, 11.4, 0.6, "#d64545");
    return g;
  },
  newspaper: () => ascii([
    "................",
    "................",
    "..wwwwwwwwwwww..",
    "..wkkkkkkkkkkw..",
    "..wwwwwwwwwwww..",
    "..wggggwllllww..",
    "..wggggwwwwwww..",
    "..wggggwllllww..",
    "..wwwwwwwwwwww..",
    "..wllllwllllww..",
    "..wwwwwwwwwwww..",
    "..wllllwllllww..",
    "..wwwwwwwwwwwd..",
    "..dddddddddddd..",
    "................",
    "................",
  ], { w: "#eeeae0", k: "#3a3f48", g: "#9aa3ad", l: "#8a93a0", d: "#b9b2a0" }),
  chart: () => ascii([
    "................",
    "................",
    "...........gg...",
    "...........gG...",
    ".......bb..gG...",
    ".......bB..gG...",
    "...yy..bB..gG...",
    "...yY..bB..gG...",
    "...yY..bB..gG...",
    "...yY..bB..gG...",
    "...yY..bB..gG...",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
    "................",
    "................",
  ], { y: "#f2c14e", Y: "#c99a2e", b: "#5f8fe0", B: "#3a64b0", g: "#3fbf6a", G: "#2e8a48", k: "#9aa3ad" }),
  tree: () => {
    const g = blank(16);
    rod(g, 8, 9, 8, 14, 1.0, "#8a5a3a");
    for (const [cx, cy, r] of [[8, 5.6, 3.6], [5, 7.8, 3], [11, 7.8, 3], [8, 8.6, 3]]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        if (Math.hypot(dx, dy) <= r) g[y][x] = dx + dy < -1.6 ? "#8ad48a" : "#4caf50";
      }
    }
    return g;
  },
  pencil: () => {
    const g = rod(blank(16), 4.4, 11.6, 12.4, 3.6, 1.4, (t, side) => (t > 0.86 ? "#f0a0a8" : t > 0.8 ? "#c9ced4" : side < -0.3 ? "#ffe08a" : "#e8b030"));
    rod(g, 2.6, 13.4, 4.4, 11.6, 0.9, "#f0d8a8");
    g[13][2] = "#3a3f48";
    return g;
  },
  scales: () => ascii([
    "................",
    ".......y........",
    "..yyyyyyyyyyyy..",
    "..y....y.....y..",
    "..y....y.....y..",
    ".y.y...y....y.y.",
    "yyyyy..y...yyyyy",
    ".yyy...y....yyy.",
    ".......y........",
    ".......y........",
    ".......y........",
    ".....yyyyy......",
    "....yyyyyyy.....",
    "................",
    "................",
    "................",
  ], { y: "#c9a24a" }),
  bed: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "kk..............",
    "kk..............",
    "kkww.bbbbbbbbbb.",
    "kkwwwbBbbbbbbbbb",
    "kkkkkkkkkkkkkkkk",
    "kk............kk",
    "kk............kk",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#8a5a3a", w: "#f4f4f4", b: "#5f8fe0", B: "#9cc2ff" }),
  barricade: () => ascii([
    "................",
    "................",
    "................",
    "..oowwoowwoowo..",
    "..oowwoowwoowo..",
    "..k..........k..",
    "..oowwoowwoowo..",
    "..oowwoowwoowo..",
    "..k..........k..",
    "..k..........k..",
    "..k..........k..",
    ".kkk........kkk.",
    "................",
    "................",
    "................",
    "................",
  ], { o: "#f08a24", w: "#f4f4f4", k: "#6b7380" }),
  // the entrance's defenses (DEFENSE_STRUCTURES; razor wire is "wire")
  def_sandbags: () => {
    const g = blank(16);
    const bag = (x0, y0, w) => {
      for (let y = y0; y < y0 + 4; y++) for (let x = x0; x < x0 + w; x++) {
        if ((y === y0 || y === y0 + 3) && (x === x0 || x === x0 + w - 1)) continue;
        g[y][x] = y === y0 ? "#e2d2a4" : y === y0 + 3 ? "#8f7a52" : x === x0 + w - 1 ? "#a8935f" : "#c8b282";
      }
      g[y0 + 1][x0 + Math.floor(w / 2)] = "#a8935f";
    };
    bag(1, 10, 7);
    bag(8, 10, 7);
    bag(4, 6, 8);
    return g;
  },
  def_concrete: () => {
    const g = blank(16);
    for (let y = 5; y <= 13; y++) {
      const inset = y < 8 ? 3 : Math.max(0, 10 - y);
      for (let x = 1 + inset; x <= 14 - inset; x++) {
        let c = y === 5 ? "#d4d6da" : y === 13 ? "#6b7080" : "#a8adb5";
        if (y > 5 && y < 13 && x === 1 + inset) c = "#c4c8ce";
        if (y > 5 && y < 13 && x === 14 - inset) c = "#7e8490";
        if (y === 10 || y === 11) c = (x + y) % 4 < 2 ? "#f08a24" : "#f4f4f4";
        g[y][x] = c;
      }
    }
    return g;
  },
  def_efence: () => {
    const g = blank(16);
    for (const x of [2, 13]) for (let y = 3; y <= 14; y++) g[y][x] = y === 3 ? "#c8ccd4" : "#5a606c";
    for (const y of [5, 8, 11]) for (let x = 3; x <= 12; x++) g[y][x] = "#b8bec8";
    for (const [x, y] of [[9, 2], [8, 3], [8, 4], [7, 5], [8, 5], [9, 5], [9, 6], [8, 7], [8, 8], [7, 9]]) g[y][x] = "#f4d35e";
    for (const [x, y] of [[8, 4], [8, 7]]) g[y][x] = "#fff6b0";
    for (const [x, y] of [[4, 7], [11, 10], [5, 12]]) g[y][x] = "#f4d35e";
    return g;
  },
  // the Defenses research branch (TECH_TREE icons are named by tech id)
  concrete_barricades: () => ICONS.def_concrete(),
  nurse_training: () => ICONS.it_first_aid(),
  lab_equipment: () => ICONS.it_lab_coat(),
  master_builders: () => ICONS.tools(),
  coaching: () => ICONS.it_whistle(),
  hygiene: () => ICONS.sparkle(),
  pep_rallies: () => ICONS.mood_thrilled(),
  prodigies: () => ICONS.mortarboard(),
  trail_maps: () => ICONS.it_compass(),
  sparring: () => ICONS.role_fighter(),
  pathfinding: () => ICONS.role_scout(),
  field_kits: () => ICONS.role_support(),
  teamwork: () => ICONS.handshake(),
  green_thumbs: () => ICONS.sprout(),
  scrap_sorting: () => ICONS.toolbox(),
  quick_reflexes: () => ICONS.stopwatch(),
  barbed_walls: () => ICONS.spikes(),
  trap_engineering: () => ICONS.dr_engineer(),
  electric_fence: () => ICONS.def_efence(),
  lookouts: () => ICONS.dr_spotter(),
  rally_drills: () => ICONS.dr_rallier(),
  spikes: () => ascii([
    "................",
    "................",
    "................",
    "................",
    "..s...s...s...s.",
    "..s...s...s...s.",
    ".sSs.sSs.sSs.sSs",
    ".sSs.sSs.sSs.sSs",
    "sSsssSsssSsssSss",
    "bbbbbbbbbbbbbbbb",
    "bBbbbbbbbbbbbbbb",
    "dddddddddddddddd",
    "................",
    "................",
    "................",
    "................",
  ], { s: "#9aa3ad", S: "#e6eaee", b: "#8a5a3a", B: "#c99a5e", d: "#5a3b24" }),
  wire: () => {
    const g = blank(16);
    for (const cx of [3.5, 8, 12.5]) {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const r = Math.hypot(x + 0.5 - cx, y + 0.5 - 8);
        if (r >= 2.6 && r <= 3.5) g[y][x] = y < 8 ? "#d0d6dc" : "#8a93a0";
      }
    }
    for (const [x, y] of [[2, 4], [7, 4], [11, 4], [5, 12], [10, 12], [14, 11]]) g[y][x] = "#e6eaee";
    return g;
  },
  signal: () => ascii([
    "................",
    "................",
    "............gg..",
    "............gg..",
    ".........gg.gg..",
    ".........gg.gg..",
    "......gg.gg.gg..",
    "......gg.gg.gg..",
    "...gg.gg.gg.gg..",
    "...gg.gg.gg.gg..",
    "...gg.gg.gg.gg..",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { g: "#7fc8f0" }),
  satellite: () => {
    const g = blank(16);
    for (const [x0, y0, x1, y1] of [[1, 1, 6, 6], [10, 10, 15, 15]]) {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y][x] = (x + y) % 2 ? "#3f6fb5" : "#5f8fe0";
    }
    rod(g, 5.5, 5.5, 10.5, 10.5, 0.4, "#9aa3ad");
    disk(g, 8, 8, 2.4, "#c9ced4");
    g[7][7] = "#ffffff";
    rod(g, 9, 7, 12, 4, 0.35, "#9aa3ad");
    g[3][12] = "#e04848";
    return g;
  },
  floppy: () => ascii([
    "................",
    "................",
    "..bbbbbbbbbbbb..",
    "..bbsssssssbbb..",
    "..bbsssskssbbb..",
    "..bbsssskssbbb..",
    "..bbbbbbbbbbbb..",
    "..bbbbbbbbbbbb..",
    "..bbwwwwwwwwbb..",
    "..bbwwwwwwwwbb..",
    "..bbwllllllwbb..",
    "..bbwwwwwwwwbb..",
    "..bbbbbbbbbbbb..",
    "................",
    "................",
    "................",
  ], { b: "#3f6fb5", s: "#c9ced4", k: "#3a3f48", w: "#f4f4f4", l: "#9aa3ad" }),
  magnifier: () => {
    const g = blank(16);
    rod(g, 9.6, 9.6, 13.8, 13.8, 1.1, "#8a5a3a");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const r = Math.hypot(x + 0.5 - 6.6, y + 0.5 - 6.6);
      if (r <= 5) g[y][x] = r > 3.9 ? "#9aa3ad" : r < 1.8 && x < 7 && y < 7 ? "#ffffff" : "#bfe3f5";
    }
    return g;
  },
  palette: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - 8) / 6.8, dy = (y + 0.5 - 8.4) / 5.4;
      if (dx * dx + dy * dy <= 1 && Math.hypot(x + 0.5 - 10.6, y + 0.5 - 11.2) > 1.6) g[y][x] = "#d9a86a";
    }
    for (const [x, y, c] of [[4, 6, "#e04848"], [7, 4, "#f2c14e"], [10, 5, "#4caf50"], [12, 8, "#3f7fd6"], [5, 10, "#c04aa0"]]) { g[y][x] = c; g[y][x + 1] = c; g[y + 1][x] = c; g[y + 1][x + 1] = c; }
    return g;
  },
  speaker: () => ascii([
    "................",
    "................",
    "................",
    "......k.....w...",
    ".....kk...w..w..",
    "..kkkkk....w..w.",
    "..kKkkk..w..w.w.",
    "..kKkkk..w..w.w.",
    "..kkkkk....w..w.",
    ".....kk...w..w..",
    "......k.....w...",
    "................",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#6b7380", K: "#b6bcc4", w: "#9cc2ff" }),
  // two quavers on a beam (the Music option)
  music: () => ascii([
    "................",
    "................",
    "......kkkkkkkk..",
    "......kwwwwwwk..",
    "......kkkkkkkk..",
    "......k......k..",
    "......k......k..",
    "......k......k..",
    "......k......k..",
    "......k......k..",
    "...kkkk...kkkk..",
    "..kwkkk..kwkkk..",
    "..kkkkK..kkkkK..",
    "...kkK....kkK...",
    "................",
    "................",
  ], { k: "#9cc2ff", w: "#e4eeff", K: "#6a8ccc" }),
  duffel: () => ascii([
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....k....k.....",
    "...bbbbbbbbbb...",
    "..bBbbbbbbbbbb..",
    ".bBbbyyyyyybbbb.",
    ".bBbbbbbbbbbbbd.",
    ".bbbbbbbbbbbbbd.",
    ".bbbbbbbbbbbbbd.",
    "..bbbbbbbbbbdd..",
    "...dddddddddd...",
    "................",
    "................",
    "................",
  ], { k: "#5a3b24", b: "#a8753f", B: "#d9a86a", d: "#7a5230", y: "#e8c14a" }),
  mortarboard: () => ascii([
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkkkkk.....",
    "...kkkKkkkkkk...",
    ".kkkkKkkkkkkkkk.",
    "...kkkkkkkkkkyy.",
    ".....kkkkkk..y..",
    "....kkkkkkkk.y..",
    "....kkkkkkkk.yy.",
    "....kkkkkkkk....",
    "................",
    "................",
    "................",
    "................",
  ], { k: "#2c3440", K: "#5a6478", y: "#e8c14a" }),
  teacher: () => ascii([
    "................",
    "................",
    ".....hhhhhh.....",
    "....hhssssh.....",
    "....hsssssh.....",
    ".....ssssss.....",
    ".....ssssss.....",
    "......ssss......",
    "....nNwrrwnn....",
    "...nNnwrrwnnn...",
    "...nNnnrrnnnn...",
    "...nNnnrrnnnn...",
    "...nnnnnnnnnn...",
    "................",
    "................",
    "................",
  ], { h: "#6b4a3a", s: "#f2c9a0", n: "#34406b", N: "#56679e", w: "#eef3f7", r: "#c0392b" }),
  student: () => ascii([
    "................",
    "................",
    ".....hhhhhh.....",
    "....hhhhhhhh....",
    "....hssssssh....",
    ".....ssssss.....",
    ".....ssssss.....",
    "......ssss......",
    "...ouUuuuuuo....",
    "...oUuuuuuuuo...",
    "...ouUuuuuuuo...",
    "...ouUuuuuuuo...",
    "...uuuuuuuuuu...",
    "................",
    "................",
    "................",
  ], { h: "#8a5a3a", s: "#f2c9a0", u: "#3f7fd6", U: "#7fb0f0", o: "#e08a24" }),
  // ---- tab and turn-button icons (16x16, shown at 16px) — one per tab ----
  // Lobby: the school's front doors.
  lobby: () => ascii([
    "................",
    "......rrrr......",
    "....rrrRrrrr....",
    "..rrrrrrrrrrrr..",
    "..ssssssssssss..",
    "..rRrrrrrrrrrq..",
    "..rRrddddddrrq..",
    "..rRrdwddwdrrq..",
    "..rRrdwddwdrrq..",
    "..rRrddddddrrq..",
    "..rRrddyyddrrq..",
    "..rRrddddddrrq..",
    "..qqqddddddqqq..",
    ".gggggggggggggg.",
    "................",
    "................",
  ], { r: "#c0583a", R: "#e88a62", q: "#8a3a24", s: "#e3d6c0", d: "#7a4a2a", w: "#bfe3f5", y: "#e8c14a", g: "#9aa3ad" }),
  // Classrooms: a chalkboard.
  classrooms: () => ascii([
    "................",
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kGgggggggggggk.",
    ".kgcccgggcgcggk.",
    ".kgggcggcccggck.",
    ".kggggggggggggk.",
    ".kgccccgggccggk.",
    ".kggggggggggggk.",
    ".kkkkkkkkkkkkkk.",
    "...yyyyyyyyyy...",
    "...k........k...",
    "...k........k...",
    "..kk........kk..",
    "................",
    "................",
  ], { k: "#a8753f", g: "#2f5a44", G: "#3f7a5c", c: "#e8efe8", y: "#d9c9a0" }),
  // Facilities: an office block with lit windows.
  facilities: () => ascii([
    "................",
    "................",
    "...ssssssssss...",
    "...Bbbbbbbbbb...",
    "...Bwwbwwbwwb...",
    "...Bwwbwwbwwb...",
    "...Bbbbbbbbbb...",
    "...Bwwbwwbwwb...",
    "...Bwwbwwbwwb...",
    "...Bbbbbbbbbb...",
    "...Bwwbddbwwb...",
    "...Bbbbddbbbb...",
    "...Bbbbddbbbb...",
    "..gggggggggggg..",
    "................",
    "................",
  ], { s: "#5a6478", b: "#9aa3b8", B: "#c3cad8", w: "#f4d35e", d: "#5a3b24", g: "#6b7380" }),
  // City Map: a folded map with a route to an X.
  map: () => ascii([
    "................",
    "................",
    ".aaaabbbbbaaaaa.",
    ".aaaabbbbbaaXaX.",
    ".aaaabbbbbaaaXa.",
    ".aaaabbbbbaaXaX.",
    ".aaaabbbbbaapaa.",
    ".aaaabbbbbpaaaa.",
    ".aaaabbbpbaaaaa.",
    ".aaaabpbbbaaaaa.",
    ".aaapbbbbbaaaaa.",
    ".apaabbbbbaaaaa.",
    ".aaaabbbbbaaaaa.",
    ".ccccdddddccccc.",
    "................",
    "................",
  ], { a: "#e8d8b0", b: "#cdb98c", c: "#b8a47a", d: "#a8946a", X: "#d64545", p: "#8a5a3a" }),
  // Explore (the turn button): a brass compass.
  compass: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8, r = Math.hypot(dx, dy);
      if (r <= 6.8) g[y][x] = r > 5.4 ? (dx + dy < -2 ? "#ead07a" : "#b8862a") : "#f4efe0";
    }
    rod(g, 8, 8, 10.6, 3.4, 1.05, "#d64545");
    rod(g, 8, 8, 5.4, 12.6, 1.05, "#8a93a0");
    g[7][7] = "#3a3f48";
    g[8][8] = "#3a3f48";
    return g;
  },
  // Scrapyard: a tyre leaning on a rusty plate.
  scrapyard: () => {
    const g = blank(16);
    rod(g, 10.6, 12.6, 13, 3.6, 1.7, (t, side) => (side < -0.6 ? "#e09a6a" : side > 0.8 ? "#8a4a2a" : "#b8683a"));
    for (const [x, y] of [[11, 6], [12, 10]]) g[y][x] = "#5a3020";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 6.5, dy = y + 0.5 - 9.5, r = Math.hypot(dx, dy);
      if (r > 4.9 || r < 1.1) continue;
      g[y][x] = r > 2.7 ? (dx + dy < -3 ? "#5a5a66" : "#2c2c34") : (dx + dy < 0 ? "#dde3e8" : "#9aa3ad");
    }
    return g;
  },
  // Night Watch: a lit lantern.
  lantern: () => ascii([
    "................",
    ".......kk.......",
    "......k..k......",
    ".....kkkkkk.....",
    "....kKkkkkkk....",
    ".....kyyyyk.....",
    ".....kyFFyk.....",
    ".....kyFWyk.....",
    ".....kyFFyk.....",
    ".....kyyyyk.....",
    ".....kyyyyk.....",
    "....kKkkkkkk....",
    ".....kkkkkk.....",
    "................",
    "................",
    "................",
  ], { k: "#4a4f5a", K: "#7c8590", y: "#ffe08a", F: "#f08a24", W: "#fff7d6" }),
  // Assault: two crossed swords.
  assault: () => {
    const g = blank(16);
    for (const flip of [false, true]) {
      const X = (x) => (flip ? 16 - x : x);
      rod(g, X(5.2), 10.8, X(13.2), 2.8, 1.0, (t, side) => ((flip ? -side : side) < 0 ? "#f4f6f8" : "#a9b1ba"));
      rod(g, X(3.6), 9.6, X(6.4), 12.4, 0.75, "#e8c14a");
      rod(g, X(2.2), 13.8, X(4.4), 11.6, 0.75, "#8a5a3a");
    }
    return g;
  },
  // Event: a die — the day's luck.
  dice: () => ascii([
    "................",
    "................",
    "....TTTTTTTTTT..",
    "...TTTTTTTTTTS..",
    "..wwwwwwwwwwSS..",
    "..wrrwwwwwwwSS..",
    "..wrrwwwwwwwSS..",
    "..wwwwwwwwwwSS..",
    "..wwwwrrwwwwSS..",
    "..wwwwrrwwwwSS..",
    "..wwwwwwwwwwSS..",
    "..wwwwwwwrrwSS..",
    "..wwwwwwwrrwS...",
    "..wwwwwwwwww....",
    "................",
    "................",
  ], { T: "#ffffff", w: "#e9edf0", S: "#b9c3cc", r: "#d64545" }),
  // Roster: a clipboard with the list.
  roster: () => ascii([
    "................",
    "......cccc......",
    "....bbcCCcbb....",
    "...bbbbbbbbbb...",
    "...bwwwwwwwwb...",
    "...bwkkkkkkwb...",
    "...bwwwwwwwwb...",
    "...bwkkkkwwwb...",
    "...bwwwwwwwwb...",
    "...bwkkkkkkwb...",
    "...bwwwwwwwwb...",
    "...bwkkkwwwwb...",
    "...bwwwwwwwwb...",
    "...bbbbbbbbbb...",
    "................",
    "................",
  ], { b: "#a8753f", c: "#9aa0a8", C: "#d9dde2", w: "#eef3f7", k: "#6b7380" }),
  // Armory: a crate with a sword and a bat sticking out.
  armory: () => ascii([
    "................",
    "....s.....hh....",
    "....sS....hh....",
    "....sS....hh....",
    "....sS....hh....",
    "...ysSy...hh....",
    "....dd.....h....",
    "..wwwwwwwwwwww..",
    "..wWWWWWWWWWWq..",
    "..wwwwwwwwwwwq..",
    "..qqqqqqqqqqqq..",
    "..wwwwwwwwwwwq..",
    "..wwwwwwwwwwwq..",
    "..qqqqqqqqqqqq..",
    "................",
    "................",
  ], { s: "#b6bcc4", S: "#f4f6f8", y: "#e8c14a", d: "#5a3b24", h: "#c99a5e", w: "#b8834a", W: "#d9a86a", q: "#7a5230" }),
  // Research (the tech tree): a blueprint.
  tech: () => ascii([
    "................",
    "................",
    ".bbbbbbbbbbbbbb.",
    ".bLbbbLbbbLbbbb.",
    ".bbwwwwwwbbbbbb.",
    ".bLwbbbbwbLbbbb.",
    ".bbwbbbbwbbwwwb.",
    ".bLwbbbbwbLwbwb.",
    ".bbwbbbbwbbwwwb.",
    ".bLwwwwwwbLbbbb.",
    ".bbbbbbbbbbbbbb.",
    ".bLbwwwwwwwwbbb.",
    ".bbbbbbbbbbbbcc.",
    ".bbbbbbbbbbbbc..",
    "................",
    "................",
  ], { b: "#2f6fb5", L: "#5a95d6", w: "#eef6ff", c: "#bcd6f0" }),
  // Classes (the turn button): an open book.
  classes: () => ascii([
    "................",
    "................",
    "................",
    "..wwww....wwww..",
    ".wwwwwwsswwwwww.",
    ".wkkkkwsswkkkkw.",
    ".wwwwwwsswwwwww.",
    ".wkkkwwsswkkkkw.",
    ".wwwwwwsswwwwww.",
    ".wkkkkwsswkkkww.",
    ".wwwwwwsswwwwww.",
    ".bbbbbbbbbbbbbb.",
    "......bbbb......",
    "................",
    "................",
    "................",
  ], { w: "#f4f1e6", k: "#8a93a8", s: "#c9bfa6", b: "#3f6fb5" }),
  // The Radio Station's mast (16x16): a lattice tower, its red light and the signal going out.
  antenna: () => ascii([
    "................",
    ".......RR.......",
    "..w....rr....w..",
    ".w..w..ss..w..w.",
    ".w..w..ss..w..w.",
    "..w....ss....w..",
    ".......ss.......",
    "......sSss......",
    "......s.xs......",
    ".....sSssss.....",
    ".....s.xx.s.....",
    "....sSssssss....",
    "....s.x..x.s....",
    "...sSssssssss...",
    "................",
    "................",
  ], { R: "#ff7a6a", r: "#d64545", s: "#b6bcc4", S: "#e6eaee", x: "#8a93a0", w: "#7fc8f0" }),
  // The infection (16x16): a shaded green virus with knobbed spikes.
  virus: () => {
    const g = blank(16);
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4 + Math.PI / 8;
      const [cx, cy] = [8 + Math.cos(ang) * 6, 8 + Math.sin(ang) * 6];
      rod(g, 8, 8, cx, cy, 0.6, "#5a9a3a");
      disk(g, cx, cy, 1.1, Math.cos(ang) + Math.sin(ang) < 0 ? "#c8f09a" : "#8ad13a");
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8;
      if (Math.hypot(dx, dy) <= 4.4) g[y][x] = dx + dy < -2.8 ? "#b8ec8a" : dx + dy > 3 ? "#3e7a2a" : "#6fbf4a";
    }
    for (const [x, y] of [[6, 8], [9, 6], [9, 9]]) g[y][x] = "#3e7a2a";
    return g;
  },
  // Morale, best to worst (moodIcon picks one).
  mood_thrilled: () => face16([
    ...px(FACE.ink, [5, 5], [4, 6], [6, 6], [10, 5], [9, 6], [11, 6]),
    ...px(FACE.mouth, [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9], [11, 9], [5, 10], [10, 10], [6, 11], [9, 11]),
    ...px("#ffffff", [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9]),
    ...px(FACE.tongue, [6, 10], [7, 10], [8, 10], [9, 10], [7, 11], [8, 11]),
    ...px(FACE.blush, [3, 8], [12, 8]),
  ]),
  mood_happy: () => face16([...DOT_EYES, ...px(FACE.mouth, [4, 9], [11, 9], [5, 10], [10, 10], [6, 11], [7, 11], [8, 11], [9, 11])]),
  mood_ok: () => face16([...DOT_EYES, ...px(FACE.mouth, [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10])]),
  mood_sad: () => face16([...DOT_EYES, ...px(FACE.mouth, [6, 10], [7, 10], [8, 10], [9, 10], [5, 11], [10, 11], [4, 12], [11, 12])]),
  mood_miserable: () => face16([
    ...px(FACE.ink, [4, 4], [5, 3], [11, 4], [10, 3], [5, 6], [5, 7], [10, 6], [10, 7]),
    ...px(FACE.mouth, [6, 10], [7, 10], [8, 10], [9, 10], [5, 11], [10, 11], [4, 12], [11, 12]),
    ...px(FACE.tear, [4, 8], [4, 9]), ...px("#4f9fd6", [4, 10]),
  ], "#e0c05a", "#b88a2a"),
  // The day's three turns (16x16): morning sun, afternoon dusk, night moon.
  sun: () => {
    const g = blank(16);
    for (let a = 0; a < 8; a++) {
      const ang = (a * Math.PI) / 4;
      rod(g, 8 + Math.cos(ang) * 5.2, 8 + Math.sin(ang) * 5.2, 8 + Math.cos(ang) * 6.6, 8 + Math.sin(ang) * 6.6, 0.7, "#f7d774");
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 8;
      if (Math.hypot(dx, dy) <= 3.7) g[y][x] = dx + dy < -2.2 ? "#fbe7a6" : dx + dy > 2.6 ? "#e0a020" : "#f4c542";
    }
    return g;
  },
  dusk: () => {
    const g = blank(16);
    for (const [x0, y0, x1, y1] of [[8, 1.6, 8, 3.2], [2.6, 4.2, 3.8, 5.4], [13.4, 4.2, 12.2, 5.4], [1, 9.5, 2.4, 9.5], [15, 9.5, 13.6, 9.5]]) rod(g, x0, y0, x1, y1, 0.7, "#f7b26a");
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 8, dy = y + 0.5 - 10.5;
      if (y <= 10 && Math.hypot(dx, dy) <= 5.2) g[y][x] = dx + dy < -3.5 ? "#ffc58a" : "#f08a3a";
    }
    for (let x = 1; x <= 14; x++) g[11][x] = "#7a4a6a";
    for (let x = 3; x <= 12; x++) g[12][x] = "#5a3a5a";
    return g;
  },
  moon: () => {
    const g = blank(16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const a = Math.hypot(x + 0.5 - 8, y + 0.5 - 8.5), b = Math.hypot(x + 0.5 - 10.8, y + 0.5 - 6.2);
      if (a <= 5.8 && b > 4.6) g[y][x] = a > 4.7 ? "#c9c2a0" : "#e8e2c0";
    }
    for (const [x, y] of [[4, 8], [5, 11]]) g[y][x] = "#c9c2a0";
    for (const [x, y] of [[12, 12], [13, 3], [10, 1]]) g[y][x] = "#ffffff";
    return g;
  },
};

const iconCache = new Map();

export function pixelIcon(name, size = 16) {
  if (!iconCache.has(name)) {
    const g = ICONS[name]();
    const n = g.length;
    const color = g.map((row) => [...row]);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (g[y][x]) continue;
      const touching = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => g[y + dy]?.[x + dx]).find(Boolean);
      if (touching) color[y][x] = g.outline || outlineOf(touching);
    }
    let rects = "";
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; ) {
        const c = color[y][x];
        let run = 1;
        while (c && x + run < n && color[y][x + run] === c) run++;
        if (c) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
        x += run;
      }
    }
    iconCache.set(name, { n, rects });
  }
  const { n, rects } = iconCache.get(name);
  return `<svg class="px-icon" viewBox="0 0 ${n} ${n}" width="${size}" height="${size}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

export const MOOD_STEPS = [[80, "mood_thrilled"], [60, "mood_happy"], [40, "mood_ok"], [20, "mood_sad"], [-Infinity, "mood_miserable"]];
export function moodIcon(happiness, size) {
  return pixelIcon(MOOD_STEPS.find(([min]) => happiness >= min)[1], size);
}
