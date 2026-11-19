// Engine de áudio: contexto, barramentos (música/efeitos/ambiente), reverberação e
// primitivas de síntese (tom e ruído). Tudo gerado — nenhum arquivo de som.
import { G } from '../core/state.js';
import { SET } from '../core/settings.js';
import { clamp } from '../core/util.js';

const BUSES = ['music', 'sfx', 'amb'];
const PAUSE_DUCK = { music: 0.35, amb: 0.3 };
const REVERB_WET = { cave: 1, surface: 0.3 }; // caverna ecoa, céu aberto quase nada

export const engine = { ctx: null, bus: {}, wet: {}, verb: {}, noise: null, out: null };
export const NOTE = m => 440 * Math.pow(2, (m - 69) / 12);

function impulse(ctx, dur, decay) {
  const n = ctx.sampleRate * dur | 0, b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
  }
  return b;
}

/** Cria o contexto (precisa de gesto do usuário). Devolve true na primeira vez. */
export function initEngine() {
  if (engine.ctx) { if (engine.ctx.state !== 'running') engine.ctx.resume(); return false; }
  let ctx;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return false; }
  engine.ctx = ctx;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  engine.out = ctx.createGain();
  comp.connect(engine.out); engine.out.connect(ctx.destination);
  const ir = impulse(ctx, 2.6, 2.4);
  for (const k of BUSES) {
    const bus = ctx.createGain(), wet = ctx.createGain(), verb = ctx.createConvolver();
    verb.buffer = ir;
    verb.connect(wet); wet.connect(bus); bus.connect(comp);
    engine.bus[k] = bus; engine.wet[k] = wet; engine.verb[k] = verb;
  }
  engine.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = engine.noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  applyVolume();
  return true;
}

export function applyVolume() {
  const { ctx, out, bus } = engine;
  if (!ctx) return;
  const t = ctx.currentTime;
  out.gain.setTargetAtTime(SET.vMaster, t, 0.05);
  bus.sfx.gain.setTargetAtTime(SET.vSfx, t, 0.05);
  bus.music.gain.setTargetAtTime(SET.vMusic * (G.paused ? PAUSE_DUCK.music : 1), t, 0.2);
  bus.amb.gain.setTargetAtTime(SET.vAmb * (G.paused ? PAUSE_DUCK.amb : 1), t, 0.2);
}

export function setSpace(kind) {
  if (!engine.ctx) return;
  for (const k of BUSES) engine.wet[k].gain.setTargetAtTime(REVERB_WET[kind] ?? 1, engine.ctx.currentTime, 0.5);
}

function envelope(g, t, a, d, v) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(Math.max(v, 0.0002), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

function destination(o) {
  const { ctx, bus, verb } = engine, g = ctx.createGain(), k = o.bus || 'sfx';
  let node = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); node = p; }
  node.connect(bus[k]);
  if (o.verb) { const s = ctx.createGain(); s.gain.value = o.verb; node.connect(s); s.connect(verb[k]); }
  return g;
}

/** Oscilador com envelope. o: { f, f2?, slide?, type?, dur, vol, a?, lp?, detune?, t?, delay?, bus?, pan?, verb? } */
export function tone(o) {
  const ctx = engine.ctx;
  if (!ctx || !(o.vol > 0) || !isFinite(o.f)) return;
  const t = Math.max(ctx.currentTime, o.t || ctx.currentTime) + (o.delay || 0), a = o.a || 0.005;
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.slide || o.dur));
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  envelope(g, t, a, o.dur, o.vol);
  let node = osc;
  if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); node = f; }
  node.connect(g); g.connect(destination(o));
  osc.start(t); osc.stop(t + a + o.dur + 0.05);
}

/** Ruído filtrado com envelope. o: { ft?, ff, ff2?, q?, dur, vol, a?, delay?, bus?, pan?, verb? } */
export function noise(o) {
  const ctx = engine.ctx;
  if (!ctx || !(o.vol > 0)) return;
  const t = ctx.currentTime + (o.delay || 0), a = o.a || 0.003;
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = engine.noise;
  f.type = o.ft || 'bandpass';
  f.frequency.setValueAtTime(o.ff || 1000, t);
  if (o.ff2) f.frequency.exponentialRampToValueAtTime(o.ff2, t + a + o.dur);
  f.Q.value = o.q || 1;
  envelope(g, t, a, o.dur, o.vol);
  src.connect(f); f.connect(g); g.connect(destination(o));
  src.start(t, Math.random() * 1.5); src.stop(t + a + o.dur + 0.05);
}

/** Pan e atenuação de um som no mundo em relação ao jogador. */
export function spatial(x, y, range = 16) {
  const p = G.player;
  if (!p || !isFinite(x) || !isFinite(y)) return { pan: 0, m: 0 };
  const dx = x - p.x, d = Math.hypot(dx, y - p.y);
  return { pan: clamp(dx / 9, -1, 1) * 0.85, m: clamp(1 - d / range, 0, 1) };
}
