// Entidades simples: itens no chão (com ímã) e partículas.
import { G } from '../core/state.js';
import { SET } from '../core/settings.js';
import { rand } from '../core/util.js';
import { ITEMS } from '../data/items.js';
import { addItem } from './inventory.js';
import { moveCircle } from './physics.js';
import { sfx } from '../audio/index.js';

const MAGNET_RANGE = 2.6;
const PICKUP_RANGE = 0.5;
const PICKUP_DELAY = 0.35;

export function spawnDrop(x, y, id, n = 1, thrown = false) {
  const f = G.player ? G.player.face : 0;
  G.drops.push({
    x, y, id, n, age: thrown ? -1 : 0,
    vx: thrown ? Math.cos(f) * 3 : rand(-2, 2),
    vy: thrown ? Math.sin(f) * 3 : rand(-2, 2),
  });
}

export function burst(x, y, c, n = 6, s = 3) {
  if (!SET.particles) return;
  for (let i = 0; i < n; i++) G.parts.push({ x, y, vx: rand(-s, s), vy: rand(-s, s), t: rand(0.3, 0.6), c });
}

export function updateDrops(dt) {
  const p = G.player, f = Math.exp(-6 * dt);
  for (const d of G.drops) {
    d.age += dt;
    d.vx *= f; d.vy *= f;
    const dx = p.x - d.x, dy = p.y - d.y, dist = Math.hypot(dx, dy);
    if (d.age > PICKUP_DELAY && dist < MAGNET_RANGE) {
      const a = (48 / (dist + 0.4)) * dt;
      d.vx += (dx / dist) * a; d.vy += (dy / dist) * a;
    }
    moveCircle(d, d.vx * dt, d.vy * dt, 0.12);
    if (d.age > PICKUP_DELAY && dist < PICKUP_RANGE) {
      const left = addItem(d.id, d.n);
      if (left < d.n) { burst(p.x, p.y, ITEMS[d.id].c, 3, 1.5); sfx.pickup(); }
      d.n = left;
      if (!left) d.dead = true; else d.age = -2; // inventário cheio: espera antes de tentar de novo
    }
  }
  if (G.drops.some(d => d.dead)) {
    const alive = G.drops.filter(d => !d.dead);
    G.drops.length = 0;
    G.drops.push(...alive); // mantém a referência compartilhada com world.drops
  }
}

export function updateParticles(dt) {
  for (const q of G.parts) { q.t -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; }
  G.parts = G.parts.filter(q => q.t > 0);
}
