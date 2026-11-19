// Agricultura: arar, regar, plantar, crescer e colher (cultivos e plantas selvagens).
import { G } from '../core/state.js';
import { emit } from '../core/events.js';
import { CROPS, WILD_PLANTS, FARMLAND_WET, TILL_SEED_CHANCE } from '../data/farming.js';
import { spawnDrop, burst } from './entities.js';
import { consumeSelected } from './inventory.js';
import { sfx } from '../audio/index.js';

const roll = ([id, a, b]) => [id, a + Math.floor(Math.random() * (b - a + 1))];
const cropOf = o => CROPS[o.c || 'mushroom']; // saves antigos: cultivo sem tipo = cogumelo

export const isCropReady = o => o.g >= 1;

/** Enxada: transforma grama/terra em solo arado. */
export function till(tx, ty) {
  const w = G.world, i = w.idx(tx, ty);
  if (w.wall[i] || w.objs[i] || w.isFarmland(i)) return false;
  if (!w.canTill(i)) { emit('toast', 'Não dá para arar este chão.', 'till'); return false; }
  const grass = w.isSurface;
  w.till(tx, ty);
  sfx.till();
  burst(tx + 0.5, ty + 0.6, '#6a4426', 6, 2);
  if (grass && Math.random() < TILL_SEED_CHANCE) spawnDrop(tx + 0.5, ty + 0.5, 'wheat_seed', 1);
  return true;
}

/** Regador: deixa o solo arado molhado (crescimento 2×). */
export function water(tx, ty) {
  const w = G.world, i = w.idx(tx, ty);
  if (!w.isFarmland(i)) { emit('toast', 'Use o regador no solo arado.', 'water'); return; }
  if (w.floor[i] === FARMLAND_WET) { emit('toast', 'Este solo já está regado.', 'water'); return; }
  w.floor[i] = FARMLAND_WET;
  sfx.water();
  burst(tx + 0.5, ty + 0.5, '#6ab0ff', 8, 2);
}

export function canPlant(def, i) {
  const w = G.world, crop = CROPS[def.crop];
  if (!crop || w.wall[i] || w.objs[i]) return false;
  if (crop.soil === 'farm') return w.isFarmland(i);
  return !w.isSurface && !w.isLiquid(i); // esporos crescem em qualquer chão da caverna
}

export function plantHint(def) {
  return CROPS[def.crop].soil === 'farm' ? 'Plante em solo arado — use a enxada primeiro.' : 'Esporos só crescem nas cavernas.';
}

export function plant(def, i) {
  G.world.objs[i] = { t: 'crop', c: def.crop, g: 0 };
  consumeSelected();
  sfx.place('obj');
}

/** Colhe um cultivo maduro ou uma planta selvagem. Devolve true se o objeto era colhível. */
export function harvest(o, i, cx, cy) {
  const w = G.world;
  if (o.t === 'crop') {
    if (!isCropReady(o)) { emit('toast', `${cropOf(o).n}: ainda está crescendo...`, 'grow'); return true; }
    const crop = cropOf(o);
    delete w.objs[i];
    for (const r of [crop.yield, crop.seedBack]) {
      if (!r) continue;
      const [id, n] = roll(r);
      if (n > 0) spawnDrop(cx, cy, id, n);
    }
    sfx.pluck();
    return true;
  }
  const wild = WILD_PLANTS[o.t];
  if (!wild) return false;
  delete w.objs[i];
  const [id, n] = roll(wild.drop);
  spawnDrop(cx, cy, id, n);
  sfx.pluck();
  return true;
}

/** Crescimento (chamado em intervalos): solo regado dobra a velocidade. */
export function growCrop(w, k, o, step) {
  const wet = w.floor[k] === FARMLAND_WET ? 2 : 1;
  o.g = Math.min(1, o.g + (step * wet) / cropOf(o).grow);
}
