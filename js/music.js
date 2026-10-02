// Music, made the way the sound effects (sound.js) and the pixel art are: in code, nothing loaded.
// Each mood is a little band playing live through the Web Audio API — synths for an electric
// piano, a bass, drums, pads, a choir, brass and strings — a sixteenth at a time, scheduled a
// moment ahead of the clock:
//   morning    Turn 1   lofi: a dusty electric piano over a lazy swung beat and vinyl crackle
//   afternoon  Turn 2   chillhop: quicker, a plucked arpeggio, busier drums
//   night      Turn 3   tense: a dark pad, a pulsing bass, a heartbeat kick, a music box
//   fight               driving: rock drums, an eighth-note bass, a string ostinato, a lead
//   boss                epic: taiko, a choir, galloping low strings and a brass theme
// The moods cross-fade into each other. Nothing plays until the first click or key press (browsers
// don't allow it), or while the Music option is off.

import { audioContext } from "./sound.js";

const MUSIC_KEY = "school-apocalypse-music-enabled";
const VOLUME = 0.42; // at 100% on the slider
const VOLUME_KEY = "school-apocalypse-music-volume";

// The Music volume slider, 0-100 (the gain is its square, so the slider feels even).
export function getMusicVolume() {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return localStorage.getItem(VOLUME_KEY) === null || !Number.isFinite(v) ? 100 : Math.max(0, Math.min(100, v));
  } catch {
    return 100;
  }
}
const level = () => (isMusicEnabled() ? Math.max(0.0001, VOLUME * (getMusicVolume() / 100) ** 2) : 0.0001);
export function setMusicVolume(v) {
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {
    // the setting just won't stick
  }
  if (!E) return;
  const now = E.ac.currentTime;
  E.master.gain.cancelScheduledValues(now);
  E.master.gain.setValueAtTime(E.master.gain.value, now);
  E.master.gain.linearRampToValueAtTime(level(), now + 0.08);
}

