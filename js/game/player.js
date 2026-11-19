// Jogador: movimento, corrida/stamina, fome, ações (minerar, atacar, colocar, usar) e viagem entre camadas.
import { G, REACH, PLACE_REACH } from '../core/state.js';
import { diff } from '../core/settings.js';
import { emit } from '../core/events.js';
import { actionDown, keys, mouse, mouseWorld } from '../core/input.js';
import { WALLS, WATER, LAVA, OBJECTS } from '../data/world-data.js';
import { ITEMS } from '../data/items.js';
import { INV_SIZE, addItem, has, selected, consumeSelected } from './inventory.js';
import { moveCircle } from './physics.js';
import { place, hammer, pickUp, toggleDoor } from './building.js';
import { spawnDrop, burst } from './entities.js';
import { damageEnemy, shoot, hurtPlayer } from './combat.js';
import { till, water, canPlant, plant, plantHint, harvest } from './farming.js';
import { tryFeed, stashCreatures, restoreCreatures } from './animals.js';
import { useBed } from './simulation.js';
import { npcAt } from './npcs.js';
import { sfx } from '../audio/index.js';

const RADIUS = 0.34;
const WALK_SPEED = 4.6;
const SPRINT_MULT = 1.6;
const STAMINA_DRAIN = 20;     // por segundo correndo (≈5 s de corrida)
const STAMINA_REGEN = 25;
const STAMINA_DELAY = 0.8;    // espera antes de recuperar
const EXHAUST_RESUME = 30;    // exausto até recuperar isto
const HUNGER_RATE = 0.18;     // ≈108 de fome por dia: umas 3 refeições
const HAND = { pow: 0.5, tier: 0 };
const SWING = 0.22;

export function newPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y, face: 0, kx: 0, ky: 0,
    hp: 100, max: 100, food: 100, stamina: 100, maxStamina: 100, exhausted: false, sprinting: false, staminaT: 0,
    armor: null, sel: 0, inv: new Array(INV_SIZE).fill(null),
    swing: 0, useCd: 0, ifr: 0, stepT: 0, moving: false,
  };
}

// ---------- Movimento ----------
function updateMovement(dt) {
  const p = G.player, w = G.world;
  const mx = (actionDown('right') || !!keys.arrowright) - (actionDown('left') || !!keys.arrowleft);
  const my = (actionDown('down') || !!keys.arrowdown) - (actionDown('up') || !!keys.arrowup);
  const fl = w.floorAt(Math.floor(p.x), Math.floor(p.y));
  const fins = has('fin_boots'), core = has('magma_core');
  p.moving = !!(mx || my);

  // corrida e stamina
  p.sprinting = p.moving && actionDown('sprint') && !p.exhausted && p.stamina > 0;
  if (p.sprinting) {
    p.stamina = Math.max(0, p.stamina - STAMINA_DRAIN * dt);
    p.staminaT = STAMINA_DELAY;
    if (p.stamina <= 0) { p.exhausted = true; sfx.exhausted(); }
  } else if ((p.staminaT -= dt) <= 0) {
    p.stamina = Math.min(p.maxStamina, p.stamina + STAMINA_REGEN * dt);
    if (p.exhausted && p.stamina >= EXHAUST_RESUME) p.exhausted = false;
  }

  let sp = WALK_SPEED * (p.food <= 0 ? 0.7 : 1) * (fins ? 1.12 : 1) * (p.sprinting ? SPRINT_MULT : 1);
  if (fl === WATER && !fins) sp *= 0.5;
  if (fl === LAVA) sp *= 0.6;

  const len = Math.hypot(mx, my) || 1;
  p.kx *= Math.exp(-10 * dt); p.ky *= Math.exp(-10 * dt);
  moveCircle(p, ((mx / len) * sp + p.kx) * dt, ((my / len) * sp + p.ky) * dt, RADIUS);
  if (p.moving && !mouse.left) p.face = Math.atan2(my, mx);

  if ((p.stepT -= dt) <= 0 && p.moving) {
    p.stepT = (fl === WATER ? 0.42 : 0.3) / (p.sprinting ? 1.4 : 1);
    sfx.step(G.world.isSurface, fl);
    if (p.sprinting) burst(p.x, p.y + 0.3, fl === WATER ? '#9fd0ff' : '#00000055', 2, 1.2);
  }
  if (fl === LAVA && !core) {
    p.hp -= dt * 16;
    emit('toast', 'Lava! Saia daí — ou aterre com blocos.', 'lava');
    if (Math.random() < dt * 2.5) sfx.sizzle();
    if (p.hp <= 0) hurtPlayer(0);
  }
}

