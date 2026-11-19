// Barramento de eventos mínimo: desacopla a lógica do jogo da interface.
// Eventos usados: 'toast' (texto, chave?), 'inv', 'chest' (índice), 'world', 'settings'.

const handlers = new Map();

export function on(name, fn) {
  if (!handlers.has(name)) handlers.set(name, []);
  handlers.get(name).push(fn);
}

export function emit(name, ...args) {
  const list = handlers.get(name);
  if (list) for (const fn of list) fn(...args);
}