export function isMusicEnabled() {
  try {
    const v = localStorage.getItem(MUSIC_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setMusicEnabled(on) {
  try {
    localStorage.setItem(MUSIC_KEY, on ? "1" : "0");
  } catch {
    // the setting just won't stick
  }
  if (!E) return;
  const now = E.ac.currentTime;
  E.master.gain.cancelScheduledValues(now);
  E.master.gain.setValueAtTime(E.master.gain.value, now);
  E.master.gain.linearRampToValueAtTime(level(), now + 0.4);
  if (on) switchTo(wanted);
  else switchTo(null);
}

// ---------- notes, chords, randomness ----------

const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function hash(n, s) {
  let x = Math.imul((n | 0) + 0x9e3779b9, 2654435761) ^ Math.imul((s | 0) + 13, 40503);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}

// root: the bass note; notes: the voicing the chords play; extra parts per mood
const CH = {
  // the morning, in C
  Fmaj9: { root: 41, notes: [57, 60, 64, 67] },
  Em7: { root: 40, notes: [55, 59, 62, 64] },
  Dm9: { root: 38, notes: [53, 57, 60, 64] },
  Cmaj9: { root: 36, notes: [52, 55, 59, 62] },
  G13: { root: 43, notes: [53, 59, 64, 69] },
  Am9: { root: 45, notes: [55, 59, 60, 64] },
  // the afternoon, in A minor
  Fmaj7: { root: 41, notes: [52, 57, 60, 64] },
  Cmaj7: { root: 48, notes: [52, 55, 59, 62] },
  G6: { root: 43, notes: [55, 59, 62, 64] },
  // the night, in D minor
  nDm: { root: 38, notes: [50, 53, 57, 64] },
  nBb: { root: 34, notes: [50, 53, 58, 62] },
  nGm: { root: 31, notes: [50, 55, 58, 62] },
  nA: { root: 33, notes: [49, 52, 57, 61] },
  // the fight, in E minor: power-chord stabs and the strings' chord tones
  fEm: { root: 40, stab: [52, 59, 64], strings: [64, 67, 71] },
  fC: { root: 36, stab: [48, 55, 60], strings: [64, 67, 72] },
  fD: { root: 38, stab: [50, 57, 62], strings: [66, 69, 74] },
  fB: { root: 35, stab: [47, 54, 59], strings: [63, 66, 71] },
  fAm: { root: 45, stab: [45, 52, 57], strings: [64, 69, 72] },
  // the boss, in C minor: the choir and the brass
  bCm: { root: 36, choir: [55, 60, 63, 67], stab: [48, 55, 60, 63] },
  bAb: { root: 32, choir: [56, 60, 63, 68], stab: [44, 51, 56, 60] },
  bEb: { root: 39, choir: [55, 58, 63, 67], stab: [51, 55, 58, 63] },
  bBb: { root: 34, choir: [53, 58, 62, 65], stab: [46, 53, 58, 62] },
  bG: { root: 31, choir: [55, 59, 62, 67], stab: [43, 50, 55, 59] },
};

// A short melodic idea for one bar: a few notes on the sixteenths, walking up and down `scale`
// from `start`, remembered so a phrase can come back to it (`i` is each note's place in the scale,
// so the answering bar can play it a step lower).
function motif(T, key, scale, density, start) {
  if (T.mem[key]) return T.mem[key];
  const slots = [0, 2, 3, 4, 6, 8, 10, 11, 12, 14];
  const chosen = slots.filter((p, i) => p === 0 || hash(key * 17 + i, T.seed) < density);
  let idx = start;
  const notes = chosen.map((p, i) => {
    if (i > 0) idx = Math.max(0, Math.min(scale.length - 1, idx + [-2, -1, -1, 1, 1, 2, 0][Math.floor(hash(key * 29 + i, T.seed + 1) * 7)]));
    return { p, i: idx, note: scale[idx], len: Math.min(6, (chosen[i + 1] ?? 16) - p), vel: 0.5 + hash(key * 31 + i, T.seed + 2) * 0.3 };
  });
  T.mem[key] = notes;
  return notes;
}

// A melody note that would grind a semitone against the chord (and isn't in it) slides onto the
// chord tone it was rubbing against.
function fit(note, ch) {
  const pcs = new Set([ch.root, ...(ch.notes || [])].map((m) => ((m % 12) + 12) % 12));
  const pc = ((note % 12) + 12) % 12;
  if (pcs.has(pc)) return note;
  if (pcs.has((pc + 1) % 12)) return note + 1;
  if (pcs.has((pc + 11) % 12)) return note - 1;
  return note;
}

// ---------- the engine: a master bus, a reverb and an echo every mood shares ----------

function impulse(ac, seconds) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3.2;
  }
  return buf;
}

function makeEngine(ac, destination) {
  const master = ac.createGain();
  master.gain.value = VOLUME;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 10;
  comp.ratio.value = 3.5;
  comp.attack.value = 0.008;
  comp.release.value = 0.25;
  master.connect(comp).connect(destination);
  const reverb = ac.createConvolver();
  reverb.buffer = impulse(ac, 2.6);
  const reverbOut = ac.createGain();
  reverbOut.gain.value = 0.5;
  reverb.connect(reverbOut).connect(master);
  // a tape-ish echo: darker each repeat
  const delay = ac.createDelay(2);
  const echoTone = ac.createBiquadFilter();
  echoTone.type = "lowpass";
  echoTone.frequency.value = 2200;
  const feedback = ac.createGain();
  feedback.gain.value = 0.34;
  delay.connect(echoTone).connect(feedback).connect(delay);
  const echoOut = ac.createGain();
  echoOut.gain.value = 0.5;
  echoTone.connect(echoOut).connect(master);
  const noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return { ac, master, reverb, delay, noise };
}

// ---------- a mood's band: its own faders into the shared buses ----------

function makeTrack(E, mood, at) {
  const def = MOODS[mood];
  const { ac } = E;
  const fader = (dest) => {
    const g = ac.createGain();
    g.gain.value = 0.0001;
    g.connect(dest);
    return g;
  };
  const tone = ac.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = def.cutoff;
  tone.Q.value = 0.5;
  const dryFade = fader(E.master);
  tone.connect(dryFade);
  const T = {
    mood, def, E, ac,
    dry: tone, rev: fader(E.reverb), echo: fader(E.delay), fades: null,
    step: 0, next: at, stepDur: 60 / def.bpm / 4, beat: 60 / def.bpm,
    seed: Math.floor(Math.random() * 100000), mem: {}, sources: [],
  };
  T.fades = [dryFade, T.rev, T.echo];
  E.delay.delayTime.setValueAtTime(def.echo * T.beat, at);
  if (def.crackle) {
    // vinyl: a hiss and the odd pop, on a loop
    const len = ac.sampleRate * 3;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.05;
    for (let k = 0; k < 40; k++) {
      const at0 = Math.floor(Math.random() * (len - 60));
      const amp = (Math.random() < 0.2 ? 0.9 : 0.35) * (Math.random() < 0.5 ? -1 : 1);
      for (let j = 0; j < 40; j++) d[at0 + j] += amp * Math.exp(-j / 6) * (j % 2 ? -1 : 1);
    }
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const band = ac.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 2400;
    band.Q.value = 0.6;
    const g = ac.createGain();
    g.gain.value = def.crackle;
    src.connect(band).connect(g).connect(dryFade);
    src.start(at);
    T.sources.push(src);
  }
  return T;
}

function fadeTo(T, value, time, dur) {
  for (const g of T.fades) {
    g.gain.cancelScheduledValues(time);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), time);
    g.gain.linearRampToValueAtTime(value, time + dur);
  }
}

// Schedules the band's sixteenths up to `until` (seconds on the audio clock).
function schedule(T, until) {
  while (T.next < until) {
    const s = T.step;
    const swing = s % 2 ? (T.def.swing - 0.5) * 2 * T.stepDur : 0;
    const t = T.next + swing + Math.random() * (T.def.humanize ?? 0.006);
    try {
      T.def.play(T, s, t);
    } catch (err) {
      console.error("music:", err);
    }
    T.step++;
    T.next += T.stepDur;
  }
}

// ---------- the instruments ----------

function out(T, node, { rev = 0.2, echo = 0 } = {}, name = "") {
  if (T.solo && !T.solo.includes(name)) return; // (testing: only some instruments)
  node.connect(T.dry);
  if (rev) {
    const g = T.ac.createGain();
    g.gain.value = rev;
    node.connect(g).connect(T.rev);
  }
  if (echo) {
    const g = T.ac.createGain();
    g.gain.value = echo;
    node.connect(g).connect(T.echo);
  }
}
function osc(T, type, freq, t) {
  const o = T.ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  return o;
}
function env(T, t) {
  const g = T.ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  return g;
}
function filter(T, type, freq, q = 0.7) {
  const f = T.ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}
