// Procedural pixel-art backdrops for each room and a small set of pixel icons, drawn in the same
// style as the character sprites (no image assets). Scenes are anchored to the floor, and wider
// cards tile them sideways; the UI stands the room's characters on top of them.

import { shadowOf, lightOf, outlineOf, mix } from "./sprite.js";

// ---------- high-resolution room scenes ----------
// 192x48, twice the detail of the old 96x24 ones, and drawn by room level: a level-1 room is
// run-down (boarded windows, cracks, boxes), each level adds equipment, light and decor, and a
// maxed room is fully kitted out. Rows 0-31 are wall (the wainscot from 22), 32-47 the floor.
// The banner's labels cover the top corners (roughly x < 70 and x > 100 above y 14) and the crowd
// the floor, so the pieces that should be seen hang on the wall between y 10 and 30.

const HW = 192;
const HH = 48;

// A filled box with a darker 1px edge.
function box(r, x0, y0, x1, y1, fill, edge = shadowOf(fill)) {
  r(x0, y0, x1, y1, edge);
  if (x1 - x0 > 1 && y1 - y0 > 1) r(x0 + 1, y0 + 1, x1 - 1, y1 - 1, fill);
}

// Walls of painted cinder block over a wainscot, a baseboard, and a plank or tile floor.
function hiRoom(r, { wall, wainscot, floor, floorLine, blocks = true }) {
  r(0, 0, HW - 1, 31, wall);
  if (blocks) {
    const mortar = mix(wall, "#1d2330", 0.18);
    for (let y = 4; y < 22; y += 5) {
      r(0, y, HW - 1, y, mortar);
      for (let x = (y / 5) % 2 ? 0 : 8; x < HW; x += 16) r(x, y - 4, x, y - 1, mortar);
    }
  }
  r(0, 22, HW - 1, 30, wainscot);
  r(0, 22, HW - 1, 22, lightOf(wainscot));
  r(0, 23, HW - 1, 23, shadowOf(wainscot));
  r(0, 31, HW - 1, 31, "#241c2a");
  r(0, 32, HW - 1, 47, floor);
  r(0, 32, HW - 1, 32, shadowOf(floor));
  for (let y = 36; y < HH; y += 4) {
    r(0, y, HW - 1, y, floorLine);
    for (let x = (y / 4) % 2 ? 6 : 20; x < HW; x += 28) r(x, y - 3, x, y - 1, floorLine);
  }
}

// A hanging ceiling lamp: `on` glows, off (or broken) hangs dark.
function lamp(r, x, len, on) {
  r(x, 0, x, len, "#3a3f48");
  r(x - 3, len + 1, x + 3, len + 2, on ? "#f4d35e" : "#5a5f68");
  r(x - 2, len + 1, x + 2, len + 1, on ? "#fff4b0" : "#6a707a");
  if (on) for (const [dx, dy] of [[-5, 4], [5, 4], [-3, 5], [3, 5], [0, 5]]) r(x + dx, len + dy, x + dx, len + dy, "#fff4b066");
}

// Window `w` wide on the wall; level 1 boarded up, level 2 half-boarded, then clean glass.
function hiWindow(r, x, y, w, h, lv) {
  box(r, x, y, x + w, y + h, "#3a4150");
  r(x + 1, y + 1, x + w - 1, y + h - 1, lv <= 1 ? "#262b36" : "#a9d4ef");
  if (lv >= 2) {
    r(x + 1, y + h - 2, x + w - 1, y + h - 1, "#cfe8f8");
    for (let i = 0; i < 3; i++) r(x + 3 + i, y + 1 + i, x + 3 + i, y + 1 + i, "#ffffff");
  }
  r(x + Math.floor(w / 2), y + 1, x + Math.floor(w / 2), y + h - 1, "#3a4150");
  const board = (yy) => { r(x - 1, yy, x + w + 1, yy + 1, "#8a5f33"); r(x - 1, yy, x + w + 1, yy, "#a8753f"); };
  if (lv <= 1) { board(y + 1); board(y + Math.floor(h / 2)); board(y + h - 2); }
  else if (lv === 2) board(y + Math.floor(h / 2));
}

// ---- shared props ----
const crack = (r, x, y, c = "#2e3440") => {
  for (const [dx, dy] of [[0, 0], [1, 1], [1, 2], [2, 3], [3, 5], [2, 6], [4, 6]]) r(x + dx, y + dy, x + dx, y + dy, c);
};
// Level-1 clutter: a stack of cardboard boxes against the wall.
function boxes(r, x) {
  box(r, x, 20, x + 16, 31, "#a8814f");
  box(r, x + 4, 12, x + 16, 20, "#b58e5a");
  r(x, 25, x + 16, 25, "#8a6a3f");
  r(x + 8, 13, x + 9, 19, "#c9a36a");
  box(r, x + 18, 24, x + 32, 31, "#9c7747");
}
function plant(r, x, base) {
  box(r, x, base - 5, x + 6, base, "#b0673a", "#7a4424");
  r(x + 1, base - 9, x + 5, base - 6, "#4caf7d");
  r(x + 2, base - 12, x + 4, base - 10, "#5cc491");
  r(x - 1, base - 8, x, base - 7, "#3a8f63");
  r(x + 6, base - 8, x + 7, base - 7, "#3a8f63");
}
// A wall shelf with items [dx, height, color] standing on it.
function shelf(r, x0, x1, y, items) {
  r(x0, y, x1, y, "#8a5f33");
  r(x0, y + 1, x1, y + 1, "#5a3b24");
  for (const [dx, h, c] of items) box(r, x0 + dx, y - h, x0 + dx + 2, y - 1, c);
}
function chalkboard(r, x0, y0, x1, y1, dirty) {
  box(r, x0, y0, x1, y1, dirty ? "#3b423b" : "#2f4a3a", "#6b4a2f");
  r(x0 - 1, y0 - 1, x1 + 1, y0 - 1, "#8a5f33");
  r(x0, y1 + 1, x1, y1 + 1, "#8a5f33");
  r(x0 + 4, y1, x0 + 9, y1, "#f4f6f8");
}
function bookcase(r, x0, y0, x1, y1) {
  box(r, x0, y0, x1, y1, "#5a3b24", "#3a2618");
  const colors = ["#d64545", "#3f6fb5", "#f4d35e", "#4caf7d", "#8a5ad6", "#e0602a"];
  for (let y = y0 + 2, row = 0; y + 5 < y1; y += 6, row++) {
    for (let x = x0 + 2, i = row; x < x1 - 1; x += 2, i++) r(x, y + (i % 3 === 0 ? 1 : 0), x, y + 4, colors[i % colors.length]);
    r(x0 + 1, y + 5, x1 - 1, y + 5, "#6b4a2f");
  }
}
function desk(r, x0, x1, y, top = "#c49a64") {
  r(x0, y, x1, y + 1, top);
  r(x0, y, x1, y, lightOf(top));
  r(x0 + 1, y + 2, x0 + 2, 31, shadowOf(top));
  r(x1 - 2, y + 2, x1 - 1, 31, shadowOf(top));
}
// A hospital bed against the wall, or its bare frame (level 1).
function hiBed(r, x, bare) {
  box(r, x, 15, x + 3, 31, "#9aa5b1", "#6b737d");
  r(x + 3, 24, x + 36, 25, "#9aa5b1");
  r(x + 34, 22, x + 36, 31, "#9aa5b1");
  r(x + 5, 26, x + 5, 31, "#6b737d");
  r(x + 33, 26, x + 33, 31, "#6b737d");
  if (bare) return;
  box(r, x + 4, 20, x + 34, 23, "#f6f8fa", "#c9d2dc");
  box(r, x + 5, 18, x + 12, 21, "#ffffff", "#c9d2dc");
  box(r, x + 14, 19, x + 34, 23, "#8fb8e8", "#6f98c8");
  r(x + 15, 19, x + 33, 19, "#b3cff2");
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
  for (let i = 0; i < 6; i++) r(x + 6 - i, 11 - i, x + 28 + i, 11 - i, i ? "#8a3a2e" : "#b03a2e");
  r(x + 1, 6, x + 33, 6, "#6b2a22");
  box(r, x + 11, 20, x + 23, 31, "#f4f6f8", "#c9ccd2");
  for (let i = 0; i < 6; i++) { r(x + 12 + i * 2, 21 + i * 2, x + 13 + i * 2, 22 + i * 2, "#c9ccd2"); r(x + 22 - i * 2, 21 + i * 2, x + 21 - i * 2, 22 + i * 2, "#c9ccd2"); }
  box(r, x + 14, 13, x + 20, 17, "#3a2a24", "#f4f6f8");
}
function silo(r, x) {
  box(r, x, 8, x + 10, 31, "#b9c2cc", "#8a96a3");
  r(x + 1, 6, x + 9, 7, "#8a96a3");
  r(x + 3, 4, x + 7, 5, "#8a96a3");
  for (const y of [13, 19, 25]) r(x + 1, y, x + 9, y, "#9aa5b1");
}
function windmill(r, x) {
  for (let y = 8; y < 32; y++) r(x + Math.floor((y - 8) / 6), y, x + 6 - Math.floor((y - 8) / 6), y, y % 3 ? "#9aa0a8" : "#6b6f78");
  // four sails
  for (let i = 1; i <= 6; i++) for (const [dx, dy] of [[i, -i], [-i, i], [i, i], [-i, -i]]) r(x + 3 + dx, 7 + dy, x + 3 + dx, 7 + dy, "#e8e2d0");
  box(r, x + 2, 6, x + 4, 8, "#5a5f68");
}

