'use client';

// Carte et formulaire d'un événement de la communauté (inscription, agenda, partage, gestion par l'organisateur).

import { useState, type FormEvent } from 'react';
import useSWR from 'swr';
import { createEvent, updateEvent, cancelEvent, registerEvent, unregisterEvent, fetchParticipants, eventError, type EventInput } from '@/hooks/useEvents';
import { SharePanel } from '@/components/core/SharePanel';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { EVENT_CATEGORIES, buildIcs, eventEnd, eventPath, isFull, localToIso, type CommunityEvent, type EventCategory, type EventMode } from '@/lib/events';

const CATEGORIES = Object.keys(EVENT_CATEGORIES) as EventCategory[];

export const eventButton = (primary: boolean, color: string = T.cyan): React.CSSProperties => ({
  background: primary ? color : 'transparent', color: primary ? T.bg : color, border: `1px solid ${primary ? color : `${color}66`}`,
  padding: '10px 14px', minHeight: 44, fontFamily: T.mono, fontSize: 10, fontWeight: primary ? 700 : 400, letterSpacing: '0.18em',
  cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
});
const btn = eventButton;
const field: React.CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, minHeight: 44, background: 'rgba(78,205,255,0.04)',
  border: `1px solid ${T.lineMid}`, color: T.text, padding: '10px 12px', fontFamily: T.mono, fontSize: 12,
};

function DateBlock({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <div aria-hidden="true" style={{ flex: '0 0 64px', textAlign: 'center', border: `1px solid ${T.lineMid}`, padding: '8px 4px', background: 'rgba(78,205,255,0.05)' }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.cyan, letterSpacing: '0.18em' }}>{d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '')}</div>
      <div style={{ fontFamily: T.rank, fontSize: 24, color: T.text, lineHeight: 1.1 }}>{d.getDate()}</div>
      <div style={{ fontFamily: T.mono, fontSize: 9, color: T.textDim }}>{d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  );
}

