// The school's staff: a permanent NPC in every room, doing the job teachers used to (their rooms'
// levels set how well). Each is an original character inspired by someone (`ref`), drawn in code
// in the students' chibi style — big head, short body — but half as big again (a 48x60 figure to
// their 32x40) and in more detail: bigger eyes with a glint, lips, clothes down to the buttons.

import { Grid, mix, shadowOf, lightOf, outlineOf } from "./sprite.js";

// The canvas: the 48x60 figure stands at (OX, OY), with room above for what's held high and either
// side for what they carry.
const NW = 72;
const NH = 80;
const OX = 12;
const OY = 16;
const C = 24; // the figure's centre line: columns C-1 | C

// ---------- drawing helpers (in the figure's own coordinates) ----------

const sym = (g, y, hw, k) => g.rect(C - hw, y, C + hw - 1, y, k);
const shape = (g, rows, k) => rows.forEach(([y, hw]) => sym(g, y, hw, k));
const mx = (x) => 2 * C - 1 - x; // the mirror of column x
function disc(g, cx, cy, rx, ry, k, hole = 0) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d <= 1 && d >= hole) g.set(x, y, k);
    }
  }
}
function recolor(g, x0, y0, x1, y1, k, onto) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (onto.includes(g.get(x, y))) g.set(x, y, k);
}

// ---------- the chibi body ----------

const ARM = { M: 9, F: 10 }; // the left arm's outer column (5 wide); the right mirrors it

function legs(g, sex, kind) {
  const k = kind === "bare" ? "s" : kind === "tights" ? "x" : "p";
  shape(g, [[46, 9], [47, 9], [48, 9]], k);
  const [o, i] = sex === "M" ? [15, 21] : [16, 21];
  g.rect(o, 49, i, 54, k);
  g.rect(mx(i), 49, mx(o), 54, k);
  for (const [a, b] of [[o - 1, i], [mx(i), mx(o) + 1]]) {
    g.rect(a + 1, 55, b, 55, "f");
    g.rect(a, 56, b, 56, "f");
    g.rect(a, 57, b, 57, "F");
  }
}

function torso(g, sex) {
  const rows = sex === "F"
    ? [[31, 6], [32, 8], [33, 9], [34, 9], [35, 9], [36, 9], [37, 9], [38, 8], [39, 8], [40, 8], [41, 9], [42, 9], [43, 9], [44, 9], [45, 9]]
    : [[31, 7], [32, 9], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10], [39, 10], [40, 10], [41, 10], [42, 10], [43, 10], [44, 10], [45, 10]];
  shape(g, rows, "u");
}

// An arm: "down", "hold" (the hand forward at the waist), "up" (raised beside the head) or "hip".
// Returns its hand's box [x0, y0] (4x3).
function arm(g, sex, side, pose) {
  const L = ARM[sex];
  const x0 = side === "L" ? L : mx(L + 4);
  const hand = (hx, hy) => {
    g.rect(hx, hy, hx + 3, hy + 2, "s");
    g.rect(hx, hy + 2, hx + 3, hy + 2, "S");
    g.set(side === "L" ? hx + 4 : hx - 1, hy + 1, "s");
    return [hx, hy];
  };
  if (pose === "up") {
    g.rect(x0, 8, x0 + 3, 33, "l");
    g.rect(side === "L" ? x0 + 4 : x0, 31, side === "L" ? x0 + 4 : x0, 34, "l");
    return hand(x0, 4);
  }
  if (pose === "crossed") {
    // the upper arm at the side, the forearm across the chest (the right one over the left)
    g.rect(x0, 33, x0 + 4, 39, "l");
    if (side === "L") {
      g.rect(x0 + 2, 38, C + 3, 40, "l");
      return hand(C + 3, 38);
    }
    g.rect(C - 4, 35, x0 + 2, 37, "l");
    return hand(C - 7, 35);
  }
  if (pose === "hold") {
    g.rect(x0, 33, x0 + 4, 39, "l");
    return hand(side === "L" ? x0 + 2 : x0 - 1, 40);
  }
  if (pose === "hip") {
    const out = side === "L" ? -1 : 1;
    g.rect(x0, 33, x0 + 4, 35, "l");
    g.rect(x0 + out, 36, x0 + 4 + out, 38, "l");
    g.rect(x0 + (side === "L" ? 2 : -2), 39, x0 + 4 + (side === "L" ? 2 : -2), 40, "l");
    return hand(side === "L" ? x0 + 4 : x0 - 3, 39);
  }
  g.rect(x0, 33, x0 + 4, 42, "l");
  return hand(side === "L" ? x0 : x0 + 1, 43);
}

function headShape(g, jaw) {
  const rows = [[6, 8], [7, 10], [8, 11]];
  for (let y = 9; y <= 22; y++) rows.push([y, 12]);
  const JAW = { soft: [[23, 11], [24, 10], [25, 9], [26, 7], [27, 5]], square: [[23, 12], [24, 11], [25, 10], [26, 9], [27, 7]] };
  shape(g, [...rows, ...JAW[jaw]], "s");
  g.rect(10, 15, 11, 20, "s"); // ears
  g.rect(36, 15, 37, 20, "s");
  g.rect(11, 17, 11, 18, "S");
  g.rect(36, 17, 36, 18, "S");
}

// Eyes, 4x4: the lid, the white with a glint, the iris and its pupil. "normal", "narrow" (heavy
// lids), "wide", "closed" (happy arcs); `lashes` flick out at the corners.
function eyes(g, style, lashes) {
  for (const [x0, flip] of [[16, false], [28, true]]) {
    const X = (i) => (flip ? x0 + 3 - i : x0 + i); // i 0 = the outer corner
    if (style === "closed") {
      g.points([[X(0), 17], [X(1), 16], [X(2), 16], [X(3), 17]], "e");
      continue;
    }
    const top = style === "narrow" ? 16 : 15;
    g.rect(x0, top, x0 + 3, top, "e");
    if (style === "wide") g.rect(x0, 14, x0 + 3, 14, "e");
    if (style !== "narrow") {
      g.set(X(0), 16, "w");
      g.set(X(1), 16, "W");
      g.set(X(2), 16, "i");
      g.set(X(3), 16, "w");
    }
    g.set(X(0), 17, "w");
    g.set(X(1), 17, "i");
    g.set(X(2), 17, "I");
    g.set(X(3), 17, "w");
    g.set(X(1), 18, "i");
    g.set(X(2), 18, "i");
    if (lashes) g.points([[X(0) + (flip ? 1 : -1), 15], [X(0) + (flip ? 1 : -1), 14]], "e");
  }
}

const BROW = {
  neutral: [[0, 13], [1, 12], [2, 12], [3, 12], [4, 13]],
  flat: [[0, 12], [1, 12], [2, 12], [3, 12], [4, 12]],
  angry: [[0, 11], [1, 11], [2, 12], [3, 13], [4, 13]],
  worried: [[0, 13], [1, 13], [2, 12], [3, 11], [4, 11]],
  raised: [[0, 12], [1, 11], [2, 10], [3, 10], [4, 11]],
};
function brows(g, style, thick) {
  const [l, r] = Array.isArray(style) ? style : [style, style];
  for (const [s, side] of [[l, "L"], [r, "R"]]) {
    for (const [i, y] of BROW[s]) {
      const x = side === "L" ? 15 + i : 32 - i;
      g.set(x, y, "b");
      if (thick) g.set(x, y + 1, "b");
    }
  }
}

function mouth(g, style, lips) {
  const lip = lips ? "L" : "m";
  if (style === "grin") {
    g.rect(21, 23, 26, 23, "m");
    g.rect(22, 24, 25, 24, "w");
    g.rect(23, 25, 24, 25, lip);
  } else if (style === "open") {
    g.rect(22, 23, 25, 23, lip);
    g.rect(22, 24, 25, 24, "q");
    g.rect(23, 25, 24, 25, lip);
    g.points([[21, 24], [26, 24]], "m");
  } else if (style === "flat") {
    g.rect(22, 24, 25, 24, "m");
  } else if (style === "smirk") {
    g.rect(22, 24, 24, 24, lip);
    g.points([[25, 23], [26, 23]], lip);
  } else if (style === "frown") {
    g.rect(22, 23, 25, 23, "m");
    g.points([[21, 24], [26, 24]], "m");
  } else {
    g.points([[21, 23], [26, 23]], "m");
    g.rect(22, 24, 25, 24, lip);
    if (lips) g.set(23, 24, "q");
  }
}

