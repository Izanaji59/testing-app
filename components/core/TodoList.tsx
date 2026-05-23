'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { T, EASE } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import type { Task } from '@/lib/types';

type Props = {
  questId: string;
  tasks: Task[];
  onChange?: () => void;
};

/**
 * Todo list interne à une quête.
 * Aucune tâche ne peut exister sans quête parent — règle système.
 */
export function TodoList({ questId, tasks, onChange }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function add() {
    const t = newTitle.trim();
    if (!t) return;
    setSubmitting(true);
    try {
      const sb = supabase();
      const { data: auth } = await sb.auth.getUser();
      if (!auth.user) return;
      await sb.from('tasks').insert({ quest_id: questId, title: t, user_id: auth.user.id });
      setNewTitle('');
      onChange?.();
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(task: Task) {
    await supabase()
      .from('tasks')
      .update({
        is_done: !task.is_done,
        done_at: !task.is_done ? new Date().toISOString() : null,
      })
      .eq('id', task.id);
    onChange?.();
  }

  async function remove(task: Task) {
    await supabase().from('tasks').delete().eq('id', task.id);
    onChange?.();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <DataReadout size={9}>SOUS-TÂCHES · {tasks.filter(t => t.is_done).length}/{tasks.length}</DataReadout>

      <AnimatePresence>
        {tasks.map(t => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.22, ease: EASE.outExpo }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px',
              border: `1px solid ${T.line}`,
              background: t.is_done ? 'rgba(92, 255, 178, 0.04)' : 'transparent',
            }}
          >
            <button
              onClick={() => toggle(t)}
              aria-label={t.is_done ? 'Annuler' : 'Cocher'}
              style={{
                width: 16, height: 16,
                background: t.is_done ? T.green : 'transparent',
                border: `1.5px solid ${t.is_done ? T.green : T.cyan}`,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            />
            <div style={{
              flex: 1,
              fontFamily: T.mono, fontSize: 12, color: t.is_done ? T.textMute : T.text,
              textDecoration: t.is_done ? 'line-through' : 'none',
            }}>
              {t.title}
            </div>
            <button
              onClick={() => remove(t)}
              aria-label="Supprimer"
              style={{
                background: 'none', border: 'none', color: T.textMute,
                cursor: 'pointer', padding: '2px 6px',
                fontFamily: T.mono, fontSize: 10,
              }}
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="+ ajouter une tâche"
          style={{
            flex: 1,
            background: 'rgba(78, 205, 255, 0.04)',
            border: `1px solid ${T.line}`,
            color: T.text, padding: '8px 10px',
            fontFamily: T.mono, fontSize: 11,
            outline: 'none',
          }}
        />
        <button
          onClick={add}
          disabled={submitting || !newTitle.trim()}
          style={{
            background: T.cyan, color: T.bg, border: 'none',
            padding: '0 14px',
            fontFamily: T.mono, fontWeight: 700, fontSize: 10,
            letterSpacing: '0.22em',
            cursor: 'pointer',
            opacity: !newTitle.trim() ? 0.4 : 1,
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}
