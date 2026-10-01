// The city around the school: what's on every hex of the exploration map, and pixel-art tiles for
// it all, drawn in code like the room scenes. Terrain is worked out from each hex's position so the
// town is the same every game and every save, and needs no state — it's just hidden under the fog
// until a scout gets there.

import { LOCATIONS } from "./data.js";
import { shadowOf, lightOf } from "./sprite.js";

// ---------- terrain ----------

export const MAP_RADIUS = 7;
// The school's grounds cover its own hex and the six around it.
export const SCHOOL_RADIUS = 1;
export const isSchoolHex = (q, r) => hexDistance(q, r) <= SCHOOL_RADIUS;

// A stable 0..1 hash of a hex, so the layout never shuffles between renders or saves.
function hexHash(q, r, salt = 0) {
  let h = Math.imul(q + 97, 374761393) ^ Math.imul(r - 51, 668265263) ^ Math.imul(salt + 13, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// A river crosses the north of town from edge to edge (flat-top hexes: alternating r keeps it level).
export function isRiverHex(q, r) {
  const band = 2 * r + q;
  return band === -6 || band === -5;
}

// Downtown right outside the school fence, suburbs beyond, woods and fields out at the edge.
const RINGS = [
  { maxDist: 3, table: [["street", 0.3], ["apartments", 0.3], ["shops", 0.2], ["parking", 0.2]] },
  { maxDist: 5, table: [["houses", 0.4], ["park", 0.2], ["street", 0.15], ["ruins", 0.15], ["parking", 0.1]] },
  { maxDist: 99, table: [["woods", 0.4], ["field", 0.3], ["houses", 0.15], ["ruins", 0.15]] },
];

export function hexDistance(q, r) {
  return (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
}

// The map rule from data.js: no two locations touch (and none touches the school grounds). Flags
// a mistake while editing the data. (Raids sit in the corners, off the hex grid.)
const POIS = LOCATIONS;
POIS.forEach((a, i) => {
  if (hexDistance(a.hex.q, a.hex.r) <= SCHOOL_RADIUS + 1) console.warn(`Map rule broken: ${a.id} touches the school grounds.`);
  if (hexDistance(a.hex.q, a.hex.r) > MAP_RADIUS) console.warn(`Map rule broken: ${a.id} is off the map.`);
  for (const b of POIS.slice(i + 1)) {
    if (hexDistance(a.hex.q - b.hex.q, a.hex.r - b.hex.r) <= 1) console.warn(`Map rule broken: ${a.id} and ${b.id} touch.`);
  }
});

export function hexTerrain(q, r) {
  if (isRiverHex(q, r)) return "river";
  const { table } = RINGS.find((ring) => hexDistance(q, r) <= ring.maxDist);
  let roll = hexHash(q, r);
  for (const [terrain, weight] of table) {
    if (roll < weight) return terrain;
    roll -= weight;
  }
  return table[0][0];
}

export const TERRAIN_NAMES = {
  street: "Empty Street", apartments: "Apartment Blocks", shops: "Shuttered Shops", parking: "Parking Lot",
  houses: "Quiet Houses", park: "City Park", ruins: "Burnt-out Block", woods: "Woods", field: "Overgrown Field", river: "River",
};

export const locationAt = (q, r) => LOCATIONS.find((l) => l.hex.q === q && l.hex.r === r) || null;

// What a hex's tile shows: a location's building, or its terrain (with one of two looks).
export function hexTileKey(q, r) {
  const place = locationAt(q, r);
  if (place) return place.id;
  return `${hexTerrain(q, r)}:${hexHash(q, r, 7) < 0.5 ? 0 : 1}`;
}

// ---------- tile art ----------
// 32x28 pixels — the hex's aspect — clipped to a hexagon by CSS, so the corners never show.

const TW = 32;
const TH = 28;

function makeRng(seed) {
  let x = seed >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}

function canvas(seed, w = TW, h = TH) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const r = (x0, y0, x1, y1, c) => {
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) g[y][x] = c;
  };
  const disc = (cx, cy, rad, c) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= rad * rad + rad * 0.5) g[y][x] = c;
  };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g[y][x] = c;
  };
  const rng = makeRng(seed);
  const speckle = (c, n) => {
    for (let i = 0; i < n; i++) g[Math.floor(rng() * h)][Math.floor(rng() * w)] = c;
  };
  return { g, r, disc, ellipse, rng, speckle, px: (x, y, c) => r(x, y, x, y, c) };
}

// Small shared props.
function tree(k, cx, cy, big = false) {
  k.disc(cx + 1, cy + 1, big ? 3.2 : 2.6, "#1f3a22");
  k.disc(cx, cy, big ? 3.2 : 2.6, "#3f7a42");
  k.disc(cx - 1, cy - 1, big ? 1.6 : 1.2, "#5a9a55");
}
function car(k, x, y, color, vertical = false) {
  if (vertical) {
    k.r(x, y, x + 3, y + 5, color);
    k.r(x, y + 1, x + 3, y + 1, "#9fc7e8");
    k.r(x, y + 4, x + 3, y + 4, "#9fc7e8");
    k.r(x, y + 2, x + 3, y + 3, shadowOf(color));
  } else {
    k.r(x, y, x + 5, y + 3, color);
    k.r(x + 1, y, x + 1, y + 3, "#9fc7e8");
    k.r(x + 4, y, x + 4, y + 3, "#9fc7e8");
    k.r(x + 2, y, x + 3, y + 3, shadowOf(color));
  }
}
function roof(k, x0, y0, x1, y1, color) {
  k.r(x0, y0, x1, y1, color);
  k.r(x0, y0, x1, y0, lightOf(color));
  k.r(x0, y1, x1, y1, shadowOf(color));
  k.r(x1, y0, x1, y1, shadowOf(color));
}
// A gabled roof seen from the side, narrowing to the ridge.
function gable(k, x0, x1, yBase, color) {
  for (let i = 0; x0 + i <= x1 - i; i++) k.r(x0 + i, yBase - i, x1 - i, yBase - i, i === 0 ? shadowOf(color) : color);
}
function striped(k, x0, x1, y0, y1, a, b) {
  for (let x = x0; x <= x1; x++) k.r(x, y0, x, y1, Math.floor((x - x0) / 2) % 2 ? b : a);
}

