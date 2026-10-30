// The exploration map drawn as one continuous town: streets and blocks, a river, the school
// grounds in the middle, and fog drifting over everything nobody has scouted yet — pixel art made
// in code like the room scenes. Underneath it's still the hex grid from map.js (every hex is a
// "block" a scout can reveal, with the same terrain, places and rules), but the grid is never drawn.

import { MAP_RADIUS, isSchoolHex, hexTerrain, hexDistance, tilePixels } from "./map.js";
import { LOCATIONS, LANDMARKS } from "./data.js";
import { shadowOf, lightOf, mix } from "./sprite.js";
import { lightUp, DUSK } from "./lighting.js";

// ---------- geometry: world pixels <-> hexes ----------

export const HEX_R = 16; // centre to corner, in art pixels (a hex is 32 x 28)
const SQ3 = Math.sqrt(3);
export const WORLD_W = 416;
export const WORLD_H = 464;
const CX = WORLD_W / 2;
const CY = WORLD_H / 2;

export function hexToWorld(q, r) {
  return { x: CX + 1.5 * HEX_R * q, y: CY + SQ3 * HEX_R * (r + q / 2) };
}

export function worldToHex(x, y) {
  const px = x - CX;
  const py = y - CY;
  const fq = ((2 / 3) * px) / HEX_R;
  const fr = ((-1 / 3) * px + (SQ3 / 3) * py) / HEX_R;
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}

// The part of the world worth showing: the school, what's been scouted and the fog you can
// scout next — so the map starts close in on the school and pulls back as the town opens up.
export function viewBox(hexes) {
  let x0 = CX - 40, x1 = CX + 40, y0 = CY - 42, y1 = CY + 42;
  for (const { q, r } of hexes) {
    const { x, y } = hexToWorld(q, r);
    x0 = Math.min(x0, x - HEX_R);
    x1 = Math.max(x1, x + HEX_R);
    y0 = Math.min(y0, y - 14);
    y1 = Math.max(y1, y + 14);
  }
  const pad = 10;
  let w = x1 - x0 + pad * 2;
  let h = y1 - y0 + pad * 2;
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  w = Math.min(WORLD_W, Math.max(w, 170));
  h = Math.min(WORLD_H, Math.max(h, 150));
  return [mx - w / 2, my - h / 2, w, h].map((v) => Math.round(v));
}

// ---------- noise ----------

function hash2(x, y, s) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s + 7, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, y, cell, s) {
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  const fx = x / cell - gx;
  const fy = y / cell - gy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(gx, gy, s);
  const b = hash2(gx + 1, gy, s);
  const c = hash2(gx, gy + 1, s);
  const d = hash2(gx + 1, gy + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function rngFor(seed) {
  let x = (seed >>> 0) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

// ---------- a pixel buffer ----------

const colorCache = new Map();
function col(hex) {
  let v = colorCache.get(hex);
  if (v === undefined) {
    const n = parseInt(hex.slice(1), 16);
    v = ((255 << 24) | ((n & 0xff) << 16) | (((n >> 8) & 0xff) << 8) | (n >> 16)) >>> 0;
    colorCache.set(hex, v);
  }
  return v;
}

function painter(w, h) {
  const buf = new Uint32Array(w * h);
  const glow = new Uint8Array(w * h);
  const lights = [];
  const set = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = c;
  };
  return {
    buf, w, h, glow, lights,
    // a pixel that gives off its own light, and a light pool around it
    glowDot(x, y, hex) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      buf[y * w + x] = col(hex);
      glow[y * w + x] = 1;
    },
    light(l) {
      lights.push(l);
    },
    // darken what's already at (x, y) to `f` of its brightness (a shadow falling on it)
    shade(x, y, f) {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const v = buf[y * w + x];
      buf[y * w + x] = ((255 << 24) | (Math.round(((v >>> 16) & 255) * f) << 16) | (Math.round(((v >>> 8) & 255) * f) << 8) | Math.round((v & 255) * f)) >>> 0;
    },
    rect(x0, y0, x1, y1, hex) {
      const c = col(hex);
      for (let y = Math.max(0, Math.round(y0)); y <= Math.min(h - 1, Math.round(y1)); y++)
        for (let x = Math.max(0, Math.round(x0)); x <= Math.min(w - 1, Math.round(x1)); x++) buf[y * w + x] = c;
    },
    dot(x, y, hex) {
      set(Math.round(x), Math.round(y), col(hex));
    },
    disc(cx, cy, rad, hex) {
      const c = col(hex);
      for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++)
        for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++)
          if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + rad * 0.5) set(x, y, c);
    },
    raw: set,
  };
}

function toDataUrl(p) {
  const cv = document.createElement("canvas");
  cv.width = p.w;
  cv.height = p.h;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(p.w, p.h);
  new Uint32Array(img.data.buffer).set(p.buf);
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

// ---------- the town ----------

// City blocks: a street grid of 20 x 18 lots. Every lot takes the look of the hex it sits in.
const GX = 20;
const GY = 18;
const LX0 = CX - 10 - GX * 10; // the school sits in the middle of a lot
const LY0 = CY - 9 - GY * 13;
const NI = Math.ceil((WORLD_W - LX0) / GX);
const NJ = Math.ceil((WORLD_H - LY0) / GY);
const LX = (i) => LX0 + i * GX;
const LY = (j) => LY0 + j * GY;
// Avenues every fourth line (they carry on through woods and fields as country roads).
const mainV = (i) => i % 4 === 1;
const mainH = (j) => j % 4 === 2;

const URBAN = new Set(["street", "apartments", "shops", "parking", "houses", "ruins"]);
const NATURE = new Set(["woods", "field", "edge", "raid"]);

// The raids' compounds, past the map's edge (world pixels), and the kind of town around each.
const inBox = (b, x, y, pad = 0) => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad;
const RAID_DISTRICTS = {
  mall: ["shops", "parking", "shops", "street", "apartments"],
  hospital: ["street", "apartments", "park", "parking"],
  military_base: ["field", "woods", "field", "park"], // (the two out in the country: no buildings)
  institute: ["woods", "park", "field", "woods"],
};

function zoneAt(x, y) {
  const { q, r } = worldToHex(x, y);
  if (isSchoolHex(q, r)) return "school";
  if (hexDistance(q, r) > MAP_RADIUS) {
    // past the edge the town carries on: each raid in its own neighbourhood, the outskirts beyond
    for (const lm of LANDMARKS) {
      if (inBox(lairBox(lm), x, y, 4)) return "raid";
      if (Math.hypot(x - lm.at.x, y - lm.at.y) < 74) {
        const kinds = RAID_DISTRICTS[lm.id];
        return kinds[Math.floor(hash2(Math.floor(x / GX), Math.floor(y / GY), 17) * kinds.length)];
      }
    }
  }
  return hexTerrain(q, r);
}

// The river crosses the north of town (where map.js puts its river hexes).
const riverY = (x) => CY - 76 + Math.sin(x / 37) * 4 + Math.sin(x / 11 + 1) * 1.2;

// flat roofs: concrete, tar, gravel, brick parapets, an old copper-green one
const ROOFS = ["#7d828c", "#9a7a62", "#55595f", "#b3a894", "#8a5a4a", "#6a8a7a", "#a89a86", "#6e6a72"];
const HOUSE_ROOFS = ["#a8483a", "#4a6a9a", "#7a5aa8", "#6b4a2f", "#3f7a58", "#9a6a3a", "#5a5e6a"];
const CARS = ["#b03030", "#3f6fb5", "#e0a536", "#e8e8ea", "#4caf7d", "#2a2d33", "#8a5ad6", "#9aa0a8"];
const ASPHALT = "#4e525a", LOT_LINE = "#a8adb5", PAVING = "#8a8e96", PLAZA = "#a39d90", GRASS = "#5f9e5a", GRASS_LIT = "#6fae6a";
const WINDOW_DARK = "#1e2230", WINDOW_LIT = "#ffcf7a";

function tree(p, x, y, big, leaf = "#3f7a42") {
  const rad = big ? 2.6 : 1.9;
  for (let d = 1; d <= 2; d++) for (let a = 0; a < 12; a++) p.shade(x + d + Math.cos((a / 12) * Math.PI * 2) * rad * 0.8, y + d + Math.sin((a / 12) * Math.PI * 2) * rad * 0.8, 0.75);
  p.disc(x + 1, y + 1, rad, "#1f3a22");
  p.disc(x, y, rad, leaf);
  p.disc(x - 0.7, y - 0.7, rad * 0.45, lightOf(leaf));
}

// A shadow cast down and to the right (the low sun's up-left), `tall` pixels long.
function castShadow(p, x0, y0, x1, y1, tall) {
  for (let d = 1; d <= tall; d++) {
    const f = 0.5 + (d / (tall + 1)) * 0.35;
    for (let y = y0 + d; y <= y1 + d; y++) p.shade(x1 + d, y, f);
    for (let x = x0 + d; x < x1 + d; x++) p.shade(x, y1 + d, f);
  }
}

// A building from above: its shadow, a flat roof inside a parapet (lit up-left, shaded down-right),
// what a roof really carries (an air-conditioning unit, a vent, a skylight on a big one, a water tank
// on a tall one), and its front wall along the bottom with a row of windows, some lit.
function building(p, x0, y0, x1, y1, c, tall = 3, { windows = true, kit = true, lit = 0.28 } = {}) {
  castShadow(p, x0, y0, x1, y1, tall);
  p.rect(x0, y0, x1, y1, c);
  const w = x1 - x0, h = y1 - y0;
  if (w >= 5 && h >= 5) p.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, mix(c, "#1e1a24", 0.1)); // the roof membrane, below the parapet
  p.rect(x0, y0, x1, y0, lightOf(c));
  p.rect(x0, y0, x0, y1, mix(c, "#fff4dc", 0.12));
  p.rect(x1, y0, x1, y1, shadowOf(c));
  if (kit && w >= 5 && h >= 6) {
    const ax = x0 + 2 + Math.floor(hash2(x0, y0, 61) * Math.max(1, w - 5));
    const ay = y0 + 2 + Math.floor(hash2(x0, y0, 62) * Math.max(1, h - 7));
    p.rect(ax, ay, ax + 1, ay + 1, "#c4c8d0"); // the AC unit
    p.dot(ax + 1, ay + 1, "#7a808a");
    p.dot(x1 - 2, y0 + 2, "#3a3f48"); // a vent
    if (w >= 14 && h >= 9) for (let x = x0 + 3; x < x0 + Math.min(w - 3, 10); x += 2) p.dot(x, y0 + 2, "#9fc0d8"); // skylights
    if (tall >= 5) { p.disc(x1 - 3, y0 + 4, 1.4, "#6b4a2f"); p.dot(x1 - 4, y0 + 3, "#8a5f33"); } // the water tank
  }
  if (windows && h >= 5) {
    p.rect(x0, y1 - 1, x1, y1, mix(c, "#2a2430", 0.5));
    p.rect(x0, y1 - 2, x1, y1 - 2, shadowOf(c));
    for (let x = x0 + 1; x < x1; x += 2) {
      if (hash2(x, y1, 63) < lit) p.glowDot(x, y1 - 1, WINDOW_LIT);
      else p.dot(x, y1 - 1, WINDOW_DARK);
    }
  } else p.rect(x0, y1, x1, y1, shadowOf(c));
}