function noiseSrc(T, t, dur) {
  const s = T.ac.createBufferSource();
  s.buffer = T.E.noise;
  s.start(t, Math.random() * 1.5, dur + 0.05);
  return s;
}
function run(nodes, t, end) {
  for (const n of nodes) {
    n.start(t);
    n.stop(end);
  }
}

// An electric piano: a sine bent by another sine (FM), bright at the strike and mellowing out.
function epiano(T, t, midi, len, vel = 0.7, sends = { rev: 0.25 }) {
  const f = mtof(midi) * (1 + (Math.random() - 0.5) * (T.def.wow || 0));
  const car = osc(T, "sine", f, t);
  const mod = osc(T, "sine", f, t);
  const index = T.ac.createGain();
  index.gain.setValueAtTime(f * (0.8 + vel * 1.2), t);
  index.gain.exponentialRampToValueAtTime(f * 0.1, t + 0.7);
  mod.connect(index).connect(car.frequency);
  const a = env(T, t);
  const peak = 0.14 * vel;
  const hold = Math.max(0.4, len);
  a.gain.linearRampToValueAtTime(peak, t + 0.006);
  a.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.3);
  a.gain.exponentialRampToValueAtTime(peak * 0.22, t + hold);
  a.gain.setTargetAtTime(0.0001, t + hold, 0.16);
  car.connect(a);
  out(T, a, sends, "epiano");
  run([car, mod], t, t + hold + 1.1);
}
function strum(T, t, notes, len, vel, spread = 0.014) {
  notes.forEach((m, i) => epiano(T, t + i * spread, m, len - i * spread, vel * (0.85 + 0.3 * Math.random())));
}

// A bass: a round sine (lofi), or a sawtooth through a filter that snaps shut (`snap`).
function bass(T, t, midi, len, { vel = 1, type = "sine", cutoff = 700, gain = 0.3, snap = false } = {}) {
  const f = mtof(midi);
  const o = osc(T, type, f, t);
  const lp = filter(T, "lowpass", snap ? cutoff * 4 : cutoff, snap ? 3 : 0.7);
  if (snap) lp.frequency.exponentialRampToValueAtTime(cutoff, t + 0.1);
  const a = env(T, t);
  const peak = gain * vel * 0.5;
  a.gain.linearRampToValueAtTime(peak, t + 0.008);
  a.gain.exponentialRampToValueAtTime(peak * (snap ? 0.5 : 0.6), t + Math.max(0.02, len));
  a.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
  o.connect(lp);
  const nodes = [o];
  if (type !== "sine") {
    const sub = osc(T, "sine", f, t);
    const sg = T.ac.createGain();
    sg.gain.value = 0.7;
    sub.connect(sg).connect(lp);
    nodes.push(sub);
  }
  lp.connect(a);
  out(T, a, { rev: 0.03 }, "bass");
  run(nodes, t, t + len + 0.1);
}

function kick(T, t, vel = 1, { hi = 140, lo = 46, decay = 0.36, gain = 0.8 } = {}) {
  const o = osc(T, "sine", hi, t);
  o.frequency.exponentialRampToValueAtTime(lo, t + 0.09);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain * vel, t + 0.003);
  a.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(a);
  out(T, a, { rev: 0.02 }, "kick");
  run([o], t, t + decay + 0.02);
  const n = noiseSrc(T, t, 0.02);
  const hp = filter(T, "highpass", 1800);
  const c = env(T, t);
  c.gain.linearRampToValueAtTime(0.12 * vel, t + 0.001);
  c.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
  n.connect(hp).connect(c);
  out(T, c, { rev: 0 }, "kick");
}
function snare(T, t, vel = 1, { tone = 1900, decay = 0.16, gain = 0.26, body = 190 } = {}) {
  const n = noiseSrc(T, t, decay);
  const bp = filter(T, "bandpass", tone, 0.8);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain * vel * 2.5, t + 0.002);
  a.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  n.connect(bp).connect(a);
  out(T, a, { rev: 0.22 }, "snare");
  const o = osc(T, "triangle", body, t);
  const b = env(T, t);
  b.gain.linearRampToValueAtTime(gain * 1.2 * vel, t + 0.002);
  b.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(b);
  out(T, b, { rev: 0.1 }, "snare");
  run([o], t, t + 0.1);
}
function hat(T, t, vel = 1, open = false, gain = 0.08) {
  const d = open ? 0.26 : 0.045;
  const n = noiseSrc(T, t, d);
  const hp = filter(T, "highpass", T.def.hatTone || 7600, 0.7);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain * vel * 4, t + 0.002);
  a.gain.exponentialRampToValueAtTime(0.0001, t + d);
  n.connect(hp).connect(a);
  out(T, a, { rev: 0.05 }, "hat");
}
// A tom or, big and low, a taiko.
function tom(T, t, vel = 1, { hi = 120, lo = 62, decay = 0.5, gain = 0.5, skin = 0.3 } = {}) {
  const o = osc(T, "sine", hi, t);
  o.frequency.exponentialRampToValueAtTime(lo, t + decay * 0.6);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain * vel * 0.85, t + 0.004);
  a.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(a);
  out(T, a, { rev: 0.25 }, "tom");
  run([o], t, t + decay + 0.02);
  const n = noiseSrc(T, t, 0.08);
  const lp = filter(T, "lowpass", 900);
  const s = env(T, t);
  s.gain.linearRampToValueAtTime(gain * skin * vel, t + 0.002);
  s.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  n.connect(lp).connect(s);
  out(T, s, { rev: 0.2 }, "tom");
}
function crash(T, t, vel = 1) {
  const n = noiseSrc(T, t, 1.8);
  const hp = filter(T, "highpass", 4800, 0.5);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(0.18 * vel, t + 0.004);
  a.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  n.connect(hp).connect(a);
  out(T, a, { rev: 0.35 }, "crash");
}

