// Renderização do mundo ativo: chão, objetos, entidades, paredes, copas, luz e cursor.
// Desenha só a área visível e não altera o estado do jogo.
import { G, UI, TILE, REACH } from '../core/state.js';
import { SET } from '../core/settings.js';
import { hash, rand, clamp, shadeCached } from '../core/util.js';
import { mouseWorld } from '../core/input.js';
import { WALLS, WATER, LAVA, OBJECTS, FLOOR_STYLES } from '../data/world-data.js';
import { lightMap, lightAt, daylight } from '../world/light.js';
import { selected } from '../game/inventory.js';
import { isBoss } from '../game/combat.js';
import { icon } from './icons.js';
import { drawFarmland, drawCrop, drawWild, drawBush } from './plants.js';
import { drawBuiltFloor, drawGlass, drawPlanks, drawFence, drawDoor, drawGhost, drawWell } from './building.js';
import { FARMLAND, FARMLAND_WET, WILD_PLANTS } from '../data/farming.js';
import { drawEnemy, drawEnemyHealth, drawProjectile } from './sprites.js';
import { drawPlayer, drawNpc } from './people.js';
import { drawCaveEntrance, drawCaveExit } from './portals.js';
import { drawTrunk, drawCanopy } from './trees.js';

const T = TILE;
const GRASS = new Set([1, 2, 5]);
const FLOWER_COLORS = ['#ffe14a', '#ff6a8a', '#ffffff', '#9a7aff'];

let ctx = null;
const view = { ox: 0, oy: 0, sx: x => Math.round(view.ox + x * T), sy: y => Math.round(view.oy + y * T) };
const drawList = []; // reaproveitado a cada frame (sem alocar)

export function initRenderer(canvas) { ctx = canvas.getContext('2d'); }

