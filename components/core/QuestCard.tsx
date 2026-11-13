'use client';

import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { mutate } from 'swr';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { TodoList } from '@/components/core/TodoList';
import { useFocus } from '@/components/focus/FocusProvider';
import { T, EASE } from '@/lib/tokens';
import type { Quest, Task } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { DIFFICULTY_META, questXpBudget } from '@/lib/engine/difficulty';
import { fmtDuration } from '@/lib/utils';
import { questSharePath } from '@/lib/share';
import { SharePanel } from '@/components/core/SharePanel';

type Props = {
  quest: Quest;
  onChange?: () => void;
};

export function QuestCard({ quest, onChange }: Props) {
  const { openFocus } = useFocus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const sharePath = questSharePath({
    title: quest.title,
    minutes: Math.min(240, Math.max(5, Math.round(quest.estimated_minutes ?? 30))),
    tier: quest.difficulty_tier ?? 'ROUTINE',
    stats: quest.reward_stats ?? [],
  });

  const meta = quest.difficulty_tier ? DIFFICULTY_META[quest.difficulty_tier] : DIFFICULTY_META.ROUTINE;
  const isDone = quest.status === 'COMPLETED';

  const loadTasks = useCallback(async () => {
    const { data } = await supabase()
      .from('tasks')
      .select('*')
      .eq('quest_id', quest.id)
      .order('created_at', { ascending: true });
    setTasks((data ?? []) as Task[]);
    setTasksLoaded(true);
  }, [quest.id]);

  async function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && !tasksLoaded) await loadTasks();
  }

  async function complete() {
    if (busy || isDone) return;
    setBusy(true); setError('');
    try {
      const result = await supabase()
        .from('quests')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', quest.id);
      if (result.error) throw result.error;
      onChange?.();
    } catch { setError('La quête n’a pas pu être validée. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await supabase()
        .from('quests')
        .update({ status: 'IN_PROGRESS', starts_at: new Date().toISOString() })
        .eq('id', quest.id);
      if (result.error) throw result.error;
      onChange?.();
    } catch { setError('Le démarrage n’a pas pu être enregistré. Réessaie.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || isDone) return;
    setBusy(true); setError('');
    try {
      // `select` : avec la RLS, une suppression refusée ne renvoie pas d'erreur, seulement zéro ligne.
      const { data, error: failure } = await supabase().from('quests').delete().eq('id', quest.id).select('id');
      if (failure || !data?.length) throw failure ?? new Error('Aucune quête supprimée');
      await Promise.all([mutate('quests'), mutate('quests-today'), mutate('projects')]);
      onChange?.();
    } catch {
      setError('La quête n’a pas pu être supprimée. Réessaie.');
      setBusy(false);
    }
  }

  const doneTasks = tasks.filter(t => t.is_done).length;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE.outExpo }}
    >
      <HudPanel thin glow={isDone ? 0 : 0.2}>
        <div style={{ padding: 14, opacity: isDone ? 0.5 : 1 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, color: meta.color, letterSpacing: '0.18em' }}>
              {meta.symbol}
            </span>
            <DataReadout size={8} color={meta.color}>{meta.label}</DataReadout>
            {quest.reward_eur > 0 && (
              <DataReadout size={8} color={T.green}>{quest.reward_eur.toLocaleString('fr-FR')} €</DataReadout>
            )}
            {quest.estimated_minutes && (
              <DataReadout size={8} style={{ marginLeft: 'auto' }}>
                {fmtDuration(quest.estimated_minutes * 60)}
              </DataReadout>
            )}
          </div>

          {/* Titre */}
          <div style={{
            fontFamily: T.display,
            fontSize: 14,
            color: T.text,
            letterSpacing: '0.04em',
            marginBottom: 10,
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            {quest.title}
          </div>

          {/* Actions */}
          {!isDone && <p style={{fontSize:11,color:T.cyan,margin:'0 0 8px'}}>Budget global : {quest.reward_xp_base ?? questXpBudget(quest.difficulty_tier ?? 'ROUTINE',quest.estimated_minutes ?? 30)} XP à la validation</p>}
          {!isDone && <p style={{fontSize:11,color:T.textDim,margin:'0 0 12px'}}>{quest.due_at ? `Échéance : ${new Date(quest.due_at).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}` : 'Sans échéance'}</p>}
          {error && <p role="alert" style={{fontSize:12,color:T.danger}}>{error}</p>}
          {!isDone && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['PENDING', 'IN_PROGRESS'].includes(quest.status) && <button onClick={() => openFocus(undefined, quest)} style={btnPrimary}>ME CONCENTRER</button>}
              {quest.status === 'PENDING' && (
                <button onClick={start} disabled={busy} style={btnSecondary}>DÉMARRER</button>
              )}
              <button onClick={complete} disabled={busy} style={btnPrimary}>
                {busy ? '…' : 'TERMINER'}
              </button>
              <button onClick={toggleExpand} style={btnGhost}>
                {expanded ? '▲ TÂCHES' : `▼ TÂCHES${tasksLoaded && tasks.length > 0 ? ` (${doneTasks}/${tasks.length})` : ''}`}
              </button>
              <button onClick={() => setSharing(s => !s)} aria-expanded={sharing} style={btnGhost} aria-label={`Partager la quête ${quest.title}`}>
                ⇪ PARTAGER
              </button>
              {!confirmDelete && (
                <button onClick={() => setConfirmDelete(true)} disabled={busy} style={btnDanger} aria-label={`Supprimer la quête ${quest.title}`}>
                  SUPPRIMER
                </button>
              )}
            </div>
          )}

          {sharing && <SharePanel prefix="⚔ Quête à relever" detail={quest.title} path={sharePath} onClose={() => setSharing(false)} />}

          {!isDone && confirmDelete && (
            <div role="group" aria-label="Confirmer la suppression" style={{ marginTop: 10 }}>
              <DataReadout size={8} color={T.danger} style={{ display: 'block', marginBottom: 6 }}>
                SUPPRIMER CETTE QUÊTE ? SES TÂCHES SERONT AUSSI SUPPRIMÉES. IRRÉVERSIBLE.
              </DataReadout>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button onClick={remove} disabled={busy} style={{ ...btnDanger, borderColor: T.danger }}>
                  {busy ? '…' : 'CONFIRMER LA SUPPRESSION'}
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={busy} style={btnGhost}>ANNULER</button>
              </div>
            </div>
          )}

          {!!quest.actual_minutes && <p style={{ color: T.textDim, fontSize: 12, marginTop: 10 }}>{quest.actual_minutes} min consacrées à cette quête</p>}

          {isDone && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <DataReadout color={T.green} size={9}>✓ TERMINÉE</DataReadout>
              <button onClick={() => setSharing(s => !s)} aria-expanded={sharing} style={{ ...btnGhost, marginLeft: 'auto' }} aria-label={`Partager la quête ${quest.title}`}>⇪ PARTAGER</button>
              <button onClick={toggleExpand} style={btnGhost}>
                {expanded ? '▲' : '▼'} TÂCHES
              </button>
            </div>
          )}

          {/* TodoList expandable */}
          {expanded && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
              {tasksLoaded
                ? <TodoList questId={quest.id} tasks={tasks} onChange={loadTasks} />
                : <DataReadout color={T.textDim}>CHARGEMENT…</DataReadout>
              }
            </div>
          )}
        </div>
      </HudPanel>
    </motion.div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: T.cyan,
  color: T.bg,
  border: 'none',
  padding: '8px 14px',
  fontFamily: T.mono,
  fontWeight: 700,
  fontSize: 10,
  letterSpacing: '0.22em',
  cursor: 'pointer',
  boxShadow: `0 0 8px ${T.cyanGlow}`,
};

const btnSecondary: React.CSSProperties = {
  background: 'transparent',
  color: T.cyan,
  border: `1px solid ${T.lineMid}`,
  padding: '8px 14px',
  fontFamily: T.mono,
  fontSize: 10,
  letterSpacing: '0.22em',
  cursor: 'pointer',
};

const btnGhost: React.CSSProperties = {
  background: 'transparent',
  color: T.textDim,
  border: `1px solid ${T.line}`,
  padding: '8px 12px',
  fontFamily: T.mono,
  fontSize: 9,
  letterSpacing: '0.18em',
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnGhost,
  color: T.danger,
  border: `1px solid ${T.danger}55`,
};
