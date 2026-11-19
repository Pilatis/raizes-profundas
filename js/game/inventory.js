// Inventário, criação de itens e informações do guia (de onde vem cada item).
import { G } from '../core/state.js';
import { emit } from '../core/events.js';
import { ITEMS, UNSTACKABLE, RECIPES, STATIONS, KIND_CATEGORY, DESCRIPTIONS, TIER_PICK } from '../data/items.js';
import { WALLS, WALL_FOUND, LOOT, BIOMES } from '../data/world-data.js';
import { ENEMIES } from '../data/enemies.js';
import { CROPS, WILD_PLANTS, WILD_BIOME_NAMES } from '../data/farming.js';

export const INV_SIZE = 30;
export const HOTBAR_SIZE = 10;
const STACK = 99;
const STATION_RANGE = 4.5;

export const stackMax = id => (UNSTACKABLE.includes(ITEMS[id].k) ? 1 : STACK);

/** Adiciona ao array de espaços; devolve o que não coube. */
export function addTo(slots, id, n) {
  const mx = stackMax(id);
  for (let i = 0; i < slots.length && n > 0; i++) {
    const s = slots[i];
    if (s && s.id === id && s.n < mx) { const a = Math.min(n, mx - s.n); s.n += a; n -= a; }
  }
  for (let i = 0; i < slots.length && n > 0; i++) {
    if (!slots[i]) { const a = Math.min(n, mx); slots[i] = { id, n: a }; n -= a; }
  }
  return n;
}

export function addItem(id, n = 1) {
  const left = addTo(G.player.inv, id, n);
  emit('inv');
  return left;
}

export const count = id => G.player.inv.reduce((s, it) => s + (it && it.id === id ? it.n : 0), 0);
export const has = id => G.player.inv.some(it => it && it.id === id);
export const selected = () => G.player.inv[G.player.sel];

export function take(id, n) {
  const inv = G.player.inv;
  for (let i = inv.length - 1; i >= 0 && n > 0; i--) {
    const it = inv[i];
    if (!it || it.id !== id) continue;
    const a = Math.min(n, it.n);
    it.n -= a; n -= a;
    if (!it.n) inv[i] = null;
  }
  emit('inv');
}

export function consumeSelected() {
  const p = G.player, it = p.inv[p.sel];
  if (!it) return;
  if (--it.n <= 0) p.inv[p.sel] = null;
  emit('inv');
}

/** Move a pilha do espaço i de `from` para `to` (baú <-> inventário). */
export function transfer(from, i, to) {
  const it = from[i];
  if (!it) return;
  const left = addTo(to, it.id, it.n);
  if (left) it.n = left; else from[i] = null;
  emit('inv');
}

export function swapSlots(a, b) {
  const inv = G.player.inv;
  [inv[a], inv[b]] = [inv[b], inv[a]];
  emit('inv');
}

// ---------- Criação ----------
/** Há uma estação do tipo t perto do jogador? (varre só a vizinhança) */
export function nearStation(t) {
  const w = G.world, p = G.player, r = Math.ceil(STATION_RANGE);
  const px = Math.floor(p.x), py = Math.floor(p.y);
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = px + dx, y = py + dy;
      if (!w.inb(x, y)) continue;
      const o = w.objs[w.idx(x, y)];
      if (o && o.t === t && Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < STATION_RANGE) return true;
    }
  }
  return false;
}

export const nearbyStations = () => Object.fromEntries(Object.keys(STATIONS).map(s => [s, nearStation(s)]));

export function canCraft(r, near) {
  return (!r.s || near[r.s]) && Object.entries(r.i).every(([k, n]) => count(k) >= n);
}

/** Fabrica até `times` vezes; devolve [quantas vezes, sobra que não coube]. */
export function craft(r, times, near) {
  let made = 0, overflow = 0;
  while (made < times && canCraft(r, near)) {
    for (const k in r.i) take(k, r.i[k]);
    overflow += addItem(r.o, r.n || 1);
    made++;
  }
  return [made, overflow];
}

// ---------- Guia ----------
export const categoryOf = id => KIND_CATEGORY[ITEMS[id].k] ?? 6;

export function describe(id) {
  const it = ITEMS[id];
  if (DESCRIPTIONS[id]) return DESCRIPTIONS[id];
  switch (it.k) {
    case 'pick': return `Força ${it.pow} · minera blocos até o nível ${it.tier}.`;
    case 'sword': return `Dano ${it.dmg} por golpe.`;
    case 'staff': return `Arma à distância: dispara projéteis de dano ${it.dmg} (segure o clique esquerdo).`;
    case 'armor': return `Reduz ${it.def * 100 | 0}% do dano recebido. Clique direito para vestir.`;
    default: return '';
  }
}

export function recipeText(r) {
  const ing = Object.entries(r.i).map(([k, n]) => `${n}× ${ITEMS[k].n}`).join(' + ');
  return ing + (r.s ? ` (perto de: ${STATIONS[r.s]})` : ' (em qualquer lugar)');
}

/** Lista de textos "como obter" gerada a partir dos dados. */
export function sourcesOf(id) {
  const out = [];
  for (const w in WALLS) {
    const d = WALLS[w];
    if ((d.drop !== id && d.extra !== id) || d.built) continue; // blocos construídos vêm da criação
    const where = (WALL_FOUND[w] || []).join(', ');
    const tier = d.tier > 0 && d.tier < 99 ? ` · requer ${TIER_PICK[d.tier]}` : '';
    out.push(`Minerar ${d.n}${where ? ` (${where})` : ''}${tier}${d.extra === id ? ' · às vezes' : ''}`);
  }
  for (const k in ENEMIES) {
    const e = ENEMIES[k];
    if (e.drop === id) out.push(`Derrotar ${e.n}${e.dropP ? ' · às vezes' : ''}`);
    if (e.drops && e.drops.some(d => d[0] === id)) out.push(`Recompensa do chefe ${e.n} (☠ no mapa)`);
    if (e.loot && e.loot.some(d => d[0] === id)) out.push(`Abater ${e.n.toLowerCase()}s (animal da superfície)`);
    if (e.lays && e.lays.id === id) out.push(`${e.n}s botam sozinhas de tempos em tempos`);
  }
  for (const k in WILD_PLANTS) {
    const p = WILD_PLANTS[k];
    if (p.drop[0] === id) out.push(`Colher ${p.n.toLowerCase()} (${p.spawn.map(([b]) => WILD_BIOME_NAMES[b]).join(', ')})`);
  }
  for (const k in CROPS) {
    const c = CROPS[k];
    if (c.yield[0] === id || (c.seedBack && c.seedBack[0] === id)) out.push(`Cultivar ${c.n.toLowerCase()} (${c.soil === 'farm' ? 'solo arado' : 'chão da caverna'})`);
  }
  if (id === 'wheat_seed') out.push('Às vezes, ao arar grama com a enxada');
  if (id === 'mushroom') out.push('Colher cogumelos ou plantações maduras', 'Às vezes, ao derrotar inimigos');
  if (id === 'seed') out.push('Às vezes, ao colher cogumelos e plantações');
  if (id === 'berries') out.push('Colher arbustos de frutas na superfície (Planície, Floresta, Pântano)');
  const lootBiomes = LOOT.map((t, b) => (t.some(e => e[0] === id) ? BIOMES.cave[b] : null)).filter(Boolean);
  if (lootBiomes.length) out.push('Baús de tesouro: ' + lootBiomes.join(', '));
  for (const r of RECIPES) if (r.o === id) out.push('Criar: ' + recipeText(r) + (r.n ? ` → ${r.n} unidades` : ''));
  return out;
}
