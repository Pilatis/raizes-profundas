// Paisagem sonora: trilha generativa (tema por camada/bioma, noite e chefe) e
// ambiente contínuo (ar + zumbido grave) com eventos aleatórios por bioma.
import { G } from '../core/state.js';
import { clamp, rand } from '../core/util.js';
import { ENEMIES } from '../data/enemies.js';
import { OBJECTS } from '../data/world-data.js';
import { daylight } from '../world/light.js';
import { engine, tone, noise, NOTE } from './engine.js';
import { sfx } from './sfx.js';

const TICK_MS = 90;
const LOOKAHEAD = 0.3;
const PHRASE_BARS = 8;

// ---------- Temas (escala em semitons, progressão em graus) ----------
const THEMES = {
  title: { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 58, prog: [0, 5, 3, 4], lead: 'bell', pad: true, dens: 0.22 },
  night: { root: 51, scale: [0, 2, 4, 7, 9], bpm: 54, prog: [0, 3, 1, 4], lead: 'bell', pad: true, dens: 0.2 },
  boss: { root: 38, scale: [0, 2, 3, 5, 7, 8, 11], bpm: 140, prog: [0, 5, 3, 4], lead: 'square', bass: true, eighth: true, drums: 2, dens: 0.6, loop: true },
  'cave:0': { root: 50, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 76, prog: [0, 3, 4, 0], lead: 'pluck', pad: true, bass: true, dens: 0.42 },
  'cave:1': { root: 45, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 66, prog: [0, 5, 6, 4], lead: 'marimba', pad: true, bass: true, dens: 0.38 },
  'cave:2': { root: 52, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 84, prog: [0, 1, 4, 0], lead: 'bell', pad: true, dens: 0.48 },
  'cave:3': { root: 53, scale: [0, 2, 4, 7, 9], bpm: 60, prog: [0, 3, 1, 4], lead: 'pluck', pad: true, bass: true, dens: 0.3 },
  'cave:4': { root: 49, scale: [0, 3, 5, 7, 10], bpm: 70, prog: [0, 2, 3, 1], lead: 'glass', pad: true, dens: 0.38, oct: 12 },
  'cave:5': { root: 40, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 92, prog: [0, 1, 0, 6], lead: 'saw', bass: true, drums: 1, dens: 0.34 },
  'surface:0': { root: 55, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 84, prog: [0, 3, 4, 0], lead: 'pluck', pad: true, bass: true, dens: 0.45 },   // Planície: Sol maior
  'surface:1': { root: 50, scale: [0, 2, 4, 5, 7, 9, 10], bpm: 76, prog: [0, 6, 3, 4], lead: 'bell', pad: true, bass: true, dens: 0.4 },    // Floresta: Ré mixolídio
  'surface:2': { root: 52, scale: [0, 1, 4, 5, 7, 8, 10], bpm: 72, prog: [0, 1, 0, 6], lead: 'pluck', pad: true, dens: 0.32 },             // Deserto
  'surface:3': { root: 57, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 60, prog: [0, 5, 3, 6], lead: 'glass', pad: true, dens: 0.3 },              // Taiga: Lá menor
  'surface:4': { root: 48, scale: [0, 2, 3, 5, 7, 9, 10], bpm: 62, prog: [0, 3, 0, 4], lead: 'marimba', pad: true, bass: true, dens: 0.3 }, // Pântano: Dó dórico
  'surface:5': { root: 53, scale: [0, 2, 4, 7, 9], bpm: 70, prog: [0, 3, 1, 4], lead: 'pluck', pad: true, dens: 0.35 },                    // Praia
  'surface:6': { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 64, prog: [0, 5, 6, 4], lead: 'bell', pad: true, bass: true, dens: 0.32 },  // Montanhas
  'surface:7': { root: 53, scale: [0, 2, 4, 7, 9], bpm: 66, prog: [0, 3, 1, 4], lead: 'glass', pad: true, dens: 0.28 },                    // Oceano
};