// ---------- Fome e vida ----------
function updateVitals(dt) {
  const p = G.player;
  p.food = Math.max(0, p.food - dt * HUNGER_RATE * diff().hunger * (p.sprinting ? 1.6 : 1));
  if (p.food <= 0) {
    p.hp -= dt * 2;
    emit('toast', 'Você está faminto! Coma algo (clique direito com comida).', 'hunger');
    if (p.hp <= 0) hurtPlayer(0);
  } else if (p.food > 45 && p.hp < p.max) {
    p.hp = Math.min(p.max, p.hp + dt * 1.2);
    p.food -= dt * 0.08;
  }
}

// ---------- Ações ----------
function mine(tx, ty, tool) {
  const w = G.world, p = G.player, i = w.idx(tx, ty), wl = w.wall[i], d = WALLS[wl];
  p.swing = 0.2;
  p.face = Math.atan2(ty + 0.5 - p.y, tx + 0.5 - p.x);
  if (tool.tier < d.tier) {
    emit('toast', d.tier >= 99 ? 'Isso é indestrutível.' : `${d.n}: precisa de uma picareta melhor.`, 'tier');
    burst(tx + 0.5, ty + 0.5, '#888', 2, 1);
    sfx.fail();
    return;
  }
  w.wdmg[i] = (w.wdmg[i] || 0) + tool.pow;
  const broke = w.wdmg[i] >= d.hp;
  sfx.mine(d.mat, broke);
  burst(tx + 0.5, ty + 0.8, d.ore || d.top, 4, 2.5);
  if (!broke) return;
  w.wall[i] = 0;
  delete w.wdmg[i];
  burst(tx + 0.5, ty + 0.5, d.prop ? d.leaf || d.top : d.top, 10, 4);
  if (d.drop) {
    const [a, b] = d.dropN || [1, 1];
    spawnDrop(tx + 0.5, ty + 0.5, d.drop, a + Math.floor(Math.random() * (b - a + 1)));
  }
  if (d.extra && Math.random() < 0.35) spawnDrop(tx + 0.5, ty + 0.5, d.extra, 1);
}

function attack(dmg, range) {
  const p = G.player, m = mouseWorld(), a = Math.atan2(m.y - p.y, m.x - p.x);
  p.swing = SWING; p.face = a;
  sfx.swing(dmg >= 4);
  let hit = null;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
    if (d > range + e.r) continue;
    let da = Math.abs(Math.atan2(dy, dx) - a);
    if (da > Math.PI) da = Math.PI * 2 - da;
    if (da > 1.25 && d > e.r + 0.3) continue;
    hit = e;
    damageEnemy(e, dmg, dx, dy);
  }
  if (hit) sfx.hit(hit.x, hit.y);
}

function fire(def) {
  const p = G.player, m = mouseWorld(), a = Math.atan2(m.y - p.y, m.x - p.x);
  p.face = a; p.swing = 0.15;
  shoot(p.x + Math.cos(a) * 0.5, p.y + Math.sin(a) * 0.5, a, def.pspd, def.dmg, def.pcol, 'player', 0.2, 1.3);
  sfx.zap();
}

function interact(tx, ty) {
  const w = G.world, i = w.idx(tx, ty), o = w.objs[i], cx = tx + 0.5, cy = ty + 0.5;
  G.player.swing = 0.2;
  switch (o.t) {
    case 'cave_door': travel('cave'); return;
    case 'cave_exit': travel('surface'); return;
    case 'chest': sfx.chestOpen(); emit('chest', i); return;
    case 'shroom':
      sfx.pluck(); delete w.objs[i];
      spawnDrop(cx, cy, 'mushroom', 1);
      if (Math.random() < 0.4) spawnDrop(cx, cy, 'seed', 1);
      return;
    case 'bush':
      if (o.g < 1) { emit('toast', 'Ainda sem frutos...', 'grow'); return; }
      sfx.pluck(); o.g = 0;
      spawnDrop(cx, cy, 'berries', 2 + (Math.random() < 0.5));
      return;
    default:
      if (harvest(o, i, cx, cy)) return;
  }
  const def = OBJECTS[o.t];
  if (!def || def.noPickup) return;
  const it = selected(), tool = it && ['pick', 'hammer'].includes(ITEMS[it.id].k);
  if (def.use && !tool) { // objetos com ação: com ferramenta na mão, recolhe
    if (o.t === 'bed') useBed(tx, ty);
    else if (o.t === 'door') toggleDoor(o, tx, ty);
    return;
  }
  pickUp(i, cx, cy);
}