// A slow pad of detuned sawtooths, filtered dark.
function pad(T, t, notes, len, { cutoff = 900, gain = 0.035, attack = 0.8, release = 1.5, detune = 9, rev = 0.5 } = {}) {
  const lp = filter(T, "lowpass", cutoff, 0.4);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain, t + attack);
  a.gain.setValueAtTime(gain, t + Math.max(attack, len));
  a.gain.linearRampToValueAtTime(0.0001, t + Math.max(attack, len) + release);
  const oscs = [];
  for (const m of notes) for (const d of [-detune, detune]) {
    const o = osc(T, "sawtooth", mtof(m), t);
    o.detune.value = d;
    o.connect(lp);
    oscs.push(o);
  }
  lp.connect(a);
  out(T, a, { rev }, "pad");
  run(oscs, t, t + Math.max(attack, len) + release + 0.05);
}

// A choir singing "aah": sawtooths with a vibrato through the vowel's formants.
function choir(T, t, notes, len, { gain = 0.5, attack = 0.9, release = 1.6 } = {}) {
  gain *= 0.5;
  const sum = T.ac.createGain();
  sum.gain.value = 1;
  for (const [f, q, g] of [[800, 6, 1], [1150, 7, 0.55], [2900, 8, 0.25]]) {
    const bp = filter(T, "bandpass", f, q);
    const bg = T.ac.createGain();
    bg.gain.value = g;
    sum.connect(bp).connect(bg);
    bg.connect(T.choirOut || (T.choirOut = choirBus(T)));
  }
  const a = env(T, t);
  const end = t + Math.max(attack, len);
  a.gain.linearRampToValueAtTime(gain, t + attack);
  a.gain.setValueAtTime(gain, end);
  a.gain.linearRampToValueAtTime(0.0001, end + release);
  a.connect(sum);
  const lfo = osc(T, "sine", 5.2, t);
  const depth = T.ac.createGain();
  depth.gain.value = 6;
  lfo.connect(depth);
  const oscs = [lfo];
  for (const m of notes) for (const d of [-7, 7]) {
    const o = osc(T, "sawtooth", mtof(m), t);
    o.detune.value = d;
    depth.connect(o.detune);
    o.connect(a);
    oscs.push(o);
  }
  run(oscs, t, end + release + 0.05);
}
function choirBus(T) {
  const g = T.ac.createGain();
  g.gain.value = 1;
  out(T, g, { rev: 0.6 }, "choir");
  return g;
}

// Brass: two sawtooths, their filter opening with the breath.
function brass(T, t, midi, len, { vel = 1, gain = 0.07, bright = 2400, rev = 0.35, vibrato = true } = {}) {
  const f = mtof(midi);
  const lp = filter(T, "lowpass", 300, 1.2);
  lp.frequency.setValueAtTime(300, t);
  lp.frequency.linearRampToValueAtTime(bright * (0.6 + 0.4 * vel), t + 0.06);
  lp.frequency.linearRampToValueAtTime(bright * 0.55, t + 0.3);
  const a = env(T, t);
  const end = t + Math.max(0.06, len);
  a.gain.linearRampToValueAtTime(gain * vel, t + 0.035);
  a.gain.setValueAtTime(gain * vel * 0.9, end);
  a.gain.linearRampToValueAtTime(0.0001, end + 0.16);
  const oscs = [];
  for (const d of [-6, 6]) {
    const o = osc(T, "sawtooth", f, t);
    o.detune.value = d;
    o.connect(lp);
    oscs.push(o);
  }
  if (vibrato && len > 0.5) {
    const lfo = osc(T, "sine", 5.5, t);
    const depth = T.ac.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(9, t + 0.5);
    lfo.connect(depth);
    for (const o of oscs) depth.connect(o.detune);
    oscs.push(lfo);
  }
  lp.connect(a);
  out(T, a, { rev }, "brass");
  run(oscs, t, end + 0.2);
}
function stab(T, t, notes, len, vel = 1, gain = 0.045) {
  for (const m of notes) brass(T, t, m, len, { vel, gain, bright: 3000, rev: 0.25, vibrato: false });
}

// Short, bowed strings.
function strings(T, t, midi, len, { vel = 1, gain = 0.04, cutoff = 2600, rev = 0.3 } = {}) {
  gain *= 2.5;
  const lp = filter(T, "lowpass", cutoff, 0.6);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain * vel, t + 0.012);
  a.gain.exponentialRampToValueAtTime(gain * vel * 0.35, t + Math.max(0.03, len));
  a.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.09);
  const oscs = [];
  for (const d of [-8, 8]) {
    const o = osc(T, "sawtooth", mtof(midi), t);
    o.detune.value = d;
    o.connect(lp);
    oscs.push(o);
  }
  lp.connect(a);
  out(T, a, { rev }, "strings");
  run(oscs, t, t + len + 0.12);
}

