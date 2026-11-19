// Colisão de círculos contra a grade de paredes do mundo ativo.
import { G } from '../core/state.js';
import { clamp } from '../core/util.js';

const STEP = 0.15; // passo máximo por iteração (evita atravessar paredes em alta velocidade)

/** passDoors: moradores atravessam portas (eles as abrem). */
export function collides(cx, cy, r, passDoors = false) {
  const w = G.world;
  for (let ty = Math.floor(cy - r); ty <= Math.floor(cy + r); ty++) {
    for (let tx = Math.floor(cx - r); tx <= Math.floor(cx + r); tx++) {
      if (!(passDoors ? w.wallAt(tx, ty) : w.solidAt(tx, ty))) continue;
      const nx = clamp(cx, tx, tx + 1), ny = clamp(cy, ty, ty + 1);
      if ((cx - nx) ** 2 + (cy - ny) ** 2 < r * r) return true;
    }
  }
  return false;
}

/** Move eixo a eixo; devolve true se bateu em algo. */
export function moveCircle(e, dx, dy, r, passDoors = false) {
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / STEP) || 1;
  const sx = dx / steps, sy = dy / steps;
  let hit = false;
  for (let s = 0; s < steps; s++) {
    if (!collides(e.x + sx, e.y, r, passDoors)) e.x += sx; else hit = true;
    if (!collides(e.x, e.y + sy, r, passDoors)) e.y += sy; else hit = true;
  }
  return hit;
}

export function circleOverlapsTile(cx, cy, r, tx, ty) {
  const nx = clamp(cx, tx, tx + 1), ny = clamp(cy, ty, ty + 1);
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}
