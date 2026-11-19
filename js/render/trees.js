// Árvores e plantas grandes por espécie: tronco (camada das paredes) e copa (por cima de tudo).
// Cada árvore varia de tamanho e tom pelo hash da posição, então a floresta nunca fica repetida.
import { shadeCached } from '../core/util.js';

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function circle(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
function shadow(ctx, cx, y, rx) { ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(cx, y, rx, rx * 0.33, 0, 0, 7); ctx.fill(); }

const BIRCH_PUFFS = [[0, -14, 11], [-7, -6, 9], [7, -6, 9], [0, 0, 8]];
const COCONUTS = [[-3, 1], [3, 2], [0, -2]];
const sizeOf = (d, h) => (d.big ? 1.45 : 0.85 + h * 0.35);
const tintOf = (d, h) => shadeCached(d.leaf, ((h * 7919) % 1) * 22 - 11 | 0);
const sway = h => Math.sin(performance.now() / 900 + h * 9) * 1.5;

const TRUNKS = {
  cactus(ctx, d, px, py) {
    rect(ctx, px + 11, py + 4, 10, 26, '#1f5a2a'); rect(ctx, px + 12, py + 4, 8, 25, d.col);
    rect(ctx, px + 4, py + 12, 7, 5, d.col); rect(ctx, px + 4, py + 7, 4, 7, d.col); rect(ctx, px + 21, py + 15, 7, 5, d.col); rect(ctx, px + 24, py + 9, 4, 8, d.col);
    rect(ctx, px + 14, py + 6, 2, 20, d.top);
  },
  dead(ctx, d, px, py, h) {
    shadow(ctx, px + 16, py + 28, 9);
    ctx.strokeStyle = d.col; ctx.lineCap = 'round';
    ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(px + 16, py + 29); ctx.lineTo(px + 15, py + 4); ctx.stroke();
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px + 15, py + 14); ctx.lineTo(px + 6 - h * 4, py + 4); ctx.moveTo(px + 15, py + 10); ctx.lineTo(px + 25, py + 1 + h * 4); ctx.moveTo(px + 15, py + 6); ctx.lineTo(px + 11, py - 4); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 8, py + 6); ctx.lineTo(px + 5, py + 1); ctx.moveTo(px + 23, py + 3); ctx.lineTo(px + 27, py - 1); ctx.stroke();
    ctx.lineCap = 'butt';
  },
  palm(ctx, d, px, py, h) {
    shadow(ctx, px + 16, py + 28, 8);
    const lean = (h - 0.5) * 10;
    ctx.strokeStyle = '#4a3418'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px + 16, py + 29); ctx.quadraticCurveTo(px + 16 + lean, py + 12, px + 16 + lean * 1.4, py - 4); ctx.stroke();
    ctx.strokeStyle = d.col; ctx.lineWidth = 4; ctx.stroke();
    for (let k = 0; k < 5; k++) rect(ctx, px + 13 + lean * (k / 5) * 1.3, py + 24 - k * 6, 6, 1, '#4a3418');
  },
  birch(ctx, d, px, py, h) {
    shadow(ctx, px + 16, py + 28, 10);
    rect(ctx, px + 12, py + 6, 8, 24, '#8a8680'); rect(ctx, px + 13, py + 6, 6, 23, d.col);
    for (let k = 0; k < 4; k++) rect(ctx, px + 13 + ((h * 10 + k * 3) % 4), py + 9 + k * 5, 3, 1.5, '#2a2a2a');
  },
  default(ctx, d, px, py, h) { // carvalho, pinheiro, salgueiro
    const s = d.big ? 1.4 : 1;
    shadow(ctx, px + 16, py + 28, 12 * s);
    rect(ctx, px + 16 - 4 * s, py + 10, 8 * s, 20, '#2a1a0c'); rect(ctx, px + 17 - 4 * s, py + 10, 6 * s, 19, d.col); rect(ctx, px + 14, py + 12, 2, 15, d.top);
    if (d.big) { rect(ctx, px + 6, py + 24, 6, 4, d.col); rect(ctx, px + 21, py + 25, 6, 3, d.col); } // raízes aparentes
  },
};

