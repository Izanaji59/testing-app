'use client';

import { useEffect, useRef } from 'react';

type Props = { level: number; color: string; width?: number; height?: number };

/**
 * Pile en 3D (canvas) : boîtier vu de trois quarts, borne sur le dessus, cinq segments
 * qui s'allument de bas en haut (le dernier partiellement). Les segments allumés respirent ;
 * à plat, le dernier vacille. Elle pivote un peu vers la souris. Image fixe si le mouvement est réduit.
 */
export function SocialBattery3D({ level, color, width = 96, height = 150 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(level);
  const shown = useRef(-1);
  target.current = Math.max(0, Math.min(100, level));

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || shown.current < 0) shown.current = reduce ? target.current : 0;
    const n = parseInt(color.slice(1), 16);
    const rgba = (a: number) => `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
    let raf = 0, last = 0, t = 0, visible = true, turn = 0, turnTarget = 0;

    function draw() {
      const c = ctx!;
      c.clearRect(0, 0, width, height);
      const bw = width * 0.5, bh = height * 0.66;
      const depth = width * (0.2 + 0.06 * turn);
      const dx = depth, dy = -depth * 0.55;
      const x0 = (width - bw - dx) / 2, y0 = height * 0.2 - dy;
      const fill = shown.current / 100;

      // Ombre au sol.
      const floor = c.createRadialGradient(x0 + bw / 2 + dx / 2, y0 + bh + 6, 1, x0 + bw / 2 + dx / 2, y0 + bh + 6, bw);
      floor.addColorStop(0, rgba(0.25)); floor.addColorStop(1, rgba(0));
      c.fillStyle = floor; c.beginPath(); c.ellipse(x0 + bw / 2 + dx / 2, y0 + bh + 6, bw, 6, 0, 0, Math.PI * 2); c.fill();

      const poly = (pts: number[][], fillStyle: string | CanvasGradient, stroke: string) => {
        c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
        c.fillStyle = fillStyle; c.fill(); c.strokeStyle = stroke; c.lineWidth = 1.2; c.stroke();
      };
      // Borne : petit cube sur le dessus.
      const tw = bw * 0.36, tx = x0 + (bw - tw) / 2 + dx / 2, ty = y0 + dy / 2, th = 7;
      poly([[tx, ty], [tx + tw, ty], [tx + tw, ty - th], [tx, ty - th]], 'rgba(8,14,26,.95)', rgba(0.7));
      poly([[tx, ty - th], [tx + tw, ty - th], [tx + tw + dx * 0.3, ty - th + dy * 0.3], [tx + dx * 0.3, ty - th + dy * 0.3]], 'rgba(14,24,40,.95)', rgba(0.7));
      // Boîtier : dessus, flanc, face.
      poly([[x0, y0], [x0 + bw, y0], [x0 + bw + dx, y0 + dy], [x0 + dx, y0 + dy]], 'rgba(14,24,40,.92)', rgba(0.75));
      const side = c.createLinearGradient(x0 + bw, 0, x0 + bw + dx, 0);
      side.addColorStop(0, 'rgba(6,10,20,.95)'); side.addColorStop(1, 'rgba(10,18,32,.9)');
      poly([[x0 + bw, y0], [x0 + bw + dx, y0 + dy], [x0 + bw + dx, y0 + bh + dy], [x0 + bw, y0 + bh]], side, rgba(0.55));
      poly([[x0, y0], [x0 + bw, y0], [x0 + bw, y0 + bh], [x0, y0 + bh]], 'rgba(5,9,18,.92)', rgba(0.85));

      // Cinq segments, de bas en haut ; leur tranche se voit sur le flanc.
      const pad = 5, gap = 4, segH = (bh - pad * 2 - gap * 4) / 5;
      for (let i = 0; i < 5; i++) {
        const sy = y0 + bh - pad - (i + 1) * segH - i * gap;
        const part = Math.max(0, Math.min(1, fill * 5 - i));
        const flicker = fill < 0.2 && i === 0 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 7)) : 1;
        const breathe = 0.8 + 0.2 * Math.sin(t * 2 + i * 0.6);
        c.fillStyle = 'rgba(78,205,255,0.04)';
        c.fillRect(x0 + pad, sy, bw - pad * 2, segH);
        if (part > 0) {
          const h = segH * part;
          c.save();
          c.shadowColor = rgba(0.9); c.shadowBlur = 10 * breathe * flicker;
          const g = c.createLinearGradient(0, sy + segH - h, 0, sy + segH);
          g.addColorStop(0, rgba(0.95 * flicker)); g.addColorStop(1, rgba(0.6 * flicker));
          c.fillStyle = g;
          c.fillRect(x0 + pad, sy + segH - h, bw - pad * 2, h);
          c.restore();
          // Tranche du segment sur le flanc.
          c.fillStyle = rgba(0.28 * flicker);
          c.beginPath();
          c.moveTo(x0 + bw, sy + segH - h); c.lineTo(x0 + bw + dx * 0.7, sy + segH - h + dy * 0.7);
          c.lineTo(x0 + bw + dx * 0.7, sy + segH + dy * 0.7); c.lineTo(x0 + bw, sy + segH); c.closePath(); c.fill();
        }
        c.strokeStyle = rgba(0.3); c.lineWidth = 1;
        c.strokeRect(x0 + pad + 0.5, sy + 0.5, bw - pad * 2 - 1, segH - 1);
      }
      // Reflet vertical sur la face.
      const shine = c.createLinearGradient(0, y0, 0, y0 + bh);
      shine.addColorStop(0, 'rgba(255,255,255,0)'); shine.addColorStop(0.35, 'rgba(255,255,255,0.18)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = shine; c.fillRect(x0 + 2.5, y0 + 4, 2, bh - 8);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 40) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      t += dt;
      shown.current += (target.current - shown.current) * Math.min(1, dt * 2.5);
      turn += (turnTarget - turn) * Math.min(1, dt * 3);
      draw();
    }

    if (reduce) { draw(); return; }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = cv.getBoundingClientRect();
      turnTarget = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 400));
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, [color, width, height, level]);

  return <canvas ref={canvas} aria-hidden="true" style={{ width, height, display: 'block', flexShrink: 0 }} />;
}
