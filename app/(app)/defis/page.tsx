'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useProfile } from '@/hooks/useProfile';
import { useChallenges, joinChallenge, leaveChallenge, createChallenge, deleteChallenge, fetchBoard, type Challenge } from '@/hooks/useChallenges';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { XpBar } from '@/components/hud/XpBar';
import { T } from '@/lib/tokens';
import { STAT_META } from '@/lib/engine/stats';
import type { StatKind } from '@/lib/types';

const CHALLENGE_STATS: StatKind[] = ['FORCE', 'DISCIPLINE', 'FOCUS', 'INTELLIGENCE', 'CREATIVITY', 'LEADERSHIP', 'MENTALITE', 'TECHNIQUE', 'SOCIAL'];
const DURATIONS = [7, 14, 21, 30, 60];

/** Jour du défi (1 = jour d'adhésion), plafonné à sa durée ; null s'il n'est pas rejoint. */
function challengeDay(c: Challenge, now = new Date()) {
  if (!c.joined_at) return null;
  const start = new Date(c.joined_at); start.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
}

const btn = (primary: boolean): React.CSSProperties => ({
  background: primary ? T.cyan : 'transparent', color: primary ? T.bg : T.cyan,
  border: `1px solid ${primary ? T.cyan : T.lineMid}`, padding: '10px 14px', minHeight: 44,
  fontFamily: T.mono, fontSize: 10, fontWeight: primary ? 700 : 400, letterSpacing: '0.2em', cursor: 'pointer',
  boxShadow: primary ? `0 0 10px ${T.cyanGlow}` : 'none',
});

export default function DefisPage() {
  const { profile, loading } = useProfile();
  const { challenges, error, loading: listLoading } = useChallenges();
  const [showCreate, setShowCreate] = useState(false);
  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;

  const mine = challenges.filter(c => c.joined_at);
  const others = challenges.filter(c => !c.joined_at);

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="DÉFIS COMMUNS" />
      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <HudPanel label="SYSTÈME · DÉFIS" glow={0.4}>
          <div style={{ padding: 16, fontSize: 13, color: T.textDim, lineHeight: 1.65 }}>
            Un objectif par jour, avec les autres joueurs. Rejoindre un défi crée un projet dans tes donjons et une quête chaque jour, à valider avant minuit. Une journée manquée passe par le bilan « Quelle est ton excuse ? ».
            <DataReadout size={9} color={T.textMute} style={{ display: 'block', marginTop: 10 }}>
              LES PARTICIPANTS VOIENT TON PSEUDO ET TES JOURS RÉUSSIS, RIEN D’AUTRE.
            </DataReadout>
          </div>
        </HudPanel>

        {error && <p role="alert" style={{ color: T.danger, fontSize: 13, margin: 0 }}>Les défis n’ont pas pu être chargés. Réessaie dans un instant.</p>}
        {listLoading && <DataReadout color={T.cyan}>CHARGEMENT DES DÉFIS…</DataReadout>}

        {mine.length > 0 && <Section title={`MES DÉFIS EN COURS · ${mine.length}`}>{mine.map(c => <ChallengeCard key={c.id} challenge={c} userId={profile.user_id} />)}</Section>}
        {others.length > 0 && <Section title={`DÉFIS DISPONIBLES · ${others.length}`}>{others.map(c => <ChallengeCard key={c.id} challenge={c} userId={profile.user_id} />)}</Section>}

        <button type="button" onClick={() => setShowCreate(s => !s)} style={{ ...btn(false), border: `1px dashed ${T.lineMid}`, padding: 14 }}>
          {showCreate ? '✕ ANNULER' : '+ CRÉER UN DÉFI'}
        </button>
        {showCreate && <ChallengeCreator userId={profile.user_id} onDone={() => setShowCreate(false)} />}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section>
    <DataReadout color={T.textDim} size={10} letterSpacing="0.28em" style={{ display: 'block', padding: '0 4px 8px' }}>{title}</DataReadout>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
  </section>;
}

