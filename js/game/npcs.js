// Moradores das vilas: rotina (passear de dia, voltar para casa à noite), portas,
// comércio com estoque diário e pedidos com recompensa.
import { G, REACH } from '../core/state.js';
import { emit } from '../core/events.js';
import { rand } from '../core/util.js';
import { PROFESSIONS, COIN, VILLAGE_RADIUS } from '../data/npcs.js';
import { ITEMS } from '../data/items.js';
import { daylight } from '../world/light.js';
import { moveCircle } from './physics.js';
import { addItem, count, take } from './inventory.js';
import { spawnDrop, burst } from './entities.js';
import { sfx } from '../audio/index.js';

const RADIUS = 0.32;
const SPEED = 1.7;
const ARRIVE = 0.35;
const STUCK_TIME = 2.5;
const GREET_RANGE = 2.2;
const DOOR_RANGE = 1.1;
const WANDER_RADIUS = VILLAGE_RADIUS - 3;

export const profOf = npc => PROFESSIONS[npc.prof];
export const isNightTime = () => daylight() < 0.3;

function insideHouse(npc) {
  const r = npc.home.rect;
  return npc.x > r.x && npc.x < r.x + r.size && npc.y > r.y && npc.y < r.y + r.size;
}

const doorCenter = npc => ({ x: npc.home.door.x + 0.5, y: npc.home.door.y + 0.5 });

/** Monta o caminho até o objetivo do momento (casa à noite, praça de dia). */
function plan(npc) {
  const w = G.world, inside = insideHouse(npc);
  if (isNightTime()) {
    npc.path = inside ? [npc.home.bed] : [npc.home.outside, doorCenter(npc), npc.home.bed];
    npc.goal = 'home';
    return;
  }
  const v = w.villages[npc.village];
  let target = null;
  for (let k = 0; k < 12 && !target; k++) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * WANDER_RADIUS;
    const x = Math.floor(v.x + Math.cos(a) * d), y = Math.floor(v.y + Math.sin(a) * d);
    if (!w.solidAt(x, y) && !w.objs[w.idx(x, y)]) target = { x: x + 0.5, y: y + 0.5 };
  }
  npc.path = inside ? [doorCenter(npc), npc.home.outside] : [];
  if (target) npc.path.push(target);
  npc.goal = 'wander';
}

/** Abre a porta da casa quando o morador chega perto e fecha depois que ele passa. */
function handleDoor(npc) {
  const w = G.world, d = npc.home.door, o = w.objs[w.idx(d.x, d.y)];
  if (!o || o.t !== 'door') return;
  const near = Math.hypot(npc.x - d.x - 0.5, npc.y - d.y - 0.5) < DOOR_RANGE;
  if (near && !o.open) { o.open = true; npc.openedDoor = true; sfx.door(true); }
  else if (!near && npc.openedDoor) {
    const p = G.player;
    if (Math.hypot(p.x - d.x - 0.5, p.y - d.y - 0.5) > 1) { o.open = false; sfx.door(false); }
    npc.openedDoor = false;
  }
}

function step(npc, dt) {
  const p = G.player;
  npc.vx = 0; npc.vy = 0;
  if (npc.talking || (!isNightTime() && Math.hypot(p.x - npc.x, p.y - npc.y) < GREET_RANGE)) {
    npc.face = Math.atan2(p.y - npc.y, p.x - npc.x); // para e olha para o jogador
    return;
  }
  const night = isNightTime();
  if (!npc.path || !npc.path.length || (npc.goal === 'wander') === night) {
    if ((npc.idleT = (npc.idleT || 0) - dt) > 0 && !night) return;
    plan(npc);
    npc.idleT = rand(1.5, 5);
    npc.stuckT = 0;
  }
  const t = npc.path[0];
  if (!t) return;
  const dx = t.x - npc.x, dy = t.y - npc.y, d = Math.hypot(dx, dy);
  if (d < ARRIVE) { npc.path.shift(); npc.stuckT = 0; return; }
  npc.vx = (dx / d) * SPEED; npc.vy = (dy / d) * SPEED;
  npc.face = Math.atan2(dy, dx);
  const bx = npc.x, by = npc.y;
  moveCircle(npc, npc.vx * dt, npc.vy * dt, RADIUS, true);
  const moved = Math.hypot(npc.x - bx, npc.y - by);
  npc.stuckT = moved < SPEED * dt * 0.3 ? (npc.stuckT || 0) + dt : 0;
  if (npc.stuckT > STUCK_TIME) { npc.path = []; npc.stuckT = 0; } // preso: escolhe outro destino
}

