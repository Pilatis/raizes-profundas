// Janela de conversa com moradores: saudação, conversa, comércio e pedidos.
import { G, UI } from '../core/state.js';
import { on } from '../core/events.js';
import { clearInput } from '../core/input.js';
import { ITEMS } from '../data/items.js';
import { COIN } from '../data/npcs.js';
import { count } from '../game/inventory.js';
import { profOf, greeting, chatLine, offers, trade, currentQuest, questReady, deliverQuest } from '../game/npcs.js';
import { drawNpcPortrait } from '../render/people.js';
import { iconURL } from '../render/icons.js';
import { sfx } from '../audio/index.js';
import { $, el, button } from './dom.js';

let view = 'main', line = '', note = '';

export function openDialog(npc) {
  if (UI.dialog) closeDialog();
  UI.dialog = npc;
  npc.talking = true;
  view = 'main'; line = greeting(npc); note = '';
  clearInput();
  sfx.talk();
  $('dialog').classList.add('show');
  renderDialog();
}

export function closeDialog() {
  if (!UI.dialog) return;
  UI.dialog.talking = false;
  UI.dialog = null;
  $('dialog').classList.remove('show');
}

function itemTag(id, n) {
  const t = el('span', { class: 'itag' }, el('img', { src: iconURL(id), alt: '' }), el('span', { text: `${n}× ${ITEMS[id].n}` }));
  t.dataset.item = id; // tooltip com a ficha do item
  return t;
}
const coinTag = n => el('span', { class: 'itag coin' }, el('img', { src: iconURL(COIN), alt: '' }), el('span', { text: n }));

function header(npc) {
  const portrait = el('canvas', { width: 64, height: 64, class: 'portrait' });
  drawNpcPortrait(portrait, npc);
  const v = G.world.villages[npc.village];
  return el('header', {}, portrait, el('div', {},
    el('b', { text: npc.name }), el('div', { class: 'role', text: `${profOf(npc).title} · ${v ? v.name : ''}` }),
    el('div', { class: 'purse' }, coinTag(count(COIN)))));
}

function viewMain(npc, box) {
  const quest = currentQuest(npc);
  box.append(el('p', { class: 'speech', text: line }), el('div', { class: 'actions' },
    button('Negociar', () => { view = 'trade'; note = ''; renderDialog(); }),
    button('Conversar', () => { line = chatLine(npc); sfx.talk(); renderDialog(); }),
    button(quest ? 'Pedido ❗' : 'Pedido', () => { view = 'quest'; note = ''; renderDialog(); }),
    button('Tchau', closeDialog)));
}

function offerRow(npc, o) {
  const pay = o.buy ? coinTag(o.price) : itemTag(o.sell, o.n), get = o.buy ? itemTag(o.buy, o.n) : coinTag(o.price);
  const can = o.left > 0 && (o.buy ? count(COIN) >= o.price : count(o.sell) >= o.n);
  const row = el('div', { class: 'offer' + (can ? '' : ' no') }, pay, el('span', { class: 'arrow', text: '➜' }), get, el('span', { class: 'left', text: `${o.left}/${o.stock}` }));
  row.onclick = () => { note = trade(npc, o.k) || ''; renderDialog(); };
  return row;
}

function viewTrade(npc, box) {
  const list = offers(npc);
  box.append(
    el('div', { class: 'sec', text: 'Comprar' }), ...list.filter(o => o.buy).map(o => offerRow(npc, o)),
    el('div', { class: 'sec', text: 'Vender' }), ...list.filter(o => o.sell).map(o => offerRow(npc, o)),
    el('p', { class: 'note', text: note || 'O estoque renova a cada amanhecer.' }),
    el('div', { class: 'actions' }, button('Voltar', () => { view = 'main'; renderDialog(); })));
}

function viewQuest(npc, box) {
  const q = currentQuest(npc);
  if (!q) {
    const done = npc.quest >= profOf(npc).quests.length;
    box.append(el('p', { class: 'speech', text: done ? 'Você já me ajudou muito. Obrigado de verdade!' : 'Por hoje é só. Volte amanhã que eu terei outro pedido.' }));
  } else {
    const ready = questReady(q);
    box.append(el('p', { class: 'speech', text: q.text }),
      el('div', { class: 'sec', text: 'Pedido' }), el('div', { class: 'tags' }, ...Object.entries(q.want).map(([id, n]) => {
        const t = itemTag(id, n); t.append(el('small', { text: ` (${Math.min(count(id), n)}/${n})` })); if (count(id) < n) t.classList.add('miss'); return t;
      })),
      el('div', { class: 'sec', text: 'Recompensa' }), el('div', { class: 'tags' }, ...Object.entries(q.reward).map(([id, n]) => (id === COIN ? coinTag(n) : itemTag(id, n)))));
    const give = button('Entregar', () => { if (deliverQuest(npc)) { line = 'Muito obrigado! Isso vai ajudar demais.'; view = 'main'; } renderDialog(); });
    give.disabled = !ready;
    box.append(el('div', { class: 'actions' }, give, button('Voltar', () => { view = 'main'; renderDialog(); })));
    return;
  }
  box.append(el('div', { class: 'actions' }, button('Voltar', () => { view = 'main'; renderDialog(); })));
}

const VIEWS = { main: viewMain, trade: viewTrade, quest: viewQuest };

export function renderDialog() {
  const npc = UI.dialog;
  if (!npc) return;
  const box = $('dialogBox');
  box.replaceChildren(header(npc));
  VIEWS[view](npc, box);
}

/** Fecha se o jogador se afastar. */
export function checkDialogDistance(maxDist) {
  const n = UI.dialog;
  if (n && Math.hypot(n.x - G.player.x, n.y - G.player.y) > maxDist) closeDialog();
}

export function initDialog() {
  on('npc', openDialog);
  on('inv', () => { if (UI.dialog) renderDialog(); });
  on('world', closeDialog);
}