function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function circle(x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

// ---------- Chão ----------
function drawFloor(w, i, x, y, px, py, now) {
  const fl = w.floor[i], h = hash(x, y, 7), pal = w.palette;
  if (fl === WATER) {
    rect(px, py, T, T, shadeCached(pal[WATER], (Math.sin(now * 1.5 + x * 0.6 + y * 0.4) * 8) | 0));
    rect(px + ((now * 10 + h * 32) % 28 | 0), py + (h * 20 | 0) + 6, 7, 2, '#ffffff22');
    return;
  }
  if (fl === LAVA) {
    rect(px, py, T, T, shadeCached(pal[LAVA], (Math.sin(now * 2 + x * 0.7 + y * 0.5) * 22) | 0));
    const b = (Math.sin(now * 3 + h * 20) + 1) * 2;
    rect(px + (h * 24 | 0) + 2, py + (h * 300 | 0) % 22 + 4, 4 + b, 3 + b / 2, '#ffd06088');
    return;
  }
  rect(px, py, T, T, shadeCached(pal[fl], (h * 14 - 7) | 0));
  if (fl === FARMLAND || fl === FARMLAND_WET) { drawFarmland(ctx, fl === FARMLAND_WET, px, py); return; }
  if (FLOOR_STYLES[fl]) { drawBuiltFloor(ctx, FLOOR_STYLES[fl], pal[fl], px, py, x, y); return; }
  if (w.isSurface) {
    if (GRASS.has(fl) && h < 0.14) { // tufos de grama
      ctx.fillStyle = shadeCached(pal[fl], -28);
      const gx = px + (h * 180 | 0) % 24 + 3, gy = py + (h * 500 | 0) % 20 + 8;
      ctx.fillRect(gx, gy, 2, 5); ctx.fillRect(gx + 3, gy - 2, 2, 7); ctx.fillRect(gx + 6, gy + 1, 2, 4);
    } else if (fl === 1 && h > 0.982) {
      circle(px + 10 + (h * 900 | 0) % 12, py + 12 + (h * 700 | 0) % 10, 2.5, FLOWER_COLORS[(h * 4000 | 0) % 4]);
    } else if (fl === 4 && h > 0.9) rect(px + (h * 300 | 0) % 26 + 3, py + (h * 90 | 0) % 26 + 3, 2, 2, '#ffffffaa');
  } else if (h < 0.18) {
    rect(px + (h * 90 | 0) % 24 + 3, py + (h * 300 | 0) % 24 + 3, 3, 3, w.biome[i] === 2 ? '#80ff8018' : '#ffffff10');
  }
}

// ---------- Objetos ----------
function drawObject(w, o, i, x, y, px, py, now) {
  switch (o.t) {
    case 'shroom':
      if (w.biome[i] === 2) ctx.drawImage(icon('shroom_p'), px + 4, py + 3, 24, 24);
      else if (w.biome[i] === 4) { circle(px + 16, py + 20, 4, '#7ff3ff'); ctx.fillStyle = '#c9fbff'; ctx.beginPath(); ctx.arc(px + 16, py + 16, 7, Math.PI, 0); ctx.fill(); }
      else ctx.drawImage(icon('mushroom'), px + 6, py + 6, 20, 20);
      return;
    case 'crop': drawCrop(ctx, o, px, py, now); return;
    case 'bush': drawBush(ctx, o, px, py); return;
    case 'cave_door': drawCaveEntrance(ctx, x, y, px, py, now); return;
    case 'cave_exit': drawCaveExit(ctx, x, y, px, py, now); return;
    default: {
      if (WILD_PLANTS[o.t]) { drawWild(ctx, o, px, py); return; }
      if (o.t === 'door') { drawDoor(ctx, w, o, x, y, px, py); return; }
      if (o.t === 'well') { drawWell(ctx, px, py, now); return; }
      const def = OBJECTS[o.t];
      if (!def || !def.item) return;
      ctx.drawImage(icon(def.item), px, py, T, T);
      if (def.flicker) { // chama tremulando
        ctx.fillStyle = `rgba(255,${180 + Math.sin(now * 12 + x) * 40 | 0},60,.5)`;
        ctx.beginPath(); ctx.arc(px + 16, py + (o.t === 'campfire' ? 14 : o.t === 'lantern' ? 16 : 10), 3 + Math.sin(now * 17 + y) * 1.2, 0, 7); ctx.fill();
      }
    }
  }
}

// ---------- Paredes ----------
function drawWall(w, d, x, y, px, py, i) {
  const h = hash(x, y, 3);
  if (d.prop === 'fence') { drawFence(ctx, w, d, x, y, px, py); return; }
  if (d.prop) { drawTrunk(ctx, d, px, py, h); return; }
  if (d.glass) { drawGlass(ctx, d, px, py); return; }
  const openBelow = !w.wallAt(x, y + 1);
  rect(px, py, T, T, shadeCached(d.top, (h * 12 - 6) | 0));
  if (openBelow) { rect(px, py + T - 11, T, 11, d.col); rect(px, py + T - 3, T, 3, '#0004'); }
  if (!w.wallAt(x, y - 1)) rect(px, py, T, 3, '#ffffff18');
  if (!w.wallAt(x - 1, y)) rect(px, py, 2, T, '#ffffff0c');
  if (!w.wallAt(x + 1, y)) rect(px + T - 2, py, 2, T, '#0003');
  if (d.ore) {
    ctx.fillStyle = d.ore;
    for (let k = 0; k < 4; k++) ctx.fillRect(px + 3 + (hash(x, y, 20 + k) * 22 | 0), py + 3 + (hash(x, y, 40 + k) * 16 | 0), 4 + (k & 1) * 2, 4);
    rect(px + 4 + (hash(x, y, 20) * 22 | 0), py + 3 + (hash(x, y, 40) * 16 | 0), 2, 2, '#ffffff55');
  } else if (d.plank) {
    drawPlanks(ctx, px, py);
  } else if (d.brick) {
    ctx.fillStyle = '#00000055';
    for (let r = 0; r < 3; r++) { ctx.fillRect(px, py + r * 8 + 7, T, 2); const o = r % 2 ? 8 : 0; ctx.fillRect(px + o + 6, py + r * 8, 2, 8); ctx.fillRect(px + o + 22, py + r * 8, 2, 8); }
  } else if (d.root) {
    ctx.strokeStyle = '#a8743a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px + 4, py + 4 + h * 8); ctx.quadraticCurveTo(px + 16, py + 20, px + 28, py + 8 + h * 10); ctx.stroke();
    ctx.strokeStyle = '#d8a060'; ctx.lineWidth = 1; ctx.stroke();
  } else if (h < 0.4) rect(px + (h * 50 | 0) % 20 + 4, py + (h * 130 | 0) % 14 + 4, 5, 3, '#0002');
  const dmg = w.wdmg[i];
  if (dmg) {
    const f = dmg / d.hp;
    ctx.strokeStyle = '#000a'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(px + 16, py + 12); ctx.lineTo(px + 16 - f * 12, py + 12 - f * 8);
    ctx.moveTo(px + 16, py + 12); ctx.lineTo(px + 16 + f * 10, py + 12 + f * 10);
    ctx.moveTo(px + 16, py + 12); ctx.lineTo(px + 16 + f * 6, py + 12 - f * 10);
    ctx.stroke();
  }
}

// ---------- Frame ----------
export function render(screenW, screenH) {
  const Z = SET.zoom, cw = screenW / Z, ch = screenH / Z, w = G.world, now = performance.now() / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  rect(0, 0, screenW, screenH, '#000');
  ctx.setTransform(Z, 0, 0, Z, 0, 0);
  view.ox = cw / 2 - G.cam.x * T; view.oy = ch / 2 - G.cam.y * T;
  if (G.shake > 0) { view.ox += rand(-1, 1) * G.shake * 24; view.oy += rand(-1, 1) * G.shake * 24; }
  const x0 = Math.floor(G.cam.x - cw / 2 / T) - 1, x1 = Math.ceil(G.cam.x + cw / 2 / T) + 1;
  const y0 = Math.floor(G.cam.y - ch / 2 / T) - 2, y1 = Math.ceil(G.cam.y + ch / 2 / T) + 2;
  const visible = (x, y, i) => lightAt(x, y) > 0 || w.explored[i];

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y), wl = w.wall[i];
      if (wl && !WALLS[wl].prop && !WALLS[wl].clear) continue; // chão aparece sob árvores, cercas e vidro
      if (!visible(x, y, i)) continue;
      const px = view.sx(x), py = view.sy(y);
      drawFloor(w, i, x, y, px, py, now);
      const above = y > 0 ? w.wall[i - w.size] : 0;
      if (!wl && above && !WALLS[above].prop) rect(px, py, T, 7, '#0006'); // sombra da parede de cima
      const o = w.objs[i];
      if (o) drawObject(w, o, i, x, y, px, py, now);
    }
  }

  for (const d of G.drops) ctx.drawImage(icon(d.id), view.sx(d.x) - 10, view.sy(d.y) - 12 + Math.sin(now * 5 + d.x) * 2, 20, 20);

  // entidades ordenadas por profundidade
  drawList.length = 0;
  for (const e of G.enemies) drawList.push(e);
  for (const n of w.npcs) drawList.push(n);
  drawList.push(G.player);
  drawList.sort((a, b) => a.y - b.y);
  const held = selected();
  for (const e of drawList) {
    if (e === G.player) drawPlayer(ctx, view, held && held.id);
    else if (e.prof) drawNpc(ctx, e, view, now);
    else drawEnemy(ctx, e, view, now);
  }

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y), wl = w.wall[i];
      if (!wl || !visible(x, y, i)) continue;
      drawWall(w, WALLS[wl], x, y, view.sx(x), view.sy(y), i);
    }
  }
  // copas por cima de tudo (o jogador passa "por baixo" das árvores)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!w.inb(x, y)) continue;
      const i = w.idx(x, y), d = WALLS[w.wall[i]];
      if (d && d.canopy && visible(x, y, i)) drawCanopy(ctx, d, view.sx(x), view.sy(y), hash(x, y, 3));
    }
  }

  for (const q of G.projs) drawProjectile(ctx, q, view);
  for (const q of G.parts) { ctx.globalAlpha = clamp(q.t * 2, 0, 1); rect(view.sx(q.x) - 2, view.sy(q.y) - 2, 4, 4, q.c); }
  ctx.globalAlpha = 1;

  // luz/escuridão (1 px por bloco, escalado com suavização)
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lightMap.canvas, Math.round(view.ox + lightMap.x0 * T), Math.round(view.oy + lightMap.y0 * T), lightMap.w * T, lightMap.h * T);
  ctx.imageSmoothingEnabled = false;
  if (w.isSurface) { // tom dourado no amanhecer/entardecer
    const d = daylight(), warm = clamp(1 - Math.abs(d - 0.45) / 0.3, 0, 1);
    if (warm > 0) rect(0, 0, cw, ch, `rgba(255,130,40,${warm * 0.1})`);
  }

  if (!UI.panelOpen) drawGhost(ctx, view, now);
  if (!UI.panelOpen) {
    const m = mouseWorld(), tx = Math.floor(m.x), ty = Math.floor(m.y), p = G.player;
    ctx.strokeStyle = Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) <= REACH ? '#ffffffaa' : '#ffffff33';
    ctx.lineWidth = 2;
    ctx.strokeRect(view.sx(tx) + 1, view.sy(ty) + 1, T - 2, T - 2);
  }
  if (SET.hpbars) for (const e of G.enemies) if (e.hp < e.max && !isBoss(e)) drawEnemyHealth(ctx, e, view);
  if (G.player.ifr > 0) rect(0, 0, cw, ch, `rgba(255,0,0,${G.player.ifr * 0.18})`);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