const music = { theme: null, pending: null, t: 0, step: 0, bar: 0, inPhrase: 0, rest: 1, playing: false, deg: 9 };
const midi = (th, d) => { const L = th.scale.length, o = Math.floor(d / L); return th.root + th.scale[((d % L) + L) % L] + 12 * o; };

function instrument(name, t, f) {
  const B = { bus: 'music', t };
  switch (name) {
    case 'pluck': tone({ ...B, f, type: 'triangle', dur: 0.7, vol: 0.07, lp: 2200, verb: 0.45 }); break;
    case 'marimba': tone({ ...B, f, dur: 0.5, vol: 0.085, verb: 0.35 }); tone({ ...B, f: f * 4, dur: 0.07, vol: 0.02 }); break;
    case 'bell': tone({ ...B, f, dur: 1.6, vol: 0.05, verb: 0.55 }); tone({ ...B, f: f * 2.76, dur: 0.7, vol: 0.018, verb: 0.55 }); break;
    case 'glass': tone({ ...B, f: f * 2, dur: 2.2, vol: 0.032, verb: 0.75 }); tone({ ...B, f: f * 3.01, dur: 1.2, vol: 0.011, verb: 0.75 }); break;
    case 'saw': tone({ ...B, f, type: 'sawtooth', dur: 0.35, vol: 0.034, lp: 1100, verb: 0.3 }); break;
    default: tone({ ...B, f, type: 'square', dur: 0.16, vol: 0.028, lp: 2000, verb: 0.25 });
  }
}

function drum(kind, t) {
  const delay = Math.max(0, t - engine.ctx.currentTime);
  if (kind === 'kick') tone({ bus: 'music', t, f: 120, f2: 40, slide: 0.12, dur: 0.25, vol: 0.28 });
  if (kind === 'tom') tone({ bus: 'music', t, f: 170, f2: 80, dur: 0.3, vol: 0.14, verb: 0.3 });
  if (kind === 'snare') { tone({ bus: 'music', t, f: 200, type: 'triangle', dur: 0.05, vol: 0.08 }); noise({ bus: 'music', delay, ff: 1900, q: 0.8, dur: 0.12, vol: 0.14 }); }
  if (kind === 'hat') noise({ bus: 'music', delay, ft: 'highpass', ff: 7000, dur: 0.03, vol: 0.035 });
}

function playStep(th, t, st) {
  const bar = (60 / th.bpm) * 4, ch = th.prog[music.bar % th.prog.length], o = th.oct || 0;
  if (st === 0 && th.pad) {
    for (const k of [0, 2, 4]) {
      const f = NOTE(midi(th, ch + k) + o - 12);
      tone({ bus: 'music', t, f, type: 'triangle', a: bar * 0.3, dur: bar * 0.85, vol: 0.022, lp: 900, verb: 0.5 });
      tone({ bus: 'music', t, f: f * 1.004, a: bar * 0.3, dur: bar * 0.85, vol: 0.018, verb: 0.5 });
    }
  }
  if (th.bass && (th.eighth ? st % 2 === 0 : st === 0 || (st === 8 && Math.random() < 0.6))) {
    tone({ bus: 'music', t, f: NOTE(midi(th, ch) - 24 + o), type: th.eighth ? 'sawtooth' : 'triangle', dur: th.eighth ? 0.14 : bar * 0.45, vol: th.eighth ? 0.055 : 0.08, lp: th.eighth ? 520 : 650 });
  }
  if (th.drums === 1) { if (st === 0 || st === 8) drum('kick', t); if (st === 12 && Math.random() < 0.5) drum('tom', t); }
  if (th.drums === 2) { if (st % 4 === 0) drum('kick', t); if (st === 4 || st === 12) drum('snare', t); if (st % 2 === 0) drum('hat', t); }
  if (st % 2 !== 0 || Math.random() >= th.dens * (st % 4 === 0 ? 1.2 : 0.7)) return;
  // melodia: passos curtos, caindo em notas do acorde nos tempos fortes
  let d = music.deg + [-2, -1, -1, 1, 1, 2, 0][Math.random() * 7 | 0];
  if (st % 8 === 0) {
    let best = d, bd = 99;
    for (const c of [ch, ch + 2, ch + 4]) for (let k = -14; k <= 14; k += 7) { const dd = Math.abs(c + k - music.deg); if (dd < bd) { bd = dd; best = c + k; } }
    d = best;
  }
  music.deg = clamp(d, 4, 14);
  instrument(th.lead, t, NOTE(midi(th, music.deg) + o));
}