const HI_SCENES = {
  // The Gymnasium, level 1 to 5: an abandoned hall with boxes and a rusty barbell, then a punching
  // bag and a bench, a weight rack and wall bars, a basketball hoop and mats, and at the top a
  // scoreboard, a trophy shelf and pennants under bright lights.
  gym(r, lv) {
    const wall = ["#5b6678", "#63789a", "#6a86b2", "#7090bd", "#7899c6"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#20283a", 0.35), floor: lv <= 1 ? "#8f6a48" : "#bd8a55", floorLine: lv <= 1 ? "#7a5a3c" : "#a37545" });
    // high windows, in the middle so the labels don't hide them
    for (let i = 0; i < 3; i++) hiWindow(r, 70 + i * 17, 2, 13, 8, lv);
    // lights
    if (lv <= 1) lamp(r, 96, 12, false);
    else for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, lv >= 5 ? 3 : 5, true);
    if (lv >= 5) for (const x of [34, 96, 158]) r(x - 4, 9, x + 4, 9, "#fff4b033");
    if (lv <= 2) {
      // cracks in the plaster and a taped-up X
      for (const [x, y] of [[20, 14], [21, 15], [22, 15], [23, 16], [24, 18], [120, 13], [121, 14], [121, 15], [122, 17]]) r(x, y, x, y, "#2e3440");
      for (let i = 0; i < 6; i++) { r(142 + i, 14 + i, 142 + i, 14 + i, "#c9b58c"); r(147 - i, 14 + i, 147 - i, 14 + i, "#c9b58c"); }
    }
    if (lv <= 1) {
      // boxes stacked against the wall and a rusty barbell
      box(r, 150, 20, 166, 31, "#a8814f");
      box(r, 154, 12, 166, 20, "#b58e5a");
      r(150, 25, 166, 25, "#8a6a3f");
      box(r, 168, 24, 182, 31, "#9c7747");
      r(52, 29, 80, 29, "#6b6259");
      for (const x of [52, 78]) box(r, x - 2, 26, x + 2, 31, "#5a524a");
      return;
    }
    // punching bag
    r(40, 0, 40, 13, "#5d6168");
    box(r, 36, 14, 44, 29, "#b03030", "#7a2020");
    r(37, 15, 38, 28, "#d0453e");
    r(36, 18, 44, 18, "#7a2020");
    // bench
    box(r, 102, 26, 126, 28, "#8a5f33");
    r(104, 29, 105, 31, "#6b4a2f");
    r(123, 29, 124, 31, "#6b4a2f");
    if (lv >= 3) {
      // weight rack with colored plates
      box(r, 50, 16, 66, 31, "#4a4f58");
      for (const [y, colors] of [[19, ["#d64545", "#3f6fb5", "#f4d35e"]], [25, ["#3a3a3a", "#d64545", "#3f6fb5"]]]) {
        r(51, y + 2, 65, y + 2, "#9aa0a8");
        colors.forEach((c, i) => box(r, 52 + i * 5, y, 55 + i * 5, y + 4, c));
      }
      // wall bars
      for (const x of [132, 146]) box(r, x, 11, x + 1, 30, "#c49a64", "#8a6a3f");
      for (let y = 13; y < 30; y += 3) r(133, y, 145, y, "#d9b27c");
    }
    if (lv >= 4) {
      // basketball hoop and backboard
      box(r, 166, 10, 186, 22, "#f4f6f8", "#9aa0a8");
      box(r, 172, 14, 180, 19, "#f4f6f8", "#d64545");
      r(171, 23, 181, 23, "#e0602a");
      for (let x = 172; x <= 180; x += 2) r(x, 24, x, 28, "#e8e8e8");
      r(173, 28, 179, 28, "#e8e8e8");
      // crash mats against the wall
      box(r, 108, 20, 126, 25, "#3f6fb5");
      r(109, 21, 125, 21, "#5b8ad0");
      // a ball on the floor
      box(r, 150, 28, 155, 31, "#e0602a", "#8a3a1a");
    }
    if (lv >= 5) {
      // scoreboard
      box(r, 68, 13, 98, 21, "#1d2026", "#3a3f48");
      for (const [x, c] of [[71, "#ff5b5b"], [75, "#ff5b5b"], [89, "#f4d35e"], [93, "#f4d35e"]]) box(r, x, 15, x + 2, 19, c, mix(c, "#000000", 0.5));
      r(82, 16, 84, 16, "#7fe0a8");
      r(82, 18, 84, 18, "#7fe0a8");
      // trophy shelf
      r(100, 17, 127, 17, "#6b4a2f");
      for (const x of [103, 110, 117, 123]) {
        box(r, x, 13, x + 3, 16, "#f4d35e", "#c9a227");
        r(x + 1, 14, x + 2, 14, "#fff4b0");
      }
      // pennants strung across the top of the wall
      for (let x = 70; x < 128; x += 6) {
        const c = ["#d64545", "#f4d35e", "#3f6fb5", "#4caf7d"][(x / 6) % 4 | 0];
        r(x, 11, x + 4, 11, c);
        r(x + 1, 12, x + 3, 12, c);
        r(x + 2, 13, x + 2, 13, c);
      }
      // court line and a polished shine on the floor
      r(0, 38, HW - 1, 38, "#efe6cf");
      for (const x of [30, 90, 140]) r(x, 34, x + 10, 34, "#e0b07a");
    }
  },

  // Acrobatics: a cracked mirror and a torn mat, then a mirror wall with a barre, rings and a
  // balance beam, a vault box and crash mats, and a medal board with streamers at the top.
  acrobatics(r, lv) {
    const wall = ["#77708a", "#8f82b3", "#9c8dc2", "#a797cc", "#b1a2d6"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#2a2240", 0.35), floor: lv <= 1 ? "#9a7a55" : "#d6ae78", floorLine: lv <= 1 ? "#846647" : "#bf9764" });
    for (let i = 0; i < 2; i++) hiWindow(r, 132 + i * 20, 2, 14, 8, lv);
    if (lv <= 1) {
      lamp(r, 96, 12, false);
      crack(r, 30, 14);
      crack(r, 124, 15);
      box(r, 70, 14, 100, 21, "#6f8a96", "#4a5058");
      for (const [x, y] of [[80, 15], [81, 16], [82, 17], [83, 18], [84, 19], [90, 16], [91, 17], [92, 18]]) r(x, y, x, y, "#c9ccd2");
      boxes(r, 150);
      box(r, 30, 28, 58, 31, "#3f5f85");
      r(52, 28, 58, 29, "#9a7a55");
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, lv >= 5 ? 3 : 5, true);
    // mirror wall with a barre
    const mx1 = lv >= 3 ? 124 : 104;
    box(r, 68, 9, mx1, 23, "#a8d4e8", "#8a8e96");
    for (const x0 of [74, 98]) for (let i = 0; i < 6; i++) r(x0 + i, 21 - i * 2, x0 + i, 22 - i * 2, "#e0f2fa");
    for (let x = 86; x < mx1; x += 18) r(x, 10, x, 22, "#c9ccd2");
    r(66, 20, mx1 + 2, 20, "#8a5f33");
    r(66, 21, 66, 25, "#6b4a2f");
    r(mx1 + 2, 21, mx1 + 2, 25, "#6b4a2f");
    if (lv >= 3) {
      // rings
      for (const x of [38, 50]) {
        r(x, 0, x, 14, "#9aa0a8");
        r(x - 2, 15, x + 2, 15, "#c9b58c");
        r(x - 2, 20, x + 2, 20, "#c9b58c");
        r(x - 3, 16, x - 3, 19, "#c9b58c");
        r(x + 3, 16, x + 3, 19, "#c9b58c");
      }
      // balance beam
      r(128, 23, 164, 24, "#c49a64");
      r(128, 23, 164, 23, "#e0b884");
      box(r, 131, 25, 133, 31, "#6b6f78");
      box(r, 159, 25, 161, 31, "#6b6f78");
    }
    if (lv >= 4) {
      // vault box and crash mats
      box(r, 170, 19, 186, 31, "#8a5f33");
      r(170, 19, 186, 20, "#e0cfa8");
      for (const y of [24, 28]) r(171, y, 185, y, "#6b4a2f");
      box(r, 12, 26, 56, 31, "#3f6fb5");
      r(13, 27, 55, 27, "#5b8ad0");
    }
    if (lv >= 5) {
      // medal board
      box(r, 12, 14, 28, 24, "#6b4a2f", "#4a3120");
      for (const [x, c] of [[15, "#f4d35e"], [20, "#c9ccd2"], [25, "#c98a4a"]]) {
        r(x, 15, x, 18, "#d64545");
        box(r, x - 1, 19, x + 1, 21, c);
      }
      // streamers from the ceiling
      for (let x = 70; x < 124; x += 5) r(x, 0, x, 2 + (x % 3), ["#d64545", "#f4d35e", "#3f6fb5", "#4caf7d"][(x / 5) % 4 | 0]);
      r(0, 38, HW - 1, 38, "#f4e3c0");
    }
  },

  // The Cafeteria: an empty, dusty hall with an overturned table, then a serving counter with a
  // pot, a menu board, trays of food and a fridge, tables and shelves of jars, and at the top
  // bunting, a coffee machine and warm lights.
  cafeteria(r, lv) {
    const wall = ["#8a8270", "#c9b68a", "#d4c093", "#dcc99c", "#e4d2a6"][lv - 1];
    hiRoom(r, { wall, wainscot: lv <= 1 ? "#6b6a5e" : "#5f8a6e", floor: lv <= 1 ? "#7d7a70" : "#e8e2d0", floorLine: lv <= 1 ? "#6e6b62" : "#c9c2ad", blocks: false });
    for (let x = 0; x < HW; x += 8) for (let y = 32; y < HH; y += 4) if (((x / 8) + (y - 32) / 4) % 2) r(x, y, x + 7, y + 3, lv <= 1 ? "#6e6b62" : "#cfc6ad");
    if (lv >= 2) for (let y = 3; y < 22; y += 3) r(0, y, HW - 1, y, mix(wall, "#ffffff", 0.18));
    // menu board
    chalkboard(r, 68, 10, 102, 25, lv <= 1);
    if (lv >= 2) for (const [y, w] of [[13, 18], [16, 22], [19, 14], [22, 20]]) r(72, y, 72 + w, y, lv >= 4 ? ["#f4f6f8", "#f4d35e", "#7fe0a8", "#f4f6f8"][((y - 13) / 3) % 4 | 0] : "#d8e0d8");
    if (lv >= 4) for (const y of [13, 16, 19, 22]) r(95, y, 98, y, "#f4d35e");
    if (lv <= 1) {
      lamp(r, 96, 12, false);
      crack(r, 40, 14);
      crack(r, 140, 13);
      // an overturned table and boxes
      r(24, 24, 50, 25, "#8a6a4a");
      r(26, 20, 27, 23, "#6b5a48");
      r(47, 20, 48, 23, "#6b5a48");
      boxes(r, 150);
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, 4, true);
    // serving counter
    box(r, 108, 21, 164, 31, "#9aa5b1", "#6b737d");
    r(108, 21, 164, 21, "#dfe6ee");
    box(r, 114, 15, 124, 21, "#6b6f78", "#4a4f58");
    r(113, 15, 125, 15, "#8a8e96");
    if (lv >= 3) {
      for (const x of [116, 119, 122]) r(x, 10 + (x % 2), x, 13, "#e8eef4aa");
      r(110, 12, 162, 12, "#bfe0f5");
      for (const x of [110, 162]) r(x, 13, x, 20, "#9aa5b1");
      for (const [x, c] of [[127, "#e0602a"], [139, "#f4d35e"], [151, "#4caf7d"]]) box(r, x, 17, x + 9, 20, c);
      // fridge
      box(r, 168, 8, 182, 31, "#dfe6ee", "#9aa5b1");
      r(169, 18, 181, 18, "#9aa5b1");
      r(179, 11, 179, 15, "#6b737d");
      r(179, 21, 179, 26, "#6b737d");
    }
    // a table and bench
    desk(r, 16, 52, 25, "#c49a64");
    r(20, 29, 48, 29, "#8a6a4a");
    if (lv >= 4) {
      shelf(r, 14, 54, 17, [[2, 4, "#e0602a"], [7, 5, "#f4d35e"], [12, 3, "#d64545"], [17, 5, "#4caf7d"], [24, 4, "#e8e2d0"], [30, 5, "#8a5ad6"], [36, 4, "#e0602a"]]);
      box(r, 28, 22, 34, 24, "#e0602a", "#8a3a1a");
    }
    if (lv >= 5) {
      for (let x = 66; x < 106; x += 5) {
        const c = ["#d64545", "#f4d35e", "#4caf7d", "#3f6fb5"][(x / 5) % 4 | 0];
        r(x, 1, x + 3, 1, c);
        r(x + 1, 2, x + 2, 2, c);
      }
      // coffee machine on the counter, a plant
      box(r, 152, 13, 160, 20, "#3a3f48", "#1d2026");
      r(154, 15, 158, 15, "#d64545");
      plant(r, 184, 31);
      box(r, 38, 22, 44, 24, "#f4d35e", "#c9a227");
    }
  },

  // The Nurse's Office: a bare bed frame and boxes, then a made bed and a red cross, a second bed
  // and an IV stand, a privacy curtain and a medicine cabinet, and a heart monitor and plants at
  // the top.
  infirmary(r, lv) {
    const wall = ["#8a948f", "#cfe3dc", "#d8ebe4", "#e0f0ea", "#e8f5f0"][lv - 1];
    hiRoom(r, { wall, wainscot: lv <= 1 ? "#6d7a74" : "#8fc4b8", floor: lv <= 1 ? "#8a8f8a" : "#e6ecef", floorLine: lv <= 1 ? "#737873" : "#c2cbd0", blocks: false });
    if (lv >= 2) for (let x = 0; x < HW; x += 8) r(x, 0, x, 21, mix(wall, "#6b8a80", 0.12));
    if (lv <= 1) {
      lamp(r, 96, 12, false);
      crack(r, 66, 13);
      crack(r, 130, 14);
      hiBed(r, 20, true);
      boxes(r, 150);
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, 3, true);
    // red cross
    box(r, 78, 9, 94, 23, "#f4f6f8", "#c9d2dc");
    r(84, 11, 88, 21, lv >= 3 ? "#d64545" : "#c98080");
    r(80, 14, 92, 18, lv >= 3 ? "#d64545" : "#c98080");
    hiBed(r, 16, false);
    if (lv >= 3) {
      hiBed(r, 124, false);
      // IV stand by the first bed
      r(58, 12, 58, 30, "#9aa0a8");
      r(55, 31, 61, 31, "#6b737d");
      box(r, 55, 12, 61, 17, "#d8f0ff", "#9ab8cc");
      r(58, 18, 58, 19, "#d64545");
    }
    if (lv >= 4) {
      // privacy curtain and medicine cabinet
      r(100, 7, 118, 7, "#9aa0a8");
      for (let x = 101; x < 118; x += 2) r(x, 8, x, 29, x % 4 === 1 ? "#8fc4b8" : "#b8ded4");
      box(r, 164, 11, 184, 30, "#dfe6ee", "#9aa5b1");
      r(165, 20, 183, 20, "#9aa5b1");
      for (const [x, y, c] of [[167, 15, "#d64545"], [171, 15, "#f4d35e"], [175, 16, "#3f6fb5"], [179, 15, "#4caf7d"], [167, 24, "#e8e2d0"], [172, 24, "#d64545"], [177, 25, "#8a5ad6"]]) box(r, x, y, x + 2, y + 4, c);
    }
    if (lv >= 5) {
      // heart monitor, eye chart, plant
      box(r, 64, 13, 76, 20, "#1d2026", "#3a3f48");
      for (const [x, y] of [[65, 17], [67, 17], [68, 15], [69, 18], [70, 16], [71, 17], [74, 17]]) r(x, y, x, y, "#7fe0a8");
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
    // a DNA helix on the board
    for (let x = 66; x < 126; x += 2) {
      r(x, 17 + Math.round(Math.sin(x / 3) * 4), x, 17 + Math.round(Math.sin(x / 3) * 4), "#e8efe8");
      r(x, 17 - Math.round(Math.sin(x / 3) * 4), x, 17 - Math.round(Math.sin(x / 3) * 4), "#f4d35e");
    }
    if (lv >= 3) {
      // plant-cell poster
      box(r, 24, 12, 44, 24, "#f4f6f8", "#c9d2dc");
      box(r, 26, 14, 42, 22, "#b8e0b0", "#4caf7d");
      box(r, 31, 16, 36, 20, "#8a5ad6", "#5a3a96");
      r(28, 15, 29, 15, "#4caf7d");
      r(39, 20, 40, 20, "#4caf7d");
    }
    if (lv >= 4) {
      // skeleton model
      box(r, 147, 9, 153, 14, "#f4f4f4", "#c9ccd2");
      r(149, 12, 151, 12, "#3a3f48");
      r(150, 15, 150, 25, "#f4f4f4");
      for (const y of [17, 19, 21]) r(146, y, 154, y, "#f4f4f4");
      r(145, 16, 145, 22, "#f4f4f4");
      r(155, 16, 155, 22, "#f4f4f4");
      r(148, 26, 148, 30, "#f4f4f4");
      r(152, 26, 152, 30, "#f4f4f4");
      r(144, 31, 156, 31, "#6b737d");
    }
    if (lv >= 5) {
      // microscope and an aquarium on the teacher's desk, plants
      box(r, 12, 19, 22, 25, "#8fd0e8", "#5a8aa0");
      r(15, 22, 17, 22, "#e0602a");
      r(19, 21, 20, 21, "#f4d35e");
      r(26, 20, 27, 24, "#3a3f48");
      r(25, 19, 28, 19, "#3a3f48");
      plant(r, 160, 31);
      plant(r, 58, 31);
    }
  },
  classroom_Physics(r, lv) {
    classroomBase(r, lv, "#9fb3d6");
    if (lv <= 1) return;
    // formulas and an atom on the board
    for (const [x, y, w] of [[66, 13, 16], [66, 17, 12], [66, 21, 18]]) r(x, y, x + w, y, "#e8efe8");
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      r(110 + Math.round(Math.cos(a) * 10), 18 + Math.round(Math.sin(a) * 4), 110 + Math.round(Math.cos(a) * 10), 18 + Math.round(Math.sin(a) * 4), "#7fc8f0");
      r(110 + Math.round(Math.cos(a) * 4), 18 + Math.round(Math.sin(a) * 6), 110 + Math.round(Math.cos(a) * 4), 18 + Math.round(Math.sin(a) * 6), "#f4d35e");
    }
    r(109, 17, 111, 19, "#d64545");
    if (lv >= 3) {
      // solar-system poster
      box(r, 24, 12, 46, 24, "#1d2240", "#3a3f60");
      box(r, 26, 16, 30, 20, "#f4d35e", "#e0a536");
      for (const [x, c] of [[33, "#c98a4a"], [36, "#3f6fb5"], [40, "#d64545"], [43, "#e0b884"]]) r(x, 18, x + 1, 18, c);
    }
    if (lv >= 4) {
      // Tesla coil
      box(r, 146, 26, 156, 31, "#3a3f48", "#1d2026");
      box(r, 149, 14, 153, 25, "#c98a4a", "#8a5a2a");
      for (let y = 15; y < 25; y += 2) r(149, y, 153, y, "#e0a060");
      box(r, 147, 10, 155, 13, "#c9ccd2", "#8a8e96");
    }
    if (lv >= 5) {
      // sparks off the coil, a model rocket, a pendulum
      for (const [x, y] of [[145, 9], [144, 8], [157, 9], [158, 7], [151, 8], [151, 7]]) r(x, y, x, y, "#bfe8ff");
      box(r, 16, 13, 20, 24, "#f4f6f8", "#9aa5b1");
      r(17, 11, 19, 12, "#d64545");
      r(15, 22, 21, 24, "#d64545");
      r(60, 22, 60, 29, "#9aa0a8");
      box(r, 58, 29, 62, 31, "#c9a227");
    }
  },
  classroom_History(r, lv) {
    classroomBase(r, lv, "#c9b28a");
    if (lv <= 1) return;
    // a timeline on the board
    r(66, 19, 126, 19, "#e8efe8");
    for (let x = 68; x < 126; x += 10) { r(x, 17, x, 21, "#e8efe8"); r(x - 1, 14, x + 1, 14, "#f4d35e"); }
    if (lv >= 3) {
      // world map
      box(r, 20, 12, 48, 25, "#8fc0e0", "#6b4a2f");
      for (const [x0, y0, x1, y1] of [[23, 15, 29, 19], [26, 20, 28, 23], [33, 14, 37, 17], [34, 18, 36, 22], [39, 14, 45, 18], [42, 20, 44, 22]]) r(x0, y0, x1, y1, "#6fae6a");
    }
    if (lv >= 4) {
      // globe on a stand
      box(r, 145, 12, 157, 23, "#3f8fd0", "#2a5a8a");
      for (const [x0, y0, x1, y1] of [[147, 14, 150, 17], [151, 18, 154, 21], [153, 13, 155, 15]]) r(x0, y0, x1, y1, "#6fae6a");
      r(151, 24, 151, 29, "#8a5f33");
      r(147, 30, 155, 31, "#6b4a2f");
    }
    if (lv >= 5) {
      // a bust on a pedestal and hanging flags
      box(r, 12, 22, 22, 31, "#e8e2d0", "#b9b4a4");
      box(r, 14, 14, 20, 21, "#e8e2d0", "#b9b4a4");
      r(16, 12, 18, 13, "#e8e2d0");
      for (const [x, c] of [[58, "#d64545"], [132, "#3f6fb5"]]) {
        r(x, 13, x, 30, "#8a5f33");
        box(r, x + 1, 13, x + 7, 18, c);
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
    }
    if (lv >= 3) {
      // flags of the world
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i % 3) * 10;
        const y = 12 + Math.floor(i / 3) * 7;
        box(r, x, y, x + 7, y + 5, ["#d64545", "#3f6fb5", "#4caf7d", "#f4d35e", "#8a5ad6", "#e0602a"][i], "#3a3f48");
        r(x + 1, y + 2, x + 6, y + 2, "#f4f6f8");
      }
    }
    if (lv >= 4) {
      // a debate podium with a microphone
      box(r, 144, 18, 158, 31, "#8a5f33", "#5a3b24");
      r(144, 18, 158, 18, "#c49a64");
      box(r, 148, 22, 154, 26, "#f4d35e", "#c9a227");
      r(151, 12, 151, 17, "#3a3f48");
      box(r, 150, 10, 152, 12, "#3a3f48");
    }
    if (lv >= 5) {
      // pinned photos and pennants
      box(r, 10, 12, 18, 24, "#c49a64", "#8a5f33");
      for (const [x, y] of [[11, 13], [14, 16], [11, 19]]) box(r, x, y, x + 3, y + 3, "#f4f6f8", "#9aa5b1");
      for (let x = 66; x < 128; x += 6) {
        const c = ["#d64545", "#f4f6f8", "#3f6fb5"][(x / 6) % 3 | 0];
        r(x, 1, x + 4, 1, c);
        r(x + 1, 2, x + 3, 2, c);
        r(x + 2, 3, x + 2, 3, c);
      }
    }
  },
};

