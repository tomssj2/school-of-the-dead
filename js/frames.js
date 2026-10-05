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

// ---------- the page behind it all: the view at the turn's time of day ----------
// Three 960x540 pixel-art scenes drawn in code — morning (classes): the school from the front;
// dusk (the city): the ruined city at sunset; night (the watch): the view from the school's front
// steps, out over the courtyard and the broken gate to the street and the city under the moon.
// Each is set as --sky-morning / --sky-dusk / --sky-night and style.css shows the one for the
// turn, scaled up crisp to cover the window. Muted on purpose: the game's windows sit on top, and
// at 1920 wide only the strips down each side show (about x < 205 and x > 755 here), so that's
// where the landmarks go.

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hashAt = (x, y) => noise(x * 3 + 11, y * 7 + 5);
const mixHex = (a, b, k) => "#" + hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * k).toString(16).padStart(2, "0")).join("");
const WINDOW_LIT = ["#ffd27a", "#f0a64a"];

// A canvas and the few ways the city scenes draw on it.
function sceneKit(W, H) {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  const rect = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const disc = (cx, cy, r, c) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      rect(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  };
  const line = (x0, y0, x1, y1, c, t = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) rect(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, t, t, c);
  };
  return { cv, W, H, rect, disc, line };
}

// The sky in stepped bands down to `bottom`, a half-step between each pair, dithered where they meet.
function bandedSky({ W, H, rect }, base, bottom) {
  const bands = base.flatMap((c, i) => (i < base.length - 1 ? [c, mixHex(c, base[i + 1], 0.5)] : [c]));
  const bandH = bottom / bands.length;
  for (let y = 0; y < H; y++) {
    const b = Math.min(bands.length - 1, Math.floor(y / bandH));
    const into = y / bandH - b;
    const pick = (xx) => (b < bands.length - 1 && ((into > 0.66 && (xx + y) % 2 === 0) || into > 0.88) ? bands[b + 1] : bands[b]);
    for (let x = 0; x < W; ) {
      const c = pick(x);
      let w = 1;
      while (x + w < W && pick(x + w) === c) w++;
      rect(x, y, w, 1, c);
      x += w;
    }
  }
}

// A cloud: overlapping blobs, shaded underneath and lit on top ([shade, body, mid, lit]).
function cloud({ disc, rect }, cx, cy, w, [shade, body, mid, lit]) {
  const blobs = [[0, 0, 1], [-0.34, 0.14, 0.72], [0.36, 0.12, 0.76], [-0.62, 0.24, 0.46], [0.64, 0.24, 0.5], [0.12, -0.14, 0.62]];
  const r0 = w / 4;
  const layer = (oy, shrink, c) => {
    for (const [dx, dy, k] of blobs) disc(Math.round(cx + dx * w), Math.round(cy + dy * w * 0.5 + oy), Math.max(2, Math.round(r0 * k) - shrink), c);
  };
  layer(5, 0, shade);
  layer(0, 0, body);
  layer(-3, 3, mid);
  layer(-6, 7, lit);
  rect(cx - w * 0.78, cy + r0 * 0.55, w * 1.56, Math.ceil(r0 * 0.55), shade); // a flat base
}

// A row of broken towers standing on `foot`: bites out of the roofline with a jagged break,
// antennas, rooftop boxes, the edge facing the light (o.lightX, tinted o.glow) lit, and a grid of
// windows — dark ones and a few lit. o.tops, if given, records each column's roof.
function cityRow({ W, H, rect }, seed, foot, [minW, maxW], [minH, maxH], color, o) {
  const rim = mixHex(color, o.glow, o.rim);
  const dark = mixHex(color, "#000000", 0.2);
  const [ww, wh, sx, sy] = o.win;
  let x = -10;
  for (let i = 0; x < W + 10; i++) {
    const w = minW + Math.floor(hashAt(seed + i, 9) * (maxW - minW));
    const h = minH + Math.floor(hashAt(seed + i, 10) * (maxH - minH));
    const top = foot - h;
    const r = hashAt(seed + i, 11);
    const bite = r < 0.35 ? Math.ceil(w * 0.4) : 0;
    const biteTop = top + Math.ceil(h * 0.2);
    rect(x, top, w - bite, H - top, color);
    if (bite) {
      rect(x + w - bite, biteTop, bite, H - biteTop, color);
      for (let s = 0; s < bite; s += 3) rect(x + w - bite + s, biteTop - Math.floor(hashAt(x + s, seed) * 6), 3, 6, color);
    }
    if (r > 0.7) {
      rect(x + (w >> 1), top - 18, 2, 18, color);
      rect(x + (w >> 1) - 4, top - 12, 10, 1, color);
      if (o.beacon && r > 0.9) rect(x + (w >> 1), top - 20, 2, 2, "#ff6a50");
    }
    if (r > 0.82) rect(x + 5, top - 7, 9, 7, color);
    if (o.tops) for (let k = Math.max(0, x); k < Math.min(W, x + w); k++) o.tops[k] = k < x + w - bite ? top : biteTop;
    if (x + w < o.lightX) rect(x + w - 2, bite ? biteTop : top, 2, foot - (bite ? biteTop : top), rim);
    else if (x > o.lightX) rect(x, top, 2, foot - top, rim);
    for (let wy = top + 6; wy < foot - wh - 4; wy += sy) {
      for (let wx = x + 5; wx + ww <= x + w - 5; wx += sx) {
        if (bite && wx + ww > x + w - bite && wy < biteTop + 8) continue;
        const v = hashAt(wx * 7 + seed, wy);
        if (v < o.lit) rect(wx, wy, ww, wh, WINDOW_LIT[hashAt(wx, wy + 1) < 0.5 ? 0 : 1]);
        else if (v < o.lit + o.dark) rect(wx, wy, ww, wh, dark);
      }
    }
    x += w + (hashAt(seed + i, 12) < 0.25 ? 4 + Math.floor(hashAt(seed + i, 13) * 12) : 0);
  }
}

