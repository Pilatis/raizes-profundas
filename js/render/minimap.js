// Mapas: uma imagem do mundo explorado (1 px por bloco), usada pelo minimapa
// circular do canto e pelo mapa grande em tela cheia, com marcadores por cima.
import { G } from '../core/state.js';
import { hexToRgb } from '../core/util.js';
import { WALLS, OBJECTS } from '../data/world-data.js';
import { ENEMIES } from '../data/enemies.js';

const MINI_RADIUS_TILES = 34;
const REFRESH = 0.5;                // segundos entre atualizações da imagem
const image = document.createElement('canvas');
const ictx = image.getContext('2d');
let pixels = null, timer = 0, builtFor = null;

const wallRgb = {};
for (const k in WALLS) { const d = WALLS[k]; wallRgb[k] = hexToRgb(d.leaf || d.ore || d.top); }
const floorRgb = {};
const floorColors = pal => floorRgb[pal] || (floorRgb[pal] = pal.map(h => hexToRgb(h).map(c => Math.min(255, c * 1.25))));

const LIGHT_RGB = [255, 200, 80], CHEST_RGB = [255, 220, 40];

/** Reconstrói a imagem do mundo ativo de tempos em tempos (barato: 65 mil pixels). */
export function refreshMapImage(dt, force = false) {
  const w = G.world;
  if (!force && builtFor === w && (timer -= dt) > 0) return;
  timer = REFRESH;
  builtFor = w;
  if (image.width !== w.size) { image.width = image.height = w.size; pixels = ictx.createImageData(w.size, w.size); }
  const px = pixels.data, fc = floorColors(w.palette);
  for (let i = 0; i < w.size * w.size; i++) {
    const k = i * 4;
    if (!w.explored[i]) { px[k] = 10; px[k + 1] = 9; px[k + 2] = 16; px[k + 3] = 255; continue; }
    const o = w.objs[i];
    const c = o && OBJECTS[o.t] && OBJECTS[o.t].light ? LIGHT_RGB : o && o.t === 'chest' ? CHEST_RGB : w.wall[i] ? wallRgb[w.wall[i]] : fc[w.floor[i]];
    px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255;
  }
  ictx.putImageData(pixels, 0, 0);
}

function marker(g, x, y, text, col, size) {
  g.font = `bold ${size}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 3; g.strokeStyle = '#000c'; g.strokeText(text, x, y);
  g.fillStyle = col; g.fillText(text, x, y);
}

function playerArrow(g, x, y, s) {
  const a = G.player.face;
  g.save(); g.translate(x, y); g.rotate(a);
  g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * 0.7, s * 0.65); g.lineTo(-s * 0.35, 0); g.lineTo(-s * 0.7, -s * 0.65); g.closePath();
  g.fill(); g.stroke(); g.restore();
}

/** Marcadores (porta, chefes, inimigos próximos) — `toScreen` converte bloco -> pixel. */
function drawMarkers(g, toScreen, scale, showEnemies) {
  const w = G.world;
  for (const v of w.villages) {
    const [x, y] = toScreen(v.x, v.y);
    marker(g, x, y, '⌂', '#9be07b', 11 + scale * 3);
    if (scale > 1) marker(g, x, y + 14, v.name, '#efe6d6', 10);
  }
  if (w.door) { const [x, y] = toScreen(w.door.x + 0.5, w.door.y + 0.5); marker(g, x, y, w.isSurface ? '▼' : '▲', '#ffc04a', 10 + scale * 2); }
  for (const b of w.bosses) { const [x, y] = toScreen(b.x, b.y); marker(g, x, y, b.done ? '✓' : '☠', b.done ? '#ffffff88' : '#ff4a6a', 10 + scale * 2); }
  if (showEnemies) for (const e of G.enemies) {
    const [x, y] = toScreen(e.x, e.y);
    g.fillStyle = ENEMIES[e.t].boss ? '#ff4a6a' : ENEMIES[e.t].passive ? '#9be07b' : '#ff8a5a';
    g.beginPath(); g.arc(x, y, ENEMIES[e.t].boss ? 4 : 2, 0, 7); g.fill();
  }
}

/** Minimapa circular centrado no jogador. */
export function drawMinimap(canvas) {
  const g = canvas.getContext('2d'), S = canvas.width, p = G.player, R = MINI_RADIUS_TILES;
  const scale = S / (R * 2);
  g.clearRect(0, 0, S, S);
  g.save();
  g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.clip();
  g.fillStyle = '#0a0910'; g.fillRect(0, 0, S, S);
  g.imageSmoothingEnabled = false;
  g.drawImage(image, p.x - R, p.y - R, R * 2, R * 2, 0, 0, S, S);
  const toScreen = (x, y) => [(x - p.x + R) * scale, (y - p.y + R) * scale];
  drawMarkers(g, toScreen, 1, true);
  playerArrow(g, S / 2, S / 2, 6);
  g.restore();
  // borda e indicador de norte
  g.lineWidth = 3; g.strokeStyle = '#3a3350'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.stroke();
  g.lineWidth = 1; g.strokeStyle = '#ffffff22'; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 5, 0, 7); g.stroke();
  marker(g, S / 2, 9, 'N', '#ffc04a', 10);
}

/** Mapa grande: mundo inteiro com grade sutil e marcadores. */
export function drawWorldMap(canvas) {
  const g = canvas.getContext('2d'), S = canvas.width, w = G.world, scale = S / w.size;
  g.imageSmoothingEnabled = false;
  g.drawImage(image, 0, 0, S, S);
  g.strokeStyle = '#ffffff0a'; g.lineWidth = 1;
  for (let k = 32; k < w.size; k += 32) {
    g.beginPath(); g.moveTo(k * scale, 0); g.lineTo(k * scale, S); g.moveTo(0, k * scale); g.lineTo(S, k * scale); g.stroke();
  }
  const toScreen = (x, y) => [x * scale, y * scale];
  drawMarkers(g, toScreen, 3, false);
  const [px, py] = toScreen(G.player.x, G.player.y);
  playerArrow(g, px, py, 9);
}