// A plucked synth: bright, closing fast.
function pluck(T, t, midi, { vel = 1, gain = 0.05, decay = 0.32, echo = 0.3 } = {}) {
  gain *= 3;
  const o = osc(T, "triangle", mtof(midi), t);
  const sq = osc(T, "square", mtof(midi), t);
  const sg = T.ac.createGain();
  sg.gain.value = 0.25;
  const lp = filter(T, "lowpass", 3600, 2);
  lp.frequency.setValueAtTime(3600, t);
  lp.frequency.exponentialRampToValueAtTime(420, t + decay);
  const a = env(T, t);
  a.gain.linearRampToValueAtTime(gain * vel, t + 0.003);
  a.gain.exponentialRampToValueAtTime(0.0001, t + decay + 0.1);
  o.connect(lp);
  sq.connect(sg).connect(lp);
  lp.connect(a);
  out(T, a, { rev: 0.25, echo }, "pluck");
  run([o, sq], t, t + decay + 0.15);
}

// A lead: a square and a sawtooth with a vibrato.
function lead(T, t, midi, len, { vel = 1, gain = 0.045 } = {}) {
  const f = mtof(midi);
  const lp = filter(T, "lowpass", 3200, 0.8);
  const a = env(T, t);
  const end = t + Math.max(0.05, len);
  a.gain.linearRampToValueAtTime(gain * vel, t + 0.015);
  a.gain.setValueAtTime(gain * vel * 0.85, end);
  a.gain.linearRampToValueAtTime(0.0001, end + 0.12);
  const lfo = osc(T, "sine", 6, t);
  const depth = T.ac.createGain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(12, t + 0.3);
  lfo.connect(depth);
  const oscs = [lfo];
  for (const [type, d] of [["square", -4], ["sawtooth", 5]]) {
    const o = osc(T, type, f, t);
    o.detune.value = d;
    depth.connect(o.detune);
    o.connect(lp);
    oscs.push(o);
  }
  lp.connect(a);
  out(T, a, { rev: 0.3, echo: 0.15 }, "lead");
  run(oscs, t, end + 0.15);
}

// A music box: a sine with two bell-like overtones, ringing out.
function bell(T, t, midi, { vel = 1, gain = 0.05, echo = 0.4 } = {}) {
  gain *= 3;
  const f = mtof(midi);
  const a = T.ac.createGain();
  a.gain.value = 1;
  const oscs = [];
  for (const [ratio, g, d] of [[1, 1, 1.6], [2.76, 0.35, 0.5], [5.4, 0.15, 0.2]]) {
    const o = osc(T, "sine", f * ratio, t);
    const e = env(T, t);
    e.gain.linearRampToValueAtTime(gain * vel * g, t + 0.003);
    e.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(e).connect(a);
    oscs.push(o);
  }
  out(T, a, { rev: 0.45, echo }, "bell");
  run(oscs, t, t + 1.7);
}

// ---------- the moods ----------

const MORNING_COMP = [
  [[0, 1.5, 0.7], [6, 0.5, 0.45], [10, 1.4, 0.55]],
  [[0, 2.5, 0.7], [11, 1.2, 0.5]],
  [[0, 1.0, 0.7], [3, 0.6, 0.45], [8, 1.6, 0.6]],
  [[0, 3.6, 0.65]],
];
const AFTERNOON_COMP = [
  [[0, 1.2, 0.65], [8, 1.2, 0.55]],
  [[0, 0.8, 0.65], [6, 0.6, 0.5], [10, 1.2, 0.55]],
  [[0, 2, 0.6], [12, 0.8, 0.45]],
];
const FIGHT_THEME = [
  [[0, 76, 3], [3, 71, 1], [4, 76, 2], [6, 78, 2], [8, 79, 4], [12, 78, 2], [14, 76, 2]],
  [[0, 79, 4], [4, 76, 2], [6, 72, 2], [8, 76, 6], [14, 74, 2]],
  [[0, 78, 3], [3, 74, 1], [4, 78, 2], [6, 81, 2], [8, 79, 4], [12, 78, 4]],
  [[0, 75, 4], [4, 78, 4], [8, 83, 6], [14, 81, 2]],
  [[0, 76, 3], [3, 71, 1], [4, 76, 2], [6, 78, 2], [8, 79, 4], [12, 78, 2], [14, 76, 2]],
  [[0, 79, 4], [4, 76, 2], [6, 72, 2], [8, 76, 6], [14, 74, 2]],
  [[0, 76, 4], [4, 72, 2], [6, 76, 2], [8, 81, 6], [14, 79, 2]],
  [[0, 78, 4], [4, 75, 4], [8, 71, 8]],
];
const BOSS_THEME = [
  [[0, 67, 6], [6, 68, 2], [8, 67, 4], [12, 63, 4]],
  [[0, 72, 8], [8, 70, 4], [12, 68, 4]],
  [[0, 67, 6], [6, 70, 2], [8, 75, 8]],
  [[0, 74, 8], [8, 72, 4], [12, 70, 4]],
  [[0, 72, 6], [6, 74, 2], [8, 75, 6], [14, 74, 2]],
  [[0, 72, 8], [8, 68, 8]],
  [[0, 70, 6], [6, 72, 2], [8, 74, 8]],
  [[0, 71, 12], [12, 67, 4]],
];