function desiredTheme() {
  if (!G.running) return 'title';
  if (G.enemies.some(e => ENEMIES[e.t].boss)) return 'boss';
  const w = G.world, b = w.biomeAt(G.player.x, G.player.y);
  if (w.isSurface && daylight() < 0.3) return 'night';
  return `${w.kind}:${b}`;
}

function musicTick() {
  const ctx = engine.ctx, want = desiredTheme();
  if (music.theme === null) { music.theme = want; music.t = ctx.currentTime + 0.1; }
  if (want !== music.theme) {
    const bossChange = (want === 'boss') !== (music.theme === 'boss');
    if (bossChange) Object.assign(music, { theme: want, step: 0, inPhrase: 0, rest: want === 'boss' ? 0 : 2, pending: null });
    else music.pending = want; // troca no início do próximo compasso
  }
  if (music.t < ctx.currentTime - 0.5) music.t = ctx.currentTime + 0.05; // aba voltou do segundo plano
  while (music.t < ctx.currentTime + LOOKAHEAD) {
    if (music.step % 16 === 0) {
      if (music.pending) Object.assign(music, { theme: music.pending, pending: null, inPhrase: 0, rest: Math.max(music.rest, 1) });
      if (music.rest > 0) { music.rest--; music.playing = false; }
      else {
        music.playing = true; music.bar++; music.inPhrase++;
        if (!THEMES[music.theme].loop && music.inPhrase >= PHRASE_BARS) { music.inPhrase = 0; music.rest = 3 + (Math.random() * 4 | 0); } // respiros de silêncio
      }
    }
    const th = THEMES[music.theme];
    if (music.playing) playStep(th, music.t, music.step % 16);
    music.t += 60 / th.bpm / 4;
    music.step++;
  }
}

// ---------- Ambiente ----------
// ff/av: filtro e volume do "ar" · df/dv: zumbido grave · ld: oscilação do vento · ev/rate: eventos
const AMBIENCE = {
  title: { ff: 300, av: 0.03, df: 41.2, dv: 0.02, ld: 100 },
  cave: [
    { ff: 360, av: 0.05, df: 55, dv: 0.022, ld: 120, ev: 'drip', rate: 0.4 },
    { ff: 700, av: 0.06, df: 49, dv: 0.028, ld: 400, ev: 'rock', rate: 0.22 },
    { ff: 520, av: 0.04, df: 65.4, dv: 0.02, ld: 200, ev: 'spore', rate: 0.7 },
    { ff: 300, av: 0.075, df: 43.6, dv: 0.024, ld: 150, ev: 'bubble', rate: 0.75 },
    { ff: 1800, av: 0.025, df: 69.3, dv: 0.02, ld: 600, ev: 'chime', rate: 0.45 },
    { ff: 220, av: 0.09, df: 36.7, dv: 0.05, ld: 80, ev: 'lava', rate: 0.85 },
  ],
  surface: [
    { ff: 900, av: 0.035, df: 0, dv: 0, ld: 500, ev: 'bird', rate: 0.5 },
    { ff: 1100, av: 0.04, df: 0, dv: 0, ld: 600, ev: 'bird', rate: 0.8 },
    { ff: 1400, av: 0.05, df: 0, dv: 0, ld: 900, ev: 'wind', rate: 0.2 },
    { ff: 1600, av: 0.06, df: 0, dv: 0, ld: 1200, ev: 'wind', rate: 0.3 },
    { ff: 500, av: 0.035, df: 0, dv: 0, ld: 200, ev: 'frog', rate: 0.6 },
    { ff: 400, av: 0.06, df: 0, dv: 0, ld: 150, ev: 'wave', rate: 0.35 },
    { ff: 1300, av: 0.06, df: 0, dv: 0, ld: 1000, ev: 'wind', rate: 0.3 },
    { ff: 380, av: 0.08, df: 0, dv: 0, ld: 140, ev: 'wave', rate: 0.5 },
  ],
};
const amb = { air: null, drone: null, lfoGain: null, key: null };

