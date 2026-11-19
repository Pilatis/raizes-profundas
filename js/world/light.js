// Iluminação por região visível: BFS a partir das fontes (paredes bloqueiam), brilhos
// baratos sem bloqueio e luz ambiente do sol na superfície. Resultado vai para um
// canvas de 1 pixel por bloco que o renderer escala com suavização.
import { G, TILE } from '../core/state.js';
import { SET } from '../core/settings.js';
import { clamp, TAU } from '../core/util.js';
import { OBJECTS, LAVA, WALLS } from '../data/world-data.js';
import { ENEMIES } from '../data/enemies.js';

const MARGIN = 10;
const PLAYER_LIGHT = 5.5;
const FALLOFF = 4.2;              // luz necessária para visão total
const Q = new Int32Array(200000); // fila da BFS reaproveitada

export const lightMap = {
  x0: 0, y0: 0, w: 0, h: 0,
  data: new Float32Array(1),
  canvas: document.createElement('canvas'),
};
const stamp = { arr: new Int32Array(1), gen: 0 };
const dctx = lightMap.canvas.getContext('2d');
let image = null;

const DAY_BIAS = 0.9; // quanto maior, mais curta a noite (0.9 ≈ 37% do dia é noite)
/** 0 = noite fechada, 1 = dia pleno. */
export function daylight(time = G.time) {
  return clamp(Math.cos((time - 0.5) * TAU) * 1.4 + DAY_BIAS, 0, 1);
}
export const isNight = () => G.world.isSurface && daylight() < 0.35;

export function lightAt(x, y) {
  const lx = x - lightMap.x0, ly = y - lightMap.y0;
  if (lx < 0 || ly < 0 || lx >= lightMap.w || ly >= lightMap.h) return 0;
  return lightMap.data[ly * lightMap.w + lx];
}

function addLight(sx, sy, r) {
  const { x0, y0, w, h, data } = lightMap, world = G.world;
  const gen = ++stamp.gen, st = stamp.arr, ox = Math.floor(sx), oy = Math.floor(sy);
  let qh = 0, qt = 0;
  const push = (x, y) => {
    const lx = x - x0, ly = y - y0;
    if (lx < 0 || ly < 0 || lx >= w || ly >= h) return;
    const li = ly * w + lx;
    if (st[li] === gen) return;
    st[li] = gen; Q[qt++] = x; Q[qt++] = y;
  };
  push(ox, oy);
  while (qh < qt) {
    const x = Q[qh++], y = Q[qh++], v = r - Math.hypot(x + 0.5 - sx, y + 0.5 - sy);
    if (v <= 0) continue;
    const li = (y - y0) * w + (x - x0);
    if (data[li] < v) data[li] = v;
    if (world.blocksLight(x, y) && !(x === ox && y === oy)) continue; // paredes recebem luz mas não a propagam
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
}

/** Brilho sem bloqueio (cristais, lava, projéteis) — muito mais barato que a BFS. */
function glow(x, y, r) {
  const { x0, y0, w, h, data } = lightMap;
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const lx = x - x0 + dx, ly = y - y0 + dy;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
      const v = r - Math.hypot(dx, dy), k = ly * w + lx;
      if (data[k] < v) data[k] = v;
    }
  }
}

function resize(nw, nh) {
  lightMap.w = nw; lightMap.h = nh;
  lightMap.data = new Float32Array(nw * nh);
  stamp.arr = new Int32Array(nw * nh);
  lightMap.canvas.width = nw; lightMap.canvas.height = nh;
  image = dctx.createImageData(nw, nh);
}

export function computeLight(screenW, screenH) {
  const world = G.world, p = G.player, s = TILE * SET.zoom;
  const vw = Math.ceil(screenW / s) + 4, vh = Math.ceil(screenH / s) + 4;
  if (vw + MARGIN * 2 !== lightMap.w || vh + MARGIN * 2 !== lightMap.h) resize(vw + MARGIN * 2, vh + MARGIN * 2);
  const { w, h, data } = lightMap;
  lightMap.x0 = Math.floor(G.cam.x - vw / 2) - MARGIN;
  lightMap.y0 = Math.floor(G.cam.y - vh / 2) - MARGIN;
  data.fill(0);

  addLight(p.x, p.y, PLAYER_LIGHT);
  const flick = Math.sin(performance.now() / 90) * 0.25;
  for (let y = lightMap.y0; y < lightMap.y0 + h; y++) {
    for (let x = lightMap.x0; x < lightMap.x0 + w; x++) {
      if (!world.inb(x, y)) continue;
      const i = world.idx(x, y), o = world.objs[i];
      if (o) {
        const def = OBJECTS[o.t];
        if (def && def.light) addLight(x + 0.5, y + 0.5, def.light + (def.flicker ? flick : 0));
        else if (o.t === 'shroom' && !world.isSurface && (world.biome[i] === 4 || world.biome[i] === 2)) glow(x, y, 2.6);
        else if (o.t === 'cave_exit') addLight(x + 0.5, y + 0.5, 6.5);              // luz do dia vindo de cima
        else if (o.t === 'cave_door') addLight(x + 0.5, y + 0.3, 5 + flick);       // tochas da entrada
      }
      const wl = world.wall[i];
      if ((wl && WALLS[wl].glow) || world.floor[i] === LAVA && !world.isSurface) glow(x, y, 3);
    }
  }
  for (const q of G.projs) glow(Math.floor(q.x), Math.floor(q.y), 2.4);
  for (const e of G.enemies) { const g = ENEMIES[e.t].glow; if (g) glow(Math.floor(e.x), Math.floor(e.y), g); }

  // céu: luz ambiente e cor da escuridão (azulada à noite, roxa na caverna)
  const day = world.isSurface ? daylight() : 0;
  const ambient = world.isSurface ? 1.3 + day * 5.5 : 0;
  const tint = world.isSurface ? [6, 8, 26] : [4, 3, 10];
  const px = image.data, bright = SET.bright, explored = world.explored;
  for (let ly = 0; ly < h; ly++) {
    for (let lx = 0; lx < w; lx++) {
      const li = ly * w + lx;
      let L = data[li];
      if (L < ambient) data[li] = L = ambient;
      const k = li * 4;
      px[k] = tint[0]; px[k + 1] = tint[1]; px[k + 2] = tint[2];
      px[k + 3] = clamp(1 - L * bright / FALLOFF, 0, 1) * 255 | 0;
      if (L > 1) {
        const x = lightMap.x0 + lx, y = lightMap.y0 + ly;
        if (world.inb(x, y)) explored[world.idx(x, y)] = 1;
      }
    }
  }
  dctx.putImageData(image, 0, 0);
}
