// The lighting every painted scene shares — the Night Watch board, the fight backdrops, the room
// banners: a pixel buffer of colours (plus an "emissive" flag for things that give off their own
// light: lit glass, bulbs, screens, flames, the night sky), and lightUp, which lights it — the
// ambient times each pixel's colour, plus every light's pool or beam in stepped bands with a
// checkered seam between them — into a PNG data: URL.

import { mix } from "./sprite.js";

export function hash(i, s) {
  let x = Math.imul(i + 17, 2654435761) ^ Math.imul(s + 3, 40503);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}
export const hash2 = (x, y, s) => hash(x * 977 + y * 131, s);

const rgbCache = new Map();
export function rgb(hex) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1, 7), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

// A pixel buffer: colours plus the emissive flag, which the lighting pass leaves as drawn. A colour
// with an alpha ("#rrggbbaa") is blended over what's already there.
export function buffer(w, h) {
  const col = new Array(w * h).fill(null);
  const glow = new Uint8Array(w * h);
  const set = (x, y, c, e = 0) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (c && c.length === 9) {
      const a = parseInt(c.slice(7, 9), 16) / 255;
      col[i] = mix(col[i] || "#000000", c.slice(0, 7), a);
      if (e) glow[i] = e;
      return;
    }
    col[i] = c;
    glow[i] = e;
  };
  return {
    w, h, col, glow, set,
    r(x0, y0, x1, y1, c, e = 0) {
      for (let y = Math.round(y0); y <= Math.round(y1); y++) for (let x = Math.round(x0); x <= Math.round(x1); x++) set(x, y, c, e);
    },
    oval(cx, cy, rx, ry, c, e = 0) {
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
          if (((x - cx) / (rx + 0.35)) ** 2 + ((y - cy) / (ry + 0.35)) ** 2 <= 1) set(x, y, c, e);
    },
    line(x0, y0, x1, y1, c, e = 0) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= n; i++) set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c, e);
    },
  };
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
export const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];

// The night's ambient (moonlight), the default.
export const NIGHT = [0.34, 0.38, 0.6];
// The town at dusk (Turn 2): the City Map's light, which map.js also grades its tiles with, so a
// place looks the same in a pop-up as on the map.
export const DUSK = [0.85, 0.75, 0.7];

// Lights each pixel: the ambient plus every light — a pool ({ x, y, r, sy, k, c }) or a beam shining
// straight down ({ x, y, len, w0, spread, k, c }) — in steps, so the light falls off in bands like
// the rest of the pixel art. Then the mist at the bottom (`mist: false` for none). A buffer may give
// its pixels as rgbAt(i) -> [r, g, b] instead of col (the City Map's packed one does).
export function lightUp(p, lights, { ambient = NIGHT, mist: misty = true } = {}) {
  const { w, h } = p;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d");
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const mist = [118, 130, 166];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const base = p.rgbAt ? p.rgbAt(i) : rgb(p.col[i] || "#000000");
      let out;
      if (p.glow[i]) out = base.slice();
      else {
        const L = ambient.slice();
        for (const l of lights) {
          let v;
          if (l.len) {
            // a beam: straight down from (x, y), widening, fading with distance, a crisp edge
            const dy = y - l.y;
            if (dy < 0 || dy > l.len) continue;
            const half = l.w0 + dy * l.spread;
            const dx = Math.abs(x - l.x);
            if (dx > half) continue;
            v = (1 - dy / l.len) ** 0.8 * (1 - (dx / half) ** 4) * l.k * 5;
          } else {
            const dist = Math.hypot(x - l.x, (y - l.y) * (l.sy || 1)) / l.r;
            if (dist >= 1) continue;
            v = (1 - dist) ** 1.35 * l.k * 5;
          }
          const f = (Math.floor(v) + (v % 1 > 0.72 && (x + y) % 2 ? 1 : 0)) / 5; // a checkered seam between bands
          if (f > 0) for (let k = 0; k < 3; k++) L[k] += l.c[k] * f;
        }
        out = base.map((v, k) => v * L[k]);
      }
      const mt = (y - (h - 20)) / 20;
      if (misty && mt > 0) {
        const a = Math.floor((mt * mt * 0.6 + Math.sin(x / 9 + y * 0.8) * 0.06) * 6 + bayer(x, y)) / 6;
        if (a > 0) out = out.map((v, k) => v + (mist[k] - v) * Math.min(0.7, a));
      }
      d[i * 4] = Math.min(255, out[0]);
      d[i * 4 + 1] = Math.min(255, out[1]);
      d[i * 4 + 2] = Math.min(255, out[2]);
      d[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}