// A classroom at a level: dusty with a cracked board and boxes at level 1; then clean, with a
// teacher's desk and student desks, lamps, a bookcase (level 4) and plants and a clock (level 5).
function classroomBase(r, lv, tint) {
  const wall = mix(tint, lv <= 1 ? "#4a4a50" : "#fff4dc", lv <= 1 ? 0.45 : [0, 0.3, 0.2, 0.12, 0.05][lv - 1]);
  hiRoom(r, { wall, wainscot: mix(wall, "#2a2230", 0.4), floor: lv <= 1 ? "#8a7058" : "#b98a5e", floorLine: lv <= 1 ? "#735c47" : "#9d7249" });
  chalkboard(r, 62, 10, 130, 25, lv <= 1);
  hiWindow(r, 160, 2, 16, 10, lv);
  if (lv <= 1) {
    lamp(r, 96, 22, false);
    for (const [x, y] of [[80, 12], [81, 13], [83, 14], [84, 16], [86, 17], [87, 19]]) r(x, y, x, y, "#1d2026");
    crack(r, 30, 14);
    // an overturned desk, stacked chairs, papers on the floor
    r(20, 25, 42, 26, "#8a6a4a");
    r(22, 21, 23, 24, "#6b5a48");
    r(39, 21, 40, 24, "#6b5a48");
    boxes(r, 146);
    for (const [x, y] of [[60, 34], [100, 38], [130, 35]]) r(x, y, x + 3, y, "#e8e2d0");
    return;
  }
  for (const x of lv >= 3 ? [34, 158] : [34]) lamp(r, x, 3, true);
  // the teacher's desk and a row of student desks against the back wall
  desk(r, 8, 30, 25, "#a8753f");
  for (const x of [64, 88, 112]) desk(r, x, x + 16, 27);
  if (lv >= 4) bookcase(r, 170, 12, 186, 31);
  if (lv >= 5) {
    box(r, 134, 13, 140, 19, "#f4f6f8", "#3a3f48");
    r(137, 15, 137, 16, "#1d2026");
    r(137, 16, 138, 16, "#1d2026");
    plant(r, 44, 31);
  }
}

