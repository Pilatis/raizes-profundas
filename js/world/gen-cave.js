// Geração da caverna: anéis de biomas ao redor do centro, minérios, líquidos, baús e arenas.
import { mulberry, hash, fbm } from '../core/util.js';
import { World } from './world.js';
import { LOOT, WATER, LAVA, BEDROCK } from '../data/world-data.js';
import { BOSS_SITES, BOSS_ARENA_RADIUS } from '../data/enemies.js';

const SHROOM_RATE = [0.022, 0.018, 0.07, 0.015, 0.01, 0.004];
const CHEST_COUNT = 36;

export function caveBiomeAt(x, y, s, c) {
  const d = Math.hypot(x - c, y - c);
  if (d < 38) return 0;
  let a = Math.atan2(y - c, x - c) / (2 * Math.PI) + 0.5 + (fbm(x / 30, y / 30, s + 30) - 0.5) * 0.35;
  a = ((a % 1) + 1) % 1;
  return d < 80 ? [1, 2, 3][Math.floor(a * 3) % 3] : [4, 5][Math.floor(a * 2) % 2];
}

function placeBosses(w, rnd, s, c) {
  const ang = rnd() * Math.PI * 2;
  w.bosses = [{ t: 'boss', x: Math.round(c + Math.cos(ang) * 58) + 0.5, y: Math.round(c + Math.sin(ang) * 58) + 0.5, done: false }];
  for (const [t, b, r0, r1] of BOSS_SITES) {
    for (let k = 0; k < 600; k++) {
      const a = rnd() * Math.PI * 2, r = r0 + rnd() * (r1 - r0);
      const x = Math.round(c + Math.cos(a) * r) + 0.5, y = Math.round(c + Math.sin(a) * r) + 0.5;
      if (caveBiomeAt(Math.floor(x), Math.floor(y), s, c) !== b) continue;
      if (w.bosses.some(o => Math.hypot(o.x - x, o.y - y) < 30)) continue;
      w.bosses.push({ t, x, y, done: false });
      break;
    }
  }
}

function wallFor(b, o, o2, h, d) {
  switch (b) {
    case 0: return h < 0.07 ? 7 : o > 0.7 ? 3 : 1;
    case 1: return o > 0.72 ? 3 : o2 > 0.72 && d > 52 ? 4 : h < 0.02 ? 7 : 2;
    case 2: return o > 0.62 ? 9 : o2 > 0.74 ? 3 : h < 0.04 ? 7 : 10;
    case 3: return o > 0.73 ? 12 : o2 > 0.72 ? 4 : 11;
    case 4: return o > 0.72 ? 5 : o2 > 0.7 ? 4 : h < 0.01 ? 7 : 8;
    default: return o > 0.7 ? 13 : o2 > 0.72 ? 12 : 14;
  }
}

export function lootFor(b, rnd) {
  const inv = new Array(20).fill(null), table = LOOT[b];
  let slot = 0;
  for (const [id, a, c] of table) {
    if (rnd() < 0.65) inv[slot++] = { id, n: a + Math.floor(rnd() * (c - a + 1)) }; // tabelas só têm itens empilháveis
  }
  if (!slot) inv[0] = { id: table[0][0], n: table[0][1] };
  return inv;
}

export function generateCave(seed) {
  const w = new World('cave', seed), S = w.size, c = S / 2, s = seed, rnd = mulberry(s);
  placeBosses(w, rnd, s, c);
  const nearBoss = (x, y, r) => w.bosses.some(b => Math.hypot(x - b.x, y - b.y) < r);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = w.idx(x, y), d = Math.hypot(x - c, y - c), b = caveBiomeAt(x, y, s, c);
      w.biome[i] = b;
      w.floor[i] = b + 1;
      if (x < 2 || y < 2 || x >= S - 2 || y >= S - 2) { w.wall[i] = BEDROCK; continue; }
      const safe = d < 6 || nearBoss(x, y, BOSS_ARENA_RADIUS);
      const open = fbm(x / 11, y / 11, s) > (b === 2 ? 0.5 : 0.56) || Math.abs(fbm(x / 26, y / 26, s + 9) - 0.5) < 0.02 || safe;
      if (open) {
        if (!safe && b === 3 && fbm(x / 9, y / 9, s + 20) > 0.5) { w.floor[i] = WATER; continue; }
        if (!safe && b === 5 && fbm(x / 8, y / 8, s + 21) > 0.6) { w.floor[i] = LAVA; continue; }
        if (d > 4 && hash(x, y, s + 5) < SHROOM_RATE[b] && !safe) w.objs[i] = { t: 'shroom' };
        continue;
      }
      w.wall[i] = wallFor(b, fbm(x / 5, y / 5, s + 3), fbm(x / 6, y / 6, s + 4), hash(x, y, s + 11), d);
    }
  }

  for (let k = 0, placed = 0; k < 3000 && placed < CHEST_COUNT; k++) {
    const x = 2 + Math.floor(rnd() * (S - 4)), y = 2 + Math.floor(rnd() * (S - 4)), i = w.idx(x, y);
    if (w.wall[i] || w.objs[i] || w.isLiquid(i) || Math.hypot(x - c, y - c) < 12 || nearBoss(x, y, 9)) continue;
    w.objs[i] = { t: 'chest', inv: lootFor(w.biome[i], rnd) };
    placed++;
  }

  // saída para a superfície no centro
  w.door = { x: c, y: c - 3 };
  w.objs[w.idx(w.door.x, w.door.y)] = { t: 'cave_exit' };
  w.objs[w.idx(c + 2, c)] = { t: 'campfire' };
  w.spawn = { x: c + 0.5, y: c - 1.5 };
  return w;
}
