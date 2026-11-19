// HUD: barra de itens, vida/fome/stamina (parte inferior), informações, chefe, minimapa e mapa grande.
// Só escreve no DOM quando um valor muda.
import { G, UI } from '../core/state.js';
import { SET, keyName } from '../core/settings.js';
import { on } from '../core/events.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { HOTBAR_SIZE } from '../game/inventory.js';
import { isBoss } from '../game/combat.js';
import { clockText } from '../game/simulation.js';
import { villageAt } from '../game/npcs.js';
import { daylight } from '../world/light.js';
import { refreshMapImage, drawMinimap, drawWorldMap } from '../render/minimap.js';
import { $, itemSlot } from './dom.js';

const LOW_HP = 0.3, LOW_FOOD = 20;
const last = {};       // últimos valores escritos no DOM
let nameTimer = 0, mapTimer = 0;

function setOnce(key, value, apply) {
  if (last[key] === value) return;
  last[key] = value;
  apply(value);
}

export function renderHotbar() {
  const p = G.player, bar = $('hotbar');
  bar.replaceChildren();
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const s = itemSlot(p.inv[i], (i + 1) % 10);
    if (i === p.sel) s.classList.add('sel');
    s.onclick = () => selectSlot(i);
    bar.append(s);
  }
}

/** Seleciona um espaço da barra e mostra o nome do item por um instante. */
export function selectSlot(i) {
  const p = G.player;
  p.sel = (i + HOTBAR_SIZE) % HOTBAR_SIZE;
  renderHotbar();
  const it = p.inv[p.sel];
  $('itemName').textContent = it ? ITEMS[it.id].n : '';
  $('itemName').classList.toggle('show', !!it);
  nameTimer = 1.6;
}

function meter(id, value, max, text) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  setOnce(id + 'w', pct.toFixed(1), v => { $(id).querySelector('i').style.width = v + '%'; });
  setOnce(id + 't', text, v => { $(id).querySelector('span').textContent = v; });
}

function updateVitals() {
  const p = G.player;
  meter('hpMeter', p.hp, p.max, `${Math.ceil(p.hp)} / ${p.max}`);
  meter('foodMeter', p.food, 100, `${Math.ceil(p.food)}%`);
  setOnce('hpLow', p.hp < p.max * LOW_HP, v => $('hpMeter').parentElement.classList.toggle('low', v));
  setOnce('foodLow', p.food < LOW_FOOD, v => $('foodMeter').parentElement.classList.toggle('low', v));
  const st = p.stamina / p.maxStamina;
  setOnce('stam', st.toFixed(3), v => { $('stamina').firstElementChild.style.width = v * 100 + '%'; });
  setOnce('stamShow', st < 0.999, v => $('stamina').classList.toggle('show', v));
  setOnce('stamEx', p.exhausted, v => $('stamina').classList.toggle('exhausted', v));
}

function updateInfo() {
  const p = G.player, w = G.world;
  const village = villageAt(p.x, p.y);
  setOnce('biome', village ? `⌂ ${village.name}` : w.biomeNames[w.biomeAt(p.x, p.y)] + (w.isSurface ? '' : ' · Subsolo'), v => { $('biome').textContent = v; });
  const icon = w.isSurface ? (daylight() > 0.35 ? '☀' : '☾') : '⛏';
  setOnce('clock', `${icon} ${clockText()}`, v => { $('clock').textContent = v; });
  const cx = Math.floor(p.x - w.size / 2), cy = Math.floor(p.y - w.size / 2);
  setOnce('coords', SET.coords ? `X ${cx}  Y ${cy}` : '', v => { $('coords').textContent = v; });
  setOnce('armor', p.armor ? `🛡 ${ITEMS[p.armor].def * 100 | 0}%` : '', v => { $('armor').textContent = v; });
}

function updateBoss() {
  const boss = G.enemies.find(isBoss);
  setOnce('bossOn', !!boss, v => $('boss').classList.toggle('show', v));
  if (!boss) return;
  setOnce('bossName', ENEMIES[boss.t].n, v => { $('bossName').textContent = v; });
  setOnce('bossHp', (boss.hp / boss.max).toFixed(3), v => { $('bossBar').style.width = v * 100 + '%'; });
}

export function toggleWorldMap(open = !UI.mapOpen) {
  UI.mapOpen = open;
  $('worldMap').classList.toggle('show', open);
  if (!open) return;
  refreshMapImage(0, true);
  $('mapTitle').textContent = G.world.isSurface ? 'Superfície' : 'Cavernas';
  $('mapHint').textContent = `${keyName(SET.keys.map)} ou Esc para fechar`;
  drawWorldMap($('mapCanvas'));
}

export function updateHud(dt) {
  updateVitals();
  updateInfo();
  updateBoss();
  if ((nameTimer -= dt) <= 0) $('itemName').classList.remove('show');
  refreshMapImage(dt);
  setOnce('mini', SET.minimap, v => { $('minimap').style.display = v ? 'block' : 'none'; });
  if (SET.minimap) drawMinimap($('minimap'));
  if (UI.mapOpen && (mapTimer -= dt) <= 0) { mapTimer = 0.5; drawWorldMap($('mapCanvas')); }
}

/** Esquece os valores em cache (ao iniciar/trocar de mundo). */
export function resetHud() {
  for (const k in last) delete last[k];
}

export function initHud() {
  on('inv', () => { if (G.player) renderHotbar(); });
  on('world', () => { resetHud(); refreshMapImage(0, true); });
  on('travel', to => {
    const f = $('fade');
    f.dataset.text = to === 'cave' ? 'Descendo às profundezas...' : 'Voltando à superfície...';
    f.classList.remove('run', 'pass'); void f.offsetWidth; f.classList.add('pass');
  });
  on('sleep', () => { const f = $('fade'); f.classList.remove('run'); void f.offsetWidth; f.classList.add('run'); });
}
