'use client';

import { T } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import type { Project } from '@/lib/types';
import { phaseView } from '@/lib/engine/progress';

/**
 * Vue DUNGEON — salles exploratoires, ordre libre.
 * Une salle s'ouvre à mesure que les quêtes du donjon sont terminées.
 */
export function DungeonMap({ project }: { project: Project }) {
  const { total: rooms, done: explored, pct } = phaseView(project, 5);

  return (
    <div>
      <DataReadout size={9} style={{ display: 'block', marginBottom: 8 }}>
        {explored}/{rooms} SALLES EXPLORÉES · {Math.round(pct)}%
      </DataReadout>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(rooms, 5)}, 1fr)`, gap: 6 }}>
        {Array.from({ length: rooms }).map((_, i) => {
          const isExplored = i < explored;
          return (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                border: `1px solid ${isExplored ? T.purple : T.line}`,
                background: isExplored ? `${T.purple}22` : 'transparent',
                position: 'relative',
                display: 'grid', placeItems: 'center',
                fontFamily: T.mono, fontSize: 10,
                color: isExplored ? T.purple : T.textMute,
                boxShadow: isExplored ? `0 0 4px ${T.purpleGlow}` : 'none',
              }}
            >
              {isExplored ? '✓' : '?'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