// The city's landmarks, the same from every view: a tall tower with its top sheared off at a slant
// (from x0, on `foot`), and a crane whose jib snapped and hangs (its mast at cx).
function shearedTower({ rect }, x0, foot, color, rim) {
  const top = (k) => foot - 214 + Math.floor(k * 0.7) + Math.floor(hashAt(k, 31) * 4);
  for (let k = 0; k < 52; k++) rect(x0 + k, top(k), 1, foot - top(k), color);
  rect(x0 + 50, top(50), 2, foot - top(50), rim);
  for (let wy = foot - 196; wy < foot - 24; wy += 8) for (let wx = x0 + 5; wx < x0 + 48; wx += 6) {
    if (wy > top(wx - x0) + 6 && hashAt(wx, wy) < 0.5) rect(wx, wy, 2, 3, mixHex(color, "#000000", 0.2));
  }
}
function crane({ rect, line }, cx, foot, color) {
  const ct = foot - 236;
  rect(cx, ct, 2, foot - ct, color);
  rect(cx + 10, ct, 2, foot - ct, color);
  for (let y = ct; y < foot - 10; y += 10) line(cx, y, cx + 10, y + 10, color);
  rect(cx - 4, ct - 2, 20, 12, color); // the cab
  rect(cx - 96, ct - 10, 150, 2, color); // the jib's top chord, out over the counterweight
  rect(cx - 96, ct - 2, 96, 2, color);
  for (let x = cx - 96; x < cx; x += 8) line(x, ct - 2, x + 4, ct - 10, color), line(x + 4, ct - 10, x + 8, ct - 2, color);
  rect(cx + 36, ct - 8, 16, 12, color); // the counterweight
  line(cx + 6, ct - 34, cx - 90, ct - 10, color);
  line(cx + 6, ct - 34, cx + 50, ct - 10, color);
  rect(cx + 5, ct - 34, 2, 24, color);
  line(cx - 96, ct - 6, cx - 112, ct + 46, color, 2); // the snapped end
  line(cx - 52, ct, cx - 54, ct + 54, color); // a cable with its hook
  rect(cx - 57, ct + 54, 5, 4, color);
  return ct;
}

// Down on the street: a wrecked car (cab towards the back, `flip` the other way round, one window
// smashed out), a lamp post (bent by `lean`; a straight one still works and throws a cone of light),
// and one of the dead, shambling towards `f` (+1 right, -1 left) at scale s.
function wreck({ rect, disc }, x, base, body, edge, glass, flip) {
  rect(x, base - 14, 52, 10, body);
  rect(x + 2, base - 17, 48, 3, body);
  rect(x + 2, base - 17, 48, 1, edge);
  const cab = flip ? x + 8 : x + 18;
  rect(cab, base - 27, 26, 10, body);
  rect(cab + 2, base - 27, 22, 1, edge);
  rect(cab + 3, base - 25, 9, 7, glass);
  if (!flip) rect(cab + 14, base - 25, 9, 7, glass);
  for (const wx of [x + 11, x + 41]) {
    disc(wx, base - 4, 5, "#0d080e");
    rect(wx - 1, base - 5, 2, 2, "#2c1f30");
  }
}
function lampPost({ rect }, x, base, lean, color, height = 64) {
  const off = (k) => Math.round((lean * k * k) / 280);
  if (!lean) {
    for (let k = 0; k < height - 8; k++) rect(x + 12 - 3 - k * 0.3, base - height + 6 + k, 6 + k * 0.6, 1, "rgba(255,210,122,0.05)");
    for (const [w, h] of [[26, 3], [18, 2]]) rect(x + 12 - w, base - h, w * 2, h, "rgba(255,210,122,0.08)");
  }
  for (let k = 0; k < height; k++) rect(x + off(k), base - k, 2, 1, color);
  rect(x - 3, base - 4, 8, 4, color);
  const tx = x + off(height - 1), ty = base - height;
  rect(tx, ty, 12, 2, color);
  rect(tx + 8, ty + 2, 8, 3, color);
  if (!lean) rect(tx + 9, ty + 5, 6, 1, WINDOW_LIT[0]);
}
function walker({ rect }, x, y, f, c, s = 1) {
  const r = (dx, dy, w, h) => rect(x + dx * s, y + dy * s, w * s, h * s, c);
  r(f, -23, 5, 5);
  r(-1, -18, 7, 10);
  r(f > 0 ? 5 : -7, -16, 8, 2);
  r(0, -8, 2, 8);
  r(4, -8, 2, 6);
  r(5, -2, 2, 2);
}

