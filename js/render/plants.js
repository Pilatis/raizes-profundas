// Desenho de plantas e solo: solo arado, cultivos por estágio, plantas selvagens e arbustos.
import { TILE } from '../core/state.js';
import { icon } from './icons.js';

const T = TILE;

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

/** Sulcos do solo arado; regado fica mais escuro e brilhante. */
export function drawFarmland(ctx, wet, px, py) {
  for (let r = 0; r < 4; r++) rect(ctx, px + 2, py + 4 + r * 7, T - 4, 3, wet ? '#00000055' : '#00000033');
  if (wet) { rect(ctx, px + 6, py + 6, 3, 2, '#7ab8ff33'); rect(ctx, px + 20, py + 19, 4, 2, '#7ab8ff33'); }
}

const STAGE = {
  wheat(ctx, px, py, st, ripe) {
    const h = 6 + st * 5, col = ripe ? '#e8c860' : st > 1 ? '#a8c050' : '#6aa040';
    for (const dx of [7, 13, 19, 25]) {
      rect(ctx, px + dx, py + 26 - h, 2, h, col);
      if (st >= 2) { ctx.fillStyle = ripe ? '#f0d878' : '#c8d070'; ctx.beginPath(); ctx.ellipse(px + dx + 1, py + 25 - h, 2.2, 4, 0, 0, 7); ctx.fill(); }
    }
  },
  carrot(ctx, px, py, st, ripe) {
    for (const dx of [10, 21]) {
      const s = 3 + st * 2;
      ctx.fillStyle = '#3a9a3a';
      ctx.beginPath(); ctx.ellipse(px + dx - 2, py + 22 - s, 2, s, -0.4, 0, 7); ctx.ellipse(px + dx + 2, py + 22 - s, 2, s, 0.4, 0, 7); ctx.fill();
      if (ripe) circle(ctx, px + dx, py + 23, 3, '#ff8a2a');
    }
  },
  pumpkin(ctx, px, py, st, ripe) {
    ctx.strokeStyle = '#4a8a2a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + 4, py + 24); ctx.quadraticCurveTo(px + 16, py + 14 - st * 2, px + 28, py + 22); ctx.stroke();
    for (let k = 0; k <= st; k++) circle(ctx, px + 8 + k * 6, py + 20 - (k % 2) * 3, 3, '#5aa03a');
    if (st >= 2) ctx.drawImage(icon('pumpkin'), px + 7, py + 8, ripe ? 20 : 12, ripe ? 20 : 12);
  },
  mushroom(ctx, px, py, st) {
    ctx.fillStyle = '#b48ae0';
    for (let k = 0; k <= st; k++) {
      ctx.fillRect(px + 8 + k * 6, py + 22 - (4 + st * 4), 3, 4 + st * 4);
      ctx.beginPath(); ctx.arc(px + 9.5 + k * 6, py + 21 - (4 + st * 4), 2 + st, 0, 7); ctx.fill();
    }
  },
};

export function drawCrop(ctx, o, px, py, now) {
  const type = o.c || 'mushroom', ripe = o.g >= 1, st = ripe ? 3 : Math.floor(o.g * 3);
  if (type === 'mushroom' && ripe) { ctx.drawImage(icon('mushroom'), px + 2, py + 1, 28, 28); return; }
  STAGE[type](ctx, px, py, st, ripe);
  if (ripe && Math.sin(now * 4 + px) > 0.6) circle(ctx, px + 26, py + 6, 1.5, '#ffffffcc'); // brilho: pronto para colher
}

export function drawWild(ctx, o, px, py) {
  if (o.t === 'wild_wheat') STAGE.wheat(ctx, px, py, 3, true);
  else if (o.t === 'wild_carrot') STAGE.carrot(ctx, px, py, 3, true);
  else STAGE.pumpkin(ctx, px, py, 3, true);
}

export function drawBush(ctx, o, px, py) {
  for (const [dx, dy, r] of [[10, 18, 9], [22, 18, 9], [16, 11, 9]]) circle(ctx, px + dx, py + dy, r, '#2e6a2e');
  for (const [dx, dy, r] of [[10, 17, 7], [22, 17, 7], [16, 10, 7]]) circle(ctx, px + dx, py + dy, r, '#3f8a3a');
  if (o.g >= 1) for (const [dx, dy] of [[9, 14], [20, 19], [16, 8], [24, 13], [12, 21]]) circle(ctx, px + dx, py + dy, 2.5, '#e03a5a');
}