// A pitched roof from above: the ridge across the middle, the lit slope above it, a chimney.
function house(p, x, y, w, h, c, rnd) {
  castShadow(p, x, y, x + w, y + h, 2);
  const ridge = y + Math.floor(h / 2);
  p.rect(x, y, x + w, ridge, lightOf(c));
  p.rect(x, ridge + 1, x + w, y + h, c);
  p.rect(x, ridge, x + w, ridge, mix(lightOf(c), "#ffffff", 0.2));
  p.rect(x, y + h, x + w, y + h, mix(c, "#2a2430", 0.45));
  p.dot(x + 1, y + h, rnd() < 0.4 ? WINDOW_LIT : WINDOW_DARK);
  if (rnd() < 0.35) p.glowDot(x + 1, y + h, WINDOW_LIT);
  p.dot(x + w - 1, y + h, WINDOW_DARK);
  p.rect(x + w - 2, y + 1, x + w - 2, y + 2, "#6a4a3a");
}

function car(p, x, y, c, vertical) {
  if (vertical) {
    p.rect(x, y, x + 1, y + 2, c);
    p.dot(x, y, "#9fc7e8");
    p.dot(x + 1, y, "#9fc7e8");
  } else {
    p.rect(x, y, x + 2, y + 1, c);
    p.dot(x + 2, y, "#9fc7e8");
    p.dot(x + 2, y + 1, "#9fc7e8");
  }
}

// A burnt-out car, still smouldering.
function wreck(p, x, y, vertical) {
  if (vertical) p.rect(x, y, x + 1, y + 2, "#2a2420"); else p.rect(x, y, x + 2, y + 1, "#2a2420");
  p.dot(x + 1, y + 1, "#4a3a30");
}
function fire(p, x, y, r = 12) {
  p.glowDot(x, y, "#f08a3a");
  p.glowDot(x + 1, y - 1, "#f4d35e");
  p.glowDot(x - 1, y - 1, "#f08a3a");
  p.light({ x, y: y - 1, r, k: 0.7, c: [1.0, 0.55, 0.22] });
}

// A parking lot: bays either side of an aisle, the bays' lines, cars where they were left.
function parkingLot(p, x0, y0, x1, y1, rnd, full = 0.45) {
  p.rect(x0, y0, x1, y1, ASPHALT);
  const mid = Math.floor((y0 + y1) / 2);
  for (let x = x0 + 1; x <= x1; x += 3) {
    p.rect(x, y0 + 1, x, mid - 2, LOT_LINE);
    p.rect(x, mid + 2, x, y1 - 1, LOT_LINE);
    if (x + 2 <= x1) {
      if (rnd() < full) car(p, x + 1, y0 + 1, CARS[Math.floor(rnd() * CARS.length)], true);
      if (rnd() < full) car(p, x + 1, mid + 2, CARS[Math.floor(rnd() * CARS.length)], true);
    }
  }
}