// A whole person, back to front, with `layers` to draw their own things at each stage: back,
// lower (over the legs), torso, arms, collar (after the head), head and front (props).
function person(g, cfg) {
  const {
    sex = "M", jaw = sex === "F" ? "soft" : "square", legKind = "pants", armL = "down", armR = "down",
    eye = "normal", lashes = sex === "F", brow = "neutral", thickBrows = false, mouthStyle = "smile", lips = sex === "F", blush = sex === "F",
    layers = {},
  } = cfg;
  layers.back?.(g);
  legs(g, sex, legKind);
  layers.lower?.(g);
  torso(g, sex);
  layers.torso?.(g);
  const hands = { L: arm(g, sex, "L", armL), R: arm(g, sex, "R", armR) };
  layers.arms?.(g, hands);
  g.rect(21, 26, 26, 31, "s"); // the neck
  g.rect(21, 28, 26, 28, "S");
  headShape(g, jaw);
  layers.collar?.(g);
  eyes(g, eye, lashes);
  brows(g, brow, thickBrows);
  g.points([[23, 21], [24, 21], [24, 20]], "S"); // the nose
  mouth(g, mouthStyle, lips);
  if (blush) g.points([[15, 21], [16, 21], [31, 21], [32, 21]], "k");
  layers.head?.(g);
  layers.front?.(g, hands);
}

// ---------- the cast ----------
// Each: the room it runs, name, nickname, who it's inspired by, bubble lines, its colours (`look`)
// and its own keys (`extra`: [colour, group, rim-shaded]), and its drawing.