Object.assign(HI_SCENES, {
  // The Headmaster's Office (it has no levels): wood panelling, a bookcase, a window onto the
  // ruined city at sunset, a flag, a diploma, a trophy cabinet and the big desk on a red rug.
  headmaster(r) {
    hiRoom(r, { wall: "#6b4f3a", wainscot: "#4f3826", floor: "#7a2f3a", floorLine: "#6a2832", blocks: false });
    for (let x = 4; x < HW; x += 12) r(x, 0, x, 21, "#5d4432");
    for (let x = 0; x < HW; x += 8) r(x, 24, x, 30, "#43301f");
    r(0, 33, HW - 1, 33, "#c9a227");
    r(0, 46, HW - 1, 46, "#c9a227");
    bookcase(r, 12, 12, 40, 31);
    // window onto the city at sunset
    box(r, 70, 2, 102, 17, "#e8a56a", "#3a2a1e");
    r(71, 3, 101, 7, "#d98a5a");
    r(71, 8, 101, 11, "#e8a56a");
    for (const [x0, x1, top] of [[71, 76, 12], [77, 81, 9], [82, 88, 13], [89, 93, 10], [94, 101, 12]]) r(x0, top, x1, 16, "#4a3a44");
    r(86, 3, 86, 16, "#3a2a1e");
    r(71, 10, 101, 10, "#3a2a1e");
    // a flag on a pole
    r(52, 8, 52, 30, "#c9a227");
    box(r, 53, 9, 63, 16, "#b03030", "#7a2020");
    box(r, 56, 11, 59, 14, "#f4d35e", "#c9a227");
    // diploma
    box(r, 110, 13, 126, 22, "#efe4c8", "#c9a227");
    for (const y of [15, 17, 19]) r(113, y, 123, y, "#8a7a5a");
    r(123, 20, 124, 21, "#b03030");
    // trophy cabinet
    box(r, 150, 11, 176, 31, "#8fb1c4", "#4a3120");
    r(151, 21, 175, 21, "#4a3120");
    for (const [x, y] of [[154, 15], [162, 14], [169, 16], [156, 25], [166, 25]]) {
      r(x, y, x + 3, y, "#f4d35e");
      r(x + 1, y + 1, x + 2, y + 2, "#c9a227");
      r(x, y + 3, x + 3, y + 3, "#c9a227");
    }
    // the Headmaster in his big leather chair behind the desk (he'll hand out missions): a grey,
    // balding head with glasses and a moustache over a dark suit, white shirt and red tie
    box(r, 85, 4, 101, 21, "#6e1f28", "#4a1218");
    r(86, 5, 100, 5, "#8a2c36");
    for (const x of [87, 93, 99]) r(x, 6, x, 6, "#c9a227");
    box(r, 86, 15, 100, 21, "#2c3140", "#1c2029");
    r(92, 15, 94, 19, "#f4f6f8");
    r(93, 16, 93, 21, "#b03030");
    r(90, 16, 91, 18, "#3a4052");
    r(95, 16, 96, 18, "#3a4052");
    box(r, 90, 7, 96, 14, "#e8b894", "#c48f6a");
    r(90, 7, 96, 7, "#c4c8d0");
    r(89, 8, 89, 11, "#b8bcc4");
    r(97, 8, 97, 11, "#b8bcc4");
    r(91, 10, 92, 10, "#1d2026");
    r(94, 10, 95, 10, "#1d2026");
    r(93, 10, 93, 10, "#5a5f68");
    r(92, 12, 94, 12, "#c4c8d0");
    // the headmaster's desk with a lamp, a globe and papers
    box(r, 66, 22, 132, 31, "#5a3620", "#3a2414");
    // his hands folded on it
    r(89, 22, 91, 22, "#e8b894");
    r(95, 22, 97, 22, "#e8b894");
    r(66, 22, 132, 22, "#a8753f");
    box(r, 93, 25, 105, 29, "#c9a227", "#8a6a1a");
    r(72, 16, 72, 21, "#c9a227");
    box(r, 69, 14, 76, 16, "#2f7a4f", "#1f5a38");
    box(r, 118, 15, 125, 21, "#3f8fd0", "#2a5a8a");
    r(120, 16, 122, 18, "#6fae6a");
    for (let i = 0; i < 3; i++) r(100 + i, 20 - i, 110 + i, 21 - i, i % 2 ? "#e0d6bc" : "#efe4c8");
  },

  // The Radio Station: dead equipment and a boarded window, then a transmitter and an ON AIR
  // sign, a receiver and a map of the city, racks of blinking gear with a microphone, and at the
  // top monitors and the satellite dish outside.
  radio(r, lv) {
    const wall = ["#4a524d", "#566a5e", "#5c7466", "#617d6d", "#678575"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#1d2026", 0.4), floor: lv <= 1 ? "#5a5550" : "#6a6058", floorLine: lv <= 1 ? "#4a4540" : "#5a5048" });
    // window with the antenna mast (or satellite dish) outside
    box(r, 70, 2, 100, 16, "#9cc4de", "#3a3f48");
    r(71, 12, 99, 15, "#7fa6c0");
    if (lv <= 1) {
      r(84, 6, 86, 15, "#5a5f68");
      r(80, 9, 90, 9, "#5a5f68");
      for (const y of [4, 9, 14]) { r(69, y, 101, y + 1, "#8a5f33"); r(69, y, 101, y, "#a8753f"); }
      lamp(r, 40, 12, false);
      crack(r, 130, 14);
      box(r, 110, 20, 126, 31, "#3a3f48", "#1d2026");
      box(r, 20, 22, 36, 31, "#4a4f58", "#2a2d33");
      boxes(r, 150);
      return;
    }
    if (lv >= 5) {
      // the satellite dish on the roof outside
      box(r, 78, 5, 92, 11, "#e8eef4", "#9aa5b1");
      r(85, 12, 85, 15, "#9aa5b1");
      r(84, 3, 86, 4, "#d64545");
    } else {
      r(85, 3, 85, 15, "#5a5f68");
      for (const y of [5, 8, 11]) r(82, y, 88, y, "#5a5f68");
      r(84, 3, 86, 3, "#d64545");
    }
    for (const x of lv >= 3 ? [40, 150] : [40]) lamp(r, x, 3, true);
    // ON AIR sign under the window
    box(r, 74, 18, 96, 22, "#1d2026", "#3a3f48");
    r(77, 20, 93, 20, "#ff5b5b");
    // the long desk with the transmitter
    box(r, 104, 23, 188, 31, "#6b5a48", "#4a3e32");
    r(104, 23, 188, 23, "#8a7560");
    box(r, 108, 14, 124, 22, "#3a3f48", "#1d2026");
    r(110, 16, 114, 16, "#7fe0a8");
    r(116, 16, 122, 16, "#f4d35e");
    for (const x of [110, 115, 120]) r(x, 19, x + 1, 20, "#c9ccd2");
    if (lv >= 3) {
      // receiver with a big dial, and a map of the city with pins
      box(r, 128, 15, 142, 22, "#5a4a3a", "#3a2e24");
      box(r, 130, 16, 135, 21, "#e8e2d0", "#8a7a5a");
      r(132, 18, 133, 19, "#d64545");
      box(r, 16, 12, 50, 26, "#e8e2d0", "#8a7a5a");
      r(17, 13, 49, 25, "#cfd8c0");
      r(20, 18, 46, 18, "#9aa88a");
      r(32, 13, 32, 25, "#9aa88a");
      for (const [x, y, c] of [[24, 15, "#d64545"], [40, 21, "#d64545"], [36, 16, "#3f6fb5"], [27, 22, "#f4d35e"]]) r(x, y, x + 1, y + 1, c);
    }
    if (lv >= 4) {
      // a rack of gear with blinking lights, a microphone and headphones
      box(r, 146, 10, 162, 22, "#2a2d33", "#1d2026");
      for (let y = 12; y < 21; y += 3) for (let x = 148; x < 161; x += 3) r(x, y, x, y, ["#7fe0a8", "#f4d35e", "#ff5b5b"][(x + y) % 3]);
      r(166, 17, 167, 21, "#2a2d33");
      r(165, 22, 168, 22, "#8a8e96");
      r(170, 19, 174, 19, "#2a2d33");
      r(170, 20, 170, 22, "#2a2d33");
      r(174, 20, 174, 22, "#2a2d33");
    }
    if (lv >= 5) {
      // monitors with the world map and a signal wave
      box(r, 176, 11, 188, 22, "#1d2240", "#3a3f48");
      for (const [x0, y0, x1, y1] of [[178, 13, 181, 15], [183, 14, 186, 17], [179, 17, 180, 20]]) r(x0, y0, x1, y1, "#4caf7d");
      box(r, 54, 13, 64, 21, "#1d2026", "#3a3f48");
      for (let x = 55; x < 64; x++) r(x, 17 + Math.round(Math.sin(x) * 2), x, 17 + Math.round(Math.sin(x) * 2), "#7fe0a8");
    }
  },

  // The Research Room: broken glass and empty shelves, then a whiteboard and a bench of flasks, a
  // microscope and books, a computer, and at the top a glowing machine.
  research(r, lv) {
    const wall = ["#7a828c", "#c8d6e2", "#d0dce8", "#d8e2ee", "#dee8f2"][lv - 1];
    hiRoom(r, { wall, wainscot: lv <= 1 ? "#5a6068" : "#6f8aa0", floor: lv <= 1 ? "#6a6e72" : "#9aa5b1", floorLine: lv <= 1 ? "#5a5e62" : "#8a96a3", blocks: false });
    if (lv >= 2) for (let x = 0; x < HW; x += 10) r(x, 0, x, 21, mix(wall, "#6f8aa0", 0.15));
    // whiteboard
    box(r, 68, 10, 104, 25, lv <= 1 ? "#b9bcc0" : "#f4f6f8", "#9aa5b1");
    if (lv <= 1) {
      lamp(r, 96, 20, false);
      crack(r, 30, 14);
      crack(r, 120, 13);
      shelf(r, 16, 50, 20, []);
      for (const [x, y] of [[112, 34], [114, 35], [120, 33], [140, 36]]) r(x, y, x + 1, y, "#bfe0f5");
      boxes(r, 150);
      return;
    }
    for (const [x, y, w, c] of [[71, 13, 14, "#3f6fb5"], [71, 16, 20, "#3a3f48"], [71, 19, 10, "#d64545"], [86, 19, 14, "#3a3f48"], [71, 22, 24, "#3a3f48"]]) r(x, y, x + w, y, c);
    for (const x of lv >= 3 ? [34, 150] : [150]) lamp(r, x, 3, true);
    // lab bench with flasks
    box(r, 108, 22, 188, 31, "#3a4a4a", "#1d2a2a");
    r(108, 22, 188, 22, "#5a6a6a");
    for (const [x, c] of [[114, "#4caf7d"], [122, "#3fa7d6"], [130, "#e0602a"], [138, "#8a5ad6"]]) {
      r(x + 1, 15, x + 2, 17, "#c9ccd2");
      box(r, x, 18, x + 3, 21, c, shadowOf(c));
    }
    if (lv >= 3) {
      // microscope, and books on shelves
      r(148, 14, 149, 20, "#3a3f48");
      r(146, 21, 152, 21, "#3a3f48");
      r(150, 13, 152, 14, "#3a3f48");
      bookcase(r, 14, 12, 40, 31);
    }
    if (lv >= 4) {
      // a computer terminal
      box(r, 46, 16, 62, 26, "#1d2026", "#3a3f48");
      for (const y of [18, 20, 22]) r(48, y, 48 + (y % 7) + 6, y, "#7fe0a8");
      r(52, 27, 56, 28, "#3a3f48");
      desk(r, 44, 64, 29, "#9aa5b1");
    }
    if (lv >= 5) {
      // a glowing machine of tubes on the bench
      box(r, 160, 9, 182, 21, "#3a3f48", "#1d2026");
      for (const x of [163, 169, 175]) {
        box(r, x, 11, x + 4, 19, "#7fe0a8", "#3a8f63");
        r(x + 1, 12, x + 1, 17, "#d8ffe8");
      }
      for (const [x, y] of [[166, 8], [172, 7], [178, 8]]) r(x, y, x, y, "#7fe0a8aa");
    }
  },

  // The Crafting Room: piles of junk, then a workbench under a pegboard of tools, a vise and a
  // drill press, a welding station throwing sparks, and at the top finished barricade panels.
  crafting(r, lv) {
    const wall = ["#6a5a4c", "#8a6f58", "#937860", "#9c8068", "#a58870"][lv - 1];
    hiRoom(r, { wall, wainscot: mix(wall, "#1d1a18", 0.4), floor: lv <= 1 ? "#5e5a55" : "#77736c", floorLine: lv <= 1 ? "#4e4a45" : "#66625b" });
    if (lv <= 1) {
      lamp(r, 96, 14, false);
      crack(r, 80, 13);
      // junk piles
      for (const [x, w, h, c] of [[20, 26, 8, "#6b6f78"], [60, 20, 6, "#8a5f33"], [104, 24, 9, "#5a5f68"]]) {
        for (let i = 0; i < h; i++) r(x + i, 31 - i, x + w - i, 31 - i, i % 2 ? c : shadowOf(c));
      }
      boxes(r, 150);
      return;
    }
    for (const x of lv >= 3 ? [34, 96, 158] : [96]) lamp(r, x, 3, true);
    // pegboard of tools
    box(r, 68, 10, 104, 25, "#c9a878", "#8a6f4a");
    for (let y = 12; y < 25; y += 3) for (let x = 70; x < 104; x += 3) r(x, y, x, y, "#a8875a");
    // hammer, wrench, saw
    r(74, 13, 74, 21, "#6b4a2f");
    box(r, 72, 12, 76, 14, "#6b6f78");
    r(82, 13, 82, 22, "#9aa0a8");
    box(r, 81, 12, 83, 13, "#9aa0a8");
    box(r, 87, 14, 98, 17, "#c9ccd2", "#8a8e96");
    r(98, 14, 101, 17, "#8a5f33");
    // workbench
    box(r, 108, 21, 170, 24, "#8a5f33", "#5a3b24");
    r(110, 25, 111, 31, "#5a3b24");
    r(167, 25, 168, 31, "#5a3b24");
    r(112, 28, 166, 28, "#6b4a2f");
    if (lv >= 3) {
      // a vise on the bench and a drill press
      box(r, 114, 17, 122, 20, "#6b6f78", "#3a3f48");
      r(117, 15, 119, 16, "#6b6f78");
      box(r, 176, 10, 184, 16, "#d64545", "#7a2020");
      r(179, 17, 180, 29, "#6b6f78");
      box(r, 174, 29, 186, 31, "#3a3f48");
      r(179, 17, 180, 19, "#c9ccd2");
    }
    if (lv >= 4) {
      // a welding station with sparks
      box(r, 16, 18, 34, 31, "#3a3f48", "#1d2026");
      box(r, 19, 20, 31, 24, "#f4d35e", "#c9a227");
      for (const [x, y] of [[38, 22], [40, 20], [42, 24], [39, 25], [44, 21]]) r(x, y, x, y, "#ffd27a");
      box(r, 36, 23, 48, 31, "#6b6f78", "#3a3f48");
    }
    if (lv >= 5) {
      // finished barricade panels leaning on the wall, a safety sign
      for (const x of [132, 144]) {
        box(r, x, 10, x + 10, 20, "#8a5f33", "#5a3b24");
        r(x + 1, 13, x + 9, 13, "#6b6f78");
        r(x + 1, 17, x + 9, 17, "#6b6f78");
      }
      box(r, 52, 12, 62, 20, "#f4d35e", "#1d2026");
      r(56, 14, 57, 17, "#1d2026");
      r(56, 18, 57, 18, "#1d2026");
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
});

// ---------- wide outdoor scenes ----------
// 416 x 48: about the width of a full-page banner at its 130px height, so the Farm and the
// Scrapyard show one continuous landscape. The sky, the ruined city and the ground clear up
// level by level; the ground starts at row 22, props stand on row 31, and the crowd covers the
// bottom rows (the plaque hides the top-left corner, the Upgrade button the bottom-left one).

const WW = 416;
export const SCENE_WIDTH = { farm: WW, scrapyard: WW };

function hash01(i, s) {
  let x = Math.imul(i + 11, 2654435761) ^ Math.imul(s + 7, 40503);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

function wideOutdoor(r, lv, ground, sunX = 360) {
  const top = ["#6f7780", "#7fa3c8", "#79afe0", "#74b3e8", "#78b9ee"][lv - 1];
  const low = ["#a39c8f", "#c7d3d9", "#cfe3ee", "#d6ebf5", "#e2f1f8"][lv - 1];
  const skyAt = (y) => mix(top, low, Math.min(1, y / 21));
  for (let i = 0; i < 8; i++) r(0, i * 3, WW - 1, i * 3 + 2, skyAt(i * 3));
  // the sun, from level 3
  if (lv >= 3) {
    r(sunX - 4, 4, sunX + 4, 8, "#fff3c4");
    r(sunX - 3, 3, sunX + 3, 9, "#fff3c4");
    r(sunX - 2, 2, sunX + 2, 10, "#fff3c4");
    r(sunX - 1, 4, sunX + 1, 8, "#fffbe8");
  }
  // clouds, more of them as the smoke clears
  if (lv >= 2) {
    for (const [x, y, w] of [[96, 5, 26], [196, 3, 34], [290, 7, 22], [392, 4, 18], [150, 9, 14]].slice(0, lv)) {
      r(x, y, x + w, y + 2, "#f4f8fc");
      r(x + 4, y - 2, x + w - 8, y - 1, "#f4f8fc");
      r(x + 2, y + 3, x + w - 2, y + 3, mix("#f4f8fc", low, 0.5));
    }
  }
  // birds
  if (lv >= 4) for (const [x, y] of [[250, 6], [258, 4], [265, 7], [120, 3]]) { r(x, y, x + 1, y, "#3a3f48"); r(x + 2, y - 1, x + 2, y - 1, "#3a3f48"); r(x + 3, y, x + 4, y, "#3a3f48"); }
  // smoke rising over the city at levels 1-2
  if (lv <= 2) {
    for (const x of lv === 1 ? [80, 230, 330] : [230]) {
      for (let k = 0; k < 7; k++) {
        const w = 2 + k;
        const cx = x + k + Math.round(Math.sin(k * 0.9) * 3);
        r(cx - (w >> 1), 17 - k * 3, cx + (w >> 1), 19 - k * 3, lv === 1 ? "#4a4d52aa" : "#6a6d7277");
      }
    }
  }
  // the ruined city on the horizon
  const city = mix(low, "#2c3340", 0.58);
  const win = mix(city, "#10141c", 0.35);
  for (let x = 0, i = 0; x < WW; i++) {
    const w = 6 + Math.floor(hash01(i, 1) * 12);
    const h = 4 + Math.floor(hash01(i, 2) * 11);
    r(x, 22 - h, x + w - 1, 21, city);
    if (hash01(i, 3) < 0.45) r(x + w - 3, 22 - h, x + w - 1, 23 - h + Math.floor(hash01(i, 4) * 2), skyAt(22 - h));
    for (let wy = 24 - h; wy < 20; wy += 3) for (let wx = x + 2; wx < x + w - 2; wx += 3) r(wx, wy, wx, wy, lv >= 4 && hash01(wx, wy) < 0.08 ? "#f4d35e" : win);
    x += w + (hash01(i, 5) < 0.3 ? 2 : 0);
  }
  // a hazy tree line in front of it
  const trees = lv <= 1 ? mix("#5a5a44", low, 0.35) : mix("#3f6a3a", low, 0.3);
  for (let x = 0; x < WW; x++) {
    const h = 1 + Math.round(1.2 + Math.sin(x / 7) * 1.2 + Math.sin(x / 19 + 1) * 1.4 + hash01(x, 9));
    r(x, 22 - h, x, 21, trees);
  }
  // the ground: lighter at the horizon, specks and tufts
  r(0, 22, WW - 1, 47, ground);
  r(0, 22, WW - 1, 22, mix(ground, "#f4f0e0", 0.25));
  r(0, 23, WW - 1, 24, mix(ground, "#f4f0e0", 0.1));
  r(0, 44, WW - 1, 47, shadowOf(ground));
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(hash01(i, 21) * WW);
    const y = 25 + Math.floor(hash01(i, 22) * 22);
    r(x, y, x + 1, y, i % 3 ? shadowOf(ground) : lightOf(ground));
  }
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
  for (let yy = 20; yy < 31; yy += 3) r(x + 1, yy, x + 21, yy, "#7a5c40");
  r(x - 1, 16, x + 23, 17, "#5a5e66");
  r(x - 2, 15, x + 24, 15, "#6b6f78");
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
    for (const [dx, dy, c] of [[11, 27, "#fff4b0"], [10, 26, "#f4d35e"], [12, 25, "#f4d35e"], [13, 28, "#f08a3a"], [9, 28, "#f08a3a"], [14, 24, "#fff4b0"]]) r(x + dx, dy, x + dx, dy, c);
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
  box(r, x, base - 8, x + 6, base, c, shadowOf(c));
  r(x, base - 6, x + 6, base - 6, shadowOf(c));
  r(x, base - 2, x + 6, base - 2, shadowOf(c));
  r(x + 1, base - 7, x + 1, base - 1, lightOf(c));
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
  r(x, 4, x + 1, 31, "#6b6f78");
  box(r, x - 3, 2, x + 4, 5, "#f4d35e", "#c9a227");
  r(x - 2, 3, x + 3, 3, "#fffbe8");
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

const sceneCache = new Map();

// Returned as a CSS url() so the banner can tile it sideways — full-width cards get a longer
// room instead of a stretched or cropped one. `kind` may carry the room's level ("gym@3"); the
// scene is drawn for it (level 5 if none is given).
export function sceneBackground(kind) {
  if (!sceneCache.has(kind)) {
    const [name, lvText] = kind.split("@");
    const hi = HI_SCENES[name];
    let rects = "";
    const r = (x0, y0, x1, y1, c) => {
      rects += `<rect x="${x0}" y="${y0}" width="${x1 - x0 + 1}" height="${y1 - y0 + 1}" fill="${c}"/>`;
    };
    (hi || HI_SCENES.classroom_empty)(r, Math.min(5, Math.max(1, Number(lvText) || 5)));
    const [w, h] = [SCENE_WIDTH[name] || HW, HH];
    const svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
    sceneCache.set(kind, `url('data:image/svg+xml,${encodeURIComponent(svg)}')`);
  }
  return sceneCache.get(kind);
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
