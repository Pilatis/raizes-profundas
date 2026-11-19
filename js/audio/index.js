// Fachada do áudio: o resto do jogo só usa estas funções.
import { initEngine } from './engine.js';
import { startSoundscape } from './soundscape.js';

export { sfx } from './sfx.js';
export { applyVolume, setSpace } from './engine.js';

/** Liga o áudio no primeiro gesto do usuário (exigência dos navegadores). */
export function initAudio() {
  if (initEngine()) startSoundscape();
}