export const NPCS = {
  doubledoor: {
    room: "headmaster", name: "Albus Doubledoor", nickname: "The Magician", ref: "Dumbledore, with a stage magician's tricks",
    lines: ["Pick a card. Any card. …Is it the three of zombies?", "It is our choices, not our barricades, that show what we truly are. …Still, build the barricades.", "A magician never reveals his secrets. Or his escape route."],
    look: { skin: "#f0d0b6", hair: "#e4e5ec", eye: "#5a86c0", main: "#2a2734", sleeve: "#2a2734", shirt: "#efeaf2", accent: "#6b3fa0", pants: "#2e2b38", shoes: "#1a1820", glasses: "#d4a83a" },
    extra: { 1: ["#8a5ac8", "body"], 2: ["#f6f6f8", "prop", true], 3: ["#d23838"] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", eye: "normal", brow: "flat", thickBrows: true, mouthStyle: "flat",
        layers: {
          back(g) {
            for (let y = 8; y <= 41; y++) sym(g, y, y < 36 ? 14 : 14 - (y - 35) * 2, "h"); // long silver hair
            for (const x of [11, 14, 33, 36]) g.rect(x, 26, x, 38, "H");
          },
          lower(g) {
            for (let y = 40; y <= 56; y++) { // the academic gown, open over the trousers
              const flare = Math.floor((y - 40) / 6);
              g.rect(13 - flare, y, 19, y, "u");
              g.rect(28, y, 34 + flare, y, "u");
            }
          },
          torso(g) {
            g.rect(19, 31, 28, 45, "a"); // the purple waistcoat
            g.rect(18, 31, 18, 56, "1"); // the gown's lining
            g.rect(29, 31, 29, 56, "1");
          },
          collar(g) {
            sym(g, 29, 4, "c");
            sym(g, 30, 5, "c");
          },
          head(g) {
            shape(g, [[3, 5], [4, 8], [5, 10], [6, 11]], "h"); // receding, silver
            g.rect(12, 7, 17, 9, "h");
            g.rect(30, 7, 35, 9, "h");
            g.rect(9, 7, 13, 27, "h");
            g.rect(34, 7, 38, 27, "h");
            g.points([[21, 4], [22, 3], [26, 4]], "j");
            // the beard
            g.rect(17, 21, 30, 22, "h");
            shape(g, [[23, 11], [24, 11], [25, 10], [26, 10], [27, 10], [28, 9], [29, 9], [30, 9], [31, 8], [32, 8], [33, 7], [34, 7], [35, 6], [36, 6], [37, 5], [38, 5], [39, 4], [40, 3], [41, 2], [42, 1]], "h");
            g.rect(22, 23, 25, 23, "m");
            for (const x of [17, 20, 27, 30]) g.rect(x, 26, x, Math.round(37 - Math.abs(x - 23.5) * 1.2), "H");
            g.points([[19, 24], [28, 24], [16, 25]], "j");
            // half-moon spectacles
            g.rect(15, 19, 20, 19, "g");
            g.rect(27, 19, 32, 19, "g");
            g.points([[15, 18], [20, 18], [27, 18], [32, 18], [21, 17], [22, 17], [25, 17], [26, 17]], "g");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // a fan of cards
            g.rect(hx - 5, hy - 8, hx - 2, hy - 2, "2");
            g.rect(hx - 3, hy - 9, hx, hy - 3, "2");
            g.rect(hx - 1, hy - 8, hx + 2, hy - 2, "2");
            g.points([[hx - 4, hy - 6], [hx - 2, hy - 7], [hx + 1, hy - 6], [hx - 3, hy - 4], [hx + 1, hy - 3]], "3");
          },
        },
      });
    },
  },

  mopovich: {
    room: "gym", name: "Coach Anatolio Mopovich", nickname: "Mister Mop", ref: "Anatoly, the undercover-cleaner powerlifter",
    lines: ["Excuse me… can I clean here?", "This bar is dirty. I will just… move it. 500 kilo. Okay.", "Zombie is very heavy? Hm. Light weight.", "You do bench press? Very nice. I do mop."],
    look: { skin: "#eec09a", hair: "#5a4636", eye: "#3d5f7a", main: "#5c7187", sleeve: "#5c7187", shirt: "#e9edf2", pants: "#5c7187", shoes: "#2a2522", glasses: "#15131a", hat: "#47556a", accent: "#c43c3c" },
    extra: { 1: ["#dcdfe5"], 2: ["#9ba1aa"], 3: ["#f2c230", "prop", true], 4: ["#b8891a"], 5: ["#7fb6dc"] },
    draw(g) {
      person(g, {
        sex: "M", eye: "normal", brow: "neutral", mouthStyle: "smile",
        layers: {
          back(g) {
            g.rect(10, -2, 10, 56, "o"); // the mop handle
            g.rect(11, -2, 11, 56, "O");
          },
          torso(g) {
            sym(g, 31, 7, "U");
            g.rect(23, 32, 23, 48, "U"); // zip
            g.rect(27, 34, 31, 37, "U"); // pocket
            g.rect(27, 34, 31, 34, "u");
            g.rect(15, 34, 20, 36, "c"); // name patch
            g.rect(16, 35, 19, 35, "a");
            sym(g, 44, 10, "U");
          },
          arms(g) {
            for (const x0 of [ARM.M, mx(ARM.M + 4)]) { // rolled sleeves over very big forearms
              g.rect(x0 - (x0 < C ? 1 : 0), 38, x0 + 4 + (x0 < C ? 0 : 1), 38, "U");
              g.rect(x0 - (x0 < C ? 1 : 0), 39, x0 + 4 + (x0 < C ? 0 : 1), 42, "s");
            }
          },
          collar(g) {
            g.rect(19, 29, 22, 31, "U");
            g.rect(25, 29, 28, 31, "U");
          },
          head(g) {
            g.rect(12, 10, 13, 16, "h");
            g.rect(34, 10, 35, 16, "h");
            shape(g, [[2, 7], [3, 10], [4, 12], [5, 12], [6, 13], [7, 13], [8, 13]], "r"); // the flat cap
            sym(g, 9, 14, "R");
            sym(g, 10, 12, "R");
            g.rect(23, 2, 24, 2, "R");
            for (const x0 of [14, 26]) { // thick glasses
              g.rect(x0, 14, x0 + 7, 14, "g");
              g.rect(x0, 19, x0 + 7, 19, "g");
              g.rect(x0, 14, x0, 19, "g");
              g.rect(x0 + 7, 14, x0 + 7, 19, "g");
            }
            g.rect(22, 15, 25, 15, "g");
            g.points([[12, 15], [13, 15], [34, 15], [35, 15]], "g");
          },
          front(g) {
            g.rect(5, 56, 16, 57, "N"); // the mop head
            for (let x = 4; x <= 17; x++) g.rect(x, 58, x, 61 + ((x * 7) % 3), x % 2 ? "2" : "1");
            // the yellow bucket
            g.points([[41, 42], [42, 40], [44, 39], [50, 39], [52, 40], [53, 42]], "N");
            g.rect(45, 38, 49, 38, "N");
            g.rect(39, 44, 55, 45, "4");
            g.rect(40, 45, 54, 45, "5");
            for (let y = 46; y <= 59; y++) g.rect(39 + Math.floor((y - 46) / 5), y, 55 - Math.floor((y - 46) / 5), y, "3");
            g.rect(40, 50, 54, 50, "4");
          },
        },
      });
    },
  },

  quinzwheel: {
    room: "acrobatics", name: "Miss Harleen Quinzwheel", nickname: "Sweet Pudding", ref: "Harley Quinn (Margot Robbie, Suicide Squad)",
    lines: ["Ooh, a zombie! Wanna see a backflip?", "Rule one, kiddos: if it bites, you bounce!", "Dodging's just dancing with extra screaming!"],
    look: { skin: "#f9e4da", hair: "#f4dc90", eye: "#3d7ad8", lips: "#c8233a", main: "#c8283c", sleeve: "#c8283c", shirt: "#f6f6f8", accent: "#c8283c", socks: "#2a1e2a", shoes: "#f2f2f4" },
    extra: {
      5: ["#f06292", "hair", true], 6: ["#4f7fe6", "hair", true], 7: ["#2f5fd0", "body", true], 8: ["#1e1a22", "body"],
      0: ["#e86aa0", "skin"], B: ["#5a8ae8", "skin"], X: ["#d42a3c", "legs", true], Q: ["#2a55c8", "legs", true], 9: ["#2f5fd0", "sleeve", true],
    },
    draw(g) {
      person(g, {
        sex: "F", legKind: "bare", armR: "hip", eye: "normal", brow: "neutral", mouthStyle: "smirk", blush: false,
        layers: {
          back(g) {
            // high pigtails, dip-dyed pink and blue
            for (const [side, dye] of [[-1, "5"], [1, "6"]]) {
              for (let y = 5; y <= 38; y++) {
                const w = y < 9 ? 1.5 + (y - 5) * 0.5 : 3.3 - Math.max(0, y - 24) * 0.15;
                const cx = C - 0.5 + side * (16.5 + Math.sin((y - 5) / 7) * 2);
                g.rect(Math.round(cx - w), y, Math.round(cx + w), y, y < 22 ? "h" : dye);
              }
              g.rect(side < 0 ? 7 : 37, 5, side < 0 ? 10 : 40, 8, side < 0 ? "a" : "7"); // scrunchies
            }
          },
          lower(g) {
            for (let y = 49; y <= 54; y++) for (let x = 14; x <= 33; x++) if (g.get(x, y) === "s" && ((x + y) % 3 === 0 || (x - y + 300) % 3 === 0)) g.set(x, y, "x"); // fishnets
            for (const [a, b] of [[16, 21], [26, 31]]) g.rect(a, 51, b, 54, "f"); // high-tops
            g.points([[18, 52], [19, 53], [28, 52], [29, 53]], "8");
            g.rect(15, 43, 23, 48, "X"); // the shorts
            g.rect(24, 43, 32, 48, "Q");
            g.rect(15, 43, 32, 43, "8");
            g.points([[17, 43], [21, 43], [26, 43], [30, 43], [18, 46], [29, 45]], "y");
          },
          torso(g) {
            g.rect(19, 31, 28, 42, "c"); // "Daddy's Lil Monster"
            g.rect(20, 35, 27, 35, "z");
            g.points([[20, 37], [22, 37], [24, 37], [26, 37]], "7");
            g.rect(21, 39, 26, 39, "z");
            for (let y = 31; y <= 42; y++) { g.rect(15, y, 18, y, "u"); g.rect(29, y, 32, y, "7"); } // the bomber
            g.rect(15, 41, 18, 42, "8");
            g.rect(29, 41, 32, 42, "8");
          },
          arms(g) {
            recolor(g, 28, 30, 44, 45, "9", ["l"]);
            g.rect(ARM.F, 40, ARM.F + 4, 41, "8");
          },
          collar(g) {
            g.rect(21, 27, 26, 28, "8"); // the "PUDDIN" choker
            g.rect(22, 28, 25, 28, "y");
          },
          head(g) {
            shape(g, [[3, 6], [4, 9], [5, 11], [6, 12], [7, 12], [8, 12]], "h"); // blonde, choppy bangs
            for (const [x0, x1, y1] of [[12, 15, 14], [16, 19, 12], [20, 24, 13], [25, 28, 11], [29, 35, 14]]) g.rect(x0, 9, x1, y1, "h");
            g.rect(11, 9, 13, 20, "h");
            g.rect(34, 9, 36, 20, "h");
            g.points([[19, 4], [20, 3], [26, 4]], "j");
            g.rect(15, 14, 20, 14, "0"); // smudged pink and blue eyeshadow
            g.points([[15, 15], [16, 19], [17, 19]], "0");
            g.rect(27, 14, 32, 14, "B");
            g.points([[32, 15], [31, 19], [30, 19]], "B");
          },
        },
      });
    },
  },

  frankenstitch: {
    room: "Biology", name: "Dr. Viktor Frankenstitch", nickname: "It's Alive", ref: "Victor Frankenstein",
    lines: ["Bitten? Marvelous! Hold still, I want notes.", "Steve says hello. Steve is a hand.", "A body is just a machine that hasn't given up yet!"],
    look: { skin: "#ecd5c3", hair: "#f2f2f6", eye: "#4a8a4a", main: "#f1f2f0", sleeve: "#f1f2f0", shirt: "#3b4a3e", accent: "#7a1e2a", pants: "#3a3f4b", shoes: "#1d1d22", glasses: "#c9a227" },
    extra: { 1: ["#9fdcef"], 2: ["#d5edf4", "prop", true], 3: ["#7cc35a"], 4: ["#6f8c5c"], 5: ["#2c332c", "sleeve", true], 6: ["#b58d86", "skin"], 7: ["#a3262a", "body"] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", eye: "wide", brow: "raised", mouthStyle: "grin",
        layers: {
          back(g) {
            for (let y = 0; y <= 26; y++) { // a wild white cloud of hair
              const hw = y < 4 ? 6 + y * 3 : y < 21 ? 17 + ((y * 5) % 3) : 17 - (y - 20) * 3;
              sym(g, y, hw, "h");
            }
            g.points([[4, 6], [3, 11], [4, 17], [43, 5], [44, 12], [43, 18], [16, -1], [22, -2], [29, -1]], "h");
          },
          lower(g) {
            for (let y = 44; y <= 52; y++) { g.rect(13, y, 22, y, "u"); g.rect(25, y, 34, y, "u"); } // the coat, long
            g.points([[16, 47], [17, 48], [31, 46], [28, 51]], "7");
          },
          torso(g) {
            g.rect(20, 31, 27, 45, "c"); // dark shirt and tie
            g.rect(23, 32, 24, 42, "a");
            g.rect(22, 31, 25, 32, "a");
            g.points([[19, 31], [19, 32], [18, 33], [18, 34], [28, 31], [28, 32], [29, 33], [29, 34]], "U");
            g.rect(29, 38, 32, 41, "U");
            g.points([[30, 37], [31, 36]], "N");
            g.points([[16, 35], [17, 36], [31, 33], [15, 41], [32, 43]], "7");
          },
          arms(g) {
            for (let y = 37; y <= 46; y++) for (let x = 0; x <= 47; x++) if (["l", "s", "S"].includes(g.get(x, y)) && Math.abs(x - C) > 9) g.set(x, y, "5"); // rubber gloves
          },
          head(g) {
            shape(g, [[3, 10], [4, 12], [5, 13], [6, 13], [7, 13]], "h"); // the fringe, sticking up
            for (const [x, y1] of [[12, 11], [15, 10], [19, 12], [23, 10], [27, 11], [31, 10], [34, 11]]) g.rect(x, 8, x + 1, y1, "h");
            g.rect(8, 8, 12, 20, "h");
            g.rect(35, 8, 39, 20, "h");
            g.points([[19, 2], [20, 1], [26, 2], [27, 1]], "j");
            g.rect(9, 8, 38, 9, "K"); // goggles on his forehead
            for (const cx of [17.5, 29.5]) {
              disc(g, cx, 8.5, 4, 3.6, "g");
              disc(g, cx, 8.5, 2.4, 2.1, "1");
              g.set(Math.floor(cx) - 1, 7, "W");
            }
            g.points([[15, 19], [16, 20], [17, 21], [18, 22]], "6"); // his own stitches
            g.points([[15, 21], [16, 19], [17, 22], [18, 20]], "e");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // Steve, in his jar
            const x0 = hx - 8;
            const y0 = hy - 13;
            g.rect(x0 + 1, y0, x0 + 8, y0 + 1, "N");
            g.rect(x0, y0 + 2, x0 + 9, y0 + 14, "2");
            g.points([[x0, y0 + 2], [x0 + 9, y0 + 2], [x0, y0 + 14], [x0 + 9, y0 + 14]], null);
            g.rect(x0 + 1, y0 + 8, x0 + 8, y0 + 13, "3");
            const hand = [[3, 4], [5, 3], [7, 4], [3, 5], [4, 5], [5, 4], [6, 5], [7, 5], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [4, 7], [5, 7], [6, 7], [4, 8], [5, 8], [6, 8], [5, 9], [5, 10], [5, 11]];
            g.points(hand.map(([x, y]) => [x0 + x, y0 + y]), "4");
            g.rect(x0 + 1, y0 + 3, x0 + 1, y0 + 6, "W");
          },
        },
      });
    },
  },

  quarkwell: {
    room: "Physics", name: "Dr. Sheldon Quarkwell", nickname: "Bazinga", ref: "Sheldon Cooper",
    lines: ["Aim for the knee. 47 degrees. Basic physics.", "That's my spot.", "Critical hit. Bazinga."],
    look: { skin: "#f4d4b8", hair: "#4a2f1e", eye: "#2e5f92", main: "#c62f2f", sleeve: "#c62f2f", pants: "#a08a5a", shoes: "#e9e9ec" },
    extra: { 1: ["#e9ebef", "sleeve", true], 2: ["#3c4a6e", "sleeve", true], 3: ["#f2c230", "body"], 4: ["#f4f4f6", "prop", true] },
    draw(g) {
      person(g, {
        sex: "M", armR: "hold", eye: "normal", brow: ["raised", "neutral"], mouthStyle: "smirk",
        layers: {
          lower(g) {
            for (let x = 16; x <= 31; x += 2) for (let y = 49; y <= 54; y++) if (g.get(x, y) === "p") g.set(x, y, "P"); // corduroy
          },
          torso(g) {
            sym(g, 31, 5, "U");
            disc(g, 23.5, 37.5, 4.2, 4.2, "3"); // the bolt in a circle
            g.points([[25, 34], [24, 35], [25, 35], [23, 36], [24, 36], [22, 37], [23, 37], [24, 37], [25, 37], [26, 37], [24, 38], [25, 38], [23, 39], [24, 39], [22, 40], [23, 40], [22, 41]], "u");
          },
          arms(g) {
            for (let y = 36; y <= 42; y++) for (let x = 0; x <= 47; x++) if (g.get(x, y) === "l") g.set(x, y, y % 2 ? "2" : "1"); // a striped long-sleeve under the tee
          },
          head(g) {
            shape(g, [[3, 7], [4, 10], [5, 11], [6, 12], [7, 12]], "h"); // a neat side part
            for (let y = 8; y <= 11; y++) g.rect(12, y, 30 - (y - 8) * 5, y, "h");
            g.rect(12, 8, 13, 15, "h");
            g.rect(34, 8, 35, 15, "h");
            g.rect(30, 3, 30, 7, "j");
          },
          front(g, hands) {
            const [hx, hy] = hands.R; // a whiteboard marker
            g.rect(hx + 1, hy - 7, hx + 2, hy, "4");
            g.rect(hx + 1, hy - 8, hx + 2, hy - 7, "2");
          },
        },
      });
    },
  },

  bickus: {
    room: "History", name: "Diggus Bickus", nickname: "'Tis But A Scratch", ref: "the Romans of Monty Python",
    lines: ["Veni, vidi, barricadi.", "Romanes eunt domus? Write it out a hundred times!", "'Tis but a scratch. I've seen worse at Carthage.", "Is something funny about my name, legionary?"],
    look: { skin: "#e2b088", hair: "#2e2018", eye: "#4a2e1e", main: "#7a2632", sleeve: "#eceae4", shirt: "#eceae4", accent: "#b8262e", pants: "#a8946a", shoes: "#7a5230", socks: "#f2f2f2" },
    extra: { 6: ["#7f9c3a", "hair", true], 7: ["#e8c14a"], 8: ["#efe3c2", "prop", true], 9: ["#c9b48a"] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", eye: "narrow", brow: "angry", thickBrows: true, mouthStyle: "flat",
        layers: {
          lower(g) {
            for (const [a, b] of [[15, 21], [26, 32]]) {
              g.rect(a, 50, b, 54, "x"); // socks…
              for (const y of [51, 53]) g.rect(a, y, b, y, "f"); // …under his sandals
            }
          },
          torso(g) {
            g.rect(20, 31, 27, 34, "c"); // a white shirt under the sweater vest
            g.points([[21, 35], [26, 35], [22, 36], [25, 36]], "c");
            for (let y = 37; y <= 44; y += 2) g.rect(14, y, 33, y, "U"); // its knit
            for (let y = 31; y <= 45; y++) { // the toga sash, over one shoulder
              const x = 14 + Math.round((y - 31) * 1.25);
              g.rect(x, y, x + 4, y, "a");
            }
            for (let y = 33; y <= 45; y += 3) g.set(14 + Math.round((y - 31) * 1.25) + 4, y, "A");
          },
          collar(g) {
            g.points([[20, 29], [21, 30], [27, 29], [26, 30]], "C");
          },
          head(g) {
            shape(g, [[3, 8], [4, 10], [5, 12], [6, 12], [7, 12]], "h"); // short dark curls
            for (const x of [13, 17, 21, 25, 29, 33]) g.rect(x, 8, x + 2, 9, "h");
            g.rect(12, 8, 13, 15, "h");
            g.rect(34, 8, 35, 15, "h");
            for (let x = 12; x <= 35; x += 3) g.set(x, 5, "H");
            for (let x = 11; x <= 36; x++) g.set(x, 6 + (x === 11 || x === 36 ? 1 : 0), "6"); // a laurel wreath
            for (let x = 12; x <= 35; x += 2) g.set(x, 5 + ((x / 2) % 2), "6");
            g.points([[10, 8], [37, 8], [10, 9], [37, 9]], "6");
            g.rect(23, 6, 24, 6, "7");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // a rolled scroll
            g.rect(hx - 4, hy - 2, hx + 7, hy, "8");
            g.rect(hx - 5, hy - 3, hx - 4, hy + 1, "9");
            g.rect(hx + 7, hy - 3, hx + 8, hy + 1, "9");
            g.rect(hx - 2, hy - 1, hx + 5, hy - 1, "9");
          },
        },
      });
    },
  },

  seen: {
    room: "SocialStudies", name: "Ms. Sydney Seen", nickname: "Good Jeans", ref: "a nod to Sydney Sweeney's glam",
    lines: ["You've got this, sweetheart. I believe in you.", "Nobody gives up on my watch. Nobody.", "A good speech beats a barricade. Well… almost."],
    look: { skin: "#f7d9c4", hair: "#efcf7a", eye: "#4a8ad8", lips: "#c42d3c", main: "#5a82ba", sleeve: "#5a82ba", shirt: "#f6f6f8", accent: "#e04a5a", pants: "#3f6aa8", shoes: "#c42d3c" },
    extra: { 1: ["#7aa2d6", "legs"] },
    draw(g) {
      person(g, {
        sex: "F", armR: "hold", eye: "normal", brow: "neutral", mouthStyle: "smile",
        layers: {
          back(g) {
            for (let y = 6; y <= 44; y++) { // long golden waves
              const w = Math.round(Math.sin(y / 2.6) * 1.2);
              g.rect(9 + w, y, 38 + w, y, "h");
            }
            for (const x of [11, 14, 33, 36]) for (let y = 28; y <= 42; y++) { const xx = x + Math.round(Math.sin(y / 2.6) * 1.2); if (g.get(xx, y) === "h") g.set(xx, y, "H"); }
          },
          lower(g) {
            g.rect(18, 49, 18, 54, "1"); // seams
            g.rect(29, 49, 29, 54, "1");
            for (const [a, b] of [[15, 21], [26, 32]]) g.rect(a, 55, b, 55, null); // heels
          },
          torso(g) {
            recolor(g, 14, 41, 33, 45, "p", ["u"]); // high-waisted jeans
            sym(g, 41, 9, "O");
            g.rect(19, 31, 28, 40, "c"); // a white top under a cropped denim jacket
            for (let y = 31; y <= 40; y++) { g.rect(15, y, 18, y, "u"); g.rect(29, y, 32, y, "u"); }
            g.rect(15, 40, 18, 40, "U");
            g.rect(29, 40, 32, 40, "U");
            g.points([[18, 31], [18, 32], [17, 33], [29, 31], [29, 32], [30, 33]], "U");
            g.points([[16, 35], [31, 35]], "y");
            g.points([[30, 33], [32, 33], [30, 34], [31, 34], [32, 34], [31, 35]], "a"); // a heart pin
            for (let y = 31; y <= 34; y++) g.rect(20 + (y - 31), y, 27 - (y - 31), y, "s"); // the top's V neck
          },
          arms(g) {
            for (const x0 of [ARM.F, mx(ARM.F + 4)]) g.rect(x0, 38, x0 + 4, 38, "U");
          },
          head(g) {
            shape(g, [[3, 7], [4, 10], [5, 11], [6, 12], [7, 12]], "h"); // old-Hollywood waves, parted aside
            for (let y = 8; y <= 13; y++) g.rect(12, y, 22 - (y - 8) * 2, y, "h");
            g.rect(22, 8, 35, 9, "h");
            g.rect(9, 8, 13, 26, "h");
            g.rect(34, 8, 38, 26, "h");
            g.points([[17, 4], [18, 3], [14, 9], [27, 5]], "j");
            g.rect(11, 21, 11, 24, "y"); // gold hoops
            g.rect(36, 21, 36, 24, "y");
          },
          front(g, hands) {
            const [hx, hy] = hands.R; // her debate cards
            g.rect(hx - 1, hy - 4, hx + 4, hy + 1, "c");
            g.rect(hx, hy - 3, hx + 3, hy - 3, "a");
            g.rect(hx, hy - 1, hx + 3, hy - 1, "C");
          },
        },
      });
    },
  },

  grillsay: {
    room: "cafeteria", name: "Chef Gordana Grillsay", nickname: "Zombie's Kitchen", ref: "Gordon Ramsay, as a lunch lady",
    lines: ["This mystery meat is RAW! It's still MOVING!", "Eat your vegetables, you donkey… sweetheart. Eat them, please.", "Finally, some good food!"],
    look: { skin: "#f3cbae", hair: "#efcb6a", eye: "#3d6fa0", lips: "#cc2f3e", main: "#f6f6f8", sleeve: "#eeeef1", shirt: "#ffffff", accent: "#d23c3c", pants: "#2a2a30", shoes: "#1a1a1e" },
    extra: { 1: ["#ffffff", "body", true], 2: ["#fbfbfd", "hat", true], 3: ["#d9dce3"], 5: ["#c7cbd2", "prop", true], 6: ["#c58aa6", "skin"], 7: ["#d23c3c", "hair"] },
    draw(g) {
      person(g, {
        sex: "F", armL: "crossed", armR: "crossed", eye: "normal", brow: "angry", mouthStyle: "flat", blush: true,
        layers: {
          back(g) {
            // a ponytail, swinging out from under the toque
            for (let y = 6; y <= 33; y++) {
              const cx = 8.5 - Math.sin((y - 6) / 9) * 2.2;
              const w = y < 10 ? 1.5 + (y - 6) * 0.4 : 3 - Math.max(0, y - 24) * 0.25;
              g.rect(Math.round(cx - w), y, Math.round(cx + w), y, "h");
            }
            for (let y = 12; y <= 30; y += 3) g.set(9 - Math.round(Math.sin((y - 6) / 9) * 2.2), y, "H");
            g.rect(9, 7, 12, 9, "7"); // its red tie
          },
          lower(g) {
            for (let y = 49; y <= 54; y++) for (let x = 15; x <= 32; x++) if (g.get(x, y) === "p" && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) g.set(x, y, "v"); // chef's checks
            for (let y = 42; y <= 51; y++) sym(g, y, y < 46 ? 9 : 10, "1"); // the apron
            sym(g, 51, 10, "3");
          },
          torso(g) {
            for (const x of [18, 29]) for (const y of [32, 35]) g.set(x, y, "K"); // double-breasted
            g.points([[20, 31], [21, 32], [22, 33], [23, 34]], "U");
            for (let y = 42; y <= 45; y++) sym(g, y, 9, "1");
            sym(g, 42, 10, "3");
            g.points([[14, 42], [33, 42]], "3"); // apron strings
          },
          collar(g) {
            sym(g, 28, 4, "a"); // the neckerchief
            sym(g, 29, 5, "a");
            g.rect(23, 30, 24, 31, "A");
          },
          head(g) {
            // blonde, swept up under the toque
            shape(g, [[6, 12], [7, 12]], "h");
            for (const [x0, x1, y1] of [[12, 16, 10], [17, 21, 9], [26, 30, 9], [31, 35, 10]]) g.rect(x0, 8, x1, y1, "h");
            g.rect(11, 7, 13, 15, "h");
            g.rect(34, 7, 36, 15, "h");
            g.points([[16, 7], [22, 6], [29, 7]], "j");
            g.rect(11, 15, 12, 20, "h");
            g.rect(35, 15, 36, 20, "h");
            g.rect(16, 14, 19, 14, "6"); // eyeshadow
            g.rect(28, 14, 31, 14, "6");
            g.rect(22, 23, 25, 23, "L"); // red lips, pressed into a pout
            g.rect(22, 24, 25, 24, "L");
            g.points([[21, 24], [26, 24]], "m");
            g.set(23, 24, "q");
            // the tall chef's toque
            for (let y = -12; y <= 1; y++) sym(g, y, y < -10 ? 9 + (y + 12) : y < -2 ? 12 : 11, "2");
            g.points([[12, -12], [35, -12], [13, -12], [34, -12]], null);
            for (const x of [16, 20, 24, 28, 32]) g.rect(x, -8, x, 0, "3");
            sym(g, 2, 12, "1");
            sym(g, 3, 12, "1");
            sym(g, 4, 11, "3");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // a ladle tucked under her arm, sticking out
            for (let i = 0; i <= 6; i++) g.rect(hx + 4 + i, hy - i, hx + 5 + i, hy - i, "5");
            disc(g, hx + 12.5, hy - 8, 2.8, 2.2, "5");
          },
        },
      });
    },
  },

  brockbride: {
    room: "infirmary", name: "Nurse Joy Brockbride", nickname: "The Clone", ref: "Nurse Joy (Pokémon)",
    lines: ["Welcome to the Nurse's Office! Shall I heal your students?", "♪ Ding-ding-di-ding! ♪ Your students are fully healed!", "My sisters? Oh, they're everywhere."],
    look: { skin: "#fce6da", hair: "#f37fb3", eye: "#4a90d8", lips: "#d0607a", main: "#f6a9c6", sleeve: "#f6a9c6", shirt: "#ffffff", accent: "#d23838", pants: "#f6a9c6", socks: "#ffffff", shoes: "#e86aa0" },
    extra: { 1: ["#ef5f92"], 2: ["#cfeaf3", "prop", true], 3: ["#ffd3e4", "prop", true], 5: ["#bfc7d2", "prop", true], 9: ["#f2dcb5"] },
    draw(g) {
      person(g, {
        sex: "F", legKind: "tights", armL: "hold", eye: "normal", brow: "neutral", mouthStyle: "smile",
        layers: {
          back(g) {
            disc(g, 5.5, 22, 5, 8.5, "h", 0.33); // her famous loops
            disc(g, 41.5, 22, 5, 8.5, "h", 0.33);
            g.rect(8, 10, 11, 15, "h");
            g.rect(36, 10, 39, 15, "h");
          },
          lower(g) {
            for (let y = 40; y <= 51; y++) sym(g, y, 9 + Math.floor((y - 40) / 3), "u"); // the dress
            for (let y = 40; y <= 49; y++) sym(g, y, 6, "c"); // the apron
            for (let x = 18; x <= 29; x += 2) g.set(x, 50, "c");
          },
          torso(g) {
            g.rect(19, 32, 28, 42, "c");
            g.rect(23, 34, 24, 39, "a"); // a red cross
            g.rect(21, 36, 26, 37, "a");
          },
          arms(g) {
            for (const x0 of [ARM.F, mx(ARM.F + 4)]) { // puffed sleeves
              g.rect(x0 - (x0 < C ? 1 : 0), 33, x0 + 4 + (x0 < C ? 0 : 1), 36, "l");
              recolor(g, x0, 37, x0 + 4, 42, "s", ["l"]);
            }
          },
          collar(g) {
            sym(g, 29, 4, "c");
            sym(g, 30, 6, "c");
          },
          head(g) {
            shape(g, [[3, 8], [4, 10], [5, 11], [6, 12], [7, 12]], "h");
            for (const [x0, x1, y1] of [[12, 15, 13], [16, 21, 15], [26, 31, 15], [32, 35, 13]]) g.rect(x0, 8, x1, y1, "h");
            g.rect(22, 8, 25, 10, "h");
            g.rect(11, 8, 13, 18, "h");
            g.rect(34, 8, 36, 18, "h");
            g.points([[19, 4], [20, 3], [27, 4]], "j");
            shape(g, [[-3, 6], [-2, 7], [-1, 8], [0, 8], [1, 8], [2, 7]], "c"); // the nurse's cap
            g.rect(23, -3, 24, 1, "a");
            g.rect(21, -1, 26, -1, "a");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // a tray with a potion
            g.rect(hx - 9, hy - 1, hx + 4, hy, "5");
            g.rect(hx - 6, hy - 9, hx - 2, hy - 2, "2");
            g.rect(hx - 5, hy - 10, hx - 3, hy - 10, "O");
            g.rect(hx - 6, hy - 5, hx - 2, hy - 2, "1");
            g.set(hx - 5, hy - 7, "W");
            // her helper: a round pink puff with a plaster
            const cx = 42;
            disc(g, cx, 53, 5.5, 5, "3");
            g.points([[cx - 3, 52], [cx + 2, 52], [cx - 3, 53], [cx + 2, 53]], "e");
            g.points([[cx - 1, 55], [cx, 55]], "m");
            g.points([[cx - 5, 55], [cx + 4, 55]], "k");
            g.rect(cx - 2, 49, cx + 1, 50, "9");
            g.points([[cx, 47], [cx + 1, 46]], "3");
          },
        },
      });
    },
  },

  whiteboard: {
    room: "research", name: "Mr. Walter Whiteboard", nickname: "The One Who Knows", ref: "Walter White",
    lines: ["Say my name. …No, the research. Say the research.", "I am not in danger. I am the danger.", "99.1% pure research. Science!"],
    look: { skin: "#ecc3a2", hair: "#3a2f28", eye: "#59616f", main: "#f1c42a", sleeve: "#f1c42a", pants: "#f1c42a", shoes: "#25252a", glasses: "#1b1a1f" },
    extra: { 1: ["#48d0f5"], 2: ["#d8f6ff", "prop", true], 3: ["#b7f2ff"], 4: ["#2a2a30", "prop", true] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", eye: "narrow", brow: "flat", mouthStyle: "flat",
        layers: {
          back(g) {
            g.rect(14, 24, 33, 33, "U"); // the hazmat hood, down
          },
          lower(g) {
            for (const [a, b] of [[15, 21], [26, 32]]) g.rect(a, 50, b, 54, "f"); // boots
          },
          torso(g) {
            g.rect(23, 31, 23, 48, "U");
            for (let y = 32; y <= 38; y++) sym(g, y, y < 34 ? 4 : y < 37 ? 5 : 3, "4"); // the respirator
            disc(g, 17.5, 35, 2.3, 2.3, "N");
            disc(g, 29.5, 35, 2.3, 2.3, "N");
          },
          arms(g) {
            for (let y = 40; y <= 46; y++) for (let x = 0; x <= 47; x++) if (["s", "S"].includes(g.get(x, y)) && Math.abs(x - C) > 9) g.set(x, y, "K"); // gloves
          },
          head(g) {
            g.rect(12, 10, 13, 18, "h"); // bald, dark at the sides
            g.rect(34, 10, 35, 18, "h");
            g.points([[20, 7], [21, 6], [26, 7]], "W");
            g.rect(19, 22, 28, 22, "h"); // the goatee
            g.points([[19, 23], [28, 23], [19, 24], [28, 24]], "h");
            sym(g, 25, 4, "h");
            sym(g, 26, 3, "h");
            sym(g, 27, 2, "h");
            g.rect(21, 24, 26, 24, "m");
            for (const x0 of [14, 26]) {
              g.rect(x0, 14, x0 + 7, 14, "g");
              g.rect(x0, 19, x0 + 7, 19, "g");
              g.rect(x0, 14, x0, 19, "g");
              g.rect(x0 + 7, 14, x0 + 7, 19, "g");
            }
            g.rect(22, 15, 25, 15, "g");
            g.points([[12, 15], [13, 15], [34, 15], [35, 15]], "g");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // a flask of something very blue
            const x0 = hx - 8;
            g.rect(x0 + 3, hy - 15, x0 + 6, hy - 10, "2");
            g.rect(x0 + 2, hy - 15, x0 + 7, hy - 15, "n");
            for (let y = hy - 9; y <= hy; y++) g.rect(x0 + 3 - Math.min(3, Math.floor((y - hy + 9) / 2)), y, x0 + 6 + Math.min(3, Math.floor((y - hy + 9) / 2)), y, "2");
            for (let y = hy - 5; y <= hy; y++) g.rect(x0 + 1, y, x0 + 8, y, "1");
            g.points([[x0 + 4, hy - 19], [x0 + 7, hy - 21], [x0 + 2, hy - 23], [x0 + 6, hy - 25], [x0 + 3, hy - 17]], "3");
            g.set(x0 + 2, hy - 3, "W");
          },
        },
      });
    },
  },

  gyber: {
    room: "crafting", name: "Mac Gyber", nickname: "The ToolKit", ref: "MacGyver",
    lines: ["Give me a paperclip, some gum and five minutes.", "I don't like guns. Hand me that duct tape.", "It's not a wall, it's a solution."],
    look: { skin: "#e9b98f", hair: "#6e4424", eye: "#4a2e1e", main: "#7a4628", sleeve: "#7a4628", shirt: "#d9dde3", pants: "#40618c", shoes: "#4a2e1c" },
    extra: { 1: ["#d23030", "prop", true], 2: ["#b9c0ca", "prop", true], 3: ["#e6eaef", "prop", true] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", eye: "normal", brow: "neutral", mouthStyle: "smirk",
        layers: {
          back(g) {
            for (let y = 20; y <= 33; y++) sym(g, y, y < 30 ? 12 : 12 - (y - 29) * 2, "h"); // the mullet, long at the back
          },
          lower(g) {
            sym(g, 45, 10, "K"); // belt
            g.rect(22, 45, 25, 46, "y");
            disc(g, 30, 47.5, 2.6, 2.6, "2", 0.25); // duct tape
          },
          torso(g) {
            g.rect(19, 31, 28, 44, "c"); // a tee under the open leather jacket
            g.points([[18, 31], [17, 32], [17, 33], [18, 34], [29, 31], [30, 32], [30, 33], [29, 34]], "U");
            g.rect(18, 35, 18, 44, "U");
            g.rect(29, 35, 29, 44, "U");
            g.rect(14, 39, 17, 39, "U");
            g.rect(30, 39, 33, 39, "U");
          },
          head(g) {
            shape(g, [[2, 6], [3, 9], [4, 11], [5, 12], [6, 13], [7, 13]], "h"); // feathered, swept back
            for (const [x0, x1, y1] of [[12, 17, 11], [18, 23, 9], [28, 35, 10]]) g.rect(x0, 8, x1, y1, "h");
            g.rect(10, 8, 13, 17, "h");
            g.rect(34, 8, 37, 17, "h");
            g.points([[17, 3], [18, 2], [21, 2], [27, 3]], "j");
            g.points([[37, 13], [38, 13], [38, 14], [38, 15], [37, 15]], "n"); // a paperclip
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // the Swiss Army knife, blade out
            g.rect(hx - 1, hy + 1, hx + 4, hy + 2, "1");
            g.set(hx + 1, hy + 1, "W");
            g.rect(hx, hy - 6, hx, hy, "3");
            g.rect(hx + 1, hy - 4, hx + 1, hy, "3");
          },
        },
      });
    },
  },

  bulldog: {
    room: "radio", name: "Dale Bulldog", nickname: "Mr. Townwide", ref: "Pitbull, Mr. Worldwide",
    lines: ["DALE! Mr. Townwide on the air, reaching every corner of the block!", "New survivor joined the party! DALE!", "From the school to the city — and someday? The WORLD."],
    look: { skin: "#d6a273", hair: "#2a2220", eye: "#3a2618", main: "#eeeef0", sleeve: "#eeeef0", shirt: "#1f1f24", accent: "#c8283c", pants: "#eeeef0", shoes: "#6a4125", glasses: "#121216" },
    extra: { 1: ["#a47a58", "skin"], 2: ["#f2c94c", "prop", true], 3: ["#ffffff"] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", armR: "up", eye: "narrow", brow: "neutral", thickBrows: true, mouthStyle: "grin",
        layers: {
          lower(g) {
            g.rect(18, 49, 18, 54, "P"); // creases
            g.rect(29, 49, 29, 54, "P");
          },
          torso(g) {
            for (let y = 31; y <= 38; y++) sym(g, y, Math.max(1, 5 - Math.floor((y - 31) / 2)), "c"); // black shirt, open
            g.points([[19, 31], [20, 33], [21, 35], [22, 36], [25, 36], [26, 35], [27, 33], [28, 31]], "2"); // gold chain
            g.points([[18, 31], [18, 32], [17, 33], [17, 34], [18, 35], [29, 31], [29, 32], [30, 33], [30, 34], [29, 35]], "U");
            g.rect(29, 36, 32, 37, "a"); // pocket square
            g.points([[23, 40], [23, 43]], "U");
          },
          head(g) {
            recolor(g, 12, 6, 35, 11, "1", ["s"]); // shaved
            for (let y = 19; y <= 27; y++) for (let x = 12; x <= 35; x++) if (g.get(x, y) === "s" && (y >= 24 || Math.abs(x - 23.5) > 8)) g.set(x, y, "h"); // the beard
            g.rect(19, 22, 28, 22, "h");
            for (const x0 of [14, 26]) { // shades
              g.rect(x0, 14, x0 + 7, 17, "g");
              g.rect(x0 + 1, 18, x0 + 6, 18, "g");
            }
            g.rect(22, 14, 25, 15, "g");
            g.points([[15, 15], [16, 14], [27, 15], [28, 14]], "3");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // the gold mic
            g.rect(hx + 2, hy - 4, hx + 3, hy, "K");
            disc(g, hx + 2.5, hy - 6.5, 2.4, 2.4, "2");
            g.points([[hx + 2, hy - 7], [hx + 3, hy - 6]], "N");
          },
        },
      });
    },
  },

  plowson: {
    room: "farm", name: "Jeremy Plowson", nickname: "Jezza", ref: "Jeremy Clarkson on Clarkson's Farm",
    lines: ["How hard can it be?", "POWERRR! …of the potato.", "The weather's ruined everything. Again."],
    look: { skin: "#ecc29f", hair: "#8c8378", eye: "#59616f", main: "#55623a", sleeve: "#55623a", pants: "#3c5a86", shoes: "#2e5a34", hat: "#7a5a3a" },
    extra: { 3: ["#9aa2ac", "prop", true], 4: ["#8fb0dc", "body"], 5: ["#6b4a2a", "body"] },
    draw(g) {
      person(g, {
        sex: "M", armL: "hold", armR: "hip", eye: "narrow", brow: "raised", mouthStyle: "grin",
        layers: {
          back(g) {
            // the pitchfork, standing beside him
            g.rect(10, -4, 11, 57, "o");
            g.rect(11, -4, 11, 57, "O");
            g.rect(7, -6, 14, -5, "3");
            for (const x of [7, 10, 13]) g.rect(x, -13, x + 1, -6, "3");
          },
          lower(g) {
            for (const [x0, x1] of [[15, 21], [26, 32]]) { // wellies
              g.rect(x0, 49, x1, 54, "f");
              g.rect(x0, 49, x1, 49, "F");
            }
          },
          torso(g) {
            // a blue check shirt under an olive waxed jacket with a cord collar
            g.rect(19, 31, 28, 45, "c");
            for (let y = 31; y <= 45; y++) for (let x = 19; x <= 28; x++) if ((Math.floor(x / 2) + Math.floor(y / 2)) % 2) g.set(x, y, "4");
            g.rect(22, 31, 25, 32, "s");
            g.points([[18, 31], [17, 32], [17, 33], [18, 34], [29, 31], [30, 32], [30, 33], [29, 34]], "5");
            g.rect(18, 35, 18, 45, "U");
            g.rect(29, 35, 29, 45, "U");
            g.rect(14, 41, 17, 43, "U"); // pockets
            g.rect(30, 41, 33, 43, "U");
          },
          head(g) {
            // a messy curly mop, his forehead showing
            shape(g, [[1, 6], [2, 9], [3, 11], [4, 12], [5, 13], [6, 13], [7, 13]], "h");
            for (const [x, y] of [[13, 0], [17, -1], [21, 0], [26, -1], [30, 0], [34, 1], [10, 3], [37, 3]]) g.rect(x, y, x + 1, y + 1, "h");
            for (const [x0, x1, y1] of [[11, 14, 12], [15, 18, 9], [24, 28, 10], [29, 33, 9], [34, 36, 12]]) g.rect(x0, 8, x1, y1, "h");
            g.rect(9, 8, 12, 19, "h");
            g.rect(35, 8, 38, 19, "h");
            g.points([[9, 19], [38, 19], [9, 14], [38, 13]], null);
            for (const [x, y] of [[12, 3], [16, 2], [20, 3], [25, 2], [29, 3], [33, 4], [14, 6], [23, 5], [31, 6], [10, 11], [36, 10], [11, 16], [36, 16]]) g.points([[x, y], [x + 1, y + 1]], "H");
            for (const [x, y] of [[15, 1], [19, 2], [24, 1], [28, 2], [13, 5], [21, 4]]) g.set(x, y, "j");
            shape(g, [[1, 9], [2, 12], [3, 13], [4, 13], [5, 14], [6, 14], [7, 14]], "r"); // a tweed flat cap
            sym(g, 8, 15, "R");
            sym(g, 9, 13, "R");
            for (let x = 12; x <= 35; x += 3) g.set(x, 4, "R");
          },
        },
      });
    },
  },

  cowper: {
    room: "barn", name: "Kaleb Cowper", nickname: "Told You So", ref: "Kaleb Cooper on Clarkson's Farm",
    lines: ["Jezza's done it wrong again.", "Told you so.", "That's not how you hold a chicken."],
    look: { skin: "#f0c9a6", hair: "#6a4a2c", eye: "#3d6f8f", main: "#2d3a54", sleeve: "#2d3a54", pants: "#3a4560", shoes: "#2e6a38", hat: "#2a2d34", accent: "#4caf7d" },
    extra: { 1: ["#d6f03c", "body", true], 2: ["#c8ccd2", "body"], 3: ["#9aa2ac", "prop", true], 4: ["#d9b25a"] },
    draw(g) {
      person(g, {
        sex: "M", eye: "narrow", brow: "flat", mouthStyle: "flat",
        layers: {
          lower(g) {
            for (const [a, b] of [[15, 21], [26, 32]]) { // wellies
              g.rect(a, 49, b, 54, "f");
              g.rect(a, 49, b, 49, "F");
            }
          },
          torso(g) {
            for (let y = 31; y <= 45; y++) { g.rect(14, y, 21, y, "1"); g.rect(26, y, 33, y, "1"); } // the hi-vis vest over the hoodie
            for (const y of [39, 40, 43]) { g.rect(14, y, 21, y, "2"); g.rect(26, y, 33, y, "2"); }
            g.rect(22, 31, 22, 36, "c"); // hood strings
            g.rect(25, 31, 25, 36, "c");
          },
          head(g) {
            g.rect(12, 9, 13, 16, "h");
            g.rect(34, 9, 35, 16, "h");
            shape(g, [[1, 8], [2, 10], [3, 11], [4, 12], [5, 12], [6, 12], [7, 12], [8, 12]], "r"); // the cap
            sym(g, 9, 14, "R");
            sym(g, 10, 12, "R");
            g.rect(22, 4, 25, 5, "a");
          },
          front(g, hands) {
            const [hx, hy] = hands.L; // a bucket of feed
            g.points([[hx - 4, hy + 6], [hx - 3, hy + 4], [hx - 1, hy + 3], [hx + 4, hy + 3], [hx + 6, hy + 4], [hx + 7, hy + 6]], "N");
            for (let y = hy + 7; y <= hy + 16; y++) g.rect(hx - 5 + Math.floor((y - hy - 7) / 4), y, hx + 8 - Math.floor((y - hy - 7) / 4), y, "3");
            g.rect(hx - 4, hy + 7, hx + 7, hy + 8, "4");
          },
        },
      });
    },
  },

  scrapperson: {
    room: "scrapyard", name: "Rick Scrapperson", nickname: "Best I Can Do", ref: "Rick Harrison of Pawn Stars",
    lines: ["I'll give you 2 scrap for it. Best I can do.", "Hmm. It's a nice piece… but it's not worth what you think.", "Let me call a buddy of mine who's an expert."],
    look: { skin: "#e7b991", hair: "#6a5a4e", eye: "#3a5f7a", main: "#1f2126", sleeve: "#1f2126", pants: "#2f3a4a", shoes: "#141416", glasses: "#121216" },
    extra: { 1: ["#f4f1e6", "prop", true], 2: ["#2e8a3e"] },
    draw(g) {
      person(g, {
        sex: "M", armR: "up", eye: "narrow", brow: ["raised", "angry"], mouthStyle: "smirk",
        layers: {
          lower(g) {
            sym(g, 45, 10, "K");
            g.rect(22, 45, 25, 46, "n");
          },
          torso(g) {
            for (let y = 33; y <= 44; y += 3) g.set(23, y, "n"); // buttons
            g.points([[20, 31], [19, 32], [19, 33], [27, 31], [28, 32], [28, 33]], "N");
            g.rect(27, 34, 31, 37, "U");
          },
          head(g) {
            g.rect(12, 11, 13, 17, "H");
            g.rect(34, 11, 35, 17, "H");
            for (let y = 24; y <= 27; y++) for (let x = 15; x <= 32; x++) if (g.get(x, y) === "s") g.set(x, y, "h"); // a short beard round the chin
            g.rect(19, 22, 28, 22, "h");
            g.points([[18, 23], [29, 23]], "h");
            for (const x0 of [15, 26]) g.rect(x0, 6, x0 + 6, 8, "g"); // sunglasses, pushed up
            g.rect(22, 6, 25, 6, "g");
            g.points([[13, 7], [14, 7], [33, 7], [34, 7]], "g");
            g.points([[16, 6], [27, 6]], "W");
          },
          front(g, hands) {
            const [hx, hy] = hands.R; // a price tag, held up
            g.points([[hx + 2, hy - 1], [hx + 3, hy - 2]], "K");
            g.rect(hx + 4, hy - 9, hx + 13, hy + 3, "1");
            g.points([[hx + 4, hy - 9], [hx + 13, hy - 9]], null);
            g.set(hx + 5, hy - 8, "N");
            const $ = [[2, -1], [2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 5], [1, 6], [2, 6], [3, 6], [2, 7]];
            g.points($.map(([x, y]) => [hx + 7 + x, hy - 6 + y]), "2");
          },
        },
      });
    },
  },
};