function ChallengeCard({ challenge: c, userId }: { challenge: Challenge; userId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showBoard, setShowBoard] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const { data: board, error: boardError } = useSWR(showBoard ? ['challenge-board', c.id] : null, () => fetchBoard(c.id));
  const day = challengeDay(c);
  const finished = day !== null && day > c.duration_days;
  const me = board?.find(r => r.is_me);

  async function run(action: () => Promise<unknown>, failure: string) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError(e instanceof Error && e.message.startsWith('D’autres') ? e.message : failure); }
    finally { setBusy(false); }
  }

  return (
    <HudPanel thin glow={c.joined_at ? 0.35 : 0.15}>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {c.official && <DataReadout size={8} color={T.amber}>◆ OFFICIEL</DataReadout>}
          <DataReadout size={8} color={STAT_META[c.stat_kind].color}>{STAT_META[c.stat_kind].symbol} {STAT_META[c.stat_kind].label}</DataReadout>
          <DataReadout size={8} style={{ marginLeft: 'auto' }}>{c.members} PARTICIPANT{c.members > 1 ? 'S' : ''}</DataReadout>
        </div>
        <div style={{ fontFamily: T.display, fontSize: 17, color: T.text, letterSpacing: '0.03em' }}>{c.title}</div>
        <div style={{ fontSize: 13, color: T.cyan }}>Chaque jour : {c.daily_goal}</div>
        {c.description && <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>{c.description}</p>}
        <DataReadout size={9} color={T.textMute}>{c.duration_days} JOURS · {c.minutes} MIN PAR JOUR</DataReadout>

        {c.joined_at && day !== null && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <DataReadout size={9} color={finished ? T.green : T.cyan}>{finished ? 'DÉFI TERMINÉ' : `JOUR ${Math.max(1, day)} / ${c.duration_days}`}</DataReadout>
              {me && <DataReadout size={9} color={T.green}>{me.days_done} JOUR{me.days_done > 1 ? 'S' : ''} RÉUSSI{me.days_done > 1 ? 'S' : ''}</DataReadout>}
            </div>
            <XpBar current={Math.min(day, c.duration_days)} max={c.duration_days} height={3} />
          </div>
        )}

        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {!c.joined_at && <button type="button" disabled={busy} onClick={() => run(() => joinChallenge(c.id), 'Impossible de rejoindre ce défi. Réessaie.')} style={btn(true)}>{busy ? '…' : 'REJOINDRE'}</button>}
          {c.joined_at && c.project_id && <Link href="/quests/" style={{ ...btn(true), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>QUÊTE DU JOUR</Link>}
          <button type="button" aria-expanded={showBoard} onClick={() => setShowBoard(s => !s)} style={btn(false)}>{showBoard ? '▲ CLASSEMENT' : '▼ CLASSEMENT'}</button>
          {c.joined_at && !confirmLeave && <button type="button" onClick={() => setConfirmLeave(true)} style={{ ...btn(false), color: T.textMute, borderColor: T.line }}>QUITTER</button>}
          {c.mine && !c.joined_at && <button type="button" disabled={busy} onClick={() => run(() => deleteChallenge(c.id), 'Le défi n’a pas pu être supprimé.')} style={{ ...btn(false), color: T.danger, borderColor: `${T.danger}55` }}>SUPPRIMER</button>}
        </div>
        {confirmLeave && (
          <div role="group" aria-label="Quitter le défi" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <DataReadout size={8} color={T.danger} style={{ flexBasis: '100%' }}>QUITTER ? PLUS DE QUÊTE QUOTIDIENNE. LE PROJET RESTE DANS TES DONJONS.</DataReadout>
            <button type="button" disabled={busy} onClick={() => run(() => leaveChallenge(c.id, userId), 'Impossible de quitter le défi.')} style={{ ...btn(false), color: T.danger, borderColor: T.danger }}>CONFIRMER</button>
            <button type="button" onClick={() => setConfirmLeave(false)} style={btn(false)}>ANNULER</button>
          </div>
        )}

        {showBoard && (
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 10, marginTop: 4 }}>
            {boardError && <DataReadout color={T.danger}>CLASSEMENT INDISPONIBLE.</DataReadout>}
            {!board && !boardError && <DataReadout color={T.textDim}>CHARGEMENT…</DataReadout>}
            {board && board.length === 0 && <DataReadout color={T.textMute}>PERSONNE N’A ENCORE REJOINT CE DÉFI. SOIS LE PREMIER.</DataReadout>}
            {board && board.length > 0 && (
              <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {board.map((r, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', background: r.is_me ? 'rgba(78,205,255,0.08)' : 'transparent', border: `1px solid ${r.is_me ? T.lineMid : 'transparent'}` }}>
                    <span style={{ fontFamily: T.rank, fontSize: 14, width: 26, color: i === 0 ? T.amber : T.textDim }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, color: T.text, overflowWrap: 'anywhere' }}>{r.display_name}{r.is_me ? ' (toi)' : ''}</span>
                    <DataReadout size={9} color={T.cyan}>{r.days_done} / {r.days_total} J</DataReadout>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </HudPanel>
  );
}

function ChallengeCreator({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [description, setDescription] = useState('');
  const [stat, setStat] = useState<StatKind>('FORCE');
  const [duration, setDuration] = useState(30);
  const [minutes, setMinutes] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field: React.CSSProperties = { background: 'rgba(78,205,255,0.04)', border: `1px solid ${T.lineMid}`, color: T.text, padding: '10px 12px', fontFamily: T.mono, fontSize: 12, width: '100%', boxSizing: 'border-box', marginTop: 6 };
  const valid = title.trim().length >= 3 && goal.trim().length >= 3;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setError('');
    try {
      await createChallenge({ title: title.trim(), daily_goal: goal.trim(), description: description.trim(), stat_kind: stat, duration_days: duration, minutes }, userId);
      onDone();
    } catch { setError('Le défi n’a pas pu être créé. Vérifie les champs et réessaie.'); }
    finally { setBusy(false); }
  }

  return (
    <HudPanel label="NOUVEAU DÉFI" glow={0.4}>
      <form onSubmit={submit} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 12, color: T.textDim }}>Nom du défi<input required maxLength={80} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex : Gainage 2 minutes" style={field} /></label>
        <label style={{ fontSize: 12, color: T.textDim }}>Objectif de chaque jour<input required maxLength={120} value={goal} onChange={e => setGoal(e.target.value)} placeholder="Ex : Tenir 2 minutes de gainage" style={field} /></label>
        <label style={{ fontSize: 12, color: T.textDim }}>Description (facultatif)<textarea maxLength={500} rows={3} value={description} onChange={e => setDescription(e.target.value)} style={{ ...field, resize: 'vertical' }} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          <label style={{ fontSize: 12, color: T.textDim }}>Compétence<select value={stat} onChange={e => setStat(e.target.value as StatKind)} style={field}>{CHALLENGE_STATS.map(s => <option key={s} value={s}>{STAT_META[s].label}</option>)}</select></label>
          <label style={{ fontSize: 12, color: T.textDim }}>Durée<select value={duration} onChange={e => setDuration(Number(e.target.value))} style={field}>{DURATIONS.map(d => <option key={d} value={d}>{d} jours</option>)}</select></label>
          <label style={{ fontSize: 12, color: T.textDim }}>Minutes par jour<input type="number" min={5} max={240} value={minutes} onChange={e => setMinutes(Math.max(5, Math.min(240, Number(e.target.value) || 5)))} style={field} /></label>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: T.textMute, lineHeight: 1.6 }}>Le défi sera visible de tous les joueurs. Tu pourras le supprimer tant que personne d’autre ne l’a rejoint.</p>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
        <button type="submit" disabled={!valid || busy} style={{ ...btn(true), opacity: valid ? 1 : 0.5 }}>{busy ? 'CRÉATION…' : 'PUBLIER LE DÉFI'}</button>
      </form>
    </HudPanel>
  );
}
