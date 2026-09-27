// Display settings, remembered on this device apart from the save file.
//
// Graphics quality — Low / Medium / High — is set as <html data-gfx="…">, and style.css turns
// effects off per level: Medium drops the ambient looping animations, Low goes fully static and flat.
//
// Resolution: the page is laid out for a 1280×720 window and zoomed like a game's UI — 1× at 720p,
// 1.5× at 1080p, 2× at 1440p, 3× at 4K. "Auto" picks the scale from the window's width; a fixed
// resolution keeps that scale whatever the window size. The app is a fixed-height frame
// (--frame-h) anchored to the top: the window's height in Auto, up to 720 layout pixels at a fixed
// resolution — the page itself never scrolls; long screens scroll inside their content area.
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

const RES_KEY = "school-apocalypse-res";
const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
export const RESOLUTIONS = [
  { id: "auto", label: "Auto (fit window)" },
  { id: "720", label: "1280 × 720 (720p)" },
  { id: "1080", label: "1920 × 1080 (1080p)" },
  { id: "1440", label: "2560 × 1440 (1440p)" },
  { id: "2160", label: "3840 × 2160 (4K)" },
];

export function getResolution() {
  try {
    const v = localStorage.getItem(RES_KEY);
    return RESOLUTIONS.some((r) => r.id === v) ? v : "auto";
  } catch {
    return "auto";
  }
}

export function applyUiScale() {
  const res = getResolution();
  const scale = res === "auto" ? Math.max(0.5, window.innerWidth / DESIGN_WIDTH) : Number(res) / DESIGN_HEIGHT;
  // The frame is as tall as the window — and never taller than 720 layout pixels at a fixed
  // resolution — so the page itself never scrolls vertically.
  const winH = window.innerHeight / scale;
  const frame = res === "auto" ? winH : Math.min(DESIGN_HEIGHT, winH);
  document.documentElement.style.zoom = String(scale);
  document.documentElement.style.setProperty("--frame-h", `${Math.floor(frame)}px`);
}

export function setResolution(id) {
  if (!RESOLUTIONS.some((r) => r.id === id)) return;
  try {
    localStorage.setItem(RES_KEY, id);
  } catch {
    // storage blocked — the choice isn't remembered
  }
  applyUiScale();
}
