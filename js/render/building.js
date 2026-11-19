// Desenho de construções: pisos, vidro, tábuas, cercas, portas e a prévia de construção.
import { G, TILE } from '../core/state.js';
import { shadeCached } from '../core/util.js';
import { mouseWorld } from '../core/input.js';
import { WALLS } from '../data/world-data.js';
import { ITEMS } from '../data/items.js';
import { selected } from '../game/inventory.js';
import { placementProblem } from '../game/building.js';
import { icon } from './icons.js';

const T = TILE;

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

export function drawBuiltFloor(ctx, style, base, px, py, x, y) {
  const dark = shadeCached(base, -22), light = shadeCached(base, 16);
  if (style.pattern === 'planks') {
    for (let r = 0; r < 4; r++) {
      rect(ctx, px, py + r * 8 + 7, T, 1, dark);
      const off = ((y * 4 + r) % 2) * 12 + 6;
      rect(ctx, px + off, py + r * 8, 1, 7, dark);
    }
    rect(ctx, px + 2, py + 2, 10, 1, light);
  } else if (style.pattern === 'tiles') {
    rect(ctx, px, py + 15, T, 2, dark); rect(ctx, px + 15, py, 2, T, dark);
    rect(ctx, px + 2, py + 2, 11, 1, light); rect(ctx, px + 19, py + 19, 11, 1, light);
  } else if (style.pattern === 'path') { // trilha de terra batida com pedrinhas
    const h = (x * 73856093 ^ y * 19349663) >>> 0;
    for (let k = 0; k < 3; k++) rect(ctx, px + ((h >> (k * 4)) & 15) + 6, py + ((h >> (k * 4 + 12)) & 15) + 6, 3, 2, k % 2 ? dark : light);
  } else { // tapete: borda decorada
    ctx.strokeStyle = style.trim; ctx.lineWidth = 2;
    ctx.strokeRect(px + 3, py + 3, T - 6, T - 6);
    rect(ctx, px + 14, py + 14, 4, 4, style.trim);
  }
}

export function drawGlass(ctx, d, px, py) {
  rect(ctx, px, py, T, T, d.top + '55');
  ctx.strokeStyle = d.col; ctx.lineWidth = 2; ctx.strokeRect(px + 1, py + 1, T - 2, T - 2);
  ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(px + 7, py + 22); ctx.lineTo(px + 16, py + 8); ctx.moveTo(px + 15, py + 26); ctx.lineTo(px + 24, py + 13); ctx.stroke();
}

export function drawPlanks(ctx, px, py) {
  for (let r = 1; r < 4; r++) rect(ctx, px, py + r * 8 - 1, T, 1, '#00000040');
  rect(ctx, px + 4, py + 3, 1, 1, '#2a1a0c'); rect(ctx, px + 26, py + 19, 1, 1, '#2a1a0c'); // pregos
}

function isFenceLink(w, x, y) {
  if (!w.inb(x, y)) return false;
  const k = w.wall[w.idx(x, y)];
  return k > 0 && (WALLS[k].prop === 'fence' || !WALLS[k].prop);
}

/** Cerca: poste no centro e travessas para os vizinhos que também são cerca/parede. */
export function drawFence(ctx, w, d, x, y, px, py) {
  const cx = px + 16, dark = shadeCached(d.top, -40);
  ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(cx, py + 26, 6, 2.5, 0, 0, 7); ctx.fill();
  if (isFenceLink(w, x + 1, y)) { rect(ctx, cx, py + 12, 16, 3, dark); rect(ctx, cx, py + 19, 16, 3, dark); }
  if (isFenceLink(w, x - 1, y)) { rect(ctx, px, py + 12, 16, 3, dark); rect(ctx, px, py + 19, 16, 3, dark); }
  if (isFenceLink(w, x, y - 1)) rect(ctx, cx - 1, py, 3, 12, dark);
  if (isFenceLink(w, x, y + 1)) rect(ctx, cx - 1, py + 22, 3, 10, dark);
  rect(ctx, cx - 3, py + 6, 6, 20, '#2a1a0c'); rect(ctx, cx - 2, py + 7, 4, 18, d.top);
}

/** Porta: deitada se houver paredes nas laterais; aberta, vira uma tábua junto ao batente. */
export function drawDoor(ctx, w, o, x, y, px, py) {
  const horizontal = w.wallAt(x - 1, y) || w.wallAt(x + 1, y), col = '#9a6a34', dark = '#5a3a1a';
  if (horizontal) {
    if (o.open) { rect(ctx, px, py + 2, 5, T - 4, dark); rect(ctx, px + 1, py + 3, 3, T - 6, col); return; }
    rect(ctx, px, py + 10, T, 12, dark); rect(ctx, px + 1, py + 11, T - 2, 10, col);
    rect(ctx, px + 15, py + 11, 2, 10, dark); rect(ctx, px + 24, py + 15, 2, 2, '#ffd24a');
    return;
  }
  if (o.open) { rect(ctx, px + 2, py, T - 4, 5, dark); rect(ctx, px + 3, py + 1, T - 6, 3, col); return; }
  rect(ctx, px + 10, py, 12, T, dark); rect(ctx, px + 11, py + 1, 10, T - 2, col);
  rect(ctx, px + 11, py + 15, 10, 2, dark); rect(ctx, px + 15, py + 24, 2, 2, '#ffd24a');
}

/** Poço de pedra com água e telhadinho. */
export function drawWell(ctx, px, py, now) {
  ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 15, 5, 0, 0, 7); ctx.fill();
  rect(ctx, px + 2, py + 10, 28, 18, '#4a4a54'); rect(ctx, px + 3, py + 11, 26, 16, '#7a7a86');
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) rect(ctx, px + 3 + c * 7 + (r % 2) * 3, py + 18 + r * 5, 1, 4, '#4a4a54');
  rect(ctx, px + 6, py + 12, 20, 6, '#1a3a5e');
  rect(ctx, px + 8 + Math.sin(now * 2) * 2, py + 14, 6, 1, '#9fd0ff88');
  rect(ctx, px + 3, py - 4, 2, 15, '#5a3a1a'); rect(ctx, px + 27, py - 4, 2, 15, '#5a3a1a');
  ctx.fillStyle = '#8a3a2a'; ctx.beginPath(); ctx.moveTo(px - 1, py - 2); ctx.lineTo(px + 16, py - 12); ctx.lineTo(px + 33, py - 2); ctx.fill();
  rect(ctx, px + 15, py - 4, 2, 10, '#c8b088');
}

/** Prévia translúcida do que será colocado (verde = pode, vermelho = não pode). */
export function drawGhost(ctx, view, now) {
  const it = selected(), def = it && ITEMS[it.id];
  if (!def || !def.place || def.crop) return;
  const m = mouseWorld(), tx = Math.floor(m.x), ty = Math.floor(m.y), px = view.sx(tx), py = view.sy(ty);
  const ok = !placementProblem(def, tx, ty);
  ctx.globalAlpha = 0.45 + Math.sin(now * 6) * 0.1;
  ctx.drawImage(icon(it.id), px + 2, py + 2, T - 4, T - 4);
  ctx.globalAlpha = 1;
  rect(ctx, px, py, T, T, ok ? '#5aff7a22' : '#ff4a4a22');
}