// What each kind of lot looks like. `a` is the lot inside its sidewalks.
const LOTS = {
  // downtown offices: glass roofs, the tallest casting the longest shadows
  street(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, PAVING);
    const kind = rnd();
    if (kind < 0.45) {
      building(p, a.x0, a.y0, a.x1 - 3, a.y1 - 3, "#5f7a98", 5, { lit: 0.4 });
      for (let y = a.y0 + 3; y < a.y1 - 5; y += 3) for (let x = a.x0 + 2; x < a.x1 - 5; x += 3) p.dot(x, y, "#86a6c4");
    } else if (kind < 0.7) {
      // a small square: paving, a fountain, two trees
      p.rect(a.x0, a.y0, a.x1, a.y1, PLAZA);
      for (let x = a.x0; x <= a.x1; x += 2) for (let y = a.y0 + ((x / 2) % 2); y <= a.y1; y += 2) p.dot(x, y, "#9a9488");
      const cx = (a.x0 + a.x1) / 2, cy = (a.y0 + a.y1) / 2;
      p.disc(cx, cy, 3.2, "#d9d2c0");
      p.disc(cx, cy, 2.2, "#5fa8d8");
      p.dot(cx, cy, "#d6f0fb");
      tree(p, a.x0 + 2, a.y0 + 2, false);
      tree(p, a.x1 - 2, a.y1 - 3, false);
    } else {
      const mx = Math.floor((a.x0 + a.x1) / 2), my = Math.floor((a.y0 + a.y1) / 2);
      building(p, a.x0, a.y0, mx - 1, a.y1 - 3, ROOFS[Math.floor(rnd() * ROOFS.length)], 4);
      building(p, mx + 1, a.y0, a.x1 - 2, my, ROOFS[Math.floor(rnd() * ROOFS.length)], 3);
    }
  },
  // apartment towers: tall, with long shadows and a courtyard
  apartments(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, PAVING);
    const roof = () => ROOFS[Math.floor(rnd() * ROOFS.length)];
    if (rnd() < 0.5) building(p, a.x0, a.y0, a.x1 - 4, a.y1 - 4, roof(), 6);
    else {
      const mid = Math.floor((a.x0 + a.x1) / 2);
      building(p, a.x0, a.y0, mid - 2, a.y1 - 3, roof(), 5);
      building(p, mid + 1, a.y0 + 2, a.x1 - 2, a.y1 - 4, roof(), 5);
    }
    if (rnd() < 0.5) tree(p, a.x1 - 1, a.y1 - 1, false);
  },
  // a row of shops facing the street, each with its awning, the back alley behind
  shops(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#6b6f78");
    const n = rnd() < 0.5 ? 2 : 3;
    const w = Math.floor((a.x1 - a.x0 + 1) / n);
    const awnings = [["#d64545", "#f4f4f4"], ["#4caf7d", "#f4f4f4"], ["#3f6fb5", "#f4f4f4"], ["#e0a536", "#6b4a2f"]];
    for (let i = 0; i < n; i++) {
      const x0 = a.x0 + i * w;
      const x1 = i === n - 1 ? a.x1 : x0 + w - 1;
      building(p, x0, a.y0 + 2, x1 - 1, a.y1 - 3, ["#7a6f66", "#6b5f57", "#5d5a66", "#8a6a4f"][Math.floor(rnd() * 4)], 2, { lit: 0.35 });
      const [c1, c2] = awnings[Math.floor(rnd() * awnings.length)];
      for (let x = x0; x <= x1 - 1; x++) p.rect(x, a.y1 - 2, x, a.y1 - 1, (x - x0) % 2 ? c2 : c1);
    }
    if (rnd() < 0.5) { p.rect(a.x0 + 1, a.y0, a.x0 + 2, a.y0 + 1, "#3f6a4a"); } // a dumpster in the alley
  },
  // a building with its car park: the parking along one side, sometimes a whole lot of it
  parking(p, a, rnd) {
    if (rnd() < 0.25) {
      parkingLot(p, a.x0, a.y0, a.x1, a.y1, rnd);
      if (rnd() < 0.3) wreck(p, a.x0 + 3, a.y1 - 3, false);
      return;
    }
    const split = a.y0 + Math.floor((a.y1 - a.y0) * 0.55);
    building(p, a.x0, a.y0, a.x1 - 2, split - 2, ROOFS[Math.floor(rnd() * ROOFS.length)], 3);
    p.rect(a.x0, split, a.x1, a.y1, ASPHALT);
    for (let x = a.x0 + 1; x <= a.x1; x += 3) {
      p.rect(x, split + 1, x, a.y1 - 1, LOT_LINE);
      if (x + 2 <= a.x1 && rnd() < 0.5) car(p, x + 1, split + 1, CARS[Math.floor(rnd() * CARS.length)], true);
    }
  },
  // two houses with their gardens, a hedge, a driveway, now and then a pool
  houses(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, GRASS);
    for (let x = a.x0; x <= a.x1; x += 3) for (let y = a.y0 + (x % 2); y <= a.y1; y += 4) p.dot(x, y, GRASS_LIT);
    const mid = Math.floor((a.x0 + a.x1) / 2);
    for (let y = a.y0; y <= a.y1; y++) p.dot(mid, y, "#3f7a42"); // the hedge between them
    for (const [x0, x1] of [[a.x0, mid - 1], [mid + 1, a.x1]]) {
      const c = HOUSE_ROOFS[Math.floor(rnd() * HOUSE_ROOFS.length)];
      house(p, x0 + 1, a.y0 + 1, Math.min(5, x1 - x0 - 1), 4, c, rnd);
      p.rect(x0 + 2, a.y0 + 6, x0 + 3, a.y1, "#9a9a92"); // the driveway down to the street
      if (rnd() < 0.5) car(p, x0 + 2, a.y1 - 3, CARS[Math.floor(rnd() * CARS.length)], true);
      if (rnd() < 0.2) { p.rect(x1 - 3, a.y1 - 4, x1 - 1, a.y1 - 2, "#5fb8e0"); p.dot(x1 - 3, a.y1 - 4, "#a8e0f4"); }
      else tree(p, x1 - 2, a.y1 - 3, rnd() < 0.5);
    }
    for (let x = a.x0; x <= a.x1; x += 2) p.dot(x, a.y1, "#e9dcc0"); // the picket fence
  },
  // a park: lawn, a winding path, a pond or a big tree, benches, a playground now and then
  park(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, GRASS_LIT);
    for (let x = a.x0; x <= a.x1; x += 4) for (let y = a.y0 + (x % 3); y <= a.y1; y += 5) p.dot(x, y, "#7fbd74");
    const my = Math.floor((a.y0 + a.y1) / 2);
    for (let x = a.x0; x <= a.x1; x++) p.rect(x, my + Math.round(Math.sin(x / 3)), x, my + 1 + Math.round(Math.sin(x / 3)), "#c9b58c");
    if (rnd() < 0.4) {
      p.disc(a.x1 - 5, a.y1 - 4, 2.8, "#5fa8d8");
      p.dot(a.x1 - 6, a.y1 - 5, "#8fc8ef");
    } else if (rnd() < 0.5) {
      p.rect(a.x1 - 7, a.y1 - 5, a.x1 - 2, a.y1 - 1, "#c9a26a"); // the playground's sandpit, a slide
      p.rect(a.x1 - 5, a.y1 - 4, a.x1 - 5, a.y1 - 2, "#d64545");
    } else tree(p, a.x1 - 4, a.y1 - 3, true);
    tree(p, a.x0 + 3, a.y0 + 3, true);
    tree(p, a.x1 - 3, a.y0 + 2, false);
    p.rect(a.x0 + 3, my + 3, a.x0 + 5, my + 3, "#8a5f33"); // a bench by the path
  },
  // a burnt-out block: a gutted shell, its rubble, scorch marks, a fire still going
  ruins(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#5a5048");
    const sx = a.x0 + 1, sy = a.y0 + 1, ex = a.x1 - 3, ey = a.y1 - 3;
    p.rect(sx, sy, ex, ey, "#3a322c"); // the gutted floor
    for (const [x0, y0, x1, y1] of [[sx, sy, ex, sy], [sx, sy, sx, ey], [ex, sy, ex, sy + 4]]) p.rect(x0, y0, x1, y1, "#8a7f76"); // walls still standing
    p.rect(sx + 1, sy + 1, ex - 1, sy + 1, "#6a5f56");
    for (let i = 0; i < 4; i++) { // rubble heaps where the rest came down
      const x = sx + 2 + Math.floor(rnd() * (ex - sx - 3)), y = sy + 2 + Math.floor(rnd() * (ey - sy - 3));
      p.rect(x, y, x + 1, y, "#7a6f66");
      p.dot(x, y - 1, "#9a8f86");
    }
    p.disc(ex - 2, ey - 1, 2.4, "#241e1a"); // scorch
    if (rnd() < 0.5) fire(p, ex - 3, sy + 4, 13);
    if (rnd() < 0.4) wreck(p, a.x0 + 2, a.y1 - 1, false);
  },
  woods(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#2f5a33");
    for (let i = 0; i < 7; i++) tree(p, a.x0 + 2 + rnd() * (a.x1 - a.x0 - 3), a.y0 + 2 + rnd() * (a.y1 - a.y0 - 3), rnd() < 0.4, rnd() < 0.5 ? "#3f7a42" : "#356b39");
  },
  // farmland: furrows, a hay bale or two, a scarecrow now and then
  field(p, a, rnd) {
    const wheat = rnd() < 0.5;
    const across = rnd() < 0.5;
    for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) {
      const row = across ? y : x;
      p.dot(x, y, row % 3 === 0 ? (wheat ? "#c9b458" : "#a8c65a") : (wheat ? "#a89a44" : "#8fae4a"));
    }
    if (rnd() < 0.5) for (let k = 0; k < 2; k++) {
      const x = a.x0 + 3 + Math.floor(rnd() * (a.x1 - a.x0 - 6)), y = a.y0 + 3 + Math.floor(rnd() * (a.y1 - a.y0 - 6));
      p.disc(x, y, 1.4, "#e0b84a");
      p.dot(x - 1, y - 1, "#f0d070");
      p.shade(x + 2, y + 1, 0.7);
    }
  },
  river(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, GRASS);
    tree(p, a.x0 + 3 + rnd() * 12, a.y0 + 3 + rnd() * 10, true);
  },
  school(p, a) {
    for (let x = a.x0; x <= a.x1; x++) p.rect(x, a.y0, x, a.y1, Math.floor(x / 3) % 2 ? "#658f56" : "#719c60");
  },
  // a raid's grounds (its compound is painted over them)
  raid(p, a) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#3a3634");
  },
  edge(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#26482a");
    for (let i = 0; i < 6; i++) tree(p, a.x0 + 2 + rnd() * (a.x1 - a.x0 - 3), a.y0 + 2 + rnd() * (a.y1 - a.y0 - 3), rnd() < 0.5, "#2f5f33");
  },
};

// ---------- the places, from above ----------
// Each place takes a whole block of the street grid — the 2x2 lots round its hex, streets and
// sidewalks still running round the outside — and is drawn from above like the rest of the town, so
// it reads as part of the street it's on. `A` is the block inside its sidewalks (about 34 x 30).

// The block a place sits on: the lot its hex is in and the lots on the side its centre leans to.
function placeBlock(place) {
  const { x, y } = hexToWorld(place.hex.q, place.hex.r);
  const fi = (x - LX0) / GX, fj = (y - LY0) / GY;
  const i = Math.floor(fi), j = Math.floor(fj);
  const i0 = fi - i < 0.5 ? i - 1 : i, j0 = fj - j < 0.5 ? j - 1 : j;
  return { i0, j0, i1: i0 + 1, j1: j0 + 1, x0: LX(i0), y0: LY(j0), x1: LX(i0 + 2) - 1, y1: LY(j0 + 2) - 1 };
}
const BLOCKS = new Map(LOCATIONS.map((pl) => [pl.id, placeBlock(pl)]));
// Where a place, or a raid's compound (walls and all), sits on the map, in world pixels: ui.js frames it.
export const placeBox = (id) => BLOCKS.get(id);
const blockAt = (i, j) => [...BLOCKS].find(([, b]) => i >= b.i0 && i <= b.i1 && j >= b.j0 && j <= b.j1)?.[0] || null;

// Drawing helpers in the block's own coordinates.
function kit(p, A, rnd) {
  const X = (x) => A.x0 + x, Y = (y) => A.y0 + y;
  return {
    W: A.x1 - A.x0, H: A.y1 - A.y0, rnd,
    r: (x, y, w, h, c) => p.rect(X(x), Y(y), X(x + w - 1), Y(y + h - 1), c),
    dot: (x, y, c) => p.dot(X(x), Y(y), c),
    glow: (x, y, c) => p.glowDot(X(x), Y(y), c),
    light: (x, y, r, c, k = 0.7) => p.light({ x: X(x), y: Y(y), r, k, c }),
    disc: (x, y, rad, c) => p.disc(X(x), Y(y), rad, c),
    bld: (x, y, w, h, c, tall = 3, o) => building(p, X(x), Y(y), X(x + w - 1), Y(y + h - 1), c, tall, o),
    house: (x, y, w, h, c) => house(p, X(x), Y(y), w, h, c, rnd),
    car: (x, y, c, v = true) => car(p, X(x), Y(y), c, v),
    tree: (x, y, big = false, leaf) => tree(p, X(x), Y(y), big, leaf),
    lot: (x, y, w, h, full) => parkingLot(p, X(x), Y(y), X(x + w - 1), Y(y + h - 1), rnd, full),
    shade: (x, y, f) => p.shade(X(x), Y(y), f),
    cross: (x, y, c) => { for (const [dx, dy] of [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [-2, 0], [-1, 0], [1, 0], [2, 0]]) p.dot(X(x + dx), Y(y + dy), c); },
    fence: (x, y, w, h, c) => { for (let i = 0; i < w; i++) { p.dot(X(x + i), Y(y), c); p.dot(X(x + i), Y(y + h - 1), c); } for (let i = 0; i < h; i++) { p.dot(X(x), Y(y + i), c); p.dot(X(x + w - 1), Y(y + i), c); } },
  };
}

