// Display settings, remembered on this device apart from the save file.
//
// Graphics quality — Low / Medium / High — is set as <html data-gfx="…">, and style.css turns
// effects off per level: Medium drops the ambient looping animations, Low goes fully static and flat.
//
// UI size: the game is laid out for a 1080p window (DESIGN_W × DESIGN_H CSS pixels) and zoomed to
// fit whatever window it's in — 0.67× at 720p, 2× at 4K — so every screen shows the same layout.
// UI Size (a slider, 50–200%) then shrinks or enlarges it on top of that. The app is a frame as tall as the
// window (--frame-h), anchored to the top: the page itself never scrolls, long screens scroll
// inside their content area.
const GFX_KEY = "school-apocalypse-gfx";
export const GFX_LEVELS = ["low", "medium", "high"];

export function getGraphics() {
  try {
    const v = localStorage.getItem(GFX_KEY);
    return GFX_LEVELS.includes(v) ? v : "high";
  } catch {
    return "high";
  }
}

export function applyGraphics() {
  document.documentElement.dataset.gfx = getGraphics();
}

export function setGraphics(level) {
  if (!GFX_LEVELS.includes(level)) return;
  try {
    localStorage.setItem(GFX_KEY, level);
  } catch {
    // storage blocked — the choice just lasts for this visit
    document.documentElement.dataset.gfx = level;
    return;
  }
  applyGraphics();
}

const SIZE_KEY = "school-apocalypse-uisize";
export const UI_SIZE = { min: 50, max: 200, step: 5 };
const fitUiSize = (v) => Math.min(UI_SIZE.max, Math.max(UI_SIZE.min, Math.round(v / UI_SIZE.step) * UI_SIZE.step));
let uiSizeNow = null; // this visit's size, in case storage is blocked

export function getUiSize() {
  if (uiSizeNow !== null) return uiSizeNow;
  try {
    const v = Number(localStorage.getItem(SIZE_KEY));
    return v ? fitUiSize(v) : 100;
  } catch {
    return 100;
  }
}

// The window the layout is made for: a maximised browser on a 1080p screen (its height, less the
// browser's own bars). The zoom follows the width, or the height on a very wide window.
const DESIGN_W = 1920;
const DESIGN_H = 900;

export function applyUiScale() {
  const fit = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
  const scale = fit * (getUiSize() / 100);
  document.documentElement.style.zoom = String(scale);
  document.documentElement.style.setProperty("--frame-h", `${Math.floor(window.innerHeight / scale)}px`);
}

export function setUiSize(size) {
  if (!Number.isFinite(Number(size))) return;
  uiSizeNow = fitUiSize(Number(size));
  try {
    localStorage.setItem(SIZE_KEY, String(uiSizeNow));
  } catch {
    // storage blocked — the choice lasts for this visit
  }
  applyUiScale();
}
