// Tiny procedural sound effects via the Web Audio API — the project has no audio assets (same
// "everything generated, nothing external" approach as the pixel-art sprites), so every sound
// here is a short synthesized tone. The AudioContext is created lazily on first play so it's
// always triggered by a real user gesture, satisfying browser autoplay restrictions.

const SOUND_KEY = "school-apocalypse-sound-enabled";

let ctx = null;
function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function isSoundEnabled() {
  const v = localStorage.getItem(SOUND_KEY);
  return v === null ? true : v === "1";
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
}

function tone(freq, duration, { type = "sine", gain = 0.2, delay = 0, glideTo = null } = {}) {
  if (!isSoundEnabled()) return;
  try {
    const audio = getContext();
    const start = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (glideTo) osc.frequency.linearRampToValueAtTime(glideTo, start + duration);
    amp.gain.setValueAtTime(0, start);
    amp.gain.linearRampToValueAtTime(gain, start + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch (e) {
    // Audio is a nice-to-have — never let it break the game.
  }
}

export function playHit() {
  tone(90, 0.18, { type: "square", gain: 0.25 });
}

export function playSuccess() {
  tone(523, 0.12, { gain: 0.18 });
  tone(659, 0.12, { gain: 0.18, delay: 0.1 });
  tone(784, 0.18, { gain: 0.18, delay: 0.2 });
}

export function playFail() {
  tone(300, 0.35, { type: "sawtooth", gain: 0.15, glideTo: 120 });
}

export function playChime() {
  tone(660, 0.15, { gain: 0.14 });
  tone(880, 0.25, { gain: 0.14, delay: 0.12 });
}
