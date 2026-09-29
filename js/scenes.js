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
    // the headmaster's desk with a lamp, a globe and papers
    box(r, 66, 22, 132, 31, "#5a3620", "#3a2414");
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

  // The Farm, the Ranch and the Scrapyard span the whole page, so they're drawn as one wide
  // landscape each (see wideOutdoor below) rather than a 192-wide scene tiled sideways.

  // The Farm: dry weeds, a dead tree and a caved-in shed; then tilled plots with sprouts behind a
  // mended fence; cabbages, corn and a scarecrow; a barn, tomatoes, pumpkins and an apple tree;
  // and at the top golden wheat, sunflowers, a silo, a greenhouse, a windmill and a tractor.
  farm(r, lv) {
    wideOutdoor(r, lv, lv <= 1 ? "#8a8457" : "#6f9a4f");
    track(r, lv);
    const PLOTS = [72, 126, 180, 234]; // each 50 wide
    const kinds = [
      null,
      null,
      ["sprout", "sprout", null, null],
      ["cabbage", "corn", "carrot", "sprout"],
      ["cabbage", "corn", "tomato", "pumpkin"],
      ["wheat", "corn", "tomato", "pumpkin"],
    ][lv];
    if (lv <= 1) {
      // weeds where the plots used to be, a dead tree, a caved-in shed, a tipped wheelbarrow
      for (let i = 0; i < 70; i++) weed(r, 60 + ((i * 53) % 330), 24 + ((i * 7) % 9), i % 3 ? "#9a9a55" : "#7a7a45");
      deadTree(r, 348, 31);
      shed(r, 296, true);
      wheelbarrow(r, 200, 41, "tipped");
      rail(r, 40, 290, 33, true);
      for (const x of [70, 130, 250]) crow(r, x, 26);
      for (const [x, y] of [[90, 36], [170, 44], [260, 37], [380, 43]]) crack(r, x, y, "#6e6440");
      return;
    }
    PLOTS.forEach((x0, i) => {
      if (!kinds[i]) return;
      furrows(r, x0, x0 + 49, 23, 31);
      for (const y of [25, 28, 31]) for (let x = x0 + 3; x < x0 + 48; x += 5) crop(r, x, y, kinds[i]);
    });
    if (lv >= 5) for (const x of [62, 67, 124, 232, 289]) crop(r, x, 31, "sunflower");
    rail(r, 40, 292, 33, false);
    if (lv <= 3) {
      shed(r, 300, false);
      toolRack(r, 324);
    } else barn(r, 296);
    barrel(r, 288, 31);
    if (lv >= 3) scarecrow(r, 178);
    if (lv >= 4) {
      appleTree(r, 18, 31);
      wheelbarrow(r, 336, 41, "full");
      for (let i = 0; i < 24; i++) r(12 + ((i * 67) % 390), 44 + (i % 3), 12 + ((i * 67) % 390), 44 + (i % 3), ["#f4d35e", "#e98fb0", "#f4f6f8"][i % 3]);
    }
    if (lv >= 5) {
      windmill(r, 50);
      silo(r, 334);
      greenhouse(r, 350);
      appleTree(r, 402, 31);
      tractor(r, 232, 42);
    }
  },

  // The Ranch: an empty pen behind a broken fence, a knocked-over trough and a dead tree; then a
  // mended fence, a full trough, a coop and chickens; a barn, hay and a cow; sheep, a pig in the
  // mud and another cow; and at the top a horse, ducks on a pond, a silo, a windmill and a vane.
  ranch(r, lv) {
    wideOutdoor(r, lv, lv <= 1 ? "#8a8457" : "#6f9a4f");
    track(r, lv);
    if (lv <= 1) {
      for (let i = 0; i < 60; i++) weed(r, 50 + ((i * 59) % 340), 24 + ((i * 5) % 9), i % 3 ? "#9a9a55" : "#7a7a45");
      trough(r, 150, 31, "tipped");
      deadTree(r, 330, 31);
      coop(r, 262, true);
      rail(r, 40, 300, 33, true);
      for (const x of [90, 210]) crow(r, x, 26);
      for (const [x, y] of [[80, 38], [190, 45], [300, 36]]) crack(r, x, y, "#6e6440");
      return;
    }
    if (lv >= 5) windmill(r, 50);
    trough(r, 150, 31, "full");
    coop(r, 262, false);
    for (const x of [232, 242, 252]) chicken(r, x, 31);
    if (lv >= 3) {
      barn(r, 304);
      cow(r, 100, 31, "#f4f6f8");
      hay(r, 356);
    }
    if (lv >= 4) {
      for (const x of [62, 74]) sheep(r, x, 31);
      cow(r, 124, 31, "#b07a4a");
      r(174, 29, 194, 31, "#6b4a2f");
      r(176, 28, 192, 28, "#6b4a2f");
      pig(r, 178, 31);
      chicken(r, 222, 31);
    }
    rail(r, 40, 300, 33, false);
    if (lv >= 5) {
      sheep(r, 86, 31);
      horse(r, 196, 31);
      silo(r, 342);
      vane(r, 321, 1);
      pond(r, 384);
      for (let i = 0; i < 24; i++) r(12 + ((i * 67) % 390), 44 + (i % 3), 12 + ((i * 67) % 390), 44 + (i % 3), ["#f4d35e", "#e98fb0", "#f4f6f8"][i % 3]);
    }
  },

  // The Scrapyard: junk heaps, a burnt-out car and loose tyres under smoke; then a chain fence, a
  // workbench, oil drums and a tyre stack; a shipping container and wrecks stacked three high; a
  // crane lifting a car and a shed full of welding sparks; and at the top a crusher with a stack
  // of cubes, colour-sorted bins, floodlights and a forklift.
  scrapyard(r, lv) {
    wideOutdoor(r, lv, lv <= 1 ? "#5e554a" : "#6b5d4d", 150);
    // oil stains and gravel across the yard
    for (let i = 0; i < 26; i++) {
      const x = (i * 71) % 400;
      const y = 34 + ((i * 13) % 12);
      r(x, y, x + 4 + (i % 4), y + 1, "#4a4038");
    }
    if (lv >= 2) chainFence(r);
    junkPile(r, 10, 30, 11, "#7a7f88");
    junkPile(r, 130, 40, 15, "#8a6a4a");
    if (lv <= 4) junkPile(r, 262, 32, 12, "#6b6f78");
    if (lv <= 2) {
      wreck(r, 222, 31, "#3a3230", true);
      for (const [x, y] of [[70, 38], [96, 42], [310, 40], [352, 36]]) tyre(r, x, y);
      if (lv <= 1) {
        for (const x of [230, 150]) for (let k = 0; k < 8; k++) r(x + k - 2 + Math.round(Math.sin(k) * 2), 20 - k * 2, x + k + 1 + Math.round(Math.sin(k) * 2), 21 - k * 2, "#3a3a3e99");
        sign(r, 330, true);
        return;
      }
    }
    // tyre stack, workbench, oil drums
    for (let i = 0; i < 4; i++) tyre(r, 48, 30 - i * 3);
    workbench(r, 300);
    for (const x of [326, 334]) drum(r, x, 31, x === 326 ? "#3f6fb5" : "#b03030");
    if (lv >= 3) {
      container(r, 176);
      wreck(r, 222, 31, "#3a3230", true);
      wreck(r, 224, 25, "#3f6fb5");
      wreck(r, 221, 19, "#c9a236");
    }
    if (lv >= 4) {
      crane(r);
      shed(r, 368, false, true);
      for (const [x, y] of [[356, 44], [364, 42]]) { r(x, y, x + 9, y + 1, "#a8753f"); r(x, y + 2, x + 9, y + 2, "#6b4a2f"); }
    }
    if (lv >= 5) {
      crusher(r, 74);
      for (const [x, c] of [[260, "#3f6fb5"], [274, "#4caf7d"], [288, "#d64545"]]) {
        box(r, x, 22, x + 11, 31, c, shadowOf(c));
        r(x + 3, 25, x + 8, 25, "#f4f6f8");
        r(x + 1, 22, x + 10, 22, lightOf(c));
      }
      for (const x of [64, 395]) floodlight(r, x);
      forklift(r, 186, 42);
    }
  },
});

