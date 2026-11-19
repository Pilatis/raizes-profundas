// Utilitários puros: matemática, aleatoriedade, ruído e cores.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const rand = (a, b) => a + Math.random() * (b - a);
export const chance = p => Math.random() < p;
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function mulberry(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash 2D estável em [0, 1). */
export function hash(x, y, s) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Ruído fractal (3 oitavas) normalizado em [0, 1]. */
export function fbm(x, y, s) {
  return (valueNoise(x, y, s) * 0.5 + valueNoise(x * 2, y * 2, s + 1) * 0.25 + valueNoise(x * 4, y * 4, s + 2) * 0.125) / 0.875;
}

/** Sorteia um id de uma tabela [[id, peso], ...]. */
export function pickWeighted(table) {
  let r = table.reduce((sum, e) => sum + e[1], 0) * Math.random();
  for (const [id, w] of table) {
    r -= w;
    if (r <= 0) return id;
  }
  return table[0][0];
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** Clareia/escurece uma cor hex. */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex).map(c => clamp(c + amt, 0, 255));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const shadeCache = new Map();
/** shade() com cache — use em loops de render. */
export function shadeCached(hex, amt) {
  const key = hex + amt;
  let c = shadeCache.get(key);
  if (!c) shadeCache.set(key, (c = shade(hex, amt)));
  return c;
}

/** Codifica Uint8Array em string compacta para o save (deslocado para evitar \0). */
export function encodeBytes(arr) {
  let s = '';
  for (let i = 0; i < arr.length; i += 8192) {
    s += String.fromCharCode.apply(null, Array.from(arr.subarray(i, i + 8192), v => v + 65));
  }
  return s;
}

export function decodeBytes(str) {
  const a = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) a[i] = str.charCodeAt(i) - 65;
  return a;
}