export function EventCard({ event: e, highlight = false }: { event: CommunityEvent; highlight?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const participants = useSWR(showParticipants && e.is_organizer ? ['event-participants', e.id] : null, () => fetchParticipants(e.id));
  const cat = EVENT_CATEGORIES[e.category];
  const past = eventEnd(e).getTime() < Date.now();
  const full = isFull(e);
  const start = new Date(e.starts_at);
  const when = start.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    + (e.ends_at ? ' – ' + new Date(e.ends_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '');

  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(eventError(failure)); } finally { setBusy(false); }
  }

  function downloadIcs() {
    const blob = new Blob([buildIcs(e, location.origin)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `evenement-${e.id.slice(0, 8)}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (editing) return <HudPanel label="MODIFIER L’ÉVÉNEMENT" glow={0.4}><div style={{ padding: 16 }}><EventForm initial={e} onDone={() => setEditing(false)} /></div></HudPanel>;

  return (
    <HudPanel thin glow={highlight ? 0.8 : e.registered ? 0.35 : 0.15}>
      <article style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, opacity: e.cancelled || past ? 0.75 : 1 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <DateBlock iso={e.starts_at} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <DataReadout size={8} color={T.textDim}>{cat.icon} {cat.label.toUpperCase()}</DataReadout>
              {e.cancelled && <DataReadout size={8} color={T.danger}>ANNULÉ</DataReadout>}
              {!e.cancelled && past && <DataReadout size={8} color={T.textMute}>TERMINÉ</DataReadout>}
              {!e.cancelled && !past && full && <DataReadout size={8} color={T.amber}>COMPLET</DataReadout>}
              {e.registered && <DataReadout size={8} color={T.green}>✓ INSCRIT</DataReadout>}
              {e.is_organizer && <DataReadout size={8} color={T.cyan}>TU ORGANISES</DataReadout>}
            </div>
            <h3 style={{ margin: '6px 0 4px', fontFamily: T.display, fontSize: 17, letterSpacing: '0.02em', overflowWrap: 'anywhere' }}>{e.title}</h3>
            <div style={{ fontSize: 12, color: T.textDim, lineHeight: 1.6 }}>
              <div>{when}</div>
              <div>{e.mode === 'en_ligne' ? '💻 En ligne' : `📍 ${e.place}`}</div>
              <div>Par <a href={`/member/?id=${e.organizer_id}`} style={{ color: T.cyan }}>@{e.organizer_name}</a> · {e.participants} inscrit{e.participants > 1 ? 's' : ''}{e.capacity ? ` sur ${e.capacity} places` : ''}</div>
            </div>
          </div>
        </div>

        {e.description && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: T.text, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{e.description}</p>}
        {e.mode === 'en_ligne' && (e.online_url
          ? <p style={{ margin: 0, fontSize: 12 }}>Lien de connexion : <a href={e.online_url} target="_blank" rel="noopener noreferrer" style={{ color: T.cyan, overflowWrap: 'anywhere' }}>{e.online_url}</a></p>
          : !e.is_organizer && <p style={{ margin: 0, fontSize: 12, color: T.textMute }}>Le lien de connexion s’affiche une fois inscrit.</p>)}

        {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!e.is_organizer && !e.registered && !e.cancelled && !past && (
            <button type="button" disabled={busy || full} onClick={() => run(() => registerEvent(e.id))} style={{ ...btn(true, T.green), opacity: full ? 0.5 : 1 }}>{busy ? '…' : full ? 'COMPLET' : 'JE PARTICIPE'}</button>
          )}
          {e.registered && !past && <button type="button" disabled={busy} onClick={() => run(() => unregisterEvent(e.id))} style={btn(false, T.textDim)}>ME DÉSINSCRIRE</button>}
          {!e.cancelled && !past && <button type="button" onClick={downloadIcs} style={btn(false)}>+ AGENDA</button>}
          <button type="button" aria-expanded={sharing} onClick={() => setSharing(s => !s)} style={btn(false)}>⇪ PARTAGER</button>
          {e.is_organizer && <button type="button" aria-expanded={showParticipants} onClick={() => setShowParticipants(s => !s)} style={btn(false)}>PARTICIPANTS</button>}
          {e.is_organizer && !e.cancelled && !past && <button type="button" onClick={() => setEditing(true)} style={btn(false)}>MODIFIER</button>}
          {e.is_organizer && !e.cancelled && !past && !confirmCancel && <button type="button" onClick={() => setConfirmCancel(true)} style={btn(false, T.danger)}>ANNULER</button>}
        </div>
        {confirmCancel && (
          <div role="group" aria-label="Annuler l’événement" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <DataReadout size={8} color={T.danger} style={{ flexBasis: '100%' }}>ANNULER L’ÉVÉNEMENT ? LES INSCRITS LE VERRONT ANNULÉ. IRRÉVERSIBLE.</DataReadout>
            <button type="button" disabled={busy} onClick={() => run(async () => { await cancelEvent(e.id); setConfirmCancel(false); })} style={btn(true, T.danger)}>CONFIRMER L’ANNULATION</button>
            <button type="button" onClick={() => setConfirmCancel(false)} style={btn(false, T.textDim)}>GARDER</button>
          </div>
        )}
        {showParticipants && e.is_organizer && (
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
            {!participants.data && !participants.error && <DataReadout color={T.textDim}>CHARGEMENT…</DataReadout>}
            {participants.error && <DataReadout color={T.danger}>LISTE INDISPONIBLE.</DataReadout>}
            {participants.data && (participants.data.length === 0
              ? <DataReadout color={T.textMute}>PERSONNE N’EST ENCORE INSCRIT.</DataReadout>
              : <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>{participants.data.map((p, i) => <li key={i}>{p.display_name} <span style={{ color: T.textMute, fontSize: 11 }}>· inscrit le {new Date(p.registered_at).toLocaleDateString('fr-FR')}</span></li>)}</ol>)}
            <p style={{ margin: '8px 0 0', fontSize: 11, color: T.textMute }}>Toi seul vois cette liste.</p>
          </div>
        )}
        {sharing && <SharePanel prefix="📅 Événement" detail={`${e.title} · ${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`} path={eventPath(e.id)} onClose={() => setSharing(false)} />}
      </article>
    </HudPanel>
  );
}

const toDay = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const toTime = (iso: string) => new Date(iso).toTimeString().slice(0, 5);

export function EventForm({ initial, onDone }: { initial?: CommunityEvent; onDone: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState<EventCategory>(initial?.category ?? 'rencontre');
  const [day, setDay] = useState(initial ? toDay(initial.starts_at) : '');
  const [time, setTime] = useState(initial ? toTime(initial.starts_at) : '20:00');
  const [endTime, setEndTime] = useState(initial?.ends_at ? toTime(initial.ends_at) : '');
  const [mode, setMode] = useState<EventMode>(initial?.mode ?? 'en_ligne');
  const [place, setPlace] = useState(initial?.place ?? '');
  const [url, setUrl] = useState(initial?.online_url ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ? String(initial.capacity) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (busy) return;
    const starts = localToIso(day, time);
    if (!starts) { setError('Choisis une date et une heure.'); return; }
    let ends: string | null = null;
    if (endTime) {
      ends = localToIso(day, endTime);
      // Une fin avant le début : l'événement se termine le lendemain (soirée après minuit).
      if (ends && Date.parse(ends) <= Date.parse(starts)) ends = new Date(Date.parse(ends) + 86400000).toISOString();
    }
    const input: EventInput = {
      title: title.trim(), description: description.trim(), category, starts_at: starts, ends_at: ends, mode,
      place: mode === 'sur_place' ? place.trim() : '', online_url: mode === 'en_ligne' && url.trim() ? url.trim() : null,
      capacity: capacity ? Math.max(1, Math.min(1000, Number(capacity) || 1)) : null,
    };
    setBusy(true); setError('');
    try {
      if (initial) await updateEvent(initial.id, input); else await createEvent(input);
      onDone();
    } catch (failure) { setError(eventError(failure)); }
    finally { setBusy(false); }
  }

  const label: React.CSSProperties = { fontSize: 12, color: T.textDim };
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={label}>Titre<input required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex. : Soirée typage Death Note" style={field} /></label>
      <label style={label}>Catégorie<select value={category} onChange={e => setCategory(e.target.value as EventCategory)} style={field}>{CATEGORIES.map(c => <option key={c} value={c}>{EVENT_CATEGORIES[c].icon} {EVENT_CATEGORIES[c].label}</option>)}</select></label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
        <label style={label}>Date<input required type="date" value={day} onChange={e => setDay(e.target.value)} style={field} /></label>
        <label style={label}>Début<input required type="time" value={time} onChange={e => setTime(e.target.value)} style={field} /></label>
        <label style={label}>Fin (facultatif)<input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={field} /></label>
      </div>
      <div role="radiogroup" aria-label="Où ?" style={{ display: 'flex', gap: 8 }}>
        {(['en_ligne', 'sur_place'] as EventMode[]).map(m => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} style={{ ...btn(mode === m), flex: 1, justifyContent: 'center' }}>{m === 'en_ligne' ? '💻 EN LIGNE' : '📍 SUR PLACE'}</button>)}
      </div>
      {mode === 'en_ligne'
        ? <label style={label}>Lien de connexion (facultatif, visible des inscrits uniquement)<input type="url" maxLength={500} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={field} /></label>
        : <label style={label}>Lieu<input required maxLength={200} value={place} onChange={e => setPlace(e.target.value)} placeholder="Ex. : Lille, parc de la Citadelle" style={field} />
            <span style={{ display: 'block', marginTop: 6, fontSize: 11, color: T.amber, lineHeight: 1.5 }}>Choisis un lieu public. Ne donne jamais d’adresse personnelle.</span></label>}
      <label style={label}>Nombre de places (facultatif)<input type="number" min={1} max={1000} value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="Illimité" style={field} /></label>
      <label style={label}>Description<textarea maxLength={2000} rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ce qu’on va faire, pour qui, ce qu’il faut apporter…" style={{ ...field, resize: 'vertical' }} /></label>
      {error && <p role="alert" style={{ margin: 0, fontSize: 12, color: T.danger }}>{error}</p>}
      <button type="submit" disabled={busy} style={{ ...btn(true), justifyContent: 'center', boxShadow: `0 0 10px ${T.cyanGlow}` }}>{busy ? 'ENREGISTREMENT…' : initial ? 'ENREGISTRER LES MODIFICATIONS' : 'PUBLIER L’ÉVÉNEMENT'}</button>
    </form>
  );
}
