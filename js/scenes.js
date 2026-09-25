// Procedural pixel-art backdrops for each room and a small set of pixel icons, drawn in the same
// style as the character sprites (no image assets). Scenes are 96x24 and anchored to the floor so
// wider cards crop from the top; the UI stands the room's characters on top of them.

import { shadowOf, lightOf, outlineOf } from "./sprite.js";

// ---------- room scenes ----------

const SW = 96;
const SH = 24;

function indoor(r, wall, wallLow, floor, floorLine, style) {
  r(0, 0, 95, 15, wall);
  r(0, 10, 95, 14, wallLow);
  r(0, 10, 95, 10, shadowOf(wallLow));
  r(0, 15, 95, 15, "#2a2230");
  r(0, 16, 95, 23, floor);
  if (style === "wood") {
    for (const y of [18, 21]) r(0, y, 95, y, floorLine);
    for (let x = 5; x < SW; x += 16) {
      r(x, 16, x, 17, floorLine);
      r(x + 8, 19, x + 8, 20, floorLine);
      r(x + 4, 22, x + 4, 23, floorLine);
    }
  } else if (style === "checker") {
    for (let x = 0; x < SW; x += 4) for (let y = 16; y < SH; y += 4) if ((x / 4 + (y - 16) / 4) % 2) r(x, y, x + 3, y + 3, floorLine);
  } else if (style === "tile") {
    for (let x = 0; x < SW; x += 6) r(x, 16, x, 23, floorLine);
    r(0, 19, 95, 19, floorLine);
    r(0, 22, 95, 22, floorLine);
  } else if (style === "carpet") {
    for (let x = 1; x < SW; x += 4) for (let y = 17; y < SH; y += 3) r(x + (y % 2), y, x + (y % 2), y, floorLine);
  } else if (style === "concrete") {
    r(0, 19, 95, 19, floorLine);
    for (const [x, y0, y1] of [[30, 16, 18], [62, 20, 23], [14, 20, 23], [80, 16, 18]]) r(x, y0, x, y1, floorLine);
  }
  r(0, 16, 95, 16, shadowOf(floor));
}

function outdoor(r, sky, ground) {
  sky.forEach((c, i) => r(0, i * 4, 95, i * 4 + 3, c));
  r(0, 16, 95, 23, ground);
  r(0, 16, 95, 16, lightOf(ground));
}

function bed(r, x0) {
  r(x0, 6, x0 + 1, 15, "#8f98a3");
  r(x0, 11, x0 + 22, 13, "#8f98a3");
  r(x0, 9, x0 + 22, 11, "#f6f8fa");
  r(x0 + 2, 8, x0 + 6, 9, "#ffffff");
  r(x0 + 8, 9, x0 + 22, 11, "#8fb8e8");
  r(x0 + 8, 9, x0 + 22, 9, "#b3cff2");
  r(x0 + 21, 14, x0 + 22, 15, "#6b737d");
}

