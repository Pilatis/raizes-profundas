// Passagem do tempo: ciclo de dia/noite, crescimento de plantas e dormir na cama.
import { G, DAY_LENGTH } from '../core/state.js';
import { emit } from '../core/events.js';
import { ENEMIES } from '../data/enemies.js';
import { daylight } from '../world/light.js';
import { growCrop } from './farming.js';

const PLANT_TICK = 1;        // atualiza plantas uma vez por segundo
const BUSH_REGROW = 120;     // segundos para o arbusto dar frutos de novo
const WAKE_TIME = 0.25;      // 6h da manhã
const SLEEP_HEAL = 30;
const SLEEP_HUNGER = 15;
let plantTimer = 0;

export function updateTime(dt) {
  const before = G.time;
  G.time += dt / DAY_LENGTH;
  if (G.time >= 1) { G.time -= 1; G.day++; }
  if (G.world.isSurface && before < 0.8 && G.time >= 0.8) emit('toast', 'A noite está chegando... criaturas saem das sombras.', null, { type: 'warn' });
  if (G.world.isSurface && before < 0.2 && G.time >= 0.2) emit('toast', `Amanheceu — dia ${G.day}.`);
}

export function growPlants(dt) {
  if ((plantTimer += dt) < PLANT_TICK) return;
  const step = plantTimer;
  plantTimer = 0;
  for (const w of Object.values(G.worlds)) {
    for (const k in w.objs) {
      const o = w.objs[k];
      if (o.t === 'crop' && o.g < 1) growCrop(w, k, o, step);
      else if (o.t === 'bush' && o.g < 1) o.g = Math.min(1, o.g + step / BUSH_REGROW);
    }
  }
}

/** Cama: marca o renascimento e, à noite na superfície, dorme até a manhã. */
export function useBed(tx, ty) {
  const w = G.world, p = G.player;
  w.respawn = { x: tx + 0.5, y: ty + 1.5 };
  if (!w.isSurface || daylight() >= 0.35) { emit('toast', 'Ponto de renascimento marcado. Só dá para dormir à noite.'); return; }
  if (G.enemies.some(e => !ENEMIES[e.t].passive && Math.hypot(e.x - p.x, e.y - p.y) < 10)) {
    emit('toast', 'Você não pode dormir com monstros por perto!', 'sleep');
    return;
  }
  if (G.time > 0.5) G.day++;
  G.time = WAKE_TIME;
  p.hp = Math.min(p.max, p.hp + SLEEP_HEAL);
  p.food = Math.max(0, p.food - SLEEP_HUNGER);
  G.enemies = G.enemies.filter(e => ENEMIES[e.t].passive);
  emit('sleep');
  emit('toast', `Você dormiu bem. Bom dia — dia ${G.day}!`);
}

/** Texto do relógio, ex.: "Dia 3 · 14:20". */
export function clockText() {
  const mins = Math.floor(G.time * 24 * 60);
  const hh = String(Math.floor(mins / 60)).padStart(2, '0'), mm = String(mins % 60).padStart(2, '0');
  return `Dia ${G.day} · ${hh}:${mm}`;
}