const MOODS = {
  // Turn 1: lofi — an electric piano comping lazily over a swung boom-bap beat, a round bass, now
  // and then a little melody, all through a dusty filter and vinyl crackle.
  morning: {
    bpm: 74, swing: 0.6, cutoff: 4000, hatTone: 3600, wow: 0.005, crackle: 0.05, echo: 0.75, humanize: 0.008,
    prog: [CH.Fmaj9, CH.Em7, CH.Dm9, CH.Cmaj9, CH.Dm9, CH.G13, CH.Cmaj9, CH.Am9],
    scale: [67, 69, 72, 74, 76, 79, 81, 84],
    play(T, s, t) {
      const { prog, scale } = T.def;
      const bar = s >> 4;
      const p = s & 15;
      const r = (k) => hash(bar * 977 + k * 131, T.seed);
      const ch = prog[bar % prog.length];
      const next = prog[(bar + 1) % prog.length];
      if (bar >= 1) {
        if (p === 0 || p === 10 || (p === 7 && r(1) < 0.35)) kick(T, t, p === 0 ? 0.95 : 0.7, { hi: 110, lo: 44, decay: 0.32, gain: 0.7 });
        if (p === 4 || p === 12) snare(T, t, 0.8, { tone: 1500, decay: 0.15, gain: 0.17, body: 170 });
        if (p === 15 && r(2) < 0.3) snare(T, t, 0.25, { tone: 1500, decay: 0.08, gain: 0.17 });
        if (p % 2 === 0 && r(3 + p) > 0.1) hat(T, t, p % 4 === 0 ? 0.55 : 0.35, false, 0.06);
      }
      for (const [at, len, vel] of MORNING_COMP[Math.floor(r(4) * MORNING_COMP.length)]) if (p === at) strum(T, t, ch.notes, len * T.beat, vel);
      if (p === 0) bass(T, t, ch.root, 1.6 * T.beat, { gain: 0.32 });
      if (p === 10 && r(5) < 0.7) bass(T, t, ch.root + (r(6) < 0.5 ? 7 : 12), 0.5 * T.beat, { gain: 0.26 });
      if (p === 14 && r(7) < 0.5) bass(T, t, next.root - 1, 0.4 * T.beat, { gain: 0.22 });
      if (((bar >> 2) & 1) === 1) {
        for (const m of motif(T, bar >> 1, scale, 0.32, 4)) if (m.p === p) epiano(T, t, fit(scale[Math.max(0, m.i - (bar % 2))], ch), m.len * T.stepDur, m.vel, { rev: 0.35, echo: 0.3 });
      }
    },
  },
  // Turn 2: chillhop — a little quicker, a plucked arpeggio running through the chords, busier
  // drums and a bass that moves more.
  afternoon: {
    bpm: 88, swing: 0.56, cutoff: 5500, hatTone: 5000, wow: 0.003, crackle: 0.03, echo: 0.75,
    prog: [CH.Am9, CH.Fmaj7, CH.Cmaj7, CH.G6, CH.Dm9, CH.Em7, CH.Fmaj7, CH.G6],
    scale: [64, 67, 69, 72, 74, 76, 79, 81],
    play(T, s, t) {
      const { prog, scale } = T.def;
      const bar = s >> 4;
      const p = s & 15;
      const r = (k) => hash(bar * 977 + k * 131, T.seed);
      const ch = prog[bar % prog.length];
      const next = prog[(bar + 1) % prog.length];
      if (p === 0 || p === 8 || p === 10 || (p === 3 && r(1) < 0.5)) kick(T, t, p === 0 ? 1 : p === 3 ? 0.5 : 0.8, { hi: 120, lo: 46, decay: 0.32, gain: 0.72 });
      if (p === 4 || p === 12) snare(T, t, 0.9, { tone: 1800, decay: 0.15, gain: 0.2 });
      if (p === 7 && r(2) < 0.4) snare(T, t, 0.25, { tone: 1800, decay: 0.07, gain: 0.2 });
      if (p === 14 && r(3) < 0.45) hat(T, t, 0.5, true, 0.06);
      else hat(T, t, [0.55, 0.22, 0.38, 0.22][p % 4], false, 0.06);
      for (const [at, len, vel] of AFTERNOON_COMP[Math.floor(r(4) * AFTERNOON_COMP.length)]) if (p === at) strum(T, t, ch.notes, len * T.beat, vel * 0.9);
      if (p === 0) bass(T, t, ch.root, 0.9 * T.beat, { gain: 0.3 });
      if (p === 6) bass(T, t, ch.root + 12, 0.4 * T.beat, { gain: 0.22 });
      if (p === 8) bass(T, t, ch.root + 7, 0.6 * T.beat, { gain: 0.25 });
      if (p === 11 && r(5) < 0.6) bass(T, t, ch.root, 0.4 * T.beat, { gain: 0.22 });
      if (p === 14 && r(6) < 0.5) bass(T, t, next.root + (r(7) < 0.5 ? -1 : 2), 0.35 * T.beat, { gain: 0.2 });
      if (bar % 8 >= 2 && p % 2 === 0) {
        const tones = [...ch.notes, ch.notes[0] + 12];
        const order = [0, 1, 2, 3, 4, 3, 2, 1];
        pluck(T, t, tones[order[(p / 2) % order.length]] + 12, { vel: p % 4 === 0 ? 0.8 : 0.55, gain: 0.032 });
      }
      if (((bar >> 2) & 1) === 1) {
        for (const m of motif(T, bar >> 1, scale, 0.3, 5)) if (m.p === p) epiano(T, t, fit(scale[Math.max(0, m.i - (bar % 2))], ch), m.len * T.stepDur, m.vel, { rev: 0.3, echo: 0.25 });
      }
    },
  },
  // Turn 3: night falls — a dark pad, a sawtooth bass pulsing in eighths, a heartbeat kick, a
  // clock ticking, and a music box picking out a tune in the echo.
  night: {
    bpm: 96, swing: 0.5, cutoff: 5200, echo: 0.75, humanize: 0.004,
    prog: [CH.nDm, CH.nBb, CH.nGm, CH.nA, CH.nDm, CH.nGm, CH.nBb, CH.nA],
    scale: [74, 77, 79, 81, 84, 86, 89, 91],
    play(T, s, t) {
      const { prog, scale } = T.def;
      const bar = s >> 4;
      const p = s & 15;
      const r = (k) => hash(bar * 977 + k * 131, T.seed);
      const ch = prog[bar % prog.length];
      if (p === 0) pad(T, t, ch.notes, 4 * T.beat, { cutoff: 700, gain: 0.03, attack: 1.2, release: 2 });
      if (p % 2 === 0) bass(T, t, ch.root + 12, 0.42 * T.beat, { type: "sawtooth", cutoff: 300, snap: true, gain: p === 0 ? 0.3 : 0.2 });
      if (bar >= 1) {
        if (p === 0 || p === 8) kick(T, t, 0.9, { hi: 90, lo: 40, decay: 0.4, gain: 0.8 });
        if (p === 3 || p === 11) kick(T, t, 0.5, { hi: 90, lo: 40, decay: 0.3, gain: 0.8 });
        if (p === 12) snare(T, t, 0.7, { tone: 2600, decay: 0.07, gain: 0.14, body: 330 });
        hat(T, t, p % 4 === 0 ? 0.45 : 0.18, false, 0.05);
        if (bar % 4 === 3 && p >= 12) tom(T, t, 0.6 + (p - 12) * 0.1, { hi: 170 - (p - 12) * 25, lo: 90 - (p - 12) * 10, decay: 0.35, gain: 0.3 });
      }
      if (((bar >> 2) & 1) === 1) {
        for (const m of motif(T, bar, scale, 0.22, 3 + (bar % 2))) if (m.p === p) bell(T, t, fit(m.note, ch), { vel: m.vel, gain: 0.05 });
      } else if (p === 0 && r(1) < 0.5) bell(T, t + 2 * T.beat, ch.notes[3] + 24, { vel: 0.5, gain: 0.04 });
    },
  },
  // A fight: rock drums, an eighth-note bass, strings sawing away in sixteenths, power-chord stabs
  // and, every other phrase, a lead playing the theme.
  fight: {
    bpm: 144, swing: 0.5, cutoff: 9000, echo: 0.5, humanize: 0.003,
    prog: [CH.fEm, CH.fC, CH.fD, CH.fB, CH.fEm, CH.fC, CH.fAm, CH.fB],
    play(T, s, t) {
      const { prog } = T.def;
      const bar = s >> 4;
      const p = s & 15;
      const ch = prog[bar % prog.length];
      const fill = bar % 4 === 3;
      if (p === 0 && bar % 4 === 0) crash(T, t, 1);
      if (p === 0 || p === 8 || p === 6 || p === 11 || (fill && p === 14)) kick(T, t, p === 0 || p === 8 ? 1 : 0.75, { hi: 150, lo: 48, decay: 0.3, gain: 0.85 });
      if (p === 4 || p === 12) snare(T, t, 1, { tone: 1900, decay: 0.18, gain: 0.3 });
      if (fill && p >= 13) snare(T, t, 0.5 + (p - 12) * 0.15, { tone: 1900, decay: 0.12, gain: 0.3 });
      if (p % 2 === 0 && !(fill && p >= 12)) hat(T, t, p % 4 === 0 ? 0.6 : 0.4, false, 0.07);
      if (p % 2 === 0) bass(T, t, ch.root + (p === 14 ? 12 : 0), 0.4 * T.beat, { type: "sawtooth", cutoff: 520, snap: true, gain: 0.26 });
      const tones = ch.strings;
      strings(T, t, tones[[0, 1, 2, 1][p % 4]] - 12, 0.22 * T.beat, { vel: p % 4 === 0 ? 1 : 0.65, gain: 0.03 });
      if (p === 0) stab(T, t, ch.stab, 0.45 * T.beat, 1, 0.04);
      if (p === 10) stab(T, t, ch.stab, 0.3 * T.beat, 0.8, 0.035);
      if (((bar >> 3) & 1) === 1) {
        for (const [at, note, len] of FIGHT_THEME[bar % 8]) if (at === p) lead(T, t, note, len * T.stepDur * 0.92, { gain: 0.045 });
      }
    },
  },
  // A raid boss: taiko pounding, a choir holding the chords, low strings galloping underneath,
  // brass stabs, and the horns playing the theme (in octaves on every other phrase).
  boss: {
    bpm: 108, swing: 0.5, cutoff: 8000, echo: 0.75, humanize: 0.004,
    prog: [CH.bCm, CH.bAb, CH.bEb, CH.bBb, CH.bCm, CH.bAb, CH.bBb, CH.bG],
    play(T, s, t) {
      const { prog } = T.def;
      const bar = s >> 4;
      const p = s & 15;
      const ch = prog[bar % prog.length];
      const phraseEnd = bar % 8 === 7;
      if (p === 0 && bar % 4 === 0) crash(T, t, 0.9);
      if (p === 0) choir(T, t, ch.choir, 4 * T.beat, { gain: 0.4, attack: bar === 0 ? 1.6 : 0.5, release: 1.2 });
      // taiko
      if ([0, 3, 6, 8, 11].includes(p)) tom(T, t, p === 0 || p === 8 ? 1 : 0.7, { hi: 95, lo: 48, decay: 0.7, gain: 0.7, skin: 0.35 });
      if (p === 12 || p === 14) tom(T, t, 0.7, { hi: 150, lo: 85, decay: 0.4, gain: 0.45 });
      if (phraseEnd && p >= 8) tom(T, t, 0.4 + (p - 8) * 0.08, { hi: 130, lo: 70, decay: 0.3, gain: 0.45 });
      if (p === 4 || p === 12) snare(T, t, 0.55, { tone: 1600, decay: 0.2, gain: 0.18, body: 160 });
      // the low strings, galloping
      if ([0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15].includes(p)) strings(T, t, ch.root + 12 + (p === 14 ? 7 : 0), 0.2 * T.beat, { vel: p % 4 === 0 ? 1 : 0.6, gain: 0.05, cutoff: 1800 });
      if (p === 0) bass(T, t, ch.root, 1.8 * T.beat, { type: "sawtooth", cutoff: 260, gain: 0.26 });
      if (p === 0) stab(T, t, ch.stab, 1.2 * T.beat, 0.9, 0.03);
      if (p === 10) stab(T, t, ch.stab, 0.35 * T.beat, 0.8, 0.03);
      if (bar >= 2) {
        for (const [at, note, len] of BOSS_THEME[bar % 8]) {
          if (at !== p) continue;
          brass(T, t, note, len * T.stepDur * 0.95, { gain: 0.06 });
          if (((bar >> 3) & 1) === 1) brass(T, t, note - 12, len * T.stepDur * 0.95, { gain: 0.05 });
        }
      }
    },
  },
};

