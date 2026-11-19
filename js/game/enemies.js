// Inimigos: surgimento, comportamentos (IA) e despertar dos guardiões.
import { G } from '../core/state.js';
import { SET, diff } from '../core/settings.js';
import { emit } from '../core/events.js';
import { rand, pickWeighted } from '../core/util.js';
import { ENEMIES, SPAWN, BOSS_ARENA_RADIUS, BOSS_LEASH } from '../data/enemies.js';
import { lightAt, daylight } from '../world/light.js';
import { moveCircle } from './physics.js';
import { burst } from './entities.js';
import { isBoss, shoot, ring, hurtPlayer } from './combat.js';
import { selected } from './inventory.js';
import { sfx } from '../audio/index.js';

const AGGRO = 12;
const DESPAWN = 34;
const SPAWN_INTERVAL = 1.8;
const MAX_ENEMIES = 16;
const CONTACT = 0.34;
const LURE_RANGE = 7;     // animais seguem quem segura a comida deles
const FLEE_RANGE = 4;     // animais ariscos fogem de perto
let spawnTimer = 0;

export function makeEnemy(t, x, y) {
  const D = ENEMIES[t], hp = Math.round(D.hp * (D.passive ? 1 : diff().hp));
  const e = {
    t, x, y, hp, max: hp, r: D.r, vx: 0, vy: 0, face: 0, flash: 0, air: 0,
    hop: rand(0.3, 1.2), cd: rand(1, 2.5), st: 'walk', stT: rand(1, 3), spawnT: 0,
    ph: Math.random() * 7, wa: Math.random() * 7, dir: 1, trail: [], da: 0, home: null,
  };
  G.enemies.push(e);
  return e;
}

// ---------- Surgimento ----------
export function spawnEnemies(dt) {
  if ((spawnTimer -= dt) > 0) return;
  spawnTimer = SPAWN_INTERVAL;
  const w = G.world, p = G.player;
  if (w.isSurface && daylight() > 0.35) return; // a superfície é segura de dia
  const cap = w.isSurface ? 8 : 6 + w.bosses.filter(b => !b.done).length;
  if (G.enemies.filter(e => !isBoss(e) && !ENEMIES[e.t].passive).length >= cap) return;
  for (let k = 0; k < 12; k++) {
    const a = Math.random() * Math.PI * 2, d = rand(11, 18);
    const x = Math.floor(p.x + Math.cos(a) * d), y = Math.floor(p.y + Math.sin(a) * d);
    if (w.wallAt(x, y) || w.liquidAt(x, y) || w.isBuiltFloor(w.idx(x, y)) || lightAt(x, y) > 1.5) continue;
    if (Math.hypot(x - w.spawn.x, y - w.spawn.y) < 9) continue;
    makeEnemy(pickWeighted(SPAWN[w.kind][w.biomeAt(x, y)]), x + 0.5, y + 0.5);
    return;
  }
}

function awakenBosses() {
  const p = G.player;
  for (const b of G.world.bosses) {
    if (b.done || G.enemies.some(e => e.home === b) || Math.hypot(p.x - b.x, p.y - b.y) >= BOSS_ARENA_RADIUS) continue;
    const e = makeEnemy(b.t, b.x, b.y);
    Object.assign(e, { home: b, spawnT: 4, cd: 2, stT: 5 });
    emit('toast', `${ENEMIES[b.t].n} despertou!`, null, { type: 'boss' });
    sfx.roar();
    if (SET.shake) G.shake = 0.5;
  }
}

// ---------- Comportamentos ----------
function steer(e, a, sp, k, dt) {
  const t = Math.min(1, dt * k);
  e.vx += (Math.cos(a) * sp - e.vx) * t;
  e.vy += (Math.sin(a) * sp - e.vy) * t;
}

function wander(e, D, dt, ang, aggro, k = 6) {
  if (e.stT <= 0) { e.stT = rand(1.5, 3); e.wa = Math.random() * 7; }
  steer(e, aggro ? ang : e.wa, D.spd * (aggro ? 1 : 0.4), k, dt);
}

function endDash(e) {
  e.st = 'walk'; e.vx *= 0.2; e.vy *= 0.2;
  if (e.t !== 'boss_eel') { e.cd = ENEMIES[e.t].cool || 2.5; return; }
  const rage = e.hp < e.max / 2;
  e.cd = rage ? 1.6 : 2.6;
  if (!rage) return;
  const a = Math.atan2(G.player.y - e.y, G.player.x - e.x);
  for (const o of [-0.3, 0, 0.3]) shoot(e.x, e.y, a + o, 8, 18, '#6ad0ff', 'enemy');
  sfx.shoot('water', e.x, e.y);
}

