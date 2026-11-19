// Ponto de entrada: liga entrada, loop, fluxo de telas e eventos entre módulos.
import { G, UI } from './core/state.js';
import { SET, keyName } from './core/settings.js';
import { on, emit } from './core/events.js';
import { initInput, keys, mouse } from './core/input.js';
import { computeLight } from './world/light.js';
import { newGame, loadGame, saveGame, hasSave } from './game/save.js';
import { updatePlayer, useRight } from './game/player.js';
import { addItem } from './game/inventory.js';
import { spawnEnemies, updateEnemies } from './game/enemies.js';
import { spawnAnimals, updateAnimals, restoreCreatures } from './game/animals.js';
import { updateNpcs } from './game/npcs.js';
import { updateProjectiles } from './game/combat.js';
import { updateDrops, updateParticles } from './game/entities.js';
import { updateTime, growPlants } from './game/simulation.js';
import { initRenderer, render } from './render/renderer.js';
import { initAudio, applyVolume, setSpace, sfx } from './audio/index.js';
import { $, initToasts } from './ui/dom.js';
import { initTooltips } from './ui/tooltip.js';
import { initHud, updateHud, renderHotbar, selectSlot, toggleWorldMap, resetHud } from './ui/hud.js';
import { initPanel, togglePanel, refreshStations, checkChestDistance } from './ui/panel.js';
import { initMenu, renderMenu, buildTitle, pauseGame, menuBack, handleRebind } from './ui/menu.js';
import { initDialog, closeDialog, checkDialogDistance } from './ui/dialog.js';

const MAX_DT = 0.05;
const CHEST_RANGE = 5;
const STATION_CHECK = 0.5;
const canvas = $('game');
let saveTimer = 0, stationTimer = 0;

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }

// ---------- Fluxo de telas ----------
function startGame(fresh) {
  if (fresh || !loadGame()) {
    newGame((Math.random() * 1e9) | 0);
    addItem('pick_wood'); addItem('torch', 4); addItem('berries', 4);
  }
  Object.assign(G, { running: true, paused: false, enemies: [], projs: [], parts: [], shake: 0 });
  restoreCreatures(G.world);
  G.cam.x = G.player.x; G.cam.y = G.player.y;
  Object.assign(UI, { menuView: null, mapOpen: false });
  saveTimer = 0;
  $('start').hidden = true;
  $('hud').hidden = false;
  resetHud();
  renderMenu();
  renderHotbar();
  setSpace(G.world.kind);
  emit('world');
  if (fresh && SET.hints) showTutorial();
}

function showTutorial() {
  const tips = [
    `Corte árvores para obter madeira e crie uma Bancada (${keyName(SET.keys.inv)}).`,
    'Faça uma Enxada para arar a terra e plante sementes. Segure trigo para atrair vacas e ovelhas.',
    `A entrada da caverna (▼ no mapa — ${keyName(SET.keys.map)}) fica logo ali. Os guardiões ☠ esperam lá embaixo.`,
    `Segure ${keyName(SET.keys.sprint)} para correr. À noite, criaturas saem das sombras: tenha tochas por perto.`,
    'Esc abre o menu: configurações, controles e o guia de itens.',
  ];
  tips.forEach((t, i) => setTimeout(() => emit('toast', t), 400 + i * 2600));
}

function quitToTitle() {
  G.running = false; G.paused = false;
  closeDialog();
  if (UI.panelOpen) togglePanel(false);
  toggleWorldMap(false);
  UI.menuView = null;
  renderMenu();
  $('hud').hidden = true;
  buildTitle();
  $('start').hidden = false;
}

// ---------- Entrada ----------
const inGame = () => G.running && !G.paused && !UI.menuView && !UI.dialog;

function onKeyDown(k, e) {
  if (handleRebind(k)) { e.preventDefault(); return; }
  if (k === 'escape') {
    e.preventDefault();
    if (UI.menuView) menuBack();
    else if (UI.dialog) closeDialog();
    else if (UI.mapOpen) toggleWorldMap(false);
    else if (UI.panelOpen) togglePanel(false);
    else if (G.running) pauseGame();
    return;
  }
  if (!inGame()) return;
  if (k === 'tab' || k === ' ') e.preventDefault();
  keys[k] = true;
  if (k === SET.keys.inv || k === 'tab') togglePanel();
  else if (k === SET.keys.map) toggleWorldMap();
  else if (/^[0-9]$/.test(k)) selectSlot((+k + 9) % 10);
}

function onMouseDown(button) {
  if (!inGame() || UI.panelOpen || UI.mapOpen) return;
  if (button === 0) mouse.left = true;
  if (button === 2) useRight();
}

// ---------- Loop ----------
function update(dt) {
  updateTime(dt);
  growPlants(dt);
  updatePlayer(dt);
  const p = G.player;
  G.cam.x += (p.x - G.cam.x) * Math.min(1, dt * 10);
  G.cam.y += (p.y - G.cam.y) * Math.min(1, dt * 10);
  updateDrops(dt);
  updateParticles(dt);
  computeLight(canvas.width, canvas.height);
  spawnEnemies(dt);
  spawnAnimals(dt);
  updateEnemies(dt);
  updateAnimals(dt);
  updateNpcs(dt);
  checkDialogDistance(CHEST_RANGE);
  updateProjectiles(dt);
  G.shake = Math.max(0, G.shake - dt);
  checkChestDistance(CHEST_RANGE);
  if ((stationTimer -= dt) <= 0) { stationTimer = STATION_CHECK; refreshStations(); }
  if (+SET.autosave && (saveTimer += dt) > +SET.autosave) { saveTimer = 0; saveGame(); }
}

let last = performance.now(), fpsTime = 0, fpsFrames = 0;
function frame(now) {
  const dt = Math.min(MAX_DT, (now - last) / 1000);
  last = now;
  if (G.running) {
    if (!G.paused) update(dt);
    render(canvas.width, canvas.height);
    updateHud(dt);
  }
  fpsTime += dt; fpsFrames++;
  if (fpsTime >= 0.5) { $('fps').textContent = Math.round(fpsFrames / fpsTime) + ' FPS'; fpsTime = 0; fpsFrames = 0; }
  requestAnimationFrame(frame);
}

// ---------- Inicialização ----------
function boot() {
  resize();
  addEventListener('resize', resize);
  initRenderer(canvas);
  initToasts();
  initTooltips();
  initHud();
  initPanel();
  initDialog();
  initMenu({ start: startGame, save: saveGame, quit: quitToTitle, hasSave });
  initInput(canvas, {
    keydown: onKeyDown,
    mousedown: onMouseDown,
    wheel: dir => { if (inGame()) selectSlot(G.player.sel + dir); },
    blur: () => { if (SET.autoPause) pauseGame(); },
  });
  addEventListener('pointerdown', initAudio);
  addEventListener('keydown', initAudio);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('button, .rc, .slot, .tab')) sfx.ui(); });
  addEventListener('beforeunload', () => { if (G.running) saveGame(); });
  on('settings', () => { applyVolume(); $('fps').hidden = !SET.fps; });
  on('world', () => setSpace(G.world.kind));
  $('fps').hidden = !SET.fps;
  $('mapClose').onclick = () => toggleWorldMap(false);
  buildTitle();
  requestAnimationFrame(frame);
}

boot();
