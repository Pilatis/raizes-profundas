// Ícones 32×32 desenhados por código, um por tipo de item. Cache: cada ícone é desenhado uma vez.
import { shade } from '../core/util.js';
import { ITEMS } from '../data/items.js';

const cache = new Map(), urlCache = new Map();
const shadeDark = c => shade(c, -30);

function painter(g) {
  return {
    line(x1, y1, x2, y2, w, s) { g.strokeStyle = s; g.lineWidth = w; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); },
    poly(pts, fill, stroke) {
      g.beginPath(); g.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
      g.closePath(); g.fillStyle = fill; g.fill();
      if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.stroke(); }
    },
    circ(x, y, r, fill) { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); },
    ell(x, y, rx, ry, rot, fill) { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); },
    rect(x, y, w, h, fill) { g.fillStyle = fill; g.fillRect(x, y, w, h); },
  };
}

const DRAW = {
  pick(g, P, c, dk, lt) {
    P.line(7, 27, 21, 12, 5, '#2a1a0c'); P.line(7, 27, 21, 12, 3, '#8a5a2a');
    for (const [w, s] of [[7, '#1a1410'], [4.5, c]]) { g.strokeStyle = s; g.lineWidth = w; g.beginPath(); g.moveTo(9, 8); g.quadraticCurveTo(24, 6, 27, 21); g.stroke(); }
    g.strokeStyle = lt; g.lineWidth = 1.5; g.beginPath(); g.moveTo(11, 8); g.quadraticCurveTo(22, 7, 25, 17); g.stroke();
  },
  sword(g, P, c, dk, lt) {
    P.line(11, 21, 26, 6, 7, '#1a1410'); P.line(11, 21, 26, 6, 4.5, c); P.line(13, 18, 24, 7, 1.5, lt);
    P.line(6, 16, 16, 26, 5, '#2a1a0c'); P.line(6, 16, 16, 26, 3, '#c8a040'); P.line(10, 22, 5, 27, 4, '#5a3a1a');
  },
  staff(g, P, c) {
    P.line(7, 27, 22, 10, 5, '#1a1008'); P.line(7, 27, 22, 10, 3, '#7a5228');
    P.circ(23, 9, 7, c + '55'); P.circ(23, 9, 5, '#101018'); P.circ(23, 9, 4, c); P.circ(21.5, 7.5, 1.5, '#fff');
  },
  block(g, P, c, dk, lt) { P.rect(5, 5, 22, 22, '#000'); P.rect(6, 6, 20, 20, c); P.rect(6, 6, 20, 6, lt); P.rect(6, 22, 20, 4, dk); P.rect(10, 14, 3, 3, dk); P.rect(19, 16, 3, 3, dk); },
  log(g, P, c, dk) { P.rect(4, 10, 24, 13, '#1a1008'); P.rect(5, 11, 22, 11, c); P.rect(5, 15, 22, 2, dk); P.circ(25, 16.5, 5, '#e0b070'); P.circ(25, 16.5, 2.5, '#a8743a'); },
  ore(g, P, c, dk, lt) { P.poly([6, 20, 10, 9, 20, 6, 27, 13, 25, 24, 13, 27], '#5a5a66', '#1a1a22'); P.circ(12, 15, 3, c); P.circ(20, 12, 2.5, c); P.circ(19, 21, 3, c); P.circ(11.5, 14, 1, lt); },
  gem(g, P, c, dk, lt) { P.poly([16, 3, 26, 13, 16, 29, 6, 13], c, '#103040'); P.poly([16, 3, 20, 13, 16, 29, 12, 13], lt); },
  bar(g, P, c, dk, lt) { P.poly([4, 24, 9, 12, 25, 12, 28, 24], c, '#1a1410'); P.poly([9, 12, 25, 12, 23, 15, 11, 15], lt); },
  gel(g, P, c) { P.ell(16, 19, 11, 9, 0, '#103010'); P.ell(16, 19, 9.5, 7.5, 0, c); P.circ(12, 16, 2.5, '#e0ffe0'); },
  lump(g, P, c, dk, lt) { P.ell(16, 18, 11, 8, 0.2, dk); P.ell(16, 17, 9.5, 6.5, 0.2, c); P.circ(12, 15, 1.5, lt); },
  torch(g, P) { P.rect(13, 12, 6, 17, '#2a1a0c'); P.rect(14, 13, 4, 15, '#8a5a2a'); P.circ(16, 10, 6, '#ff7a1a'); P.circ(16, 11, 3.5, '#ffe070'); },
  bench(g, P, c, dk, lt) {
    P.rect(3, 9, 26, 8, '#1a1008'); P.rect(5, 15, 5, 13, '#1a1008'); P.rect(22, 15, 5, 13, '#1a1008');
    P.rect(4, 10, 24, 6, c); P.rect(4, 10, 24, 2, lt); P.rect(6, 16, 3, 11, dk); P.rect(23, 16, 3, 11, dk); P.rect(8, 6, 9, 3, '#bbb');
  },
  furnace(g, P, c, dk, lt) { P.rect(4, 4, 24, 25, '#16161c'); P.rect(5, 5, 22, 23, c); P.rect(5, 5, 22, 4, lt); P.rect(10, 15, 12, 10, '#1a0c06'); P.rect(11, 19, 10, 6, '#ff7a1a'); P.rect(13, 22, 6, 3, '#ffe070'); },
  fire(g, P) {
    P.line(6, 26, 26, 20, 5, '#5a3a1a'); P.line(6, 20, 26, 26, 5, '#7a4a22');
    for (const [col, pts] of [['#ff5a1a', [9, 22, 10, 8, 16, 4, 22, 10, 23, 22]], ['#ffd050', [12, 22, 14, 13, 16, 10, 19, 14, 20, 22]]]) {
      g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); g.quadraticCurveTo(pts[2], pts[3], pts[4], pts[5]); g.quadraticCurveTo(pts[6], pts[7], pts[8], pts[9]); g.closePath(); g.fill();
    }
  },
  lamp(g, P, c) { P.rect(14, 14, 4, 15, '#333'); P.rect(9, 27, 14, 3, '#333'); P.circ(16, 11, 8, '#7ff3ff55'); P.poly([16, 3, 21, 11, 16, 19, 11, 11], c, '#204050'); },
  chest(g, P, c, dk, lt) { P.rect(3, 8, 26, 20, '#1a1008'); P.rect(4, 9, 24, 18, c); P.rect(4, 9, 24, 3, lt); P.rect(4, 15, 24, 2, dk); P.rect(14, 13, 4, 6, '#ffd24a'); P.rect(15, 15, 2, 2, '#5a3a00'); },
  seed(g, P, c) { for (const [x, y] of [[10, 12], [20, 10], [15, 21], [23, 20]]) { P.ell(x, y, 4, 3, 0.6, '#2a1a3a'); P.ell(x, y, 3, 2, 0.6, c); } },
  shroom(g, P, c, dk, lt) {
    P.rect(12, 14, 8, 14, '#2a1a10'); P.rect(13, 15, 6, 12, '#efe0c8');
    g.fillStyle = '#1a0c06'; g.beginPath(); g.arc(16, 16, 12, Math.PI, 0); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(16, 16, 10.5, Math.PI, 0); g.fill();
    P.circ(11, 11, 2, lt); P.circ(19, 9, 1.5, lt);
  },
  bowl(g, P, c) {
    g.fillStyle = '#3a2414'; g.beginPath(); g.arc(16, 16, 12, 0, Math.PI); g.fill();
    g.fillStyle = '#8a5a2a'; g.beginPath(); g.arc(16, 16, 10.5, 0, Math.PI); g.fill();
    P.ell(16, 16, 11, 3.5, 0, c); P.circ(12, 15, 1.5, '#e0ffe0'); P.circ(19, 16, 1.5, '#e2a77a');
  },
  berry(g, P, c, dk, lt) {
    P.ell(20, 8, 6, 3, -0.6, '#3a8a3a');
    for (const [x, y] of [[11, 15], [19, 16], [15, 22], [23, 23], [9, 23]]) { P.circ(x, y, 5, dk); P.circ(x, y, 4, c); P.circ(x - 1.5, y - 1.5, 1.2, lt); }
  },
  meat(g, P, c, dk, lt) { P.line(20, 20, 28, 28, 5, '#e8e0d0'); P.circ(28, 28, 3, '#e8e0d0'); P.ell(13, 13, 10, 8, 0.7, dk); P.ell(13, 12, 8.5, 6.5, 0.7, c); P.ell(10, 10, 3, 2, 0.7, lt); },
  armor(g, P, c, dk, lt) { P.poly([8, 5, 13, 8, 19, 8, 24, 5, 29, 11, 25, 14, 24, 28, 8, 28, 7, 14, 3, 11], c, '#1a1410'); P.poly([13, 8, 19, 8, 16, 13], dk); P.rect(10, 16, 12, 2, lt); },
  amulet(g, P, c, dk, lt) {
    g.strokeStyle = '#c8a040'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(8, 4); g.quadraticCurveTo(16, 16, 24, 4); g.stroke();
    g.fillStyle = '#3a0a1a'; g.beginPath(); g.moveTo(16, 28); g.bezierCurveTo(2, 19, 7, 9, 16, 15); g.bezierCurveTo(25, 9, 30, 19, 16, 28); g.fill();
    g.fillStyle = c; g.beginPath(); g.moveTo(16, 26); g.bezierCurveTo(5, 18, 9, 11, 16, 16.5); g.bezierCurveTo(23, 11, 27, 18, 16, 26); g.fill();
    P.circ(12, 17, 1.8, lt);
  },
  boots(g, P, c, dk, lt) { P.poly([9, 5, 17, 5, 17, 19, 27, 21, 27, 27, 7, 27], c, '#0a2a30'); P.rect(9, 7, 8, 3, lt); P.poly([20, 22, 28, 18, 29, 27], dk); },
  core(g, P, c) { P.circ(16, 16, 12, c + '44'); P.circ(16, 16, 9, '#3a0a00'); P.circ(16, 16, 7.5, c); P.circ(16, 16, 4, '#ffd060'); P.circ(13, 13, 1.8, '#fff'); },
  hoe(g, P) {
    P.line(8, 27, 22, 9, 5, '#2a1a0c'); P.line(8, 27, 22, 9, 3, '#8a5a2a');
    P.poly([18, 6, 27, 4, 28, 9, 22, 11], '#9aa0aa', '#1a1a22');
  },
  can(g, P, c, dk, lt) {
    P.poly([7, 12, 21, 12, 23, 27, 5, 27], c, '#1a1410'); P.rect(8, 14, 12, 3, lt);
    P.line(21, 17, 29, 10, 4, dk); P.circ(29, 9, 2.5, dk);
    g.strokeStyle = '#1a1410'; g.lineWidth = 2.5; g.beginPath(); g.arc(14, 11, 6, Math.PI, 0); g.stroke();
  },
  grain(g, P, c, dk, lt) {
    for (const dx of [-5, 0, 5]) {
      P.line(16 + dx * 0.4, 29, 16 + dx, 10, 2, '#a88a30');
      for (let k = 0; k < 4; k++) P.ell(16 + dx + (k % 2 ? 2 : -2), 8 + k * 3.2, 2.2, 3.2, k % 2 ? 0.5 : -0.5, c);
    }
    P.rect(11, 20, 10, 3, '#8a5a2a');
  },
  carrot(g, P, c, dk, lt) {
    P.ell(10, 7, 3, 6, -0.5, '#3a9a3a'); P.ell(15, 6, 3, 6, 0.2, '#4aaa3a');
    P.poly([8, 12, 18, 10, 22, 14, 10, 28], c, '#5a2a0a'); P.line(12, 16, 15, 15, 1.5, dk); P.line(11, 21, 14, 20, 1.5, dk); P.line(11, 14, 13, 24, 1.2, lt);
  },
  pumpkin(g, P, c, dk, lt) {
    P.rect(14, 4, 4, 6, '#5a7a2a');
    P.ell(16, 18, 13, 10, 0, '#5a2a00'); P.ell(16, 18, 12, 9, 0, c);
    P.ell(16, 18, 4, 9, 0, dk); P.ell(9, 18, 3, 8, 0, lt + '55'); P.ell(23, 18, 3, 8, 0, dk + '88');
  },
  egg(g, P, c, dk, lt) { P.ell(16, 17, 9, 11, 0, '#8a7a60'); P.ell(16, 17, 8, 10, 0, c); P.ell(13, 12, 2.5, 3.5, -0.3, '#fff'); P.circ(19, 21, 1, '#c8b898'); },
  friedegg(g, P, c) {
    P.ell(16, 17, 13, 10, 0.2, '#d8d0c0'); P.ell(16, 16, 12, 9, 0.2, '#fbfaf2');
    P.circ(17, 16, 5, '#c88a00'); P.circ(17, 16, 4.2, c); P.circ(15.5, 14.5, 1.3, '#fff8');
  },
  bread(g, P, c, dk, lt) {
    P.ell(16, 18, 13, 8, 0, '#5a3410'); P.ell(16, 17, 12, 7, 0, c);
    for (const x of [10, 16, 22]) P.line(x - 2, 14, x + 2, 19, 2, dk);
    P.ell(12, 14, 4, 1.5, -0.2, lt);
  },
  pie(g, P, c, dk, lt) {
    P.ell(16, 19, 13, 8, 0, '#6a4420'); P.ell(16, 18, 12, 7, 0, '#d8a060'); P.ell(16, 17, 9.5, 5, 0, c);
    for (const x of [10, 16, 22]) P.line(x, 13, x, 22, 1.5, '#d8a060');
    P.circ(13, 15, 1.2, lt);
  },
  hide(g, P, c, dk, lt) { P.poly([6, 8, 12, 5, 20, 5, 26, 8, 27, 20, 22, 27, 10, 27, 5, 20], c, '#3a2010'); P.ell(16, 16, 6, 7, 0, lt + '44'); P.circ(12, 11, 1.5, dk); P.circ(21, 20, 1.5, dk); },
  wool(g, P, c) { for (const [x, y, r] of [[11, 18, 7], [21, 18, 7], [16, 11, 7], [16, 21, 6]]) { P.circ(x, y, r + 1, '#a8a49c'); P.circ(x, y, r, c); } P.circ(13, 13, 2, '#fff'); },
  bed(g, P, c) {
    P.rect(3, 9, 26, 18, '#3a2410'); P.rect(4, 10, 24, 16, '#8a5a2a');
    P.rect(5, 11, 22, 14, c); P.rect(5, 11, 8, 14, '#f4f0e8'); P.rect(5, 18, 22, 2, '#00000033');
    P.rect(3, 25, 3, 4, '#3a2410'); P.rect(26, 25, 3, 4, '#3a2410');
  },
  hammer(g, P) { P.line(9, 27, 19, 11, 5, '#2a1a0c'); P.line(9, 27, 19, 11, 3, '#8a5a2a'); P.poly([12, 6, 24, 6, 26, 13, 14, 15], '#8a8a96', '#1a1a22'); P.rect(15, 7, 8, 2, '#c8c8d0'); },
  glass(g, P, c) { P.rect(5, 5, 22, 22, '#3a5a6a'); P.rect(6, 6, 20, 20, c + '99'); P.line(9, 20, 16, 9, 2, '#ffffffaa'); P.line(15, 23, 22, 13, 1.5, '#ffffff66'); },
  fence(g, P, c, dk) { for (const x of [7, 22]) { P.rect(x - 1, 6, 5, 22, '#2a1a0c'); P.rect(x, 7, 3, 20, c); } P.rect(5, 11, 22, 4, dk); P.rect(5, 19, 22, 4, dk); },
  door(g, P, c, dk, lt) { P.rect(7, 3, 18, 27, '#2a1a0c'); P.rect(8, 4, 16, 25, c); P.rect(10, 6, 12, 9, dk); P.rect(10, 17, 12, 9, dk); P.circ(21, 17, 1.6, '#ffd24a'); },
  floortile(g, P, c, dk, lt) { P.poly([16, 6, 29, 13, 16, 20, 3, 13], c, '#1a1410'); P.poly([3, 13, 16, 20, 16, 26, 3, 19], dk); P.poly([16, 20, 29, 13, 29, 19, 16, 26], shadeDark(dk)); P.line(9, 10, 22, 17, 1, lt); },
  table(g, P, c, dk, lt) { P.rect(4, 10, 24, 7, '#2a1a0c'); P.rect(5, 11, 22, 5, c); P.rect(5, 11, 22, 2, lt); P.rect(7, 16, 3, 12, dk); P.rect(22, 16, 3, 12, dk); },
  chair(g, P, c, dk, lt) { P.rect(9, 4, 14, 12, '#2a1a0c'); P.rect(10, 5, 12, 10, c); P.rect(8, 15, 16, 5, lt); P.rect(9, 20, 3, 9, dk); P.rect(20, 20, 3, 9, dk); },
  shelf(g, P, c, dk) {
    P.rect(4, 3, 24, 27, '#2a1a0c'); P.rect(5, 4, 22, 25, c);
    const books = ['#c83a3a', '#3a6ac8', '#3a9a5a', '#e0b040', '#8a4ac8'];
    for (let r = 0; r < 3; r++) { P.rect(5, 11 + r * 8, 22, 2, dk); for (let b = 0; b < 5; b++) P.rect(7 + b * 4, 5 + r * 8, 3, 6, books[(b + r) % 5]); }
  },
  pot(g, P, c, dk) { P.ell(11, 9, 4, 4, 0, '#ff6a8a'); P.ell(20, 8, 4, 4, 0, '#ffd24a'); P.ell(16, 6, 3.5, 3.5, 0, '#9a7aff'); P.line(16, 10, 16, 17, 2, '#3a8a3a'); P.poly([8, 16, 24, 16, 21, 29, 11, 29], c, '#3a1a0a'); P.rect(8, 16, 16, 3, dk); },
  lantern(g, P, c) { P.rect(14, 2, 4, 3, '#333'); P.rect(9, 5, 14, 4, '#3a3a44'); P.rect(9, 9, 14, 15, '#ffe08a'); P.circ(16, 16, 4, '#fff6c8'); P.rect(9, 9, 2, 15, '#3a3a44'); P.rect(21, 9, 2, 15, '#3a3a44'); P.rect(8, 24, 16, 4, '#3a3a44'); },
  banner(g, P, c, dk, lt) { P.rect(5, 3, 22, 3, '#6a4426'); P.poly([8, 6, 24, 6, 24, 27, 16, 22, 8, 27], c, '#3a0a0a'); P.circ(16, 13, 3.5, '#ffd24a'); P.line(10, 8, 10, 24, 1.5, lt); },
  coin(g, P, c, dk, lt) { P.circ(16, 17, 11, '#6a4a00'); P.circ(16, 16, 10, c); P.circ(16, 16, 7, dk); P.circ(16, 16, 6, c); P.rect(14, 11, 4, 10, dk); P.circ(12, 12, 2, lt); },
  crown(g, P, c) { P.poly([4, 25, 4, 10, 10, 17, 16, 6, 22, 17, 28, 10, 28, 25], c, '#5a3a00'); P.circ(16, 20, 2.5, '#ff4a6a'); P.circ(9, 21, 1.8, '#4aa0ff'); P.circ(23, 21, 1.8, '#4aa0ff'); },
};

/** Canvas 32×32 do item. */
export function icon(id) {
  let c = cache.get(id);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d'), it = ITEMS[id];
  g.lineCap = 'round'; g.lineJoin = 'round';
  const draw = DRAW[it.k];
  if (draw) draw(g, painter(g), it.c, shade(it.c, -60), shade(it.c, 50));
  cache.set(id, c);
  return c;
}

/** Data URL do ícone (para <img> na interface). */
export function iconURL(id) {
  let u = urlCache.get(id);
  if (!u) urlCache.set(id, (u = icon(id).toDataURL()));
  return u;
}
