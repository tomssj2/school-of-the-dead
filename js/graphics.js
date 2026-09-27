// Graphics quality — Low / Medium / High — remembered on this device apart from the save file.
// It's set as <html data-gfx="…">, and style.css turns effects off per level: Medium drops the
// ambient looping animations, Low goes fully static and flat.
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