// ---------- rendering ----------

function palette(L) {
  const eye = L.eye || "#5a3a22";
  const lips = L.lips || mix(L.skin, "#b04050", 0.45);
  const shirt = L.shirt || "#eceff3";
  const accent = L.accent || "#d64545";
  const pants = L.pants || "#2b2f3a";
  const shoes = L.shoes || "#1a1a1e";
  const hat = L.hat || "#262626";
  return {
    s: L.skin, S: shadowOf(L.skin), k: mix(L.skin, "#ee5f7e", 0.45),
    e: "#1d1418", w: "#f2f2f5", i: eye, I: mix(eye, "#0c0810", 0.65), W: "#ffffff",
    b: mix(L.hair, "#140c10", 0.4), m: mix(L.skin, "#4a1820", 0.6), L: lips, q: lightOf(lips),
    h: L.hair, H: shadowOf(L.hair), j: lightOf(lightOf(L.hair)),
    u: L.main, U: shadowOf(L.main), l: L.sleeve || L.main,
    c: shirt, C: shadowOf(shirt), a: accent, A: shadowOf(accent), v: "#f4f4f4", y: "#e8c14a",
    p: pants, P: shadowOf(pants), x: L.socks || "#ececec", f: shoes, F: mix(shoes, "#000000", 0.45),
    g: L.glasses || "#1d1418", r: hat, R: shadowOf(hat),
    z: "#c02a2a", o: "#b8865a", O: "#7a5230", n: "#b9c2ce", N: "#6a7282", K: "#202228",
  };
}
const GROUPS = {
  s: "skin", S: "skin", k: "skin", e: "skin", w: "skin", i: "skin", I: "skin", W: "skin", b: "skin", m: "skin", L: "skin", q: "skin", g: "skin",
  h: "hair", H: "hair", j: "hair",
  u: "body", U: "body", c: "body", C: "body", a: "body", A: "body", v: "body", y: "body", z: "body",
  l: "sleeve",
  p: "legs", P: "legs", x: "legs",
  f: "shoes", F: "shoes",
  r: "hat", R: "hat",
  o: "prop", O: "prop", n: "prop", N: "prop", K: "prop",
};
const RIM = ["s", "h", "u", "l", "c", "a", "p", "x", "f", "r"];

