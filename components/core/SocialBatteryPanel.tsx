'use client';

import { useState } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { SocialBattery3D } from '@/components/hud/SocialBattery3D';
import { T } from '@/lib/tokens';
import { useWillpower, declareWillpower, cancelWillpower, setSocialProfile } from '@/hooks/useWillpower';
import { SOCIAL_PROFILES, socialAdvice, type SocialBattery, type SocialProfile, type SocialState } from '@/lib/engine/socialBattery';
import { Chip, Choices, action } from './WillpowerGauge';

export const SOCIAL_STATE_LABEL: Record<SocialState, string> = { pleine: 'PLEINE', correcte: 'CORRECTE', basse: 'BASSE', plat: 'À PLAT' };
export const SOCIAL_STATE_COLOR: Record<SocialState, string> = { pleine: T.amber, correcte: T.amber, basse: T.amber, plat: T.danger };
const SPENT_LABEL = { UN_PEU: 'Un peu', BEAUCOUP: 'Beaucoup' } as const;
const RECHARGE_LABEL = { UN_PEU: 'Un peu', MOITIE: 'À moitié', COMPLET: 'Complètement' } as const;
type Spent = keyof typeof SPENT_LABEL;
type Recharge = keyof typeof RECHARGE_LABEL;

/** Pile en 3D et niveau. `compact` : version réduite (onglet mobile). */
export function SocialVisual({ b, compact = false }: { b: SocialBattery; compact?: boolean }) {
  const color = SOCIAL_STATE_COLOR[b.state];
  return (
    <div style={{ display: 'flex', gap: compact ? 8 : 16, alignItems: 'center', minWidth: 0 }}>
      <div role="meter" aria-label="Batterie sociale" aria-valuemin={0} aria-valuemax={100} aria-valuenow={b.level} aria-valuetext={`${b.level} %, ${SOCIAL_STATE_LABEL[b.state].toLowerCase()}`}>
        <SocialBattery3D level={b.level} color={color} width={compact ? 58 : 112} height={compact ? 88 : 168} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: compact ? 2 : 6 }}>
        {compact && <DataReadout size={8} color={T.textDim} style={{ display: 'block' }}>BATTERIE SOCIALE</DataReadout>}
        <DataReadout size={compact ? 8 : 10} color={color}>{SOCIAL_STATE_LABEL[b.state]}</DataReadout>
        <span aria-hidden="true" style={{ fontFamily: T.rank, fontSize: compact ? 24 : 38, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 18px ${color}66` }}>
          {b.level}<span style={{ fontSize: compact ? 11 : 14, color: T.textDim }}> %</span>
        </span>
        {!compact && (
          <DataReadout size={9} color={T.textDim} style={{ lineHeight: 1.7 }}>
            {SOCIAL_PROFILES[b.profile].label.toUpperCase()}{b.today.spent > 0 ? ` · DÉPENSÉ −${b.today.spent}` : ''}{b.today.recharged > 0 ? ` · RECHARGÉ +${b.today.recharged}` : ''}
          </DataReadout>
        )}
      </div>
    </div>
  );
}

/** Profil, conseil, boutons au ressenti et explications de la batterie sociale. */
export function SocialControls() {
  const { social: b, socialFromMbti, events } = useWillpower();
  const [form, setForm] = useState<null | 'spent' | 'recharge'>(null);
  const [spent, setSpent] = useState<Spent | null>(null);
  const [recharge, setRecharge] = useState<Recharge | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [open, setOpen] = useState(false);
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todays = events.filter(e => (e.kind === 'SOCIAL_SPENT' || e.kind === 'SOCIAL_RECHARGE') && Date.parse(e.occurred_at) >= todayStart.getTime()).reverse();
  const introvert = b.profile === 'INTROVERTI';

  function show(next: 'spent' | 'recharge') { setForm(f => (f === next ? null : next)); setSpent(null); setRecharge(null); setFailure(''); }

  async function run(task: () => Promise<void>, message: string) {
    setBusy(true); setFailure('');
    try { await task(); } catch { setFailure(message); } finally { setBusy(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div role="group" aria-label="Ton profil social">
        <DataReadout size={9} style={{ display: 'block', marginBottom: 6 }}>TON PROFIL{socialFromMbti ? ' · D’APRÈS TON MBTI' : ''}</DataReadout>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(Object.keys(SOCIAL_PROFILES) as SocialProfile[]).map(p => (
            <Chip key={p} on={b.profile === p} color={T.amber} onClick={() => { if (p !== b.profile) void run(() => setSocialProfile(p), 'Le profil n’a pas pu être enregistré.'); }}>{SOCIAL_PROFILES[p].label}</Chip>
          ))}
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 11, color: T.textMute, lineHeight: 1.5 }}>{SOCIAL_PROFILES[b.profile].text}</p>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: T.text, lineHeight: 1.6 }}>{socialAdvice(b)}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" aria-expanded={form === 'spent'} onClick={() => show('spent')} style={action(T.amber, form === 'spent')}>ÇA M’A COÛTÉ SOCIALEMENT</button>
        <button type="button" aria-expanded={form === 'recharge'} onClick={() => show('recharge')} style={action(T.green, form === 'recharge')}>{introvert ? 'JE ME SUIS RECHARGÉ SEUL' : 'JE ME SENS RECHARGÉ'}</button>
      </div>

      {form && (
        <div style={{ border: `1px solid ${T.line}`, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {form === 'spent' ? <>
            <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>Pour ce que l’appli ne voit pas : une réunion, un repas de famille, un appel pénible. Les rencontres et le networking que tu déclares comptent déjà.</p>
            <Choices label="Combien ?" options={Object.entries(SPENT_LABEL) as Array<[Spent, string]>} value={spent} onChange={setSpent} />
          </> : <>
            <p style={{ margin: 0, fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>{introvert ? 'Au ressenti, après un vrai temps seul.' : 'Au ressenti.'} « Complètement » remet la batterie à 100 %.</p>
            <Choices label="À quel point ?" options={Object.entries(RECHARGE_LABEL) as Array<[Recharge, string]>} value={recharge} onChange={setRecharge} />
          </>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy || (form === 'spent' ? !spent : !recharge)} style={{ ...action(T.cyan, true), background: T.cyan, color: T.bg, opacity: (form === 'spent' ? spent : recharge) ? 1 : 0.5 }}
              onClick={() => void run(async () => {
                await declareWillpower(form === 'spent' ? { kind: 'SOCIAL_SPENT', activity: spent! } : { kind: 'SOCIAL_RECHARGE', activity: recharge! });
                setForm(null);
              }, 'La déclaration n’a pas pu être enregistrée. Réessaie.')}>
              {busy ? '…' : 'ENREGISTRER'}
            </button>
            <button type="button" onClick={() => setForm(null)} disabled={busy} style={action(T.textDim, false)}>ANNULER</button>
          </div>
        </div>
      )}

      {todays.length > 0 && (
        <ul aria-label="Batterie sociale aujourd’hui" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {todays.map(e => (
            <li key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 12, color: T.textDim, borderTop: `1px solid ${T.line}`, paddingTop: 6 }}>
              <span>
                {e.kind === 'SOCIAL_SPENT'
                  ? <><span style={{ color: T.amber }}>Coûté</span> · {SPENT_LABEL[e.activity as Spent] ?? ''}</>
                  : <><span style={{ color: T.green }}>Rechargé</span> · {(RECHARGE_LABEL[e.activity as Recharge] ?? '').toLowerCase()}</>}
                {' · '}{new Date(e.occurred_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button type="button" onClick={() => void run(() => cancelWillpower(e.id), 'L’annulation n’a pas pu être enregistrée.')} disabled={busy} style={action(T.textDim, false)} aria-label="Annuler cette déclaration">ANNULER</button>
            </li>
          ))}
        </ul>
      )}
      {failure && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{failure}</p>}

      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ ...action(T.textDim, false), alignSelf: 'flex-start' }}>
        {open ? 'FERMER' : 'COMMENT ÇA MARCHE'}
      </button>
      {open && (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: T.textDim, lineHeight: 1.7 }}>
          <li>Elle est indépendante de ta volonté : une soirée peut vider la batterie d’un introverti et recharger sa volonté ; le networking d’un extraverti peut remplir les deux.</li>
          <li>Les rencontres, le networking et les quêtes Social que tu déclares la font bouger tout seuls, selon ton profil.</li>
          <li>Les deux boutons servent au ressenti : ce que ça t’a coûté, et ta recharge, seul ou non.</li>
          <li>Un extraverti sans contact depuis plus d’une journée la voit baisser doucement.</li>
          <li>Aux extrêmes, elle pèse sur la volonté : introverti à plat, une rencontre ne la recharge plus ; extraverti à court, elle la recharge un peu plus.</li>
          <li>Elle ne donne et ne retire jamais d’XP.</li>
        </ul>
      )}
    </div>
  );
}

/** Panneau complet (ordinateur). */
export function SocialBatteryPanel() {
  const { social: b, ready, error } = useWillpower();
  return (
    <HudPanel label="BATTERIE SOCIALE" glow={0.3}>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {error ? <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>La batterie sociale est indisponible pour le moment.</p>
          : !ready ? <DataReadout color={T.textDim}>CHARGEMENT…</DataReadout>
          : <><SocialVisual b={b} /><SocialControls /></>}
      </div>
    </HudPanel>
  );
}
