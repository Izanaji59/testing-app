'use client';

import { useState } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { ManaVessel } from '@/components/hud/ManaVessel';
import { T } from '@/lib/tokens';
import { useWillpower, declareWillpower, cancelWillpower } from '@/hooks/useWillpower';
import {
  ACTIVITIES, GROUPS, MORNING_END_HOUR, SLEEP_CEILING, willpowerAdvice,
  type Activity, type ActivityGroup, type Willpower, type WillpowerState,
} from '@/lib/engine/willpower';

export const WILL_STATE_LABEL: Record<WillpowerState, string> = { charge: 'CHARGÉ', stable: 'STABLE', bas: 'BAS', vide: 'À SEC' };
export const WILL_STATE_COLOR: Record<WillpowerState, string> = { charge: T.cyan, stable: T.cyan, bas: T.amber, vide: T.danger };
const GROUP_COLOR: Record<ActivityGroup, string> = { saine: T.green, doser: T.amber, piege: T.danger };
const TIMES: Array<[number, string]> = [[15, '15 min'], [30, '30 min'], [60, '1 h'], [120, '2 h'], [300, '5 h']];

type Form = null | 'distraction' | 'method';
type Verdict = 'RECHARGE' | 'DOPAMINE';

const duration = (m: number) => m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`;

/** « Ce matin » = 8 h aujourd'hui ; sinon maintenant. */
export function when(morning: boolean): string {
  const d = new Date();
  if (morning) d.setHours(8, 0, 0, 0);
  return d.toISOString();
}

/** Fiole de mana et niveau. `compact` : version réduite (onglet mobile). */
export function WillpowerVisual({ w, compact = false }: { w: Willpower; compact?: boolean }) {
  const color = WILL_STATE_COLOR[w.state];
  return (
    <div style={{ display: 'flex', gap: compact ? 8 : 16, alignItems: 'center', minWidth: 0 }}>
      <div role="meter" aria-label="Réservoir de volonté" aria-valuemin={0} aria-valuemax={100} aria-valuenow={w.level} aria-valuetext={`${w.level} %, ${WILL_STATE_LABEL[w.state].toLowerCase()}`}>
        <ManaVessel level={w.level} color={color} width={compact ? 58 : 112} height={compact ? 88 : 168} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: compact ? 2 : 6 }}>
        {compact && <DataReadout size={8} color={T.textDim} style={{ display: 'block' }}>VOLONTÉ</DataReadout>}
        <DataReadout size={compact ? 8 : 10} color={color}>{WILL_STATE_LABEL[w.state]}</DataReadout>
        <span aria-hidden="true" style={{ fontFamily: T.rank, fontSize: compact ? 24 : 38, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 18px ${color}66` }}>
          {w.level}<span style={{ fontSize: compact ? 11 : 14, color: T.textDim }}> %</span>
        </span>
        {!compact && (w.today.recharge > 0 || w.today.drain > 0) && (
          <DataReadout size={9} color={T.textDim} style={{ lineHeight: 1.7 }}>
            AUJOURD’HUI{w.today.recharge > 0 ? ` · RECHARGÉ +${w.today.recharge}` : ''}{w.today.drain > 0 ? ` · VIDÉ −${w.today.drain}` : ''}
          </DataReadout>
        )}
      </div>
    </div>
  );
}