// ---------- playing live ----------

let E = null; // the engine, once the browser lets us make sound
let current = null; // the band playing now
let wanted = null; // the mood the game is in
let unlocked = false;

function switchTo(mood) {
  if (!E) return;
  if (!isMusicEnabled()) mood = null;
  if ((current?.mood || null) === mood) return;
  const now = E.ac.currentTime;
  const urgent = mood === "fight" || mood === "boss";
  if (current) {
    const old = current;
    const fade = urgent ? 0.6 : mood ? 2.5 : 1.5;
    fadeTo(old, 0.0001, now, fade);
    setTimeout(() => {
      for (const src of old.sources) src.stop();
      for (const g of old.fades) g.disconnect();
    }, (fade + 3) * 1000);
  }
  current = mood ? makeTrack(E, mood, now + (urgent ? 0.05 : 0.4)) : null;
  if (current) fadeTo(current, 1, now, urgent ? 0.3 : 3);
}

function pump() {
  if (!current) return;
  const now = E.ac.currentTime;
  if (current.next < now - 0.1) current.next = now + 0.05; // after a stall (a hidden tab), pick up from now
  schedule(current, now + 0.25);
}

// The game tells the music what's going on after every render: "morning", "afternoon", "night",
// "fight", "boss" — or null for silence.
export function setMusicMood(mood) {
  wanted = mood;
  if (unlocked) switchTo(mood);
}

// Called on the first click or key press: makes the sound and starts whatever's wanted.
export function unlockMusic() {
  if (unlocked) return;
  try {
    const ac = audioContext();
    E = makeEngine(ac, ac.destination);
    E.master.gain.value = level();
    unlocked = true;
    setInterval(pump, 50);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) ac.suspend();
      else ac.resume();
    });
    switchTo(wanted);
  } catch (err) {
    // music is a nice-to-have — never let it break the game
    console.error("music:", err);
  }
}

// For testing: what's playing.
export function musicStatus() {
  return { unlocked, wanted, playing: current?.mood || null, step: current?.step || 0, context: E?.ac.state || null, enabled: isMusicEnabled() };
}

// For testing: renders `seconds` of a mood offline and hands back the AudioBuffer.
export function renderMusic(mood, seconds = 10, solo = null) {
  const ac = new OfflineAudioContext(2, Math.floor(44100 * seconds), 44100);
  const engine = makeEngine(ac, ac.destination);
  const T = makeTrack(engine, mood, 0.05);
  T.solo = solo;
  for (const g of T.fades) g.gain.value = 1;
  schedule(T, seconds - 0.3);
  return ac.startRendering();
}