const POI_ART = {
  corner_store(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PLAZA);
    k.bld(2, 3, 17, 13, "#8a6a4f", 2, { lit: 0.6 });
    for (let x = 2; x < 19; x++) k.r(x, 16, 1, 2, x % 2 ? "#f4f4f4" : "#d64545"); // the awning
    k.lot(21, 2, 13, 14, 0.4);
    k.r(3, 21, 3, 2, "#3f6a4a"); // dumpster
    k.tree(30, 25, true);
    k.tree(8, 25);
  },
  pharmacy(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PLAZA);
    k.bld(3, 2, 22, 15, "#e4e2dc", 2, { lit: 0.5 });
    k.cross(13, 8, "#3fae5a");
    k.r(28, 0, 5, k.H + 1, ASPHALT); // the drive-through lane
    k.r(26, 7, 2, 3, "#c4c8d0");
    k.car(30, 12, "#3f6fb5");
    k.lot(2, 21, 24, 9, 0.5);
  },
  supermarket(k) {
    k.bld(1, 1, 32, 12, "#9aa0a8", 3, { lit: 0.6 });
    for (const x of [6, 14, 22]) { k.r(x, 4, 2, 2, "#c4c8d0"); k.dot(x + 1, 5, "#7a808a"); }
    k.r(1, 12, 32, 1, "#d64545"); // the sign over the doors
    k.lot(0, 16, 34, 14, 0.55);
    for (const [x, y] of [[4, 15], [5, 15], [6, 15], [26, 15], [27, 15]]) k.dot(x, y, "#c8ccd2"); // trolleys left out
  },
  hardware_store(k) {
    k.r(0, 0, k.W + 1, k.H + 1, "#8a7f6a"); // the yard's gravel
    k.bld(1, 2, 20, 15, "#c8742e", 2, { lit: 0.4 });
    for (const [x, y] of [[24, 3], [24, 8], [29, 3], [29, 8]]) { k.r(x, y, 4, 3, "#b88a52"); k.r(x, y, 4, 1, "#d8aa72"); } // lumber stacks
    k.r(25, 13, 3, 2, "#e0a536"); // the forklift
    k.dot(27, 12, "#2a2a30");
    k.lot(1, 21, 33, 9, 0.4);
  },
  urgent_care(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PLAZA);
    k.bld(3, 3, 21, 14, "#eef0f2", 2, { lit: 0.55 });
    k.cross(13, 9, "#d64545");
    k.r(26, 5, 7, 11, "#c8ccd2"); // the ambulance bay
    k.r(28, 8, 3, 6, "#f4f4f4"); k.r(28, 10, 3, 1, "#d64545");
    k.glow(29, 8, "#ff4040"); k.light(29, 8, 10, [1, 0.25, 0.2], 0.6);
    k.lot(2, 21, 31, 9, 0.35);
  },
  police_station(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PAVING);
    k.bld(2, 2, 21, 14, "#3f5f86", 3, { lit: 0.5 });
    k.r(19, 3, 1, 5, "#c4c8d0"); // the radio mast
    k.disc(11, 8, 1.6, "#d9be6a"); // the badge on the roof
    k.r(26, 1, 1, 8, "#ccd2da"); k.r(27, 1, 3, 2, "#3f6fb5"); // the flag
    k.lot(0, 19, 34, 11, 0);
    for (const x of [2, 8, 14, 20]) { k.r(x, 20, 2, 3, "#f4f4f4"); k.r(x, 21, 2, 1, "#1a1c22"); } // the squad cars
    for (let x = 26; x < 34; x++) k.dot(x, 24, x % 2 ? "#f4f4f4" : "#d64545"); // the barrier
    k.glow(3, 20, "#4a7aff"); k.glow(9, 20, "#ff4040");
  },
  electronics_store(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PLAZA);
    k.bld(2, 3, 26, 13, "#3a3f4c", 2, { lit: 0.3 });
    k.disc(8, 8, 2.2, "#c4c8d0"); k.dot(8, 8, "#7a808a"); // the satellite dish
    k.r(22, 5, 1, 5, "#9aa2ac");
    for (let x = 2; x < 28; x++) k.glow(x, 16, x % 3 ? "#5fc8ff" : "#8ad8ff"); // the blue neon strip
    k.light(15, 17, 18, [0.4, 0.75, 1.0], 0.5);
    k.lot(1, 20, 32, 10, 0.4);
    k.r(29, 4, 4, 7, "#e8e8ea"); k.r(29, 4, 4, 2, "#9fc7e8"); // the delivery van
  },
  neighborhood(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS);
    const cx = 17, cy = 12;
    k.r(cx - 2, cy, 5, k.H - cy + 1, "#41454d"); // the road in, to the turning circle
    k.disc(cx, cy, 6, "#41454d");
    k.disc(cx, cy, 2, GRASS_LIT);
    const roofs = HOUSE_ROOFS;
    for (const [x, y, i] of [[2, 2, 0], [12, 0, 1], [24, 2, 2], [2, 16, 3], [25, 16, 4]]) k.house(x, y, 6, 4, roofs[i]);
    k.r(27, 23, 4, 3, "#5fb8e0"); k.dot(27, 23, "#a8e0f4"); // a pool
    k.tree(8, 26, true); k.tree(31, 9); k.tree(3, 10);
    for (let x = 0; x <= k.W; x += 2) k.dot(x, k.H, "#e9dcc0");
  },
  farmstead(k) {
    for (let y = 0; y <= k.H; y++) k.r(0, y, k.W + 1, 1, y % 3 ? "#8fae4a" : "#a8c65a");
    k.r(1, 1, 20, 18, "#8a7a5a"); // the farmyard
    k.bld(2, 2, 11, 9, "#a83a2e", 2, { windows: false, kit: false }); // the barn
    k.r(2, 6, 11, 1, "#c85a4a");
    k.disc(17, 5, 2.6, "#9aa2ac"); k.disc(17, 5, 1.2, "#ccd2da"); // the silo
    k.house(3, 13, 6, 4, "#6b4a2f");
    k.r(14, 12, 3, 2, "#3f8a3a"); k.dot(16, 14, "#1a1a1e"); // the tractor
    for (const [x, y] of [[26, 6], [30, 9], [24, 22]]) { k.disc(x, y, 1.4, "#e0b84a"); k.dot(x - 1, y - 1, "#f0d070"); }
    k.fence(0, 0, 22, 20, "#a8946a");
  },
  gas_station(k) {
    k.r(0, 0, k.W + 1, k.H + 1, ASPHALT);
    k.bld(3, 4, 17, 10, "#ecece8", 1, { windows: false, kit: false }); // the canopy
    k.r(3, 4, 17, 1, "#d64545");
    for (const x of [6, 11, 16]) k.dot(x, 9, "#d64545"); // the pumps, under it
    k.bld(23, 3, 9, 10, "#8a6a4f", 2, { lit: 0.6 });
    k.r(4, 19, 14, 3, "#c8ccd2"); k.r(16, 19, 3, 3, "#d64545"); // the tanker, abandoned
    k.car(25, 20, "#b03030"); k.car(29, 22, "#e0a536");
    k.r(31, 15, 1, 3, "#9aa2ac"); k.r(30, 14, 3, 1, "#d64545"); // the price sign
  },
  garden_center(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS_LIT);
    for (const [x, w] of [[2, 13], [18, 13]]) { // two glasshouses
      k.bld(x, 2, w, 11, "#bfe0d0", 1, { windows: false, kit: false });
      for (let xx = x + 2; xx < x + w - 1; xx += 2) k.r(xx, 3, 1, 9, "#9cc8b8");
    }
    for (let y = 17; y < 28; y += 3) for (let x = 2; x < 32; x += 2) k.dot(x, y, (x + y) % 4 ? "#3f8a3a" : "#e27fa8"); // rows of plants
    k.r(26, 17, 6, 5, "#a07a4c");
  },
  fire_station(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS);
    k.bld(2, 2, 22, 13, "#b8342a", 3, { lit: 0.5 });
    k.bld(26, 2, 5, 5, "#8a2a22", 6, { windows: false }); // the hose tower
    k.r(2, 15, 22, 9, ASPHALT); // the apron
    for (const x of [4, 12]) { k.r(x, 16, 3, 7, "#d64545"); k.r(x + 1, 16, 1, 7, "#e8e8ea"); } // the engines, ladders on top
    k.glow(5, 16, "#ff4040"); k.glow(13, 16, "#ff4040");
    k.light(10, 18, 12, [1, 0.25, 0.2], 0.5);
    k.tree(30, 22, true); k.tree(26, 27);
  },
  church(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS);
    k.bld(14, 2, 7, 24, "#5a5e6a", 3, { windows: false }); // the nave
    k.bld(8, 9, 19, 6, "#5a5e6a", 3, { windows: false }); // the transept
    k.r(15, 2, 5, 1, "#7a7e8a");
    k.bld(15, 22, 5, 5, "#4a4e5a", 6, { windows: false }); // the steeple
    k.dot(17, 23, "#d9be6a");
    for (let y = 18; y < 29; y += 3) for (const x of [2, 5, 8, 26, 29, 32]) { k.dot(x, y, "#c4c8d0"); k.dot(x, y + 1, "#8a8e96"); } // the graveyard
    k.tree(3, 4, true); k.tree(30, 5, true);
    k.r(16, 27, 3, 3, "#c9b58c");
  },
  marina(k) {
    k.r(0, 0, k.W + 1, 15, "#3a6ea5"); // the basin
    for (let x = 1; x < 34; x += 5) if (x % 3) k.r(x, 5, 2, 1, "#6fa0d8");
    k.r(0, 15, k.W + 1, 2, "#a8946a"); // the quay
    for (const x of [4, 14, 24]) { k.r(x, 2, 1, 13, "#8a5f33"); k.r(x + 2, 4, 2, 5, "#f4f4f4"); k.dot(x + 2, 4, "#d64545"); } // jetties, boats tied up
    k.bld(2, 19, 14, 9, "#3f6f8a", 2, { lit: 0.4 }); // the boathouse
    k.lot(19, 19, 15, 11, 0.4);
  },
  warehouse(k) {
    k.r(0, 0, k.W + 1, k.H + 1, ASPHALT);
    k.bld(1, 1, 32, 13, "#7a7f86", 3, { kit: false });
    for (let x = 3; x < 32; x += 2) k.r(x, 2, 1, 10, "#6a6f76"); // the corrugated roof
    for (const x of [4, 12, 20]) { k.r(x, 16, 4, 7, "#e8e8ea"); k.r(x, 16, 4, 2, "#3f6fb5"); } // trucks at the docks
    for (const [x, y, c] of [[27, 17, "#b04a3a"], [27, 21, "#3f6fb5"], [27, 25, "#3f8a5a"], [31, 19, "#e0a536"]]) { k.r(x, y, 4, 3, c); k.r(x, y, 4, 1, lightOf(c)); } // containers
  },
  library(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS);
    k.bld(5, 3, 24, 14, "#c9b89a", 3, { lit: 0.5 });
    k.disc(17, 9, 3.2, "#5f8a8a"); k.disc(16, 8, 1.4, "#8ac0c0"); // the dome
    for (let x = 7; x < 28; x += 3) k.dot(x, 16, "#ece4d0"); // the columns
    k.r(15, 17, 5, 13, "#d9d2c0"); // the steps and the path
    for (const x of [8, 25]) k.r(x, 22, 3, 1, "#8a5f33");
    k.tree(3, 24, true); k.tree(31, 23, true); k.tree(31, 4);
  },
  petting_zoo(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS_LIT);
    for (const [x, y, w, h, an] of [[1, 1, 14, 11, "#f4f4f4"], [18, 1, 15, 11, "#a87a4a"], [1, 16, 14, 13, "#f0a0a8"]]) {
      k.r(x, y, w, h, "#8aa850");
      k.fence(x, y, w, h, "#c9b58c");
      for (let i = 0; i < 3; i++) k.r(x + 3 + i * 4, y + 3 + (i % 2) * 3, 2, 1, an);
    }
    k.bld(20, 17, 8, 7, "#a83a2e", 2, { windows: false, kit: false });
    k.disc(29, 26, 2.6, "#5fa8d8");
  },
  army_surplus(k) {
    k.r(0, 0, k.W + 1, k.H + 1, "#7a7a62");
    k.bld(2, 2, 20, 13, "#5a6b3a", 2, { lit: 0.3 });
    for (const [x, y] of [[5, 5], [13, 8], [9, 10]]) k.disc(x, y, 1.6, "#4a5a30"); // camo netting
    for (let x = 1; x < 23; x += 2) { k.r(x, 18, 2, 1, "#c2b083"); k.dot(x, 19, "#9a8862"); } // sandbags
    k.r(25, 3, 4, 7, "#4a5a30"); k.r(25, 3, 4, 2, "#6a7a48"); // the jeep
    for (const [x, y] of [[26, 14], [30, 14], [28, 18]]) { k.r(x, y, 3, 3, "#8a6a3a"); k.r(x, y, 3, 1, "#a8884a"); } // crates
    k.lot(2, 22, 30, 8, 0.3);
  },
  diner(k) {
    k.lot(0, 0, k.W + 1, 9, 0.5);
    k.bld(3, 11, 24, 9, "#c8d2da", 2, { lit: 0.7 }); // the chrome diner
    k.r(3, 15, 24, 1, "#3fb8b0");
    for (let x = 6; x < 22; x++) k.glow(x, 22, x % 2 ? "#ff5a8a" : "#ff2a5a"); // the neon sign
    k.light(14, 22, 16, [1, 0.3, 0.5], 0.55);
    k.lot(0, 24, k.W + 1, 6, 0.4);
    k.tree(31, 14, true);
  },
  sporting_goods(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PAVING);
    k.bld(1, 2, 18, 13, "#4a6aa0", 2, { lit: 0.4 });
    k.r(21, 1, 12, 16, "#b8643a"); // the basketball court
    k.fence(21, 1, 12, 16, "#ece6da");
    k.r(21, 8, 12, 1, "#ece6da");
    k.disc(27, 8, 1.6, "#ece6da"); k.disc(27, 8, 0.8, "#b8643a");
    k.dot(27, 2, "#f4f4f4"); k.dot(27, 15, "#f4f4f4");
    k.lot(1, 20, 32, 10, 0.4);
  },
  apartments(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PAVING);
    k.bld(4, 1, 20, 20, "#9a8f86", 7, { lit: 0.45 }); // the tower
    k.r(26, 4, 7, 9, GRASS); // its courtyard, a playground
    k.r(28, 6, 3, 3, "#c9a26a"); k.dot(29, 7, "#d64545");
    k.lot(2, 25, 31, 5, 0.6);
    k.tree(31, 15, true);
  },
  vet_clinic(k) {
    k.r(0, 0, k.W + 1, k.H + 1, GRASS);
    k.bld(3, 3, 17, 11, "#d8d0c0", 2, { lit: 0.5 });
    k.dot(11, 7, "#d64545"); k.dot(10, 8, "#d64545"); k.dot(12, 8, "#d64545"); k.dot(11, 9, "#d64545"); // a paw on the roof
    k.fence(22, 2, 11, 13, "#c9b58c"); // the dog run
    for (const [x, y] of [[25, 6], [29, 9], [26, 11]]) { k.r(x, y, 2, 1, "#8a5f33"); k.dot(x + 2, y, "#6b4a2f"); }
    k.lot(2, 19, 22, 10, 0.3);
    k.tree(29, 23, true); k.tree(31, 28);
  },
};

