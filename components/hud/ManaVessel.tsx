'use client';

import { useEffect, useRef } from 'react';

type Props = {
  /** Niveau 0..100. */
  level: number;
  color: string;
  width?: number;
  height?: number;
};

/**
 * Fiole de mana en perspective (canvas) : cuve de verre, liquide dont la surface ondule,
 * bulles qui montent, reflet sur le verre. Le liquide rejoint son niveau en clapotant ;
 * sur ordinateur, il penche vers la souris. Image fixe si le mouvement est réduit.
 */
export function ManaVessel({ level, color, width = 112, height = 168 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(level);
  const slosh = useRef(0);
  const shown = useRef(-1); // niveau affiché, conservé d'un rendu à l'autre (-1 : pas encore dessiné)
  target.current = Math.max(0, Math.min(100, level));

  useEffect(() => { slosh.current = 5; }, [level]);

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const cx = width / 2, rx = width * 0.34, ry = rx * 0.3;
    const top = 20, bottom = height - 34;
    if (reduce || shown.current < 0) shown.current = reduce ? target.current : 0;
    let tilt = 0, tiltTarget = 0, phase = 0, raf = 0, last = 0, visible = true;
    const bubbles = Array.from({ length: 14 }, () => ({ x: Math.random() * 2 - 1, y: Math.random(), v: 0.08 + Math.random() * 0.12, r: 0.8 + Math.random() * 1.6 }));

    const rgba = (a: number) => {
      const n = parseInt(color.slice(1), 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    };
    // Point de la surface du liquide (ellipse ondulée, inclinée par `tilt`).
    const surface = (t: number, sy: number, amp: number) => {
      const x = cx + rx * Math.cos(t);
      const y = sy + ry * Math.sin(t) + amp * Math.sin(3 * t + phase) * 0.6 + Math.tan(tilt) * (x - cx);
      return [x, y] as const;
    };

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const fill = shown.current / 100;
      const sy = bottom - (bottom - top - 8) * fill;
      const amp = 1.1 + slosh.current;

      // Socle : anneaux qui projettent la fiole.
      for (let i = 0; i < 3; i++) {
        ctx!.beginPath();
        ctx!.ellipse(cx, bottom + 12 + i * 4, rx * (1.25 + i * 0.18), ry * (1.25 + i * 0.18), 0, 0, Math.PI * 2);
        ctx!.strokeStyle = rgba(0.32 - i * 0.09);
        ctx!.lineWidth = 1;
        ctx!.stroke();
      }
      const base = ctx!.createRadialGradient(cx, bottom + 14, 2, cx, bottom + 14, rx * 1.6);
      base.addColorStop(0, rgba(0.35)); base.addColorStop(1, rgba(0));
      ctx!.fillStyle = base;
      ctx!.beginPath(); ctx!.ellipse(cx, bottom + 14, rx * 1.6, ry * 1.6, 0, 0, Math.PI * 2); ctx!.fill();

      // Arrière du verre (arc supérieur du col, arc arrière du fond).
      ctx!.strokeStyle = rgba(0.18); ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.ellipse(cx, top, rx, ry, 0, Math.PI, Math.PI * 2); ctx!.stroke();
      ctx!.beginPath(); ctx!.ellipse(cx, bottom, rx, ry, 0, Math.PI, Math.PI * 2); ctx!.stroke();

      if (fill > 0.005) {
        // Corps du liquide.
        const body = ctx!.createLinearGradient(0, sy, 0, bottom + ry);
        body.addColorStop(0, rgba(0.55)); body.addColorStop(1, rgba(0.18));
        ctx!.beginPath();
        const [lx, ly] = surface(Math.PI, sy, amp);
        ctx!.moveTo(lx, ly);
        ctx!.lineTo(cx - rx, bottom);
        ctx!.ellipse(cx, bottom, rx, ry, 0, Math.PI, 0, true);
        const [rxp, ryp] = surface(0, sy, amp);
        ctx!.lineTo(rxp, ryp);
        for (let t = 0; t <= Math.PI + 0.001; t += Math.PI / 24) { const [x, y] = surface(t, sy, amp); ctx!.lineTo(x, y); }
        ctx!.closePath();
        ctx!.fillStyle = body; ctx!.fill();

        // Bulles de mana.
        for (const b of bubbles) {
          const by = bottom - (bottom - sy) * b.y;
          const bx = cx + b.x * rx * 0.78;
          ctx!.beginPath(); ctx!.arc(bx, by, b.r, 0, Math.PI * 2);
          ctx!.fillStyle = rgba(0.25 + 0.4 * b.y); ctx!.fill();
        }

        // Surface : ellipse ondulée, plus claire, avec un halo au-dessus.
        const halo = ctx!.createRadialGradient(cx, sy, 2, cx, sy, rx * 1.3);
        halo.addColorStop(0, rgba(0.28)); halo.addColorStop(1, rgba(0));
        ctx!.fillStyle = halo;
        ctx!.beginPath(); ctx!.ellipse(cx, sy, rx * 1.3, ry * 2.4, 0, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath();
        for (let t = 0; t <= Math.PI * 2 + 0.001; t += Math.PI / 32) { const [x, y] = surface(t, sy, amp); if (t === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y); }
        ctx!.closePath();
        ctx!.fillStyle = rgba(0.45); ctx!.fill();
        ctx!.strokeStyle = rgba(0.95); ctx!.lineWidth = 1.2; ctx!.stroke();
      }

      // Graduations sur le verre (25 / 50 / 75 %).
      for (const g of [0.25, 0.5, 0.75]) {
        const gy = bottom - (bottom - top - 8) * g;
        ctx!.beginPath(); ctx!.moveTo(cx + rx - 1, gy); ctx!.lineTo(cx + rx - 7, gy + 1.5);
        ctx!.strokeStyle = rgba(0.45); ctx!.lineWidth = 1; ctx!.stroke();
      }

      // Verre : bords, fond avant, col complet.
      const edge = ctx!.createLinearGradient(0, top, 0, bottom);
      edge.addColorStop(0, rgba(0.85)); edge.addColorStop(1, rgba(0.35));
      ctx!.strokeStyle = edge; ctx!.lineWidth = 1.4;
      ctx!.beginPath(); ctx!.moveTo(cx - rx, top); ctx!.lineTo(cx - rx, bottom); ctx!.moveTo(cx + rx, top); ctx!.lineTo(cx + rx, bottom); ctx!.stroke();
      ctx!.beginPath(); ctx!.ellipse(cx, bottom, rx, ry, 0, 0, Math.PI); ctx!.stroke();
      ctx!.strokeStyle = rgba(0.9);
      ctx!.beginPath(); ctx!.ellipse(cx, top, rx, ry, 0, 0, Math.PI); ctx!.stroke();
      // Bague du col.
      ctx!.strokeStyle = rgba(0.5);
      ctx!.beginPath(); ctx!.ellipse(cx, top - 5, rx * 0.86, ry * 0.86, 0, 0, Math.PI * 2); ctx!.stroke();

      // Reflet vertical sur le verre.
      const shine = ctx!.createLinearGradient(0, top, 0, bottom);
      shine.addColorStop(0, 'rgba(255,255,255,0)'); shine.addColorStop(0.3, 'rgba(255,255,255,0.22)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
      ctx!.fillStyle = shine;
      ctx!.fillRect(cx - rx * 0.66, top + 6, 2.5, bottom - top - 12);
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 33) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      shown.current += (target.current - shown.current) * Math.min(1, dt * 2.2);
      tilt += (tiltTarget - tilt) * Math.min(1, dt * 4);
      slosh.current *= Math.pow(0.35, dt);
      phase += dt * 2.4;
      for (const b of bubbles) { b.y += b.v * dt; if (b.y > 1) { b.y = 0; b.x = Math.random() * 2 - 1; } }
      draw();
    }

    if (reduce) { draw(); return; }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = cv.getBoundingClientRect();
      tiltTarget = Math.max(-0.22, Math.min(0.22, ((e.clientX - (r.left + r.width / 2)) / 600)));
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, [color, width, height, level]);

  return <canvas ref={canvas} aria-hidden="true" style={{ width, height, display: 'block', flexShrink: 0 }} />;
}
