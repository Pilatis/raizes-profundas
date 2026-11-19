// Geração de vilas na superfície: escolha dos locais e construção (casas, poço,
// caminhos, plantação e curral) usando os mesmos blocos que o jogador constrói.
import { mulberry } from '../core/util.js';
import { WATER } from '../data/world-data.js';
import { FARMLAND } from '../data/farming.js';
import {
  PROFESSIONS, VILLAGE_COUNT, VILLAGE_RADIUS, VILLAGE_BIOMES, VILLAGE_MIN_SPAWN_DIST, VILLAGE_MIN_GAP,
  VILLAGE_NAMES, NPC_NAMES, HOUSE_STYLE, PATH_FLOOR,
} from '../data/npcs.js';

const SEED_OFFSET = 2000;
const HOUSE = 5;                                            // casa 5×5 (interior 3×3)
const HOUSE_SLOTS = [[-7, -7], [3, -7], [-7, 3], [3, 3]];  // canto superior esquerdo, relativo ao centro
const PROF_ORDER = Object.keys(PROFESSIONS);
const FENCE = 25, GLASS = 24;

function areaIsDry(w, cx, cy, r) {
  let wet = 0, total = 0;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (!w.inb(cx + dx, cy + dy)) return false;
    total++;
    if (w.floor[w.idx(cx + dx, cy + dy)] === WATER) wet++;
  }
  return wet / total < 0.08;
}

/** Escolhe os locais das vilas (determinístico pela semente). */
export function planVillages(w) {
  const rnd = mulberry(w.seed + SEED_OFFSET), out = [], S = w.size, margin = VILLAGE_RADIUS + 4;
  for (let k = 0; k < 400 && out.length < VILLAGE_COUNT; k++) {
    const a = rnd() * Math.PI * 2, d = VILLAGE_MIN_SPAWN_DIST + rnd() * 70;
    const x = Math.round(w.spawn.x + Math.cos(a) * d), y = Math.round(w.spawn.y + Math.sin(a) * d);
    if (x < margin || y < margin || x >= S - margin || y >= S - margin) continue;
    if (!VILLAGE_BIOMES.includes(w.biomeAt(x, y)) || !areaIsDry(w, x, y, VILLAGE_RADIUS)) continue;
    if (w.door && Math.hypot(x - w.door.x, y - w.door.y) < 30) continue;
    if (out.some(v => Math.hypot(v.x - x, v.y - y) < VILLAGE_MIN_GAP)) continue;
    out.push({ name: VILLAGE_NAMES[(rnd() * VILLAGE_NAMES.length) | 0], x, y, biome: w.biomeAt(x, y) });
  }
  // nomes diferentes entre si
  out.forEach((v, i) => { if (out.findIndex(o => o.name === v.name) !== i) v.name = VILLAGE_NAMES[(VILLAGE_NAMES.indexOf(v.name) + i) % VILLAGE_NAMES.length]; });
  return out;
}

function setFloor(w, x, y, f) { const i = w.idx(x, y); w.wall[i] = 0; w.floor[i] = f; }

/** Casa com a porta virada para o centro da vila (doorTop = porta na parede de cima). */
function buildHouse(w, hx, hy, wallId, floorId, doorTop) {
  for (let y = 0; y < HOUSE; y++) for (let x = 0; x < HOUSE; x++) {
    const i = w.idx(hx + x, hy + y), edge = x === 0 || y === 0 || x === HOUSE - 1 || y === HOUSE - 1;
    delete w.objs[i];
    w.floor[i] = floorId;
    w.wall[i] = edge ? wallId : 0;
  }
  const doorY = doorTop ? hy : hy + HOUSE - 1, backY = doorTop ? hy + 3 : hy + 1, frontY = doorTop ? hy + 1 : hy + 3;
  const windowY = doorTop ? hy + HOUSE - 1 : hy;
  w.wall[w.idx(hx + 1, windowY)] = GLASS; w.wall[w.idx(hx + 3, windowY)] = GLASS;
  const door = { x: hx + 2, y: doorY };
  w.wall[w.idx(door.x, door.y)] = 0;
  w.objs[w.idx(door.x, door.y)] = { t: 'door', open: false };
  w.objs[w.idx(hx + 1, backY)] = { t: 'bed' };
  w.objs[w.idx(hx + 3, backY)] = { t: 'lantern' };
  w.objs[w.idx(hx + 3, frontY)] = { t: 'table' };
  const outside = { x: door.x + 0.5, y: door.y + (doorTop ? -0.5 : 1.5) };
  return { door, outside, bed: { x: hx + 2.5, y: backY + 0.5 }, rect: { x: hx, y: hy, size: HOUSE } };
}

