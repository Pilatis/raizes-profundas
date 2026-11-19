// Combate: projéteis, dano em inimigos e no jogador, mortes e recompensas.
import { G } from '../core/state.js';
import { SET, diff } from '../core/settings.js';
import { emit } from '../core/events.js';
import { TAU } from '../core/util.js';
import { ENEMIES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { burst, spawnDrop } from './entities.js';
import { sfx } from '../audio/index.js';

const PLAYER_RADIUS = 0.32;
const INVULNERABLE = 0.8;

export const isBoss = e => !!ENEMIES[e.t].boss;

// ---------- Projéteis ----------
export function shoot(x, y, a, spd, dmg, col, from, r = 0.2, life = 3.5) {
  G.projs.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, dmg, col, from, r, life });
}

export function ring(e, n, spd, dmg, col, offset = 0) {
  for (let k = 0; k < n; k++) shoot(e.x, e.y, offset + (k / n) * TAU, spd, dmg, col, 'enemy', 0.22, 4);
}

export function updateProjectiles(dt) {
  const p = G.player, w = G.world;
  for (const q of G.projs) {
    q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt;
    if (q.life <= 0 || w.solidAt(Math.floor(q.x), Math.floor(q.y))) { q.dead = true; burst(q.x, q.y, q.col, 4, 2); continue; }
    if (q.from === 'enemy') {
      if (p.ifr <= 0 && Math.hypot(q.x - p.x, q.y - p.y) < q.r + PLAYER_RADIUS) {
        q.dead = true;
        const v = Math.hypot(q.vx, q.vy) || 1;
        hurtPlayer(q.dmg * diff().dmg, q.vx / v * 6, q.vy / v * 6);
      }
      continue;
    }
    for (const e of G.enemies) {
      if (e.dead || Math.hypot(q.x - e.x, q.y - e.y) >= q.r + e.r) continue;
      q.dead = true;
      damageEnemy(e, q.dmg, q.vx, q.vy);
      sfx.hit(e.x, e.y);
      break;
    }
  }
  G.projs = G.projs.filter(q => !q.dead);
}

// ---------- Inimigos ----------
export function damageEnemy(e, dmg, kx, ky) {
  const D = ENEMIES[e.t];
  if (D.armor) dmg *= 1 - D.armor;
  e.hp -= dmg;
  e.flash = 0.15;
  if (D.passive) { e.panic = 3; sfx.voice(D.voice, e.x, e.y, e.baby); }
  const d = Math.hypot(kx, ky) || 1, kb = isBoss(e) ? 1.2 : 7;
  e.vx += (kx / d) * kb; e.vy += (ky / d) * kb;
  burst(e.x, e.y, D.col, 5, 3);
  if (e.hp <= 0 && !e.dead) killEnemy(e);
}

export function killEnemy(e) {
  const D = ENEMIES[e.t], boss = isBoss(e);
  e.dead = true;
  burst(e.x, e.y, D.col, boss ? 40 : 16, boss ? 8 : 5);
  sfx.die(e.x, e.y, boss);
  if (!boss) {
    if (D.drop && Math.random() < (D.dropP ?? 1)) spawnDrop(e.x, e.y, D.drop, 1 + (Math.random() < 0.35));
    for (const [id, a, b] of D.loot || []) if (!e.baby) spawnDrop(e.x, e.y, id, a + Math.floor(Math.random() * (b - a + 1)));
    if (!D.passive && Math.random() < 0.25) spawnDrop(e.x, e.y, 'mushroom', 1);
    return;
  }
  if (e.home) e.home.done = true;
  sfx.victory();
  for (const [id, n] of D.drops) spawnDrop(e.x, e.y, id, n);
  emit('toast', `Você derrotou ${D.n}!`, null, { type: 'good' });
  for (const o of G.enemies) if (o !== e && !isBoss(o) && !ENEMIES[o.t].passive) o.dead = true;
  G.projs = G.projs.filter(q => q.from !== 'enemy');
  const left = G.worlds.cave.bosses.filter(b => !b.done).length;
  setTimeout(() => emit('toast', left ? `Restam ${left} guardiões nas profundezas.` : 'Todos os guardiões caíram. As profundezas são suas!'), 1800);
}

// ---------- Jogador ----------
export function hurtPlayer(n, kx = 0, ky = 0) {
  const p = G.player;
  if (p.armor) n *= 1 - ITEMS[p.armor].def;
  p.hp -= n;
  if (n > 0) {
    p.ifr = INVULNERABLE;
    p.kx = kx; p.ky = ky;
    if (SET.shake) G.shake = 0.25;
    sfx.hurt();
    burst(p.x, p.y, '#ff5a5a', 8, 3);
  }
  if (p.hp > 0) return;
  sfx.death();
  emit('toast', 'Você desmaiou... e acordou no ponto de partida.');
  const s = G.world.respawn || G.world.spawn;
  p.hp = p.max * 0.6;
  p.food = Math.max(p.food, 40);
  p.stamina = p.maxStamina;
  p.x = s.x; p.y = s.y;
  G.projs = [];
  G.enemies = G.enemies.filter(e => ENEMIES[e.t].passive || (!isBoss(e) && Math.hypot(e.x - s.x, e.y - s.y) > 14));
}
