// Efeitos sonoros do jogo. Cada função descreve um som com as primitivas da engine.
import { rand } from '../core/util.js';
import { tone, noise, spatial, NOTE } from './engine.js';

let combo = 0, lastPick = 0;

const MINE = {
  dirt(v, r, brk) {
    noise({ ft: 'lowpass', ff: 800 * r, ff2: 200, dur: brk ? 0.28 : 0.09, vol: 0.35 * v, verb: 0.12 });
    tone({ f: 110 * r, f2: 55, dur: 0.1, vol: 0.25 * v });
  },
  wood(v, r, brk) {
    noise({ ff: 950 * r, q: 4, dur: 0.07, vol: 0.4 * v, verb: 0.2 });
    tone({ f: 230 * r, f2: 150, type: 'triangle', dur: 0.09, vol: 0.22 * v });
    if (!brk) return;
    noise({ ft: 'lowpass', ff: 1400, ff2: 250, dur: 0.35, vol: 0.25, delay: 0.03 });
    tone({ f: 140, f2: 90, type: 'triangle', dur: 0.2, vol: 0.15, delay: 0.05 });
  },
  stone(v, r, brk, ore) {
    if (ore) tone({ f: 1300 * r, type: 'square', dur: 0.05, vol: 0.045 * v, lp: 3200, verb: 0.35 });
    noise({ ff: 2600 * r, q: 3, dur: 0.05, vol: 0.35 * v, verb: 0.25 });
    tone({ f: 320 * r, f2: 180, type: 'triangle', dur: 0.06, vol: 0.18 * v });
    if (!brk) return;
    noise({ ft: 'lowpass', ff: 1600, ff2: 120, dur: 0.45, vol: 0.35, delay: 0.02, verb: 0.3 });
    for (let k = 0; k < 4; k++) noise({ ff: rand(1500, 3500), q: 4, dur: 0.03, vol: 0.12, delay: 0.05 + k * rand(0.04, 0.09) });
    if (ore) { tone({ f: 988, dur: 0.12, vol: 0.07, delay: 0.08, verb: 0.4 }); tone({ f: 1319, dur: 0.25, vol: 0.07, delay: 0.16, verb: 0.4 }); }
  },
  crystal(v, r, brk) {
    tone({ f: 1760 * r, dur: 0.6, vol: 0.1 * v, verb: 0.6 });
    tone({ f: 2637 * r, dur: 0.9, vol: 0.05 * v, delay: 0.02, verb: 0.6 });
    noise({ ft: 'highpass', ff: 4500, dur: 0.04, vol: 0.12 * v });
    if (!brk) return;
    for (let k = 0; k < 6; k++) tone({ f: rand(1800, 4200), dur: rand(0.3, 0.9), vol: 0.05, delay: k * 0.035, verb: 0.7 });
    noise({ ft: 'highpass', ff: 3000, ff2: 8000, dur: 0.4, vol: 0.15 });
  },
  glass(v, r, brk) {
    noise({ ff: 3600 * r, q: 6, dur: 0.06, vol: 0.3 * v, verb: 0.3 });
    tone({ f: 620 * r, f2: 400, type: 'square', dur: 0.05, vol: 0.06 * v, lp: 2500 });
    if (!brk) return;
    noise({ ft: 'highpass', ff: 2500, ff2: 6000, dur: 0.35, vol: 0.2 });
    tone({ f: 200, f2: 80, type: 'triangle', dur: 0.3, vol: 0.15 });
  },
};

