// Painel de inventário + criação, ou inventário + baú. Reconstruído por evento, nunca por frame.
import { G, UI } from '../core/state.js';
import { on, emit } from '../core/events.js';
import { clearInput } from '../core/input.js';
import { ITEMS, RECIPES, CATEGORIES, STATIONS } from '../data/items.js';
import {
  HOTBAR_SIZE, count, transfer, swapSlots, nearbyStations, canCraft, craft,
  categoryOf, sourcesOf, addItem,
} from '../game/inventory.js';
import { spawnDrop } from '../game/entities.js';
import { iconURL } from '../render/icons.js';
import { sfx } from '../audio/index.js';
import { $, el, itemSlot } from './dom.js';

let stationKey = '';

const openChest = () => (UI.openChest !== null ? G.world.objs[UI.openChest] : null);

export function togglePanel(open = !UI.panelOpen, chestIndex = null) {
  const was = UI.panelOpen, wasChest = UI.openChest !== null;
  UI.panelOpen = open;
  UI.openChest = open ? chestIndex : null;
  UI.picked = -1;
  clearInput();
  if (was && !open) { if (wasChest) sfx.chestClose(); else sfx.uiOpen(); }
  else if (!was && open && chestIndex === null) sfx.uiOpen();
  $('panel').classList.toggle('show', open);
  renderPanel();
}

function renderInventory(chest) {
  const p = G.player, grid = $('inv');
  grid.replaceChildren();
  p.inv.forEach((it, i) => {
    const s = itemSlot(it, i < HOTBAR_SIZE ? (i + 1) % 10 : '');
    if (i === UI.picked) s.classList.add('pick');
    if (i === p.sel) s.classList.add('sel');
    s.onclick = () => {
      if (chest) return transfer(p.inv, i, chest.inv);
      if (UI.picked < 0) { if (p.inv[i]) { UI.picked = i; renderPanel(); } return; }
      const a = UI.picked; UI.picked = -1;
      swapSlots(a, i);
    };
    s.oncontextmenu = e => {
      e.preventDefault();
      if (!p.inv[i]) return;
      spawnDrop(p.x + Math.cos(p.face) * 1.2, p.y + Math.sin(p.face) * 1.2, p.inv[i].id, 1, true);
      if (--p.inv[i].n <= 0) p.inv[i] = null;
      emit('inv');
    };
    grid.append(s);
  });
}

function renderChest(chest) {
  const grid = $('chestInv');
  grid.replaceChildren();
  chest.inv.forEach((it, i) => {
    const s = itemSlot(it);
    s.onclick = () => transfer(chest.inv, i, G.player.inv);
    grid.append(s);
  });
  const empty = chest.inv.every(x => !x), btn = $('chestTake');
  btn.disabled = !empty;
  btn.title = empty ? '' : 'Esvazie o baú primeiro';
  btn.onclick = () => {
    if (!chest.inv.every(x => !x)) return;
    delete G.world.objs[UI.openChest];
    togglePanel(false);
    if (addItem('chest')) spawnDrop(G.player.x, G.player.y, 'chest', 1);
  };
}

function ingredientHtml(k, need) {
  const have = count(k), ok = have >= need;
  const tip = ok ? '' : ` data-tip="Como obter: ${sourcesOf(k).join(' • ').replace(/"/g, '')}"`;
  return `<span class="${ok ? '' : 'miss'}"${tip}>${ITEMS[k].n} ${have}/${need}</span>`;
}

export function renderCraft() {
  const near = nearbyStations(), tabs = $('craftTabs'), list = $('craft'), scroll = list.scrollTop;
  stationKey = JSON.stringify(near);
  tabs.replaceChildren(...[[-2, 'Disponíveis'], [-1, 'Todos'], ...CATEGORIES.map((c, i) => [i, c])].map(([i, n]) =>
    el('span', { class: 'tab' + (UI.craftCat === i ? ' on' : ''), text: n, onclick: () => { UI.craftCat = i; renderCraft(); } })));
  list.replaceChildren();
  for (const r of RECIPES) {
    if (UI.craftCat >= 0 && categoryOf(r.o) !== UI.craftCat) continue;
    const ok = canCraft(r, near);
    if (UI.craftCat === -2 && !ok) continue;
    let ing = Object.entries(r.i).map(([k, n]) => ingredientHtml(k, n)).join(' · ');
    if (r.s) ing += `<br><span class="${near[r.s] ? '' : 'miss'}">Perto de: ${STATIONS[r.s]}</span>`;
    const row = el('div', { class: 'rc' + (ok ? '' : ' no'),
      html: `<img src="${iconURL(r.o)}" alt="" data-item="${r.o}"><div><div>${ITEMS[r.o].n}${r.n ? ' ×' + r.n : ''}</div><div class="ing">${ing}</div></div>` });
    row.onclick = e => {
      const [made, overflow] = craft(r, e.shiftKey ? 5 : 1, near);
      if (!made) return;
      if (overflow) spawnDrop(G.player.x, G.player.y, r.o, overflow, true);
      sfx.craft();
      const total = made * (r.n || 1);
      emit('toast', `Criado: ${ITEMS[r.o].n}${total > 1 ? ' ×' + total : ''}`, null, { type: 'good', icon: r.o });
    };
    list.append(row);
  }
  if (!list.children.length) list.append(el('div', { class: 'empty', text: 'Nada para criar aqui ainda. Junte materiais ou chegue perto de uma estação.' }));
  list.scrollTop = scroll;
}

export function renderPanel() {
  if (!UI.panelOpen || !G.player) return;
  const chest = openChest();
  $('invHint').textContent = chest
    ? 'Clique em um item para guardá-lo no baú; clique no baú para pegar de volta.'
    : 'Clique em dois espaços para trocar itens de lugar. Clique direito descarta 1.';
  $('craftCol').hidden = !!chest;
  $('chestCol').hidden = !chest;
  renderInventory(chest);
  if (chest) renderChest(chest); else renderCraft();
}

/** Chamado periodicamente: redesenha a criação só se as estações próximas mudaram. */
export function refreshStations() {
  if (!UI.panelOpen || UI.openChest !== null) return;
  if (JSON.stringify(nearbyStations()) !== stationKey) renderCraft();
}

/** Fecha o baú se o jogador se afastou ou ele sumiu. */
export function checkChestDistance(maxDist) {
  if (UI.openChest === null) return;
  const w = G.world, i = UI.openChest, x = i % w.size, y = (i / w.size) | 0;
  if (!w.objs[i] || Math.hypot(x + 0.5 - G.player.x, y + 0.5 - G.player.y) > maxDist) togglePanel(false);
}

export function initPanel() {
  on('inv', renderPanel);
  on('chest', i => togglePanel(true, i));
  on('world', () => { if (UI.panelOpen) togglePanel(false); });
}
