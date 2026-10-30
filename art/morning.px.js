// School of the Dead: the Turn 1 backdrop (960x540), the school from the front on a held morning.
// Only the strips either side of the game's windows show (x < ~205, x > ~755), so the detail lives there.
pal({
  a: "#2f5a8a", b: "#3f6f9e", c: "#5a8ab4", d: "#7aa6c8", e: "#a3c2d6", F: "#cdd9dc", // sky, down to a warm haze
  Y: "#fff3c8", y: "#f7dc8a",                                    // sun
  W: "#f4f2ec", w: "#dde3e8", q: "#aebccb",                      // clouds
  h: "#8496aa", H: "#73859a", m: "#8f9198", M: "#73757d",        // the far city, smoke
  t: "#6a8a72", T: "#56755f",                                    // trees on the horizon
  Q: "#b45e48", r: "#9a4a3a", R: "#76372b",                      // brick
  s: "#dcd3be", S: "#b5ab95",                                    // stone trim
  u: "#5a7ca0", n: "#40607f", N: "#2e4560",                      // slate roofs
  G: "#cfe2ec", g: "#8fb4cc", k: "#263040",                      // glass
  p: "#a07a4c", P: "#6e5232",                                    // planks
  z: "#d9be6a", Z: "#f3efe2", K: "#1d1a20",                      // gold, the clock face, ink
  x: "#b0423c", X: "#862f2b",                                    // the banner
  l: "#719c60", L: "#658f56", v: "#557a4a", V: "#456a3e",        // lawn
  j: "#bf7652", J: "#a2604a", i: "#ece6da",                      // the track
  o: "#6e4c33", D: "#523826", E: "#4f8a3e", A: "#7cba4c",        // soil, crops
  B: "#c2b083", O: "#9a8862",                                    // sandbags
  1: "#9aa2ac", 2: "#5c636e", 3: "#ccd2da",                      // steel
  4: "#e2a72e", 5: "#b0781a",                                    // the bus
  6: "#4f8a5e", 7: "#6aa678",                                    // the flag
  8: "#d3cbb6", 9: "#aaa18c",                                    // the gym's walls
  0: "#3c3c44", I: "#c8b48a", U: "#9c875f",                      // wire, fence posts
})
ramps("abcdeF", "VvLl", "RrQ", "SsZ", "Nnu", "kgG", "PpI", "DoU", "OB", "29", "813", "TtFY")

const GY = 404 // where the lawn meets the buildings