/** Estados compartilhados de investida: wind (prepara) -> dash (avança). */
function dashStates(e, D) {
  if (e.st === 'wind') {
    e.vx *= 0.8; e.vy *= 0.8;
    if (e.stT <= 0) {
      e.st = 'dash'; e.stT = isBoss(e) ? 0.6 : 0.45;
      e.vx = Math.cos(e.da) * D.dash; e.vy = Math.sin(e.da) * D.dash;
      sfx.dash(e.x, e.y);
    }
    return true;
  }
  if (e.st === 'dash') { if (e.stT <= 0) endDash(e); return true; }
  return false;
}

function windUp(e, ang, time) { e.st = 'wind'; e.stT = time; e.da = ang; sfx.windup(e.x, e.y); }

const AI = {
  hop(e, D, dt, ang, d, aggro) {
    if ((e.hop -= dt) <= 0) {
      const a = aggro ? ang + rand(-0.3, 0.3) : Math.random() * Math.PI * 2, sp = D.spd * (aggro ? 1 : 0.4);
      e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp; e.air = 0.32;
      e.hop = isBoss(e) ? rand(1, 1.6) : rand(0.7, 1.4);
      if (isBoss(e)) sfx.hop(e.x, e.y, true); else if (aggro && Math.random() < 0.6) sfx.hop(e.x, e.y, false, D.shape);
    }
    if (D.minion && (e.spawnT -= dt) <= 0) {
      e.spawnT = 6;
      if (G.enemies.length < 14) for (let k = 0; k < 2; k++) makeEnemy(D.minion[e.hp < e.max / 2 ? 1 : 0], e.x + rand(-1, 1), e.y + rand(-1, 1));
    }
  },
  fly(e, D, dt, ang, d, aggro) {
    steer(e, aggro ? ang + Math.sin(e.ph * 5) * 0.9 : e.ph * 0.7, D.spd * (aggro ? 1 : 0.4), 4, dt);
    if (aggro && Math.random() < dt * 1.5) sfx.flap(e.x, e.y);
  },
  ghost(e, D, dt, ang, d, aggro) {
    const sp = aggro ? D.spd : D.spd * 0.3, a = ang + Math.sin(e.ph * 2) * 0.5;
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
  },
  walk(e, D, dt, ang, d, aggro) { wander(e, D, dt, ang, aggro); },
  graze(e, D, dt, ang, d) {
    const held = selected(), lured = held && held.id === D.food && d < LURE_RANGE;
    if (e.panic > 0) { e.panic -= dt; steer(e, ang + Math.PI + Math.sin(e.ph * 3) * 0.6, D.spd * 2.2, 6, dt); return; }
    if (D.skittish && !lured && d < FLEE_RANGE) { steer(e, ang + Math.PI, D.spd * 1.8, 6, dt); return; }
    if (lured) { steer(e, ang, d > 1.6 ? D.spd * 1.3 : 0, 4, dt); return; }
    if (e.stT <= 0) { e.stT = rand(1.5, 4); e.idle = Math.random() < 0.45; e.wa = Math.random() * 7; } // pasta e passeia
    steer(e, e.wa, e.idle ? 0 : D.spd * 0.6 * (e.baby ? 1.3 : 1), 4, dt);
  },
  charge(e, D, dt, ang, d, aggro) {
    if (dashStates(e, D)) return;
    wander(e, D, dt, ang, aggro);
    if (aggro && d < 6 && e.cd <= 0) windUp(e, ang, 0.6);
  },
  shooter(e, D, dt, ang, d, aggro) {
    if (D.spd) {
      if (!aggro) wander(e, D, dt, ang, false, 5);
      else if (d < 4) steer(e, ang + Math.PI, D.spd, 5, dt);     // mantém distância
      else if (d > 7) steer(e, ang, D.spd, 5, dt);
      else steer(e, 0, 0, 5, dt);
    } else { e.vx *= 0.8; e.vy *= 0.8; }
    if (aggro && d < 10 && e.cd <= 0) {
      e.cd = D.rate * rand(0.85, 1.15); e.air = 0.25;
      shoot(e.x, e.y, ang + rand(-0.08, 0.08), D.pspd, D.pdmg, D.pcol, 'enemy');
      sfx.shoot(D.snd, e.x, e.y);
    }
  },
  b_fungus(e, D, dt, ang) {
    const rage = e.hp < e.max / 2;
    steer(e, ang, D.spd * (rage ? 1.4 : 1), 3, dt);
    if (e.cd <= 0) { e.cd = rage ? 2.2 : 3.2; e.air = 0.4; ring(e, rage ? 14 : 10, 5, 16, '#d8a0ff', e.ph); sfx.shoot('spore', e.x, e.y); }
    if (e.stT <= 0) { e.stT = 7; if (G.enemies.length < MAX_ENEMIES) for (let k = 0; k < 2; k++) makeEnemy('spore', e.x + rand(-1.5, 1.5), e.y + rand(-1.5, 1.5)); }
  },
  b_eel(e, D, dt, ang, d) {
    if (dashStates(e, D)) return;
    const tang = ang + (Math.PI / 2) * e.dir, pull = (d - 5) * 0.7, t = Math.min(1, dt * 4); // nada em círculos
    e.vx += (Math.cos(tang) * D.spd + Math.cos(ang) * pull - e.vx) * t;
    e.vy += (Math.sin(tang) * D.spd + Math.sin(ang) * pull - e.vy) * t;
    if (e.cd <= 0) { e.dir = Math.random() < 0.5 ? 1 : -1; windUp(e, ang, 0.7); }
  },
  b_crystal(e, D, dt, ang) {
    const rage = e.hp < e.max / 2;
    steer(e, ang, D.spd, 2, dt);
    if (e.cd <= 0) {
      e.cd = rage ? 1.5 : 2.2;
      for (const o of rage ? [-0.4, -0.2, 0, 0.2, 0.4] : [-0.25, 0, 0.25]) shoot(e.x, e.y, ang + o, 9, 20, '#9ff8ff', 'enemy');
      sfx.shoot('shard', e.x, e.y);
    }
    if (e.stT <= 0) {
      e.stT = 9; e.air = 0.5; ring(e, 16, 6, 18, '#c9fbff', e.ph); sfx.nova(e.x, e.y, false);
      if (rage && G.enemies.length < MAX_ENEMIES) makeEnemy('wisp', e.x + 1, e.y);
    }
  },
  b_magma(e, D, dt, ang) {
    const rage = e.hp < e.max * 0.4, h = e.home || e, p = G.player;
    let tx = p.x, ty = p.y;
    const hd = Math.hypot(tx - h.x, ty - h.y);
    if (hd > 5) { tx = h.x + ((tx - h.x) / hd) * 5; ty = h.y + ((ty - h.y) / hd) * 5; } // fica perto do covil
    steer(e, Math.atan2(ty - e.y, tx - e.x), Math.hypot(tx - e.x, ty - e.y) > 0.5 ? D.spd : 0, 3, dt);
    if (e.cd <= 0) { e.cd = rage ? 0.9 : 1.6; shoot(e.x, e.y, ang + rand(-0.1, 0.1), 8, 26, '#ffb040', 'enemy', 0.32, 4); sfx.shoot('fire', e.x, e.y); }
    if (e.stT <= 0) {
      e.stT = rage ? 4.5 : 6.5; e.air = 0.5;
      ring(e, rage ? 24 : 18, 4.5, 22, '#ff6a2a', e.ph); sfx.nova(e.x, e.y, true);
      if (SET.shake) G.shake = 0.35;
      if (rage && G.enemies.length < MAX_ENEMIES) makeEnemy('salamander', e.x + rand(-2, 2), e.y + rand(-2, 2));
    }
  },
};

