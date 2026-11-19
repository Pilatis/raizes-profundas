// Agricultura: cultivos, plantas selvagens e solos aráveis. Somente dados.

export const FARMLAND = 10;      // valor de chão: solo arado seco
export const FARMLAND_WET = 11;  // solo arado regado (cresce 2× mais rápido)
export const WATER_REACH = 3;    // solo perto de água já nasce regado

// Chãos que a enxada transforma em solo arado, por camada
export const TILLABLE = { surface: [1, 2, 5], cave: [1, 3] };
export const TILL_SEED_CHANCE = 0.3; // arar grama às vezes solta sementes de trigo

// seed: item que planta · yield/seedBack: [id, mín, máx] · grow: segundos (solo seco)
// soil: 'farm' exige solo arado · 'any' cresce em qualquer chão (cogumelo da caverna)
export const CROPS = {
  mushroom: { n: 'Cogumelo', seed: 'seed', grow: 75, soil: 'any', yield: ['mushroom', 2, 3], seedBack: ['seed', 1, 2], col: '#b48ae0' },
  wheat: { n: 'Trigo', seed: 'wheat_seed', grow: 90, soil: 'farm', yield: ['wheat', 1, 2], seedBack: ['wheat_seed', 1, 2], col: '#e0c060' },
  carrot: { n: 'Cenoura', seed: 'carrot', grow: 80, soil: 'farm', yield: ['carrot', 2, 3], col: '#ff8a2a' },
  pumpkin: { n: 'Abóbora', seed: 'pumpkin_seed', grow: 140, soil: 'farm', yield: ['pumpkin', 1, 1], seedBack: ['pumpkin_seed', 0, 1], col: '#ff9a20' },
};

// Plantas que nascem sozinhas na superfície: [bioma, chance por bloco]
export const WILD_PLANTS = {
  wild_wheat: { n: 'Trigo selvagem', drop: ['wheat_seed', 1, 2], spawn: [[0, 0.012], [1, 0.004]] },
  wild_carrot: { n: 'Cenoura selvagem', drop: ['carrot', 1, 2], spawn: [[0, 0.004], [1, 0.006]] },
  wild_pumpkin: { n: 'Abóbora selvagem', drop: ['pumpkin', 1, 1], spawn: [[0, 0.002], [4, 0.004]] },
};
export const WILD_BIOME_NAMES = { 0: 'Planície', 1: 'Floresta', 4: 'Pântano' };
