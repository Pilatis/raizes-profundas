// Construção: validar e colocar blocos/pisos/objetos, aterrar líquidos, martelo e portas.
import { G, PLACE_REACH } from '../core/state.js';
import { emit } from '../core/events.js';
import { WALLS, LAVA, OBJECTS, FLOOR_STYLES } from '../data/world-data.js';
import { circleOverlapsTile } from './physics.js';
import { consumeSelected } from './inventory.js';
import { spawnDrop, burst } from './entities.js';
import { sfx } from '../audio/index.js';

const PLAYER_RADIUS = 0.34;
const CHEST_SLOTS = 20;

const overlapsCreature = (tx, ty) =>
  circleOverlapsTile(G.player.x, G.player.y, PLAYER_RADIUS, tx, ty) ||
  G.enemies.some(e => circleOverlapsTile(e.x, e.y, e.r, tx, ty));

/** Motivo pelo qual não dá para colocar o item ali, ou null se pode. Usado também pela prévia. */
export function placementProblem(def, tx, ty) {
  const w = G.world, p = G.player;
  if (!def.place || !w.inb(tx, ty)) return 'Fora do mundo.';
  if (Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) > PLACE_REACH) return 'Longe demais.';
  const i = w.idx(tx, ty);
  if (w.wall[i]) return 'Já tem um bloco aqui.';
  if (def.place === 'floor') {
    if (w.isLiquid(i)) return 'Aterre a água primeiro.';
    if (w.floor[i] === def.floor) return 'Este piso já está aqui.';
    return null;
  }
  if (w.objs[i]) return 'Já tem algo aqui.';
  if (w.isLiquid(i)) return def.place === 'wall' ? null : 'Aterre com um bloco primeiro.';
  if (def.place === 'wall' && overlapsCreature(tx, ty)) return 'Tem alguém no caminho.';
  return null;
}

function fillLiquid(i, tx, ty) {
  const w = G.world, lava = w.floor[i] === LAVA;
  burst(tx + 0.5, ty + 0.5, lava ? '#ff7a2a' : '#6ab0ff', 8, 3);
  if (lava) sfx.sizzle(); else sfx.splash();
  w.floor[i] = w.landFloor(i);
}

/** Coloca o item selecionado; devolve true se colocou. */
export function place(def, tx, ty) {
  const problem = placementProblem(def, tx, ty);
  if (problem) { emit('toast', problem, 'place'); return false; }
  const w = G.world, i = w.idx(tx, ty);
  if (def.place === 'wall' && w.isLiquid(i)) fillLiquid(i, tx, ty);           // bloco sobre líquido aterra
  else if (def.place === 'wall') { w.wall[i] = def.wall; sfx.place('block'); }
  else if (def.place === 'floor') {
    const old = w.floor[i];
    w.floor[i] = def.floor;
    if (FLOOR_STYLES[old]) spawnDrop(tx + 0.5, ty + 0.5, FLOOR_STYLES[old].item, 1); // trocar piso devolve o antigo
    sfx.place('block');
  } else {
    w.objs[i] = def.obj === 'chest' ? { t: 'chest', inv: new Array(CHEST_SLOTS).fill(null) } : { t: def.obj };
    if (OBJECTS[def.obj] && OBJECTS[def.obj].flicker) sfx.torch(); else sfx.place('obj');
  }
  consumeSelected();
  return true;
}

/** Martelo: desmonta construções na hora (blocos, pisos e objetos) devolvendo o item. */
export function hammer(tx, ty) {
  const w = G.world, i = w.idx(tx, ty), cx = tx + 0.5, cy = ty + 0.5, wl = w.wall[i];
  if (wl && WALLS[wl].built) {
    w.wall[i] = 0;
    delete w.wdmg[i];
    spawnDrop(cx, cy, WALLS[wl].drop, 1);
    burst(cx, cy, WALLS[wl].top, 8, 3);
    sfx.mine(WALLS[wl].mat, true);
    return true;
  }
  const o = w.objs[i];
  if (o && OBJECTS[o.t] && !OBJECTS[o.t].noPickup) { pickUp(i, cx, cy); return true; }
  const style = FLOOR_STYLES[w.floor[i]];
  if (!wl && style) {
    w.floor[i] = w.landFloor(i);
    spawnDrop(cx, cy, style.item, 1);
    burst(cx, cy, w.palette[w.floor[i]], 6, 2);
    sfx.place('block');
    return true;
  }
  return false;
}

export function pickUp(i, cx, cy) {
  const w = G.world, o = w.objs[i];
  delete w.objs[i];
  spawnDrop(cx, cy, OBJECTS[o.t].item, 1);
  burst(cx, cy, '#caa', 6, 3);
  sfx.place('obj');
}

/** Abre/fecha a porta (não fecha em cima de alguém). */
export function toggleDoor(o, tx, ty) {
  if (o.open && overlapsCreature(tx, ty)) { emit('toast', 'Tem alguém na porta.', 'door'); return; }
  o.open = !o.open;
  sfx.door(o.open);
}
