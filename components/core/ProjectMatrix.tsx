'use client';
import { useState } from 'react';
import type { Project, Quest } from '@/lib/types';
import { ProjectQuestBoard } from './ProjectQuestBoard';
import { priorityFor, quadrantFor, QUADRANTS } from '@/lib/priorities';
import { usePriorities } from '@/hooks/usePriorities';
import { useFocus } from '@/components/focus/FocusProvider';
import { projectPct } from '@/lib/engine/progress';
import { ProjectCard } from './ProjectCard';
import { useProjectLoot } from '@/hooks/useProjectLoot';
import { readyToClose } from '@/lib/engine/statTiers';
import { DungeonGate } from '@/components/hud/DungeonGate';
import { tiltTo, untilt } from '@/components/hud/tilt';
import styles from './matrix.module.css';

type QuestCounts = Record<string, { total: number; done: number }>;

export function ProjectMatrix({ projects, userId, questCounts, quests }: { projects: Project[]; userId: string; questCounts: QuestCounts; quests: Quest[] }) {
  const { openFocus } = useFocus();
  const { values, ready, busy, error, save } = usePriorities(userId);
  const { loot } = useProjectLoot();
  const [view, setView] = useState<'matrix' | 'list'>('matrix');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const active = projects.filter(p => ['ACTIVE', 'PLANNED', 'PAUSED'].includes(p.status));
  const archived = projects.filter(p => ['COMPLETED', 'ABANDONED'].includes(p.status));
  const statusNames = { ACTIVE: 'En cours', PLANNED: 'En attente', PAUSED: 'En sommeil', COMPLETED: 'Terminé', ABANDONED: 'Abandonné' };
  function cards(items: Project[]) {
    return items.slice().sort((a,b) => (Date.parse(a.ends_at || '') || Infinity) - (Date.parse(b.ends_at || '') || Infinity) || a.title.localeCompare(b.title, 'fr')).map(p => {
      const priority = priorityFor(p, values);
      const flash = p.title === 'Quêtes flash';
      return <article className={styles.card} key={p.id} draggable={ready && !busy} onDragStart={e => { untilt(e.currentTarget); e.dataTransfer.setData('application/x-grind-project', p.id); }} onDragEnd={() => setOver(null)}
        onPointerMove={e => tiltTo(e.currentTarget, e)} onPointerLeave={e => untilt(e.currentTarget)} style={{ transition: 'transform .4s cubic-bezier(.22,1,.36,1), border-color .15s, box-shadow .15s' }}>
        <div className={styles.cardHead} style={{ alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {!flash && <DungeonGate tier={p.difficulty ?? 'NOTABLE'} intensity={Math.min(1, (loot[p.id]?.loot_xp ?? 0) / 400)} unstable={readyToClose(p, questCounts[p.id]?.total ?? 0)} width={40} height={50} />}
            <h3>{p.title}</h3>
          </div>
          <span>{Math.round(projectPct(p))} %</span>
        </div>
        <p className={styles.meta}>{statusNames[p.status]} / {(questCounts[p.id]?.total ?? 0) === 0 ? 'Aucune quête : ajoutes-en pour faire monter l’avancement' : `${questCounts[p.id].done}/${questCounts[p.id].total} quêtes terminées`}{p.ends_at && Number.isFinite(Date.parse(p.ends_at)) ? ` / Échéance ${new Date(p.ends_at).toLocaleDateString('fr-FR')}` : ''}</p>
        {!flash && (loot[p.id]?.loot_xp ?? 0) > 0 && <p className={styles.meta}>Butin en réserve : {loot[p.id].loot_xp.toLocaleString('fr-FR')} XP, versé quand tu termines le donjon</p>}
        {!flash && readyToClose(p, questCounts[p.id]?.total ?? 0) && <p className={styles.suggestion}>Prêt à terminer : ouvre les détails</p>}
        {!values[p.id] && <p className={styles.suggestion}>Classement suggéré</p>}
        <div className={styles.criteria}>
          <label><input type="checkbox" checked={priority.important} disabled={!ready || busy} onChange={e => void save(p.id, { ...priority, important: e.target.checked })} /> Important<span className={styles.sr}> : {p.title}</span></label>
          <label><input type="checkbox" checked={priority.urgent} disabled={!ready || busy} onChange={e => void save(p.id, { ...priority, urgent: e.target.checked })} /> Urgent<span className={styles.sr}> : {p.title}</span></label>
        </div>
        <div className={styles.actions}><button onClick={() => openFocus(p)}>Me concentrer<span className={styles.sr}> sur {p.title}</span></button><button aria-expanded={expanded === p.id} onClick={() => setExpanded(expanded === p.id ? null : p.id)}>Détails<span className={styles.sr}> de {p.title}</span></button></div>
        {expanded === p.id && <div className={styles.details}><ProjectCard project={p} questCount={questCounts[p.id] ?? { total: 0, done: 0 }} /></div>}
      </article>;
    });
  }
  return <section className={styles.section} aria-label="Organisation des donjons">
    <div className={styles.heading}><div><h2>{view === 'matrix' ? 'Matrice d’Eisenhower' : 'Toutes les quêtes'}</h2><p>{view === 'matrix' ? 'Choisis ce qui mérite ton attention maintenant.' : 'Chaque donjon avec ses quêtes à faire et terminées.'}</p></div><div className={styles.views} role="group" aria-label="Affichage des donjons"><button aria-pressed={view === 'matrix'} onClick={() => setView('matrix')}>Matrice</button><button aria-pressed={view === 'list'} onClick={() => setView('list')}>Liste</button></div></div>
    {view === 'matrix' && <>
      <p className={styles.explanation}>Modifie les cases Important et Urgent, ou déplace un projet entre les quadrants sur ordinateur. Le classement est enregistré sur ton compte.</p>
      <p className={styles.explanation}>Au départ, les projets sont proposés comme importants ; une échéance dans les 7 jours, ou dépassée, les place dans l’urgence. Tu gardes la main sur ces choix.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <p role="status" className={styles.saveStatus}>{busy ? 'Enregistrement du classement…' : ready ? 'Classement prêt' : error ? 'Classement indisponible' : 'Chargement du classement…'}</p>
    </>}
    {view === 'matrix' ? <div className={styles.matrix}>{QUADRANTS.map(q => {
      const items = active.filter(p => quadrantFor(priorityFor(p, values)) === q.id);
      return <section key={q.id} aria-label={q.title} className={`${styles.quadrant} ${over === q.id ? styles.over : ''}`} style={{ borderTopColor: q.color }} onDragOver={e => { if (ready && !busy && Array.from(e.dataTransfer.types).includes('application/x-grind-project')) { e.preventDefault(); setOver(q.id); } }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }} onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('application/x-grind-project'); if (ready && !busy && active.some(p => p.id === id)) void save(id, { important: q.important, urgent: q.urgent }); }}>
        <div className={styles.quadrantHead}><div><h3>{q.title}</h3><p>{q.subtitle}</p></div><span>{items.length}</span></div>
        {items.length ? cards(items) : <p className={styles.empty}>Aucun projet ici.</p>}
      </section>;
    })}</div> : <ProjectQuestBoard projects={active} quests={quests} />}
    {archived.length > 0 && <details className={styles.archived}><summary>Terminés et abandonnés ({archived.length})</summary>{archived.map(p => <ProjectCard key={p.id} project={p} questCount={questCounts[p.id] ?? { total: 0, done: 0 }} />)}</details>}
  </section>;
}