// The students' shading (sprite.js) on a bigger grid: light from the top-left — a lit edge, a
// shadow on the right and underneath, a softer one a pixel in — and an outline round everything.
function render(g, base, groups, rim) {
  const grp = (x, y) => groups[g.at(x, y)] || null;
  const color = Array.from({ length: g.h }, () => Array(g.w).fill(null));
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const k = g.at(x, y);
      if (!k) continue;
      let col = base[k];
      if (rim.has(k)) {
        const G = groups[k];
        if (grp(x + 1, y) !== G || grp(x, y + 1) !== G) col = shadowOf(col);
        else if (grp(x - 1, y) !== G || grp(x, y - 1) !== G) col = lightOf(col);
        else if (grp(x + 2, y) !== G) col = mix(col, shadowOf(col), 0.5);
      }
      color[y][x] = col;
    }
  }
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      if (g.at(x, y)) continue;
      const touching = [[0, -1], [0, 1], [-1, 0], [1, 0]].map(([dx, dy]) => g.at(x + dx, y + dy) && color[y + dy][x + dx]).find(Boolean);
      if (touching) color[y][x] = outlineOf(touching);
    }
  }
  let rects = "";
  for (let y = 0; y < g.h; y++) {
    let x = 0;
    while (x < g.w) {
      const col = color[y][x];
      if (!col) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < g.w && color[y][x + run] === col) run++;
      rects += `<rect x="${x}" y="${y}" width="${run}" height="1" fill="${col}"/>`;
      x += run;
    }
  }
  return rects;
}

const cache = new Map();
// An NPC's portrait as an <svg>, `scale` screen pixels to an art pixel.
export function npcSprite(id, scale = 2) {
  const npc = NPCS[id];
  let uri = cache.get(id);
  if (!uri) {
    const g = new Grid(NW, NH, OX, OY);
    npc.draw(g);
    const base = palette(npc.look);
    const groups = { ...GROUPS };
    const rim = new Set(RIM);
    for (const [k, [col, group = "prop", shaded = false]] of Object.entries(npc.extra || {})) {
      base[k] = col;
      groups[k] = group;
      if (shaded) rim.add(k);
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${NW} ${NH}" width="${NW}" height="${NH}" shape-rendering="crispEdges">${render(g, base, groups, rim)}</svg>`;
    uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    cache.set(id, uri);
  }
  return `<svg viewBox="0 0 ${NW} ${NH}" width="${NW * scale}" height="${NH * scale}" xmlns="http://www.w3.org/2000/svg"><image href="${uri}" width="${NW}" height="${NH}" style="image-rendering:pixelated"/></svg>`;
}
export const NPC_SIZE = { w: NW, h: NH };
