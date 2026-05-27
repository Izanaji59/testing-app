'use client';

import { T } from '@/lib/tokens';
import type { Project } from '@/lib/types';

/**
 * Vue OPERATION — timeline horizontale séquentielle.
 */
export function ProjectTimeline({ project }: { project: Project }) {
  const phases = project.phase_count || 1;
  const current = project.phase_current || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: phases }).map((_, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div
              style={{
                width: 10, height: 10,
                background: done || active ? T.cyan : 'transparent',
                border: `1.5px solid ${done || active ? T.cyan : T.lineMid}`,
                boxShadow: active ? `0 0 6px ${T.cyan}` : 'none',
                transform: 'rotate(45deg)',
                flexShrink: 0,
              }}
            />
            {i < phases - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: done ? T.cyan : T.line,
                  boxShadow: done ? `0 0 3px ${T.cyan}` : 'none',
                  margin: '0 2px',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
