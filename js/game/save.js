// Salvar/carregar com versão e migração. Os biomas não são salvos: vêm da geração pela semente.
import { G } from '../core/state.js';
import { generateCave } from '../world/gen-cave.js';
import { generateSurface, seedWildPlants } from '../world/gen-surface.js';
import { buildVillage } from '../world/gen-village.js';
import { newPlayer } from './player.js';
import { stashCreatures } from './animals.js';

const SAVE_KEY = 'raizes_profundas_v1';
const SAVE_VERSION = 4; // 3: plantas selvagens e animais · 4: vilas e moradores
const PLAYER_FIELDS = ['x', 'y', 'hp', 'max', 'food', 'stamina', 'armor', 'sel', 'inv'];

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function saveGame() {
  if (!G.player) return;
  G.world.drops = G.drops;
  stashCreatures(G.world);
  const data = {
    version: SAVE_VERSION, seed: G.seed, time: G.time, day: G.day, world: G.world.kind,
    worlds: { surface: G.worlds.surface, cave: G.worlds.cave },
    player: Object.fromEntries(PLAYER_FIELDS.map(k => [k, G.player[k]])),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* sem espaço/sem acesso */ }
}

/** Cria um mundo novo com as duas camadas. */
export function newGame(seed) {
  G.seed = seed;
  G.time = 0.3; G.day = 1;
  G.worlds = { surface: generateSurface(seed), cave: generateCave(seed) };
  G.world = G.worlds.surface;
  G.drops = G.world.drops;
  G.player = newPlayer(G.world.spawn);
}

/** v1: só existia a caverna, salva no topo do objeto. */
function migrateV1(s) {
  return {
    version: 2, seed: s.seed, time: 0.3, day: 1, world: 'cave',
    worlds: { cave: { wall: s.wall, floor: s.floor, explored: s.explored, objs: s.objs, bosses: s.bosses } },
    player: s.p,
  };
}

/** Saves antigos não têm a passagem entre camadas: recria-a no lugar gerado. */
function ensureDoor(w) {
  const i = w.idx(w.door.x, w.door.y);
  if (w.objs[i]) return;
  w.clearArea(w.door.x, w.door.y, 2);
  w.objs[i] = { t: w.isSurface ? 'cave_door' : 'cave_exit' };
}

/** Saves antes da v4: constrói as vilas planejadas sobre o terreno salvo. */
function addVillages(w) {
  w.npcs = [];
  w.villages.forEach((v, i) => {
    const { npcs, creatures } = buildVillage(w, v, i);
    w.npcs.push(...npcs);
    w.creatures.push(...creatures);
  });
}

export function loadGame() {
  let s;
  try { s = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  if (!s) return false;
  if (!s.version) s = migrateV1(s);
  newGame(s.seed);
  G.time = s.time ?? 0.3;
  G.day = s.day ?? 1;
  for (const kind of ['surface', 'cave']) if (s.worlds[kind]) G.worlds[kind].load(s.worlds[kind]);
  for (const w of Object.values(G.worlds)) ensureDoor(w);
  if (s.version < 3 && s.worlds.surface) seedWildPlants(G.worlds.surface);
  if (s.version < 4 && s.worlds.surface) addVillages(G.worlds.surface);
  G.world = G.worlds[s.world] || G.worlds.surface;
  G.drops = G.world.drops;
  Object.assign(G.player, s.player || {});
  G.player.stamina = Math.min(G.player.stamina ?? 100, G.player.maxStamina);
  return true;
}