const SCENES = {
  gym(r) {
    indoor(r, "#7d9cc4", "#6384ad", "#c48d55", "#ad7a45", "wood");
    for (let x = 4; x <= 14; x += 2) r(x, 3, x, 14, "#d8b27a");
    for (const y of [5, 8, 11]) r(4, y, 14, y, "#b58a55");
    r(38, 2, 58, 5, "#d64545");
    r(40, 3, 56, 3, "#f4d35e");
    r(44, 6, 52, 6, "#d64545");
    r(47, 7, 49, 7, "#d64545");
    r(90, 2, 91, 15, "#6b6f76");
    r(78, 3, 89, 9, "#f4f4f4");
    r(78, 3, 89, 3, "#c43d3d");
    for (const [x0, y0, x1, y1] of [[82, 5, 85, 5], [82, 7, 85, 7], [82, 5, 82, 7], [85, 5, 85, 7]]) r(x0, y0, x1, y1, "#c43d3d");
    r(81, 10, 86, 10, "#e0602a");
    for (let x = 81; x <= 86; x += 2) r(x, 11, x, 12, "#e8e8e8");
    r(0, 19, 95, 19, "#efe6cf");
    r(66, 20, 68, 22, "#e0602a");
    r(67, 20, 67, 22, "#7a2f10");
  },
  cafeteria(r) {
    indoor(r, "#eadfc4", "#d6c39c", "#d9d9d9", "#a9a9a9", "checker");
    for (let x = 0; x < SW; x += 4) r(x, 11, x, 14, "#c9b58c");
    r(4, 8, 42, 15, "#8f96a2");
    r(4, 8, 42, 9, "#c3c9d2");
    for (const x of [14, 24, 34]) r(x, 10, x, 15, "#7a808b");
    for (const x of [7, 15, 23, 31]) {
      r(x, 7, x + 5, 7, "#6b7a8f");
      r(x + 1, 6, x + 2, 6, "#e0a536");
      r(x + 3, 6, x + 4, 6, "#4caf7d");
    }
    r(50, 2, 70, 9, "#8a5a3a");
    r(51, 3, 69, 8, "#2f3d33");
    for (const [x1, y] of [[62, 4], [66, 6], [58, 8]]) r(53, y, x1, y, "#dfe7df");
    r(82, 0, 82, 4, "#555555");
    r(79, 5, 85, 6, "#f4d35e");
    r(24, 17, 72, 18, "#a8753f");
    r(24, 17, 72, 17, "#c48d55");
    r(26, 19, 27, 22, "#7a5230");
    r(69, 19, 70, 22, "#7a5230");
  },
  infirmary(r) {
    indoor(r, "#c4e6da", "#a9d6c6", "#e6ebef", "#ccd4da", "tile");
    r(34, 1, 62, 1, "#9aa3ad");
    r(34, 2, 38, 15, "#ef8fb3");
    r(35, 2, 35, 15, "#d9739a");
    r(37, 2, 37, 15, "#d9739a");
    bed(r, 6);
    bed(r, 66);
    r(42, 3, 56, 13, "#f4f6f8");
    r(42, 3, 56, 3, "#cfd6db");
    r(48, 5, 50, 11, "#d64545");
    r(45, 7, 53, 9, "#d64545");
  },
  lounge(r) {
    indoor(r, "#6e5b91", "#5a4979", "#8a6a4f", "#7a5c43", "carpet");
    r(61, 1, 79, 10, "#e9dcc0");
    r(62, 2, 78, 9, "#9fc7e8");
    r(70, 2, 70, 9, "#e9dcc0");
    r(62, 5, 78, 5, "#e9dcc0");
    r(8, 8, 40, 11, "#c0583a");
    r(8, 8, 40, 8, "#d8704f");
    r(6, 11, 42, 14, "#a8462c");
    r(6, 11, 42, 11, "#c0583a");
    r(6, 9, 9, 14, "#93391f");
    r(39, 9, 42, 14, "#93391f");
    r(24, 9, 24, 13, "#93391f");
    r(50, 4, 50, 15, "#4a4a4a");
    r(47, 2, 53, 4, "#f4d35e");
    r(48, 15, 52, 15, "#4a4a4a");
    r(84, 11, 89, 15, "#9a5a3a");
    r(82, 5, 91, 10, "#4caf7d");
    r(84, 4, 89, 4, "#5fc48f");
    r(86, 2, 87, 3, "#5fc48f");
    r(20, 18, 70, 21, "#b04a3a");
    r(22, 19, 68, 20, "#d8704f");
  },
  classroom(r) {
    indoor(r, "#86a891", "#6f927b", "#bf8f5c", "#a87a4a", "wood");
    r(18, 2, 72, 11, "#8a5a3a");
    r(19, 3, 71, 10, "#2f4a3a");
    for (const [x0, x1, y] of [[22, 34, 4], [22, 40, 6], [22, 30, 8], [48, 62, 5], [48, 56, 7]]) r(x0, y, x1, y, "#e8efe8");
    r(64, 4, 68, 8, "#f4d35e");
    r(19, 11, 71, 11, "#6b4a2f");
    r(80, 2, 86, 8, "#f4f6f8");
    r(83, 3, 83, 5, "#222222");
    r(83, 5, 85, 5, "#222222");
    r(4, 11, 16, 12, "#8a5a3a");
    r(4, 13, 5, 15, "#6b4a2f");
    r(15, 13, 16, 15, "#6b4a2f");
    r(6, 9, 8, 10, "#e84a4a");
    r(7, 8, 7, 8, "#4caf7d");
  },
  research(r) {
    indoor(r, "#3c465c", "#30394d", "#4b5569", "#3f485b", "tile");
    const vials = ["#4caf7d", "#8a5ad6", "#3fa7d6", "#e0a536", "#d64545"];
    for (const y of [5, 10]) {
      r(4, y, 32, y, "#8a6a4f");
      vials.forEach((c, i) => {
        const x = 6 + i * 5;
        r(x, y - 3, x + 2, y - 1, c);
        r(x + 1, y - 4, x + 1, y - 4, "#dfe4ea");
      });
    }
    r(38, 11, 72, 12, "#9aa3ad");
    r(40, 13, 41, 15, "#6b737d");
    r(69, 13, 70, 15, "#6b737d");
    r(44, 6, 45, 10, "#dfe4ea");
    r(42, 10, 48, 10, "#dfe4ea");
    r(46, 6, 47, 7, "#dfe4ea");
    r(56, 8, 59, 10, "#4caf7d");
    r(56, 7, 59, 7, "#dfe4ea");
    r(62, 9, 64, 10, "#8a5ad6");
    r(76, 3, 92, 11, "#1c2331");
    r(77, 4, 91, 10, "#10261c");
    for (const [x1, y] of [[86, 5], [90, 7], [83, 9]]) r(78, y, x1, y, "#4caf7d");
    r(83, 12, 85, 15, "#2a3140");
  },
  crafting(r) {
    indoor(r, "#70747b", "#5d6168", "#80848a", "#6e7278", "concrete");
    r(6, 2, 40, 11, "#b58a55");
    for (let x = 8; x <= 38; x += 4) for (const y of [4, 7, 10]) r(x, y, x, y, "#8a6a3f");
    r(12, 3, 12, 9, "#8a5a3a");
    r(10, 3, 14, 4, "#9aa3ad");
    r(22, 3, 23, 9, "#9aa3ad");
    r(21, 3, 24, 4, "#9aa3ad");
    r(30, 4, 37, 6, "#cfd6db");
    r(36, 4, 38, 8, "#8a5a3a");
    r(46, 10, 90, 12, "#8a5a3a");
    r(46, 10, 90, 10, "#a8753f");
    r(48, 13, 49, 15, "#6b4a2f");
    r(87, 13, 88, 15, "#6b4a2f");
    r(52, 8, 56, 9, "#6b6f76");
    r(62, 8, 80, 9, "#c49a64");
    for (const [x, y, c] of [[70, 6, "#f4d35e"], [72, 5, "#f4d35e"], [68, 5, "#e0602a"], [74, 7, "#f4d35e"]]) r(x, y, x, y, c);
    r(92, 4, 93, 15, "#c49a64");
  },
  council(r) {
    indoor(r, "#3d4c7d", "#324069", "#6a3d3d", "#5a3232", "carpet");
    r(40, 1, 56, 11, "#d64545");
    r(40, 1, 56, 1, "#b03030");
    r(47, 4, 49, 6, "#f4d35e");
    r(48, 3, 48, 7, "#f4d35e");
    r(46, 5, 50, 5, "#f4d35e");
    r(40, 12, 43, 13, "#d64545");
    r(53, 12, 56, 13, "#d64545");
    r(8, 3, 18, 11, "#e0a536");
    r(10, 5, 16, 5, "#8a5a1a");
    r(10, 7, 14, 7, "#8a5a1a");
    r(78, 3, 88, 11, "#4caf7d");
    r(80, 5, 86, 5, "#1f5a38");
    r(80, 7, 84, 7, "#1f5a38");
    r(20, 12, 76, 13, "#8a5a3a");
    r(20, 12, 76, 12, "#a8753f");
    r(24, 14, 25, 15, "#6b4a2f");
    r(71, 14, 72, 15, "#6b4a2f");
    r(44, 8, 52, 11, "#e9dcc0");
    r(46, 8, 50, 8, "#8a8a8a");
  },
  farm(r) {
    outdoor(r, ["#7fb8e6", "#93c6ec", "#a9d3f0", "#c2e0f4"], "#6b4a2f");
    for (const [x, y] of [[40, 3], [74, 5]]) {
      r(x, y, x + 7, y + 1, "#f4f8fc");
      r(x + 2, y - 1, x + 5, y - 1, "#f4f8fc");
    }
    r(0, 11, 40, 15, "#6fae6a");
    r(30, 12, 70, 15, "#5f9e5a");
    r(60, 11, 95, 15, "#6fae6a");
    r(6, 6, 20, 15, "#b03030");
    r(5, 5, 21, 6, "#7a2020");
    r(8, 4, 18, 4, "#7a2020");
    r(11, 10, 15, 15, "#7a2020");
    r(11, 10, 15, 10, "#e9dcc0");
    r(24, 13, 95, 13, "#c49a64");
    for (let x = 24; x < SW; x += 6) r(x, 12, x, 15, "#a8753f");
    for (const y of [18, 21]) {
      r(0, y + 1, 95, y + 1, "#5a3b24");
      for (let x = 2; x < SW; x += 5) {
        r(x, y - 1, x + 1, y, "#4caf7d");
        r(x, y - 2, x, y - 2, "#6fcf97");
      }
    }
  },
  scrapyard(r) {
    outdoor(r, ["#c99a7a", "#d4a887", "#dfb795", "#e6c4a4"], "#6a5a4a");
    r(4, 10, 34, 15, "#6b6f76");
    r(8, 7, 30, 10, "#7a7d82");
    r(12, 5, 24, 7, "#5d6168");
    r(10, 8, 13, 9, "#8a5a3a");
    r(20, 6, 22, 7, "#a8462c");
    r(26, 11, 30, 12, "#4a5a6a");
    r(16, 12, 19, 13, "#c49a64");
    r(50, 9, 80, 14, "#7a3a2a");
    r(55, 6, 72, 9, "#6a3222");
    r(57, 7, 62, 8, "#9fc7e8");
    r(64, 7, 70, 8, "#5a7a8a");
    r(53, 14, 57, 16, "#222222");
    r(72, 14, 76, 16, "#222222");
    for (const y of [10, 12, 14]) r(84, y, 92, y + 1, y === 12 ? "#333333" : "#222222");
    r(87, 10, 89, 15, "#4a4a4a");
    for (const [x, y] of [[40, 19], [44, 21], [12, 20], [30, 22], [66, 20], [86, 21]]) r(x, y, x + 1, y, "#8a8d92");
  },
  lab(r) {
    outdoor(r, ["#a9d8d0", "#b8e0d9", "#c8e8e2", "#d6efea"], "#7a8a6a");
    r(6, 2, 90, 2, "#6f9a94");
    r(8, 3, 88, 15, "#d6efea");
    for (let x = 8; x <= 88; x += 10) r(x, 3, x, 15, "#8fb8b2");
    r(8, 9, 88, 9, "#8fb8b2");
    r(14, 12, 40, 13, "#8a6a4f");
    for (const x of [16, 22, 28, 34]) r(x, 10, x + 2, 11, "#4caf7d");
    r(54, 12, 82, 13, "#9aa3ad");
    for (const [x, c] of [[58, "#8a5ad6"], [64, "#3fa7d6"], [70, "#e0a536"], [76, "#4caf7d"]]) {
      r(x, 9, x + 2, 11, c);
      r(x + 1, 8, x + 1, 8, "#eef3f7");
    }
  },
};

