// Passagens entre camadas: a boca da caverna na superfície e a escada de luz no subsolo.
import { G, TILE } from '../core/state.js';

const T = TILE;
const HINT_RANGE = 3;
// formas fixas (sem alocar por frame): [dx, dy, rx, ry, cor]
const ROCKS = [[-22, 2, 16, 14, '#5e5e68'], [22, 2, 16, 14, '#5e5e68'], [-12, -12, 18, 16, '#6e6e78'], [12, -12, 18, 16, '#6e6e78'], [0, -22, 20, 14, '#7a7a84']];
const MOSS = [[-20, -10], [16, -24], [-4, -32], [26, -4]];
const LIT_GRASS = [[-20, 6], [-14, 9], [16, 7], [21, 5]];
const ROOTS = [[-10, 14], [6, 18], [13, 10]];

function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }
function ellipse(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }

function torch(ctx, x, y, now, seed) {
  rect(ctx, x - 1.5, y, 3, 12, '#5a3a1a');
  const f = Math.sin(now * 13 + seed) * 1.2;
  ellipse(ctx, x, y - 2, 9 + f, 9 + f, 'rgba(255,170,60,0.18)');
  ellipse(ctx, x, y - 1, 3.5 + f * 0.3, 5 + f * 0.4, '#ff7a1a');
  ellipse(ctx, x, y, 2, 3, '#ffe070');
}

function hint(ctx, x, y, text) {
  ctx.font = 'bold 11px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  const w = Math.round(ctx.measureText(text).width + 12);
  rect(ctx, Math.round(x - w / 2), y - 10, w, 15, '#000c');
  rect(ctx, Math.round(x - w / 2), y + 4, w, 1, '#ffc04a');
  ctx.fillStyle = '#ffc04a'; ctx.fillText(text, x, y + 1);
}

const nearPlayer = (x, y) => Math.hypot(G.player.x - x - 0.5, G.player.y - y - 0.5) < HINT_RANGE;

/** Superfície: monte de pedras com boca escura, batentes de madeira, tochas e escada descendo. */
export function drawCaveEntrance(ctx, x, y, px, py, now) {
  const cx = px + 16;
  ellipse(ctx, cx, py + 30, 30, 8, '#0006');                       // sombra no chão
  for (const [dx, dy, rx, ry, c] of ROCKS) {
    ellipse(ctx, cx + dx, py + 12 + dy, rx + 1.5, ry + 1.5, '#2a2a30');
    ellipse(ctx, cx + dx, py + 12 + dy, rx, ry, c);
    ellipse(ctx, cx + dx - rx * 0.3, py + 8 + dy - ry * 0.3, rx * 0.35, ry * 0.25, '#ffffff22');
  }
  for (const [dx, dy] of MOSS) ellipse(ctx, cx + dx, py + 12 + dy, 5, 3, '#4a8a3a'); // musgo
  // boca: arco escuro com gradiente para o fundo
  const g = ctx.createRadialGradient(cx, py + 18, 2, cx, py + 14, 18);
  g.addColorStop(0, '#000'); g.addColorStop(1, '#16141c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(cx - 14, py + 30); ctx.lineTo(cx - 14, py + 8); ctx.quadraticCurveTo(cx, py - 10, cx + 14, py + 8); ctx.lineTo(cx + 14, py + 30); ctx.fill();
  for (let k = 0; k < 4; k++) rect(ctx, cx - 11 + k * 2, py + 14 + k * 4, 22 - k * 4, 2, `rgba(150,140,130,${0.45 - k * 0.1})`); // degraus
  // batentes e viga
  rect(ctx, cx - 17, py + 4, 4, 27, '#3a2410'); rect(ctx, cx + 13, py + 4, 4, 27, '#3a2410');
  rect(ctx, cx - 16, py + 5, 2, 25, '#8a5a2a'); rect(ctx, cx + 14, py + 5, 2, 25, '#8a5a2a');
  rect(ctx, cx - 19, py + 1, 38, 5, '#3a2410'); rect(ctx, cx - 18, py + 2, 36, 3, '#a8743a');
  torch(ctx, cx - 22, py + 6, now, 1); torch(ctx, cx + 22, py + 6, now, 2);
  if (nearPlayer(x, y)) hint(ctx, cx, py - 30, '▼ Entrar na caverna');
}

/** Caverna: feixe de luz vindo de cima, borda do buraco, escada e poeira dançando. */
export function drawCaveExit(ctx, x, y, px, py, now) {
  const cx = px + 16;
  const beam = ctx.createLinearGradient(0, py - 60, 0, py + 34);
  beam.addColorStop(0, 'rgba(255,244,210,0.32)'); beam.addColorStop(1, 'rgba(255,244,210,0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(cx - 14, py - 60); ctx.lineTo(cx + 14, py - 60); ctx.lineTo(cx + 26, py + 34); ctx.lineTo(cx - 26, py + 34); ctx.fill();
  ellipse(ctx, cx, py + 26, 24, 7, 'rgba(255,240,200,0.15)');      // poça de luz
  for (const [dx, h] of LIT_GRASS) rect(ctx, cx + dx, py + 26 - h, 2, h, '#5a9a3e'); // grama sob a luz
  // borda do buraco lá em cima (pedras e raízes)
  ellipse(ctx, cx, py - 44, 20, 8, '#2a2620'); ellipse(ctx, cx, py - 45, 15, 5, '#fff6dc');
  for (let k = 0; k < 7; k++) ellipse(ctx, cx - 19 + k * 6.3, py - 44 + Math.sin(k * 2) * 3, 4, 3, '#4a4038');
  for (const [dx, len] of ROOTS) { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx + dx, py - 40); ctx.quadraticCurveTo(cx + dx + 3, py - 40 + len / 2, cx + dx - 1, py - 40 + len); ctx.stroke(); }
  // escada de corda e madeira
  rect(ctx, cx - 9, py - 42, 3, T + 42, '#6a4426'); rect(ctx, cx + 6, py - 42, 3, T + 42, '#6a4426');
  for (let k = 0; k < 8; k++) { const ry = py - 38 + k * 9; rect(ctx, cx - 8, ry, 16, 3, '#a8743a'); rect(ctx, cx - 9, ry - 1, 3, 2, '#d8c8a0'); rect(ctx, cx + 6, ry - 1, 3, 2, '#d8c8a0'); }
  for (let k = 0; k < 6; k++) { // poeira
    const t = (now * 0.15 + k / 6) % 1;
    ellipse(ctx, cx + Math.sin(now + k * 2.1) * 12, py - 50 + t * 80, 1, 1, `rgba(255,250,220,${0.6 * (1 - t)})`);
  }
  if (nearPlayer(x, y)) hint(ctx, cx, py - 58, '▲ Subir à superfície');
}
