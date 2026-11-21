'use client';

// Échelle des rangs de la page d'accueil : le visiteur choisit un type MBTI et voit les six
// titres réels (lib/engine/rankTitles.ts) qu'il porterait de E à S.

import { useState, type CSSProperties } from 'react';
import { MBTI_GROUPS, MBTI_RANK_PROFILES, RANK_STAGES, type MbtiGroupKey, type StageLetter } from '@/lib/engine/rankTitles';
import type { MbtiType } from '@/lib/engine/mbtiClasses';
import { RankEmblem } from '@/components/hud/RankEmblem';
import s from './landing.module.css';

const LETTERS: StageLetter[] = ['E', 'D', 'C', 'B', 'A', 'S'];
const GROUP_ORDER: MbtiGroupKey[] = ['ANALYSTES', 'DIPLOMATES', 'SENTINELLES', 'EXPLORATEURS'];
export const GROUP_COLOR: Record<MbtiGroupKey, string> = {
  ANALYSTES: '#9B7CFF', DIPLOMATES: '#5CFFB2', SENTINELLES: '#4ECDFF', EXPLORATEURS: '#FFB23D',
};
const TYPES = Object.keys(MBTI_RANK_PROFILES) as MbtiType[];

export function RankLadder() {
  const [type, setType] = useState<MbtiType>('INFJ');
  const profile = MBTI_RANK_PROFILES[type];
  const accent = GROUP_COLOR[profile.group];

  return <div className={s.ladderWrap} style={{ '--accent': accent } as CSSProperties}>
    <div className={s.picker} role="group" aria-label="Choisis un type MBTI">
      {GROUP_ORDER.map(group => <div key={group} className={s.group}>
        <span className={s.groupLabel} style={{ color: GROUP_COLOR[group] }}>{MBTI_GROUPS[group].label.toUpperCase()}</span>
        <div className={s.types}>
          {TYPES.filter(t => MBTI_RANK_PROFILES[t].group === group).map(t =>
            <button key={t} type="button" className={s.typeBtn} aria-pressed={t === type} onClick={() => setType(t)}
              style={{ '--c': GROUP_COLOR[group] } as CSSProperties}>{t}</button>)}
        </div>
      </div>)}
    </div>

    <div aria-live="polite">
      <p className={s.ladderHead}><strong>{type}</strong><span>{profile.profile.toUpperCase()} · {MBTI_GROUPS[profile.group].label.toUpperCase()}</span></p>
      <ol className={s.stairs}>
        {LETTERS.map((letter, i) => <li key={letter} style={{ '--i': i } as CSSProperties}>
          <RankEmblem letter={letter} size={42} color={accent} glow={0.25 + i * 0.12} />
          <span className={s.stairRank}>RANG {letter}</span>
          <strong>{profile.titles[i]}</strong>
          <span className={s.stairDesc}>{RANK_STAGES[letter].desc}</span>
        </li>)}
      </ol>
    </div>
  </div>;
}