scene("morning", { w: 960, h: 540, bg: "a" },
  // ---- the sky ----
  grad(0, 0, 960, GY, "abcdeF", "v", 0.6),
  layer("halo", { density: 0.25 }, circ(842, 92, 62, "e")),
  layer("halo2", { density: 0.5 }, circ(842, 92, 44, "F")),
  circ(842, 92, 30, "y"), circ(842, 92, 26, "Y"),
  (c) => { // clouds: blobs shaded underneath, lit on top
    const cloud = (cx, cy, w) => {
      const blobs = [[0, 0, 1], [-0.34, 0.14, 0.72], [0.36, 0.12, 0.76], [-0.62, 0.24, 0.46], [0.64, 0.24, 0.5], [0.12, -0.14, 0.62]];
      const r0 = w / 4;
      for (const [k, dy, shrink] of [["q", 4, 0], ["w", 0, 0], ["W", -4, 6]])
        for (const [dx, by, s] of blobs) c.circ(Math.round(cx + dx * w), Math.round(cy + by * w * 0.5 + dy), Math.max(2, Math.round(r0 * s) - shrink), k);
      c.rect(Math.round(cx - w * 0.78), Math.round(cy + r0 * 0.55), Math.round(w * 1.56), Math.ceil(r0 * 0.55), "q");
    };
    for (const [x, y, w] of [[96, 84, 96], [300, 58, 64], [560, 110, 78], [700, 48, 56], [912, 200, 66], [36, 206, 52]]) cloud(x, y, w);
    for (const [x, y] of [[238, 120], [260, 108], [278, 122], [905, 150], [925, 142]]) { // birds
      c.rect(x, y, 3, 2, "N"); c.rect(x - 4, y - 2, 4, 2, "N"); c.rect(x + 3, y - 2, 4, 2, "N");
    }
  },

  // ---- the city on the horizon: broken towers, a snapped crane, smoke from the fires ----
  (c) => {
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let x = -4; x < 960; ) {
      const w = 14 + Math.floor(rnd() * 26), hgt = 26 + Math.floor(rnd() * 56);
      const top = GY - 30 - hgt;
      c.rect(x, top, w, GY - top, rnd() < 0.5 ? "h" : "H");
      if (rnd() < 0.35) c.poly([x, top, x + w, top, x + w, top + 8 + Math.floor(rnd() * 10)], "e"); // a sheared-off top
      for (let wy = top + 6; wy < GY - 34; wy += 8) for (let wx = x + 3; wx < x + w - 3; wx += 6) if (rnd() < 0.18) c.rect(wx, wy, 2, 3, "q");
      x += w + Math.floor(rnd() * 6);
    }
    c.rect(470, 268, 3, 110, "H"); c.rect(440, 268, 70, 3, "H"); c.line(510, 271, 524, 300, "H", 2); // the crane, snapped
  },
  // smoke from the fires in the city, drifting right: a dithered haze round a denser core
  ...[[0.45, 4, "m"], [1, 0, "M"]].map(([density, grow, k]) => layer("smoke" + k, { density }, (c) => {
    for (const [x, base, hgt] of [[60, 330, 170], [902, 300, 190], [612, 320, 150]])
      for (let n = 0; n < hgt; n += 3) {
        const r = Math.round(3 + n / 16 + grow), dx = Math.round(n * 0.35 + Math.sin(n / 18) * 6);
        if (!grow && n > hgt * 0.6) continue;
        c.circ(x + dx, base - n, grow ? r : Math.max(2, r - 3), k);
      }
  })),
  (c) => { // the town's trees, two rows
    for (let x = 0; x < 960; x++) {
      const far = Math.round(GY - 40 - 8 * Math.sin(x / 61) - 5 * Math.sin(x / 23 + 2));
      c.rect(x, far, 1, GY - far, "t");
      const near = Math.round(GY - 20 - 6 * Math.sin(x / 37 + 1) - 3 * Math.sin(x / 15));
      c.rect(x, near, 1, GY - near, "T");
    }
  },

  // ---- the main building, left: red brick and stone, slate roof, the clock tower ----
  (c) => {
    const brick = (x0, y0, w, hgt) => {
      c.rect(x0, y0, w, hgt, "r");
      for (let y = y0; y < y0 + hgt; y += 5) {
        c.rect(x0, y, w, 1, "R");
        for (let x = x0 + ((y / 5) % 2 ? 0 : 5); x < x0 + w; x += 10) c.rect(x, y, 1, 5, "R");
      }
      c.rect(x0, y0, 3, hgt, "Q");
    };
    const window = (x, y, boarded) => {
      c.rect(x - 3, y - 4, 22, 3, "s"); c.rect(x - 3, y - 4, 22, 1, "Z"); // lintel
      c.rect(x - 2, y + 26, 20, 3, "S"); // sill
      c.rect(x, y, 16, 26, "k");
      if (boarded) {
        for (const [yy, tilt] of [[4, 2], [12, -2], [20, 1]]) c.line(x - 1, y + yy, x + 16, y + yy + tilt, "p", 3);
        for (const [yy, tilt] of [[4, 2], [12, -2], [20, 1]]) c.px(x + 2, y + yy, "P"), c.px(x + 13, y + yy + tilt, "P");
      } else {
        c.rect(x + 1, y + 1, 14, 24, "g");
        c.rect(x + 2, y + 2, 3, 9, "G");
        c.rect(x + 7, y, 2, 26, "s"); c.rect(x, y + 12, 16, 2, "s");
      }
    };
    // the long wing
    brick(-6, 246, 236, GY - 246);
    c.rect(-6, 296, 236, 4, "s"); c.rect(-6, 296, 236, 1, "Z"); // string course
    c.rect(-6, GY - 12, 236, 12, "S"); c.rect(-6, GY - 12, 236, 2, "s"); // plinth
    c.poly([-14, 246, 238, 246, 226, 222, -2, 222], "n"); // the slate roof
    for (let y = 224; y < 246; y += 4) c.rect(-12, y, 248, 1, "N");
    c.rect(-14, 222, 252, 2, "u"); c.rect(-14, 244, 252, 3, "N");
    for (const x of [30, 196]) { c.rect(x, 206, 12, 18, "R"); c.rect(x - 2, 204, 16, 3, "S"); } // chimneys
    for (const x of [8, 44, 80, 190]) { window(x, 258, false); window(x, 322, x < 60); }

    // the clock tower
    const tx = 116, tw = 60;
    brick(tx, 150, tw, GY - 150);
    for (let y = 150; y < GY - 12; y += 12) { c.rect(tx, y, 6, 6, "s"); c.rect(tx + tw - 6, y + 6, 6, 6, "S"); } // stone quoins
    c.rect(tx - 4, 142, tw + 8, 8, "s"); c.rect(tx - 4, 142, tw + 8, 2, "Z");
    c.poly([tx - 6, 142, tx + tw + 6, 142, tx + tw / 2, 92], "n"); // its pyramid cap
    c.poly([tx + tw / 2, 92, tx + tw + 6, 142, tx + tw / 2 + 4, 142], "N");
    c.rect(tx + tw / 2 - 1, 72, 2, 22, "z"); c.circ(tx + tw / 2, 72, 2, "z"); // the spire
    const cx = tx + tw / 2, cy = 182;
    c.circ(cx, cy, 20, "s"); c.circ(cx, cy, 17, "S"); c.circ(cx, cy, 15, "Z");
    for (const [dx, dy] of [[0, -12], [12, 0], [0, 12], [-12, 0]]) c.rect(cx + dx - 1, cy + dy - 1, 2, 2, "2");
    c.rect(cx - 1, cy - 11, 2, 11, "K"); c.line(cx, cy, cx - 8, cy - 4, "K", 2); // ten to eight
    c.rect(cx - 13, 212, 26, 50, "x"); c.rect(cx - 13, 212, 26, 2, "Q"); c.rect(cx + 11, 212, 2, 50, "X"); // the banner
    c.poly([cx - 13, 262, cx, 270, cx + 13, 262], "x");
    c.circ(cx, 232, 7, "z"); c.circ(cx, 232, 4, "x"); c.rect(cx - 1, 228, 2, 8, "z");
    window(tx + 22, 286, false);
    // the front door: an arched oak door, sandbagged
    c.rect(cx - 18, GY - 58, 36, 58, "s"); c.circ(cx, GY - 58, 18, "s");
    c.rect(cx - 14, GY - 56, 28, 56, "P"); c.circ(cx, GY - 56, 14, "P");
    c.rect(cx - 1, GY - 70, 2, 70, "K");
    c.rect(cx - 10, GY - 50, 3, 3, "z"); c.rect(cx + 7, GY - 50, 3, 3, "z");
  },

  // ---- the gym, right: cream walls under a curved slate roof; the water tower, the flag ----
  (c) => {
    // the water tower, behind
    for (const x of [918, 950]) c.line(x, GY, x + (x < 930 ? 8 : -8), 250, "2", 3);
    c.line(920, 330, 948, 290, "2", 1); c.line(948, 330, 920, 290, "2", 1);
    c.rect(908, 214, 52, 40, "1"); c.rect(908, 214, 6, 40, "3"); c.rect(954, 214, 6, 40, "2");
    c.poly([904, 214, 964, 214, 934, 196], "2"); c.rect(904, 252, 60, 3, "2");
    c.text(916, 228, "SOTD", "x", { scale: 2 });

    const gx = 770;
    c.rect(gx, 296, 200, GY - 296, "8");
    c.rect(gx, 296, 3, GY - 296, "3");
    for (let x = gx - 6; x < 966; x++) { // the curved roof, ribbed
      const y = 296 - Math.round(32 * Math.sin((Math.PI * (x - gx + 6)) / 420));
      c.rect(x, y, 1, 299 - y, (x - gx) % 12 ? "n" : "N");
      c.rect(x, y, 1, 2, "u");
    }
    c.rect(gx, 296, 196, 3, "N");
    for (let x = gx + 12; x < 960; x += 28) { c.rect(x, 308, 20, 14, "k"); c.rect(x + 1, 309, 18, 12, "g"); c.rect(x + 2, 310, 3, 5, "G"); } // high windows
    c.text(812, 334, "GYMNASIUM", "n", { scale: 2 });
    c.rect(gx, 360, 200, 2, "9");
    c.rect(gx, GY - 8, 200, 8, "9");
    // the flagpole and the school flag
    c.rect(782, 150, 3, GY - 150, "3"); c.circ(783, 148, 3, "z");
    for (let x = 0; x < 44; x++) {
      const wave = Math.round(Math.sin(x / 6) * 3);
      c.rect(785 + x, 156 + wave, 1, 24, "6"); c.rect(785 + x, 156 + wave, 1, 3, "7");
      if (x > 14 && x < 28) c.rect(785 + x, 164 + wave, 1, 8, "z");
    }
    // the school bus, parked across the gate as a barricade
    const bx = 812, by = 362;
    c.rect(bx, by, 150, 34, "4"); c.rect(bx, by, 150, 3, "z"); c.rect(bx, by + 28, 150, 6, "5");
    c.rect(bx, by + 18, 150, 2, "K");
    for (let x = bx + 8; x < bx + 140; x += 18) { c.rect(x, by + 5, 14, 11, "k"); c.rect(x + 1, by + 6, 12, 9, "g"); }
    for (let x = bx + 26; x < bx + 140; x += 36) c.line(x, by + 6, x + 12, by + 15, "p", 2); // some boarded
    c.text(bx + 40, by + 22, "SCHOOL BUS", "K");
    for (const x of [bx + 24, bx + 118]) { c.circ(x, by + 36, 8, "K"); c.circ(x, by + 36, 3, "2"); }
  },

  // ---- the grounds ----
  (c) => {
    c.rect(0, GY, 960, 540 - GY, "l");
    for (let x = 0; x < 960; x += 16) c.rect(x, GY, 8, 540 - GY, "L"); // mowing stripes
    c.rect(0, GY, 960, 3, "v");
    // the running track's curve, front left, a pitch inside it
    c.ellipse(80, 580, 250, 106, "J"); c.ellipse(80, 580, 244, 102, "j");
    for (let k = 1; k < 4; k++) c.ellipse(80, 580, 244 - k * 8, 102 - k * 3, "i", true);
    c.ellipse(80, 580, 212, 76, "v"); c.ellipse(80, 580, 210, 75, "l");
    for (let k = 1; k < 6; k++) c.ellipse(80, 580, 210 - k * 32, 75 - k * 12, "L", true);
    // vegetable beds, front right, where the tennis court was
    for (let row = 0; row < 4; row++) {
      const y = 458 + row * 20, x0 = 786 - row * 14;
      c.rect(x0, y, 960 - x0, 12, "o"); c.rect(x0, y + 10, 960 - x0, 2, "D");
      for (let x = x0 + 4; x < 960; x += 9) { c.rect(x, y - 4, 3, 7, "E"); c.px(x + 1, y - 5, "A"); c.px(x - 1, y - 2, "A"); }
    }
    // a scarecrow minding them
    c.rect(900, 410, 3, 52, "P"); c.rect(886, 424, 31, 3, "P");
    c.rect(893, 422, 17, 20, "x"); c.circ(901, 414, 6, "B"); c.rect(893, 406, 17, 3, "P"); c.rect(896, 402, 11, 5, "P");
  },
  // the fence along the front: posts, rails, barbed wire coiled on top, sandbags at the gaps
  (c) => {
    for (let x = 0; x < 960; x += 24) { c.rect(x, 416, 4, 26, "U"); c.rect(x, 416, 4, 2, "I"); }
    c.rect(0, 424, 960, 3, "I"); c.rect(0, 434, 960, 3, "I"); c.rect(0, 437, 960, 1, "U");
    for (let x = 0; x < 960; x += 8) { c.ring(x + 4, 412, 4, "0"); c.px(x + 2, 409, "1"); c.px(x + 6, 415, "1"); }
    const bags = (x0, y0, n, rows) => {
      for (let r = 0; r < rows; r++) for (let i = 0; i < n - r; i++) {
        const x = x0 + i * 14 + r * 7, y = y0 - r * 7;
        c.ellipse(x + 6, y, 7, 4, "O"); c.ellipse(x + 6, y - 1, 6, 3, "B"); c.rect(x + 3, y - 3, 6, 1, "I");
      }
    };
    bags(84, GY - 2, 8, 3); // round the school's front door
    bags(0, 446, 5, 2);
    bags(700, 446, 4, 2);
  },
  // trees: cherry blossom and plain green, in front of the buildings
  (c) => {
    const tree = (x, base, s, leaf, lit, dark) => {
      c.rect(Math.round(x - 3 * s), Math.round(base - 30 * s), Math.round(6 * s), Math.round(30 * s), "P");
      c.circ(Math.round(x), Math.round(base - 46 * s), Math.round(20 * s), dark);
      c.circ(Math.round(x + 12 * s), Math.round(base - 34 * s), Math.round(14 * s), dark);
      c.circ(Math.round(x - 12 * s), Math.round(base - 36 * s), Math.round(14 * s), dark);
      c.circ(Math.round(x - 2 * s), Math.round(base - 49 * s), Math.round(17 * s), leaf);
      c.circ(Math.round(x - 12 * s), Math.round(base - 38 * s), Math.round(10 * s), leaf);
      c.circ(Math.round(x - 7 * s), Math.round(base - 56 * s), Math.round(8 * s), lit);
    };
    tree(232, 412, 1, "#d8a6b8", "#efd0dc", "#b47f93"); // cherries
    tree(748, 412, 1, "#d8a6b8", "#efd0dc", "#b47f93");
    tree(22, 418, 1.1, "#5f8a56", "#79a468", "#4a6e44");
    tree(60, 476, 0.8, "#d8a6b8", "#efd0dc", "#b47f93");
    for (const [x, y] of [[50, 480], [64, 484], [74, 476], [44, 472], [238, 420], [226, 424]]) c.rect(x, y, 3, 2, "#efd0dc"); // fallen petals
  },
  // shadows the buildings and trees cast on the lawn (the sun's up on the right)
  layer("shadows", { shade: true, density: 0.5 },
    poly([-6, GY, 230, GY, 200, GY + 14, -6, GY + 14], "K"),
    poly([770, GY, 960, GY, 960, GY + 12, 740, GY + 12], "K"),
    ellipse(226, 416, 22, 4, "K"), ellipse(742, 416, 22, 4, "K")),
)
