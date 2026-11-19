// Dados do mundo: paredes, chãos, biomas, luzes e tesouros. Somente dados.

export const WATER = 8;
export const LAVA = 9;
export const BEDROCK = 6;

// mat: som de mineração · tier: picareta necessária · dropN: [mín, máx]
// prop: desenhado como objeto (árvore/cacto/cerca) sobre o chão, em vez de bloco
// built: construído pelo jogador (o martelo desmonta na hora) · clear: não bloqueia a luz
export const WALLS = {
  1: { n: 'Terra', hp: 2, tier: 0, col: '#5c3f28', top: '#7d5838', drop: 'dirt', mat: 'dirt' },
  2: { n: 'Pedra', hp: 5, tier: 0, col: '#4e4e5a', top: '#6c6c7a', drop: 'stone', mat: 'stone' },
  3: { n: 'Cobre', hp: 6, tier: 0, col: '#4e4e5a', top: '#6c6c7a', drop: 'copper_ore', ore: '#e8823e', mat: 'ore' },
  4: { n: 'Ferro', hp: 9, tier: 1, col: '#3c3c48', top: '#575766', drop: 'iron_ore', ore: '#d6dee9', mat: 'ore' },
  5: { n: 'Cristal', hp: 14, tier: 2, col: '#262a52', top: '#3a4084', drop: 'crystal', ore: '#7ff3ff', mat: 'crystal', glow: 3 },
  6: { n: 'Rocha-mãe', hp: Infinity, tier: 99, col: '#111115', top: '#1c1c22', mat: 'stone' },
  7: { n: 'Raiz', hp: 3, tier: 0, col: '#5c3f28', top: '#7d5838', drop: 'wood', dropN: [1, 2], root: true, mat: 'wood' },
  8: { n: 'Pedra escura', hp: 8, tier: 1, col: '#2c2b3a', top: '#3e3d52', drop: 'stone', mat: 'stone' },
  9: { n: 'Fungo gigante', hp: 4, tier: 0, col: '#3e2a4e', top: '#5e4478', drop: 'wood', ore: '#d8a0ff', extra: 'mushroom', mat: 'wood' },
  10: { n: 'Musgo', hp: 3, tier: 0, col: '#2e4a2a', top: '#44683c', drop: 'dirt', mat: 'dirt' },
  11: { n: 'Argila', hp: 4, tier: 0, col: '#5a4a3c', top: '#7a6a58', drop: 'clay', mat: 'dirt' },
  12: { n: 'Ouro', hp: 10, tier: 2, col: '#4a3e30', top: '#665848', drop: 'gold_ore', ore: '#ffd24a', mat: 'ore' },
  13: { n: 'Obsidiana', hp: 16, tier: 3, col: '#1a1022', top: '#2e1e3e', drop: 'obsidian', ore: '#8a5ac8', mat: 'glass' },
  14: { n: 'Basalto', hp: 9, tier: 1, col: '#2a2222', top: '#403434', drop: 'stone', mat: 'stone' },
  15: { n: 'Tijolo', hp: 6, tier: 0, col: '#6a3024', top: '#9a4a3a', drop: 'brick', brick: true, built: true, mat: 'stone' },
  16: { n: 'Carvalho', hp: 3, tier: 0, col: '#6a4426', top: '#7d5432', drop: 'wood', dropN: [2, 3], prop: 'oak', canopy: true, leaf: '#3f8a3a', mat: 'wood' },
  17: { n: 'Pinheiro', hp: 3, tier: 0, col: '#5a3a20', top: '#6a4426', drop: 'wood', dropN: [2, 3], prop: 'pine', canopy: true, leaf: '#2e5e3e', mat: 'wood' },
  18: { n: 'Rocha', hp: 5, tier: 0, col: '#66666f', top: '#8a8a94', drop: 'stone', mat: 'stone' },
  19: { n: 'Cacto', hp: 2, tier: 0, col: '#2f7a3a', top: '#58a858', prop: 'cactus', mat: 'wood' },
  20: { n: 'Gelo', hp: 3, tier: 0, col: '#7aa8c8', top: '#c8e8ff', mat: 'crystal' },
  21: { n: 'Arenito', hp: 4, tier: 0, col: '#b8985a', top: '#d8b878', drop: 'sand', mat: 'dirt' },
  22: { n: 'Parede de tábuas', hp: 3, tier: 0, col: '#7a4c22', top: '#b5844a', drop: 'planks', plank: true, built: true, mat: 'wood' },
  23: { n: 'Tijolos de pedra', hp: 6, tier: 0, col: '#55555f', top: '#8a8a96', drop: 'stone_brick', brick: true, built: true, mat: 'stone' },
  24: { n: 'Vidro', hp: 1, tier: 0, col: '#8ac0d8', top: '#c8eaf8', drop: 'glass', glass: true, clear: true, built: true, mat: 'glass' },
  26: { n: 'Bétula', hp: 3, tier: 0, col: '#e8e4dc', top: '#f4f2ee', drop: 'wood', dropN: [2, 3], prop: 'birch', canopy: true, leaf: '#7ab84a', mat: 'wood' },
  27: { n: 'Palmeira', hp: 3, tier: 0, col: '#9a7040', top: '#b8884a', drop: 'wood', dropN: [1, 2], prop: 'palm', canopy: true, leaf: '#4aa04a', mat: 'wood' },
  28: { n: 'Salgueiro', hp: 4, tier: 0, col: '#4a3a24', top: '#5a4a2e', drop: 'wood', dropN: [2, 4], prop: 'willow', canopy: true, leaf: '#5a8a3a', mat: 'wood' },
  29: { n: 'Árvore seca', hp: 2, tier: 0, col: '#6a5440', top: '#8a7058', drop: 'wood', dropN: [1, 2], prop: 'dead', mat: 'wood' },
  30: { n: 'Pinheiro nevado', hp: 3, tier: 0, col: '#5a3a20', top: '#6a4426', drop: 'wood', dropN: [2, 3], prop: 'pine', snow: true, canopy: true, leaf: '#2a5a44', mat: 'wood' },
  31: { n: 'Carvalho antigo', hp: 6, tier: 0, col: '#5a3a1e', top: '#6a4426', drop: 'wood', dropN: [4, 6], prop: 'oak', big: true, canopy: true, leaf: '#2f7a32', mat: 'wood' },
  32: { n: 'Árvore de outono', hp: 3, tier: 0, col: '#6a4426', top: '#7d5432', drop: 'wood', dropN: [2, 3], prop: 'oak', canopy: true, leaf: '#d8742a', autumn: true, mat: 'wood' },
  25: { n: 'Cerca', hp: 2, tier: 0, col: '#6a4426', top: '#a8743a', drop: 'fence', prop: 'fence', clear: true, built: true, mat: 'wood' },
};

