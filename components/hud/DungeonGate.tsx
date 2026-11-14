'use client';

import { useEffect, useRef } from 'react';
import type { DifficultyTier } from '@/lib/types';

/** Couleur du portail selon la difficulté : bleu ordinaire, violet dangereux, rouge pour les légendaires. */
export const GATE_COLOR: Record<DifficultyTier, string> = {
  TRIVIAL: '#4ECDFF', ROUTINE: '#4ECDFF', NOTABLE: '#6FA8FF', HARD: '#9B7CFF', LEGENDARY: '#FF5577',
};

type Props = {
  tier: DifficultyTier;
  /** 0..1 : plus il y a de butin, plus le portail est dense. */
  intensity?: number;
  /** Prêt à être fermé : le portail devient instable. */
  unstable?: boolean;
  /** Donjon terminé : il ne reste qu'une faille éteinte. */
  closed?: boolean;
  /** Le portail s'effondre sur lui-même, puis appelle onCollapsed. */
  collapse?: boolean;
  onCollapsed?: () => void;
  width?: number;
  height?: number;
};

/**
 * Portail de donjon en perspective (canvas) : ovale vertical qui flotte au-dessus de son
 * ombre, bras de lumière en spirale, particules aspirées vers un cœur noir. Il pivote
 * légèrement sur lui-même et vers la souris. Image fixe si le mouvement est réduit.
 */