// The morning's view: the school from the City Map's campus (map.js campus) seen from the front on
// a quiet morning — the cream main building under blue roofs with its clock tower, blue clock and
// red banner; the gym's blue curved roof; the running track, the tennis court, the cherry trees, the
// striped lawn and the beige fence — in muted colours, at twice the other skies' resolution. The
// game's windows cover the middle of the screen (about x 205-755 here), so the school's features sit
// in the strips down each side.
function drawMorning() {
  const W = 960, H = 540, GY = 404; // the lawn's edge
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  const rect = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  const disc = (cx, cy, r, c) => {
    for (let y = -r; y <= r; y++) {
      const w = Math.round(Math.sqrt(r * r - y * y));
      rect(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  };
  const ellipse = (cx, cy, rx, ry, c) => {
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
      rect(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  };

  // the palette: the campus's colours, muted
  const CREAM = "#d9d2c2", CREAM_LIT = "#e6e0d2", CREAM_SH = "#b9b1a1";
  const ROOF = "#3d6687", ROOF_LIT = "#5582a6", ROOF_SH = "#2c4c66";
  const GLASS = "#8fb4cc", GLINT = "#c2d8e6";
  const LAWN = "#6f9a66", LAWN_STRIPE = "#678f5f", LAWN_SH = "#557a4f";

  // the sky: a soft morning blue in fine stepped bands, dithered where one meets the next
  const bands = ["#355d88", "#3d6893", "#46739d", "#5180a7", "#5d8cb0", "#6a99b9", "#79a6c2", "#89b2ca", "#9abdd0", "#abc8d5", "#bad0d8"];
  const bandH = GY / bands.length;
  for (let y = 0; y < GY; y++) {
    const b = Math.min(bands.length - 1, Math.floor(y / bandH));
    const into = y / bandH - b;
    for (let x = 0; x < W; ) {
      const pick = (xx) => (b < bands.length - 1 && ((into > 0.7 && (xx + y) % 2 === 0) || into > 0.9) ? bands[b + 1] : bands[b]);
      const c = pick(x);
      let w = 1;
      while (x + w < W && pick(x + w) === c) w++;
      rect(x, y, w, 1, c);
      x += w;
    }
  }
  // the sun, up on the right, with a soft halo
  for (const [r, c] of [[78, "rgba(255,240,200,0.06)"], [58, "rgba(255,240,200,0.07)"], [42, "rgba(255,240,200,0.08)"]]) disc(842, 92, r, c);
  disc(842, 92, 30, "#f2e2a8");
  disc(842, 92, 26, "#fbf0cc");
  // clouds: soft blobs, lit on top
  const cloud = (cx, cy, w) => {
    const blobs = [[0, 0, 1], [-0.34, 0.14, 0.72], [0.36, 0.12, 0.76], [-0.62, 0.24, 0.46], [0.64, 0.24, 0.5], [0.12, -0.14, 0.62]];
    const r0 = w / 4;
    for (const [dx, dy, k] of blobs) disc(Math.round(cx + dx * w), Math.round(cy + dy * w * 0.5 + 4), Math.round(r0 * k), "#a9bac7");
    for (const [dx, dy, k] of blobs) disc(Math.round(cx + dx * w), Math.round(cy + dy * w * 0.5), Math.round(r0 * k), "#d6dee4");
    for (const [dx, dy, k] of blobs) disc(Math.round(cx + dx * w), Math.round(cy + dy * w * 0.5 - 4), Math.max(2, Math.round(r0 * k) - 6), "#eef1f3");
    rect(cx - w * 0.78, cy + r0 * 0.55, w * 1.56, Math.ceil(r0 * 0.55), "#a9bac7");
  };
  for (const [x, y, w] of [[110, 92, 92], [300, 58, 64], [560, 110, 78], [700, 52, 56], [905, 196, 70], [40, 214, 54]]) cloud(x, y, w);
  // a few birds
  for (const [x, y] of [[236, 120], [258, 108], [276, 122], [640, 150], [662, 140]]) {
    rect(x, y, 3, 2, "#4a5866");
    rect(x - 4, y - 2, 4, 2, "#4a5866");
    rect(x + 3, y - 2, 4, 2, "#4a5866");
  }

  // the town's trees on the horizon, behind the school
  for (let x = 0; x < W; x++) {
    const far = Math.round(GY - 44 - 9 * Math.sin(x / 61) - 5 * Math.sin(x / 23 + 2));
    rect(x, far, 1, GY - far, "#7f97a0");
    const near = Math.round(GY - 22 - 6 * Math.sin(x / 37 + 1) - 3 * Math.sin(x / 15));
    rect(x, near, 1, GY - near, "#64806a");
  }

  // ----- the main building, on the left: a cream wing under a blue roof, the clock tower -----
  const top = 254;
  rect(-10, top, 230, GY - top, CREAM);
  rect(-10, top, 4, GY - top, CREAM_LIT);
  rect(-10, top + 4, 230, 4, CREAM_SH); // the roof's shadow on the wall
  rect(-14, top - 16, 240, 16, ROOF);
  rect(-14, top - 16, 240, 3, ROOF_LIT);
  rect(-14, top - 2, 240, 2, ROOF_SH);
  const pane = (x, y) => {
    rect(x - 2, y - 2, 18, 26, CREAM_SH);
    rect(x, y, 14, 22, GLASS);
    rect(x + 2, y + 2, 3, 9, GLINT);
    rect(x + 6, y, 2, 22, CREAM_LIT);
    rect(x, y + 9, 14, 2, CREAM_LIT);
  };
  for (const x of [10, 44, 78, 186]) for (const y of [278, 332]) pane(x, y);
  rect(-10, GY - 10, 230, 10, CREAM_SH); // the plinth

  // the clock tower: cream, a blue cap, the blue-rimmed clock and the red banner below it
  const tx = 118, tw = 56;
  rect(tx, 150, tw, GY - 150, CREAM);
  rect(tx, 150, 4, GY - 150, CREAM_LIT);
  rect(tx + tw - 4, 150, 4, GY - 150, CREAM_SH);
  rect(tx - 6, 136, tw + 12, 14, ROOF);
  rect(tx - 6, 136, tw + 12, 3, ROOF_LIT);
  rect(tx + 8, 124, tw - 16, 12, ROOF);
  rect(tx + 8, 124, tw - 16, 2, ROOF_LIT);
  rect(tx + tw / 2 - 2, 108, 4, 16, "#b7a46a"); // the spire
  const cx = tx + tw / 2, cy = 184;
  disc(cx, cy, 19, ROOF);
  disc(cx, cy, 15, "#f3f1ea");
  for (const [dx, dy] of [[0, -12], [12, 0], [0, 12], [-12, 0]]) rect(cx + dx - 1, cy + dy - 1, 2, 2, "#8a8a90");
  rect(cx - 1, cy - 11, 2, 11, "#2a2a30"); // its hands at ten to eight
  for (let k = 0; k < 8; k++) rect(cx - k - 1, cy - Math.round(k * 0.45) - 1, 2, 2, "#2a2a30");
  rect(cx - 12, 216, 24, 52, "#b0524c"); // the red banner and its gold crest
  rect(cx - 12, 216, 24, 3, "#c4675f");
  rect(cx - 12, 268, 10, 6, "#b0524c");
  rect(cx + 2, 268, 10, 6, "#b0524c");
  disc(cx, 238, 6, "#d9be6a");
  for (const y of [290, 344]) {
    rect(tx + 14, y, 28, 22, CREAM_SH);
    rect(tx + 16, y + 2, 24, 18, GLASS);
    rect(tx + 18, y + 4, 3, 8, GLINT);
  }
  rect(cx - 16, GY - 44, 32, 4, ROOF); // the front door: blue-grey double doors under a blue lintel
  rect(cx - 13, GY - 40, 26, 40, "#5a7a96");
  rect(cx - 1, GY - 40, 2, 40, "#405a72");
  rect(cx - 24, GY - 4, 48, 4, "#c9c2b2"); // its step

  // ----- on the right: the gym's blue curved roof, the flagpole -----
  const gx = 776;
  rect(gx, 300, W - gx + 10, GY - 300, "#cdc6b4");
  rect(gx, 300, 4, GY - 300, CREAM_LIT);
  for (let x = gx - 6; x < W + 4; x++) {
    const y = 300 - Math.round(30 * Math.sin((Math.PI * (x - gx + 6)) / 420));
    rect(x, y, 1, 302 - y, ROOF);
    rect(x, y, 1, 3, ROOF_LIT);
  }
  rect(gx, 300, W - gx, 3, ROOF_SH);
  for (const x of [796, 836, 916]) {
    rect(x - 2, 326, 26, 22, CREAM_SH);
    rect(x, 328, 22, 18, GLASS);
    rect(x + 2, 330, 3, 8, GLINT);
  }
  rect(866, GY - 46, 32, 46, "#6b4a2f"); // the gym's wooden doors
  rect(866, GY - 46, 32, 3, "#8a5f33");
  rect(881, GY - 43, 2, 43, "#5a3b24");
  rect(780, 170, 3, GY - 170, "#c9ccd2"); // the flagpole and its green flag
  disc(781, 168, 3, "#d9c27a");
  for (let x = 0; x < 40; x++) {
    const wave = Math.round(Math.sin(x / 6) * 3);
    rect(783 + x, 176 + wave, 1, 22, "#4f8a5e");
    rect(783 + x, 176 + wave, 1, 3, "#63a072");
  }

  // ----- the grounds: the lawn's mowing stripes, the running track, the tennis court -----
  rect(0, GY, W, H - GY, LAWN);
  for (let x = 0; x < W; x += 16) rect(x, GY, 8, H - GY, LAWN_STRIPE);
  rect(0, GY, W, 3, LAWN_SH);
  // the running track's curve in the front left, a green pitch inside it
  ellipse(80, H + 40, 250, 106, "#a8644e");
  ellipse(80, H + 40, 232, 92, "#b87358");
  ellipse(80, H + 40, 214, 78, "#5f9a5e");
  for (let k = 0; k < 4; k++) ellipse(80, H + 40, 240 - k * 6, 99 - k * 2.5, k % 2 ? "#b87358" : "#c3826a");
  ellipse(80, H + 40, 214, 78, "#5f9a5e");
  for (let k = 0; k < 6; k++) ellipse(80, H + 40, 214 - k * 30, 78 - k * 11, k % 2 ? "#5f9a5e" : "#5a945a"); // the pitch, mown in rings
  // the tennis court in the front right, in perspective, behind its fence
  for (let y = 452; y < H; y++) {
    const t = (y - 452) / (H - 452);
    const x0 = Math.round(812 - t * 70);
    rect(x0, y, W - x0, 1, "#4f8070");
    rect(x0, y, 3, 1, "#ebe9e2");
  }
  rect(812, 452, W - 812, 3, "#ebe9e2");
  for (let y = 452; y < H; y++) {
    const t = (y - 452) / (H - 452);
    rect(Math.round(880 - t * 40), y, 2, 1, "#ebe9e2");
  }
  rect(790, 492, W - 790, 2, "#ebe9e2");
  rect(790, 470, W, 2, "#d9d7cf"); // the net
  for (let x = 800; x < W; x += 6) rect(x, 462, 1, 8, "#3a4a44");
  // the beige fence along the front of the grounds
  for (let x = 0; x < W; x += 24) {
    rect(x, 420, 4, 22, "#a8946a");
    rect(x, 420, 4, 3, "#c9b58c");
  }
  rect(0, 426, W, 3, "#c9b58c");
  rect(0, 436, W, 3, "#c9b58c");
  rect(0, 439, W, 1, "#a8946a");

  // trees: a few plain ones and the campus's cherry trees in blossom
  const tree = (x, base, s, leaf, lit) => {
    rect(x - 3 * s, base - 30 * s, 6 * s, 30 * s, "#5a4232");
    disc(x, base - 46 * s, Math.round(20 * s), leaf);
    disc(x + 12 * s, base - 36 * s, Math.round(14 * s), leaf);
    disc(x - 12 * s, base - 38 * s, Math.round(14 * s), leaf);
    disc(x - 6 * s, base - 54 * s, Math.round(9 * s), lit);
  };
  tree(22, 410, 1.1, "#5a7a52", "#6a8a5e");
  tree(232, 412, 1, "#c99aab", "#e2c2cf"); // cherry
  tree(752, 412, 1, "#c99aab", "#e2c2cf");
  tree(948, 412, 1.15, "#5a7a52", "#6a8a5e");
  tree(60, 470, 0.8, "#c99aab", "#e2c2cf");
  for (const [x, y] of [[50, 474], [64, 478], [74, 470], [44, 466]]) rect(x, y, 3, 2, "#e2c2cf"); // fallen petals

  return cv.toDataURL("image/png");
}

// The dusk's view (the City Map turn): the ruined city against a purple-to-orange sky with the sun
// going down behind it — three rows of broken towers catching its light on their edges, the near
// ones with a few lit windows; the sheared-off tower, the snapped crane and a water tower; wrecks
// and bent lamp posts along the street, a few of the dead wandering it, and smoke rising from the
// fires.
function drawDusk() {
  const k = sceneKit(960, 540);
  const { W, H, rect, disc, line } = k;
  const HZ = 412; // the far skyline's foot
  const FAR = "#5a3550", MID = "#3b2440", NEAR = "#221726", GROUND = "#170f19";
  const GLOW = "#f4ac5c";
  const SUN = { x: 472, y: 392, r: 54 };

  bandedSky(k, ["#1d1a3f", "#2f2552", "#4f2d60", "#7a3a62", "#a8485e", "#d0645a", "#ea8a4e", "#f4ac5c"], HZ);
  // the first stars, high up where it's already dark
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(hashAt(i, 1) * W), y = Math.floor(hashAt(i, 2) * 150);
    const a = (0.2 + hashAt(i, 3) * 0.45) * (1 - y / 220);
    rect(x, y, 1, 1, `rgba(235,240,255,${a.toFixed(2)})`);
    if (hashAt(i, 3) > 0.9) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) rect(x + dx, y + dy, 1, 1, `rgba(220,228,255,${(a * 0.4).toFixed(2)})`);
  }
  // the sun, low and big behind the city, with thin bands of haze across its lower half
  for (const f of [3.1, 2.4, 1.8, 1.35]) disc(SUN.x, SUN.y, Math.round(SUN.r * f), "rgba(255,170,90,0.08)");
  disc(SUN.x, SUN.y, SUN.r + 4, "#ffb060");
  disc(SUN.x, SUN.y, SUN.r, "#ffd690");
  disc(SUN.x - 8, SUN.y - 10, SUN.r - 18, "#ffe4ac");
  for (let i = 0; i < 5; i++) {
    const y = SUN.y + 8 + i * 10;
    const w = Math.round(Math.sqrt(Math.max(0, (SUN.r + 4) ** 2 - (y - SUN.y) ** 2)));
    rect(SUN.x - w, y, w * 2 + 1, 2 + (i >> 1), "#ea8a4e");
  }
  // clouds lit pink and gold, long thin streaks low down, crows heading home
  for (const [x, y, w] of [[128, 140, 84], [340, 80, 60], [660, 184, 100], [872, 104, 62], [240, 300, 52]]) {
    cloud(k, x, y, w, ["#5e2f5a", "#a8547a", "#cf6f7c", "#f6a888"]);
  }
  for (const [x, y, len] of [[-10, 326, 196], [40, 352, 130], [764, 300, 210], [816, 338, 160]]) {
    rect(x, y, len, 3, "#a8547a");
    rect(x + 8, y - 1, len - 24, 1, "#e88e82");
    rect(x + 18, y + 3, len - 40, 2, "#5e2f5a");
  }
  for (const [x, y] of [[808, 214], [826, 204], [846, 220], [94, 236], [114, 244]]) {
    rect(x, y, 2, 2, "#2a1a2c");
    rect(x - 4, y - 2, 4, 1, "#2a1a2c");
    rect(x + 2, y - 2, 4, 1, "#2a1a2c");
  }

  // the far row in the haze, the landmarks, the warm haze settling over them
  const sunlit = (rim) => ({ lightX: SUN.x, glow: GLOW, rim });
  cityRow(k, 100, HZ - 16, [24, 76], [36, 124], FAR, { ...sunlit(0.3), win: [2, 3, 6, 8], lit: 0, dark: 0.45 });
  shearedTower(k, 30, HZ, FAR, mixHex(FAR, GLOW, 0.3));
  crane(k, 872, HZ, FAR);
  for (let y = HZ - 96; y < HZ + 20; y += 2) rect(0, y, W, 2, `rgba(244,150,100,${((0.13 * (y - HZ + 96)) / 116).toFixed(3)})`);

  // the middle row, and a water tower standing over it on the left
  cityRow(k, 200, HZ + 4, [22, 64], [30, 100], MID, { ...sunlit(0.25), win: [3, 4, 8, 10], lit: 0.04, dark: 0.4 });
  const wt = 150, wtTop = HZ - 124;
  for (const [x0, x1] of [[wt + 2, wt - 4], [wt + 12, wt + 10], [wt + 24, wt + 26], [wt + 34, wt + 40]]) line(x0, wtTop + 40, x1, HZ, MID, 2);
  for (let y = wtTop + 52; y < HZ; y += 18) rect(wt - 2, y, 42, 2, MID);
  for (let i = 0; i < 10; i++) rect(wt + 18 - i * 2, wtTop - 10 + i, 4 + i * 4, 1, MID); // its pointed roof
  rect(wt, wtTop, 38, 40, MID);
  rect(wt + 36, wtTop, 2, 40, mixHex(MID, GLOW, 0.25));
  for (const y of [wtTop + 9, wtTop + 21, wtTop + 33]) rect(wt, y, 36, 1, mixHex(MID, "#000000", 0.2));

  // the near row in silhouette down to the street, with a few windows still lit
  const nearTop = new Array(W).fill(H);
  cityRow(k, 300, HZ + 20, [26, 84], [20, 90], NEAR, { ...sunlit(0.16), win: [3, 4, 8, 10], lit: 0.12, dark: 0.35, beacon: true, tops: nearTop });

  // smoke rising from the fires on the rooftops, spreading and thinning as it climbs
  for (const fx of [118, 520, 848]) {
    const fy = nearTop[fx] < H ? nearTop[fx] : HZ + 20;
    for (let i = 0; i < 44; i++) {
      const a = 0.36 * (1 - i / 44);
      disc(fx + Math.round(i * 1.9 + Math.sin(i * 0.33) * 5), fy - 6 - i * 6, 3 + Math.round(i * 0.6), `rgba(40,24,40,${a.toFixed(3)})`);
    }
    disc(fx, fy - 2, 10, "rgba(255,140,70,0.18)");
    for (let i = 0; i < 8; i++) rect(fx - 5 + Math.floor(hashAt(i, fx) * 10), fy - 2 - Math.floor(hashAt(fx, i) * 8), 2, 3, i % 2 ? "#ffb060" : "#ff7a3a");
  }

  // the street: the pavement, the road with its broken centre line, the far kerb
  const kerb = HZ + 20, pave = kerb + 42, road = kerb + 44;
  rect(0, kerb, W, H - kerb, GROUND);
  rect(0, kerb, W, 3, NEAR);
  for (let x = 14; x < W; x += 36) rect(x, kerb + 4, 1, 38, "#1e1421"); // paving slabs
  rect(0, kerb + 22, W, 1, "#1e1421");
  rect(0, road, W, 28, NEAR);
  rect(0, road, W, 1, mixHex(NEAR, GLOW, 0.12));
  for (let x = 10; x < W; x += 48) if (hashAt(x, 77) > 0.3) rect(x, road + 13, 20, 2, FAR);
  for (const [x, y, w] of [[180, road + 20, 18], [604, road + 6, 14], [818, road + 18, 22]]) { // puddles holding the sky
    rect(x, y, w, 3, MID);
    rect(x + 3, y + 1, w - 8, 1, "#7a3a62");
  }
  for (let i = 0; i < 9; i++) { // cracks
    let x = Math.floor(hashAt(i, 61) * W), y = road + 2 + Math.floor(hashAt(i, 62) * 20);
    for (let j = 0; j < 6; j++) {
      rect(x, y, 3, 1, "#191020");
      x += 3;
      y += hashAt(i, j) < 0.5 ? 1 : -1;
    }
  }
  rect(0, road + 28, W, 2, "#2c1f30");
  // rubble heaped against the buildings
  for (const [x, w] of [[196, 30], [744, 40], [924, 28]]) {
    for (let i = 0; i < w; i++) {
      const h = Math.round(Math.sin((Math.PI * i) / w) * (w / 4) + hashAt(i, x) * 3);
      rect(x + i, kerb + 20 - h, 1, h, mixHex(NEAR, MID, 0.5));
      if (hashAt(x, i) > 0.7) rect(x + i, kerb + 20 - h + 2, 2, 2, NEAR); // broken blocks in the heap
    }
  }
  for (const [x, flip] of [[18, 0], [140, 1], [300, 0], [640, 1], [790, 0], [896, 1]]) wreck(k, x, pave, NEAR, mixHex(NEAR, GLOW, 0.2), "#4a2a4c", flip);
  for (const [x, lean] of [[100, 0], [436, 1], [866, -1]]) lampPost(k, x, pave, lean, NEAR);
  for (const [x, y, f] of [[62, road + 24, 1], [86, road + 27, 1], [884, road + 25, -1]]) walker(k, x, y, f, "#0f0a11");
  // dust hanging in the warm air
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(hashAt(i, 71) * W), y = 200 + Math.floor(hashAt(i, 72) * (H - 200));
    rect(x, y, 1, 1, `rgba(255,196,150,${(0.08 + hashAt(i, 73) * 0.16).toFixed(2)})`);
  }
  return k.cv.toDataURL("image/png");
}

