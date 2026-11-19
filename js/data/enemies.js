// Inimigos, chefes e tabelas de surgimento. Somente dados.
// ai: hop (pula) · fly (voa ondulando) · walk (anda) · charge (prepara e investe)
//     shooter (atira) · ghost (atravessa paredes) · b_* (padrões dos chefes)
// shape: forma do sprite (padrão: gosma) · nocturnal: some ao amanhecer

export const ENEMIES = {
  // caverna
  slime: { n: 'Gosma', ai: 'hop', hp: 4, dmg: 8, r: 0.38, col: '#5fd35f', spd: 5, drop: 'gel' },
  slime2: { n: 'Gosma de pedra', ai: 'hop', hp: 11, dmg: 14, r: 0.42, col: '#a8a8b8', spd: 6, drop: 'gel' },
  spore: { n: 'Esporinho', ai: 'hop', hp: 9, dmg: 11, r: 0.36, col: '#c070ff', spd: 5.5, drop: 'seed', shape: 'shroom' },
  slime_w: { n: "Gosma d'água", ai: 'hop', hp: 15, dmg: 15, r: 0.42, col: '#4aa0ff', spd: 6.5, drop: 'gel' },
  slime3: { n: 'Gosma cristalina', ai: 'hop', hp: 24, dmg: 22, r: 0.45, col: '#7ff3ff', spd: 7, drop: 'crystal' },
  slime_l: { n: 'Gosma de lava', ai: 'hop', hp: 30, dmg: 22, r: 0.46, col: '#ff7a2a', spd: 7.5, drop: 'gel' },
  bat: { n: 'Morcego das cavernas', ai: 'fly', hp: 5, dmg: 7, r: 0.3, col: '#6a5a7a', spd: 5.5, drop: 'gel', dropP: 0.5, shape: 'bat' },
  beetle: { n: 'Besouro-rocha', ai: 'charge', hp: 18, dmg: 15, r: 0.42, col: '#707080', spd: 2.4, dash: 11, cool: 2.6, drop: 'chitin', shape: 'beetle' },
  spitter: { n: 'Cuspidor de esporos', ai: 'shooter', hp: 12, dmg: 8, r: 0.42, col: '#a060d0', spd: 0, pdmg: 10, pspd: 6, rate: 2.2, pcol: '#d8a0ff', snd: 'spore', drop: 'seed', shape: 'spitter' },
  crab: { n: 'Caranguejo de lodo', ai: 'walk', hp: 20, dmg: 15, r: 0.44, col: '#3a8a9a', spd: 3.2, armor: 0.35, drop: 'chitin', shape: 'crab' },
  wisp: { n: 'Espectro de cristal', ai: 'ghost', hp: 18, dmg: 18, r: 0.36, col: '#9ff8ff', spd: 3, drop: 'crystal', shape: 'wisp', glow: 2.5 },
  salamander: { n: 'Salamandra ígnea', ai: 'shooter', hp: 28, dmg: 20, r: 0.38, col: '#ff6a2a', spd: 3.2, pdmg: 16, pspd: 8, rate: 2.6, pcol: '#ffb040', snd: 'fire', drop: 'obsidian', dropP: 0.6, shape: 'seg', seg: 5, glow: 2.5 },
  // superfície (à noite)
  shade: { n: 'Sombra errante', ai: 'walk', hp: 9, dmg: 8, r: 0.36, col: '#3a3060', spd: 3.4, drop: 'gel', dropP: 0.5, shape: 'wisp', nocturnal: true },
  bog_slime: { n: 'Gosma do pântano', ai: 'hop', hp: 8, dmg: 9, r: 0.38, col: '#6a8a3a', spd: 5, drop: 'gel' },
  scorpion: { n: 'Escorpião', ai: 'charge', hp: 14, dmg: 12, r: 0.38, col: '#c89a50', spd: 2.6, dash: 10, cool: 2.4, drop: 'chitin', shape: 'beetle' },
  frost_wolf: { n: 'Lobo de gelo', ai: 'charge', hp: 16, dmg: 13, r: 0.4, col: '#d8e8f4', spd: 3.6, dash: 12, cool: 2.2, drop: 'raw_meat', shape: 'beetle', nocturnal: true },
  // animais (passivos): food = isca/comida para reproduzir · loot = [id, mín, máx] · lays = produz sozinho
  cow: { n: 'Vaca', ai: 'graze', passive: true, hp: 10, dmg: 0, r: 0.46, col: '#f0ece4', spd: 1.6, food: 'wheat', loot: [['raw_meat', 1, 3], ['leather', 1, 2]], shape: 'cow', voice: 'moo' },
  sheep: { n: 'Ovelha', ai: 'graze', passive: true, hp: 8, dmg: 0, r: 0.42, col: '#f4f2ee', spd: 1.5, food: 'wheat', loot: [['wool', 1, 2], ['raw_meat', 1, 2]], shape: 'sheep', voice: 'baa' },
  chicken: { n: 'Galinha', ai: 'graze', passive: true, hp: 4, dmg: 0, r: 0.28, col: '#fbfbf6', spd: 2, food: 'wheat_seed', loot: [['raw_meat', 1, 1]], lays: { id: 'egg', every: [50, 90] }, shape: 'chicken', voice: 'cluck' },
  rabbit: { n: 'Coelho', ai: 'graze', passive: true, skittish: true, hp: 3, dmg: 0, r: 0.26, col: '#a8805a', spd: 3.2, food: 'carrot', loot: [['raw_meat', 1, 1]], shape: 'rabbit', voice: 'squeak' },
  // chefes (guardiões da caverna)
  boss: { n: 'Glutão, a Gosma Ancestral', ai: 'hop', boss: true, hp: 260, dmg: 26, r: 1.3, col: '#9b5fe0', spd: 9, minion: ['slime', 'slime2'], drops: [['trophy', 1], ['gel', 15], ['crystal', 6], ['iron_bar', 6]] },
  boss_fungus: { n: 'Micélia, a Mãe-Fungo', ai: 'b_fungus', boss: true, hp: 420, dmg: 24, r: 1.3, col: '#b070f0', spd: 1.6, shape: 'shroom', drops: [['spore_staff', 1], ['seed', 10], ['wood', 20], ['gold_ore', 6]] },
  boss_eel: { n: 'Enguia Abissal', ai: 'b_eel', boss: true, hp: 540, dmg: 30, r: 0.85, col: '#2a9aa8', spd: 6, dash: 16, shape: 'seg', seg: 9, drops: [['fin_boots', 1], ['gold_bar', 8], ['chitin', 10]] },
  boss_crystal: { n: 'Colosso de Cristal', ai: 'b_crystal', boss: true, hp: 820, dmg: 34, r: 1.4, col: '#7ff3ff', spd: 1.4, shape: 'crystal', glow: 4, drops: [['crystal_staff', 1], ['crystal', 20], ['amulet', 1]] },
  boss_magma: { n: 'Ígnea, Coração do Magma', ai: 'b_magma', boss: true, hp: 1100, dmg: 40, r: 1.4, col: '#ff5a1a', spd: 1.3, shape: 'magma', glow: 4, drops: [['magma_core', 1], ['obsidian', 15], ['gold_bar', 10], ['amulet', 1]] },
};

