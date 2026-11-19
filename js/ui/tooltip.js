// Tooltips no estilo pixelado: [data-item="id"] mostra a ficha do item; [data-tip="texto"] mostra um texto.
import { ITEMS, CATEGORIES } from '../data/items.js';
import { categoryOf, describe } from '../game/inventory.js';
import { iconURL } from '../render/icons.js';
import { $, el } from './dom.js';

const OFFSET = 16;
const CATEGORY_COLORS = ['#ffc04a', '#9ad0ff', '#ff8a8a', '#c9a0ff', '#9be07b', '#d8b878', '#cfc4b4', '#ff9ad8'];

function stats(it) {
  const out = [];
  if (it.dmg) out.push(['Dano', it.dmg]);
  if (it.pow) out.push(['Força', it.pow], ['Nível', it.tier]);
  if (it.def) out.push(['Defesa', `${it.def * 100 | 0}%`]);
  if (it.food) out.push(['Fome', `+${it.food}`]);
  if (it.heal) out.push(['Vida', `+${it.heal}`]);
  if (it.rate) out.push(['Cadência', `${(1 / it.rate).toFixed(1)}/s`]);
  return out;
}

function itemCard(id) {
  const it = ITEMS[id], cat = categoryOf(id);
  return el('div', {},
    el('div', { class: 'tt-head' }, el('img', { src: iconURL(id), alt: '' }),
      el('div', {}, el('b', { text: it.n, style: `color:${CATEGORY_COLORS[cat]}` }), el('div', { class: 'tt-cat', text: CATEGORIES[cat] }))),
    ...stats(it).map(([k, v]) => el('div', { class: 'tt-stat' }, el('span', { text: k }), el('b', { text: v }))),
    describe(id) ? el('p', { class: 'tt-desc', text: describe(id) }) : null);
}

function place(tip, x, y) {
  const w = tip.offsetWidth, h = tip.offsetHeight;
  tip.style.left = Math.min(x + OFFSET, innerWidth - w - 8) + 'px';
  tip.style.top = (y + OFFSET + h > innerHeight ? y - h - 8 : y + OFFSET) + 'px';
}

export function initTooltips() {
  const tip = $('tooltip');
  let current = null;
  document.addEventListener('mouseover', e => {
    const target = e.target.closest && e.target.closest('[data-item],[data-tip]');
    if (target === current) return;
    current = target;
    if (!target) { tip.classList.remove('show'); return; }
    tip.replaceChildren(target.dataset.item ? itemCard(target.dataset.item) : el('p', { class: 'tt-desc', text: target.dataset.tip }));
    tip.classList.add('show');
    place(tip, e.clientX, e.clientY);
  });
  document.addEventListener('mousemove', e => { if (current) place(tip, e.clientX, e.clientY); });
  // ao reconstruir listas (inventário, criação) o alvo some: esconde
  document.addEventListener('click', () => setTimeout(() => { if (current && !document.contains(current)) { current = null; tip.classList.remove('show'); } }, 0));
}
