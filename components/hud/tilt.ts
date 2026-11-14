// Inclinaison 3D vers la souris (jamais au doigt ni si le mouvement est réduit).
// Plus l'élément est large, plus l'angle est faible : les bords ne doivent pas s'envoler.

import type { PointerEvent } from 'react';

export function tiltTo(el: HTMLElement, e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const max = Math.min(6, 1400 / Math.max(r.width, 1));
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  el.style.transform = `perspective(1100px) rotateX(${(-y * max).toFixed(2)}deg) rotateY(${(x * max).toFixed(2)}deg)`;
  el.style.setProperty('--hud-depth', '1');
}

export function untilt(el: HTMLElement) {
  el.style.transform = '';
  el.style.setProperty('--hud-depth', '0');
}
