'use client';

import { motion } from 'framer-motion';
import { useState, useCallback } from 'react';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { TodoList } from '@/components/core/TodoList';
import { T, EASE } from '@/lib/tokens';
import type { Quest, Task } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import { fmtDuration } from '@/lib/utils';

type Props = {
  quest: Quest;
  onChange?: () => void;
};

export function QuestCard({ quest, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

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
    setBusy(true);
    try {
      await supabase()
        .from('quests')
        .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
        .eq('id', quest.id);
      onChange?.();
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      await supabase()
        .from('quests')
        .update({ status: 'IN_PROGRESS', starts_at: new Date().toISOString() })
        .eq('id', quest.id);
      onChange?.();
    } finally {
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
          {!isDone && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {quest.status === 'PENDING' && (
                <button onClick={start} disabled={busy} style={btnSecondary}>DÉMARRER</button>
              )}
              <button onClick={complete} disabled={busy} style={btnPrimary}>
                {busy ? '…' : 'TERMINER'}
              </button>
              <button onClick={toggleExpand} style={btnGhost}>
                {expanded ? '▲ TÂCHES' : `▼ TÂCHES${tasksLoaded && tasks.length > 0 ? ` (${doneTasks}/${tasks.length})` : ''}`}
              </button>
            </div>
          )}

          {isDone && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <DataReadout color={T.green} size={9}>✓ TERMINÉE</DataReadout>
              <button onClick={toggleExpand} style={{ ...btnGhost, marginLeft: 'auto' }}>
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
