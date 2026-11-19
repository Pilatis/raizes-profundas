// Estado bruto de teclado/mouse. O roteamento (menu x painel x jogo) fica em main.js.
import { G, TILE } from './state.js';
import { SET } from './settings.js';

export const keys = {};
export const mouse = { x: 0, y: 0, left: false };
let canvas = null;

export function initInput(cv, handlers) {
  canvas = cv;
  addEventListener('keydown', e => handlers.keydown(e.key.toLowerCase(), e));
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  addEventListener('blur', () => { clearInput(); handlers.blur(); });
  addEventListener('mouseup', e => { if (e.button === 0) mouse.left = false; });
  cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  cv.addEventListener('mousedown', e => handlers.mousedown(e.button));
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('wheel', e => handlers.wheel(e.deltaY > 0 ? 1 : -1), { passive: true });
}

export function clearInput() {
  for (const k in keys) keys[k] = false;
  mouse.left = false;
}

/** A tecla configurada para a ação está pressionada? */
export const actionDown = action => !!keys[SET.keys[action]];

/** Posição do mouse em coordenadas de mundo (blocos). */
export function mouseWorld() {
  const s = TILE * SET.zoom;
  return { x: (mouse.x - canvas.width / 2) / s + G.cam.x, y: (mouse.y - canvas.height / 2) / s + G.cam.y };
}
