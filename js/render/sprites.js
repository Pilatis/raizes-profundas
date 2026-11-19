// Sprites desenhados por código: inimigos e animais (por `shape`) e projéteis.
import { G, TILE } from '../core/state.js';
import { shadeCached as shade, rand, clamp } from '../core/util.js';
import { ENEMIES } from '../data/enemies.js';
import { icon } from './icons.js';

const T = TILE;

function ellipse(ctx, x, y, rx, ry, col, rot = 0) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, 7); ctx.fill();
}

// ---------- Inimigos ----------
function eyes(ctx, cx, cy, s, a, col = '#111') {
  ctx.fillStyle = col;
  ctx.fillRect(cx - s * 1.6 + Math.cos(a) * s * 0.6, cy - s * 0.5, s, s * 1.3);
  ctx.fillRect(cx + s * 0.6 + Math.cos(a) * s * 0.6, cy - s * 0.5, s, s * 1.3);
}

const SHAPES = {
  bat(ctx, e, x, y, R, C, DK, a, now) {
    const fy = Math.sin(now * 22 + e.ph) * R * 0.9, by = y - R * 0.8 + Math.sin(now * 3 + e.ph) * 3;
    ellipse(ctx, x, y + R * 0.4, R * 0.5, R * 0.2, '#0005');
    ctx.fillStyle = e.flash > 0 ? '#fff' : DK;
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + s * R * 0.3, by); ctx.lineTo(x + s * R * 1.9, by - fy);
      ctx.lineTo(x + s * R * 1.3, by + R * 0.4); ctx.lineTo(x + s * R * 0.9, by + R * 0.1); ctx.closePath(); ctx.fill();
    }
    ellipse(ctx, x, by, R * 0.6, R * 0.65, C);
    eyes(ctx, x, by - R * 0.1, R * 0.22, a, '#ff4a4a');
  },
  beetle(ctx, e, x, y, R, C, DK, a, now) {
    const sh = e.st === 'wind' ? rand(-2, 2) : 0;
    ctx.save(); ctx.translate(x + sh, y); ctx.rotate(e.face);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
    for (let k = -1; k <= 1; k++) for (const s of [-1, 1]) {
      const w = Math.sin(now * 14 + k) * 3;
      ctx.beginPath(); ctx.moveTo(k * R * 0.5, 0); ctx.lineTo(k * R * 0.5 + w, s * R * 1.15); ctx.stroke();
    }
    ellipse(ctx, 0, 0, R * 1.1, R * 0.9, DK); ellipse(ctx, -R * 0.05, 0, R, R * 0.8, C);
    ctx.fillStyle = '#0004'; ctx.fillRect(-R, -1, R * 1.9, 2);
    ellipse(ctx, R * 0.95, 0, R * 0.35, R * 0.4, DK);
    ctx.fillStyle = e.st === 'wind' ? '#ff3030' : '#ffd24a';
    ctx.fillRect(R * 1.05, -R * 0.25, 3, 3); ctx.fillRect(R * 1.05, R * 0.15, 3, 3);
    ctx.restore();
  },
  crab(ctx, e, x, y, R, C, DK, a, now) {
    const w = Math.sin(now * 10 + e.ph) * 2;
    ctx.strokeStyle = DK; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * R * 0.6, y + k * 3 - 2); ctx.lineTo(x + s * R * 1.3, y + k * 4 + w * s); ctx.stroke(); }
    for (const s of [-1, 1]) { ellipse(ctx, x + s * R * 1.1, y - R * 0.6 + w, R * 0.38, R * 0.3, C); ellipse(ctx, x + s * R * 1.25, y - R * 0.75 + w, R * 0.16, R * 0.12, DK); }
    ellipse(ctx, x, y, R * 1.05, R * 0.72, DK); ellipse(ctx, x, y - 2, R * 0.95, R * 0.62, C);
    ellipse(ctx, x - R * 0.3, y - R * 0.3, R * 0.25, R * 0.12, '#ffffff44');
    eyes(ctx, x, y - R * 0.55, R * 0.18, a);
  },
  wisp(ctx, e, x, y, R, C, DK, a, now) {
    const fy = Math.sin(now * 3 + e.ph) * 4;
    ctx.globalAlpha = e.flash > 0 ? 1 : 0.55 + Math.sin(now * 5 + e.ph) * 0.15;
    ctx.fillStyle = C;
    ctx.beginPath(); ctx.moveTo(x - R * 0.8, y + fy);
    ctx.quadraticCurveTo(x - Math.cos(e.face) * R * 2.2, y + fy + R * 1.6, x + R * 0.8, y + fy); ctx.fill();
    ellipse(ctx, x, y + fy - R * 0.3, R * 0.85, R * 0.9, C);
    ellipse(ctx, x, y + fy - R * 0.3, R * 0.5, R * 0.55, '#ffffff66');
    ctx.globalAlpha = 1;
    eyes(ctx, x, y + fy - R * 0.3, R * 0.22, a, ENEMIES[e.t].nocturnal ? '#ff5a5a' : '#103040');
  },
  seg(ctx, e, x, y, R, C, DK, a, now, view) {
    const t = e.trail, n = ENEMIES[e.t].seg;
    for (let k = n; k >= 1; k--) {
      const s = t[Math.min(t.length - 1, k * 2)] || e, rr = R * (1 - k / (n + 2));
      ellipse(ctx, view.sx(s.x), view.sy(s.y), rr * 1.05, rr * 0.9, DK);
      ellipse(ctx, view.sx(s.x), view.sy(s.y) - 1, rr * 0.92, rr * 0.8, k % 2 ? C : shade(ENEMIES[e.t].col, -20));
    }
    if (e.t === 'boss_eel') for (const s of [-1, 1]) ellipse(ctx, x + Math.cos(e.face + s * 1.9) * R * 0.9, y + Math.sin(e.face + s * 1.9) * R * 0.9, R * 0.5, R * 0.2, shade(ENEMIES[e.t].col, 40), e.face + s);
    const sh = e.st === 'wind' ? rand(-2, 2) : 0;
    ellipse(ctx, x + sh, y, R * 1.05, R * 0.95, DK); ellipse(ctx, x + sh, y - 1, R * 0.95, R * 0.85, C);
    eyes(ctx, x + sh + Math.cos(e.face) * R * 0.3, y - R * 0.2, R * 0.22, a, e.st === 'wind' ? '#ff3030' : '#111');
  },
  shroom(ctx, e, x, y, R, C, DK, a, now) {
    const s = R * 2.6, lift = e.air > 0 ? Math.sin((e.air / 0.32) * Math.PI) * R * 0.5 : 0;
    if (e.flash > 0) ctx.globalAlpha = 0.5;
    ctx.drawImage(icon('shroom_p'), x - s / 2, y - lift - s * 0.7, s, s);
    ctx.globalAlpha = 1;
    eyes(ctx, x, y - lift - R * 0.05, R * 0.2, a);
    if (!ENEMIES[e.t].boss) return;
    ctx.fillStyle = '#ffd0ff';
    for (let k = 0; k < 5; k++) { ctx.globalAlpha = 0.4 + Math.sin(now * 3 + k) * 0.3; ctx.beginPath(); ctx.arc(x + Math.cos(k * 1.3) * R, y - R * 1.2 + Math.sin(k * 2) * R * 0.4, 3, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  },
  spitter(ctx, e, x, y, R, C, DK, a) {
    const ch = clamp(1 - e.cd / 0.6, 0, 1), s = R * 2.8 * (1 + ch * 0.12); // incha antes de cuspir
    if (e.flash > 0) ctx.globalAlpha = 0.5;
    ctx.drawImage(icon('shroom_p'), x - s / 2, y - s * 0.75, s, s);
    ctx.globalAlpha = 1;
    ellipse(ctx, x, y - R * 0.15, R * 0.32 * (0.4 + ch), R * 0.28 * (0.4 + ch), '#2a0a3a');
    eyes(ctx, x, y - R * 0.75, R * 0.2, a);
  },
  crystal(ctx, e, x, y, R, C, DK, a, now) {
    const rot = now * 0.5;
    ctx.save(); ctx.translate(x, y - R * 0.3 + Math.sin(now * 2) * 3);
    for (let k = 0; k < 3; k++) {
      const oa = rot * 2 + k * 2.09;
      ctx.save(); ctx.translate(Math.cos(oa) * R * 1.5, Math.sin(oa) * R * 0.9); ctx.rotate(oa);
      ctx.fillStyle = DK; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0); ctx.fill();
      ctx.restore();
    }
    for (const [col, s] of [['#103040', 1.08], [C, 1]]) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -R * 1.2 * s); ctx.lineTo(R * 0.85 * s, 0); ctx.lineTo(0, R * s); ctx.lineTo(-R * 0.85 * s, 0); ctx.fill();
    }
    ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.moveTo(0, -R * 1.2); ctx.lineTo(R * 0.3, 0); ctx.lineTo(0, R); ctx.lineTo(-R * 0.2, 0); ctx.fill();
    ctx.fillStyle = e.hp < e.max / 2 ? '#ff5a8a' : '#204060';
    ctx.fillRect(-R * 0.4, -R * 0.2, R * 0.22, R * 0.3); ctx.fillRect(R * 0.18, -R * 0.2, R * 0.22, R * 0.3);
    ctx.restore();
  },
  magma(ctx, e, x, y, R, C, DK, a, now) {
    const pl = 1 + Math.sin(now * 4) * 0.05, by = y - R * 0.2;
    for (let k = 0; k < 6; k++) { const oa = now * 1.3 + k * 1.05; ellipse(ctx, x + Math.cos(oa) * R * 1.5, by + Math.sin(oa) * R * 0.8, 3, 3, '#ffb040'); }
    ellipse(ctx, x, by, R * 1.1 * pl, R * 1.05 * pl, '#3a0a00');
    ellipse(ctx, x, by, R * 0.98 * pl, R * 0.92 * pl, e.flash > 0 ? '#fff' : e.hp < e.max * 0.4 ? '#ff3a10' : C);
    ellipse(ctx, x, by, R * 0.6, R * 0.55, '#ffb040'); ellipse(ctx, x - R * 0.1, by - R * 0.1, R * 0.3, R * 0.28, '#ffe8a0');
    ctx.fillStyle = '#3a0a00'; ctx.fillRect(x - R * 0.45, by - R * 0.35, R * 0.25, R * 0.32); ctx.fillRect(x + R * 0.2, by - R * 0.35, R * 0.25, R * 0.32);
  },
  slime(ctx, e, x, y, R, C, DK, a, now) {
    const lift = e.air > 0 ? Math.sin((e.air / 0.32) * Math.PI) * R * 0.5 : 0, sq = e.air > 0 ? 0.9 : 1 + Math.sin(now * 6 + e.x) * 0.06;
    ellipse(ctx, x, y - lift, (R * 1.05) / sq, R * sq, DK);
    ellipse(ctx, x, y - lift, (R * 0.95) / sq, R * 0.9 * sq, C);
    ellipse(ctx, x - R * 0.35, y - lift - R * 0.4, R * 0.22, R * 0.14, '#ffffff66', -0.5);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - R * 0.35 + Math.cos(a) * R * 0.2, y - lift - R * 0.15 + Math.sin(a) * R * 0.15, R * 0.18, R * 0.28);
    ctx.fillRect(x + R * 0.17 + Math.cos(a) * R * 0.2, y - lift - R * 0.15 + Math.sin(a) * R * 0.15, R * 0.18, R * 0.28);
    if (e.t === 'boss') ctx.drawImage(icon('trophy'), x - R * 0.45, y - lift - R * 1.45, R * 0.9, R * 0.9);
  },
};
// ---------- Animais (desenhados virados para a direita; espelha conforme a direção) ----------
function animalFrame(ctx, e, x, y, now, draw) {
  const flip = Math.cos(e.face) < 0 ? -1 : 1, moving = Math.hypot(e.vx, e.vy) > 0.3;
  const step = moving ? Math.sin(now * 12 + e.ph) : 0, bob = moving ? Math.abs(step) * 1.5 : Math.sin(now * 2 + e.ph) * 0.4;
  ctx.save(); ctx.translate(x, y - bob); ctx.scale(flip, 1);
  draw(step);
  ctx.restore();
}
const COW_LEGS = [-0.7, -0.4, 0.35, 0.6], SHEEP_LEGS = [-0.6, -0.3, 0.3, 0.55];
const SHEEP_PUFFS = [[-0.45, 0, 0.5], [0.15, -0.1, 0.55], [0.45, 0.1, 0.45], [-0.1, 0.15, 0.5]];
function legs(ctx, R, step, col, xs) {
  ctx.fillStyle = col;
  xs.forEach((lx, k) => ctx.fillRect(lx * R, R * 0.25 + (k % 2 ? step : -step) * 1.5, R * 0.18, R * 0.45));
}
Object.assign(SHAPES, {
  cow(ctx, e, x, y, R, C, DK, a, now) {
    animalFrame(ctx, e, x, y, now, step => {
      legs(ctx, R, step, '#3a2a20', COW_LEGS);
      ellipse(ctx, 0, 0, R * 1.05, R * 0.62, DK); ellipse(ctx, 0, -1, R, R * 0.56, C);
      ellipse(ctx, -R * 0.35, -R * 0.15, R * 0.28, R * 0.2, '#2a2420'); ellipse(ctx, R * 0.25, R * 0.12, R * 0.22, R * 0.16, '#2a2420');
      ellipse(ctx, R * 1.0, -R * 0.35, R * 0.38, R * 0.32, C); ellipse(ctx, R * 1.22, -R * 0.25, R * 0.2, R * 0.16, '#e8a0a0');
      ctx.fillStyle = '#d8c8a8'; ctx.fillRect(R * 0.8, -R * 0.8, R * 0.1, R * 0.22); ctx.fillRect(R * 1.05, -R * 0.82, R * 0.1, R * 0.22);
      ctx.fillStyle = '#111'; ctx.fillRect(R * 1.05, -R * 0.45, 2, 2);
    });
  },
  sheep(ctx, e, x, y, R, C, DK, a, now) {
    animalFrame(ctx, e, x, y, now, step => {
      legs(ctx, R, step, '#2a2420', SHEEP_LEGS);
      for (const [dx, dy, r] of SHEEP_PUFFS) ellipse(ctx, dx * R, dy * R, r * R + 1.5, r * R + 1.5, DK);
      for (const [dx, dy, r] of SHEEP_PUFFS) ellipse(ctx, dx * R, dy * R, r * R, r * R, C);
      ellipse(ctx, R * 0.95, -R * 0.3, R * 0.3, R * 0.27, '#3a3430');
      ctx.fillStyle = '#fff'; ctx.fillRect(R * 1.02, -R * 0.38, 2, 2);
    });
  },
  chicken(ctx, e, x, y, R, C, DK, a, now) {
    animalFrame(ctx, e, x, y, now, step => {
      ctx.fillStyle = '#e0a030'; ctx.fillRect(-R * 0.25, R * 0.4 + step, 2, R * 0.6); ctx.fillRect(R * 0.15, R * 0.4 - step, 2, R * 0.6);
      ellipse(ctx, 0, 0, R * 0.95, R * 0.8, DK); ellipse(ctx, 0, -1, R * 0.88, R * 0.74, C);
      ellipse(ctx, -R * 0.75, -R * 0.35, R * 0.35, R * 0.25, C, -0.6); // cauda
      ellipse(ctx, R * 0.6, -R * 0.8, R * 0.42, R * 0.42, C);
      ellipse(ctx, R * 0.6, -R * 1.22, R * 0.2, R * 0.14, '#e03a3a');
      ctx.fillStyle = '#f0a020'; ctx.beginPath(); ctx.moveTo(R * 0.98, -R * 0.85); ctx.lineTo(R * 1.3, -R * 0.75); ctx.lineTo(R * 0.98, -R * 0.65); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(R * 0.68, -R * 0.92, 2, 2);
    });
  },
  rabbit(ctx, e, x, y, R, C, DK, a, now) {
    animalFrame(ctx, e, x, y, now, step => {
      const hop = Math.abs(step) * R * 0.5;
      ctx.translate(0, -hop);
      ellipse(ctx, 0, 0, R, R * 0.72, DK); ellipse(ctx, 0, -1, R * 0.92, R * 0.66, C);
      ellipse(ctx, -R * 0.95, -R * 0.1, R * 0.25, R * 0.25, '#fff');
      ellipse(ctx, R * 0.7, -R * 0.5, R * 0.45, R * 0.42, C);
      ellipse(ctx, R * 0.55, -R * 1.25, R * 0.14, R * 0.45, C, -0.2); ellipse(ctx, R * 0.8, -R * 1.25, R * 0.14, R * 0.45, C, 0.2);
      ellipse(ctx, R * 0.8, -R * 1.25, R * 0.06, R * 0.3, '#e8a8a8', 0.2);
      ctx.fillStyle = '#111'; ctx.fillRect(R * 0.85, -R * 0.6, 2, 2);
    });
  },
});
const NO_SHADOW = new Set(['wisp', 'bat']);