function updateOne(e, dt) {
  const D = ENEMIES[e.t], p = G.player, w = G.world;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 0.01, ang = Math.atan2(dy, dx);
  const aggro = isBoss(e) || d < AGGRO;
  e.air = Math.max(0, e.air - dt); e.flash = Math.max(0, e.flash - dt);
  e.cd -= dt; e.stT -= dt; e.ph += dt;

  AI[D.ai](e, D, dt, ang, d, aggro);

  if (Math.abs(e.vx) + Math.abs(e.vy) > 0.3) e.face = Math.atan2(e.vy, e.vx);
  if (D.ai === 'ghost') { e.x += e.vx * dt; e.y += e.vy * dt; }
  else if (moveCircle(e, e.vx * dt, e.vy * dt, e.r) && e.st === 'dash') {
    endDash(e);
    burst(e.x, e.y, '#bbb', 8, 3);
    if (isBoss(e) && SET.shake) G.shake = 0.3;
  }
  if (D.ai === 'hop') { const f = Math.exp(-5 * dt); e.vx *= f; e.vy *= f; }
  if (D.seg) {
    const t = e.trail;
    if (!t.length || Math.hypot(t[0].x - e.x, t[0].y - e.y) > e.r * 0.5) { t.unshift({ x: e.x, y: e.y }); if (t.length > D.seg * 2) t.pop(); }
  }
  if (D.dmg && d < e.r + CONTACT && p.ifr <= 0) hurtPlayer(D.dmg * diff().dmg, (dx / d) * 9, (dy / d) * 9);

  if (d > DESPAWN && !isBoss(e) && !e.owned) e.dead = true;
  if (D.nocturnal && w.isSurface && daylight() > 0.55) { e.dead = true; burst(e.x, e.y, '#888', 10, 2); } // some ao amanhecer
  if (e.home && Math.hypot(p.x - e.home.x, p.y - e.home.y) > BOSS_LEASH) {
    e.dead = true;
    G.projs = G.projs.filter(q => q.from !== 'enemy');
    emit('toast', `${D.n} voltou para as sombras...`);
  }
}

export function updateEnemies(dt) {
  for (const e of G.enemies) if (!e.dead) updateOne(e, dt);
  G.enemies = G.enemies.filter(e => !e.dead);
  awakenBosses();
}
