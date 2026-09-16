// Procedural 32x40 pixel-art portrait generator, chibi-proportioned (big head, small body) in
// the spirit of SD/tactical-RPG battle sprites. Deterministic per character id/seed, built by
// stamping rectangles onto a grid rather than hand-typed ASCII rows — far easier to keep
// correct at this size than a full row-by-row template. Includes simple cel-shading (a
// highlight/shadow band per region) and a few hairstyle/outfit silhouette variants for variety.

const W = 32;
const H = 40;

const SKIN_TONES = ["#f2c9a0", "#e0ac69", "#c68642", "#8d5524", "#ffe0bd"];
const HAIR_COLORS = ["#2b2b2b", "#4a2e1e", "#7a4a25", "#c9a227", "#6b6b6b", "#8a2f1f", "#3a2a1a", "#3fa7d6", "#a03d5c"];
const STUDENT_UNIFORMS = ["#2c3e6b", "#34495e", "#375a7f", "#2f4858"];
const TEACHER_UNIFORMS = ["#5c3d2e", "#4b3621", "#6b2737", "#3d4a2b"];
const ACCENTS = ["#d64545", "#e0a536", "#4caf7d", "#d9d9d9", "#8e44ad", "#3fa7d6"];
const BLUSH = "#e8809a";

function hashStr(str, salt) {
  let h = 0;
  const s = str + "::" + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pick(arr, seed) {
  return arr[seed % arr.length];
}
function shade(hex, amt) {
  const num = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((num >> 16) + amt);
  const g = clamp(((num >> 8) & 0xff) + amt);
  const b = clamp((num & 0xff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function makeGrid() {
  return Array.from({ length: H }, () => Array(W).fill(null));
}
function fillRect(grid, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = ch;
    }
  }
}
function clearRect(grid, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (y >= 0 && y < H && x >= 0 && x < W) grid[y][x] = null;
    }
  }
}
// Chops a small square off each corner of a rect so it reads as "rounded" at this pixel scale.
function fillRoundedRect(grid, x0, y0, x1, y1, ch, corner = 2) {
  fillRect(grid, x0, y0, x1, y1, ch);
  clearRect(grid, x0, y0, x0 + corner - 1, y0 + corner - 1);
  clearRect(grid, x1 - corner + 1, y0, x1, y0 + corner - 1);
  clearRect(grid, x0, y1 - corner + 1, x0 + corner - 1, y1);
  clearRect(grid, x1 - corner + 1, y1 - corner + 1, x1, y1);
}

const HEAD = { x0: 8, y0: 3, x1: 23, y1: 17 };

function buildHair(grid, style, bounds) {
  // Base cap over the top of the head, following its rounded silhouette.
  fillRoundedRect(grid, HEAD.x0, HEAD.y0, HEAD.x1, HEAD.y0 + 4, "h", 2);
  bounds.hair = { y0: HEAD.y0, y1: HEAD.y0 + 4 };
  const extend = (y1) => {
    bounds.hair.y1 = Math.max(bounds.hair.y1, y1);
  };

  if (style === "short_neat") {
    fillRect(grid, HEAD.x0, HEAD.y0 + 4, HEAD.x0 + 1, 12, "h");
    fillRect(grid, HEAD.x1 - 1, HEAD.y0 + 4, HEAD.x1, 12, "h");
    extend(12);
  } else if (style === "short_spiky") {
    fillRect(grid, HEAD.x0, HEAD.y0 + 4, HEAD.x0 + 1, 12, "h");
    fillRect(grid, HEAD.x1 - 1, HEAD.y0 + 4, HEAD.x1, 12, "h");
    fillRect(grid, 10, 1, 11, 2, "h");
    fillRect(grid, 14, 0, 15, 2, "h");
    fillRect(grid, 19, 1, 20, 2, "h");
    bounds.hair.y0 = 0;
    extend(12);
  } else if (style === "long_straight") {
    fillRect(grid, 7, HEAD.y0 + 4, 9, 26, "h");
    fillRect(grid, HEAD.x1 - 2, HEAD.y0 + 4, HEAD.x1 + 1, 26, "h");
    extend(26);
  } else if (style === "long_twintails") {
    fillRect(grid, HEAD.x0, HEAD.y0 + 4, HEAD.x0 + 1, 10, "h");
    fillRect(grid, HEAD.x1 - 1, HEAD.y0 + 4, HEAD.x1, 10, "h");
    // Bunches hang from ear height, clear of the arms (x 6-8 / 23-25) on either side.
    fillRect(grid, 2, 9, 5, 20, "h");
    fillRect(grid, HEAD.x1 + 3, 9, HEAD.x1 + 6, 20, "h");
    extend(20);
  }
}

