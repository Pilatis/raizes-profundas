// Geração da superfície: biomas por elevação × temperatura × umidade (oceano, praia,
// montanha, planície, floresta, deserto, taiga, pântano), vegetação e a entrada da caverna.
import { hash, fbm } from '../core/util.js';
import { World } from './world.js';
import { WATER, BEDROCK, SURFACE as B } from '../data/world-data.js';
import { WILD_PLANTS } from '../data/farming.js';
import { generateVillages } from './gen-village.js';

const OFFSET = 1000; // a superfície usa sementes diferentes da caverna

function elevation(x, y, s, S) {
  const c = S / 2;
  const edge = Math.min(x, y, S - 1 - x, S - 1 - y);
  const e = fbm(x / 45, y / 45, s) * 0.75 + fbm(x / 12, y / 12, s + 7) * 0.25;
  const coast = Math.max(0, (18 - edge) / 18) * 0.55;               // bordas viram oceano
  const center = Math.max(0, (40 - Math.hypot(x - c, y - c)) / 40) * 0.14; // centro sempre em terra
  return e - coast + center;
}

function biomeFor(e, temp, hum) {
  if (e < 0.36) return B.OCEAN;
  if (e < 0.4) return B.BEACH;
  if (e > 0.68) return B.MOUNTAIN;
  if (temp < 0.38) return B.TAIGA;
  if (temp > 0.6 && hum < 0.48) return B.DESERT;
  if (hum > 0.6) return B.SWAMP;
  if (hum > 0.5) return B.FOREST;
  return B.PLAINS;
}

// Vegetação e rochas: devolve [parede, objeto?]
function featureFor(b, x, y, s) {
  const h = hash(x, y, s + 5), o = fbm(x / 5, y / 5, s + 3), v = hash(x, y, s + 9); // v: variedade da espécie
  switch (b) {
    case B.PLAINS:
      if (h < 0.004) return [31];
      if (h < 0.022) return [16];
      if (h > 0.996) return [18];
      if (h < 0.034) return [0, 'bush'];
      return [0];
    case B.FOREST:
      if (fbm(x / 8, y / 8, s + 41) > 0.48 && h < 0.34) return [v < 0.45 ? 16 : v < 0.75 ? 26 : 32];
      if (h > 0.97) return [0, 'bush'];
      return [0];
    case B.DESERT:
      if (h < 0.018) return [19];
      if (h < 0.022) return [29];
      if (o > 0.74) return [21];
      return [0];
    case B.TAIGA:
      if (h < 0.12) return [v < 0.55 ? 30 : 17];
      if (o > 0.76) return [20];
      return [0];
    case B.SWAMP:
      if (h < 0.05) return [v < 0.7 ? 28 : 16];
      if (h > 0.985) return [0, 'bush'];
      return [0];
    case B.BEACH:
      return h < 0.014 ? [27] : [0];
    case B.MOUNTAIN: {
      if (fbm(x / 7, y / 7, s + 51) < 0.42) return h < 0.04 ? [30] : [0];
      if (o > 0.72) return [3];
      if (fbm(x / 6, y / 6, s + 4) > 0.74) return [4];
      return [18];
    }
    default: return [0];
  }
}

function placeWildPlant(w, i, b, x, y, s) {
  let r = hash(x, y, s + 77);
  for (const t in WILD_PLANTS) {
    const rule = WILD_PLANTS[t].spawn.find(([biome]) => biome === b);
    if (!rule) continue;
    if (r < rule[1]) { w.objs[i] = { t }; return; }
    r -= rule[1];
  }
}

/** Espalha plantas selvagens nos blocos livres (usado também ao migrar saves antigos). */
export function seedWildPlants(w) {
  const s = w.seed + OFFSET;
  for (let y = 1; y < w.size - 1; y++) {
    for (let x = 1; x < w.size - 1; x++) {
      const i = w.idx(x, y);
      if (!w.wall[i] && !w.objs[i] && w.floor[i] === w.biome[i] + 1) placeWildPlant(w, i, w.biome[i], x, y, s);
    }
  }
}

/** Procura, em espiral a partir do centro, um bloco de planície/floresta livre. */
function findSpawn(w) {
  const c = w.size / 2;
  for (let r = 0; r < 60; r++) {
    for (let a = 0; a < 32; a++) {
      const x = Math.round(c + Math.cos(a / 32 * Math.PI * 2) * r), y = Math.round(c + Math.sin(a / 32 * Math.PI * 2) * r);
      const b = w.biomeAt(x, y);
      if ((b === B.PLAINS || b === B.FOREST) && w.floorAt(x, y) !== WATER) return { x, y };
    }
  }
  return { x: c, y: c };
}

export function generateSurface(seed) {
  const w = new World('surface', seed), S = w.size, s = seed + OFFSET;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const i = w.idx(x, y);
      const b = biomeFor(elevation(x, y, s, S), fbm(x / 70, y / 70, s + 11), fbm(x / 60, y / 60, s + 23));
      w.biome[i] = b;
      w.floor[i] = b === B.OCEAN ? WATER : b + 1;
      if (x === 0 || y === 0 || x === S - 1 || y === S - 1) { w.wall[i] = BEDROCK; continue; }
      if (b === B.SWAMP && fbm(x / 6, y / 6, s + 31) > 0.62) { w.floor[i] = WATER; continue; }
      if (b === B.OCEAN) continue;
      const [wall, obj] = featureFor(b, x, y, s);
      w.wall[i] = wall;
      if (obj === 'bush') w.objs[i] = { t: 'bush', g: 1 };
      else if (!wall) placeWildPlant(w, i, b, x, y, s);
    }
  }

  const sp = findSpawn(w);
  w.clearArea(sp.x, sp.y, 4);
  w.spawn = { x: sp.x + 0.5, y: sp.y + 0.5 };
  // entrada da caverna, perto do ponto inicial
  const dx = sp.x + 7, dy = sp.y - 2;
  w.clearArea(dx, dy, 3);
  w.door = { x: dx, y: dy };
  w.objs[w.idx(dx, dy)] = { t: 'cave_door' };
  generateVillages(w);
  return w;
}
