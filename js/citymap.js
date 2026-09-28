// The exploration map drawn as one continuous town: streets and blocks, a river, the school
// grounds in the middle, and fog drifting over everything nobody has scouted yet — pixel art made
// in code like the room scenes. Underneath it's still the hex grid from map.js (every hex is a
// "block" a scout can reveal, with the same terrain, places and rules), but the grid is never drawn.

import { MAP_RADIUS, isSchoolHex, hexTerrain, hexDistance, locationAt, landmarkAt, tilePixels, hexTileKey } from "./map.js";
import { LOCATIONS, LANDMARKS } from "./data.js";
import { shadowOf, lightOf } from "./sprite.js";

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
  const set = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = c;
  };
  return {
    buf, w, h,
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
const NATURE = new Set(["woods", "field", "edge"]);

function zoneAt(x, y) {
  const { q, r } = worldToHex(x, y);
  if (isSchoolHex(q, r)) return "school";
  if (hexDistance(q, r) > MAP_RADIUS) return "edge";
  return hexTerrain(q, r);
}

// The river crosses the north of town (where map.js puts its river hexes).
const riverY = (x) => CY - 76 + Math.sin(x / 37) * 4 + Math.sin(x / 11 + 1) * 1.2;

const ROOFS = ["#7d828c", "#8a7f76", "#6b7280", "#9a8f86", "#747a6b", "#857264"];
const HOUSE_ROOFS = ["#b04a3a", "#4a6fb0", "#8a5ad6", "#6b4a2f", "#3f7f5a", "#a8753f"];
const CARS = ["#b03030", "#3f6fb5", "#e0a536", "#f4f4f4", "#4caf7d", "#2a2d33", "#8a5ad6"];

function tree(p, x, y, big, leaf = "#3f7a42") {
  const rad = big ? 2.6 : 1.9;
  p.disc(x + 1, y + 1, rad, "#1f3a22");
  p.disc(x, y, rad, leaf);
  p.disc(x - 0.7, y - 0.7, rad * 0.45, lightOf(leaf));
}

function speckle(p, a, hex, n, rnd) {
  for (let i = 0; i < n; i++) p.dot(a.x0 + rnd() * (a.x1 - a.x0), a.y0 + rnd() * (a.y1 - a.y0), hex);
}

// A flat roof from above: lit top edge, shaded right and bottom, and a shadow on the ground.
function building(p, x0, y0, x1, y1, c) {
  p.rect(x0 + 1, y1 + 1, x1 + 1, y1 + 1, "#2c3038");
  p.rect(x1 + 1, y0 + 1, x1 + 1, y1 + 1, "#2c3038");
  p.rect(x0, y0, x1, y1, c);
  p.rect(x0, y0, x1, y0, lightOf(c));
  p.rect(x1, y0, x1, y1, shadowOf(c));
  p.rect(x0, y1, x1, y1, shadowOf(c));
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

// What each kind of lot looks like. `a` is the lot inside its sidewalks.
const LOTS = {
  apartments(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#5a5e66");
    const roof = () => ROOFS[Math.floor(rnd() * ROOFS.length)];
    if (rnd() < 0.5) {
      building(p, a.x0 + 1, a.y0 + 1, a.x1 - 2, a.y1 - 2, roof());
    } else {
      const mid = Math.floor((a.x0 + a.x1) / 2);
      building(p, a.x0 + 1, a.y0 + 1, mid - 1, a.y1 - 2, roof());
      building(p, mid + 1, a.y0 + 3, a.x1 - 2, a.y1 - 2, roof());
    }
    for (let i = 0; i < 2; i++) {
      const x = a.x0 + 3 + Math.floor(rnd() * (a.x1 - a.x0 - 7));
      const y = a.y0 + 3 + Math.floor(rnd() * (a.y1 - a.y0 - 7));
      p.rect(x, y, x + 1, y + 1, "#b6bbc3");
      p.dot(x + 1, y + 1, "#8a8e96");
    }
    if (rnd() < 0.4) p.disc(a.x1 - 5, a.y0 + 4, 1.3, "#8a5f33");
  },
  shops(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#8a8e96");
    const n = rnd() < 0.5 ? 2 : 3;
    const w = Math.floor((a.x1 - a.x0 + 1) / n);
    const awnings = [["#d64545", "#f4f4f4"], ["#4caf7d", "#f4f4f4"], ["#3f6fb5", "#f4f4f4"], ["#e0a536", "#6b4a2f"]];
    for (let i = 0; i < n; i++) {
      const x0 = a.x0 + i * w;
      const x1 = i === n - 1 ? a.x1 : x0 + w - 1;
      building(p, x0, a.y0 + 1, x1 - 1, a.y1 - 4, ["#7a6f66", "#6b5f57", "#5d5a66", "#8a6a4f"][Math.floor(rnd() * 4)]);
      const [c1, c2] = awnings[Math.floor(rnd() * awnings.length)];
      for (let x = x0; x <= x1 - 1; x++) p.rect(x, a.y1 - 3, x, a.y1 - 2, (x - x0) % 2 ? c2 : c1);
    }
  },
  street(p, a, rnd) {
    const kind = rnd();
    if (kind < 0.4) {
      // an office block with a glass roof
      p.rect(a.x0, a.y0, a.x1, a.y1, "#6b6f78");
      building(p, a.x0 + 1, a.y0 + 1, a.x1 - 2, a.y1 - 2, "#5f7fa0");
      for (let y = a.y0 + 3; y < a.y1 - 3; y += 3) for (let x = a.x0 + 3; x < a.x1 - 3; x += 3) p.dot(x, y, "#8fb0d0");
    } else if (kind < 0.7) {
      // a little square with a fountain
      p.rect(a.x0, a.y0, a.x1, a.y1, "#a39d90");
      for (let x = a.x0; x <= a.x1; x += 2) for (let y = a.y0 + ((x / 2) % 2); y <= a.y1; y += 2) p.dot(x, y, "#9a9488");
      const cx = (a.x0 + a.x1) / 2;
      const cy = (a.y0 + a.y1) / 2;
      p.disc(cx, cy, 3.2, "#d9d2c0");
      p.disc(cx, cy, 2.2, "#5fa8d8");
      p.dot(cx, cy, "#d6f0fb");
      tree(p, a.x0 + 2, a.y0 + 2, false);
      tree(p, a.x1 - 2, a.y1 - 3, false);
    } else {
      p.rect(a.x0, a.y0, a.x1, a.y1, "#6b6f78");
      const mx = Math.floor((a.x0 + a.x1) / 2);
      const my = Math.floor((a.y0 + a.y1) / 2);
      building(p, a.x0 + 1, a.y0 + 1, mx - 1, my - 1, ROOFS[Math.floor(rnd() * ROOFS.length)]);
      building(p, mx + 1, a.y0 + 1, a.x1 - 2, my + 2, ROOFS[Math.floor(rnd() * ROOFS.length)]);
      building(p, a.x0 + 1, my + 1, mx - 2, a.y1 - 2, ROOFS[Math.floor(rnd() * ROOFS.length)]);
    }
  },
  parking(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#4e525a");
    const mid = Math.floor((a.y0 + a.y1) / 2);
    for (let x = a.x0 + 1; x <= a.x1; x += 3) {
      p.rect(x, a.y0 + 1, x, mid - 2, "#b6bbc3");
      p.rect(x, mid + 2, x, a.y1 - 1, "#b6bbc3");
      if (x + 2 <= a.x1) {
        if (rnd() < 0.45) car(p, x + 1, a.y0 + 1, CARS[Math.floor(rnd() * CARS.length)], true);
        if (rnd() < 0.45) car(p, x + 1, mid + 2, CARS[Math.floor(rnd() * CARS.length)], true);
      }
    }
  },
  houses(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#5f9e5a");
    speckle(p, a, "#6fae6a", 10, rnd);
    const house = (x, y) => {
      const c = HOUSE_ROOFS[Math.floor(rnd() * HOUSE_ROOFS.length)];
      p.rect(x + 1, y + 5, x + 6, y + 5, "#3f6f3a");
      p.rect(x, y, x + 5, y + 2, lightOf(c));
      p.rect(x, y + 2, x + 5, y + 4, c);
      p.rect(x, y + 2, x + 5, y + 2, shadowOf(c));
      p.rect(x + 1, y + 5, x + 2, y + 7, "#8a8e96");
    };
    house(a.x0 + 1, a.y0 + 1);
    house(a.x1 - 6, a.y0 + 4);
    tree(p, a.x1 - 3, a.y1 - 2, rnd() < 0.5);
    tree(p, a.x0 + 3, a.y1 - 2, false);
    for (let x = a.x0; x <= a.x1; x += 2) p.dot(x, a.y1, "#e9dcc0");
  },
  park(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#6fae6a");
    speckle(p, a, "#7fbd74", 14, rnd);
    const my = Math.floor((a.y0 + a.y1) / 2);
    for (let x = a.x0; x <= a.x1; x++) p.rect(x, my + Math.round(Math.sin(x / 3)), x, my + 1 + Math.round(Math.sin(x / 3)), "#c9b58c");
    if (rnd() < 0.4) {
      p.disc(a.x1 - 5, a.y1 - 4, 2.8, "#5fa8d8");
      p.dot(a.x1 - 6, a.y1 - 5, "#8fc8ef");
    } else tree(p, a.x1 - 4, a.y1 - 3, true);
    tree(p, a.x0 + 3, a.y0 + 3, true);
    tree(p, a.x1 - 3, a.y0 + 2, false);
    if (rnd() < 0.5) p.rect(a.x0 + 3, a.y1 - 2, a.x0 + 5, a.y1 - 2, "#8a5f33");
  },
  ruins(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#5a5048");
    speckle(p, a, "#4a4038", 18, rnd);
    p.disc(a.x0 + 4 + rnd() * 8, a.y0 + 4 + rnd() * 6, 3.4, "#2a2420");
    p.rect(a.x0 + 1, a.y0 + 1, a.x0 + 9, a.y0 + 1, "#8a7f76");
    p.rect(a.x0 + 1, a.y0 + 1, a.x0 + 1, a.y0 + 7, "#8a7f76");
    p.rect(a.x1 - 6, a.y1 - 1, a.x1 - 1, a.y1 - 1, "#7a6f66");
    speckle(p, a, "#7a6f66", 8, rnd);
    if (rnd() < 0.5) {
      const x = a.x1 - 5;
      const y = a.y0 + 5;
      p.dot(x, y, "#f08a3a");
      p.dot(x + 1, y - 1, "#f4d35e");
      p.dot(x - 1, y - 1, "#f08a3a");
    }
  },
  woods(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#2f5a33");
    speckle(p, a, "#274d2b", 16, rnd);
    for (let i = 0; i < 6; i++) tree(p, a.x0 + 2 + rnd() * (a.x1 - a.x0 - 3), a.y0 + 2 + rnd() * (a.y1 - a.y0 - 3), rnd() < 0.4, rnd() < 0.5 ? "#3f7a42" : "#356b39");
  },
  field(p, a, rnd) {
    const wheat = rnd() < 0.5;
    for (let y = a.y0; y <= a.y1; y++) p.rect(a.x0, y, a.x1, y, (y % 3 === 0) ? (wheat ? "#c9b458" : "#a8c65a") : (wheat ? "#a89a44" : "#8fae4a"));
    if (rnd() < 0.35) {
      const x = a.x0 + 4 + rnd() * 10;
      const y = a.y0 + 4 + rnd() * 8;
      p.disc(x, y, 2, "#e0b84a");
      p.rect(x - 2, y, x + 2, y, "#c49a3a");
    }
  },
  river(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#5f9e5a");
    speckle(p, a, "#6fae6a", 12, rnd);
    tree(p, a.x0 + 3 + rnd() * 12, a.y0 + 3 + rnd() * 10, true);
  },
  school(p, a) {
    for (let x = a.x0; x <= a.x1; x++) p.rect(x, a.y0, x, a.y1, Math.floor(x / 3) % 2 ? "#63a158" : "#6aa85f");
  },
  edge(p, a, rnd) {
    p.rect(a.x0, a.y0, a.x1, a.y1, "#26482a");
    for (let i = 0; i < 6; i++) tree(p, a.x0 + 2 + rnd() * (a.x1 - a.x0 - 3), a.y0 + 2 + rnd() * (a.y1 - a.y0 - 3), rnd() < 0.5, "#2f5f33");
  },
};

let baseUrl = null;

// The whole town as a data: URL (drawn once — the town never changes).
export function cityBaseUrl() {
  if (baseUrl) return baseUrl;
  const p = painter(WORLD_W, WORLD_H);
  const zone = [];
  for (let i = 0; i < NI; i++) {
    zone.push([]);
    for (let j = 0; j < NJ; j++) zone[i].push(zoneAt(LX(i) + GX / 2, LY(j) + GY / 2));
  }
  const zoneOf = (i, j) => (i < 0 || j < 0 || i >= NI || j >= NJ ? "edge" : zone[i][j]);

  // 1. lots
  for (let i = 0; i < NI; i++) {
    for (let j = 0; j < NJ; j++) {
      const z = zone[i][j];
      const rnd = rngFor(hash2(i, j, 5) * 4294967296);
      const full = { x0: LX(i), y0: LY(j), x1: LX(i + 1) - 1, y1: LY(j + 1) - 1 };
      if (NATURE.has(z) || z === "school" || z === "river") {
        LOTS[z](p, full, rnd);
      } else {
        p.rect(full.x0, full.y0, full.x1, full.y1, "#8a8e96"); // sidewalk
        LOTS[z](p, { x0: full.x0 + 3, y0: full.y0 + 3, x1: full.x1 - 3, y1: full.y1 - 3 }, rnd);
      }
    }
  }

  // 2. roads: streets around every town block, avenues and country roads further out
  const roadKind = (a, b, main) => {
    if (a === "school" || b === "school") return 0;
    if (URBAN.has(a) || URBAN.has(b)) return main ? 2 : 1;
    return main ? 3 : 0;
  };
  const ROAD = { 1: "#41454d", 2: "#3b3f47", 3: "#5b574f" };
  const segments = [];
  for (let i = 1; i < NI; i++) {
    for (let j = 0; j < NJ; j++) {
      const k = roadKind(zoneOf(i - 1, j), zoneOf(i, j), mainV(i));
      if (!k) continue;
      const x = LX(i);
      p.rect(x - (k === 2 ? 2 : 1), LY(j) - 2, x + 1, LY(j + 1) + 1, ROAD[k]);
      segments.push({ v: true, k, x, y0: LY(j), y1: LY(j + 1) });
    }
  }
  for (let j = 1; j < NJ; j++) {
    for (let i = 0; i < NI; i++) {
      const k = roadKind(zoneOf(i, j - 1), zoneOf(i, j), mainH(j));
      if (!k) continue;
      const y = LY(j);
      p.rect(LX(i) - 2, y - (k === 2 ? 2 : 1), LX(i + 1) + 1, y + 1, ROAD[k]);
      segments.push({ v: false, k, y, x0: LX(i), x1: LX(i + 1) });
    }
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
      if (s.v) car(p, s.x - 1, s.y0 + 4 + Math.floor(rnd() * 8), c, true);
      else car(p, s.x0 + 4 + Math.floor(rnd() * 10), s.y - 1, c, false);
    }
  }

  // 3. the river, with bridges where the avenues cross it
  for (let x = 0; x < WORLD_W; x++) {
    const cy = riverY(x);
    for (let y = Math.round(cy - 10); y <= Math.round(cy + 10); y++) {
      const d = Math.abs(y - cy);
      p.dot(x, y, d > 9 ? "#a8946a" : d > 7.5 ? "#c9b58c" : "#3a6ea5");
    }
    if (hash2(x, 0, 3) < 0.12) p.rect(x, Math.round(cy - 4 + hash2(x, 1, 3) * 8), x + 2, Math.round(cy - 4 + hash2(x, 1, 3) * 8), "#6fa0d8");
  }
  for (let i = 1; i < NI; i++) {
    if (!mainV(i)) continue;
    const x = LX(i);
    const cy = Math.round(riverY(x));
    p.rect(x - 3, cy - 10, x + 2, cy + 10, "#6b6f78");
    p.rect(x - 2, cy - 10, x + 1, cy + 10, "#3b3f47");
    for (let y = cy - 10; y <= cy + 10; y += 2) {
      p.dot(x - 3, y, "#a8946a");
      p.dot(x + 2, y, "#a8946a");
    }
  }

  // 4. places: the buildings from the map tiles, on their own lots
  for (const place of [...LOCATIONS, ...LANDMARKS]) {
    const { x, y } = hexToWorld(place.hex.q, place.hex.r);
    const t = tilePixels(hexTileKey(place.hex.q, place.hex.r));
    const x0 = Math.round(x - t.w / 2);
    const y0 = Math.round(y - t.h / 2);
    p.rect(x0 - 1, y0 - 1, x0 + t.w, y0 + t.h, "#22262d");
    for (let ty = 0; ty < t.h; ty++) for (let tx = 0; tx < t.w; tx++) if (t.g[ty][tx]) p.dot(x0 + tx, y0 + ty, t.g[ty][tx]);
  }

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

  // 6. the dead, shuffling about the streets
  for (let n = 0; n < 90; n++) {
    const x = Math.floor(hash2(n, 3, 21) * WORLD_W);
    const y = Math.floor(hash2(n, 4, 21) * WORLD_H);
    const z = zoneAt(x, y);
    if (z === "school" || NATURE.has(z)) continue;
    p.dot(x, y, "#7a9a5a");
    p.dot(x, y + 1, "#3a4a3a");
  }

  baseUrl = toDataUrl(p);
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
export function fogUrl(clear, reachable) {
  const key = `${clear.join("|")}#${reachable.join("|")}`;
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
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const m = mask[y * W + x];
      if (m === 0) {
        if (fogNear(x, y, 1)) p.raw(x, y, haze1);
        else if (fogNear(x, y, 2)) p.raw(x, y, haze2);
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