function startAmbience() {
  const ctx = engine.ctx;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = engine.noise; src.loop = true; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = 0;
  src.connect(f); f.connect(g); g.connect(engine.bus.amb); src.start();
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), dg = ctx.createGain();
  o1.frequency.value = 55; o2.frequency.value = 82.5; o2.detune.value = 8; dg.gain.value = 0;
  o1.connect(dg); o2.connect(dg); dg.connect(engine.bus.amb); o1.start(); o2.start();
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = 0.07; lg.gain.value = 100; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  Object.assign(amb, { air: { f, g }, drone: { o1, o2, g: dg }, lfoGain: lg });
}

function setAmbience(key, A) {
  const t = engine.ctx.currentTime;
  amb.key = key;
  amb.air.f.frequency.setTargetAtTime(A.ff, t, 1.5);
  amb.air.g.gain.setTargetAtTime(A.av, t, 1.5);
  amb.lfoGain.gain.setTargetAtTime(Math.min(A.ld, A.ff * 0.8), t, 1.5);
  if (A.df) { amb.drone.o1.frequency.setTargetAtTime(A.df, t, 2); amb.drone.o2.frequency.setTargetAtTime(A.df * 1.5, t, 2); }
  amb.drone.g.gain.setTargetAtTime(A.dv, t, 1.5);
}