const CANOPIES = {
  oak(ctx, d, px, py, h) {
    const s = sizeOf(d, h), leaf = tintOf(d, h), dark = shadeCached(leaf, -30), light = shadeCached(leaf, 30), w = sway(h), cx = px + 16 + w, cy = py - 4 * s;
    circle(ctx, cx, cy, 19 * s, dark);
    circle(ctx, cx - 4 * s, cy - 3 * s, 13 * s, leaf); circle(ctx, cx + 6 * s, cy + 1 * s, 12 * s, leaf); circle(ctx, cx, cy - 8 * s, 11 * s, leaf);
    circle(ctx, cx - 5 * s, cy - 8 * s, 5 * s, light);
    if (d.autumn) for (let k = 0; k < 4; k++) circle(ctx, cx - 10 * s + k * 7 * s, cy + ((h * (k + 3) * 13) % 1) * 12 * s - 4, 2.5, '#f0c040');
    else if (h > 0.8) for (let k = 0; k < 3; k++) circle(ctx, cx - 8 + k * 8, cy + 2 - (k % 2) * 6, 2, '#e04a4a'); // algumas dão frutinhas
  },
  birch(ctx, d, px, py, h) {
    const s = sizeOf(d, h) * 0.9, leaf = tintOf(d, h), dark = shadeCached(leaf, -28), w = sway(h), cx = px + 16 + w;
    for (const [dx, dy, r] of BIRCH_PUFFS) circle(ctx, cx + dx * s, py + dy * s, (r + 1.5) * s, dark);
    for (const [dx, dy, r] of BIRCH_PUFFS) circle(ctx, cx + dx * s, py + dy * s, r * s, leaf);
    circle(ctx, cx - 3 * s, py - 18 * s, 4 * s, shadeCached(leaf, 35));
  },
  pine(ctx, d, px, py, h) {
    const s = sizeOf(d, h), leaf = tintOf(d, h), dark = shadeCached(leaf, -25), w = sway(h) * 0.6;
    for (let k = 0; k < 3; k++) {
      const half = (17 - k * 4) * s, ty = py + (-22 + k * 10) * s;
      ctx.fillStyle = k === 0 ? dark : leaf;
      ctx.beginPath(); ctx.moveTo(px + 16 + w, ty - 7 * s); ctx.lineTo(px + 16 + half, ty + 14 * s); ctx.lineTo(px + 16 - half, ty + 14 * s); ctx.fill();
      if (d.snow) { ctx.fillStyle = '#f4f8ff'; ctx.beginPath(); ctx.moveTo(px + 16 + w, ty - 7 * s); ctx.lineTo(px + 16 + half * 0.55, ty + 3 * s); ctx.lineTo(px + 16 - half * 0.55, ty + 3 * s); ctx.fill(); }
    }
    if (!d.snow) rect(ctx, px + 13 + w, py - 30 * s, 4, 3, '#ffffff44');
  },
  palm(ctx, d, px, py, h) {
    const leaf = tintOf(d, h), lean = (h - 0.5) * 10, cx = px + 16 + lean * 1.4, cy = py - 6, w = sway(h) * 1.5;
    ctx.strokeStyle = leaf; ctx.lineCap = 'round'; ctx.lineWidth = 5;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + h * 3, len = 18 + (k % 2) * 4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + Math.cos(a) * len * 0.6 + w, cy + Math.sin(a) * len * 0.3 - 8, cx + Math.cos(a) * len + w, cy + Math.sin(a) * len * 0.5 + 4); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    for (const [dx, dy] of COCONUTS) circle(ctx, cx + dx, cy + dy, 3, '#6a4a20'); // cocos
  },
  willow(ctx, d, px, py, h) {
    const s = sizeOf(d, h), leaf = tintOf(d, h), dark = shadeCached(leaf, -30), w = sway(h), cx = px + 16 + w;
    circle(ctx, cx, py - 8 * s, 18 * s, dark);
    circle(ctx, cx, py - 10 * s, 15 * s, leaf);
    ctx.strokeStyle = leaf; ctx.lineWidth = 2.5;
    for (let k = 0; k < 9; k++) { // galhos caindo como cortina
      const x = cx - 17 * s + k * 4.2 * s, len = 14 + ((h * (k + 1) * 17) % 1) * 12;
      ctx.beginPath(); ctx.moveTo(x, py - 4 * s); ctx.quadraticCurveTo(x + w, py + len * 0.5, x + w * 1.5, py + len); ctx.stroke();
    }
  },
};

/** Tronco/corpo da árvore no lugar do bloco. */
export function drawTrunk(ctx, d, px, py, h) {
  (TRUNKS[d.prop] || TRUNKS.default)(ctx, d, px, py, h);
}

/** Copa por cima das entidades (o jogador passa "por baixo"). */
export function drawCanopy(ctx, d, px, py, h) {
  (CANOPIES[d.prop] || CANOPIES.oak)(ctx, d, px, py, h);
}