// Guardiões da caverna além do Glutão: [id, bioma, raio mínimo, raio máximo]
export const BOSS_SITES = [['boss_fungus', 2, 48, 74], ['boss_eel', 3, 48, 74], ['boss_crystal', 4, 92, 116], ['boss_magma', 5, 92, 116]];
export const BOSS_ARENA_RADIUS = 8;
export const BOSS_LEASH = 30;

// Animais de dia, por bioma da superfície: [[id, peso], ...] (vazio = nenhum)
export const ANIMAL_SPAWN = [
  [['cow', 3], ['sheep', 2], ['chicken', 2], ['rabbit', 1]],
  [['rabbit', 2], ['chicken', 1], ['sheep', 1]],
  [['rabbit', 1]],
  [['rabbit', 2], ['sheep', 1]],
  [['chicken', 1]],
  [],
  [['sheep', 1]],
  [],
];
export const ANIMAL_CAP = 7;
export const BREED = { radius: 4, love: 15, cooldown: 60, growUp: 120, babyScale: 0.6 };

// Surgimento de hostis por camada e bioma: [[id, peso], ...]
export const SPAWN = {
  cave: [
    [['slime', 3], ['bat', 1.2]],
    [['slime2', 3], ['bat', 1.5], ['beetle', 1.6]],
    [['spore', 3], ['spitter', 1.6]],
    [['slime_w', 3], ['crab', 2]],
    [['slime3', 3], ['wisp', 2]],
    [['slime_l', 3], ['salamander', 2]],
  ],
  surface: [
    [['shade', 2], ['slime', 2]],
    [['shade', 3], ['slime', 1]],
    [['scorpion', 3], ['shade', 1]],
    [['frost_wolf', 3], ['shade', 1]],
    [['bog_slime', 3], ['shade', 1]],
    [['slime', 2], ['shade', 1]],
    [['frost_wolf', 1], ['shade', 2], ['beetle', 1]],
    [['shade', 1]],
  ],
};
