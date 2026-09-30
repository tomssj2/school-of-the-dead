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

// A burst of filtered white noise — the body of shots, swings and explosions.
function noise(duration, { gain = 0.2, delay = 0, filter = "lowpass", freq = 1200 } = {}) {
  if (!isSoundEnabled()) return;
  try {
    const audio = getContext();
    const start = audio.currentTime + delay;
    const buffer = audio.createBuffer(1, Math.max(1, Math.floor(audio.sampleRate * duration)), audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const biquad = audio.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.value = freq;
    const amp = audio.createGain();
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.001, start + duration);
    src.connect(biquad).connect(amp).connect(audio.destination);
    src.start(start);
    src.stop(start + duration + 0.02);
  } catch (e) {
    // never let audio break the game
  }
}

// ----- the fights -----
export function playShot() {
  noise(0.09, { gain: 0.22, filter: "highpass", freq: 1600 });
  tone(1100, 0.06, { type: "square", gain: 0.05, glideTo: 300 });
}
export function playSwing() {
  noise(0.12, { gain: 0.2, filter: "bandpass", freq: 700 });
  tone(140, 0.09, { type: "square", gain: 0.12, delay: 0.05 });
}
export function playCrit() {
  tone(1320, 0.08, { type: "triangle", gain: 0.16 });
  tone(1980, 0.14, { type: "triangle", gain: 0.13, delay: 0.06 });
}
export function playKill() {
  tone(260, 0.22, { type: "sawtooth", gain: 0.09, glideTo: 70 });
  noise(0.15, { gain: 0.1, freq: 500, delay: 0.03 });
}
export function playBoom() {
  noise(0.4, { gain: 0.32, freq: 320 });
  tone(70, 0.35, { type: "sine", gain: 0.3, glideTo: 40 });
}
export function playGrowl() {
  tone(120, 0.45, { type: "sawtooth", gain: 0.12, glideTo: 70 });
  noise(0.4, { gain: 0.08, freq: 260 });
}
export function playAbility() {
  tone(440, 0.08, { type: "triangle", gain: 0.15 });
  tone(660, 0.08, { type: "triangle", gain: 0.15, delay: 0.06 });
  tone(990, 0.18, { type: "triangle", gain: 0.15, delay: 0.12 });
  noise(0.25, { gain: 0.08, filter: "highpass", freq: 3000, delay: 0.1 });
}
export function playWave() {
  tone(392, 0.12, { type: "square", gain: 0.1 });
  tone(523, 0.12, { type: "square", gain: 0.1, delay: 0.12 });
  tone(659, 0.12, { type: "square", gain: 0.1, delay: 0.24 });
  tone(784, 0.3, { type: "square", gain: 0.12, delay: 0.36 });
}
export function playHeal() {
  tone(660, 0.1, { gain: 0.12 });
  tone(880, 0.2, { gain: 0.12, delay: 0.08 });
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
