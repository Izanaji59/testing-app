'use client';

import type { DifficultyTier, StatKind, StatTiers } from '@/lib/types';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { STAT_META } from '@/lib/engine/stats';
import { TIERS, XP_STAT_KINDS, topTier, type StatTierEntry } from '@/lib/engine/statTiers';

/**
 * Choix de plusieurs stats, chacune avec sa difficulté (ex. Focus notable, Mentalité difficile).
 * Utilisé pour les quêtes et pour les donjons.
 */
export function StatTierPicker({ value, onChange, defaultTier = 'NOTABLE', idPrefix, hint }: {
  value: StatTiers;
  onChange: (next: StatTiers) => void;
  defaultTier?: DifficultyTier;
  idPrefix: string;
  hint?: string;
}) {
  const selected = Object.keys(value) as StatKind[];
  const top = topTier(value);

  function toggle(kind: StatKind) {
    const next = { ...value };
    if (next[kind]) delete next[kind]; else next[kind] = defaultTier;
    onChange(next);
  }

  return (
    <fieldset style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ padding: 0, marginBottom: 6 }}><DataReadout>STATISTIQUES ET DIFFICULTÉ</DataReadout></legend>
      {hint && <p style={{ fontSize: 12, color: T.textDim, margin: '0 0 8px', lineHeight: 1.5 }}>{hint}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(142px, 1fr))', gap: 6 }}>
        {XP_STAT_KINDS.map(kind => {
          const on = !!value[kind];
          const meta = STAT_META[kind];
          return (
            <button
              key={kind}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(kind)}
              title={meta.description}
              style={{
                minHeight: 44, padding: '6px 8px', cursor: 'pointer', textAlign: 'left',
                background: on ? 'rgba(78, 205, 255, 0.12)' : 'transparent',
                border: `1px solid ${on ? meta.color : T.line}`,
                color: on ? T.text : T.textDim,
                fontFamily: T.mono, fontSize: 10, letterSpacing: '0.1em', overflowWrap: 'anywhere',
              }}
            >
              <span aria-hidden="true" style={{ color: meta.color, marginRight: 6 }}>{meta.symbol}</span>{meta.label}
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {selected.map(kind => {
            const id = `${idPrefix}-tier-${kind}`;
            return (
              <div key={kind} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.3fr)', gap: 8, alignItems: 'center' }}>
                <label htmlFor={id} style={{ fontFamily: T.mono, fontSize: 11, color: STAT_META[kind].color, letterSpacing: '0.12em' }}>
                  {STAT_META[kind].label}
                </label>
                <select
                  id={id}
                  value={value[kind]}
                  onChange={e => onChange({ ...value, [kind]: e.target.value as DifficultyTier })}
                  style={{ background: 'rgba(78, 205, 255, 0.04)', border: `1px solid ${T.lineMid}`, color: T.text, padding: '10px 8px', fontFamily: T.mono, fontSize: 12, minHeight: 44, width: '100%' }}
                >
                  {TIERS.map(t => <option key={t} value={t}>{DIFFICULTY_META[t].label}</option>)}
                </select>
              </div>
            );
          })}
          {top && (
            <p style={{ fontSize: 12, color: T.textDim, margin: '2px 0 0', lineHeight: 1.5 }}>
              Difficulté globale : <strong style={{ color: DIFFICULTY_META[top].color }}>{DIFFICULTY_META[top].label}</strong> (la plus haute).
              {selected.length > 1 && ' L’XP est partagée entre ces stats au prorata de leur difficulté.'}
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}

/** Affichage compact : « MEN · DIFFICILE  FOC · NOTABLE ». */
export function StatTierChips({ entries, size = 8 }: { entries: StatTierEntry[]; size?: number }) {
  if (!entries.length) return null;
  return (
    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
      {entries.map(e => (
        <span key={e.kind} style={{ border: `1px solid ${T.line}`, padding: '2px 6px', whiteSpace: 'nowrap' }}>
          <DataReadout size={size} color={STAT_META[e.kind].color} letterSpacing="0.14em">{STAT_META[e.kind].short}</DataReadout>
          <DataReadout size={size} color={DIFFICULTY_META[e.tier].color} letterSpacing="0.14em" style={{ marginLeft: 6 }}>{DIFFICULTY_META[e.tier].label}</DataReadout>
        </span>
      ))}
    </span>
  );
}