function buildPaths(w, cx, cy) {
  const pave = (x, y) => { const i = w.idx(x, y); if (!w.wall[i] && !w.objs[i]) w.floor[i] = PATH_FLOOR; };
  for (let x = cx - 9; x <= cx + 9; x++) pave(x, cy);
  for (const col of [cx - 5, cx + 5]) for (let y = cy - 2; y <= cy + 2; y++) pave(col, y);
}

function buildField(w, cx, cy, rnd) {
  for (let y = cy + 3; y <= cy + 6; y++) for (let x = cx - 1; x <= cx + 1; x++) {
    setFloor(w, x, y, FARMLAND);
    w.objs[w.idx(x, y)] = { t: 'crop', c: rnd() < 0.7 ? 'wheat' : 'carrot', g: rnd() };
  }
}

/** Curral cercado com animais; devolve as criaturas (persistentes) para a camada. */
function buildPen(w, cx, cy, rnd) {
  const x0 = cx - 2, y0 = cy - 8, animals = [];
  for (let y = y0; y <= y0 + 4; y++) for (let x = x0; x <= x0 + 4; x++) {
    const edge = x === x0 || y === y0 || x === x0 + 4 || y === y0 + 4;
    delete w.objs[w.idx(x, y)];
    w.wall[w.idx(x, y)] = edge ? FENCE : 0;
  }
  const kinds = ['cow', 'sheep', 'chicken'];
  for (let k = 0; k < 3; k++) animals.push({ t: kinds[k], x: x0 + 1.5 + k, y: y0 + 2.5, owned: true });
  return animals;
}

/** Constrói a vila no mapa e devolve { npcs, creatures }. */
export function buildVillage(w, v, index) {
  const rnd = mulberry(w.seed + SEED_OFFSET + index * 97), { x: cx, y: cy } = v;
  w.clearArea(cx, cy, VILLAGE_RADIUS + 1);
  for (let dy = -VILLAGE_RADIUS; dy <= VILLAGE_RADIUS; dy++) for (let dx = -VILLAGE_RADIUS; dx <= VILLAGE_RADIUS; dx++) {
    const i = w.idx(cx + dx, cy + dy);
    if (Math.hypot(dx, dy) < VILLAGE_RADIUS + 1 && w.objs[i] && w.objs[i].t !== 'cave_door') delete w.objs[i];
  }
  const [wallId, floorId] = HOUSE_STYLE[v.biome] || HOUSE_STYLE[0];
  const npcs = HOUSE_SLOTS.map(([ox, oy], k) => {
    const home = buildHouse(w, cx + ox, cy + oy, wallId, floorId, oy > 0), prof = PROF_ORDER[k % PROF_ORDER.length];
    return {
      prof, name: NPC_NAMES[(rnd() * NPC_NAMES.length) | 0], village: index, home,
      x: home.outside.x, y: home.outside.y, quest: 0, questDay: 0, stock: {}, stockDay: 0,
    };
  });
  buildPaths(w, cx, cy);
  buildField(w, cx, cy, rnd);
  const creatures = buildPen(w, cx, cy, rnd);
  w.objs[w.idx(cx, cy)] = { t: 'well' };
  for (const [dx, dy] of [[-2, -1], [2, -1], [-9, 1], [9, 1]]) { const i = w.idx(cx + dx, cy + dy); if (!w.wall[i] && !w.objs[i]) w.objs[i] = { t: 'lantern' }; }
  return { npcs, creatures };
}

/** Planeja e constrói todas as vilas da superfície. */
export function generateVillages(w) {
  w.villages = planVillages(w);
  w.npcs = [];
  w.villages.forEach((v, i) => {
    const { npcs, creatures } = buildVillage(w, v, i);
    w.npcs.push(...npcs);
    w.creatures.push(...creatures);
  });
}
