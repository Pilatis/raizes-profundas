// Animais: surgimento de dia, alimentação, reprodução, filhotes, ovos e persistência.
// O movimento (IA 'graze') fica em enemies.js junto com as demais IAs.
import { G, REACH } from '../core/state.js';
import { emit } from '../core/events.js';
import { rand, pickWeighted } from '../core/util.js';
import { ENEMIES, ANIMAL_SPAWN, ANIMAL_CAP, BREED } from '../data/enemies.js';
import { daylight } from '../world/light.js';
import { spawnDrop, burst } from './entities.js';
import { consumeSelected, selected } from './inventory.js';
import { makeEnemy } from './enemies.js';
import { sfx } from '../audio/index.js';

const SPAWN_INTERVAL = 3;
const VOICE_CHANCE = 0.025;       // por animal, por segundo
const SAVED_FIELDS = ['t', 'x', 'y', 'hp', 'owned', 'baby', 'grow', 'breedCd', 'layT'];
let spawnTimer = 0;

export const isAnimal = e => !!ENEMIES[e.t].passive;

/** Cria um animal já com o estado de vida (filhote, ovos, reprodução). */
export function makeAnimal(t, x, y, extra = {}) {
  const D = ENEMIES[t], e = makeEnemy(t, x, y);
  Object.assign(e, { love: 0, breedCd: 0, owned: false, baby: false, grow: 0, panic: 0, idle: false }, extra);
  if (D.lays && e.layT === undefined) e.layT = rand(...D.lays.every);
  e.r = e.baby ? D.r * BREED.babyScale : D.r;
  return e;
}

// ---------- Surgimento ----------
export function spawnAnimals(dt) {
  if ((spawnTimer -= dt) > 0) return;
  spawnTimer = SPAWN_INTERVAL;
  const w = G.world, p = G.player;
  if (!w.isSurface || daylight() < 0.5) return;
  if (G.enemies.filter(e => isAnimal(e) && !e.owned).length >= ANIMAL_CAP) return;
  for (let k = 0; k < 10; k++) {
    const a = Math.random() * Math.PI * 2, d = rand(14, 22);
    const x = Math.floor(p.x + Math.cos(a) * d), y = Math.floor(p.y + Math.sin(a) * d);
    if (w.wallAt(x, y) || w.liquidAt(x, y) || w.isFarmland(w.idx(x, y))) continue;
    const table = ANIMAL_SPAWN[w.biomeAt(x, y)];
    if (!table || !table.length) continue;
    const t = pickWeighted(table);
    const herd = t === 'rabbit' ? 1 : 1 + (Math.random() * 3 | 0); // vacas/ovelhas/galinhas andam em grupo
    for (let n = 0; n < herd; n++) makeAnimal(t, x + 0.5 + rand(-1, 1), y + 0.5 + rand(-1, 1));
    return;
  }
}

// ---------- Alimentar ----------
/** Clique direito com comida sobre um animal: devolve true se alimentou. */
export function tryFeed(mx, my) {
  const it = selected(), p = G.player;
  if (!it) return false;
  // o mais perto do cursor; entre animais sobrepostos, prefere quem ainda não está pronto para cruzar
  let e = null, best = Infinity;
  for (const o of G.enemies) {
    if (!isAnimal(o) || ENEMIES[o.t].food !== it.id) continue;
    const d = Math.hypot(o.x - mx, o.y - my);
    if (d > o.r + 0.35) continue;
    const score = d + (o.love > 0 ? 10 : 0);
    if (score < best) { best = score; e = o; }
  }
  if (!e || Math.hypot(e.x - p.x, e.y - p.y) > REACH) return false;
  consumeSelected();
  e.owned = true; // animais alimentados ficam (não somem ao se afastar)
  if (e.baby) { e.grow = Math.max(0, e.grow - 20); emit('toast', 'O filhote cresceu um pouco.', 'grow-baby'); }
  else if (e.breedCd > 0) emit('toast', `${ENEMIES[e.t].n} ainda não quer ter outro filhote.`, 'breed');
  else e.love = BREED.love;
  burst(e.x, e.y - 0.3, '#ff7aa8', 6, 1.5);
  sfx.voice(ENEMIES[e.t].voice, e.x, e.y);
  return true;
}

// ---------- Ciclo de vida ----------
function breed(a) {
  const partner = G.enemies.find(b => b !== a && b.t === a.t && b.love > 0 && !b.baby && Math.hypot(a.x - b.x, a.y - b.y) < BREED.radius);
  if (!partner) return;
  a.love = partner.love = 0;
  a.breedCd = partner.breedCd = BREED.cooldown;
  makeAnimal(a.t, (a.x + partner.x) / 2, (a.y + partner.y) / 2, { baby: true, grow: BREED.growUp, owned: true });
  burst((a.x + partner.x) / 2, (a.y + partner.y) / 2, '#ff7aa8', 14, 2.5);
  emit('toast', `Nasceu um filhote de ${ENEMIES[a.t].n.toLowerCase()}!`, null, { type: 'good' });
}

function lifeTick(e, dt) {
  const D = ENEMIES[e.t];
  e.breedCd = Math.max(0, e.breedCd - dt);
  if (e.love > 0) {
    e.love -= dt;
    if (Math.random() < dt * 3) burst(e.x, e.y - e.r * 2, '#ff7aa8', 1, 0.8);
    breed(e);
  }
  if (e.baby && (e.grow -= dt) <= 0) { e.baby = false; e.r = D.r; }
  if (D.lays && !e.baby && (e.layT -= dt) <= 0) { e.layT = rand(...D.lays.every); spawnDrop(e.x, e.y, D.lays.id, 1); }
  if (Math.random() < VOICE_CHANCE * dt * 10) sfx.voice(D.voice, e.x, e.y, e.baby);
}

let lifeTimer = 0;
export function updateAnimals(dt) {
  if ((lifeTimer += dt) < 0.1) return; // vida dos animais não precisa rodar todo frame
  const step = lifeTimer;
  lifeTimer = 0;
  for (const e of G.enemies) if (!e.dead && isAnimal(e)) lifeTick(e, step);
}

// ---------- Persistência ----------
/** Guarda os animais criados/alimentados pelo jogador na camada (ao sair dela ou salvar). */
export function stashCreatures(world) {
  world.creatures = G.enemies.filter(e => isAnimal(e) && e.owned && !e.dead)
    .map(e => Object.fromEntries(SAVED_FIELDS.map(k => [k, e[k]])));
}

export function restoreCreatures(world) {
  for (const c of world.creatures || []) makeAnimal(c.t, c.x, c.y, c);
}
