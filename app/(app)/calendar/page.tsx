'use client';

import { useMemo, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useQuests } from '@/hooks/useQuests';
import { Header } from '@/components/shell/Header';
import { HudPanel } from '@/components/hud/HudPanel';
import { DataReadout } from '@/components/hud/DataReadout';
import { T } from '@/lib/tokens';

export default function CalendarPage() {
  const { profile } = useProfile();
  const { quests } = useQuests();
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const byDay = useMemo(() => {
    const map = new Map<string, typeof quests>();
    for (const q of quests) {
      const day = q.due_at ?? q.completed_at ?? q.created_at;
      const key = day.slice(0, 10);
      const arr = map.get(key) ?? [];
      arr.push(q);
      map.set(key, arr);
    }
    return map;
  }, [quests]);

  if (!profile) return null;

  const month = cursor.getMonth();
  const year = cursor.getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const cells = buildMonthCells(year, month);

  return (
    <div style={{ color: T.text }}>
      <Header profile={profile} title="CALENDRIER" />

      <div style={{ padding: '14px 14px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Header mois */}
        <HudPanel label="MOIS" glow={0.3}>
          <div style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setCursor(addMonths(cursor, -1))} style={navBtn}>‹</button>
            <div style={{ fontFamily: T.display, fontSize: 16, color: T.text, letterSpacing: '0.12em' }}>
              {MONTHS_FR[month]} {year}
            </div>
            <button onClick={() => setCursor(addMonths(cursor, +1))} style={navBtn}>›</button>
          </div>
        </HudPanel>

        {/* Grille */}
        <HudPanel thin>
          <div style={{ padding: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
              {DAYS_FR.map(d => (
                <div key={d} style={{
                  fontFamily: T.mono, fontSize: 8, color: T.textDim,
                  letterSpacing: '0.22em', textAlign: 'center', padding: 4,
                }}>
                  {d}
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {cells.map(cell => {
                if (!cell) return <div key={Math.random()} />;
                const key = cell.iso;
                const isToday = key === today;
                const dayQuests = byDay.get(key) ?? [];
                const count = dayQuests.length;
                const hasCompleted = dayQuests.some(q => q.status === 'COMPLETED');
                return (
                  <div
                    key={key}
                    style={{
                      aspectRatio: '1 / 1',
                      border: `1px solid ${isToday ? T.cyan : T.line}`,
                      background: isToday ? 'rgba(78, 205, 255, 0.08)' : 'transparent',
                      padding: 4,
                      position: 'relative',
                      fontFamily: T.mono,
                      fontSize: 11,
                      color: isToday ? T.cyan : T.text,
                    }}
                  >
                    {cell.day}
                    {count > 0 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 3, left: 3, right: 3,
                        display: 'flex', gap: 2, justifyContent: 'flex-start',
                      }}>
                        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                          <div key={i} style={{
                            width: 4, height: 4, borderRadius: '50%',
                            background: hasCompleted && i === 0 ? T.green : T.cyan,
                            boxShadow: `0 0 3px ${T.cyan}`,
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </HudPanel>

        {/* Légende */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, fontFamily: T.mono, fontSize: 9, color: T.textDim, letterSpacing: '0.2em' }}>
          <span>● PROGRAMMÉE</span>
          <span style={{ color: T.green }}>● TERMINÉE</span>
        </div>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${T.lineMid}`,
  color: T.cyan,
  padding: '4px 12px',
  fontFamily: T.mono,
  fontSize: 16,
  cursor: 'pointer',
};

const MONTHS_FR = ['JANVIER','FÉVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOÛT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DÉCEMBRE'];
const DAYS_FR = ['LUN','MAR','MER','JEU','VEN','SAM','DIM'];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

function buildMonthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  // Monday = 0
  const firstDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ day: number; iso: string } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    cells.push({ day: d, iso });
  }
  // pad to multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
