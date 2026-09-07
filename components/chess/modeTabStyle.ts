import { T } from '@/lib/tokens';
import type { CSSProperties } from 'react';

export function modeTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    textAlign: 'center',
    padding: '10px 4px',
    fontFamily: T.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.2em',
    textDecoration: 'none',
    border: `1px solid ${active ? T.cyan : T.lineMid}`,
    background: active ? 'rgba(78, 205, 255, 0.1)' : 'transparent',
    color: active ? T.cyan : T.textDim,
  };
}