// Pisos construídos (valores de chão a partir de BUILT_FLOOR); monstros não nascem neles
export const BUILT_FLOOR = 12;
export const FLOOR_STYLES = {
  12: { n: 'Piso de madeira', item: 'wood_floor', pattern: 'planks' },
  13: { n: 'Piso de pedra', item: 'stone_floor', pattern: 'tiles' },
  14: { n: 'Tapete vermelho', item: 'carpet_red', pattern: 'carpet', trim: '#e8c060' },
  15: { n: 'Tapete creme', item: 'carpet_cream', pattern: 'carpet', trim: '#a07850' },
  16: { n: 'Caminho', pattern: 'path' }, // trilha das vilas (sem item: o martelo não remove)
};
const BUILT_COLORS = ['#9a6a3a', '#7a7a86', '#a83a3a', '#e0d2b4', '#b0905e'];

// Paleta de chão por camada; índice = valor do chão (bioma + 1, WATER/LAVA, solo arado 10/11, pisos 12+)
export const FLOORS = {
  cave: ['#000', '#3a2a1d', '#30303a', '#22301e', '#2a2e34', '#1b1c32', '#2e1c18', '#000', '#1a3a5e', '#d0501a', '#4a3020', '#2e1e12', ...BUILT_COLORS],
  surface: ['#000', '#5a9a3e', '#46803a', '#dcc27c', '#e6edf2', '#4e6a36', '#e2d296', '#7c7c84', '#2a6ab0', '#000', '#6a4426', '#4a2e18', ...BUILT_COLORS],
};