/** Conseils, déclarations (distraction, méthode 20/20/20) et explications du réservoir. */
export function WillpowerControls() {
  const { willpower: w, events } = useWillpower();
  const [form, setForm] = useState<Form>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [minutes, setMinutes] = useState(30);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [thisMorning, setThisMorning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [open, setOpen] = useState(false);
  const lateInDay = new Date().getHours() >= MORNING_END_HOUR;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todays = events.filter(e => ['DOPAMINE', 'RECHARGE', 'RITUAL'].includes(e.kind) && Date.parse(e.occurred_at) >= todayStart.getTime()).reverse();
  const canSave = form === 'method' || (!!activity && !!verdict);

  function show(next: Form) {
    setForm(f => (f === next ? null : next));
    setActivity(null); setVerdict(null); setMinutes(30); setThisMorning(false); setFailure('');
  }

  async function save() {
    if (!form || busy || !canSave) return;
    setBusy(true); setFailure('');
    try {
      const occurred_at = when(thisMorning && lateInDay);
      if (form === 'distraction' && activity && verdict) await declareWillpower({ kind: verdict, activity, minutes, occurred_at });
      if (form === 'method') await declareWillpower({ kind: 'RITUAL', activity: 'RITUEL_202020', minutes: 60, occurred_at });
      setForm(null);
    } catch { setFailure('La déclaration n’a pas pu être enregistrée. Réessaie.'); }
    finally { setBusy(false); }
  }

  async function cancel(id: string) {
    setBusy(true); setFailure('');
    try { await cancelWillpower(id); } catch { setFailure('L’annulation n’a pas pu être enregistrée.'); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {willpowerAdvice(w).map(text => <p key={text} style={{ margin: 0, fontSize: 12, color: T.text, lineHeight: 1.6 }}>{text}</p>)}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" aria-expanded={form === 'distraction'} onClick={() => show('distraction')} style={action(T.green, form === 'distraction')}>UNE PAUSE, UNE DISTRACTION</button>
        {!w.today.method && <button type="button" aria-expanded={form === 'method'} onClick={() => show('method')} style={action(T.cyan, form === 'method')}>MÉTHODE 20/20/20 FAITE</button>}
      </div>

      {form && (
        <div style={{ border: `1px solid ${T.line}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {form === 'distraction' && <>
            <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>
              Une bonne distraction repose au lieu d’exciter : elle est presque méditative, elle a une fin, et tu l’as choisie. C’est toi qui juges si elle t’a ressourcé.
            </p>
            {(Object.keys(GROUPS) as ActivityGroup[]).map(g => (
              <div key={g} role="group" aria-label={GROUPS[g].title}>
                <DataReadout size={9} color={GROUP_COLOR[g]} style={{ display: 'block' }}>{GROUPS[g].title.toUpperCase()}</DataReadout>
                <p style={{ margin: '4px 0 6px', fontSize: 11, color: T.textMute, lineHeight: 1.5 }}>{GROUPS[g].text}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {(Object.keys(ACTIVITIES) as Activity[]).filter(a => ACTIVITIES[a].group === g).map(a => (
                    <Chip key={a} on={activity === a} color={GROUP_COLOR[g]} onClick={() => setActivity(a)}>{ACTIVITIES[a].label}</Chip>
                  ))}
                </div>
              </div>
            ))}
            {activity && ACTIVITIES[activity].hint && <p role="status" style={{ margin: 0, fontSize: 12, color: T.amber, lineHeight: 1.6 }}>{ACTIVITIES[activity].hint}</p>}
            <Choices label="Combien de temps ?" options={TIMES} value={minutes} onChange={setMinutes} />
            <Choices label="Comment tu en ressors ?" options={[['RECHARGE', 'Ressourcé'], ['DOPAMINE', 'Vidé']] as Array<[Verdict, string]>} value={verdict} onChange={setVerdict} />
          </>}
          {form === 'method' && <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>20 minutes pour bouger, 20 pour réfléchir, 20 pour apprendre. Faite à l’aube, elle recharge davantage. Le minuteur « Méthode 20 / 20 / 20 » l’enregistre tout seul.</p>}
          {lateInDay && <Choices label="Quand ?" options={[[false, 'À l’instant'], [true, 'Ce matin']]} value={thisMorning} onChange={setThisMorning} />}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={save} disabled={busy || !canSave} style={{ ...action(T.cyan, true), background: T.cyan, color: T.bg, opacity: canSave ? 1 : 0.5 }}>{busy ? '…' : 'ENREGISTRER'}</button>
            <button type="button" onClick={() => setForm(null)} disabled={busy} style={action(T.textDim, false)}>ANNULER</button>
          </div>
        </div>
      )}

      {todays.length > 0 && (
        <ul aria-label="Déclarations du jour" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {todays.map(e => (
            <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12, color: T.textDim, borderTop: `1px solid ${T.line}`, paddingTop: 6 }}>
              <span>
                {e.kind === 'RITUAL' ? 'Méthode 20/20/20' : `${(ACTIVITIES[e.activity as Activity] ?? ACTIVITIES.AUTRE).label} · ${duration(e.minutes)} · `}
                {e.kind === 'RECHARGE' && <span style={{ color: T.green }}>ressourcé</span>}
                {e.kind === 'DOPAMINE' && <span style={{ color: T.amber }}>vidé</span>}
                {' · '}{new Date(e.occurred_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button type="button" onClick={() => cancel(e.id)} disabled={busy} style={action(T.textDim, false)} aria-label="Annuler cette déclaration">ANNULER</button>
            </li>
          ))}
        </ul>
      )}
      {failure && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{failure}</p>}

      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ ...action(T.textDim, false), alignSelf: 'flex-start' }}>
        {open ? 'FERMER' : 'COMMENT ÇA MARCHE'}
      </button>
      {open && (
        <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
          <p style={{ margin: '0 0 8px' }}>Inspiré de <em>Deep Work</em> (Cal Newport) : la volonté est limitée, elle s’use et se recharge. Elle ne se gère pas quête par quête, mais au fil des journées. Le but : concentrer ta concentration là où elle fait gagner ta journée.</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Tu déclares tes pauses et tes distractions, et tu juges toi-même si tu en ressors ressourcé ou vidé.</li>
            <li>Les bonnes distractions (lecture, marche, sport, méditation, rencontres, aguerrissement) rechargent le plus. Une partie très prenante (LoL, longues parties d’échecs) consomme de la concentration même si tu l’as aimée. Au-delà d’1 h 30, une même distraction recharge de moins en moins.</li>
            <li>Ce qui vide coûte double avant {MORNING_END_HOUR} h : commence la journée par la méthode 20/20/20 plutôt que par ton téléphone.</li>
            <li>Les quêtes en Social et en Aguerrissement la rechargent ; l’effort des autres quêtes et les distractions pendant le minuteur l’entament un peu, sans détail par quête.</li>
            <li>Si ta batterie sociale est à plat et que tu es introverti, une rencontre ne recharge plus ta volonté ; extraverti à court, elle la recharge un peu plus.</li>
            <li>Le sommeil la remonte chaque nuit, mais pas au-delà de {SLEEP_CEILING} % : le reste vient de ce que tu vis.</li>
            <li>Elle ne donne et ne retire jamais d’XP.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

/** Panneau complet (ordinateur). */
export function WillpowerGauge() {
  const { willpower: w, ready, error } = useWillpower();
  return (
    <HudPanel label="RÉSERVOIR DE VOLONTÉ" glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error ? <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>Le réservoir est indisponible pour le moment.</p>
          : !ready ? <DataReadout color={T.textDim}>CHARGEMENT…</DataReadout>
          : <><WillpowerVisual w={w} /><WillpowerControls /></>}
      </div>
    </HudPanel>
  );
}

export function Chip({ on, color, onClick, children }: { on: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} style={{
      minHeight: 44, padding: '8px 12px', cursor: 'pointer', fontSize: 12,
      background: on ? `${color}22` : 'transparent', border: `1px solid ${on ? color : T.line}`, color: on ? T.text : T.textDim,
    }}>{children}</button>
  );
}

export function Choices<V extends string | number | boolean>({ label, options, value, onChange }: { label: string; options: Array<[V, string]>; value: V | null; onChange: (v: V) => void }) {
  return (
    <div role="group" aria-label={label}>
      <DataReadout size={9} style={{ display: 'block', marginBottom: 6 }}>{label}</DataReadout>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {options.map(([v, l]) => <Chip key={String(v)} on={value === v} color={T.cyan} onClick={() => onChange(v)}>{l}</Chip>)}
      </div>
    </div>
  );
}

export const action = (color: string, on: boolean): React.CSSProperties => ({
  background: on ? `${color}22` : 'transparent', color, border: `1px solid ${color}88`,
  padding: '10px 14px', minHeight: 44, fontFamily: T.mono, fontSize: 9, letterSpacing: '0.18em', cursor: 'pointer',
});
