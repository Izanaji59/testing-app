'use client';

import { useEffect, useState } from 'react';
import { T } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import type { Project } from '@/lib/types';

/**
 * Vue RAID — compteur dégressif rouge.
 */
export function RaidCountdown({ project }: { project: Project }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ends = project.ends_at ? new Date(project.ends_at).getTime() : null;
  if (!ends) return <DataReadout color={T.danger}>ÉCHÉANCE NON DÉFINIE</DataReadout>;

  const remaining = Math.max(0, ends - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const overdue = remaining === 0;

  return (
    <div style={{
      padding: 12,
      border: `1px solid ${overdue ? T.danger : T.lineHot}`,
      background: 'rgba(255, 85, 119, 0.06)',
      textAlign: 'center',
    }}>
      <DataReadout color={overdue ? T.danger : T.amber}>
        {overdue ? 'RAID TERMINÉ' : 'TEMPS RESTANT'}
      </DataReadout>
      <div style={{
        fontFamily: T.rank, fontWeight: 800, fontSize: 28,
        color: overdue ? T.danger : T.text,
        textShadow: `0 0 10px ${overdue ? T.danger : T.amber}88`,
        marginTop: 6, fontVariantNumeric: 'tabular-nums',
      }}>
        {days}j {hours.toString().padStart(2, '0')}h {mins.toString().padStart(2, '0')}m
      </div>
    </div>
  );
}
