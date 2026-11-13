'use client';

// Arrivée par un lien de quête partagée (/quests/?partage=…) : la relever l'ajoute aux quêtes du jour.

import { useState } from 'react';
import { createQuestFlash } from '@/hooks/useQuests';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { STAT_META } from '@/lib/engine/stats';
import type { SharedQuest } from '@/lib/share';

export function SharedQuestOffer({ quest, onClose }: { quest: SharedQuest | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!quest) {
    return (
      <HudPanel label="QUÊTE PARTAGÉE" thin>
        <div style={{ padding: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: T.danger, flex: 1 }}>Ce lien de quête est incomplet ou abîmé.</span>
          <button type="button" onClick={onClose} style={btn(false)}>FERMER</button>
        </div>
      </HudPanel>
    );
  }

  const meta = DIFFICULTY_META[quest.tier];

  async function accept() {
    if (!quest || busy) return;
    setBusy(true); setError('');
    try {
      await createQuestFlash({ title: quest.title, project_id: null, estimated_minutes: quest.minutes, difficulty_tier: quest.tier, reward_stats: quest.stats });
      setDone(true);
    } catch {
      setError('La quête n’a pas pu être ajoutée. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <HudPanel label="SYSTÈME · QUÊTE PARTAGÉE" glow={0.6}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <DataReadout size={9} color={meta.color}>{meta.symbol} {meta.label}</DataReadout>
          <DataReadout size={9}>{quest.minutes} MIN</DataReadout>
          {quest.stats.map(s => <DataReadout key={s} size={9} color={STAT_META[s].color}>{STAT_META[s].symbol} {STAT_META[s].label}</DataReadout>)}
        </div>
        <div style={{ fontFamily: T.display, fontSize: 18, color: T.text, letterSpacing: '0.03em', overflowWrap: 'anywhere' }}>{quest.title}</div>
        {done ? (
          <>
            <p role="status" style={{ margin: 0, fontSize: 13, color: T.green }}>✓ Quête relevée : elle est dans tes quêtes du jour.</p>
            <button type="button" onClick={onClose} style={{ ...btn(false), alignSelf: 'flex-start' }}>FERMER</button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>Un joueur te lance cette quête. La relever l’ajoute à tes quêtes du jour, dans ton propre compte.</p>
            {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => void accept()} disabled={busy} style={btn(true)}>{busy ? '…' : '⚔ RELEVER LA QUÊTE'}</button>
              <button type="button" onClick={onClose} disabled={busy} style={btn(false)}>IGNORER</button>
            </div>
          </>
        )}
      </div>
    </HudPanel>
  );
}

const btn = (primary: boolean): React.CSSProperties => ({
  background: primary ? T.cyan : 'transparent', color: primary ? T.bg : T.cyan,
  border: `1px solid ${primary ? T.cyan : T.lineMid}`, padding: '10px 14px', minHeight: 44,
  fontFamily: T.mono, fontSize: 10, fontWeight: primary ? 700 : 400, letterSpacing: '0.2em', cursor: 'pointer',
  boxShadow: primary ? `0 0 10px ${T.cyanGlow}` : 'none',
});