const TILES = {
  street(k, v) {
    k.r(0, 0, 31, 27, "#6b6f78");
    k.speckle("#62666e", 30);
    k.r(0, 10, 31, 17, "#3b3f47");
    for (let x = 1; x < TW; x += 6) k.r(x, 13, x + 2, 13, "#d9c55a");
    if (v === 0) {
      k.r(12, 0, 19, 27, "#3b3f47");
      for (let y = 1; y < TH; y += 6) if (y < 9 || y > 18) k.r(15, y, 15, y + 2, "#d9c55a");
      for (let x = 12; x <= 19; x += 2) {
        k.r(x, 8, x, 9, "#d0d4da");
        k.r(x, 18, x, 19, "#d0d4da");
      }
      car(k, 22, 14, "#b03030");
      car(k, 5, 11, "#3f6fb5");
      roof(k, 0, 0, 9, 6, "#7a6f66");
      roof(k, 22, 21, 31, 27, "#6b6f78");
    } else {
      roof(k, 3, 0, 28, 7, "#7a6f66");
      roof(k, 3, 20, 28, 27, "#5d5a66");
      car(k, 9, 14, "#e0a536");
      k.r(20, 11, 23, 12, "#2a2d33"); // pothole
    }
  },
  apartments(k, v) {
    k.r(0, 0, 31, 27, "#474c56");
    k.speckle("#3f444d", 25);
    roof(k, 2, 2, v ? 17 : 14, 13, "#7d828c");
    k.r(5, 5, 6, 6, "#b6bbc3");
    k.r(10, 9, 11, 10, "#b6bbc3");
    k.disc(11, 5, 1.5, "#8a5f33");
    roof(k, v ? 20 : 17, 14, 29, 25, "#8a7f76");
    k.r(22, 17, 24, 19, "#6b6259");
    k.r(26, 21, 27, 22, "#b6bbc3");
    if (v) car(k, 3, 18, "#4caf7d", true);
  },
  shops(k, v) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 17, 31, 18, "#8a8e96");
    const colors = v ? ["#6b5f57", "#5d5a66", "#7a6f66"] : ["#7a6f66", "#6b5f57", "#5d5a66"];
    const awnings = [["#d64545", "#f4f4f4"], ["#4caf7d", "#f4f4f4"], ["#3f6fb5", "#f4f4f4"]];
    [1, 11, 21].forEach((x, i) => {
      roof(k, x, 2, x + 9, 14, colors[i]);
      striped(k, x, x + 9, 15, 16, ...awnings[i]);
    });
    for (let x = 2; x < TW; x += 7) k.r(x, 22, x + 3, 22, "#d9c55a");
    if (!v) car(k, 18, 23, "#8a5ad6");
  },
  parking(k, v) {
    k.r(0, 0, 31, 27, "#4e525a");
    k.speckle("#484c54", 25);
    k.r(0, 12, 31, 15, "#44484f");
    const colors = ["#b03030", "#3f6fb5", "#e0a536", "#f4f4f4", "#4caf7d", "#2a2d33"];
    for (let x = 1; x < TW; x += 5) {
      k.r(x, 2, x, 10, "#d0d4da");
      k.r(x, 17, x, 25, "#d0d4da");
      if (k.rng() < (v ? 0.35 : 0.55) && x + 4 < TW) car(k, x + 1, 3, colors[Math.floor(k.rng() * colors.length)], true);
      if (k.rng() < (v ? 0.55 : 0.3) && x + 4 < TW) car(k, x + 1, 18, colors[Math.floor(k.rng() * colors.length)], true);
    }
  },
  houses(k, v) {
    k.r(0, 0, 31, 27, "#5f9e5a");
    k.speckle("#6fae6a", 40);
    k.r(14, 0, 17, 27, "#8a8e96");
    roof(k, 3, 4, 12, 11, v ? "#4a6fb0" : "#b04a3a");
    k.r(3, 7, 12, 7, shadowOf(v ? "#4a6fb0" : "#b04a3a"));
    roof(k, 19, 15, 28, 22, v ? "#b04a3a" : "#8a5ad6");
    k.r(19, 18, 28, 18, shadowOf(v ? "#b04a3a" : "#8a5ad6"));
    for (let x = 2; x <= 13; x += 2) k.px(x, 14, "#e9dcc0");
    for (let x = 18; x <= 29; x += 2) k.px(x, 12, "#e9dcc0");
    tree(k, 25, 6);
    tree(k, 7, 21, true);
  },
  park(k, v) {
    k.r(0, 0, 31, 27, "#6fae6a");
    k.speckle("#7fbd74", 45);
    for (let x = 0; x < TW; x++) {
      const y = 12 + Math.round(Math.sin(x / 5) * 2);
      k.r(x, y, x, y + 2, "#c9b58c");
    }
    k.ellipse(v ? 22 : 9, 21, 5, 3.2, "#5fa8d8");
    k.r(v ? 20 : 7, 20, v ? 22 : 9, 20, "#8fc8ef");
    tree(k, v ? 6 : 23, 5, true);
    tree(k, v ? 26 : 5, 5);
    tree(k, v ? 9 : 27, 21);
    k.r(17, 17, 20, 17, "#8a5f33");
  },
  ruins(k, v) {
    k.r(0, 0, 31, 27, "#5a5048");
    k.speckle("#4a4038", 50);
    k.disc(v ? 10 : 21, v ? 18 : 19, 4.5, "#2a2420");
    k.r(4, 4, 14, 5, "#8a7f76");
    k.r(4, 4, 5, 13, "#8a7f76");
    k.r(19, 22, 28, 23, "#7a6f66");
    k.disc(22, 8, 3, "#7a6f66");
    k.disc(21, 7, 1.5, "#9a8f86");
    k.disc(9, 20, 2, "#6b6259");
    if (!v) {
      k.px(21, 18, "#f08a3a");
      k.px(22, 17, "#f4d35e");
      k.px(20, 17, "#f08a3a");
    } else {
      car(k, 18, 12, "#3a2a2a");
    }
  },
  woods(k, v) {
    k.r(0, 0, 31, 27, "#2f5a33");
    k.speckle("#274d2b", 40);
    const spots = v
      ? [[5, 4], [14, 3], [24, 5], [9, 12], [20, 11], [28, 14], [4, 20], [14, 21], [24, 22]]
      : [[7, 3], [18, 5], [27, 3], [3, 12], [13, 13], [23, 13], [8, 22], [19, 21], [28, 23]];
    for (const [x, y] of spots) tree(k, x, y, (x + y) % 3 === 0);
  },
  field(k, v) {
    k.r(0, 0, 31, 27, v ? "#a89a44" : "#8fae4a");
    for (let y = 1; y < TH; y += 3) k.r(0, y, 31, y, v ? "#c9b458" : "#a8c65a");
    k.disc(v ? 22 : 8, 9, 2.6, "#e0b84a");
    k.r(v ? 20 : 6, 9, v ? 24 : 10, 9, "#c49a3a");
    for (let x = 0; x < TW; x += 3) k.px(x, 26, "#8a5f33");
  },
  river(k, v) {
    k.r(0, 0, 31, 27, "#5f9e5a");
    k.speckle("#6fae6a", 25);
    k.r(0, 5, 31, 6, "#c9b58c");
    k.r(0, 21, 31, 22, "#c9b58c");
    k.r(0, 7, 31, 20, "#3a6ea5");
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(k.rng() * 29);
      const y = 8 + Math.floor(k.rng() * 12);
      k.r(x, y, x + 2, y, "#6fa0d8");
    }
    if (!v) {
      k.r(12, 3, 19, 24, "#8a5f33");
      for (let y = 4; y < 24; y += 2) k.r(12, y, 19, y, "#6b4a2f");
      k.r(12, 3, 12, 24, "#5a3b24");
      k.r(19, 3, 19, 24, "#5a3b24");
    }
  },

  school(k) {
    k.r(0, 0, 31, 27, "#5f9e5a");
    k.speckle("#6fae6a", 30);
    k.r(2, 21, 29, 27, "#8a8e96");
    k.r(4, 9, 27, 21, "#c9b18a");
    k.r(4, 9, 4, 21, lightOf("#c9b18a"));
    k.r(27, 9, 27, 21, shadowOf("#c9b18a"));
    k.r(3, 7, 28, 9, "#7a3a2a");
    k.r(13, 2, 18, 9, "#b8a07a");
    k.r(14, 1, 17, 1, "#7a3a2a");
    k.disc(15.5, 5, 1.6, "#f4f4f4");
    k.px(15, 5, "#222");
    for (let x = 6; x <= 25; x += 4) {
      k.r(x, 11, x + 1, 13, "#9fc7e8");
      if (x < 13 || x > 17) k.r(x, 16, x + 1, 18, "#9fc7e8");
    }
    k.r(14, 16, 17, 21, "#5a3b24");
    k.r(29, 1, 29, 9, "#d0d4da");
    k.r(30, 1, 31, 3, "#4caf7d");
  },

  // The school grounds, spanning its seven hexes (a CAMPUS_W x CAMPUS_H canvas). Each outer hex
  // gets one feature — sports pitch, gym, pool, tennis court, trees, the front plaza — around the
  // main building in the middle. Hex centres on this canvas: middle (25,26), top (25,9),
  // bottom (25,43), upper-left (10,17), lower-left (10,35), upper-right (40,17), lower-right (40,35).
  campus(k) {
    // lawn with mowing stripes
    k.r(0, 0, 49, 51, "#6aa85f");
    for (let x = 0; x < 50; x += 4) k.r(x, 0, x + 1, 51, "#63a158");

    // upper-left: soccer pitch inside a running track
    k.ellipse(10, 17, 8.5, 6.5, "#c0583a");
    k.ellipse(10, 17, 7.2, 5.2, "#d0694a");
    k.ellipse(10, 17, 6.2, 4.3, "#4caf50");
    for (let x = 5; x <= 15; x += 2) k.r(x, 13, x, 21, "#56bb5a");
    k.r(10, 13, 10, 21, "#f4f4f4");
    k.r(4, 16, 4, 18, "#f4f4f4");
    k.r(16, 16, 16, 18, "#f4f4f4");

    // upper-right: the gym, with a curved roof
    k.r(33, 13, 46, 22, "#d9d2c0");
    k.r(33, 13, 33, 22, lightOf("#d9d2c0"));
    k.r(46, 13, 46, 22, shadowOf("#d9d2c0"));
    k.r(34, 12, 45, 13, "#3f7fa8");
    k.r(35, 11, 44, 11, "#3f7fa8");
    k.r(37, 10, 42, 10, lightOf("#3f7fa8"));
    for (const x of [35, 43]) k.r(x, 15, x + 1, 17, "#7fc0ea");
    k.r(38, 17, 41, 22, "#6b4a2f");
    k.r(39, 17, 40, 22, "#8a5f33");

    // lower-left: swimming pool
    k.r(2, 29, 17, 40, "#e2dccb");
    k.r(3, 30, 16, 39, "#4fb3e0");
    k.r(3, 30, 16, 30, "#3a8fbf");
    for (const y of [33, 36]) k.r(4, y, 15, y, "#8fd4f4");
    k.r(6, 32, 7, 32, "#d6f0fb");
    k.r(12, 38, 13, 38, "#d6f0fb");
    k.r(16, 31, 16, 33, "#d0d4da");

    // lower-right: tennis court
    k.r(33, 29, 47, 40, "#3f8f6a");
    k.r(33, 29, 47, 29, "#f4f4f4");
    k.r(33, 40, 47, 40, "#f4f4f4");
    k.r(33, 29, 33, 40, "#f4f4f4");
    k.r(47, 29, 47, 40, "#f4f4f4");
    k.r(35, 34, 45, 34, "#f4f4f4");
    for (let y = 29; y <= 40; y += 2) k.px(40, y, "#e9e9e9");

    // top: trees behind the tower
    for (const [x, y] of [[17, 6], [33, 6], [20, 2], [30, 2]]) tree(k, x, y);

    // middle: the main building — two wings, a taller entrance block and a clock tower
    k.r(12, 33, 38, 34, "#4f8a4a"); // shadow on the lawn
    k.r(12, 19, 38, 32, "#ece4d0");
    k.r(12, 19, 12, 32, lightOf("#ece4d0"));
    k.r(38, 19, 38, 32, shadowOf("#ece4d0"));
    k.r(11, 17, 39, 19, "#2f6f9f");
    k.r(11, 17, 39, 17, lightOf("#2f6f9f"));
    for (const y of [21, 26]) {
      for (let x = 14; x <= 36; x += 3) {
        if (x > 19 && x < 30) continue;
        k.r(x, y, x + 1, y + 2, "#7fc0ea");
        k.px(x, y, "#b8def5");
      }
    }
    k.r(20, 12, 30, 32, "#f4efe2");
    k.r(20, 12, 20, 32, "#fbf8f0");
    k.r(30, 12, 30, 32, shadowOf("#f4efe2"));
    k.r(19, 10, 31, 12, "#2f6f9f");
    k.r(19, 10, 31, 10, lightOf("#2f6f9f"));
    k.r(22, 3, 28, 10, "#f4efe2");
    k.r(28, 3, 28, 10, shadowOf("#f4efe2"));
    k.r(22, 1, 28, 2, "#2f6f9f");
    k.r(24, 0, 26, 0, "#2f6f9f");
    k.disc(25, 6, 2.2, "#2f6f9f");
    k.disc(25, 6, 1.6, "#fdfdfd");
    k.r(25, 5, 25, 6, "#222222");
    k.px(26, 6, "#222222");
    for (let x = 22; x <= 28; x += 3) k.r(x, 14, x + 1, 16, "#7fc0ea");
    k.r(24, 17, 26, 22, "#d64545");
    k.px(25, 23, "#d64545");
    k.px(25, 19, "#f4d35e");
    k.r(22, 25, 28, 25, "#2f6f9f");
    k.r(23, 26, 27, 32, "#5a7fa0");
    k.r(25, 26, 25, 32, "#3f5f7f");
    k.r(22, 33, 28, 34, "#d9d2c0");

    // bottom: front plaza, the path out, cherry trees and a barricaded gate
    k.r(18, 35, 32, 41, "#d9d2c0");
    for (let x = 19; x < 32; x += 3) k.r(x, 38, x + 1, 38, "#c9c2b2");
    k.r(23, 41, 27, 51, "#d9d2c0");
    for (const x of [17, 33]) {
      k.r(x, 41, x, 44, "#6b4a2f");
      k.disc(x + 0.5, 39.5, 3, "#e98fb0");
      k.disc(x - 0.5, 38.5, 1.5, "#fbd0de");
    }
    for (const [x, y, c] of [[20, 43, "#f4d35e"], [29, 43, "#d64545"], [21, 45, "#8a5ad6"], [28, 46, "#f4d35e"]]) k.px(x, y, c);
    k.r(21, 47, 21, 51, "#8a8e96");
    k.r(29, 47, 29, 51, "#8a8e96");
    striped(k, 22, 28, 48, 48, "#d64545", "#f4f4f4");
    for (let x = 12; x <= 38; x += 3) {
      if (x > 18 && x < 31) continue;
      k.r(x, 49, x + 2, 50, "#c9b58c");
      k.r(x, 50, x + 2, 50, "#a8946a");
    }
  },

  // --- locations (front-on buildings on a street) ---
  corner_store(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 23, 31, 27, "#8a8e96");
    k.r(6, 8, 25, 23, "#d8c7a6");
    k.r(6, 5, 25, 8, "#b03030");
    for (let x = 8; x <= 23; x += 3) k.r(x, 6, x + 1, 6, "#f4e6c0");
    striped(k, 6, 25, 11, 12, "#d64545", "#f4f4f4");
    k.r(8, 14, 17, 21, "#9fc7e8");
    k.r(9, 15, 10, 16, "#d6ecfa");
    k.r(20, 15, 23, 23, "#6b4a2f");
  },
  pharmacy(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 23, 31, 27, "#8a8e96");
    k.r(6, 9, 25, 23, "#e8eef0");
    k.r(25, 9, 25, 23, shadowOf("#e8eef0"));
    k.r(13, 1, 18, 10, "#3fa05a");
    k.r(10, 4, 21, 7, "#3fa05a");
    k.r(14, 2, 17, 9, "#5fc47a");
    k.r(8, 13, 13, 19, "#9fc7e8");
    k.r(18, 13, 23, 19, "#9fc7e8");
    k.r(14, 16, 17, 23, "#5a8a6a");
  },
  supermarket(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(2, 7, 29, 24, "#d9d2c0");
    k.r(2, 7, 29, 10, "#2f6ab0");
    for (let x = 5; x <= 26; x += 3) k.px(x, 8, "#f4f4f4");
    k.r(4, 13, 27, 21, "#9fc7e8");
    for (let x = 4; x <= 27; x += 5) k.r(x, 13, x, 21, "#d9d2c0");
    k.r(13, 16, 18, 24, "#6fa0d8");
    k.r(3, 25, 6, 26, "#b6bbc3");
    k.r(24, 25, 27, 26, "#b6bbc3");
  },
  hardware_store(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 23, 31, 27, "#8a8e96");
    k.r(4, 8, 25, 23, "#8a6a4f");
    for (let y = 10; y < 23; y += 3) k.r(4, y, 25, y, "#7a5c43");
    k.r(4, 5, 25, 8, "#e0602a");
    k.r(8, 6, 12, 6, "#f4f4f4");
    k.r(10, 6, 10, 7, "#f4f4f4");
    k.r(7, 12, 14, 19, "#9fc7e8");
    k.r(17, 14, 21, 23, "#5a3b24");
    for (let i = 0; i < 4; i++) k.r(26 + i, 13 + i, 27 + i, 23, "#c49a64");
  },
  urgent_care(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(3, 7, 22, 23, "#eef2f5");
    k.r(22, 7, 22, 23, shadowOf("#eef2f5"));
    k.r(3, 5, 22, 7, "#3f8f6a");
    for (let x = 5; x <= 19; x += 5) k.r(x, 11, x + 2, 13, "#9fc7e8");
    k.r(10, 16, 15, 23, "#9fc7e8");
    k.r(12, 1, 13, 4, "#d64545");
    k.r(11, 2, 14, 3, "#d64545");
    // the ambulance in its bay
    k.r(23, 15, 31, 22, "#f4f4f4");
    k.r(23, 18, 31, 18, "#d64545");
    k.r(28, 16, 30, 17, "#9fc7e8");
    k.r(25, 13, 26, 14, "#4a8aff");
    k.r(24, 22, 25, 23, "#222");
    k.r(29, 22, 30, 23, "#222");
  },
  police_station(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 23, 31, 27, "#8a8e96");
    k.r(5, 9, 26, 23, "#5a6a85");
    k.r(4, 7, 27, 9, "#3a4a63");
    k.r(12, 4, 15, 6, "#d64545");
    k.r(16, 4, 19, 6, "#3f6fb5");
    k.r(15, 11, 16, 14, "#f4c542");
    k.r(13, 12, 18, 13, "#f4c542");
    for (const x of [7, 21]) k.r(x, 12, x + 3, 16, "#9fc7e8");
    k.r(13, 17, 18, 23, "#2a3348");
  },
  electronics_store(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(2, 8, 29, 24, "#5a6478");
    k.r(2, 8, 29, 9, lightOf("#5a6478"));
    k.r(4, 4, 27, 7, "#1e2a4a");
    for (let x = 6; x <= 24; x += 3) k.r(x, 5, x + 1, 6, "#7fe0ff");
    for (const x of [4, 17]) {
      k.r(x, 12, x + 10, 20, "#14181f");
      k.r(x + 1, 13, x + 9, 19, x === 4 ? "#3f8fd0" : "#7a5ad6");
      k.r(x + 2, 14, x + 4, 15, "#bfe3f5");
    }
    k.r(14, 18, 17, 24, "#9fc7e8");
  },
  neighborhood(k) {
    k.r(0, 0, 31, 27, "#5f9e5a");
    k.speckle("#6fae6a", 30);
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(3, 14, 13, 23, "#e9dcc0");
    gable(k, 2, 14, 13, "#b04a3a");
    k.r(7, 18, 9, 23, "#6b4a2f");
    k.r(4, 16, 5, 17, "#9fc7e8");
    k.r(18, 15, 28, 23, "#cfe0e8");
    gable(k, 17, 29, 14, "#4a6fb0");
    k.r(22, 19, 24, 23, "#6b4a2f");
    k.r(26, 17, 27, 18, "#9fc7e8");
    tree(k, 15, 5);
  },
  farmstead(k) {
    k.r(0, 0, 31, 27, "#7fbd74");
    k.speckle("#6fae6a", 30);
    k.r(4, 11, 20, 24, "#b03030");
    gable(k, 3, 21, 10, "#7a2020");
    k.r(9, 16, 15, 24, "#e9dcc0");
    k.r(10, 17, 14, 24, "#8a2525");
    for (let i = 0; i <= 4; i++) {
      k.px(10 + i, 17 + i, "#e9dcc0");
      k.px(14 - i, 17 + i, "#e9dcc0");
    }
    k.r(23, 6, 28, 24, "#b9c2cc");
    k.r(24, 5, 27, 5, "#8a96a3");
    for (const y of [10, 15, 20]) k.r(23, y, 28, y, "#9aa5b1");
    for (let x = 0; x < TW; x += 4) k.r(x, 25, x, 27, "#c49a64");
    k.r(0, 26, 31, 26, "#c49a64");
  },

  gas_station(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(2, 5, 22, 8, "#d64545");
    k.r(2, 7, 22, 7, "#f4f4f4");
    k.r(4, 9, 4, 24, "#b6bbc3");
    k.r(20, 9, 20, 24, "#b6bbc3");
    for (const x of [8, 14]) {
      k.r(x, 16, x + 2, 23, "#e0a536");
      k.r(x, 17, x + 2, 18, "#2a2d33");
    }
    k.r(23, 12, 30, 24, "#d8c7a6");
    k.r(24, 15, 29, 19, "#9fc7e8");
    k.r(26, 2, 27, 11, "#6b6f78");
    k.r(24, 1, 29, 4, "#d64545");
    k.r(25, 2, 28, 3, "#f4d35e");
  },
  garden_center(k) {
    k.r(0, 0, 31, 27, "#5f9e5a");
    k.speckle("#6fae6a", 25);
    k.r(4, 9, 27, 21, "#cfeee6");
    gable(k, 3, 28, 8, "#a8d8cc");
    for (let x = 4; x <= 27; x += 4) k.r(x, 9, x, 21, "#8fc0b4");
    for (let x = 6; x <= 26; x += 4) k.r(x, 17, x + 1, 20, "#4caf7d");
    k.r(13, 15, 18, 21, "#9fd0c6");
    for (let x = 1; x < 31; x += 3) {
      k.px(x, 24, ["#d64545", "#f4d35e", "#8a5ad6", "#f08a3a"][x % 4]);
      k.px(x + 1, 25, "#3f8f4f");
    }
  },
  fire_station(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(3, 7, 28, 24, "#a8462c");
    for (let y = 9; y < 24; y += 3) k.r(3, y, 28, y, "#93391f");
    k.r(2, 5, 29, 7, "#6b2a1a");
    k.r(12, 1, 18, 7, "#a8462c");
    k.r(14, 2, 16, 4, "#f4d35e");
    for (const x of [5, 17]) {
      k.r(x, 12, x + 9, 24, "#e9e9e9");
      for (let y = 14; y < 24; y += 2) k.r(x, y, x + 9, y, "#c9ccd2");
    }
    k.r(7, 19, 12, 24, "#d64545");
    k.r(8, 20, 11, 21, "#9fc7e8");
  },
  church(k) {
    k.r(0, 0, 31, 27, "#4a5a48");
    k.speckle("#566a53", 25);
    k.r(8, 11, 23, 24, "#b8b0a0");
    k.r(8, 11, 8, 24, lightOf("#b8b0a0"));
    gable(k, 7, 24, 10, "#6b6259");
    k.r(13, 1, 18, 11, "#b8b0a0");
    gable(k, 13, 18, 1, "#6b6259");
    k.r(15, -1, 15, 0, "#f4d35e");
    k.disc(15.5, 14, 2.2, "#8a5ad6");
    k.px(15, 13, "#f4d35e");
    k.px(16, 15, "#3fa7d6");
    k.r(14, 18, 17, 24, "#6b4a2f");
    for (const x of [2, 5, 26, 29]) {
      k.r(x, 21, x + 1, 24, "#9a948a");
      k.px(x, 20, "#9a948a");
    }
  },
  marina(k) {
    k.r(0, 0, 31, 13, "#5f9e5a");
    k.r(0, 14, 31, 27, "#3a6ea5");
    for (let i = 0; i < 10; i++) k.r(Math.floor(k.rng() * 28), 16 + Math.floor(k.rng() * 11), Math.floor(k.rng() * 28) + 2, 16 + Math.floor(k.rng() * 11), "#6fa0d8");
    k.r(4, 6, 13, 13, "#8a5f33");
    gable(k, 3, 14, 5, "#3f6fb5");
    k.r(7, 9, 9, 13, "#5a3b24");
    k.r(15, 12, 18, 25, "#a8753f");
    for (let y = 13; y < 25; y += 2) k.r(15, y, 18, y, "#8a5f33");
    k.r(20, 17, 28, 20, "#f4f4f4");
    k.r(21, 21, 27, 21, "#c9ccd2");
    k.r(23, 12, 23, 17, "#8a5f33");
    k.r(24, 12, 26, 15, "#e9dcc0");
  },
  warehouse(k) {
    k.r(0, 0, 31, 27, "#3b3f47");
    k.r(0, 24, 31, 27, "#6b6f78");
    k.r(1, 6, 30, 23, "#8a96a3");
    for (let x = 2; x < 30; x += 2) k.r(x, 7, x, 23, "#7a8693");
    k.r(0, 4, 31, 6, "#5d6974");
    for (const x of [4, 13, 22]) k.r(x, 14, x + 6, 23, "#4a5560");
    k.r(4, 10, 27, 11, "#e0a536");
    for (const [x, y] of [[2, 24], [11, 25], [26, 24]]) k.r(x, y, x + 3, y + 2, "#a8753f");
    k.r(19, 22, 22, 25, "#f4c542");
    k.r(22, 20, 22, 25, "#3a3a3a");
  },
  library(k) {
    k.r(0, 0, 31, 27, "#4a5448");
    k.speckle("#556053", 20);
    k.r(0, 25, 31, 27, "#8a8e96");
    // stone front with a pediment, columns and a wide flight of steps
    k.r(4, 9, 27, 22, "#d9d2c0");
    gable(k, 3, 28, 8, "#b8b0a0");
    k.r(10, 5, 21, 5, "#9a948a");
    k.r(4, 9, 27, 10, "#9a948a");
    for (let x = 6; x <= 25; x += 4) {
      k.r(x, 11, x + 1, 21, "#f4efe4");
      k.r(x + 1, 11, x + 1, 21, "#c9c2b2");
    }
    k.r(14, 15, 17, 22, "#6b4a2f");
    k.r(15, 16, 16, 17, "#8a5f33");
    for (let i = 0; i < 3; i++) k.r(3 - i, 22 + i, 28 + i, 22 + i, i % 2 ? "#b8b0a0" : "#c9c2b2");
    // a stack of books by the door
    for (const [y, c] of [[20, "#d64545"], [19, "#3f6fb5"], [18, "#4caf7d"]]) k.r(19, y, 21, y, c);
  },
  petting_zoo(k) {
    k.r(0, 0, 31, 27, "#7fbd74");
    k.speckle("#6fae6a", 30);
    k.r(2, 5, 12, 13, "#b03030");
    gable(k, 1, 13, 4, "#7a2020");
    k.r(6, 9, 8, 13, "#e9dcc0");
    for (let x = 0; x < 32; x += 3) k.r(x, 15, x, 18, "#c49a64");
    k.r(0, 16, 31, 16, "#c49a64");
    k.disc(20, 9, 2.5, "#f4f4f4");
    k.r(22, 8, 23, 9, "#3a3a3a");
    k.r(18, 11, 18, 12, "#3a3a3a");
    k.r(21, 11, 21, 12, "#3a3a3a");
    k.r(8, 20, 15, 23, "#f4f4f4");
    k.r(10, 20, 11, 21, "#3a3a3a");
    k.r(13, 22, 14, 23, "#3a3a3a");
    k.r(16, 20, 17, 21, "#e8c7a0");
    k.r(8, 24, 8, 25, "#3a3a3a");
    k.r(14, 24, 14, 25, "#3a3a3a");
    k.r(23, 21, 26, 23, "#d8a640");
    k.px(27, 22, "#e04040");
  },
  army_surplus(k) {
    k.r(0, 0, 31, 27, "#4a4a3a");
    k.r(0, 24, 31, 27, "#8a8e96");
    k.r(4, 8, 27, 24, "#5a6a3a");
    for (let i = 0; i < 14; i++) k.r(4 + Math.floor(k.rng() * 22), 9 + Math.floor(k.rng() * 6), 5 + Math.floor(k.rng() * 22), 10 + Math.floor(k.rng() * 6), k.rng() < 0.5 ? "#4a5a2e" : "#6b7a45");
    k.r(4, 5, 27, 8, "#3a4a28");
    k.r(14, 6, 17, 7, "#f4c542");
    k.r(8, 16, 23, 24, "#8a8e96");
    for (let y = 17; y < 24; y += 2) k.r(8, y, 23, y, "#6b6f78");
    k.r(11, 18, 14, 19, "#2a2d33");
    for (const x of [0, 26]) {
      k.r(x, 22, x + 5, 23, "#c9b58c");
      k.r(x + 1, 20, x + 4, 21, "#c9b58c");
    }
  },

  // --- raid lairs, drawn big in the map's corners: tilePixels("lair:<raid id>") ---
  lair(k, id) {
    LAIRS[id](k);
  },
};

