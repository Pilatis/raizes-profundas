// Menus: pausa, configurações, controles, guia de itens e tela inicial.
import { G, UI } from '../core/state.js';
import { SET, SCHEMA, ACTIONS, saveSettings, resetSettings, resetKeys, bindKey, keyName } from '../core/settings.js';
import { emit } from '../core/events.js';
import { clearInput } from '../core/input.js';
import { ITEMS, CATEGORIES } from '../data/items.js';
import { categoryOf, describe, sourcesOf } from '../game/inventory.js';
import { iconURL } from '../render/icons.js';
import { sfx, applyVolume } from '../audio/index.js';
import { $, el, button } from './dom.js';
import { togglePanel } from './panel.js';

let actions = { start: () => {}, save: () => {}, quit: () => {}, hasSave: () => false };

const FIXED_CONTROLS = [
  ['Minerar, atacar, colher, abrir, entrar na caverna', 'Clique esquerdo (segurar)'],
  ['Colocar, comer, vestir, usar', 'Clique direito'],
  ['Escolher item da barra', '1 – 0 / roda do mouse'],
  ['Inventário (alternativo)', 'Tab'],
  ['Mover (alternativo)', 'Setas'],
  ['Pausar / voltar', 'Esc'],
];

export function pauseGame() {
  if (!G.running || G.paused) return;
  if (UI.panelOpen) togglePanel(false);
  G.paused = true;
  UI.menuCtx = 'pause';
  UI.menuView = 'main';
  clearInput();
  renderMenu();
  applyVolume();
  sfx.uiOpen();
}

export function resumeGame() {
  G.paused = false;
  UI.menuView = null;
  UI.rebinding = null;
  renderMenu();
  applyVolume();
}

export function openMenu(view, ctx) {
  UI.menuCtx = ctx;
  UI.menuView = view;
  renderMenu();
}

export function menuBack() {
  UI.rebinding = null;
  if (UI.menuView === 'main') return resumeGame();
  UI.menuView = UI.menuCtx === 'start' ? null : 'main';
  renderMenu();
}

/** Teclado enquanto espera a nova tecla de uma ação. Devolve true se consumiu. */
export function handleRebind(key) {
  if (!UI.rebinding) return false;
  if (key !== 'escape' && !/^[0-9]$/.test(key)) bindKey(UI.rebinding, key);
  UI.rebinding = null;
  renderMenu();
  return true;
}

const section = text => el('div', { class: 'sec', text });
const row = (label, ...right) => el('div', { class: 'row' }, el('label', { text: label }), ...right);
const footer = (...buttons) => el('div', { class: 'btns' }, ...buttons);

function viewMain(box) {
  box.append(el('h2', { text: 'Pausado' }), el('div', { class: 'col' },
    button('Continuar', resumeGame),
    button('Guia de itens', () => openMenu('guide', 'pause')),
    button('Configurações', () => openMenu('settings', 'pause')),
    button('Controles', () => openMenu('controls', 'pause')),
    button('Salvar jogo', () => { actions.save(); emit('toast', 'Jogo salvo.'); }),
    button('Salvar e sair para o menu', () => { actions.save(); actions.quit(); }),
  ));
}