const sceneCache = new Map();

// Returned as a CSS url() so the banner can tile it sideways — full-width cards get a longer
// room instead of a stretched or cropped one.
export function sceneBackground(kind) {
  if (!sceneCache.has(kind)) {
    let rects = "";
    const r = (x0, y0, x1, y1, c) => {
      rects += `<rect x="${x0}" y="${y0}" width="${x1 - x0 + 1}" height="${y1 - y0 + 1}" fill="${c}"/>`;
    };
    SCENES[kind](r);
    const svg = `<svg viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
    sceneCache.set(kind, `url('data:image/svg+xml,${encodeURIComponent(svg)}')`);
  }
  return sceneCache.get(kind);
}

// ---------- pixel icons ----------
// 12x12, filled shapes only — the dark outline is added automatically, like the sprites.

const IW = 12;
const blank = () => Array.from({ length: IW }, () => Array(IW).fill(null));

function ascii(rows, palette) {
  const g = blank();
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== ".") g[y][x] = palette[ch];
  }));
  return g;
}
function disk(g, cx, cy, rad, color) {
  for (let y = 0; y < IW; y++) for (let x = 0; x < IW; x++) {
    if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad) g[y][x] = color;
  }
  return g;
}
function face(mouth) {
  const g = disk(blank(), 6, 6, 4.8, "#f4c542");
  g[3][4] = "#fbe08a";
  g[3][5] = "#fbe08a";
  for (const [x, y] of [[4, 5], [7, 5]]) g[y][x] = "#3a2a1a";
  for (const [x, y] of mouth) g[y][x] = "#8a3a1a";
  return g;
}

const ICONS = {
  food: () => ascii([
    "............",
    "............",
    "....yyyy....",
    "..yyYyyYyy..",
    ".yyyyyyyyyy.",
    ".yyYyyyYyyy.",
    ".yyyyyyyyyy.",
    ".bbbbbbbbbb.",
    "............",
    "............",
    "............",
    "............",
  ], { y: "#e8b04a", Y: "#f6d58a", b: "#b77b34" }),
  scrap: () => {
    const g = disk(blank(), 6, 6, 3.4, "#9aa3ad");
    for (let a = 0; a < 8; a++) {
      const x = Math.round(5.5 + Math.cos((a * Math.PI) / 4) * 4.4);
      const y = Math.round(5.5 + Math.sin((a * Math.PI) / 4) * 4.4);
      g[y][x] = "#9aa3ad";
    }
    disk(g, 6, 6, 1.3, null);
    g[4][4] = "#cfd6db";
    g[3][5] = "#cfd6db";
    return g;
  },
  medicine: () => ascii([
    "............",
    "............",
    "............",
    "............",
    "..rrrrwwww..",
    ".rRrrrwwwww.",
    ".rrrrrwwwww.",
    "..rrrrwwww..",
    "............",
    "............",
    "............",
    "............",
  ], { r: "#d64545", R: "#ff9a9a", w: "#eef3f7" }),
  research: () => ascii([
    "............",
    "....wwww....",
    ".....ww.....",
    ".....ww.....",
    "....wwww....",
    "...wwwwww...",
    "..pppppppp..",
    ".pppPppppPp.",
    ".pppppppppp.",
    ".ppppppPppp.",
    "..pppppppp..",
    "............",
  ], { w: "#d9eef5", p: "#8a5ad6", P: "#c3a3f5" }),
  people: () => ascii([
    "............",
    "..ss....ss..",
    ".ssss..ssss.",
    ".ssss..ssss.",
    "..ss....ss..",
    "............",
    ".uuuu..cccc.",
    "uuuuuucccccc",
    "uuuuuucccccc",
    "uuuuuucccccc",
    "............",
    "............",
  ], { s: "#f2c9a0", u: "#3f7fd6", c: "#4caf7d" }),
  teacher: () => ascii([
    "............",
    "............",
    ".....nn.....",
    "...nnnnnn...",
    ".nnnnNnnnnn.",
    "...nnnnnn.y.",
    "....nnnn..y.",
    "....nnnn..y.",
    "..........yy",
    "............",
    "............",
    "............",
  ], { n: "#2c3e6b", N: "#5a73b5", y: "#e8c14a" }),
  mood_happy: () => face([[3, 7], [8, 7], [4, 8], [5, 8], [6, 8], [7, 8]]),
  mood_ok: () => face([[4, 8], [5, 8], [6, 8], [7, 8]]),
  mood_sad: () => face([[4, 7], [5, 7], [6, 7], [7, 7], [3, 8], [8, 8]]),
  sun: () => {
    const g = disk(blank(), 6, 6, 2.7, "#f4c542");
    for (let a = 0; a < 8; a++) {
      const x = Math.round(5.5 + Math.cos((a * Math.PI) / 4) * 4.5);
      const y = Math.round(5.5 + Math.sin((a * Math.PI) / 4) * 4.5);
      g[y][x] = "#f7d774";
    }
    g[4][5] = "#fbe7a6";
    return g;
  },
  dusk: () => {
    const g = disk(blank(), 6, 8.5, 3.6, "#f08a3a");
    for (let x = 0; x < IW; x++) for (let y = 9; y < IW; y++) g[y][x] = null;
    for (let x = 1; x < 11; x++) g[9][x] = "#7a4a6a";
    for (const [x, y] of [[1, 5], [10, 5], [3, 3], [8, 3], [6, 2]]) g[y][x] = "#f7b26a";
    return g;
  },
  moon: () => {
    const g = disk(blank(), 6, 6, 4.2, "#e8e2c0");
    disk(g, 8.2, 4.6, 3.4, null);
    g[2][9] = "#ffffff";
    g[9][10] = "#ffffff";
    return g;
  },
};

const iconCache = new Map();

export function pixelIcon(name, size = 16) {
  if (!iconCache.has(name)) {
    const g = ICONS[name]();
    const color = g.map((row) => [...row]);
    for (let y = 0; y < IW; y++) for (let x = 0; x < IW; x++) {
      if (g[y][x]) continue;
      const touching = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => g[y + dy]?.[x + dx]).find(Boolean);
      if (touching) color[y][x] = outlineOf(touching);
    }
    let rects = "";
    for (let y = 0; y < IW; y++) {
      for (let x = 0; x < IW; ) {
        const c = color[y][x];
        let run = 1;
        while (c && x + run < IW && color[y][x + run] === c) run++;
        if (c) rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${c}"/>`;
        x += run;
      }
    }
    iconCache.set(name, rects);
  }
  return `<svg class="px-icon" viewBox="0 0 ${IW} ${IW}" width="${size}" height="${size}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${iconCache.get(name)}</svg>`;
}

export function moodIcon(happiness, size) {
  return pixelIcon(happiness >= 65 ? "mood_happy" : happiness >= 35 ? "mood_ok" : "mood_sad", size);
}
