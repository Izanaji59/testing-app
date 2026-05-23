'use client';

import { T } from '@/lib/tokens';

/**
 * Fond ambient HUD : gradient, grille, scanlines, vignette.
 * À poser en élément le plus en arrière du layout.
 */
export function MobileChrome() {
  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: -3,
          background: `
            radial-gradient(ellipse 80% 50% at 50% 30%, rgba(20, 50, 90, 0.22), transparent 70%),
            linear-gradient(180deg, ${T.bg} 0%, #050912 50%, ${T.bg} 100%)
          `,
        }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: -2,
          backgroundImage: `
            linear-gradient(rgba(78, 205, 255, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(78, 205, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: -2,
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 2px, rgba(120, 200, 255, 0.05) 2px 3px)`,
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: -1,
          background: 'radial-gradient(ellipse 90% 70% at 50% 50%, transparent 50%, rgba(0, 0, 0, 0.5) 100%)',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
