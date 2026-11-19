// Helpers de DOM, espaços de item e toasts.
import { on } from '../core/events.js';
import { iconURL } from '../render/icons.js';

const TOAST_MS = 3600;
const TOAST_COOLDOWN = 2500;
const TOAST_LIMIT = 4;
const TOAST_ICONS = { info: 'i', good: '✓', warn: '!', boss: '☠' };
// chaves de mensagens repetitivas que são avisos (sem precisar marcar em cada chamada)
const WARN_KEYS = new Set(['lava', 'hunger', 'tier', 'far', 'place', 'liquid', 'sleep', 'plant', 'till', 'water', 'door', 'breed', 'full', 'maxhp']);
const toastTimes = new Map();

export const $ = id => document.getElementById(id);

/** Cria um elemento: el('div', { class, text, html, style, onclick, ... }, ...filhos) */
export function el(tag, props = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style') e.style.cssText = v;
    else e[k] = v;
  }
  for (const c of children) if (c) e.append(c);
  return e;
}

export const button = (text, onclick, cls = '') => el('button', { text, onclick, class: cls });

/** Espaço de inventário com ícone, quantidade e tecla de atalho. */
export function itemSlot(item, key = '') {
  const d = el('div', { class: 'slot' });
  if (item) {
    d.dataset.item = item.id;
    d.append(el('img', { src: iconURL(item.id), alt: '' }));
    if (item.n > 1) d.append(el('span', { class: 'n', text: item.n }));
  }
  if (key !== '') d.append(el('span', { class: 'k', text: key }));
  return d;
}

/**
 * Mensagens rápidas. emit('toast', texto, chave?, { type?: 'info'|'good'|'warn'|'boss', icon?: idDoItem })
 * `chave` evita repetir a mesma mensagem em sequência.
 */
export function initToasts() {
  on('toast', (text, key, opts = {}) => {
    if (key) {
      const now = performance.now();
      if (now - (toastTimes.get(key) || -1e9) < TOAST_COOLDOWN) return;
      toastTimes.set(key, now);
    }
    const type = opts.type || (WARN_KEYS.has(key) ? 'warn' : 'info');
    const badge = opts.icon ? el('img', { src: iconURL(opts.icon), alt: '' }) : el('span', { class: 'ti', text: TOAST_ICONS[type] });
    const t = el('div', { class: `toast ${type}` }, badge, el('span', { text }));
    const box = $('toasts');
    box.append(t);
    while (box.children.length > TOAST_LIMIT) box.firstElementChild.remove();
    setTimeout(() => t.remove(), TOAST_MS);
  });
}