export function drawEnemy(ctx, e, view, now) {
  const D = ENEMIES[e.t], shape = D.shape || 'slime';
  const x = view.sx(e.x), y = view.sy(e.y), R = e.r * T;
  const C = e.flash > 0 ? '#ffffff' : D.col, DK = shade(D.col, -70), a = Math.atan2(G.player.y - e.y, G.player.x - e.x);
  if (!NO_SHADOW.has(shape)) ellipse(ctx, x, y + R * 0.55, R * 0.95, R * 0.4, '#0006');
  SHAPES[shape](ctx, e, x, y, R, C, DK, a, now, view);
}

export function drawEnemyHealth(ctx, e, view) {
  const x = view.sx(e.x) - 14, y = view.sy(e.y) - e.r * T - 12;
  ctx.fillStyle = '#000a'; ctx.fillRect(x, y, 28, 5);
  ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x + 1, y + 1, (26 * e.hp) / e.max, 3);
}

// ---------- Projéteis ----------
export function drawProjectile(ctx, q, view) {
  const x = view.sx(q.x), y = view.sy(q.y), R = q.r * T;
  ellipse(ctx, x, y, R * 2, R * 2, q.col + '44');
  ellipse(ctx, x, y, R, R, q.col);
  ellipse(ctx, x, y, R * 0.4, R * 0.4, '#fff');
}
