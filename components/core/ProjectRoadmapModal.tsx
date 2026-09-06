'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { T, EASE } from '@/lib/tokens';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { DIFFICULTY_META } from '@/lib/engine/difficulty';
import type { Project, Quest } from '@/lib/types';

const DAYS_FR = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];

function startOfWeek(d: Date) {
  const dow = (d.getDay() + 6) % 7; // lundi = 0
  const monday = new Date(d);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(d.getDate() - dow);
  return monday;
}
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fmtDayLabel(d: Date) {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

type Props = { project: Project; onClose: () => void };

/**
 * Roadmap détaillée d'UN projet : navigation semaine par semaine (passé
 * compris), 7 jours listés verticalement avec les quêtes rattachées à ce
 * projet ce jour-là (due_at, sinon completed_at, sinon created_at — même
 * repli que la page Calendrier).
 */
export function ProjectRoadmapModal({ project, onClose }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  useEffect(() => {
    let cancelled = false;
    supabase()
      .from('quests')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setQuests((data ?? []) as Quest[]);
        setLoaded(true);
      });
    return () => { cancelled = true; };
  }, [project.id]);

  const byDay = useMemo(() => {
    const map = new Map<string, Quest[]>();
    for (const q of quests) {
      const ref = q.due_at ?? q.completed_at ?? q.created_at;
      const key = ref.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(q);
      map.set(key, arr);
    }
    return map;
  }, [quests]);

  const today = isoDay(new Date());
  const weekEnd = addDays(weekStart, 6);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(3, 6, 13, 0.86)',
          backdropFilter: 'blur(4px)',
          display: 'grid', placeItems: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: EASE.outExpo }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 460, maxHeight: '86vh', overflowY: 'auto' }}
        >
          <HudPanel label={`ROADMAP · ${project.title}`} glow={0.5}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <button onClick={() => setWeekStart(w => addDays(w, -7))} style={navBtn} aria-label="Semaine précédente">‹</button>
                <DataReadout size={10}>
                  SEMAINE DU {fmtDayLabel(weekStart)} AU {fmtDayLabel(weekEnd)}
                </DataReadout>
                <button onClick={() => setWeekStart(w => addDays(w, 7))} style={navBtn} aria-label="Semaine suivante">›</button>
              </div>

              {!loaded ? (
                <DataReadout color={T.cyan}>CHARGEMENT…</DataReadout>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {DAYS_FR.map((label, i) => {
                    const date = addDays(weekStart, i);
                    const key = isoDay(date);
                    const dayQuests = byDay.get(key) ?? [];
                    const isToday = key === today;
                    const isPastEmpty = key < today && dayQuests.length === 0;

                    return (
                      <div
                        key={key}
                        style={{
                          padding: '10px 12px',
                          border: `1px solid ${isToday ? T.cyan : T.line}`,
                          background: isToday ? 'rgba(78, 205, 255, 0.06)' : 'transparent',
                          opacity: isPastEmpty ? 0.45 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: dayQuests.length ? 8 : 0 }}>
                          <DataReadout size={9} color={isToday ? T.cyan : T.textDim}>
                            {label} · {fmtDayLabel(date)}
                          </DataReadout>
                          {isToday && <DataReadout size={8} color={T.cyan}>AUJOURD&apos;HUI</DataReadout>}
                        </div>

                        {dayQuests.length === 0 ? (
                          <DataReadout size={9} color={T.textMute}>—</DataReadout>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {dayQuests.map(q => {
                              const meta = q.difficulty_tier ? DIFFICULTY_META[q.difficulty_tier] : DIFFICULTY_META.ROUTINE;
                              const done = q.status === 'COMPLETED';
                              return (
                                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontFamily: T.mono, fontSize: 10, color: meta.color }}>{meta.symbol}</span>
                                  <span style={{
                                    flex: 1, fontFamily: T.mono, fontSize: 12,
                                    color: done ? T.textMute : T.text,
                                    textDecoration: done ? 'line-through' : 'none',
                                  }}>
                                    {q.title}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <button onClick={onClose} style={closeBtn}>FERMER</button>
            </div>
          </HudPanel>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

const navBtn: React.CSSProperties = {
  background: 'transparent', border: `1px solid ${T.lineMid}`, color: T.cyan,
  padding: '4px 12px', fontFamily: T.mono, fontSize: 16, cursor: 'pointer',
};

const closeBtn: React.CSSProperties = {
  marginTop: 16,
  background: 'transparent', color: T.textDim, border: `1px solid ${T.line}`,
  padding: '10px', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
  cursor: 'pointer', width: '100%',
};