function settingControl(s) {
  if (s.t === 'range') {
    const val = el('span', { class: 'val', text: s.fmt(SET[s.k]) });
    const input = el('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: SET[s.k] });
    input.oninput = () => { SET[s.k] = +input.value; val.textContent = s.fmt(SET[s.k]); saveSettings(); };
    return [input, val];
  }
  if (s.t === 'bool') {
    const input = el('input', { type: 'checkbox', checked: !!SET[s.k] });
    input.onchange = () => { SET[s.k] = input.checked; saveSettings(); };
    return [input];
  }
  const select = el('select', {}, ...s.opts.map(([v, t]) => el('option', { value: v, text: t })));
  select.value = SET[s.k];
  select.onchange = () => { SET[s.k] = select.value; saveSettings(); };
  return [select];
}

function viewSettings(box) {
  box.append(el('h2', { text: 'Configurações' }));
  for (const s of SCHEMA) {
    if (s.sec) { box.append(section(s.sec)); continue; }
    const controls = settingControl(s), r = row(s.n, ...controls);
    if (s.t === 'bool') r.querySelector('label').onclick = () => { controls[0].checked = !controls[0].checked; controls[0].onchange(); };
    box.append(r);
  }
  box.append(footer(button('Restaurar padrões', () => { resetSettings(); renderMenu(); }), button('Voltar', menuBack)));
}

function viewControls(box) {
  box.append(el('h2', { text: 'Controles' }), section('Teclado (clique para trocar a tecla)'));
  for (const [a, name] of ACTIONS) {
    const waiting = UI.rebinding === a;
    box.append(row(name, button(waiting ? 'Pressione...' : keyName(SET.keys[a]), () => { UI.rebinding = a; renderMenu(); }, 'kb' + (waiting ? ' wait' : ''))));
  }
  box.append(section('Fixos'));
  for (const [name, key] of FIXED_CONTROLS) box.append(row(name, el('span', { class: 'fixed', text: key })));
  box.append(section('Dicas'), el('div', { class: 'tips', html:
    'Segure Correr para ganhar velocidade — gasta stamina e dá mais fome.<br>' +
    'Inimigos surgem no escuro: de noite na superfície e sempre nas cavernas. Tochas protegem sua base.<br>' +
    'A entrada da caverna (▼ no mapa) fica perto do ponto inicial. Clique nela para descer.<br>' +
    'Coloque blocos sobre água ou lava para aterrar e atravessar.' }));
  box.append(footer(button('Restaurar padrões', () => { resetKeys(); UI.rebinding = null; renderMenu(); }), button('Voltar', menuBack)));
}

function viewGuide(box) {
  const search = el('input', { id: 'guideSearch', placeholder: 'Buscar item ou material...' });
  const list = el('div');
  const draw = () => {
    const f = search.value.trim().toLowerCase();
    list.replaceChildren();
    CATEGORIES.forEach((c, ci) => {
      const ids = Object.keys(ITEMS).filter(id => ITEMS[id].n && categoryOf(id) === ci && (!f || ITEMS[id].n.toLowerCase().includes(f)));
      if (!ids.length) return;
      list.append(section(c));
      for (const id of ids) {
        const src = sourcesOf(id).map(t => `<li>${t}</li>`).join('') || '<li>—</li>';
        list.append(el('div', { class: 'gi', html: `<img src="${iconURL(id)}" alt=""><div><b>${ITEMS[id].n}</b><div class="d">${describe(id)}</div><ul>${src}</ul></div>` }));
      }
    });
  };
  search.oninput = draw;
  draw();
  box.append(el('h2', { text: 'Guia de itens' }), search, list, footer(button('Voltar', menuBack)));
  setTimeout(() => search.focus(), 0);
}

const VIEWS = { main: viewMain, settings: viewSettings, controls: viewControls, guide: viewGuide };

export function renderMenu() {
  const box = $('menuBox');
  $('menu').classList.toggle('show', !!UI.menuView);
  box.replaceChildren();
  box.className = 'box' + (UI.menuView === 'guide' ? ' wide' : '');
  if (UI.menuView) VIEWS[UI.menuView](box);
}

export function buildTitle() {
  const wrap = $('startBtns'), saved = actions.hasSave();
  wrap.replaceChildren();
  if (saved) wrap.append(button('Continuar', () => actions.start(false)));
  const fresh = button('Novo mundo', () => {
    if (saved && !fresh.dataset.ok) { fresh.dataset.ok = '1'; fresh.textContent = 'Confirmar: apagar o mundo salvo?'; fresh.classList.add('danger'); return; }
    actions.start(true);
  });
  wrap.append(fresh,
    button('Guia de itens', () => openMenu('guide', 'start')),
    button('Configurações', () => openMenu('settings', 'start')),
    button('Controles', () => openMenu('controls', 'start')));
}

export function initMenu(callbacks) {
  actions = { ...actions, ...callbacks };
  $('menuBtn').onclick = pauseGame;
}