// ---------- the raids: compounds past the edge of town, meant to be seen from across the map ----------
// Each is twice the size of a place, walled in concrete, hazard-striped at its gate, with its own
// light pouring out (red alarm beacons, green for the institute), fires burning round it and a horde
// pressed up against the walls.
const RAID_W = 64;
const RAID_H = 56;
const lairBox = (lm) => ({ x0: Math.round(lm.at.x - RAID_W / 2), y0: Math.round(lm.at.y - RAID_H / 2), x1: Math.round(lm.at.x + RAID_W / 2) - 1, y1: Math.round(lm.at.y + RAID_H / 2) - 1 });

export const raidBox = (lm) => { const b = lairBox(lm); return { x0: b.x0 - 4, y0: b.y0 - 4, x1: b.x1 + 4, y1: b.y1 + 4 }; };

const RAID_ART = {
  mall(k) {
    k.r(0, 0, k.W + 1, k.H + 1, ASPHALT);
    k.lot(0, 38, k.W + 1, 18, 0.5); // the car park out front
    k.bld(12, 4, 40, 30, "#b8aa94", 4, { lit: 0.15 }); // the main hall
    k.bld(2, 6, 12, 26, "#a8423a", 5, { lit: 0.1 }); // the anchor stores either end
    k.bld(50, 6, 12, 26, "#3f5f86", 5, { lit: 0.1 });
    for (let x = 15; x < 50; x++) k.glow(x, 18, x % 3 ? "#9fd0e8" : "#c8e8f4"); // the glass roof down the middle, lit from inside
    for (let y = 8; y < 30; y++) k.glow(32, y, y % 3 ? "#9fd0e8" : "#c8e8f4");
    k.light(32, 18, 26, [0.6, 0.8, 1.0], 0.35);
    k.disc(32, 18, 4, "#c8a050"); k.disc(31, 17, 2, "#e0c070"); // the food court's dome
    for (const [x, y] of [[8, 44], [50, 48], [28, 50]]) wreckAt(k, x, y);
    k.r(31, 36, 2, 4, "#9aa2ac"); k.r(27, 35, 10, 2, "#d64545"); // the sign pylon
  },
  hospital(k) {
    k.r(0, 0, k.W + 1, k.H + 1, PAVING);
    k.bld(4, 4, 13, 42, "#e8eaee", 5, { lit: 0.2 }); // the wings
    k.bld(47, 4, 13, 42, "#e8eaee", 5, { lit: 0.2 });
    k.bld(17, 16, 30, 16, "#dcdee4", 4, { lit: 0.2 }); // the block between them
    k.disc(32, 24, 6, "#3a3f48"); k.disc(32, 24, 5, "#4e525a"); // the helipad
    k.r(30, 21, 1, 7, "#f4f4f4"); k.r(34, 21, 1, 7, "#f4f4f4"); k.r(30, 24, 5, 1, "#f4f4f4");
    k.cross(10, 10, "#d64545"); k.cross(53, 10, "#d64545");
    k.r(22, 40, 20, 4, "#c8ccd2"); // the emergency bay
    for (const x of [24, 30, 36]) { k.r(x, 44, 3, 6, "#f4f4f4"); k.r(x, 46, 3, 1, "#d64545"); }
  },
  military_base(k) {
    k.r(0, 0, k.W + 1, k.H + 1, "#7a6a4a"); // packed dirt
    for (const y of [5, 14, 23]) k.bld(4, y, 22, 6, "#5a6b3a", 2, { lit: 0.1 }); // the barracks
    k.disc(46, 14, 8, "#5a5e66"); k.disc(46, 14, 7, "#6b6f78"); // the helipad, its helicopter
    k.r(42, 13, 9, 3, "#3f4a2a"); k.r(46, 9, 1, 11, "#2a3020"); k.r(41, 14, 11, 1, "#2a3020");
    for (const [x, y] of [[8, 36], [20, 38]]) { k.r(x, y, 7, 5, "#4a5a30"); k.r(x + 2, y + 1, 3, 3, "#3f4a2a"); k.r(x + 5, y + 2, 5, 1, "#2a3020"); } // tanks
    for (let a = 0; a < 18; a++) { const t = (a / 18) * Math.PI * 2; k.dot(Math.round(46 + Math.cos(t) * 11), Math.round(40 + Math.sin(t) * 7), "#c2b083"); } // a sandbag ring
    for (const [x, y] of [[44, 38], [48, 41], [46, 36]]) k.r(x, y, 3, 2, "#8a6a3a");
    for (const [x, y] of [[1, 1], [k.W - 3, 1], [1, k.H - 3], [k.W - 3, k.H - 3]]) { // the watchtowers, their searchlights still on
      k.bld(x, y, 3, 3, "#5a5048", 4, { windows: false, kit: false });
      k.glow(x + 1, y + 1, "#fff6d0");
      k.light(x + 1, y + 1, 16, [1, 0.95, 0.8], 0.6);
    }
  },
  institute(k) {
    k.r(0, 0, k.W + 1, k.H + 1, "#5a5a44"); // the lawn, dead
    k.bld(4, 4, 22, 18, "#e4e8ea", 4, { lit: 0.2 }); // the labs
    k.bld(38, 4, 22, 18, "#e4e8ea", 4, { lit: 0.2 });
    k.r(4, 8, 22, 1, "#3fb8a8"); k.r(38, 8, 22, 1, "#3fb8a8");
    k.disc(32, 36, 11, "#3a4a48"); k.disc(32, 36, 9, "#5a7a78"); k.disc(31, 35, 6, "#7aa8a4"); // the containment dome
    for (let a = 0; a < 28; a++) { const t = (a / 28) * Math.PI * 2; k.glow(Math.round(32 + Math.cos(t) * 10), Math.round(36 + Math.sin(t) * 10), "#7fff5a"); }
    k.light(32, 36, 34, [0.45, 1.0, 0.35], 0.85);
    for (const [x, y] of [[8, 30], [12, 34], [52, 30], [55, 34], [9, 44]]) { k.glow(x, y, "#9aff5a"); k.glow(x + 1, y, "#5ad83a"); k.light(x, y, 9, [0.5, 1, 0.3], 0.5); } // what leaked
    for (const [x, y] of [[48, 44], [51, 45], [49, 47]]) { k.r(x, y, 2, 2, "#e0a536"); k.dot(x, y, "#2a2a30"); } // drums
  },
};
function wreckAt(k, x, y) {
  k.r(x, y, 3, 2, "#2a2420");
  k.glow(x + 1, y - 1, "#f08a3a"); k.glow(x + 2, y - 2, "#f4d35e");
  k.light(x + 1, y - 1, 12, [1.0, 0.55, 0.22], 0.7);
}