// Passos: [camada][valor do chão] -> som
function stepSound(surface, fl, r) {
  if (fl === 8) { // água
    noise({ ff: 1100 * r, ff2: 450, q: 1.5, dur: 0.14, vol: 0.13, verb: 0.2 });
    if (Math.random() < 0.3) tone({ f: rand(400, 700), f2: rand(900, 1300), dur: 0.05, vol: 0.03, delay: 0.05 });
    return;
  }
  if (surface) {
    if (fl === 3 || fl === 6) return noise({ ff: 2400 * r, q: 0.8, dur: 0.07, vol: 0.07 });                 // areia
    if (fl === 4) return noise({ ft: 'highpass', ff: 1800 * r, dur: 0.09, vol: 0.08 });                      // neve
    if (fl === 7) return noise({ ff: 1900 * r, q: 2, dur: 0.035, vol: 0.075 });                              // pedra
    return noise({ ft: 'highpass', ff: 2600 * r, a: 0.01, dur: 0.06, vol: 0.05 });                           // grama
  }
  if (fl === 9) return noise({ ft: 'highpass', ff: 3500, dur: 0.12, vol: 0.07 });
  if (fl === 3) return noise({ ft: 'lowpass', ff: 520 * r, dur: 0.06, vol: 0.08 });
  if (fl === 5) return noise({ ff: 3400 * r, q: 5, dur: 0.03, vol: 0.06, verb: 0.35 });
  if (fl === 2 || fl === 4 || fl === 6) return noise({ ff: 1900 * r, q: 2, dur: 0.035, vol: 0.075, verb: 0.15 });
  return noise({ ft: 'lowpass', ff: 450 * r, dur: 0.06, vol: 0.11 });
}

