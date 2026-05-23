'use client';

import { T } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import type { Project } from '@/lib/types';

/**
 * Vue DUNGEON — salles exploratoires, ordre libre.
 */
export function DungeonMap({ project }: { project: Project }) {
  const rooms = project.phase_count || 5;
  const explored = project.phase_current || 1;

  return (
    <div>
      <DataReadout size={9} style={{ display: 'block', marginBottom: 8 }}>
        {explored}/{rooms} SALLES EXPLORÉES
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