// 44 x 40 — a raid's compound, drawn like the school campus (a little smaller): its own grounds,
// the main building and what's around it. citymap.js paints it into the town past the map's
// edge, with a fence and the town carrying on around it.
export const LAIR_W = 44;
export const LAIR_H = 40;
const LAIRS = {
  // The City Mall: a pink mall with a glass dome over the entrance, a sign, two anchor stores,
  // skylights over the food court, and a parking lot of abandoned cars with lamp posts.
  mall(k) {
    k.r(0, 0, 43, 39, "#4e525a");
    for (let x = 2; x < 43; x += 5) {
      k.r(x, 27, x, 31, "#b6bbc3");
      k.r(x, 34, x, 38, "#b6bbc3");
    }
    for (const [x, y, c] of [[3, 28, "#b03030"], [13, 28, "#3f6fb5"], [28, 28, "#e0a536"], [38, 34, "#4caf7d"], [8, 34, "#f4f4f4"], [23, 34, "#8a5ad6"]]) car(k, x, y, c, true);
    for (const x of [1, 21, 42]) {
      k.r(x, 26, x, 32, "#6b6f78");
      k.px(x, 26, "#fff0a8");
    }
    k.r(3, 25, 40, 25, "#2c3038");
    roof(k, 2, 6, 11, 24, "#b0607a");
    roof(k, 32, 6, 41, 24, "#7a5ab0");
    k.r(11, 9, 32, 24, "#d98fb0");
    k.r(11, 9, 32, 9, lightOf("#d98fb0"));
    k.r(11, 24, 32, 24, shadowOf("#d98fb0"));
    for (const x of [13, 18, 26]) k.r(x, 11, x + 2, 12, "#bff0ec");
    k.ellipse(21.5, 12, 6.5, 4.5, "#5fb4b0");
    k.ellipse(21.5, 12, 4.5, 3, "#9fe0dc");
    k.px(20, 10, "#e8fffc");
    k.r(14, 3, 29, 6, "#e8c14a");
    k.r(15, 4, 28, 5, "#fff0a8");
    for (let x = 16; x <= 27; x += 3) k.px(x, 4, "#d64545");
    k.r(17, 16, 26, 24, "#9fe0dc");
    for (let x = 17; x <= 26; x += 3) k.r(x, 16, x, 24, "#5fb4b0");
    for (const x of [4, 35]) {
      k.r(x, 17, x + 4, 24, "#2a2d33");
      k.r(x + 1, 18, x + 3, 19, x === 4 ? "#f08a9a" : "#c9a0f0");
    }
    k.r(12, 26, 15, 29, "#2c3e6b");
    k.r(12, 26, 15, 26, "#ff4a4a");
    k.px(13, 26, "#4a8aff");
    for (const x of [10, 33]) { tree(k, x, 2, false); }
  },
  // The General Hospital: a white tower with a red cross and a rooftop helipad, a lower wing, the
  // emergency entrance under a red canopy, a drop-off loop with ambulances, and the lawn.
  hospital(k) {
    k.r(0, 0, 43, 39, "#5f9e5a");
    for (let x = 0; x < 44; x += 4) k.r(x, 0, x + 1, 39, "#58965a");
    k.ellipse(21.5, 35, 17, 5, "#4e525a");
    k.ellipse(21.5, 35, 11, 2.2, "#5f9e5a");
    for (const [x, y] of [[10, 33], [27, 31]]) {
      k.r(x, y, x + 5, y + 3, "#f4f4f4");
      k.r(x, y + 2, x + 5, y + 2, "#d64545");
      k.px(x + 2, y, "#4a8aff");
      k.px(x + 3, y, "#ff4a4a");
    }
    roof(k, 28, 12, 41, 27, "#dfe6ea");
    for (let y = 15; y <= 24; y += 4) for (let x = 30; x <= 38; x += 4) k.r(x, y, x + 1, y + 1, "#9fc7e8");
    k.r(6, 28, 39, 28, "#3f6f3a");
    k.r(6, 4, 27, 27, "#eef2f5");
    k.r(6, 4, 6, 27, "#ffffff");
    k.r(27, 4, 27, 27, shadowOf("#eef2f5"));
    k.r(5, 2, 28, 4, "#9aa0a8");
    k.disc(10, 3, 1.6, "#5b616d");
    k.px(10, 3, "#f4d35e");
    for (let y = 13; y <= 21; y += 4) for (let x = 8; x <= 25; x += 3) k.r(x, y, x + 1, y + 1, "#9fc7e8");
    k.r(15, 5, 18, 11, "#d64545");
    k.r(13, 7, 20, 9, "#d64545");
    k.r(11, 24, 22, 25, "#d64545");
    k.r(11, 24, 22, 24, "#f07a6a");
    k.r(13, 26, 20, 27, "#9fc7e8");
    for (const [x, y] of [[2, 6], [2, 16], [41, 4], [36, 30]]) tree(k, x, y, false);
  },
  // The Military Base: a sandbagged gate, a watchtower, two tents, a long barracks, a helipad, a
  // tank and a supply truck on the packed dirt, and the flag.
  military_base(k) {
    k.r(0, 0, 43, 39, "#7a7452");
    for (let i = 0; i < 70; i++) k.px(Math.floor(k.rng() * 44), Math.floor(k.rng() * 40), k.rng() < 0.5 ? "#6a6446" : "#8a845e");
    roof(k, 2, 3, 25, 10, "#5a6a3a");
    for (let x = 4; x <= 23; x += 4) k.r(x, 6, x + 1, 7, "#2a3020");
    gable(k, 29, 37, 9, "#5a6a3a");
    gable(k, 29, 41, 18, "#4a5a30");
    k.disc(9, 21, 5.5, "#5b616d");
    k.disc(9, 21, 4.4, "#6b6f78");
    k.r(7, 19, 7, 23, "#f4d35e");
    k.r(11, 19, 11, 23, "#f4d35e");
    k.r(7, 21, 11, 21, "#f4d35e");
    k.r(19, 26, 32, 32, "#4a5a30");
    k.r(19, 26, 32, 26, "#5a6a3a");
    k.r(22, 23, 29, 26, "#3a4a28");
    k.r(29, 24, 38, 25, "#3a4a28");
    for (let x = 20; x <= 31; x += 3) k.r(x, 32, x + 1, 33, "#222");
    k.r(35, 28, 42, 33, "#5a6a3a");
    k.r(39, 28, 42, 30, "#8fb0c8");
    k.r(35, 31, 38, 33, "#c9b58c");
    k.r(14, 13, 14, 23, "#6b4a2f");
    k.r(20, 13, 20, 23, "#6b4a2f");
    k.r(13, 11, 21, 13, "#8a5f33");
    k.r(14, 10, 20, 11, "#465533");
    k.r(40, 2, 40, 11, "#9aa0a8");
    k.r(41, 2, 43, 4, "#d64545");
    for (const y of [35, 37]) for (let x = (y === 35 ? 2 : 4); x < 18; x += 4) {
      k.r(x, y, x + 2, y + 1, "#c9b58c");
      k.r(x, y + 1, x + 2, y + 1, "#a8946a");
    }
    for (const y of [35, 37]) for (let x = (y === 35 ? 26 : 28); x < 43; x += 4) {
      k.r(x, y, x + 2, y + 1, "#c9b58c");
      k.r(x, y + 1, x + 2, y + 1, "#a8946a");
    }
  },
  // The Research Institute: a dark glass tower with glowing lab windows and a dish on the roof, a
  // domed lab beside it, a biohazard sign, quarantine tape and something green seeping out.
  institute(k) {
    k.r(0, 0, 43, 39, "#8a8e96");
    for (let x = 0; x < 44; x += 4) for (let y = 0; y < 40; y += 4) k.px(x, y, "#7a7e86");
    k.r(4, 30, 39, 30, "#2c3038");
    k.r(10, 3, 30, 29, "#4a6a8a");
    k.r(10, 3, 10, 29, lightOf("#4a6a8a"));
    k.r(30, 3, 30, 29, shadowOf("#4a6a8a"));
    k.r(9, 1, 31, 3, "#3a4a5e");
    k.disc(26, 1, 1.8, "#d0d4da");
    k.px(26, 0, "#ff4a4a");
    for (let y = 6; y <= 22; y += 3) for (let x = 12; x <= 27; x += 3) k.r(x, y, x + 1, y + 1, k.rng() < 0.3 ? "#b07fe0" : "#7fa8d0");
    k.r(16, 24, 23, 29, "#9fc7e8");
    k.r(19, 24, 20, 29, "#5f7f9f");
    k.ellipse(37, 20, 6, 5, "#c9ced4");
    k.ellipse(37, 20, 4.5, 3.5, "#e6eaee");
    k.r(31, 20, 43, 29, "#c9ced4");
    k.r(31, 20, 43, 20, "#e6eaee");
    for (const x of [33, 37, 41]) k.r(x, 23, x + 1, 25, "#b07fe0");
    k.r(2, 18, 7, 24, "#f4d35e");
    k.px(4, 20, "#222");
    k.px(5, 20, "#222");
    k.px(4, 22, "#222");
    k.r(4, 25, 5, 29, "#6b6f78");
    k.ellipse(19.5, 33, 7, 2.5, "#7fd13a");
    k.ellipse(19.5, 33, 4, 1.2, "#b8f070");
    k.r(19, 30, 20, 31, "#7fd13a");
    striped(k, 0, 43, 37, 37, "#f4d35e", "#2a2a2a");
    for (const [x, y] of [[36, 33], [40, 34]]) {
      k.r(x, y, x + 3, y + 2, "#e6eaee");
      k.px(x + 1, y, "#f4d35e");
    }
  },
};

