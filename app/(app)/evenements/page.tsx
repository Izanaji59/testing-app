'use client';

// Événements de la communauté (façon Eventbrite) : on en crée, on s'inscrit, on l'ajoute à son agenda.

import { useEffect, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useEvents, useEvent, type EventScope } from '@/hooks/useEvents';
import { EventCard, EventForm, eventButton } from '@/components/events/EventCard';
import { Header } from '@/components/shell/Header';
import { ProfileState } from '@/components/shell/ProfileState';
import { CommunityNav } from '@/components/core/CommunityNav';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';
import { EVENT_CATEGORIES, type EventCategory } from '@/lib/events';

const SCOPES: Array<{ id: EventScope; label: string }> = [
  { id: 'a_venir', label: 'À VENIR' }, { id: 'mes', label: 'MES ÉVÉNEMENTS' }, { id: 'passes', label: 'PASSÉS' },
];
const CATEGORIES = Object.keys(EVENT_CATEGORIES) as EventCategory[];

const btn = eventButton;

export default function EventsPage() {
  const { profile, loading } = useProfile();
  const [scope, setScope] = useState<EventScope>('a_venir');
  const [category, setCategory] = useState<EventCategory | ''>('');
  const [creating, setCreating] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('id');
    setSharedId(id && /^[0-9a-f-]{36}$/i.test(id) ? id.toLowerCase() : null);
  }, []);
  const { events, error, loading: listLoading } = useEvents(scope);
  const shared = useEvent(sharedId);

  if (!profile) return <ProfileState kind={loading ? 'loading' : 'missing'} />;
  const list = events.filter(e => (!category || e.category === category) && e.id !== sharedId);

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="COMMUNAUTÉ" />
      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <CommunityNav />

        <HudPanel label="ÉVÉNEMENTS" glow={0.35}>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>
              Une soirée typage, une partie d’échecs, un café entre membres… Crée un événement en ligne ou sur place, les autres s’inscrivent et l’ajoutent à leur agenda.
            </p>
            <button type="button" onClick={() => setCreating(c => !c)} aria-expanded={creating} style={{ ...btn(false), alignSelf: 'flex-start', border: `1px dashed ${T.lineMid}` }}>
              {creating ? '✕ ANNULER' : '+ CRÉER UN ÉVÉNEMENT'}
            </button>
            {creating && <EventForm onDone={() => setCreating(false)} />}
          </div>
        </HudPanel>

        {sharedId && (shared.loading
          ? <DataReadout color={T.cyan}>CHARGEMENT DE L’ÉVÉNEMENT…</DataReadout>
          : shared.event ? <section aria-label="Événement partagé"><DataReadout size={9} color={T.green} style={{ display: 'block', marginBottom: 8 }}>📅 ÉVÉNEMENT PARTAGÉ AVEC TOI</DataReadout><EventCard event={shared.event} highlight /></section>
          : <p role="status" style={{ margin: 0, fontSize: 13, color: T.textDim }}>Cet événement n’existe plus ou le lien est incomplet.</p>)}

        <div role="tablist" aria-label="Événements" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SCOPES.map(s => <button key={s.id} role="tab" aria-selected={scope === s.id} onClick={() => setScope(s.id)} style={{ ...btn(scope === s.id), minHeight: 40, padding: '0 12px', fontSize: 9 }}>{s.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group" aria-label="Catégorie">
          <button type="button" aria-pressed={category === ''} onClick={() => setCategory('')} style={{ ...btn(category === '', T.textDim), minHeight: 36, padding: '0 10px', fontSize: 9 }}>TOUTES</button>
          {CATEGORIES.map(c => <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(category === c ? '' : c)} style={{ ...btn(category === c, T.textDim), minHeight: 36, padding: '0 10px', fontSize: 9 }}>{EVENT_CATEGORIES[c].icon} {EVENT_CATEGORIES[c].label.toUpperCase()}</button>)}
        </div>

        {error && <p role="alert" style={{ margin: 0, color: T.danger, fontSize: 13 }}>Les événements n’ont pas pu être chargés. Réessaie dans un instant.</p>}
        {listLoading && <DataReadout color={T.cyan}>CHARGEMENT…</DataReadout>}
        {!listLoading && !error && list.length === 0 && (
          <HudPanel thin><div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: T.textDim, lineHeight: 1.6 }}>
            {scope === 'a_venir' ? 'Aucun événement à venir pour l’instant. Lance le premier !' : scope === 'mes' ? 'Tu n’organises ni ne participes à aucun événement.' : 'Aucun événement passé.'}
          </div></HudPanel>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 8 }}>
          {list.map(e => <EventCard key={e.id} event={e} />)}
        </div>
      </div>
    </div>
  );
}

