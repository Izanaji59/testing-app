'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { DungeonGate } from '@/components/hud/DungeonGate';
import { T, EASE } from '@/lib/tokens';
import { STAT_META } from '@/lib/engine/stats';
import type { DifficultyTier, StatKind } from '@/lib/types';

export type DungeonClearDetail = { title: string; amount: number; shares: Array<{ kind: StatKind; xp: number }>; tier: DifficultyTier };
const EVENT = 'grind:dungeon-cleared';

/** Lance la cinématique de fin de donjon (l'hôte est posé une fois dans le layout). */
export function announceDungeonCleared(detail: DungeonClearDetail) {
  window.dispatchEvent(new CustomEvent<DungeonClearDetail>(EVENT, { detail }));
}

/** Compteur qui monte jusqu'à sa valeur. */
function CountUp({ value, delay }: { value: number; delay: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const step = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / 900));
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, delay]);
  return <>{shown.toLocaleString('fr-FR')}</>;
}

/**
 * Hôte de la cinématique : le portail du donjon s'effondre sur lui-même, un éclair,
 * puis la fenêtre du Système annonce le butin, stat par stat.
 */
export function DungeonClearHost() {
  const reduce = useReducedMotion();
  const [detail, setDetail] = useState<DungeonClearDetail | null>(null);
  const [stage, setStage] = useState<'collapse' | 'reward'>('collapse');
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const on = (e: Event) => { setDetail((e as CustomEvent<DungeonClearDetail>).detail); setStage(reduce ? 'reward' : 'collapse'); };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [reduce]);

  useEffect(() => {
    if (!detail) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setDetail(null); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [detail]);

  useEffect(() => { if (stage === 'reward') button.current?.focus(); }, [stage, detail]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {detail && (
        <motion.div
          role="dialog" aria-modal="true" aria-labelledby="dungeon-clear-title"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'grid', placeItems: 'center', padding: 16, background: 'radial-gradient(ellipse at 50% 45%, rgba(10, 24, 48, 0.94), rgba(2, 4, 10, 0.97) 70%)' }}
        >
          {stage === 'collapse' ? (
            <div aria-hidden="true">
              <DungeonGate tier={detail.tier} intensity={1} width={220} height={270} collapse onCollapsed={() => setStage('reward')} />
            </div>
          ) : (
            <>
              {!reduce && (
                <motion.div
                  aria-hidden="true"
                  initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 3.2, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }}
                  style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${T.cyanHi}, ${T.cyan}55 40%, transparent 70%)`, pointerEvents: 'none' }}
                />
              )}
              <motion.div
                initial={reduce ? false : { opacity: 0, rotateX: -35, scaleY: 0.1 }}
                animate={{ opacity: 1, rotateX: 0, scaleY: 1 }}
                transition={{ duration: 0.6, ease: EASE.outExpo, delay: 0.15 }}
                style={{ transformPerspective: 900, width: 'min(420px, 100%)', border: `1px solid ${T.lineHot}`, background: 'rgba(6, 12, 26, 0.92)', boxShadow: `0 0 50px ${T.cyanGlow}, inset 0 0 40px rgba(78, 205, 255, 0.06)`, padding: '22px 20px', textAlign: 'center', color: T.text }}
              >
                <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.4em', color: T.cyan }}>[ SYSTÈME ]</div>
                <h2 id="dungeon-clear-title" style={{ fontFamily: T.rank, fontSize: 26, letterSpacing: '0.12em', margin: '14px 0 6px', textShadow: `0 0 18px ${T.cyanGlow}` }}>DONJON NETTOYÉ</h2>
                <p style={{ margin: 0, fontSize: 13, color: T.textDim, overflowWrap: 'anywhere' }}>{detail.title}</p>
                <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${T.lineHot}, transparent)`, margin: '18px 0' }} />
                {detail.amount > 0 ? (
                  <>
                    <div style={{ fontFamily: T.mono, fontSize: 10, letterSpacing: '0.3em', color: T.amber }}>BUTIN RÉCUPÉRÉ</div>
                    <div style={{ fontFamily: T.rank, fontSize: 40, color: T.amber, margin: '8px 0 14px', textShadow: '0 0 18px rgba(255,178,61,.45)', fontVariantNumeric: 'tabular-nums' }}>
                      +<CountUp value={detail.amount} delay={reduce ? 0 : 0.4} /> XP
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detail.shares.filter(s => s.xp > 0).map((s, i) => (
                        <motion.li key={s.kind} initial={reduce ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.15 }}
                          style={{ display: 'flex', justifyContent: 'space-between', fontFamily: T.mono, fontSize: 12, letterSpacing: '0.16em', color: STAT_META[s.kind].color, borderBottom: `1px solid ${T.line}`, paddingBottom: 6 }}>
                          <span>{STAT_META[s.kind].symbol} {STAT_META[s.kind].label}</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>+<CountUp value={s.xp} delay={reduce ? 0 : 0.6 + i * 0.15} /></span>
                        </motion.li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: T.textDim }}>Aucune quête terminée dans ce donjon : pas de butin.</p>
                )}
                <button
                  ref={button} type="button" onClick={() => setDetail(null)}
                  style={{ marginTop: 20, minHeight: 44, padding: '10px 22px', background: T.cyan, color: T.bg, border: 'none', fontFamily: T.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.28em', cursor: 'pointer' }}
                >
                  CONTINUER
                </button>
              </motion.div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
