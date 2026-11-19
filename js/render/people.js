// Pessoas: um desenho de humanoide compartilhado pelo jogador e pelos moradores.
import { G } from '../core/state.js';
import { PROFESSIONS } from '../data/npcs.js';
import { currentQuest } from '../game/npcs.js';
import { icon } from './icons.js';

const SKINS = ['#f0c8a0', '#d8a070', '#a8704a', '#7a4a2a'];
const HAIRS = ['#5a3a1a', '#2a1a10', '#c8a050', '#8a3a1a', '#d8d0c8'];
const NAME_RANGE = 4.5;

function ellipse(ctx, x, y, rx, ry, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fill(); }

/** Corpo, cabeça, cabelo/chapéu e olhos virados para `face`. */
function humanoid(ctx, x, y, face, bob, look) {
  ellipse(ctx, x, y + 10, 11, 5, '#0006');
  ellipse(ctx, x, y + 2 + bob, 11, 11, '#1c1a24');
  ellipse(ctx, x, y + 2 + bob, 9.5, 9.5, look.shirt);
  if (look.apron) { ctx.fillStyle = look.apron; ctx.fillRect(x - 5, y + bob, 10, 9); }
  ellipse(ctx, x, y - 7 + bob, 7.5, 7.5, look.skin);
  ctx.fillStyle = look.hair;
  ctx.beginPath(); ctx.arc(x, y - 9 + bob, 7.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  if (look.hat) {
    ctx.fillStyle = look.hat;
    ctx.fillRect(x - 9, y - 12 + bob, 18, 3);
    ctx.fillRect(x - 5, y - 18 + bob, 10, 7);
  }
  const fx = Math.cos(face), fy = Math.sin(face);
  if (fy > -0.5) {
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(x - 4 + fx * 3, y - 8 + bob + fy * 2, 2, 3);
    ctx.fillRect(x + 2 + fx * 3, y - 8 + bob + fy * 2, 2, 3);
  }
}

const PLAYER_LOOK = { shirt: '#3d7ad0', skin: SKINS[0], hair: HAIRS[0] };

export function drawPlayer(ctx, view, held) {
  const p = G.player, x = view.sx(p.x), y = view.sy(p.y), now = performance.now();
  const bob = p.moving ? Math.sin(now / (p.sprinting ? 55 : 80)) * 1.5 : 0;
  if (p.ifr > 0 && Math.floor(p.ifr * 20) % 2) { ellipse(ctx, x, y + 10, 11, 5, '#0006'); return; } // pisca invulnerável
  humanoid(ctx, x, y, p.face, bob, PLAYER_LOOK);
  if (!held) return;
  const sw = p.swing > 0 ? (1 - p.swing / 0.22) * 2.4 - 1.2 : 0, a = p.face + sw;
  ctx.save();
  ctx.translate(x + Math.cos(a) * 12, y + bob + Math.sin(a) * 12);
  ctx.rotate(a + Math.PI / 4);
  ctx.drawImage(icon(held), -10, -10, 20, 20);
  ctx.restore();
}

/** Aparência estável do morador, derivada do nome (sem precisar salvar). */
function lookOf(npc) {
  if (npc._look) return npc._look;
  let h = 0;
  for (const ch of npc.name + npc.prof) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const prof = PROFESSIONS[npc.prof];
  const look = { shirt: prof.shirt, hat: prof.hat, skin: SKINS[Math.abs(h) % SKINS.length], hair: HAIRS[Math.abs(h >> 3) % HAIRS.length], apron: npc.prof === 'smith' ? '#4a3020' : null };
  Object.defineProperty(npc, '_look', { value: look, enumerable: false }); // não vai para o save
  return look;
}

function label(ctx, x, y, text, col) {
  ctx.font = 'bold 10px "Pixelify Sans", monospace';
  ctx.textAlign = 'center';
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = '#000a'; ctx.fillRect(Math.round(x - w / 2), y - 9, Math.round(w), 13);
  ctx.fillStyle = col; ctx.fillText(text, x, y + 1);
}

export function drawNpc(ctx, npc, view, now) {
  const x = view.sx(npc.x), y = view.sy(npc.y), moving = Math.hypot(npc.vx || 0, npc.vy || 0) > 0.1;
  humanoid(ctx, x, y, npc.face || Math.PI / 2, moving ? Math.sin(now * 12) * 1.2 : 0, lookOf(npc));
  const p = G.player, near = Math.hypot(p.x - npc.x, p.y - npc.y) < NAME_RANGE;
  if (currentQuest(npc)) { // tem pedido: exclamação flutuando
    const by = y - 30 + Math.sin(now * 4) * 2;
    label(ctx, x, by, '!', '#ffd24a');
  }
  if (near) label(ctx, x, y - (currentQuest(npc) ? 44 : 30), `${npc.name} · ${PROFESSIONS[npc.prof].title}`, '#efe6d6');
}

/** Retrato ampliado para a janela de conversa. */
export function drawNpcPortrait(canvas, npc) {
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.save();
  g.scale(2, 2);
  humanoid(g, 16, 20, Math.PI / 2, 0, lookOf(npc));
  g.restore();
}
