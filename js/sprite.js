// Procedural 16x18 pixel-art portrait generator. Deterministic per character id, so the
// same unit always looks the same across renders/reloads without needing art assets.

const SKIN_TONES = ["#f2c9a0", "#e0ac69", "#c68642", "#8d5524", "#ffe0bd"];
const HAIR_COLORS = ["#2b2b2b", "#4a2e1e", "#7a4a25", "#c9a227", "#6b6b6b", "#8a2f1f", "#3a2a1a"];
const STUDENT_UNIFORMS = ["#2c3e6b", "#34495e", "#375a7f", "#2f4858"];
const TEACHER_UNIFORMS = ["#5c3d2e", "#4b3621", "#6b2737", "#3d4a2b"];
const ACCENTS = ["#d64545", "#e0a536", "#4caf7d", "#d9d9d9", "#8e44ad", "#3fa7d6"];

function hashStr(str, salt) {
  let h = 0;
  const s = str + "::" + salt;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function buildRows(gender) {
  const rows = [
    ".".repeat(5) + "h".repeat(6) + ".".repeat(5), // 0 hair top
    ".".repeat(4) + "h".repeat(8) + ".".repeat(4), // 1 hair
    ".".repeat(3) + "h".repeat(10) + ".".repeat(3), // 2 hair
    ".".repeat(3) + "h".repeat(2) + "s".repeat(6) + "h".repeat(2) + ".".repeat(3), // 3 hairline
    ".".repeat(2) + "h".repeat(1) + "s".repeat(10) + "h".repeat(1) + ".".repeat(2), // 4 forehead
    ".".repeat(3) + "s".repeat(2) + "e".repeat(1) + "s".repeat(4) + "e".repeat(1) + "s".repeat(2) + ".".repeat(3), // 5 eyes
    ".".repeat(3) + "s".repeat(10) + ".".repeat(3), // 6 face
    ".".repeat(4) + "s".repeat(8) + ".".repeat(4), // 7 chin
    ".".repeat(6) + "s".repeat(4) + ".".repeat(6), // 8 neck
    ".".repeat(3) + "u".repeat(10) + ".".repeat(3), // 9 collar
    ".".repeat(1) + "u".repeat(14) + ".".repeat(1), // 10 shoulders
    ".".repeat(1) + "u".repeat(6) + "a".repeat(2) + "u".repeat(6) + ".".repeat(1), // 11 chest/tie
    ".".repeat(1) + "u".repeat(14) + ".".repeat(1), // 12 chest
    ".".repeat(2) + "u".repeat(4) + ".".repeat(4) + "u".repeat(4) + ".".repeat(2), // 13 waist
    ".".repeat(3) + "u".repeat(10) + ".".repeat(3), // 14 hips
    ".".repeat(4) + "p".repeat(3) + ".".repeat(2) + "p".repeat(3) + ".".repeat(4), // 15 legs
    ".".repeat(4) + "p".repeat(3) + ".".repeat(2) + "p".repeat(3) + ".".repeat(4), // 16 legs
    ".".repeat(3) + "o".repeat(4) + ".".repeat(2) + "o".repeat(4) + ".".repeat(3), // 17 shoes
  ];

  if (gender === "F") {
    // longer hair draping past the shoulders
    for (const r of [6, 7, 8]) {
      const row = rows[r].split("");
      row[0] = "h";
      row[1] = "h";
      row[14] = "h";
      row[15] = "h";
      rows[r] = row.join("");
    }
  }

  return rows;
}

export function characterSprite(c, sizePx = 112) {
  const seed = c.spriteSeed || c.id;
  const skin = pick(SKIN_TONES, hashStr(seed, "skin"));
  const hair = pick(HAIR_COLORS, hashStr(seed, "hair"));
  const uniformPalette = c.role === "teacher" ? TEACHER_UNIFORMS : STUDENT_UNIFORMS;
  const uniform = pick(uniformPalette, hashStr(seed, "uniform"));
  const accent = pick(ACCENTS, hashStr(seed, "accent"));

  const dead = !c.alive;
  const colorMap = {
    h: dead ? "#5a5a5a" : hair,
    s: dead ? "#8a8a8a" : skin,
    e: dead ? "#222222" : "#1c1c1c",
    u: dead ? "#3a3a3a" : uniform,
    a: dead ? "#4a4a4a" : accent,
    p: dead ? "#2f2f2f" : "#22242c",
    o: dead ? "#1a1a1a" : "#141414",
  };

  const rows = buildRows(c.gender);
  let rects = "";
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ".") continue;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colorMap[ch]}"/>`;
    }
  });

  const h = Math.round(sizePx * (18 / 16));
  return `<svg viewBox="0 0 16 18" width="${sizePx}" height="${h}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}
