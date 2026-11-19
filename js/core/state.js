// Estado mutável único do jogo. Nenhum outro módulo guarda estado global.

export const TILE = 32;          // pixels por bloco
export const WORLD_SIZE = 256;   // blocos por lado em cada camada
export const DAY_LENGTH = 600;   // segundos de um dia completo na superfície (noite ≈ 37%)
export const REACH = 3.3;        // alcance de mineração/interação (blocos)
export const PLACE_REACH = 4.2;  // alcance para colocar blocos

export const G = {
  running: false,
  paused: false,
  seed: 0,
  time: 0.3,        // fração do dia (0 = meia-noite, 0.5 = meio-dia)
  day: 1,
  worlds: { surface: null, cave: null },
  world: null,      // camada ativa
  player: null,
  enemies: [],
  projs: [],
  drops: [],        // referência para world.drops da camada ativa
  parts: [],
  cam: { x: 0, y: 0 },
  shake: 0,
};

export const UI = {
  panelOpen: false,
  openChest: null,  // índice do baú aberto
  mapOpen: false,
  menuView: null,   // 'main' | 'settings' | 'controls' | 'guide' | null
  menuCtx: 'pause', // 'pause' | 'start'
  rebinding: null,
  picked: -1,
  craftCat: -1,
  dialog: null,     // morador com quem o jogador está conversando
};
