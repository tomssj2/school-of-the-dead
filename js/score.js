// The best run on this device: the last day a school stood, whether it fell or was evacuated.
// Kept apart from the save file so starting a new game doesn't wipe it.
const BEST_KEY = "school-apocalypse-best";

export function getBest() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY)) || null;
  } catch {
    return null;
  }
}

// Called while a run's end screen is up (it can be called again if the run carries on after an
// evacuation and ends later). Keeps whichever run lasted longest.
export function recordRun(state, survivors) {
  const best = getBest();
  if (best && best.day >= state.day) return;
  try {
    localStorage.setItem(BEST_KEY, JSON.stringify({ day: state.day, runId: state.runId, survivors, evacuated: !!state.victory }));
  } catch {
    // storage blocked — the score just isn't remembered
  }
}

export const isBestRun = (state) => getBest()?.runId === state.runId;