// The walls round a raid: thick concrete, barbed on top, a hazard-striped barricade across the gate,
// alarm beacons at the corners, a scorched ring outside, fires, and the dead crowding the walls.
function raidCompound(p, lm, b) {
  const rnd = rngFor(hash2(lm.at.x, lm.at.y, 91) * 4294967296);
  const cx = lm.at.x, cy = lm.at.y;
  for (let y = b.y0 - 14; y <= b.y1 + 14; y++) for (let x = b.x0 - 16; x <= b.x1 + 16; x++) { // scorched earth round it
    const d = Math.max(Math.abs(x - cx) / (RAID_W / 2 + 16), Math.abs(y - cy) / (RAID_H / 2 + 14));
    if (d > 1 || d < 0.7) continue;
    if (hash2(x, y, 92) < (1 - d) * 2.2) p.shade(x, y, 0.62);
  }
  const k = kit(p, { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 }, rnd);
  RAID_ART[lm.id](k);
  const W = "#9a9690", WL = "#bab6b0", WS = "#5a5652";
  for (let x = b.x0 - 3; x <= b.x1 + 3; x++) for (const y of [b.y0 - 3, b.y0 - 2, b.y1 + 2, b.y1 + 3]) {
    if (y >= b.y1 + 2 && Math.abs(x - cx) <= 5) continue; // the gate
    p.dot(x, y, y === b.y0 - 3 ? WL : y === b.y1 + 3 ? WS : W);
  }
  for (let y = b.y0 - 3; y <= b.y1 + 3; y++) for (const x of [b.x0 - 3, b.x0 - 2, b.x1 + 2, b.x1 + 3]) p.dot(x, y, x === b.x0 - 3 ? WL : x === b.x1 + 3 ? WS : W);
  for (let x = b.x0 - 3; x <= b.x1 + 3; x += 2) p.dot(x, b.y0 - 4, "#3c3c44"); // the wire along the top
  castShadow(p, b.x0 - 3, b.y0 - 3, b.x1 + 3, b.y1 + 3, 2);
  for (let x = cx - 5; x <= cx + 5; x++) for (const y of [b.y1 + 2, b.y1 + 3]) p.dot(x, y, Math.floor((x + y) / 2) % 2 ? "#f4c542" : "#1d1a20"); // the gate's barricade
  const beacon = lm.id === "institute" ? ["#7fff5a", [0.45, 1, 0.35]] : ["#ff3a2a", [1, 0.22, 0.16]];
  for (const [x, y] of [[b.x0 - 3, b.y0 - 3], [b.x1 + 3, b.y0 - 3], [b.x0 - 3, b.y1 + 3], [b.x1 + 3, b.y1 + 3], [cx - 6, b.y1 + 3], [cx + 6, b.y1 + 3]]) {
    p.glowDot(x, y, beacon[0]);
    p.light({ x, y, r: 18, k: 0.75, c: beacon[1] });
  }
  p.light({ x: cx, y: cy, r: 70, k: 0.4, c: beacon[1] }); // the whole compound lit by it
  for (let n = 0; n < 6; n++) { // fires burning round it
    const t = rnd() * Math.PI * 2;
    const fx = Math.round(cx + Math.cos(t) * (RAID_W / 2 + 9)), fy = Math.round(cy + Math.sin(t) * (RAID_H / 2 + 8));
    p.disc(fx, fy + 1, 1.6, "#241e1a");
    fire(p, fx, fy, 14);
  }
  for (let n = 0; n < 220; n++) { // the horde, thickest at the gate
    const atGate = n < 70;
    const t = atGate ? Math.PI / 2 + (rnd() - 0.5) * 0.9 : rnd() * Math.PI * 2;
    const rr = 1.08 + rnd() * (atGate ? 0.35 : 0.22);
    const x = Math.round(cx + Math.cos(t) * (RAID_W / 2 + 4) * rr), y = Math.round(cy + Math.sin(t) * (RAID_H / 2 + 4) * rr);
    p.dot(x, y, rnd() < 0.5 ? "#7a9a5a" : "#8aa868");
    p.dot(x, y + 1, "#3a4a3a");
    if (rnd() < 0.15) p.dot(x + 1, y + 1, "#6a1a1a"); // blood
  }
}

let baseUrl = null;

