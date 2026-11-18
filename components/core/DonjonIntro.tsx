'use client';

// Explication de la page Donjons : un donjon = une part de son identité ; ses quêtes = les moyens.
// Repliable, mémorisé sur l'appareil.

import { useEffect, useState } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';

const KEY = 'grind-donjon-intro-hidden';

const STEPS = [
  { tag: '01 · IDENTITÉ', title: 'Ouvre un donjon', text: 'Un domaine de ta vie et la personne que tu y es déjà en train de devenir : « Je suis quelqu’un qui prend soin de son corps. » Tu ne poursuis pas un objectif extérieur : tu affirmes qui tu es.' },
  { tag: '02 · MOYENS', title: 'Crée ses quêtes, dans le donjon', text: 'Une fois : émise une seule fois, à finir avant sa fin de transmission. Chaque jour : émise chaque matin jusqu’à la fin du donjon, comme un défi, mais pour toi seul.' },
  { tag: '03 · PROGRESSION', title: 'Le donjon avance avec ses quêtes', text: 'Chaque quête terminée le fait progresser et remplit son butin, versé quand tu le termines. Les objectifs se suivent d’eux-mêmes : ils découlent de qui tu es.' },
];

export function DonjonIntro({ mbti }: { mbti: string | null }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { try { setHidden(localStorage.getItem(KEY) === '1'); } catch {} }, []);
  const toggle = (value: boolean) => { setHidden(value); try { localStorage.setItem(KEY, value ? '1' : '0'); } catch {} };

  if (hidden) {
    return (
      <button type="button" onClick={() => toggle(false)} style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: T.textDim, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.2em', cursor: 'pointer', minHeight: 44, padding: 0 }}>
        ◇ COMMENT FONCTIONNENT LES DONJONS ?
      </button>
    );
  }

  return (
    <HudPanel label="SYSTÈME · TES DONJONS" glow={0.35}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.65 }}>
          Un donjon n’est pas un objectif à tenir : c’est une part de ton identité. Ta personnalité{mbti ? <> (<strong style={{ color: T.cyan }}>{mbti}</strong>)</> : ''} colore ta façon d’y arriver ; le Système te donne les moyens.
        </p>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {STEPS.map(s => (
            <li key={s.tag} style={{ border: `1px solid ${T.line}`, background: 'rgba(78,205,255,0.03)', padding: 12 }}>
              <DataReadout size={8} color={T.cyan} style={{ display: 'block' }}>{s.tag}</DataReadout>
              <div style={{ fontFamily: T.display, fontSize: 14, color: T.text, margin: '6px 0 4px' }}>{s.title}</div>
              <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>{s.text}</p>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => toggle(true)} style={{ alignSelf: 'flex-end', background: 'transparent', border: 'none', color: T.textMute, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', cursor: 'pointer', minHeight: 44 }}>
          J’AI COMPRIS · MASQUER
        </button>
      </div>
    </HudPanel>
  );
}