export function DungeonGate({ tier, intensity = 0.4, unstable = false, closed = false, collapse = false, onCollapsed, width = 76, height = 96 }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const done = useRef(onCollapsed);
  done.current = onCollapsed;

  useEffect(() => {
    const cv = canvas.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(width * dpr); cv.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = parseInt(GATE_COLOR[tier].slice(1), 16);
    const rgba = (a: number) => `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
    const level = Math.max(0, Math.min(1, intensity));
    const cx = width / 2, cy = height * 0.44, R = width * 0.34, Rv = height * 0.36;
    const particles = Array.from({ length: 10 + Math.round(level * 22) }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random() }));
    let raf = 0, last = 0, t = 0.8, visible = true, yaw = 0, yawTarget = 0, started = 0, collapsedSent = false;

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const p = collapse && started ? Math.min(1, (performance.now() - started) / 1100) : 0;
      const scale = collapse ? Math.pow(1 - p, 1.6) : 1;
      const bob = Math.sin(t * 1.3) * (closed ? 0.5 : 2);
      const sx = Math.cos(yaw + Math.sin(t * 0.45) * 0.22);
      const jitter = unstable ? (Math.random() - 0.5) * 1.6 : 0;
      const y0 = cy + bob;

      // Ombre au sol : le portail flotte.
      const floor = ctx!.createRadialGradient(cx, height - 9, 1, cx, height - 9, R * 1.1);
      floor.addColorStop(0, rgba(closed ? 0.12 : 0.38 * scale + 0.05)); floor.addColorStop(1, rgba(0));
      ctx!.fillStyle = floor;
      ctx!.beginPath(); ctx!.ellipse(cx, height - 9, R * 1.1 * (1 - bob / 30), 5, 0, 0, Math.PI * 2); ctx!.fill();

      if (closed) {
        // Faille refermée : un trait vertical presque éteint.
        const slit = ctx!.createLinearGradient(0, y0 - Rv * 0.7, 0, y0 + Rv * 0.7);
        slit.addColorStop(0, rgba(0)); slit.addColorStop(0.5, rgba(0.55)); slit.addColorStop(1, rgba(0));
        ctx!.strokeStyle = slit; ctx!.lineWidth = 1.5;
        ctx!.beginPath(); ctx!.moveTo(cx, y0 - Rv * 0.7); ctx!.lineTo(cx, y0 + Rv * 0.7); ctx!.stroke();
        return;
      }

      // Halo.
      const aura = ctx!.createRadialGradient(cx, y0, R * 0.2 * scale, cx, y0, Rv * 1.3 * scale + 1);
      aura.addColorStop(0, rgba((0.16 + 0.2 * level) * (unstable ? 0.8 + 0.4 * Math.sin(t * 9) : 1)));
      aura.addColorStop(1, rgba(0));
      ctx!.fillStyle = aura;
      ctx!.beginPath(); ctx!.ellipse(cx, y0, Rv * 1.3 * scale + 1, Rv * 1.3 * scale + 1, 0, 0, Math.PI * 2); ctx!.fill();

      // Bras de lumière en spirale vers le centre.
      const spin = t * (1.1 + p * 9);
      const arms = 4, steps = 24;
      for (let k = 0; k < arms; k++) {
        let px = 0, py = 0;
        for (let s = 0; s <= steps; s++) {
          const f = s / steps;
          const ang = spin + (k * Math.PI * 2) / arms + f * Math.PI * 2.3;
          const rad = (1 - 0.86 * f) * scale;
          const x = cx + R * rad * sx * Math.cos(ang) + jitter;
          const y = y0 + Rv * rad * Math.sin(ang);
          if (s > 0) {
            ctx!.strokeStyle = rgba((1 - f) * (0.75 + 0.25 * level));
            ctx!.lineWidth = 2.4 * (1 - f) + 0.3;
            ctx!.beginPath(); ctx!.moveTo(px, py); ctx!.lineTo(x, y); ctx!.stroke();
          }
          px = x; py = y;
        }
      }

      // Cœur : le noir du donjon.
      const core = ctx!.createRadialGradient(cx, y0, 0, cx, y0, R * 0.62 * scale + 0.5);
      core.addColorStop(0, 'rgba(1, 2, 8, 0.95)'); core.addColorStop(0.7, 'rgba(1, 2, 8, 0.55)'); core.addColorStop(1, 'rgba(1, 2, 8, 0)');
      ctx!.fillStyle = core;
      ctx!.beginPath(); ctx!.ellipse(cx, y0, R * 0.62 * scale * sx + 0.5, Rv * 0.62 * scale + 0.5, 0, 0, Math.PI * 2); ctx!.fill();

      // Particules aspirées.
      for (const q of particles) {
        const x = cx + R * q.r * scale * sx * Math.cos(q.a + spin * 0.6);
        const y = y0 + Rv * q.r * scale * Math.sin(q.a + spin * 0.6);
        ctx!.fillStyle = rgba(0.25 + 0.75 * q.r);
        ctx!.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
      }

      // Bord du portail (deux anneaux décalés : l'épaisseur).
      const pulse = unstable ? 0.65 + 0.35 * Math.sin(t * 10) : 0.85;
      ctx!.lineWidth = 1.8; ctx!.strokeStyle = rgba(pulse);
      ctx!.beginPath(); ctx!.ellipse(cx + jitter, y0, R * scale * sx + 0.5, Rv * scale + 0.5, 0, 0, Math.PI * 2); ctx!.stroke();
      ctx!.lineWidth = 1; ctx!.strokeStyle = rgba(pulse * 0.4);
      ctx!.beginPath(); ctx!.ellipse(cx - jitter + 1.5 * Math.sin(yaw), y0, (R * 1.08) * scale * sx + 0.5, (Rv * 1.06) * scale + 0.5, 0, 0, Math.PI * 2); ctx!.stroke();

      if (collapse && p >= 1 && !collapsedSent) { collapsedSent = true; done.current?.(); }
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || now - last < 33) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (collapse && !started) started = now;
      t += dt;
      yaw += (yawTarget - yaw) * Math.min(1, dt * 3);
      for (const q of particles) { q.r -= dt * (0.18 + 0.25 * level) * (unstable ? 1.6 : 1); q.a += dt * 1.2; if (q.r < 0.06) { q.r = 1.05; q.a = Math.random() * Math.PI * 2; } }
      draw();
    }

    if (reduce) {
      draw();
      if (collapse) done.current?.();
      return;
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(cv);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = cv.getBoundingClientRect();
      yawTarget = Math.max(-0.5, Math.min(0.5, (e.clientX - (r.left + r.width / 2)) / 500));
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener('pointermove', onMove); };
  }, [tier, intensity, unstable, closed, collapse, width, height]);

  return <canvas ref={canvas} aria-hidden="true" style={{ width, height, display: 'block', flexShrink: 0 }} />;
}
