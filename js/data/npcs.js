// Vilas e moradores: profissões, trocas, pedidos e falas. Somente dados.

export const COIN = 'coin';

// Trocas: buy = o jogador compra (paga moedas) · sell = o jogador vende (recebe moedas)
// n = quantidade por troca · price = moedas · stock = trocas por dia
// quests: pedidos em sequência — want = itens pedidos · reward = itens dados
export const PROFESSIONS = {
  farmer: {
    title: 'Fazendeira', shirt: '#5a9a3e', hat: '#e0c060',
    offers: [
      { buy: 'wheat_seed', n: 4, price: 2, stock: 5 },
      { buy: 'carrot', n: 2, price: 2, stock: 5 },
      { buy: 'pumpkin_seed', n: 2, price: 3, stock: 3 },
      { buy: 'bread', n: 2, price: 3, stock: 4 },
      { sell: 'wheat', n: 6, price: 3, stock: 6 },
      { sell: 'carrot', n: 6, price: 2, stock: 6 },
      { sell: 'pumpkin', n: 1, price: 3, stock: 4 },
      { sell: 'egg', n: 4, price: 2, stock: 4 },
    ],
    quests: [
      { want: { wheat: 12 }, reward: { coin: 10, watering_can: 1 }, text: 'A colheita foi fraca este ano. Você me traria 12 trigos?' },
      { want: { pumpkin: 3 }, reward: { coin: 12, pumpkin_pie: 2 }, text: 'Quero fazer tortas para a festa da vila. Consegue 3 abóboras?' },
      { want: { egg: 6 }, reward: { coin: 8, bed: 1 }, text: 'As galinhas fugiram! Preciso de 6 ovos.' },
    ],
    greet: ['Bom dia! A terra está generosa hoje.', 'Cuidado com as plantações, viu?', 'Nada como pão fresquinho.'],
    talk: ['Solo perto da água já nasce regado — aproveite.', 'Vacas e ovelhas seguem quem segura trigo.', 'Abóboras demoram, mas valem cada moeda.'],
  },
  smith: {
    title: 'Ferreiro', shirt: '#6a6a78', hat: '#3a3a44',
    offers: [
      { buy: 'copper_bar', n: 2, price: 5, stock: 5 },
      { buy: 'iron_bar', n: 2, price: 9, stock: 4 },
      { buy: 'pick_copper', n: 1, price: 12, stock: 1 },
      { buy: 'pick_iron', n: 1, price: 28, stock: 1 },
      { buy: 'sword_iron', n: 1, price: 30, stock: 1 },
      { buy: 'armor_copper', n: 1, price: 25, stock: 1 },
      { buy: 'armor_iron', n: 1, price: 48, stock: 1 },
      { sell: 'copper_ore', n: 4, price: 4, stock: 6 },
      { sell: 'iron_ore', n: 4, price: 6, stock: 6 },
      { sell: 'gold_ore', n: 2, price: 6, stock: 4 },
    ],
    quests: [
      { want: { copper_ore: 10 }, reward: { coin: 12, pick_copper: 1 }, text: 'Meu estoque de cobre acabou. Traga 10 minérios de cobre.' },
      { want: { iron_ore: 10 }, reward: { coin: 20, armor_copper: 1 }, text: 'Encomenda grande da capital: preciso de 10 minérios de ferro.' },
      { want: { gold_ore: 6 }, reward: { coin: 30, pick_gold: 1 }, text: 'Dizem que há ouro nas profundezas. Me traga 6 minérios.' },
    ],
    greet: ['O fogo da forja nunca apaga.', 'Precisa de uma ferramenta melhor?', 'Hmpf. Fale logo, o ferro esfria.'],
    talk: ['Ferro só se minera com picareta de cobre.', 'A obsidiana do Ermo de Brasa exige uma picareta de ouro.', 'Uma boa armadura salva mais vidas que uma boa espada.'],
  },
  merchant: {
    title: 'Mercador', shirt: '#8a4ac8', hat: '#ffd24a',
    offers: [
      { buy: 'torch', n: 6, price: 2, stock: 6 },
      { buy: 'lantern', n: 1, price: 6, stock: 3 },
      { buy: 'chest', n: 1, price: 6, stock: 2 },
      { buy: 'glass', n: 4, price: 4, stock: 3 },
      { buy: 'amulet', n: 1, price: 45, stock: 1 },
      { sell: 'gel', n: 5, price: 3, stock: 6 },
      { sell: 'crystal', n: 2, price: 6, stock: 5 },
      { sell: 'obsidian', n: 2, price: 8, stock: 4 },
      { sell: 'trophy', n: 1, price: 50, stock: 1 },
    ],
    quests: [
      { want: { gel: 15 }, reward: { coin: 10, lantern: 2 }, text: 'Gel de gosma vende bem na cidade. Me arruma 15?' },
      { want: { crystal: 8 }, reward: { coin: 25, amulet: 1 }, text: 'Um cliente quer cristais do Abismo. Traga 8 e te dou algo raro.' },
      { want: { obsidian: 6 }, reward: { coin: 40, magma_core: 1 }, text: 'Obsidiana pura... 6 pedaços e eu te mostro um tesouro antigo.' },
    ],
    greet: ['Olá, viajante! Tudo tem seu preço.', 'Produtos de todo o reino, só aqui!', 'Moedas tilintando são música para mim.'],
    talk: ['Baús de tesouro nas cavernas às vezes guardam moedas.', 'Os guardiões das profundezas guardam riquezas incríveis.', 'Venda o que sobra — espaço na mochila também é dinheiro.'],
  },
  hunter: {
    title: 'Caçadora', shirt: '#8a5a2a', hat: '#3a6a3a',
    offers: [
      { buy: 'cooked_meat', n: 2, price: 3, stock: 4 },
      { buy: 'leather', n: 2, price: 4, stock: 4 },
      { buy: 'armor_leather', n: 1, price: 10, stock: 1 },
      { buy: 'sword_copper', n: 1, price: 15, stock: 1 },
      { sell: 'raw_meat', n: 3, price: 3, stock: 6 },
      { sell: 'wool', n: 3, price: 2, stock: 6 },
      { sell: 'chitin', n: 3, price: 4, stock: 5 },
      { sell: 'leather', n: 2, price: 3, stock: 5 },
    ],
    quests: [
      { want: { raw_meat: 8 }, reward: { coin: 8, armor_leather: 1 }, text: 'O inverno vem aí. Preciso de 8 carnes cruas para defumar.' },
      { want: { chitin: 8 }, reward: { coin: 15, armor_chitin: 1 }, text: 'Carapaças de besouro dão ótimas armaduras. Traga 8 quitinas.' },
      { want: { wool: 6 }, reward: { coin: 10, banner: 2 }, text: 'Quero novos estandartes para a vila. 6 lãs, por favor.' },
    ],
    greet: ['Silêncio... ouviu isso?', 'A noite pertence às sombras. Fique perto da luz.', 'Rastros frescos de lobo por aqui.'],
    talk: ['Lobos de gelo só caçam à noite na taiga.', 'Escorpiões preparam o bote antes de atacar — desvie!', 'Coelhos fogem, mas seguem quem segura uma cenoura.'],
  },
};

export const VILLAGERS_PER_VILLAGE = 4; // uma de cada profissão
export const VILLAGE_COUNT = 3;
export const VILLAGE_RADIUS = 11;
export const VILLAGE_BIOMES = [0, 1, 2, 3];     // planície, floresta, deserto, taiga
export const VILLAGE_MIN_SPAWN_DIST = 35;
export const VILLAGE_MIN_GAP = 50;

export const VILLAGE_NAMES = ['Vila Carvalho', 'Pedra Mansa', 'Vale do Trigo', 'Recanto Frio', 'Poço Fundo', 'Brisa Alta', 'Monte Sereno', 'Areia Dourada'];
export const NPC_NAMES = ['Ana', 'Bento', 'Clara', 'Davi', 'Elisa', 'Fábio', 'Gabi', 'Heitor', 'Iara', 'João', 'Lia', 'Mateus', 'Nina', 'Otto', 'Paula', 'Rui', 'Sofia', 'Tomás', 'Vera', 'Yuri'];

// Material das casas por bioma: [parede, piso]
export const HOUSE_STYLE = { 0: [22, 12], 1: [22, 12], 2: [23, 13], 3: [22, 12] };
export const PATH_FLOOR = 16;