export const BIOMES = {
  cave: ['Cavernas de Terra', 'Pedreira Profunda', 'Floresta de Fungos', 'Lagoa Submersa', 'Abismo Cristalino', 'Ermo de Brasa'],
  surface: ['Planície', 'Floresta', 'Deserto', 'Taiga nevada', 'Pântano', 'Praia', 'Montanhas', 'Oceano'],
};
export const SURFACE = { PLAINS: 0, FOREST: 1, DESERT: 2, TAIGA: 3, SWAMP: 4, BEACH: 5, MOUNTAIN: 6, OCEAN: 7 };

// Onde cada parede aparece (texto do guia)
export const WALL_FOUND = {
  1: ['Cavernas de Terra'], 2: ['Pedreira Profunda'], 3: ['Cavernas de Terra', 'Pedreira Profunda', 'Floresta de Fungos', 'Montanhas'],
  4: ['Pedreira Profunda', 'Lagoa Submersa', 'Abismo Cristalino', 'Montanhas'], 5: ['Abismo Cristalino'],
  7: ['Cavernas de Terra', 'Pedreira Profunda', 'Floresta de Fungos', 'Abismo Cristalino'], 8: ['Abismo Cristalino'],
  9: ['Floresta de Fungos'], 10: ['Floresta de Fungos'], 11: ['Lagoa Submersa'], 12: ['Lagoa Submersa', 'Ermo de Brasa'],
  13: ['Ermo de Brasa'], 14: ['Ermo de Brasa'], 16: ['Planície', 'Floresta', 'Pântano'], 17: ['Taiga nevada'],
  18: ['Montanhas', 'Planície'], 19: ['Deserto'], 20: ['Taiga nevada'], 21: ['Deserto', 'Praia'],
  26: ['Floresta'], 27: ['Praia'], 28: ['Pântano'], 29: ['Deserto'], 30: ['Taiga nevada', 'Montanhas'], 31: ['Planície'], 32: ['Floresta'],
};

// Objetos colocáveis: item = o que volta ao recolher · light = raio de luz · flicker = chama
// use = tem ação no clique (só recolhe com martelo/picareta) · solid = bloqueia passagem (porta fechada)
// fire = peso do som de fogo · noPickup = recolhido de outro jeito (baú: botão no painel)
export const OBJECTS = {
  torch: { item: 'torch', light: 7.5, flicker: true, fire: 1 },
  campfire: { item: 'campfire', light: 9, flicker: true, fire: 0.6 },
  lamp: { item: 'lamp', light: 11 },
  lantern: { item: 'lantern', light: 9.5, flicker: true },
  workbench: { item: 'workbench' },
  furnace: { item: 'furnace' },
  chest: { item: 'chest', noPickup: true },
  bed: { item: 'bed', use: true },
  door: { item: 'door', use: true, solid: true },
  table: { item: 'table' },
  chair: { item: 'chair' },
  bookshelf: { item: 'bookshelf' },
  flower_pot: { item: 'flower_pot' },
  banner: { item: 'banner' },
  well: { item: null, noPickup: true, solid: true }, // poço da vila
};

// Baús da caverna por bioma: [item, mín, máx]
export const LOOT = [
  [['wood', 3, 8], ['torch', 2, 6], ['mushroom', 2, 5], ['copper_ore', 2, 6], ['seed', 1, 3], ['coin', 2, 5]],
  [['copper_bar', 2, 5], ['iron_ore', 2, 5], ['torch', 3, 8], ['cooked', 1, 3], ['stone', 8, 20], ['coin', 3, 8]],
  [['seed', 3, 6], ['mushroom', 4, 8], ['cooked', 2, 4], ['gel', 2, 5], ['wood', 4, 10]],
  [['clay', 4, 10], ['iron_bar', 2, 4], ['gold_ore', 1, 4], ['stew', 1, 2], ['gel', 3, 6]],
  [['crystal', 2, 5], ['iron_bar', 3, 6], ['lamp', 1, 2], ['stew', 1, 3], ['gold_bar', 1, 2], ['coin', 6, 14]],
  [['obsidian', 2, 5], ['gold_bar', 2, 4], ['amulet', 1, 1], ['stew', 2, 3], ['crystal', 2, 4]],
];