export const sfx = {
  mine(mat, brk) { (MINE[mat === 'ore' ? 'stone' : mat] || MINE.stone)(brk ? 1 : 0.7, rand(0.92, 1.08), brk, mat === 'ore'); },
  fail() { tone({ f: 180, type: 'square', dur: 0.05, vol: 0.06, lp: 1200 }); tone({ f: 140, type: 'square', dur: 0.06, vol: 0.05, lp: 1000, delay: 0.06 }); },
  step(surface, fl) { stepSound(surface, fl, rand(0.85, 1.15)); },
  exhausted() { for (let k = 0; k < 2; k++) noise({ ft: 'bandpass', ff: 900, q: 0.7, a: 0.08, dur: 0.3, vol: 0.06, delay: k * 0.45 }); },
  swing(heavy) { noise({ ff: 450, ff2: heavy ? 2600 : 2000, q: 1.3, a: 0.02, dur: heavy ? 0.16 : 0.11, vol: heavy ? 0.14 : 0.1 }); },
  zap() { tone({ f: 900, f2: 1600, type: 'triangle', dur: 0.08, vol: 0.07 }); noise({ ft: 'highpass', ff: 4000, dur: 0.06, vol: 0.05 }); },
  hit(x, y) { const q = spatial(x, y); tone({ f: 270, f2: 110, dur: 0.12, vol: 0.25 * q.m, pan: q.pan }); noise({ ft: 'lowpass', ff: 1600, ff2: 400, dur: 0.08, vol: 0.25 * q.m, pan: q.pan }); },
  hop(x, y, big, shape) {
    const q = spatial(x, y, 14);
    if (q.m <= 0) return;
    if (big) { tone({ f: 65, f2: 38, dur: 0.4, vol: 0.45 * q.m, lp: 220, pan: q.pan }); noise({ ft: 'lowpass', ff: 260, dur: 0.35, vol: 0.3 * q.m, pan: q.pan, verb: 0.3 }); }
    else if (shape === 'shroom') noise({ ft: 'highpass', ff: 1800, a: 0.03, dur: 0.12, vol: 0.06 * q.m, pan: q.pan });
    else tone({ f: rand(150, 190), f2: rand(280, 340), dur: 0.09, vol: 0.06 * q.m, pan: q.pan });
  },
  flap(x, y) { const q = spatial(x, y, 12); noise({ ff: 700, q: 1.5, dur: 0.05, vol: 0.05 * q.m, pan: q.pan }); noise({ ff: 800, q: 1.5, dur: 0.05, vol: 0.04 * q.m, pan: q.pan, delay: 0.08 }); },
  windup(x, y) { const q = spatial(x, y); tone({ f: 90, f2: 230, type: 'sawtooth', dur: 0.5, vol: 0.09 * q.m, lp: 800, pan: q.pan }); },
  dash(x, y) { const q = spatial(x, y); noise({ ff: 300, ff2: 1800, q: 1, a: 0.02, dur: 0.3, vol: 0.18 * q.m, pan: q.pan }); },
  shoot(kind, x, y) {
    const q = spatial(x, y), B = { pan: q.pan };
    if (q.m <= 0) return;
    if (kind === 'spore') { noise({ ...B, ft: 'lowpass', ff: 900, ff2: 300, dur: 0.15, vol: 0.15 * q.m }); tone({ ...B, f: 300, f2: 180, dur: 0.1, vol: 0.08 * q.m }); }
    if (kind === 'fire') { noise({ ...B, ft: 'lowpass', ff: 400, ff2: 2000, a: 0.02, dur: 0.25, vol: 0.18 * q.m }); tone({ ...B, f: 120, f2: 60, dur: 0.2, vol: 0.1 * q.m }); }
    if (kind === 'shard') { tone({ ...B, f: 2200, f2: 1400, dur: 0.12, vol: 0.07 * q.m, verb: 0.4 }); noise({ ...B, ft: 'highpass', ff: 5000, dur: 0.05, vol: 0.08 * q.m }); }
    if (kind === 'water') noise({ ...B, ff: 1200, ff2: 500, q: 1.2, dur: 0.18, vol: 0.14 * q.m });
  },
  nova(x, y, big) {
    const q = spatial(x, y, 20);
    tone({ f: big ? 70 : 420, f2: big ? 35 : 120, dur: 0.6, vol: 0.22 * q.m, pan: q.pan, verb: 0.5 });
    noise({ ft: big ? 'lowpass' : 'highpass', ff: big ? 500 : 3000, dur: 0.5, vol: 0.2 * q.m, pan: q.pan, verb: 0.4 });
  },
  die(x, y, big) {
    const q = spatial(x, y);
    noise({ ft: 'lowpass', ff: big ? 600 : 1300, ff2: 90, dur: big ? 1 : 0.35, vol: (big ? 0.5 : 0.3) * q.m, pan: q.pan, verb: 0.3 });
    tone({ f: big ? 200 : 420, f2: big ? 40 : 80, dur: big ? 0.9 : 0.3, vol: 0.16 * q.m, pan: q.pan });
  },
  hurt() { tone({ f: 240, f2: 115, type: 'sawtooth', dur: 0.18, vol: 0.16, lp: 900 }); noise({ ft: 'lowpass', ff: 320, dur: 0.12, vol: 0.3 }); },
  death() { tone({ f: 300, f2: 55, type: 'sawtooth', dur: 1.1, vol: 0.18, lp: 1100, verb: 0.5 }); noise({ ft: 'lowpass', ff: 500, ff2: 60, dur: 1, vol: 0.2, verb: 0.4 }); },
  pickup() {
    const now = performance.now();
    combo = now - lastPick < 350 ? Math.min(combo + 1, 12) : 0; // coletas seguidas sobem o tom
    lastPick = now;
    const f = 620 * Math.pow(2, combo / 12);
    tone({ f, f2: f * 1.5, dur: 0.06, vol: 0.09 });
  },
  place(kind) {
    if (kind === 'block') { noise({ ft: 'lowpass', ff: 520, dur: 0.08, vol: 0.32 }); tone({ f: 95, f2: 60, dur: 0.08, vol: 0.25 }); return; }
    tone({ f: 320, f2: 210, type: 'triangle', dur: 0.06, vol: 0.12 }); noise({ ff: 1500, q: 2, dur: 0.04, vol: 0.12 });
  },
  torch() { noise({ ft: 'lowpass', ff: 300, ff2: 2200, a: 0.05, dur: 0.3, vol: 0.14 }); sfx.place('obj'); },
  craft() {
    tone({ f: 1200, type: 'triangle', dur: 0.08, vol: 0.1, verb: 0.2 }); tone({ f: 1500, type: 'triangle', dur: 0.08, vol: 0.1, delay: 0.12, verb: 0.2 });
    noise({ ff: 3000, q: 3, dur: 0.03, vol: 0.12 }); noise({ ff: 3000, q: 3, dur: 0.03, vol: 0.12, delay: 0.12 });
    [76, 79, 83, 88].forEach((m, k) => tone({ f: NOTE(m), dur: 0.35, vol: 0.05, delay: 0.26 + k * 0.06, verb: 0.5 }));
  },
  eat() { for (let k = 0; k < 3; k++) noise({ ff: rand(1200, 2000), q: 2, dur: 0.05, vol: 0.16, delay: k * 0.11 }); tone({ f: 300, f2: 140, dur: 0.12, vol: 0.12, delay: 0.36 }); },
  equip() { noise({ ft: 'highpass', ff: 2500, ff2: 7000, dur: 0.25, vol: 0.1 }); tone({ f: 820, type: 'triangle', dur: 0.35, vol: 0.06, verb: 0.4 }); tone({ f: 1230, type: 'triangle', dur: 0.3, vol: 0.04, delay: 0.05, verb: 0.4 }); },
  magic() { [72, 76, 79, 84, 88, 91].forEach((m, k) => tone({ f: NOTE(m), dur: 0.7, vol: 0.07, delay: k * 0.07, verb: 0.7 })); noise({ ft: 'highpass', ff: 5000, a: 0.2, dur: 0.6, vol: 0.05 }); },
  pluck() { tone({ f: 480, f2: 900, dur: 0.07, vol: 0.1 }); noise({ ff: 2200, q: 2, dur: 0.03, vol: 0.1 }); },
  chestOpen() {
    tone({ f: 105, f2: 185, type: 'sawtooth', a: 0.05, dur: 0.32, vol: 0.06, lp: 700 });
    noise({ ff: 3000, q: 4, dur: 0.02, vol: 0.16, delay: 0.35 });
    [72, 79].forEach((m, k) => tone({ f: NOTE(m), dur: 0.4, vol: 0.04, delay: 0.4 + k * 0.08, verb: 0.5 }));
  },
  chestClose() { noise({ ft: 'lowpass', ff: 420, dur: 0.1, vol: 0.3 }); tone({ f: 125, f2: 70, dur: 0.1, vol: 0.2 }); },
  ui() { tone({ f: 900, dur: 0.03, vol: 0.05 }); },
  uiOpen() { noise({ ff: 600, ff2: 1700, q: 1, a: 0.03, dur: 0.12, vol: 0.06 }); },
  splash() { noise({ ff: 1600, ff2: 380, q: 1, dur: 0.32, vol: 0.22, verb: 0.3 }); for (let k = 0; k < 3; k++) tone({ f: rand(300, 500), f2: rand(800, 1200), dur: 0.05, vol: 0.04, delay: 0.08 + k * 0.07 }); },
  sizzle() { noise({ ft: 'highpass', ff: 4200, a: 0.02, dur: 0.45, vol: 0.12 }); },
  roar() {
    tone({ f: 90, f2: 44, type: 'sawtooth', a: 0.15, dur: 1.4, vol: 0.24, lp: 650, verb: 0.5 });
    tone({ f: 93, f2: 46, type: 'sawtooth', a: 0.15, dur: 1.4, vol: 0.18, lp: 500, detune: 12 });
    noise({ ft: 'lowpass', ff: 340, a: 0.2, dur: 1.2, vol: 0.22, verb: 0.4 });
  },
  victory() {
    [62, 66, 69, 74].forEach((m, k) => tone({ f: NOTE(m), type: 'triangle', dur: 0.45, vol: 0.12, delay: k * 0.15, verb: 0.5, bus: 'music' }));
    [62, 66, 69, 74, 78].forEach(m => tone({ f: NOTE(m), type: 'triangle', a: 0.05, dur: 2, vol: 0.06, delay: 0.65, verb: 0.6, bus: 'music' }));
  },
  travel(to) {
    const down = to === 'cave';
    noise({ ft: 'lowpass', ff: down ? 1800 : 300, ff2: down ? 200 : 1800, a: 0.1, dur: 0.9, vol: 0.2, verb: 0.6 });
    [0, 4, 7].forEach((s, k) => tone({ f: NOTE((down ? 62 : 67) + (down ? -s : s)), type: 'triangle', dur: 0.6, vol: 0.05, delay: 0.2 + k * 0.12, verb: 0.6 }));
  },
  heartbeat() { tone({ f: 62, f2: 40, dur: 0.12, vol: 0.3 }); tone({ f: 58, f2: 38, dur: 0.12, vol: 0.2, delay: 0.18 }); },
  growl() { tone({ f: 72, f2: 52, type: 'sawtooth', a: 0.2, dur: 0.6, vol: 0.12, lp: 260 }); },
  /** Vozes dos animais; filhotes têm voz mais aguda. */
  voice(kind, x, y, baby = false) {
    const q = spatial(x, y, 14), k = baby ? 1.6 : 1, B = { pan: q.pan };
    if (q.m <= 0) return;
    if (kind === 'moo') { tone({ ...B, f: 150 * k, f2: 110 * k, type: 'sawtooth', a: 0.08, dur: 0.75, vol: 0.07 * q.m, lp: 700 }); tone({ ...B, f: 152 * k, f2: 112 * k, type: 'sawtooth', a: 0.08, dur: 0.75, vol: 0.05 * q.m, lp: 500, detune: 14 }); }
    if (kind === 'baa') for (let n = 0; n < 5; n++) tone({ ...B, f: 330 * k + (n % 2) * 18, type: 'sawtooth', dur: 0.07, vol: 0.05 * q.m, lp: 1400, delay: n * 0.07 });
    if (kind === 'cluck') for (let n = 0; n < 2 + (Math.random() * 2 | 0); n++) { noise({ ...B, ff: 1400 * k, q: 3, dur: 0.04, vol: 0.08 * q.m, delay: n * 0.12 }); tone({ ...B, f: 600 * k, f2: 900 * k, dur: 0.05, vol: 0.04 * q.m, delay: n * 0.12 }); }
    if (kind === 'squeak') tone({ ...B, f: 1800 * k, f2: 2400 * k, dur: 0.06, vol: 0.04 * q.m });
  },
  coin() { [0, 0.07].forEach((d, k) => tone({ f: k ? 1760 : 1320, dur: 0.12, vol: 0.07, delay: d, verb: 0.2 })); noise({ ft: 'highpass', ff: 6000, dur: 0.04, vol: 0.04 }); },
  questDone() { [67, 71, 74, 79].forEach((m, k) => tone({ f: NOTE(m), type: 'triangle', dur: 0.35, vol: 0.08, delay: k * 0.09, verb: 0.4 })); },
  talk() { for (let k = 0; k < 3; k++) tone({ f: rand(300, 520), type: 'triangle', dur: 0.05, vol: 0.04, delay: k * 0.07 }); },
  door(open) {
    tone({ f: open ? 160 : 220, f2: open ? 240 : 140, type: 'sawtooth', a: 0.02, dur: 0.22, vol: 0.05, lp: 900 });
    noise({ ft: 'lowpass', ff: 600, dur: 0.06, vol: 0.25, delay: open ? 0.18 : 0 });
  },
  till() { noise({ ft: 'lowpass', ff: 700, ff2: 250, dur: 0.14, vol: 0.28 }); noise({ ff: 2400, q: 2, dur: 0.03, vol: 0.1, delay: 0.03 }); },
  water() { for (let k = 0; k < 6; k++) noise({ ff: rand(1800, 3200), q: 1.5, dur: 0.06, vol: 0.06, delay: k * 0.05 }); },
  crackle(x, y) { const q = spatial(x, y, 8); noise({ ff: rand(1500, 4500), q: 2, dur: 0.015, vol: 0.06 * q.m, pan: q.pan }); },
};
