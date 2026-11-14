'use client';

import { useState } from 'react';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { STAT_META } from '@/lib/engine/stats';
import { LOOT_RATE, lootShares, readyToClose } from '@/lib/engine/statTiers';
import { useProjectLoot, completeProject } from '@/hooks/useProjectLoot';
import { DungeonGate } from '@/components/hud/DungeonGate';
import { announceDungeonCleared } from '@/components/core/DungeonClear';
import type { Project } from '@/lib/types';

const OPEN = ['ACTIVE', 'PLANNED', 'PAUSED'];

/**
 * Butin du donjon : l'XP des quêtes terminées s'accumule (taux selon la difficulté du projet)
 * et se verse d'un coup dans les stats du donjon quand le joueur le termine.
 */
export function ProjectLoot({ project, questCount }: { project: Project; questCount?: { total: number; done: number } }) {
  const { loot, ready } = useProjectLoot();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (project.title === 'Quêtes flash' || !ready) return null;

  const l = loot[project.id];
  const open = OPEN.includes(project.status);
  if (!open && !l?.paid_xp) return null;

  const amount = open ? (l?.loot_xp ?? 0) : (l?.paid_xp ?? 0);
  const shares = lootShares(amount, project).filter(s => s.xp > 0);
  const rate = Math.round((l?.rate ?? LOOT_RATE[project.difficulty ?? 'NOTABLE']) * 100);
  const total = questCount?.total ?? 0;
  const left = Math.max(0, total - (questCount?.done ?? 0));
  const ripe = open && readyToClose(project, total);
  const ended = !!project.ends_at && Date.parse(project.ends_at) <= Date.now();
  const tier = project.difficulty ?? 'NOTABLE';

  async function finish() {
    setBusy(true); setError('');
    try {
      await completeProject(project.id);
      setConfirm(false);
      announceDungeonCleared({ title: project.title, amount, shares: lootShares(amount, project), tier });
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Le donjon n’a pas pu être terminé. Réessaie.'); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ border: `1px solid ${ripe ? T.amber : T.line}`, padding: 12, margin: '10px 0', background: ripe ? 'rgba(255,178,61,0.06)' : 'rgba(78,205,255,0.03)' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <DungeonGate tier={tier} intensity={Math.min(1, amount / 400)} unstable={ripe} closed={!open} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <DataReadout size={9} color={open ? T.amber : T.green} style={{ display: 'block' }}>{open ? 'BUTIN EN RÉSERVE' : 'BUTIN RÉCOLTÉ'}</DataReadout>
          <span style={{ display: 'block', fontFamily: T.rank, fontSize: 22, margin: '4px 0', color: open ? T.amber : T.green, fontVariantNumeric: 'tabular-nums', textShadow: open ? '0 0 14px rgba(255,178,61,.35)' : 'none' }}>{amount.toLocaleString('fr-FR')} XP</span>
          {shares.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {shares.map(s => (
                <DataReadout key={s.kind} size={9} color={STAT_META[s.kind].color} letterSpacing="0.14em">{STAT_META[s.kind].short} +{s.xp.toLocaleString('fr-FR')}</DataReadout>
              ))}
            </div>
          )}
          <DataReadout size={8} color={T.textMute} style={{ display: 'block', marginTop: 4 }}>{open ? (ripe ? 'PORTAIL INSTABLE' : 'PORTAIL OUVERT') : 'PORTAIL FERMÉ'}</DataReadout>
        </div>
      </div>
      {open && (
        <p style={{ fontSize: 12, color: T.textDim, margin: '8px 0 0', lineHeight: 1.6 }}>
          {amount > 0
            ? `${rate} % de l’XP gagnée par les quêtes de ce donjon (${(l?.earned_xp ?? 0).toLocaleString('fr-FR')} XP), quelle que soit leur stat. Versé d’un coup quand tu le termines.`
            : `Chaque quête terminée ici remplit le butin : ${rate} % de son XP, versé dans les stats du donjon quand tu le termines.`}
          {ripe && (ended ? ' L’échéance est atteinte.' : ' Toutes les quêtes sont faites.')}
        </p>
      )}

      {open && !confirm && (
        <button type="button" onClick={() => setConfirm(true)} style={ripe ? primary : ghost}>
          TERMINER LE DONJON
        </button>
      )}
      {open && confirm && (
        <div role="group" aria-label={`Terminer ${project.title}`} style={{ marginTop: 10 }}>
          <p style={{ fontSize: 12, color: T.text, margin: '0 0 8px', lineHeight: 1.6 }}>
            {amount > 0 ? `Terminer « ${project.title} » et récolter ${amount.toLocaleString('fr-FR')} XP ?` : `Terminer « ${project.title} » ? Aucune quête terminée ici : pas de butin.`}
            {left > 0 && ` ${left} quête${left > 1 ? 's' : ''} non terminée${left > 1 ? 's restent' : ' reste'} dans ta liste.`}
            {' '}Un donjon terminé ne se rouvre pas.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={finish} disabled={busy} style={primary}>{busy ? '…' : 'CONFIRMER'}</button>
            <button type="button" onClick={() => setConfirm(false)} disabled={busy} style={ghost}>ANNULER</button>
          </div>
        </div>
      )}
      {error && <p role="alert" style={{ fontSize: 12, color: T.danger, margin: '8px 0 0' }}>{error}</p>}
    </div>
  );
}

const ghost: React.CSSProperties = { marginTop: 10, marginRight: 8, background: 'transparent', color: T.amber, border: `1px solid ${T.amber}88`, padding: '10px 14px', minHeight: 44, fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer' };
const primary: React.CSSProperties = { ...ghost, background: T.amber, color: T.bg, border: 'none', fontWeight: 700 };
