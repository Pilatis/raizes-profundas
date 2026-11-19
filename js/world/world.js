// Uma camada do mundo (superfície ou caverna): mapas de blocos, objetos e metadados.
import { WORLD_SIZE } from '../core/state.js';
import { encodeBytes, decodeBytes } from '../core/util.js';
import { FLOORS, BIOMES, SURFACE, WATER, LAVA, WALLS, OBJECTS, BUILT_FLOOR } from '../data/world-data.js';
import { FARMLAND, FARMLAND_WET, TILLABLE, WATER_REACH } from '../data/farming.js';

export class World {
  constructor(kind, seed) {
    const n = WORLD_SIZE * WORLD_SIZE;
    this.kind = kind;            // 'surface' | 'cave'
    this.seed = seed;
    this.size = WORLD_SIZE;
    this.wall = new Uint8Array(n);
    this.floor = new Uint8Array(n);
    this.biome = new Uint8Array(n);
    this.explored = new Uint8Array(n);
    this.objs = {};              // índice -> objeto ({ t: 'torch' }, ...)
    this.wdmg = {};              // dano acumulado nas paredes
    this.bosses = [];            // guardiões ({ t, x, y, done })
    this.drops = [];             // itens no chão desta camada
    this.creatures = [];         // animais persistentes guardados enquanto a camada está inativa
    this.spawn = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
    this.door = null;            // passagem entre camadas ({ x, y })
    this.respawn = null;         // ponto de renascimento marcado por uma cama
    this.villages = [];          // vilas ({ name, x, y, biome })
    this.npcs = [];              // moradores (estado de comércio/pedidos persiste)
  }

  get isSurface() { return this.kind === 'surface'; }
  get palette() { return FLOORS[this.kind]; }
  get biomeNames() { return BIOMES[this.kind]; }

  idx(x, y) { return y * this.size + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.size && y < this.size; }
  wallAt(x, y) { return !this.inb(x, y) || this.wall[y * this.size + x] > 0; }
  floorAt(x, y) { return this.inb(x, y) ? this.floor[y * this.size + x] : 0; }

  biomeAt(x, y) {
    x = Math.floor(x); y = Math.floor(y);
    return this.inb(x, y) ? this.biome[this.idx(x, y)] : 0;
  }

  /** Bloqueia passagem: paredes e objetos sólidos (porta fechada). */
  solidAt(x, y) {
    if (this.wallAt(x, y)) return true;
    const o = this.objs[y * this.size + x];
    return !!(o && OBJECTS[o.t] && OBJECTS[o.t].solid && !o.open);
  }
  /** Bloqueia luz: paredes que não são transparentes (vidro e cerca deixam passar). */
  blocksLight(x, y) {
    if (!this.inb(x, y)) return true;
    const w = this.wall[y * this.size + x];
    return w > 0 && !WALLS[w].clear;
  }
  isBuiltFloor(i) { return this.floor[i] >= BUILT_FLOOR; }
  isLiquid(i) { const f = this.floor[i]; return f === WATER || f === LAVA; }
  liquidAt(x, y) { return this.inb(x, y) && this.isLiquid(this.idx(x, y)); }
  isFarmland(i) { const f = this.floor[i]; return f === FARMLAND || f === FARMLAND_WET; }
  canTill(i) { return TILLABLE[this.kind].includes(this.floor[i]); }

  /** Transforma em solo arado; já nasce regado se houver água por perto. */
  till(x, y) {
    let wet = false;
    for (let dy = -WATER_REACH; dy <= WATER_REACH && !wet; dy++) {
      for (let dx = -WATER_REACH; dx <= WATER_REACH; dx++) {
        if (this.inb(x + dx, y + dy) && this.floor[this.idx(x + dx, y + dy)] === WATER) { wet = true; break; }
      }
    }
    this.floor[this.idx(x, y)] = wet ? FARMLAND_WET : FARMLAND;
  }

  /** Chão "seco" do bioma — usado ao aterrar água/lava. */
  landFloor(i) {
    const b = this.biome[i];
    return this.isSurface && b === SURFACE.OCEAN ? SURFACE.BEACH + 1 : b + 1;
  }

  /** Abre um círculo transitável (remove paredes e líquidos). */
  clearArea(cx, cy, r, keepBedrock = true) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = Math.floor(cx) + dx, y = Math.floor(cy) + dy;
        if (!this.inb(x, y) || Math.hypot(dx, dy) >= r) continue;
        const i = this.idx(x, y);
        if (!(keepBedrock && this.wall[i] === 6)) this.wall[i] = 0;
        this.floor[i] = this.landFloor(i);
      }
    }
  }

  toJSON() {
    return {
      wall: encodeBytes(this.wall), floor: encodeBytes(this.floor), explored: encodeBytes(this.explored),
      objs: this.objs, bosses: this.bosses, drops: this.drops, creatures: this.creatures, respawn: this.respawn,
      villages: this.villages, npcs: this.npcs,
    };
  }

  /** Aplica dados salvos sobre um mundo recém-gerado (o bioma vem da geração). */
  load(data) {
    this.wall = decodeBytes(data.wall);
    if (data.floor) this.floor = decodeBytes(data.floor);
    if (data.explored) this.explored = decodeBytes(data.explored);
    this.objs = data.objs || {};
    if (data.bosses) this.bosses = data.bosses;
    this.drops = data.drops || [];
    this.creatures = data.creatures || [];
    this.respawn = data.respawn || null;
    if (data.villages) this.villages = data.villages;
    if (data.npcs) this.npcs = data.npcs.map(n => ({ ...n, talking: false, path: [], openedDoor: false })); // estado temporário zerado
  }
}
