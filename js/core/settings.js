// Configurações persistentes do jogador (vídeo, áudio, jogo, teclas).
import { emit } from './events.js';

const STORAGE_KEY = 'raizes_settings_v1';
const pct = v => Math.round(v * 100) + '%';

export const ACTIONS = [
  ['up', 'Mover para cima', 'w'],
  ['down', 'Mover para baixo', 's'],
  ['left', 'Mover para a esquerda', 'a'],
  ['right', 'Mover para a direita', 'd'],
  ['sprint', 'Correr', 'shift'],
  ['inv', 'Inventário e criação', 'e'],
  ['map', 'Mapa', 'm'],
];

export const DEFAULTS = {
  vMaster: 0.8, vMusic: 0.55, vSfx: 0.8, vAmb: 0.7,
  zoom: 1, bright: 1, shake: true, particles: true, fps: false,
  diff: 'normal', autosave: '60', autoPause: true,
  hpbars: true, coords: true, hints: true, minimap: true,
  keys: Object.fromEntries(ACTIONS.map(a => [a[0], a[2]])),
};

export const SCHEMA = [
  { sec: 'Vídeo' },
  { k: 'zoom', n: 'Zoom da câmera', t: 'range', min: 0.75, max: 1.5, step: 0.05, fmt: pct },
  { k: 'bright', n: 'Brilho', t: 'range', min: 0.7, max: 1.6, step: 0.05, fmt: pct },
  { k: 'shake', n: 'Tremor de tela', t: 'bool' },
  { k: 'particles', n: 'Partículas', t: 'bool' },
  { k: 'fps', n: 'Mostrar FPS', t: 'bool' },
  { sec: 'Áudio' },
  { k: 'vMaster', n: 'Volume geral', t: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { k: 'vMusic', n: 'Música', t: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { k: 'vSfx', n: 'Efeitos', t: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { k: 'vAmb', n: 'Ambiente', t: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
  { sec: 'Jogo' },
  { k: 'diff', n: 'Dificuldade', t: 'select', opts: [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']] },
  { k: 'autosave', n: 'Salvamento automático', t: 'select', opts: [['0', 'Desligado'], ['30', 'A cada 30 s'], ['60', 'A cada 1 min'], ['300', 'A cada 5 min']] },
  { k: 'autoPause', n: 'Pausar ao sair da janela', t: 'bool' },
  { sec: 'Interface' },
  { k: 'minimap', n: 'Minimapa', t: 'bool' },
  { k: 'hpbars', n: 'Vida dos inimigos', t: 'bool' },
  { k: 'coords', n: 'Mostrar coordenadas', t: 'bool' },
  { k: 'hints', n: 'Dicas de tutorial', t: 'bool' },
];

// dmg: dano recebido · hunger: fome · hp: vida dos inimigos
export const DIFF = {
  facil: { dmg: 0.6, hunger: 0.7, hp: 0.8 },
  normal: { dmg: 1, hunger: 1, hp: 1 },
  dificil: { dmg: 1.5, hunger: 1.3, hp: 1.3 },
};

const clone = o => JSON.parse(JSON.stringify(o));

export const SET = clone(DEFAULTS);
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved) {
    Object.assign(SET, saved);
    SET.keys = Object.assign({}, DEFAULTS.keys, saved.keys || {});
  }
} catch (e) { /* sem localStorage: usa os padrões */ }

export function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(SET)); } catch (e) { /* ignorado */ }
  emit('settings');
}

export function resetSettings() {
  const keys = SET.keys;
  Object.assign(SET, clone(DEFAULTS), { keys });
  saveSettings();
}

export function resetKeys() {
  SET.keys = clone(DEFAULTS.keys);
  saveSettings();
}

/** Troca a tecla de uma ação; se outra ação usava a tecla, elas trocam entre si. */
export function bindKey(action, key) {
  for (const a in SET.keys) if (SET.keys[a] === key) SET.keys[a] = SET.keys[action];
  SET.keys[action] = key;
  saveSettings();
}

const KEY_NAMES = {
  ' ': 'Espaço', arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
  shift: 'Shift', control: 'Ctrl', alt: 'Alt', tab: 'Tab', enter: 'Enter', backspace: 'Backspace',
};
export const keyName = k => KEY_NAMES[k] || k.toUpperCase();
export const diff = () => DIFF[SET.diff] || DIFF.normal;
