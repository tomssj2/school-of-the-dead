// Pixel-art frames for the page windows and room cards, themed per part of the school and drawn in
// code like the rest of the art. Each is a 36x36 nine-slice — 6-pixel corners and edges, the edges'
// middles 24 long so their rivets, nails and seams repeat every 24 pixels — turned into an SVG and
// set as a CSS variable (--frame-lobby ...), which style.css uses as a border-image so it stays
// crisp at any size.

const N = 36; // the frame image, square
const E = 6; // its corners and edges

// A frame's colours, outside in: the dark outline, the lit top/left and shaded bottom/right bevel, the
// face, and the dark line where it meets the panel.
const THEMES = {
  // painted locker steel, riveted
  lobby: { outline: "#151a22", light: "#8d9bb0", face: "#5d6c82", shade: "#3c475a", inner: "#0f1319", rivets: 24 },
  // a wooden frame round the chalkboard
  classrooms: { outline: "#24160c", light: "#b5804a", face: "#8a5f33", shade: "#5c3d22", inner: "#130d08", grain: "#74502b" },
  // dark office wood with brass corner caps
  facilities: { outline: "#160a06", light: "#86513a", face: "#5e3527", shade: "#3d2119", inner: "#100806", grain: "#4f2c20", brass: true },
  // weathered fence planks, nailed
  courtyard: { outline: "#241a0e", light: "#c9a676", face: "#9a7a50", shade: "#6a5233", inner: "#120e08", seams: 8, nails: true },
  // gunmetal plate, closely riveted
  night: { outline: "#090b10", light: "#677084", face: "#3f4655", shade: "#272c37", inner: "#07090d", rivets: 12 },
  // olive canvas, stitched
  city: { outline: "#17180e", light: "#82865a", face: "#5e6140", shade: "#3e4029", inner: "#0d0e08", stitch: "#d8d2a4" },
  // plain school metal: the summaries, the Roster, the Armory, Research, the pop-ups
  school: { outline: "#13161d", light: "#6a7386", face: "#454c5c", shade: "#2d323e", inner: "#0d1015", rivets: 24 },
  // polished gold, for a legendary survivor's card
  gold: { outline: "#3a2a08", light: "#ffe18a", face: "#d4a632", shade: "#8a6a1a", inner: "#1a1306", rivets: 12 },
};

// cheap deterministic noise, for wood grain
const noise = (x, y) => {
  let h = Math.imul(x + 31, 2654435761) ^ Math.imul(y + 17, 40503);
  h ^= h >>> 13;
  return ((Math.imul(h, 2246822519) >>> 0) % 1000) / 1000;
};

function paint(t) {
  const g = Array.from({ length: N }, () => Array(N).fill(null));
  const set = (x, y, c) => {
    if (x >= 0 && y >= 0 && x < N && y < N && c) g[y][x] = c;
  };
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.min(x, y, N - 1 - x, N - 1 - y);
      if (d >= E) continue;
      // which side this pixel belongs to (the corners split along their diagonal)
      const side = d === y ? "top" : d === x ? "left" : d === N - 1 - y ? "bottom" : "right";
      const lit = side === "top" || side === "left";
      let c = [t.outline, lit ? t.light : t.shade, t.face, t.face, lit ? t.face : t.shade, t.inner][d];
      if (t.grain && (d === 2 || d === 3) && noise(side === "top" || side === "bottom" ? x >> 1 : y >> 1, d) < 0.28) c = t.grain;
      set(x, y, c);
    }
  }
  // round the outer corners off by a pixel
  for (const [x, y] of [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]) g[y][x] = null;

  const rivet = (x, y) => {
    set(x, y, t.light);
    set(x + 1, y, t.face);
    set(x, y + 1, t.face);
    set(x + 1, y + 1, t.outline);
  };
  if (t.rivets) {
    for (let p = E + (24 % t.rivets) / 2 + t.rivets / 2 - 1; p < N - E; p += t.rivets) {
      rivet(p, 2);
      rivet(p, N - 4);
      rivet(2, p);
      rivet(N - 4, p);
    }
    for (const [x, y] of [[2, 2], [N - 4, 2], [2, N - 4], [N - 4, N - 4]]) rivet(x, y);
  }
  if (t.seams) {
    // plank ends across the top and bottom, a nail beside each; up the sides every 8 too
    for (let p = E + t.seams - 1; p < N - E; p += t.seams) {
      for (let d = 1; d <= 4; d++) {
        set(p, d, t.shade);
        set(p, N - 1 - d, t.outline);
        set(d, p, t.shade);
        set(N - 1 - d, p, t.outline);
      }
      if (t.nails) {
        set(p - 2, 2, t.outline);
        set(p - 2, N - 4, t.outline);
        set(2, p - 2, t.outline);
        set(N - 4, p - 2, t.outline);
      }
    }
  }
  if (t.stitch) {
    // a dashed seam running round the canvas
    for (let p = E; p < N - E; p++) {
      if (p % 3 === 2) continue;
      set(p, 3, t.stitch);
      set(p, N - 4, t.stitch);
      set(3, p, t.stitch);
      set(N - 4, p, t.stitch);
    }
  }
  if (t.brass) {
    // brass caps over the four corners, lit top-left
    for (const [cx, cy] of [[0, 0], [N - E, 0], [0, N - E], [N - E, N - E]]) {
      for (let y = 0; y < E; y++) for (let x = 0; x < E; x++) {
        const edge = x === 0 || y === 0 || x === E - 1 || y === E - 1;
        set(cx + x, cy + y, edge ? "#5a4512" : x + y < 4 ? "#f2d47c" : x + y > 7 ? "#8a6a22" : "#c9a24a");
      }
      g[cy === 0 ? 0 : N - 1][cx === 0 ? 0 : N - 1] = null;
      set(cx + 2, cy + 2, "#fff2c0");
    }
  }
  return g;
}

// The pixels as an SVG: one rect per run of a colour along a row.
function toSvg(g) {
  let rects = "";
  g.forEach((row, y) => {
    for (let x = 0; x < N; ) {
      const c = row[x];
      let w = 1;
      while (x + w < N && row[x + w] === c) w++;
      if (c) rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`;
      x += w;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${N}" height="${N}" shape-rendering="crispEdges">${rects}</svg>`;
}

// Draws every theme and hands it to the stylesheet as --frame-<theme>.
export function installFrames(root = document.documentElement) {
  for (const [name, theme] of Object.entries(THEMES)) {
    root.style.setProperty(`--frame-${name}`, `url("data:image/svg+xml,${encodeURIComponent(toSvg(paint(theme)))}")`);
  }
}

// Which theme a tab's page wears.
const TAB_AREA = { floor1: "lobby", floor2: "classrooms", floor3: "facilities", courtyard: "courtyard", citymap: "city", defense: "night", assault: "night", event: "night" };
export const areaOfTab = (tab) => TAB_AREA[tab] || "school";