// The night's view (the Night Watch): standing on the school's front steps, looking out the way
// the horde comes — the top steps and their handrails underfoot, the courtyard (the lawn, the path
// down to the torn-open gate, hedges, the bench, a fire barrel, the flag at half mast), the low
// wall with its iron railings, crumbled on the right where the dead are climbing through, then the
// street under its lamps with a wreck's headlight still on, and beyond it the same ruined city as
// the dusk — the sheared tower, the crane — dark under the moon, a few windows lit. Everything
// below the city is drawn in perspective towards the gate (VP).
function drawNight() {
  const k = sceneKit(960, 540);
  const { W, H, rect, disc, line } = k;
  const HZ = 316; // the far skyline's foot
  const MOON = { x: 812, y: 92, r: 22 };
  const MOONLIT = "#9fb4e0";
  const FAR = "#161d33", MID = "#0f1426", NEAR = "#0a0d19";
  const STONE = "#464a5a", STONE_LT = "#6a7088", STONE_DK = "#30333f";
  const IRON = "#1a1e28", IRON_LT = "#4a5266";
  const VP = { x: 480, y: 300 };
  const toward = (xb, y) => VP.x + ((xb - VP.x) * (y - VP.y)) / (H - VP.y); // x at y on the line from (xb, H) to the VP

  // the sky: deep blue, a little lighter down at the horizon, full of stars
  bandedSky(k, ["#04060f", "#070b1a", "#0b1124", "#10172f", "#151e3b", "#1b2647", "#223052", "#2a3658"], HZ);
  for (let i = 0; i < 230; i++) {
    const x = Math.floor(hashAt(i, 1) * W), y = Math.floor(hashAt(i, 2) * 280);
    const a = (0.3 + hashAt(i, 3) * 0.6) * (1 - y / 420);
    rect(x, y, 1, 1, `rgba(235,240,255,${a.toFixed(2)})`);
    if (hashAt(i, 3) > 0.94) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) rect(x + dx, y + dy, 1, 1, `rgba(220,228,255,${(a * 0.45).toFixed(2)})`);
  }
  // the moon, up on the right, with its glow and craters
  for (const f of [4, 3, 2.2, 1.6]) disc(MOON.x, MOON.y, Math.round(MOON.r * f), "rgba(170,190,255,0.045)");
  disc(MOON.x, MOON.y, MOON.r, "#e4e9f6");
  for (const [dx, dy, r] of [[-6, -4, 6], [8, 6, 4], [4, -10, 2], [-9, 9, 3], [11, -3, 2]]) disc(MOON.x + dx, MOON.y + dy, r, "#c6cde0");
  disc(MOON.x + 6, MOON.y - 2, MOON.r - 4, "rgba(150,165,205,0.18)"); // shaded on the right
  for (const [x, y, w] of [[150, 150, 90], [420, 70, 64], [690, 196, 96], [900, 250, 60]]) {
    cloud(k, x, y, w, ["#0e1222", "#1a2038", "#262f4e", "#46557e"]);
  }

  // the city: the far row and its landmarks in the cold haze, then the middle row
  const moonlit = (rim) => ({ lightX: MOON.x, glow: MOONLIT, rim });
  cityRow(k, 100, HZ - 16, [24, 76], [40, 130], FAR, { ...moonlit(0.2), win: [2, 3, 6, 8], lit: 0.02, dark: 0.4 });
  shearedTower(k, 30, HZ, FAR, mixHex(FAR, MOONLIT, 0.2));
  const ct = crane(k, 872, HZ, FAR);
  disc(878, ct - 36, 5, "rgba(255,80,60,0.15)"); // the warning light on top, still blinking
  rect(877, ct - 37, 2, 2, "#ff5a46");
  for (let y = HZ - 96; y < HZ + 20; y += 2) rect(0, y, W, 2, `rgba(90,110,170,${((0.1 * (y - HZ + 96)) / 116).toFixed(3)})`);
  cityRow(k, 200, HZ + 6, [22, 64], [30, 96], MID, { ...moonlit(0.15), win: [3, 4, 8, 10], lit: 0.06, dark: 0.4, beacon: true });

  // across the street: shops under flats, shutters down, a chemist's green cross still glowing
  const street = 342; // the far pavement's edge
  const tops = new Array(W).fill(H);
  cityRow(k, 400, street, [34, 90], [40, 92], NEAR, { ...moonlit(0.1), win: [3, 4, 8, 10], lit: 0.14, dark: 0.35, tops });
  for (let x = 0; x < W; x += 2) {
    if (tops[x] > street - 22) continue;
    rect(x, street - 18, 2, 18, x % 30 < 3 ? NEAR : "#161b2a");
    if (x % 30 >= 3) for (let y = street - 17; y < street; y += 3) rect(x, y, 2, 1, "#10141f");
  }
  const cx0 = 70, cy0 = tops[cx0] + 22;
  disc(cx0 + 6, cy0 + 6, 16, "rgba(60,210,120,0.08)");
  rect(cx0 + 4, cy0, 4, 12, "#3ac07a");
  rect(cx0, cy0 + 4, 12, 4, "#3ac07a");
  rect(cx0 + 5, cy0 + 1, 2, 10, "#8af0b4");

  // the street: the far pavement, the road under its lamps, a wreck with one headlight on
  rect(0, street, W, 6, "#1c202c");
  rect(0, street, W, 1, "#2a3040");
  const road = street + 6, kerb = road + 28;
  rect(0, road, W, 28, "#12151e");
  for (let x = 10; x < W; x += 48) if (hashAt(x, 77) > 0.3) rect(x, road + 13, 20, 2, "#2e3448");
  for (let i = 0; i < 9; i++) { // cracks
    let x = Math.floor(hashAt(i, 61) * W), y = road + 2 + Math.floor(hashAt(i, 62) * 20);
    for (let j = 0; j < 6; j++) {
      rect(x, y, 3, 1, "#0c0e15");
      x += 3;
      y += hashAt(i, j) < 0.5 ? 1 : -1;
    }
  }
  for (const [x, lean] of [[150, 0], [470, -1], [846, 0]]) lampPost(k, x, street + 2, lean, "#1e2230", 72);
  for (const x of [150, 846]) for (const [w, h, a] of [[44, 8, 0.05], [30, 5, 0.06]]) rect(x + 12 - w, kerb - 10 - h / 2, w * 2, h, `rgba(255,210,122,${a})`);
  wreck(k, 780, kerb - 4, "#1c2232", "#46506c", "#2a3656", 1);
  rect(778, kerb - 18, 3, 3, "#fff4d0");
  for (let i = 0; i < 130; i++) rect(777 - i, kerb - 18 - i * 0.06, 1, 3 + i * 0.14, "rgba(255,240,200,0.045)"); // its beam down the road
  for (const [x, y, f] of [[36, kerb - 2, 1], [68, kerb, 1], [126, kerb - 3, -1], [700, kerb - 1, 1], [900, kerb - 2, -1], [934, kerb, -1]]) walker(k, x, y, f, "#06080e");
  rect(0, kerb, W, 2, "#3a3f50");
  // the near pavement, and two of the dead already on it
  const wallTop = kerb + 14;
  rect(0, kerb + 2, W, wallTop - kerb - 2, "#232734");
  for (let x = 14; x < W; x += 36) rect(x, kerb + 2, 1, wallTop - kerb - 2, "#1c1f2a");
  for (const [x, f] of [[24, 1], [812, -1]]) walker(k, x, wallTop - 1, f, "#05070c", 1.3);
  // mist drifting along the street
  for (let y = HZ; y < wallTop; y += 2) rect(0, y, W, 2, `rgba(140,160,210,${(0.05 * Math.sin((Math.PI * (y - HZ)) / (wallTop - HZ))).toFixed(3)})`);

  // the low wall and its railings, the gate torn open in the middle, crumbled on the right
  const lawnTop = wallTop + 14, railTop = wallTop - 28;
  const gateA = 412, gateB = 548; // the gateway, between its two pillars
  const crumbled = (x) => x >= 850 && x <= 900;
  for (let x = 0; x < W; x += 10) {
    if ((x > gateA - 16 && x < gateB + 16) || crumbled(x) || x === 60 || x === 70) continue;
    rect(x + 3, railTop + 2, 2, wallTop - railTop - 2, IRON);
    rect(x + 3, railTop, 2, 2, IRON_LT);
  }
  line(63, wallTop - 1, 56, railTop + 4, IRON, 2); // bent bars
  line(73, wallTop - 1, 80, railTop + 6, IRON, 2);
  for (const y of [railTop + 4, wallTop - 4]) for (const [a, b] of [[0, gateA - 16], [gateB + 16, 850], [900, W]]) rect(a, y, b - a, 2, IRON);
  for (let x = 0; x < W; x++) {
    if ((x >= gateA && x < gateB) || crumbled(x)) continue;
    rect(x, wallTop, 1, 3, STONE_LT);
    rect(x, wallTop + 3, 1, 11, STONE);
    if ((x + (x % 24 < 12 ? 0 : 6)) % 12 === 0) rect(x, wallTop + 3, 1, 11, STONE_DK); // stone joints
  }
  rect(0, wallTop + 8, gateA, 1, STONE_DK);
  rect(gateB, wallTop + 8, 850 - gateB, 1, STONE_DK);
  rect(900, wallTop + 8, W - 900, 1, STONE_DK);
  for (let i = 0; i < 50; i++) { // the crumbled stretch: a heap of stones, a broken stub at each end
    const x = 846 + Math.floor(hashAt(i, 81) * 58), y = wallTop + 4 + Math.floor(hashAt(i, 82) * 10);
    rect(x, y, 4, 3, hashAt(i, 83) < 0.5 ? STONE : STONE_DK);
  }
  rect(846, wallTop + 2, 6, 12, STONE);
  rect(898, wallTop + 5, 6, 9, STONE);
  walker(k, 872, wallTop + 6, -1, "#05070c", 1.45); // climbing through
  for (const [a, b] of [[gateA - 16, gateA], [gateB, gateB + 16], [176, 190], [764, 778]]) { // pillars
    rect(a, railTop - 6, b - a, lawnTop - railTop + 6, STONE);
    rect(a, railTop - 6, 2, lawnTop - railTop + 6, STONE_LT);
    rect(b - 2, railTop - 6, 2, lawnTop - railTop + 6, STONE_DK);
    rect(a - 2, railTop - 10, b - a + 4, 4, STONE_LT);
  }

  // the courtyard: the lawn mown in stripes running down towards the gate, the path to it
  for (let y = lawnTop; y < H; y++) {
    for (let x = 0; x < W; ) {
      const stripe = (xx) => Math.floor(((xx - VP.x) / (y - VP.y)) * 6) & 1;
      const s = stripe(x);
      let w = 1;
      while (x + w < W && stripe(x + w) === s) w++;
      rect(x, y, w, 1, s ? "#142219" : "#17271d");
      x += w;
    }
  }
  for (let i = 0; i < 700; i++) {
    const x = Math.floor(hashAt(i, 60) * W), y = lawnTop + Math.floor(hashAt(i, 61) * (H - lawnTop));
    rect(x, y, 1, 1, hashAt(i, 62) < 0.55 ? "#0f1a13" : "#22382a");
  }
  const pathA = 351, pathB = 609; // the path's edges where they'd meet the bottom of the picture
  for (let y = lawnTop; y < H; y++) {
    const a = toward(pathA, y), b = toward(pathB, y);
    rect(a - 1, y, b - a + 2, 1, "#20222a");
    rect(a, y, b - a, 1, (Math.floor(Math.log(y - VP.y) * 14) & 1) ? "#33363f" : "#373a45"); // paving rows, deeper as they near
  }
  // hedges along the wall, flowers in front of them
  for (const [a, b] of [[0, gateA - 22], [gateB + 22, W]]) {
    for (let x = a; x < b; x++) {
      const h = 9 + Math.round(Math.sin(x / 5) * 1.5 + hashAt(x, 84) * 2);
      rect(x, lawnTop + 12 - h, 1, h, "#0c160f");
      if (hashAt(x, 85) < 0.5) rect(x, lawnTop + 12 - h, 1, 1, "#22382a");
      if (hashAt(x, 86) < 0.05) rect(x, lawnTop + 13 + Math.floor(hashAt(x, 88) * 3), 1, 1, ["#6a4250", "#6e6434", "#44305e", "#5a5e6a"][Math.floor(hashAt(x, 87) * 4)]);
    }
  }
  // the bench, the fire barrel, the bicycle, the bin, the flag at half mast
  const by = lawnTop + 26;
  for (const y of [by, by + 5]) {
    rect(40, y, 70, 3, "#4a3a2c");
    rect(40, y, 70, 1, "#6a5440");
  }
  for (const x of [44, 104]) rect(x, by + 8, 2, 8, IRON);
  const fx = 172, fy = lawnTop + 34;
  for (const [r, a] of [[80, 0.04], [50, 0.06], [28, 0.08]]) disc(fx, fy - 10, r, `rgba(255,140,70,${a})`);
  rect(fx - 9, fy - 16, 18, 18, "#3a3230");
  for (const y of [fy - 13, fy - 4]) rect(fx - 9, y, 18, 2, "#2a2422");
  rect(fx - 9, fy - 16, 2, 18, "#5a4a40");
  for (let i = 0; i < 12; i++) rect(fx - 7 + Math.floor(hashAt(i, 88) * 14), fy - 18 - Math.floor(hashAt(i, 89) * 10), 2, 3, ["#ffd27a", "#ffb060", "#ff7a3a"][i % 3]);
  for (let i = 0; i < 8; i++) rect(fx - 10 + Math.floor(hashAt(i, 90) * 22), fy - 34 - Math.floor(hashAt(i, 91) * 40), 1, 1, "#ffb060"); // sparks
  for (const [cx, cy] of [[792, lawnTop + 32], [812, lawnTop + 33]]) for (const [rx, c] of [[8, "#2a2e3a"], [6, "#1f3628"]]) {
    for (let y = -3; y <= 3; y++) rect(cx - Math.round(rx * Math.sqrt(1 - (y * y) / 9)), cy + y, 2 * Math.round(rx * Math.sqrt(1 - (y * y) / 9)) + 1, 1, c);
  }
  line(792, lawnTop + 32, 802, lawnTop + 28, "#7a2a2a", 2);
  line(802, lawnTop + 28, 812, lawnTop + 33, "#7a2a2a", 2);
  rect(856, lawnTop + 30, 22, 10, "#24403a");
  rect(856, lawnTop + 30, 22, 2, "#36584e");
  for (let i = 0; i < 10; i++) rect(846 - Math.floor(hashAt(i, 92) * 14), lawnTop + 34 + Math.floor(hashAt(i, 93) * 8), 2, 1, i % 2 ? "#8a8a84" : "#4a3a2a");
  const pole = 912;
  rect(pole, 236, 2, lawnTop + 30 - 236, "#5a6070");
  rect(pole + 2, 236, 1, lawnTop + 30 - 236, "#4a5060");
  disc(pole + 1, 234, 2, "#c8a848");
  for (let y = 0; y < 14; y++) rect(pole + 3, 316 + y, 30 - (y % 2) * 2 - (y > 9 ? 4 : 0), 1, y < 3 ? "#9a3434" : "#7a2626");

  // the steps underfoot: three treads going down towards the lawn, the cheek walls and handrails
  // either side; the school's lit windows behind throw a warm light down them
  const steps = [[470, 492], [492, 514], [514, H]];
  for (const [y0, y1] of steps) {
    for (let y = y0; y < y1; y++) rect(0, y, W, 1, y < y0 + 2 ? STONE_LT : y === y0 + 2 ? STONE_DK : STONE);
    rect(0, y0 - 1, W, 1, "#24262e"); // the drop to the step below
    for (let i = 0; i < W * 0.5; i++) {
      const x = Math.floor(hashAt(i, 94 + y0) * W), y = y0 + 3 + Math.floor(hashAt(i, 95 + y0) * (y1 - y0 - 3));
      rect(x, y, 1, 1, hashAt(i, 96) < 0.5 ? "#3e4150" : "#50546a");
    }
    for (let xb = (y0 % 2) * 40; xb <= W; xb += 80) line(toward(xb, y0 + 3), y0 + 3, toward(xb, y1 - 1), y1 - 1, "#363946"); // slab joints
  }
  for (let i = 0; i < 18; i++) { // spent shells
    const x = hashAt(i, 97) < 0.5 ? 180 + Math.floor(hashAt(i, 98) * 40) : 740 + Math.floor(hashAt(i, 98) * 40);
    const y = steps[0][0] + 4 + Math.floor(hashAt(i, 99) * (H - steps[0][0] - 8));
    rect(x, y, 2, 1, "#c8a040");
    rect(x + 2, y, 1, 1, "#8a6a2a");
  }
  line(186, H - 14, 222, H - 24, "#7a5a3c", 3); // a dropped bat
  rect(184, H - 15, 5, 4, "#2a2018");
  rect(752, steps[1][0] + 6, 18, 13, "#2f4f80"); // a backpack
  rect(752, steps[1][0] + 6, 18, 4, "#3f63a0");
  rect(759, steps[1][0] + 10, 4, 2, "#c8b060");
  for (let i = 0; i < 26; i++) if (hashAt(i, 100) < 0.6) rect(232 + i * 1.4, H - 30 + Math.sin(i / 3) * 3, 2, 2, "#5a1a1a"); // blood
  const stepTop = steps[0][0] - 8;
  for (let y = stepTop; y < H; y++) {
    const s = (y - VP.y) / (H - VP.y);
    const face = Math.round(4 + 10 * s);
    const l = toward(40, y), r = toward(920, y);
    rect(0, y, l, 1, y < stepTop + 3 ? STONE_LT : "#50546a");
    rect(l - 2, y, 2, 1, STONE_LT);
    rect(l, y, face, 1, STONE_DK);
    rect(r, y, W - r, 1, y < stepTop + 3 ? STONE_LT : "#50546a");
    rect(r - face, y, face, 1, "#262832");
  }
  for (const xb of [18, 942]) { // the handrails on their posts
    const at = (y) => [toward(xb, y), y - 46 * ((y - VP.y) / (H - VP.y))];
    for (let y = stepTop; y < H + 40; y++) {
      const [x, ry] = at(y);
      rect(x - 1, ry, 3, 2, IRON);
      rect(x - 1, ry - 1, 3, 1, IRON_LT);
    }
    for (const y of [stepTop + 4, stepTop + 44, H - 4]) {
      const [x, ry] = at(y);
      rect(x - 1, ry, 3, y - ry, IRON);
    }
  }
  for (let y = stepTop; y < H; y += 2) rect(0, y, W, 2, `rgba(255,190,110,${((0.12 * (y - stepTop)) / (H - stepTop)).toFixed(3)})`);
  return k.cv.toDataURL("image/png");
}

export function installBackdrop(root = document.documentElement) {
  root.style.setProperty("--sky-morning", `url("${drawMorning()}")`);
  root.style.setProperty("--sky-dusk", `url("${drawDusk()}")`);
  root.style.setProperty("--sky-night", `url("${drawNight()}")`);
}
