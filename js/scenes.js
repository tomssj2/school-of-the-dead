// Procedural pixel-art backdrops for each room and a small set of pixel icons, drawn in the same
// style as the character sprites (no image assets). Scenes are 96x24 and anchored to the floor so
// wider cards crop from the top; the UI stands the room's characters on top of them.

import { shadowOf, lightOf, outlineOf } from "./sprite.js";

// ---------- room scenes ----------

const SW = 96;
const SH = 24;

function indoor(r, wall, wallLow, floor, floorLine, style, w = SW) {
  r(0, 0, w - 1, 15, wall);
  r(0, 10, w - 1, 14, wallLow);
  r(0, 10, w - 1, 10, shadowOf(wallLow));
  r(0, 15, w - 1, 15, "#2a2230");
  r(0, 16, w - 1, 23, floor);
  if (style === "wood") {
    for (const y of [18, 21]) r(0, y, w - 1, y, floorLine);
    for (let x = 5; x < w; x += 16) {
      r(x, 16, x, 17, floorLine);
      r(x + 8, 19, x + 8, 20, floorLine);
      r(x + 4, 22, x + 4, 23, floorLine);
    }
  } else if (style === "checker") {
    for (let x = 0; x < w; x += 4) for (let y = 16; y < SH; y += 4) if ((x / 4 + (y - 16) / 4) % 2) r(x, y, x + 3, y + 3, floorLine);
  } else if (style === "tile") {
    for (let x = 0; x < w; x += 6) r(x, 16, x, 23, floorLine);
    r(0, 19, w - 1, 19, floorLine);
    r(0, 22, w - 1, 22, floorLine);
  } else if (style === "carpet") {
    for (let x = 1; x < w; x += 4) for (let y = 17; y < SH; y += 3) r(x + (y % 2), y, x + (y % 2), y, floorLine);
  } else if (style === "concrete") {
    r(0, 19, w - 1, 19, floorLine);
    for (const [x, y0, y1] of [[30, 16, 18], [62, 20, 23], [14, 20, 23], [80, 16, 18]]) r(x, y0, x, y1, floorLine);
  }
  r(0, 16, w - 1, 16, shadowOf(floor));
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
  // Twice as wide as the other rooms: the PE side (weights, bench, punching bag) on the left and
  // the Gymnastics side (rings, balance beam, crash mats) on the right, a folding partition between.
  gym(r) {
    indoor(r, "#7d9cc4", "#6384ad", "#c48d55", "#ad7a45", "wood", 192);
    // PE side
    r(4, 2, 22, 5, "#d64545");
    r(6, 3, 20, 3, "#f4d35e");
    r(6, 7, 26, 14, "#6b6f78");
    r(6, 7, 26, 7, "#8a8e96");
    for (const y of [9, 12]) {
      r(7, y, 25, y, "#3a3a3a");
      for (let x = 8; x <= 24; x += 4) r(x, y - 1, x + 1, y + 1, "#2a2d33");
    }
    r(40, 12, 58, 13, "#8a5f33");
    r(41, 14, 42, 15, "#6b4a2f");
    r(56, 14, 57, 15, "#6b4a2f");
    r(44, 6, 45, 12, "#9aa0a8");
    r(53, 6, 54, 12, "#9aa0a8");
    r(40, 5, 58, 5, "#3a3a3a");
    r(38, 4, 40, 7, "#2a2d33");
    r(58, 4, 60, 7, "#2a2d33");
    r(76, 0, 76, 3, "#5d6168");
    r(73, 4, 79, 13, "#b03030");
    r(73, 4, 73, 13, "#d0453e");
    r(73, 13, 79, 13, "#7a2020");
    r(62, 20, 66, 21, "#2a2d33");
    r(63, 19, 65, 19, "#2a2d33");
    // the partition down the middle
    r(95, 0, 96, 15, "#5a4a3a");
    for (let y = 1; y < 15; y += 3) r(94, y, 97, y, "#6b5a48");
    r(95, 16, 96, 23, "#3a3030");
    // Gymnastics side
    r(170, 2, 188, 5, "#3f6fb5");
    r(172, 3, 186, 3, "#f4d35e");
    for (const x of [108, 116]) {
      r(x, 0, x, 7, "#9aa0a8");
      r(x - 1, 8, x + 1, 8, "#c9b58c");
      r(x - 2, 9, x - 2, 10, "#c9b58c");
      r(x + 2, 9, x + 2, 10, "#c9b58c");
      r(x - 1, 11, x + 1, 11, "#c9b58c");
    }
    r(126, 11, 152, 12, "#c49a64");
    r(126, 11, 152, 11, "#e0b884");
    r(129, 13, 130, 15, "#6b6f78");
    r(148, 13, 149, 15, "#6b6f78");
    r(160, 9, 172, 12, "#8a5f33");
    r(160, 9, 172, 9, "#a8753f");
    r(162, 13, 163, 15, "#6b4a2f");
    r(169, 13, 170, 15, "#6b4a2f");
    r(104, 18, 150, 22, "#3f6fd6");
    r(104, 18, 150, 18, "#6f9ae8");
    for (let x = 112; x < 150; x += 12) r(x, 18, x, 22, "#2f5ab8");
    r(0, 19, 94, 19, "#efe6cf");
    r(178, 20, 180, 22, "#e0602a");
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
  // A classroom looks like whatever its teacher teaches (the subject a room takes on when a
  // teacher is posted there), or abandoned while nobody is.
  classroom_empty(r) {
    indoor(r, "#7d8c80", "#6a786d", "#9a8266", "#86705a", "wood");
    r(18, 2, 72, 11, "#6b4a2f");
    r(19, 3, 71, 10, "#3a4540");
    for (const [x0, x1, y] of [[24, 40, 5], [46, 60, 7], [30, 36, 8]]) r(x0, y, x1, y, "#56625c");
    r(19, 11, 71, 11, "#5a3b24");
    // chairs stacked in the corner
    for (let i = 0; i < 3; i++) {
      r(4, 12 - i * 3, 12, 12 - i * 3, "#8a5a3a");
      r(4, 12 - i * 3, 4, 15 - i * 3, "#6b4a2f");
      r(12, 12 - i * 3, 12, 15 - i * 3, "#6b4a2f");
    }
    // cobwebs and scattered papers
    for (const [x, y] of [[0, 0], [1, 1], [2, 0], [0, 2], [93, 0], [94, 1], [95, 0], [95, 2]]) r(x, y, x, y, "#c9ccd2");
    for (const [x, y] of [[30, 20], [52, 22], [70, 19], [84, 21]]) r(x, y, x + 2, y, "#e8e2d0");
    r(80, 2, 86, 8, "#c9ccd2");
    r(83, 3, 83, 5, "#555555");
  },
  classroom_Biology(r) {
    indoor(r, "#9cc9a8", "#86b594", "#d9dfe2", "#c2cacd", "tile");
    // plant-cell poster
    r(4, 2, 16, 11, "#f4f6f8");
    r(5, 3, 15, 10, "#b8e0b0");
    r(8, 5, 11, 8, "#4caf7d");
    r(9, 6, 10, 7, "#8a5ad6");
    // chalkboard with a DNA doodle
    r(20, 2, 58, 11, "#6b4a2f");
    r(21, 3, 57, 10, "#2f4a3a");
    for (let x = 24; x < 54; x += 2) {
      r(x, 4 + Math.round(Math.sin(x / 2) * 2 + 2), x, 4 + Math.round(Math.sin(x / 2) * 2 + 2), "#e8efe8");
      r(x, 4 + Math.round(-Math.sin(x / 2) * 2 + 2), x, 4 + Math.round(-Math.sin(x / 2) * 2 + 2), "#f4d35e");
    }
    // skeleton model
    r(63, 2, 65, 4, "#f4f4f4");
    r(64, 5, 64, 11, "#f4f4f4");
    for (const y of [6, 8]) r(62, y, 66, y, "#f4f4f4");
    r(61, 6, 61, 9, "#f4f4f4");
    r(67, 6, 67, 9, "#f4f4f4");
    r(63, 12, 63, 14, "#f4f4f4");
    r(65, 12, 65, 14, "#f4f4f4");
    r(62, 15, 66, 15, "#8a8e96");
    // lab bench with a microscope and flasks
    r(72, 10, 94, 11, "#3a4a4a");
    r(73, 12, 74, 15, "#5a6a6a");
    r(92, 12, 93, 15, "#5a6a6a");
    r(76, 6, 77, 9, "#3a3f48");
    r(75, 9, 79, 9, "#3a3f48");
    r(77, 5, 79, 5, "#3a3f48");
    for (const [x, c] of [[83, "#4caf7d"], [87, "#3fa7d6"], [90, "#e0602a"]]) {
      r(x, 7, x + 1, 9, c);
      r(x, 6, x + 1, 6, "#dfe4ea");
    }
    // potted plant
    r(18, 12, 20, 15, "#b04a3a");
    r(17, 9, 21, 11, "#4caf7d");
    r(19, 8, 19, 8, "#6fcf97");
  },
  classroom_Physics(r) {
    indoor(r, "#5a6f9a", "#4a5e87", "#4b5569", "#3f485b", "tile");
    // whiteboard with formulas
    r(14, 2, 60, 11, "#c9ccd2");
    r(15, 3, 59, 10, "#f4f6f8");
    for (const [x0, x1, y, c] of [[17, 27, 4, "#3f6fb5"], [30, 34, 4, "#d64545"], [17, 23, 6, "#222222"], [26, 40, 6, "#3f6fb5"], [17, 31, 8, "#222222"], [44, 57, 5, "#3f6fb5"], [44, 50, 8, "#d64545"]]) r(x0, y, x1, y, c);
    r(52, 7, 52, 9, "#222222");
    r(51, 8, 53, 8, "#222222");
    // atom model
    r(4, 5, 10, 5, "#f4d35e");
    r(3, 6, 3, 8, "#f4d35e");
    r(11, 6, 11, 8, "#f4d35e");
    r(4, 9, 10, 9, "#f4d35e");
    r(6, 6, 8, 8, "#d64545");
    r(7, 3, 7, 11, "#8fd4f4");
    // tesla coil with a spark
    r(68, 12, 72, 15, "#6b6f78");
    r(69, 6, 71, 11, "#c49a64");
    for (let y = 7; y < 11; y++) r(69, y, 71, y, y % 2 ? "#a8753f" : "#c49a64");
    r(68, 4, 72, 5, "#b6bbc3");
    for (const [x, y] of [[73, 3], [74, 2], [75, 3], [76, 1], [66, 2], [65, 1]]) r(x, y, x, y, "#f4f4a0");
    // desk with a newton's cradle
    r(80, 10, 94, 11, "#8a5a3a");
    r(81, 12, 82, 15, "#6b4a2f");
    r(92, 12, 93, 15, "#6b4a2f");
    r(83, 5, 91, 5, "#9aa0a8");
    r(83, 5, 83, 9, "#9aa0a8");
    r(91, 5, 91, 9, "#9aa0a8");
    for (let x = 85; x <= 89; x += 2) {
      r(x, 6, x, 7, "#c9ccd2");
      r(x, 8, x, 8, "#e0e4ea");
    }
  },
  classroom_History(r) {
    indoor(r, "#a8825a", "#8f6a45", "#7a3a3a", "#6a2f2f", "carpet");
    for (let x = 0; x < 96; x += 8) r(x, 10, x, 14, "#7a5a3a");
    // world map
    r(20, 2, 62, 11, "#8a5a3a");
    r(21, 3, 61, 10, "#e8d8b0");
    for (const [x0, y0, x1, y1] of [[24, 4, 31, 7], [26, 8, 29, 9], [36, 4, 41, 6], [38, 7, 40, 9], [44, 4, 54, 7], [50, 8, 53, 9], [57, 8, 59, 9]]) r(x0, y0, x1, y1, "#8fae6a");
    r(33, 6, 35, 6, "#d64545");
    // bookshelf
    r(3, 2, 15, 15, "#5a3b24");
    for (const y of [6, 10, 14]) r(3, y, 15, y, "#3a2618");
    const books = ["#d64545", "#3f6fb5", "#4caf7d", "#e0a536", "#8a5ad6", "#e8d8b0"];
    for (const y0 of [3, 7, 11]) for (let x = 4; x <= 14; x += 2) r(x, y0, x, y0 + 2, books[(x + y0) % books.length]);
    // globe on a stand
    r(70, 4, 76, 10, "#3f6fb5");
    r(71, 5, 73, 7, "#8fae6a");
    r(74, 8, 75, 9, "#8fae6a");
    r(69, 7, 69, 7, "#c9a03a");
    r(77, 7, 77, 7, "#c9a03a");
    r(73, 11, 73, 14, "#c9a03a");
    r(71, 15, 75, 15, "#8a6a3a");
    // bust on a plinth
    r(85, 3, 89, 7, "#c9ccd2");
    r(84, 8, 90, 10, "#b6bbc3");
    r(84, 11, 90, 15, "#e8e2d0");
  },
  classroom_SocialStudies(r) {
    indoor(r, "#e0c08a", "#cda870", "#bf8f5c", "#a87a4a", "wood");
    // bunting
    const flags = ["#d64545", "#3f6fb5", "#4caf7d", "#f4d35e", "#8a5ad6", "#f08a3a"];
    r(0, 1, 95, 1, "#8a5a3a");
    for (let x = 1; x < 96; x += 6) {
      const c = flags[(x / 6 | 0) % flags.length];
      r(x, 2, x + 3, 2, c);
      r(x + 1, 3, x + 2, 3, c);
    }
    // corkboard with pinned notes and photos
    r(20, 4, 56, 12, "#8a5f33");
    r(21, 5, 55, 11, "#c49a64");
    for (const [x, y, c] of [[23, 6, "#f4f4a0"], [29, 7, "#a8d8f0"], [35, 6, "#f4b8c8"], [41, 8, "#f4f4a0"], [47, 6, "#f4f6f8"], [51, 8, "#a8e8b0"]]) {
      r(x, y, x + 3, y + 2, c);
      r(x + 1, y, x + 1, y, "#d64545");
    }
    // clock
    r(64, 5, 68, 9, "#f4f6f8");
    r(66, 6, 66, 7, "#222222");
    r(66, 7, 67, 7, "#222222");
    // round discussion table
    r(74, 11, 92, 12, "#8a5a3a");
    r(74, 11, 92, 11, "#a8753f");
    r(82, 13, 84, 15, "#6b4a2f");
    for (const x of [72, 94]) r(x, 12, x + 1, 15, "#c0583a");
    // potted plant by the window
    r(6, 12, 9, 15, "#b04a3a");
    r(5, 8, 10, 11, "#4caf7d");
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
    // tool shed
    r(6, 8, 18, 15, "#a8753f");
    r(5, 7, 19, 7, "#6b4a2f");
    r(7, 6, 17, 6, "#6b4a2f");
    for (let x = 8; x <= 16; x += 3) r(x, 9, x, 15, "#8a5f33");
    r(11, 11, 13, 15, "#5a3b24");
    // scarecrow
    r(70, 5, 70, 15, "#8a5f33");
    r(66, 8, 74, 8, "#8a5f33");
    r(69, 3, 71, 5, "#e8c27a");
    r(68, 2, 72, 2, "#b0452f");
    r(68, 6, 72, 10, "#4a7fb5");
    r(67, 8, 67, 9, "#e8c27a");
    r(73, 8, 73, 9, "#e8c27a");
    // crop rows: wheat, tomatoes, potatoes
    for (const y of [19, 22]) r(0, y, 95, y, "#5a3b24");
    for (const [y, x0, stalk, top] of [[18, 2, "#d9b44a", "#f0d27a"], [21, 4, "#3f8f4f", "#d64545"], [23, 1, "#4caf7d", "#6fcf97"]]) {
      for (let x = x0; x < SW; x += 6) {
        r(x, y - 1, x + 1, y, stalk);
        r(x, y - 2, x + 1, y - 2, top);
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
  ranch(r) {
    outdoor(r, ["#86bce4", "#9bc9ec", "#b2d6f1", "#cae3f5"], "#6fae6a");
    for (const [x, y] of [[30, 2], [62, 4]]) {
      r(x, y, x + 8, y + 1, "#f4f8fc");
      r(x + 2, y - 1, x + 5, y - 1, "#f4f8fc");
    }
    r(0, 12, 95, 15, "#7fbd74");
    // barn with hayloft and X-braced doors
    r(4, 6, 26, 15, "#b03030");
    r(3, 5, 27, 5, "#7a2020");
    r(6, 3, 24, 4, "#7a2020");
    r(10, 2, 20, 2, "#7a2020");
    r(13, 6, 17, 8, "#3a1a1a");
    r(13, 7, 17, 7, "#e0b84a");
    r(10, 10, 20, 15, "#e9dcc0");
    r(11, 11, 19, 15, "#8a2525");
    for (let i = 0; i <= 4; i++) {
      r(11 + i * 2, 11 + i, 11 + i * 2 + 1, 11 + i, "#e9dcc0");
      r(18 - i * 2, 11 + i, 19 - i * 2, 11 + i, "#e9dcc0");
    }
    // silo
    r(28, 3, 33, 15, "#b9c2cc");
    r(29, 2, 32, 2, "#8a96a3");
    for (const y of [6, 9, 12]) r(28, y, 33, y, "#9aa5b1");
    // hay bales
    for (const x of [40, 46]) {
      r(x, 12, x + 4, 15, "#e0b84a");
      r(x, 13, x + 4, 13, "#c49a3a");
    }
    r(43, 9, 47, 11, "#e0b84a");
    r(43, 10, 47, 10, "#c49a3a");
    // water trough
    r(78, 13, 90, 15, "#8a5f33");
    r(79, 13, 89, 13, "#5fa8d8");
    // split-rail fence across the pasture
    for (const y of [17, 20]) r(0, y, 95, y, "#c49a64");
    for (let x = 3; x < SW; x += 8) r(x, 16, x + 1, 22, "#8a5f33");
    // grass tufts
    for (const [x, y] of [[10, 22], [26, 23], [44, 22], [58, 23], [72, 22], [88, 23]]) {
      r(x, y, x, y, "#4f9a55");
      r(x + 2, y, x + 2, y, "#4f9a55");
      r(x + 1, y - 1, x + 1, y - 1, "#4f9a55");
    }
  },
};

// Scenes are SW pixels wide unless listed here.
const SCENE_WIDTHS = { gym: 192 };
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
    const w = SCENE_WIDTHS[kind] || SW;
    const svg = `<svg viewBox="0 0 ${w} ${SH}" width="${w}" height="${SH}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
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