const AMB_EVENTS = {
  drip: B => tone({ ...B, f: rand(900, 1600), f2: rand(380, 600), slide: 0.04, dur: 0.08, vol: 0.07, verb: 0.85 }),
  rock(B) {
    noise({ ...B, ft: 'lowpass', ff: 420, ff2: 70, a: 0.05, dur: rand(0.6, 1.4), vol: 0.12, verb: 0.6 });
    for (let k = 0; k < 3; k++) noise({ ...B, ff: rand(1500, 3000), q: 4, dur: 0.03, vol: 0.05, delay: rand(0.1, 0.8) });
  },
  spore(B) {
    if (Math.random() < 0.5) return noise({ ...B, ft: 'highpass', ff: 2200, a: 0.1, dur: 0.3, vol: 0.035, verb: 0.5 });
    const f = rand(3800, 5200);
    for (let k = 0; k < 4; k++) tone({ ...B, f, dur: 0.025, vol: 0.018, delay: k * 0.07 });
  },
  bubble(B) {
    for (let k = 0, n = 1 + Math.random() * 3 | 0; k < n; k++) tone({ ...B, f: rand(240, 460), f2: rand(700, 1150), dur: 0.06, vol: 0.055, delay: k * rand(0.05, 0.16), verb: 0.4 });
  },
  chime(B) {
    const m = 81 + [0, 3, 5, 7, 10][Math.random() * 5 | 0] + (Math.random() < 0.3 ? 12 : 0);
    tone({ ...B, f: NOTE(m), a: 0.01, dur: 2.6, vol: 0.035, verb: 0.9 });
    tone({ ...B, f: NOTE(m) * 2.01, dur: 1.2, vol: 0.01, verb: 0.9 });
  },
  lava(B) {
    if (Math.random() < 0.6) return tone({ ...B, f: rand(55, 90), f2: 34, dur: 0.22, vol: 0.15, lp: 300 });
    for (let k = 0; k < 5; k++) noise({ ...B, ft: 'highpass', ff: rand(2000, 5000), dur: 0.015, vol: 0.05, delay: k * rand(0.03, 0.09) });
  },
  bird(B) { // trinado: notas agudas descendo/subindo
    const base = rand(2400, 3600), n = 2 + (Math.random() * 4 | 0), up = Math.random() < 0.5;
    for (let k = 0; k < n; k++) tone({ ...B, f: base * (up ? 1 + k * 0.08 : 1 - k * 0.06), f2: base * 1.25, slide: 0.05, dur: 0.06, vol: 0.025, delay: k * 0.09, verb: 0.2 });
  },
  wind: B => noise({ ...B, ff: rand(400, 900), q: 5, a: 0.8, dur: 1.8, vol: 0.05 }),
  frog(B) { const f = rand(110, 160); for (let k = 0; k < 2; k++) tone({ ...B, f, f2: f * 0.8, type: 'sawtooth', dur: 0.12, vol: 0.05, lp: 500, delay: k * 0.18 }); },
  wave: B => noise({ ...B, ft: 'lowpass', ff: 300, ff2: 900, a: 0.9, dur: 1.6, vol: 0.09 }),
  cricket(B) { const f = rand(4300, 4900); for (let k = 0; k < 6; k++) tone({ ...B, f, dur: 0.018, vol: 0.016, delay: k * 0.045 }); },
  owl: B => [0, 0.35].forEach(d => tone({ ...B, f: 380, f2: 340, dur: 0.3, vol: 0.04, delay: d, verb: 0.4 })),
};

function ambienceTick() {
  if (!G.running) { if (amb.key !== 'title') setAmbience('title', AMBIENCE.title); return; }
  const w = G.world, b = w.biomeAt(G.player.x, G.player.y), night = w.isSurface && daylight() < 0.3;
  const A = AMBIENCE[w.kind][b], key = `${w.kind}:${b}:${night}`;
  if (key !== amb.key) setAmbience(key, A);
  if (G.paused) return;
  const ev = night ? (Math.random() < 0.08 ? 'owl' : 'cricket') : A.ev;
  if (Math.random() < (night ? 0.9 : A.rate) * (TICK_MS / 1000)) AMB_EVENTS[ev]({ bus: 'amb', pan: rand(-0.9, 0.9) });
}

// ---------- Fogo e alertas do jogador ----------
let beatT = 0, growlT = 0;
function proximityTick() {
  if (!G.running || G.paused) return;
  const p = G.player, w = G.world, px = Math.floor(p.x), py = Math.floor(p.y);
  let best = null, bd = 99;
  for (let dy = -7; dy <= 7; dy++) {
    for (let dx = -7; dx <= 7; dx++) {
      const x = px + dx, y = py + dy;
      if (!w.inb(x, y)) continue;
      const o = w.objs[w.idx(x, y)], weight = o && OBJECTS[o.t] && OBJECTS[o.t].fire;
      if (!weight) continue;
      const d = Math.hypot(dx, dy) * weight;
      if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; }
    }
  }
  if (best && Math.random() < 0.55) sfx.crackle(best.x, best.y);
  const now = engine.ctx.currentTime;
  if (p.hp < p.max * 0.25 && now > beatT) { beatT = now + 0.9; sfx.heartbeat(); }
  if (p.food < 15 && now > growlT) { growlT = now + 14; sfx.growl(); }
}

function tick() {
  if (!engine.ctx || engine.ctx.state !== 'running') return;
  try { musicTick(); ambienceTick(); proximityTick(); } catch (e) { console.error(e); }
}

export function startSoundscape() {
  startAmbience();
  setInterval(tick, TICK_MS);
}