function buildOutfit(grid, style, bounds) {
  const isRobe = style === "robe";
  const torsoY1 = isRobe ? 32 : 29;
  fillRect(grid, 9, 20, 22, torsoY1, "u");
  if (isRobe) fillRect(grid, 8, 29, 23, 32, "u"); // flares out at the hem
  bounds.outfit = { y0: 20, y1: torsoY1 };

  // arms (sleeves, then bare hands peeking out at the wrist)
  fillRect(grid, 6, 21, 8, 27, "u");
  fillRect(grid, 23, 21, 25, 27, "u");
  fillRect(grid, 6, 28, 8, 29, "s");
  fillRect(grid, 23, 28, 25, 29, "s");

  if (style === "blazer") {
    fillRect(grid, 14, 20, 17, 21, "c"); // open collar / shirt peek
    fillRect(grid, 15, 22, 16, torsoY1 - 1, "a"); // button/tie strip
  }
}

export function characterSprite(c, sizePx = 112) {
  const seed = c.spriteSeed || c.id;
  const isTeacher = c.role === "teacher";
  const dead = !c.alive;

  const skin = pick(SKIN_TONES, hashStr(seed, "skin"));
  const hair = pick(HAIR_COLORS, hashStr(seed, "hair"));
  const uniformPalette = isTeacher ? TEACHER_UNIFORMS : STUDENT_UNIFORMS;
  const uniform = pick(uniformPalette, hashStr(seed, "uniform"));
  const accent = pick(ACCENTS, hashStr(seed, "accent"));

  const hairStyles = c.gender === "F" ? ["long_straight", "long_twintails"] : ["short_neat", "short_spiky"];
  const hairStyle = pick(hairStyles, hashStr(seed, "hairstyle"));
  const outfitStyles = isTeacher ? ["blazer", "robe"] : ["blazer", "sweater"];
  const outfitStyle = pick(outfitStyles, hashStr(seed, "outfitstyle"));

  const grid = makeGrid();
  const bounds = {};

  // Back-to-front: hair-back is implicit in buildHair (drawn before the head so the head/face
  // paints over the center), then body, then head/face, then hair front details, then accents.
  buildHair(grid, hairStyle, bounds);
  buildOutfit(grid, outfitStyle, bounds);
  fillRoundedRect(grid, HEAD.x0, HEAD.y0, HEAD.x1, HEAD.y1, "s", 2);
  fillRect(grid, 14, 18, 17, 19, "s"); // neck
  fillRect(grid, 12, 10, 13, 11, "e");
  fillRect(grid, 18, 10, 19, 11, "e");
  fillRect(grid, 10, 12, 11, 12, "k");
  fillRect(grid, 20, 12, 21, 12, "k");
  // Re-stamp the hair cap + style over the head now that the face exists underneath it, so the
  // fringe reads on top of the forehead instead of being covered by skin.
  buildHair(grid, hairStyle, bounds);
  fillRect(grid, 11, 30, 13, 35, "p");
  fillRect(grid, 18, 30, 20, 35, "p");
  fillRect(grid, 10, 36, 14, 37, "o");
  fillRect(grid, 17, 36, 21, 37, "o");

  const baseColors = {
    h: dead ? "#5a5a5a" : hair,
    s: dead ? "#8a8a8a" : skin,
    e: dead ? "#1a1a1a" : "#1c1c1c",
    u: dead ? "#3a3a3a" : uniform,
    a: dead ? "#4a4a4a" : accent,
    c: dead ? "#6b6b6b" : "#e9e2d8",
    p: dead ? "#2f2f2f" : "#22242c",
    o: dead ? "#1a1a1a" : "#141414",
    k: dead ? "#5a5a5a" : BLUSH,
  };

  function colorFor(ch, y) {
    const base = baseColors[ch];
    if (dead) return base; // keep the grayscale swap flat; CSS also desaturates the whole image
    if (ch === "h" && bounds.hair) {
      const { y0, y1 } = bounds.hair;
      const rel = y1 > y0 ? (y - y0) / (y1 - y0) : 0;
      return rel < 0.3 ? shade(base, 35) : rel > 0.75 ? shade(base, -30) : base;
    }
    if (ch === "u" && bounds.outfit) {
      const { y0, y1 } = bounds.outfit;
      const rel = y1 > y0 ? (y - y0) / (y1 - y0) : 0;
      return rel < 0.25 ? shade(base, 30) : rel > 0.8 ? shade(base, -25) : base;
    }
    if (ch === "s" && y <= HEAD.y1) {
      const rel = (y - HEAD.y0) / (HEAD.y1 - HEAD.y0);
      return rel < 0.25 ? shade(base, 15) : rel > 0.85 ? shade(base, -12) : base;
    }
    return base;
  }

  let rects = "";
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x];
      if (!ch) continue;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colorFor(ch, y)}"/>`;
    }
  }

  const h = Math.round(sizePx * (H / W));
  return `<svg viewBox="0 0 ${W} ${H}" width="${sizePx}" height="${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}