// The whole town as a data: URL (drawn once — the town never changes).
export function cityBaseUrl() {
  if (baseUrl) return baseUrl;
  const p = painter(WORLD_W, WORLD_H);
  const zone = [];
  const poi = [];
  for (let i = 0; i < NI; i++) {
    zone.push([]);
    poi.push([]);
    for (let j = 0; j < NJ; j++) {
      zone[i].push(zoneAt(LX(i) + GX / 2, LY(j) + GY / 2));
      poi[i].push(blockAt(i, j));
    }
  }
  const zoneOf = (i, j) => (i < 0 || j < 0 || i >= NI || j >= NJ ? "edge" : zone[i][j]);
  const poiOf = (i, j) => (i < 0 || j < 0 || i >= NI || j >= NJ ? null : poi[i][j]);
  const sidewalk = (x0, y0, x1, y1) => {
    p.rect(x0, y0, x1, y1, PAVING);
    for (let x = x0; x <= x1; x += 3) for (let y = y0; y <= y1; y += 3) p.dot(x, y, "#7a7e86");
  };

  // 1. lots (a place's block is drawn whole, below)
  for (let i = 0; i < NI; i++) {
    for (let j = 0; j < NJ; j++) {
      if (poi[i][j]) continue;
      const z = zone[i][j];
      const rnd = rngFor(hash2(i, j, 5) * 4294967296);
      const full = { x0: LX(i), y0: LY(j), x1: LX(i + 1) - 1, y1: LY(j + 1) - 1 };
      if (NATURE.has(z) || z === "school" || z === "river" || (z === "park" && full.y1 < riverY(full.x0) - 8)) LOTS[z](p, full, rnd);
      else {
        sidewalk(full.x0, full.y0, full.x1, full.y1);
        LOTS[z](p, { x0: full.x0 + 3, y0: full.y0 + 3, x1: full.x1 - 3, y1: full.y1 - 3 }, rnd);
      }
    }
  }

  // 2. roads: streets around every town block (and round a place's), avenues and country roads
  // further out, none through a place's block
  const roadKind = (a, b, pa, pb, main) => {
    if (pa && pa === pb) return 0;
    if (a === "school" || b === "school" || a === "raid" || b === "raid") return 0;
    if (URBAN.has(a) || URBAN.has(b)) return main ? 2 : 1;
    return main ? 3 : 0;
  };
  const ROAD = { 1: "#41454d", 2: "#3b3f47", 3: "#5b574f" };
  const segments = [];
  const roadAt = new Set();
  for (let i = 1; i < NI; i++) {
    for (let j = 0; j < NJ; j++) {
      const k = roadKind(zoneOf(i - 1, j), zoneOf(i, j), poiOf(i - 1, j), poiOf(i, j), mainV(i));
      if (!k) continue;
      const x = LX(i);
      p.rect(x - (k === 2 ? 2 : 1), LY(j) - 2, x + 1, LY(j + 1) + 1, ROAD[k]);
      segments.push({ v: true, k, x, y0: LY(j), y1: LY(j + 1), i, j });
      roadAt.add(`v${i},${j},${k}`);
    }
  }
  for (let j = 1; j < NJ; j++) {
    for (let i = 0; i < NI; i++) {
      const k = roadKind(zoneOf(i, j - 1), zoneOf(i, j), poiOf(i, j - 1), poiOf(i, j), mainH(j));
      if (!k) continue;
      const y = LY(j);
      p.rect(LX(i) - 2, y - (k === 2 ? 2 : 1), LX(i + 1) + 1, y + 1, ROAD[k]);
      segments.push({ v: false, k, y, x0: LX(i), x1: LX(i + 1), i, j });
      roadAt.add(`h${i},${j},${k}`);
    }
  }
  // the asphalt: cracks and the odd manhole cover (no speckle: a road is smooth)
  for (const s of segments) {
    const [rx0, ry0, rx1, ry1] = s.v ? [s.x - (s.k === 2 ? 2 : 1), s.y0 - 2, s.x + 1, s.y1 + 1] : [s.x0 - 2, s.y - (s.k === 2 ? 2 : 1), s.x1 + 1, s.y + 1];
    const rnd = rngFor(hash2(rx0, ry0, 78) * 4294967296);
    if (rnd() < 0.3) {
      let [cx, cy] = [rx0 + Math.floor(rnd() * (rx1 - rx0 + 1)), ry0 + Math.floor(rnd() * (ry1 - ry0 + 1))];
      for (let k = 0; k < 5; k++) {
        p.shade(cx, cy, 0.7);
        if (s.v) cy += 1; else cx += 1;
        if (rnd() < 0.5) { if (s.v) cx += rnd() < 0.5 ? -1 : 1; else cy += rnd() < 0.5 ? -1 : 1; }
      }
    }
    if (s.k === 2 && rnd() < 0.25) {
      const [mx, my] = s.v ? [s.x - 1, s.y0 + 12] : [s.x0 + 12, s.y - 1];
      p.rect(mx, my, mx + 1, my + 1, "#2c3038");
      p.dot(mx, my, "#5a5e66");
    }
  }
  // zebra crossings where two avenues meet
  for (let i = 1; i < NI; i++) for (let j = 1; j < NJ; j++) {
    if (!mainV(i) || !mainH(j)) continue;
    const X = LX(i), Y = LY(j);
    if (roadAt.has(`v${i},${j - 1},2`)) for (let dx = -2; dx <= 1; dx += 2) p.rect(X + dx, Y - 6, X + dx, Y - 4, "#c8ccd2");
    if (roadAt.has(`v${i},${j},2`)) for (let dx = -2; dx <= 1; dx += 2) p.rect(X + dx, Y + 3, X + dx, Y + 5, "#c8ccd2");
    if (roadAt.has(`h${i - 1},${j},2`)) for (let dy = -2; dy <= 1; dy += 2) p.rect(X - 6, Y + dy, X - 4, Y + dy, "#c8ccd2");
    if (roadAt.has(`h${i},${j},2`)) for (let dy = -2; dy <= 1; dy += 2) p.rect(X + 3, Y + dy, X + 5, Y + dy, "#c8ccd2");
  }
  // the streetlights along the avenues, coming on at dusk
  for (const s of segments) {
    if (s.k !== 2) continue;
    const at = s.v ? [s.x + 3, s.y0 + 9] : [s.x0 + 9, s.y + 3];
    if (hash2(at[0], at[1], 31) < 0.3) continue; // a few have failed
    p.dot(at[0], at[1] + 1, "#2a2e36");
    p.glowDot(at[0], at[1], "#fff2c0");
    p.light({ x: at[0], y: at[1], r: 12, k: 0.72, c: [1.0, 0.9, 0.62] });
  }
  // lane markings on the avenues, and cars left where they stopped
  for (const s of segments) {
    const rnd = rngFor(hash2(s.v ? s.x : s.x0, s.v ? s.y0 : s.y, 9) * 4294967296);
    if (s.k === 2) {
      if (s.v) for (let y = s.y0 + 2; y < s.y1 - 2; y += 4) p.rect(s.x, y, s.x, y + 1, "#d9c55a");
      else for (let x = s.x0 + 2; x < s.x1 - 2; x += 4) p.rect(x, s.y, x + 1, s.y, "#d9c55a");
    }
    if (rnd() < 0.14) {
      const c = CARS[Math.floor(rnd() * CARS.length)];
      if (rnd() < 0.25) wreck(p, s.v ? s.x - 1 : s.x0 + 6, s.v ? s.y0 + 6 : s.y - 1, s.v);
      else if (s.v) car(p, s.x - 1, s.y0 + 4 + Math.floor(rnd() * 8), c, true);
      else car(p, s.x0 + 4 + Math.floor(rnd() * 10), s.y - 1, c, false);
    }
  }
  // trees along the residential streets, on the sidewalk corners
  for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
    if (poi[i][j] || !["houses", "shops"].includes(zone[i][j])) continue;
    if (hash2(i, j, 33) < 0.5) tree(p, LX(i) + 2, LY(j) + 2, false);
  }

  // 3. the river, with its banks, and bridges where the avenues cross it
  for (let x = 0; x < WORLD_W; x++) {
    const cy = riverY(x);
    for (let y = Math.round(cy - 10); y <= Math.round(cy + 10); y++) {
      const d = Math.abs(y - cy);
      p.dot(x, y, d > 9 ? "#8a7a5a" : d > 7.5 ? "#b8a47a" : d > 6.5 ? "#2f5f94" : "#3a6ea5");
    }
    if (hash2(x, 0, 3) < 0.12) p.rect(x, Math.round(cy - 4 + hash2(x, 1, 3) * 8), x + 2, Math.round(cy - 4 + hash2(x, 1, 3) * 8), "#6fa0d8");
    if (hash2(x, 2, 3) < 0.18) p.dot(x, Math.round(cy + (hash2(x, 4, 3) < 0.5 ? -8 : 8)), "#5a8a4a"); // reeds
  }
  for (let i = 1; i < NI; i++) {
    if (!mainV(i)) continue;
    const x = LX(i);
    const cy = Math.round(riverY(x));
    castShadow(p, x - 3, cy - 10, x + 2, cy + 10, 2);
    p.rect(x - 3, cy - 10, x + 2, cy + 10, "#6b6f78");
    p.rect(x - 2, cy - 10, x + 1, cy + 10, "#3b3f47");
    for (let y = cy - 10; y <= cy + 10; y += 2) {
      p.dot(x - 3, y, "#a8946a");
      p.dot(x + 2, y, "#a8946a");
    }
  }

  // 4. the places, each on its own block
  for (const place of LOCATIONS) {
    const b = BLOCKS.get(place.id);
    const rnd = rngFor(hash2(b.x0, b.y0, 81) * 4294967296);
    const urban = URBAN.has(place.ground);
    if (urban) sidewalk(b.x0, b.y0, b.x1, b.y1);
    const A = urban ? { x0: b.x0 + 3, y0: b.y0 + 3, x1: b.x1 - 3, y1: b.y1 - 3 } : { x0: b.x0 + 2, y0: b.y0 + 2, x1: b.x1 - 2, y1: b.y1 - 2 };
    if (!urban) (LOTS[place.ground] || LOTS.park)(p, b, rnd);
    POI_ART[place.id]?.(kit(p, A, rnd));
    p.light({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, r: 24, k: 0.3, c: [1.0, 0.86, 0.6] }); // its lights still on
  }

  // 4b. the raids, past the edge
  for (const lm of LANDMARKS) raidCompound(p, lm, lairBox(lm));

  // 5. the school: its grounds, a fence and the road out of the front gate
  const campus = tilePixels("campus");
  const sx = Math.round(CX - campus.w / 2);
  const sy = Math.round(CY - campus.h / 2);
  p.rect(CX - 2, sy + campus.h - 2, CX + 2, sy + campus.h + 18, "#3b3f47");
  for (let y = sy + campus.h; y < sy + campus.h + 18; y += 4) p.rect(CX, y, CX, y + 1, "#d9c55a");
  for (let x = sx - 4; x <= sx + campus.w + 3; x++) {
    const post = (x - sx) % 3 === 0;
    p.dot(x, sy - 4, post ? "#a8946a" : "#c9b58c");
    if (Math.abs(x - CX) > 3) p.dot(x, sy + campus.h + 3, post ? "#a8946a" : "#c9b58c");
  }
  for (let y = sy - 4; y <= sy + campus.h + 3; y++) {
    const post = (y - sy) % 3 === 0;
    p.dot(sx - 4, y, post ? "#a8946a" : "#c9b58c");
    p.dot(sx + campus.w + 3, y, post ? "#a8946a" : "#c9b58c");
  }
  for (let ty = 0; ty < campus.h; ty++) for (let tx = 0; tx < campus.w; tx++) if (campus.g[ty][tx]) p.dot(sx + tx, sy + ty, campus.g[ty][tx]);

  // 6. the dead, wandering the streets in packs
  for (let n = 0; n < 34; n++) {
    const x0 = Math.floor(hash2(n, 3, 21) * WORLD_W);
    const y0 = Math.floor(hash2(n, 4, 21) * WORLD_H);
    const z = zoneAt(x0, y0);
    if (z === "school" || NATURE.has(z)) continue;
    for (let m = 0; m < 3 + (n % 4); m++) {
      const x = x0 + Math.round((hash2(n, m, 22) - 0.5) * 8), y = y0 + Math.round((hash2(n, m, 23) - 0.5) * 6);
      p.dot(x, y, "#7a9a5a");
      p.dot(x, y + 1, "#3a4a3a");
    }
  }

  // the campus, the one place with the lights on
  p.light({ x: CX, y: CY, r: 62, k: 0.4, c: [1.0, 0.88, 0.62] });
  // lit like the rest of the game's scenes (lighting.js): the town at dusk — it's Turn 2 — the
  // streetlights coming on, fires smouldering in the ruins, the campus glowing, the raids' alarms
  baseUrl = lightUp({ w: p.w, h: p.h, glow: p.glow, rgbAt: (i) => { const v = p.buf[i]; return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255]; } }, p.lights, { ambient: DUSK, mist: false });
  return baseUrl;
}

