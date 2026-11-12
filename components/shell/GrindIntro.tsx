'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { HudPanel } from '@/components/hud/HudPanel';
import { T, EASE } from '@/lib/tokens';

const SEEN_KEY = 'grind-intro-seen-v1';
const LINES = [
  { text: '◆ SIGNAL DÉTECTÉ', accent: true },
  { text: 'Un nouveau joueur vient d’éveiller le système.' },
  { text: 'Ici, chaque objectif devient un donjon. Chaque action, une quête.' },
  { text: 'Ton niveau ne monte que si tu avances vraiment. Tes stats retombent si tu t’arrêtes.' },
  { text: 'Le système ne te demande qu’une chose.' },
  { text: 'Acceptes-tu de devenir le joueur de ta propre vie ?', accent: true },
];

export const introSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } };

/** Séquence d'éveil avant l'inscription. `replay` la relance même si elle a déjà été vue. */
export function GrindIntro({ replay, onChoose }: { replay: number; onChoose: (mode: 'login' | 'register') => void }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => { if (replay > 0 || !introSeen()) { setOpen(true); setShown(0); } }, [replay]);
  useEffect(() => {
    if (!open) return;
    if (reduce) { setShown(LINES.length); return; }
    if (shown >= LINES.length) return;
    const t = window.setTimeout(() => setShown(n => n + 1), shown === 0 ? 500 : 1300);
    return () => clearTimeout(t);
  }, [open, shown, reduce]);

  function close(mode: 'login' | 'register') {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch {}
    setOpen(false);
    onChoose(mode);
  }

  // Pas d'animation de sortie : un calque invisible resté en place bloquerait le formulaire.
  return (
    <>
      {open && (
        <motion.div
          role="dialog" aria-modal="true" aria-label="Éveil du système"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 20, background: 'radial-gradient(ellipse at 50% 40%, rgba(12,40,72,.92), rgba(2,4,10,.98) 70%)' }}
        >
          <button type="button" onClick={() => close('register')} style={{ position: 'absolute', top: 18, right: 18, background: 'transparent', border: `1px solid ${T.line}`, color: T.textDim, padding: '10px 14px', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer', minHeight: 44 }}>
            PASSER
          </button>
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.8, ease: EASE.outExpo }} style={{ width: '100%', maxWidth: 460 }}>
            <HudPanel label="SYSTÈME" glow={1}>
              <div style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 300 }} aria-live="polite">
                {LINES.slice(0, shown).map((line, i) => (
                  <motion.p
                    key={i}
                    initial={reduce ? false : { opacity: 0, x: -8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.6, ease: EASE.outExpo }}
                    style={{
                      margin: 0, lineHeight: 1.55,
                      fontFamily: line.accent ? T.mono : T.display,
                      fontSize: line.accent ? 13 : 15,
                      letterSpacing: line.accent ? '0.18em' : '0.03em',
                      color: line.accent ? T.cyan : T.text,
                      textShadow: line.accent ? `0 0 12px ${T.cyanGlow}` : undefined,
                    }}
                  >
                    {line.text}
                  </motion.p>
                ))}
                {shown >= LINES.length && (
                  <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <button type="button" autoFocus onClick={() => close('register')} style={{ background: T.cyan, color: T.bg, border: 'none', padding: 14, fontFamily: T.mono, fontWeight: 700, fontSize: 12, letterSpacing: '0.3em', cursor: 'pointer', boxShadow: `0 0 16px ${T.cyanGlow}` }}>
                      J’ACCEPTE
                    </button>
                    <button type="button" onClick={() => close('login')} style={{ background: 'transparent', color: T.textDim, border: `1px solid ${T.line}`, padding: 12, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer' }}>
                      J’AI DÉJÀ UN COMPTE
                    </button>
                  </motion.div>
                )}
              </div>
            </HudPanel>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