// ---------- wide outdoor scenes ----------
// 416 x 48: about the width of a full-page banner at its 130px height, so the Farm, the Ranch and
// the Scrapyard show one continuous landscape. The sky, the ruined city and the ground clear up
// level by level; the ground starts at row 22, props stand on row 31, and the crowd covers the
// bottom rows (the plaque hides the top-left corner, the Upgrade button the bottom-left one).

const WW = 416;
export const SCENE_WIDTH = { farm: WW, ranch: WW, scrapyard: WW };

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
function greenhouse(r, x) {
  box(r, x, 19, x + 38, 31, "#bfe6e0", "#7fa8a0");
  for (let i = 0; i < 5; i++) r(x + 4 + i, 18 - i, x + 34 - i, 18 - i, i ? "#cfeee8" : "#7fa8a0");
  r(x + 9, 13, x + 29, 13, "#7fa8a0");
  for (let xx = x + 6; xx < x + 38; xx += 6) r(xx, 14, xx, 31, "#8fb8b0");
  for (let xx = x + 2; xx < x + 37; xx += 3) r(xx, 27 - (xx % 2), xx, 30, "#4caf7d");
  r(x + 2, 20, x + 5, 20, "#ffffff");
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

// Ranch pieces.
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
function pond(r, x) {
  const rows = [[6, 24], [2, 28], [0, 30], [2, 28]];
  rows.forEach(([a, b], i) => r(x + a, 27 + i, x + b, 27 + i, "#5fa8d8"));
  r(x + 8, 28, x + 14, 28, "#9fd0f0");
  for (const dx of [6, 18]) {
    r(x + dx, 27, x + dx + 3, 28, "#f4f6f8");
    r(x + dx + 3, 26, x + dx + 4, 26, "#f4f6f8");
    r(x + dx + 5, 26, x + dx + 5, 26, "#f4a030");
  }
  for (const dx of [-2, 31]) r(x + dx, 25, x + dx, 30, "#4f8a3a");
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
function container(r, x) {
  box(r, x, 16, x + 40, 31, "#3f6f8f", "#2a4a60");
  for (let xx = x + 3; xx < x + 40; xx += 3) r(xx, 17, xx, 30, "#35607c");
  r(x, 16, x + 40, 16, "#5a8aaa");
  for (const [dx, dy] of [[6, 20], [22, 26], [33, 18]]) r(x + dx, dy, x + dx + 3, dy + 1, "#8a5a3a");
  r(x + 36, 19, x + 36, 28, "#1d2630");
}
function crane(r) {
  r(404, 3, 406, 31, "#e0a536");
  for (let y = 6; y < 31; y += 4) r(402, y, 408, y, "#c98a2a");
  r(338, 3, 410, 4, "#e0a536");
  for (let x = 340; x < 404; x += 6) r(x, 5, x + 2, 5, "#c98a2a");
  box(r, 396, 6, 402, 11, "#3a3f48", "#1d2026");
  r(350, 5, 350, 9, "#3a3f48");
  box(r, 345, 10, 355, 12, "#3a3f48", "#1d2026");
  box(r, 339, 13, 361, 17, "#b03030", "#7a2020");
  box(r, 344, 11, 356, 13, "#8a2a2a");
  for (const dx of [2, 17]) box(r, 339 + dx, 16, 339 + dx + 3, 18, "#1d2026");
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
  serum: () => ascii([
    "..........s.",
    ".........s..",
    "........ww..",
    ".......wGgw.",
    "......wGggw.",
    ".....wGggw..",
    "....wGggw...",
    "...wgggw....",
    "..pwwww.....",
    ".pp.........",
    "pp..........",
    "............",
  ], { s: "#c9ccd2", w: "#eef3f7", g: "#4fc46a", G: "#a8f0b0", p: "#6b7380" }),
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
  lobby: () => ascii([
    "............",
    "....ssss....",
    "...s....s...",
    "..rrrrrrrr..",
    "..rRRrrrrr..",
    "..rRrrrrrr..",
    "..rrrrrrrr..",
    "..rppppppr..",
    "..rpPppPpr..",
    "..rppppppr..",
    "..rrrrrrrr..",
    "............",
  ], { s: "#6b4a3a", r: "#c0583a", R: "#e88a62", p: "#8a3a24", P: "#e8c14a" }),
  classrooms: () => ascii([
    "............",
    ".wwwwwwwwww.",
    ".wggggggggw.",
    ".wgccgggggw.",
    ".wgggccgcgw.",
    ".wggggggcgw.",
    ".wggggggggw.",
    ".wwwwwwwwww.",
    "...w....w...",
    "..ww....ww..",
    "............",
    "............",
  ], { w: "#a8753f", g: "#2f5a44", c: "#e8efe8" }),
  facilities: () => ascii([
    "............",
    ".....rr.....",
    "...rrrrrr...",
    ".rrrrrrrrrr.",
    "..bbbbbbbb..",
    "..bwwbbwwb..",
    "..bbbbbbbb..",
    "..bwwbbwwb..",
    "..bbbbbbbb..",
    "..bbbddbbb..",
    "..bbbddbbb..",
    "............",
  ], { r: "#5a6478", b: "#9aa3b8", w: "#f4d35e", d: "#5a3b24" }),
  farm: () => ascii([
    "............",
    "..y...y...y.",
    ".yYy.yYy.yYy",
    ".yYy.yYy.yYy",
    "..y...y...y.",
    "...g..g..g..",
    "....g.g.g...",
    ".....ggg....",
    "....rrrrr...",
    ".....ggg....",
    "....g.g.g...",
    "............",
  ], { y: "#e8c14a", Y: "#f7e08a", g: "#b8a24a", r: "#c0583a" }),
  ranch: () => ascii([
    "............",
    ".hh......hh.",
    "..h......h..",
    "..wwwwwwww..",
    ".wwkkwwwwww.",
    ".wwkewwwewk.",
    "..wwwwwwkk..",
    "..wwwwwwww..",
    "..pppppppp..",
    "..pNppppNp..",
    "...pppppp...",
    "............",
  ], { h: "#d9c9a0", w: "#f4f4f4", k: "#3a3a3a", e: "#111111", p: "#f0a0a8", N: "#b0606a" }),
  defense: () => ascii([
    "............",
    "..ssssssss..",
    "..sBBBBBBs..",
    "..sBbbbbBs..",
    "..sBbwwbBs..",
    "..sBbwwbBs..",
    "..sBbbbbBs..",
    "...sBbbBs...",
    "....sBBs....",
    ".....ss.....",
    "............",
    "............",
  ], { s: "#c9ccd2", B: "#6f9ae8", b: "#3f6fb5", w: "#f4f6f8" }),
  assault: () => ascii([
    "............",
    ".s........s.",
    "..s......s..",
    "...s....s...",
    "....s..s....",
    ".....ss.....",
    ".....ss.....",
    "....s..s....",
    "..gs....sg..",
    "...g....g...",
    "..h......h..",
    ".h........h.",
  ], { s: "#e6ebf0", g: "#e8c14a", h: "#8a5a3a" }),
  event: () => ascii([
    "............",
    "............",
    "..wwwwwwww..",
    "..wkwwwwkw..",
    "..wwwwwwww..",
    "..wwwkkwww..",
    "..wwwkkwww..",
    "..wwwwwwww..",
    "..wkwwwwkw..",
    "..wwwwwwww..",
    "............",
    "............",
  ], { w: "#f4f4f4", k: "#d64545" }),
  roster: () => ascii([
    "............",
    "....cccc....",
    "..bbcCCcbb..",
    "..bwwwwwwb..",
    "..bwkkkkwb..",
    "..bwwwwwwb..",
    "..bwkkkwwb..",
    "..bwwwwwwb..",
    "..bwkkkkwb..",
    "..bwwwwwwb..",
    "..bbbbbbbb..",
    "............",
  ], { b: "#a8753f", c: "#9aa0a8", C: "#d9dde2", w: "#eef3f7", k: "#6b7380" }),
  armory: () => ascii([
    "..........s.",
    ".........sS.",
    "........sS..",
    ".......sS...",
    "......sS....",
    ".....sS.....",
    "..g.sS......",
    "...gS.......",
    "...hg.......",
    "..h..g......",
    ".h..........",
    "............",
  ], { s: "#b6bcc4", S: "#f4f6f8", g: "#e8c14a", h: "#8a5a3a" }),
  classes: () => ascii([
    "............",
    "............",
    ".wwwwccwwww.",
    ".wkkwccwkkw.",
    ".wwwwccwwww.",
    ".wkkwccwkkw.",
    ".wwwwccwwww.",
    ".wkkwccwkkw.",
    ".bbbbbbbbbb.",
    "............",
    "............",
    "............",
  ], { w: "#f4f1e6", c: "#c9bfa6", k: "#8a93a8", b: "#3f6fb5" }),
  explore: () => ascii([
    "............",
    ".aaabbbaaab.",
    ".aaabbbXaX..",
    ".aaabbbaXab.",
    ".aaabbbXaX..",
    ".aaabbbaaab.",
    ".aaarbbaaab.",
    ".aarabbaaab.",
    ".arabbbaaab.",
    ".aaabbbaaab.",
    "............",
    "............",
  ], { a: "#e8d8b0", b: "#cdb98c", X: "#d64545", r: "#d64545" }),
  antenna: () => ascii([
    "............",
    ".....R......",
    "..w..s..w...",
    ".w...s...w..",
    ".w..sss..w..",
    "..w.s.s.w...",
    "....s.s.....",
    "...s...s....",
    "...sssss....",
    "..s.....s...",
    "..s.....s...",
    "............",
  ], { R: "#ff5a4a", s: "#c9ccd2", w: "#7fc8f0" }),
  virus: () => {
    const g = disk(blank(), 6, 6, 3.1, "#6fbf4a");
    for (let a = 0; a < 8; a++) {
      const x = Math.round(5.5 + Math.cos((a * Math.PI) / 4) * 4.6);
      const y = Math.round(5.5 + Math.sin((a * Math.PI) / 4) * 4.6);
      g[y][x] = "#b8ec8a";
    }
    for (const [x, y] of [[5, 5], [7, 6], [5, 7]]) g[y][x] = "#3e7a2a";
    return g;
  },
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