// ---------- fog ----------

// Status per hex: 0 clear, 1 fog a scout can reach, 2 fog, 3 beyond the edge of the map.
const FOG = {
  1: { tones: ["#2c3749", "#35425a", "#3f4d68"], rim: ["#6a7b99", "#52617e"] },
  2: { tones: ["#1c2330", "#232b3a", "#2b3546"], rim: ["#3d4a61", "#313c50"] },
  3: { tones: ["#151a23", "#181e28", "#1b212c"], rim: ["#252d3b", "#1f2632"] },
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

let fogCache = { key: "", url: "" };

// The fog over the town as a data: URL: soft-edged pixel clouds over every hex not yet scouted,
// a little lighter where a scout can go next. `clear` and `reachable` are "q,r" keys.
// `outskirtsOpen`: the whole map is scouted — past the edge the town shows through a haze, and
// the raids sit in clearings; until then the outskirts are fogged over like everything else.
export function fogUrl(clear, reachable, outskirtsOpen = false) {
  const key = `${clear.join("|")}#${reachable.join("|")}#${outskirtsOpen}`;
  if (fogCache.key === key) return fogCache.url;
  const R = MAP_RADIUS + 3;
  const side = 2 * R + 1;
  const status = new Uint8Array(side * side).fill(2);
  for (let q = -R; q <= R; q++) for (let r = -R; r <= R; r++) if (hexDistance(q, r) > MAP_RADIUS) status[(q + R) * side + r + R] = 3;
  for (let q = -1; q <= 1; q++) for (let r = -1; r <= 1; r++) if (isSchoolHex(q, r)) status[(q + R) * side + r + R] = 0;
  const mark = (list, v) => list.forEach((k) => {
    const [q, r] = k.split(",").map(Number);
    if (Math.abs(q) <= R && Math.abs(r) <= R) status[(q + R) * side + r + R] = v;
  });
  mark(clear, 0);
  mark(reachable, 1);

  const W = WORLD_W;
  const H = WORLD_H;
  const mask = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (vnoise(x, y, 11, 31) - 0.5) * 12 + (vnoise(x, y, 4, 32) - 0.5) * 3;
      const dy = (vnoise(x, y, 11, 33) - 0.5) * 12 + (vnoise(x, y, 4, 34) - 0.5) * 3;
      const { q, r } = worldToHex(x + dx, y + dy);
      mask[y * W + x] = Math.abs(q) <= R && Math.abs(r) <= R ? status[(q + R) * side + r + R] : 3;
    }
  }
  // a place that's been found is never half hidden: the fog pulls back off its whole building, in a
  // ragged clearing a little wider than its block
  const found = new Set(clear);
  for (const place of LOCATIONS) {
    if (!found.has(`${place.hex.q},${place.hex.r}`)) continue;
    const b = BLOCKS.get(place.id);
    const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
    for (let y = Math.floor(cy - 30); y <= cy + 30; y++) for (let x = Math.floor(cx - 34); x <= cx + 34; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x - cx) / 27, (y - cy) / 24) + (vnoise(x, y, 7, 52) - 0.5) * 0.3;
      if (d <= 1) mask[y * W + x] = 0;
    }
  }
  // an open raid: a ragged clearing around its compound, like the fog's own edges
  for (const lm of LANDMARKS) {
    if (!outskirtsOpen) continue;
    for (let y = lm.at.y - 60; y <= lm.at.y + 60; y++) for (let x = lm.at.x - 66; x <= lm.at.x + 66; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const d = Math.hypot((x - lm.at.x) / 54, (y - lm.at.y) / 48) + (vnoise(x, y, 9, 51) - 0.5) * 0.35;
      if (d <= 1) mask[y * W + x] = 0;
    }
  }
  const p = painter(W, H);
  const clearNear = (x, y, d) => {
    for (let oy = -d; oy <= d; oy++) for (let ox = -d; ox <= d; ox++) {
      if (Math.abs(ox) + Math.abs(oy) > d) continue;
      const nx = x + ox;
      const ny = y + oy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && mask[ny * W + nx] === 0) return true;
    }
    return false;
  };
  const fogNear = (x, y, d) => {
    for (let oy = -d; oy <= d; oy++) for (let ox = -d; ox <= d; ox++) {
      if (Math.abs(ox) + Math.abs(oy) > d) continue;
      const nx = x + ox;
      const ny = y + oy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && mask[ny * W + nx] !== 0) return true;
    }
    return false;
  };
  const haze1 = ((150 << 24) | (0x16 << 16) | (0x12 << 8) | 0x10) >>> 0; // rgba(16,18,22,.6)
  const haze2 = ((70 << 24) | (0x16 << 16) | (0x12 << 8) | 0x10) >>> 0;
  // past the edge of the map: the town shows through, dimmed (rgba(21,26,35,.55), lighter at a clearing)
  const outskirts = ((140 << 24) | (0x23 << 16) | (0x1a << 8) | 0x15) >>> 0;
  const outskirtsRim = ((85 << 24) | (0x23 << 16) | (0x1a << 8) | 0x15) >>> 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const m = mask[y * W + x];
      if (m === 0) {
        if (fogNear(x, y, 1)) p.raw(x, y, haze1);
        else if (fogNear(x, y, 2)) p.raw(x, y, haze2);
        continue;
      }
      if (m === 3 && outskirtsOpen) {
        p.raw(x, y, clearNear(x, y, 2) ? outskirtsRim : outskirts);
        continue;
      }
      const f = FOG[m];
      if (clearNear(x, y, 1)) p.dot(x, y, f.rim[0]);
      else if (clearNear(x, y, 2)) p.dot(x, y, f.rim[1]);
      else {
        const n = vnoise(x, y, 16, 41) * 0.6 + vnoise(x, y, 6, 42) * 0.4 + BAYER[(y % 4) * 4 + (x % 4)] * 0.12;
        p.dot(x, y, f.tones[n < 0.42 ? 0 : n < 0.6 ? 1 : 2]);
      }
    }
  }
  fogCache = { key, url: toDataUrl(p) };
  return fogCache.url;
}