export function updateNpcs(dt) {
  if (!G.world.isSurface) return;
  for (const npc of G.world.npcs) {
    step(npc, dt);
    handleDoor(npc);
  }
}

/** Morador sob o cursor e ao alcance (para conversar). */
export function npcAt(mx, my) {
  if (!G.world.isSurface) return null;
  const p = G.player;
  return G.world.npcs.find(n => Math.hypot(n.x - mx, n.y - my) < 0.55 && Math.hypot(n.x - p.x, n.y - p.y) <= REACH + 0.5) || null;
}

export function villageAt(x, y) {
  return G.world.isSurface ? G.world.villages.find(v => Math.hypot(v.x - x, v.y - y) < VILLAGE_RADIUS + 2) || null : null;
}

// ---------- Falas ----------
export const greeting = npc => pick(profOf(npc).greet);
export const chatLine = npc => pick(profOf(npc).talk);
const pick = list => list[(Math.random() * list.length) | 0];

// ---------- Comércio ----------
function refreshStock(npc) {
  if (npc.stockDay === G.day) return;
  npc.stockDay = G.day;
  npc.stock = {};
}

export function offers(npc) {
  refreshStock(npc);
  return profOf(npc).offers.map((o, k) => ({ ...o, k, left: o.stock - (npc.stock[k] || 0) }));
}

/** Executa uma troca; devolve a mensagem de erro ou null se deu certo. */
export function trade(npc, k) {
  refreshStock(npc);
  const o = profOf(npc).offers[k], used = npc.stock[k] || 0;
  if (used >= o.stock) return 'Acabou por hoje. Volte amanhã!';
  if (o.buy) {
    if (count(COIN) < o.price) return 'Moedas insuficientes.';
    take(COIN, o.price);
    if (addItem(o.buy, o.n)) spawnDrop(G.player.x, G.player.y, o.buy, o.n);
  } else {
    if (count(o.sell) < o.n) return `Você precisa de ${o.n}× ${ITEMS[o.sell].n}.`;
    take(o.sell, o.n);
    if (addItem(COIN, o.price)) spawnDrop(G.player.x, G.player.y, COIN, o.price);
  }
  npc.stock[k] = used + 1;
  sfx.coin();
  return null;
}

// ---------- Pedidos ----------
/** Pedido atual (um por dia, em sequência), ou null se já entregou hoje / acabou a lista. */
export function currentQuest(npc) {
  const list = profOf(npc).quests;
  if (npc.quest >= list.length || (npc.questDay || 0) > G.day) return null;
  return list[npc.quest];
}

export const questReady = q => Object.entries(q.want).every(([id, n]) => count(id) >= n);

export function deliverQuest(npc) {
  const q = currentQuest(npc);
  if (!q || !questReady(q)) return false;
  for (const [id, n] of Object.entries(q.want)) take(id, n);
  for (const [id, n] of Object.entries(q.reward)) if (addItem(id, n)) spawnDrop(G.player.x, G.player.y, id, n);
  npc.quest++;
  npc.questDay = G.day + 1; // o próximo pedido aparece amanhã
  burst(npc.x, npc.y - 0.6, '#ffd24a', 14, 2.5);
  sfx.questDone();
  emit('toast', `${npc.name} agradece! Pedido concluído.`, null, { type: 'good', icon: 'coin' });
  return true;
}