export const CAMPUS_W = 50;
export const CAMPUS_H = 52;

const tileCache = new Map();

// A tile's pixels: { w, h, g } with g[y][x] a colour (or null), for a key from hexTileKey().
export function tilePixels(key) {
  const [kind, variant = "0"] = key.split(":");
  const [w, h] = kind === "campus" ? [CAMPUS_W, CAMPUS_H] : kind === "lair" ? [LAIR_W, LAIR_H] : [32, 28];
  const seed = [...key].reduce((acc, ch) => Math.imul(acc ^ ch.charCodeAt(0), 16777619), 2166136261);
  const k = canvas(seed, w, h);
  TILES[kind](k, kind === "lair" ? variant : Number(variant));
  return { w, h, g: k.g };
}

// data: URI of a tile's SVG, for a key from hexTileKey() (or "school" / "campus").
export function tileDataUri(key) {
  if (!tileCache.has(key)) {
    const { w, h, g } = tilePixels(key);
    const k = { g };
    let rects = "";
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; ) {
        const c = k.g[y][x];
        let run = 1;
        while (x + run < w && k.g[y][x + run] === c) run++;
        if (c) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
        x += run;
      }
    }
    const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
    tileCache.set(key, `data:image/svg+xml,${encodeURIComponent(svg)}`);
  }
  return tileCache.get(key);
}

// CSS url() of a tile.
export function tileBackground(key) {
  return `url('${tileDataUri(key)}')`;
}
