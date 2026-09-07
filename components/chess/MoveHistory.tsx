'use client';

import type { Move } from 'chess.js';
import { T } from '@/lib/tokens';

export function MoveHistory({ history }: { history: Move[] }) {
  if (history.length === 0) return null;
  return (
    <div style={{
      width: '100%', maxHeight: 140, overflowY: 'auto',
      border: `1px solid ${T.line}`, padding: 10,
      fontFamily: T.mono, fontSize: 11, color: T.textDim,
    }}>
      {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
          <span style={{ color: T.textMute, width: 22 }}>{i + 1}.</span>
          <span style={{ color: T.text, minWidth: 56 }}>{history[i * 2]?.san}</span>
          <span style={{ color: T.text }}>{history[i * 2 + 1]?.san ?? ''}</span>
        </div>
      ))}
    </div>
  );
}