function useLeft() {
  const p = G.player, w = G.world, it = selected(), def = it ? ITEMS[it.id] : null;
  const m = mouseWorld(), tx = Math.floor(m.x), ty = Math.floor(m.y);
  const inReach = w.inb(tx, ty) && Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) <= REACH;
  const i = w.inb(tx, ty) ? w.idx(tx, ty) : -1;
  const npc = npcAt(m.x, m.y);
  if (npc) { emit('npc', npc); p.useCd = 0.4; mouse.left = false; return; } // moradores não são atacados
  if (def && def.k === 'sword') { attack(def.dmg, 1.8); p.useCd = 0.36; }
  else if (def && def.k === 'staff') { fire(def); p.useCd = def.rate; }
  else if (inReach && def && def.k === 'hammer' && hammer(tx, ty)) { p.swing = 0.2; p.useCd = 0.22; }
  else if (inReach && w.wall[i]) { mine(tx, ty, def && def.k === 'pick' ? def : HAND); p.useCd = 0.25; }
  else if (inReach && w.objs[i]) { interact(tx, ty); p.useCd = 0.3; }
  else if (inReach && def && def.k === 'hoe') { if (till(tx, ty)) p.swing = 0.2; p.useCd = 0.3; }
  else { attack(def && def.k === 'pick' ? 1 : 0.5, 1.4); p.useCd = 0.38; }
}

/** Clique direito: alimentar animal, plantar, regar, comer, vestir, usar ou colocar. */
export function useRight() {
  const p = G.player, w = G.world, it = selected();
  if (!it) return;
  const def = ITEMS[it.id], m = mouseWorld(), tx = Math.floor(m.x), ty = Math.floor(m.y);
  if (tryFeed(m.x, m.y)) return;
  const i = w.inb(tx, ty) ? w.idx(tx, ty) : -1;
  const near = i >= 0 && Math.hypot(tx + 0.5 - p.x, ty + 0.5 - p.y) <= PLACE_REACH;
  if (def.crop && near && canPlant(def, i)) return plant(def, i);
  if (def.k === 'can') { if (near) water(tx, ty); return; }
  if (def.food) return eat(def);
  if (def.k === 'armor') return equip(it.id);
  if (def.k === 'amulet') return useAmulet(def);
  if (!def.place || i < 0) return;
  if (def.crop && near && !w.wall[i] && !w.objs[i]) { emit('toast', plantHint(def), 'plant'); return; }
  place(def, tx, ty);
}

function eat(def) {
  const p = G.player;
  if (p.food >= 100 && p.hp >= p.max) { emit('toast', 'Você está satisfeito.', 'full'); return; }
  p.food = Math.min(100, p.food + def.food);
  p.hp = Math.min(p.max, p.hp + (def.heal || 0));
  consumeSelected();
  burst(p.x, p.y, def.c, 6, 2);
  sfx.eat();
}

function equip(id) {
  const p = G.player, old = p.armor;
  p.armor = id;
  consumeSelected();
  sfx.equip();
  if (old && addItem(old)) spawnDrop(p.x, p.y, old, 1);
  emit('toast', 'Vestiu: ' + ITEMS[id].n);
}

function useAmulet(def) {
  const p = G.player;
  if (p.max >= 200) { emit('toast', 'Sua vida já está no máximo.', 'maxhp'); return; }
  p.max += 25; p.hp += 25;
  consumeSelected();
  sfx.magic();
  burst(p.x, p.y, def.c, 12, 3);
  emit('toast', 'Vida máxima: ' + p.max);
}

// ---------- Camadas ----------
/** Desce/sobe entre superfície e caverna pela porta. */
export function travel(to) {
  const p = G.player, from = G.world, dest = G.worlds[to];
  from.drops = G.drops;
  stashCreatures(from);
  G.enemies = []; G.projs = [];
  G.world = dest;
  G.drops = dest.drops;
  restoreCreatures(dest);
  const arrive = to === 'surface' ? { x: dest.door.x + 0.5, y: dest.door.y + 1.5 } : dest.spawn;
  p.x = arrive.x; p.y = arrive.y;
  G.cam.x = p.x; G.cam.y = p.y;
  sfx.travel(to);
  emit('travel', to);
  emit('world');
  emit('toast', to === 'cave' ? 'Você desceu às profundezas...' : 'Você voltou à superfície.');
}

export function updatePlayer(dt) {
  const p = G.player;
  updateMovement(dt);
  updateVitals(dt);
  p.useCd -= dt;
  p.swing = Math.max(0, p.swing - dt);
  p.ifr = Math.max(0, p.ifr - dt);
  if (mouse.left && p.useCd <= 0) useLeft();
}
