'use client';

// Bilan du jour sur le centre de commande : « Qu'as-tu accompli aujourd'hui ? ».
// L'alerte monte en intensité au fil de la journée tant qu'aucune quête n'est validée.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuests, declareAccomplishment } from '@/hooks/useQuests';
import { useFocus } from '@/components/focus/FocusProvider';
import { DictationButton, appendDictation } from '@/components/core/DictationButton';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { alertLevel, completedToday, hoursBeforeMidnight, idleDays } from '@/lib/engine/dailyCheck';

const DURATIONS = [15, 30, 60, 90];

export function DailyCheck() {
  const { quests } = useQuests();
  const { openFocus } = useFocus();
  const [now, setNow] = useState<Date | null>(null);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [justDeclared, setJustDeclared] = useState(false);

  // L'heure locale n'est lue qu'après le montage (export statique : pas d'écart d'hydratation).
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return null;

  const doneToday = completedToday(quests, now);
  const open = quests.filter(q => q.status === 'PENDING' || q.status === 'IN_PROGRESS');
  const level = alertLevel(doneToday.length, now.getHours());
  const idle = idleDays(quests, now);
  const hoursLeft = hoursBeforeMidnight(now);

  async function declare() {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true); setError('');
    try {
      await declareAccomplishment(t.slice(0, 120), minutes);
      setTitle(''); setJustDeclared(true);
    } catch {
      setError('L’action n’a pas pu être enregistrée. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  if (level === 'done') {
    return (
      <HudPanel label="BILAN DU JOUR" glow={0.25}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <DataReadout size={10} color={T.green} letterSpacing="0.24em">
            ✓ JOURNÉE VALIDÉE · {doneToday.length} QUÊTE{doneToday.length > 1 ? 'S' : ''} ACCOMPLIE{doneToday.length > 1 ? 'S' : ''}
          </DataReadout>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {doneToday.slice(0, 3).map(q => (
              <li key={q.id} style={{ fontSize: 13, color: T.textDim, overflowWrap: 'anywhere' }}>
                <span aria-hidden="true" style={{ color: T.green, marginRight: 8 }}>▸</span>{q.title}
              </li>
            ))}
          </ul>
          {justDeclared && <p role="status" style={{ margin: 0, fontSize: 12, color: T.textDim }}>Action enregistrée. Le Système a crédité ton XP.</p>}
          {open.length > 0 && (
            <Link href="/quests/" style={{ ...ghost(T.cyan), alignSelf: 'flex-start' }}>
              ENCORE {open.length} QUÊTE{open.length > 1 ? 'S' : ''} OUVERTE{open.length > 1 ? 'S' : ''} →
            </Link>
          )}
        </div>
      </HudPanel>
    );
  }

  const color = level === 'danger' ? T.danger : level === 'warn' ? T.amber : T.cyan;
  const headline = level === 'danger'
    ? `ALERTE · AUCUNE QUÊTE ACCOMPLIE · ${hoursLeft} H AVANT MINUIT`
    : level === 'warn'
      ? 'AVERTISSEMENT · AUCUNE QUÊTE ACCOMPLIE AUJOURD’HUI'
      : 'BILAN DU JOUR · RIEN DE VALIDÉ POUR L’INSTANT';
  const message = level === 'danger'
    ? 'La journée se termine. Une seule action, même petite, suffit à ne pas la perdre.'
    : level === 'warn'
      ? 'La moitié de la journée est passée. Choisis la quête la plus courte et termine-la.'
      : 'Commence par la plus petite action possible : elle lance tout le reste.';

  return (
    <HudPanel label="SYSTÈME · QU’AS-TU FAIT AUJOURD’HUI ?" glow={level === 'calm' ? 0.2 : 0.6}>
      <div
        role={level === 'calm' ? undefined : 'alert'}
        style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: `3px solid ${color}`, background: level === 'calm' ? 'transparent' : `${color}0d` }}
      >
        <DataReadout size={10} color={color} letterSpacing="0.22em" style={{ textShadow: level === 'calm' ? undefined : `0 0 10px ${color}88` }}>
          {level === 'calm' ? '◇' : '⚠'} {headline}
        </DataReadout>
        <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55 }}>{message}</p>
        {idle !== null && idle >= 2 && (
          <DataReadout size={9} color={T.danger}>{idle} JOURS SANS QUÊTE ACCOMPLIE · LA CONSTANCE S’ÉRODE</DataReadout>
        )}

        <label htmlFor="daily-check-title" style={{ fontFamily: T.mono, fontSize: 9, color: T.textDim, letterSpacing: '0.2em' }}>
          TU AS DÉJÀ AVANCÉ ? DÉCLARE-LE
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
          <input
            id="daily-check-title"
            value={title}
            maxLength={120}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void declare(); }}
            placeholder="Ex. 30 minutes de révision, appel client…"
            style={{ flex: '1 1 220px', minWidth: 0, background: 'rgba(0,0,0,0.25)', border: `1px solid ${T.lineMid}`, color: T.text, padding: '10px 12px', fontSize: 14, minHeight: 44 }}
          />
          <DictationButton label="action accomplie" onText={text => setTitle(t => appendDictation(t, text))} />
          <label htmlFor="daily-check-minutes" style={srOnly}>Durée de l’action</label>
          <select
            id="daily-check-minutes"
            value={minutes}
            onChange={e => setMinutes(Number(e.target.value))}
            style={{ background: T.surf2, border: `1px solid ${T.lineMid}`, color: T.text, padding: '0 10px', minHeight: 44, fontFamily: T.mono, fontSize: 11 }}
          >
            {DURATIONS.map(d => <option key={d} value={d}>{d} MIN</option>)}
          </select>
          <button type="button" onClick={() => void declare()} disabled={busy || !title.trim()} style={{ ...ghost(color), opacity: busy || !title.trim() ? 0.5 : 1 }}>
            {busy ? '…' : 'VALIDER'}
          </button>
        </div>
        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => openFocus()} style={ghost(T.cyan)}>◎ LANCER UNE CONCENTRATION</button>
          <Link href={open.length ? '/quests/' : '/quests/?creer=1'} style={ghost(T.cyan)}>
            {open.length ? `▸ ${open.length} QUÊTE${open.length > 1 ? 'S' : ''} EN ATTENTE` : '+ CRÉER UNE QUÊTE'}
          </Link>
        </div>
      </div>
    </HudPanel>
  );
}

const ghost = (color: string): React.CSSProperties => ({
  background: 'transparent', color, border: `1px solid ${color}88`, padding: '10px 14px', minHeight: 44,
  fontFamily: T.mono, fontSize: 10, letterSpacing: '0.2em', cursor: 'pointer', textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center',
});
const srOnly: React.CSSProperties = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };
