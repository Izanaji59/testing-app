'use client';

import Link from 'next/link';
import { MobileChrome } from '@/components/hud/MobileChrome';
import { DataReadout } from '@/components/hud/DataReadout';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { T } from '@/lib/tokens';

/**
 * Module échecs — indépendant du reste de l'app (pas de login requis ici,
 * pas de TabBar du jeu). Brique de base seulement : moteur + plateau en
 * local, pas encore de ligues/tournois/anti-triche/cashprizes.
 */
export default function ChessPage() {
  return (
    <main style={{ minHeight: '100vh', position: 'relative', color: T.text }}>
      <MobileChrome />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <DataReadout color={T.cyan} size={9} letterSpacing="0.4em">LATRACTION · CHESS</DataReadout>
          <div style={{
            marginTop: 8,
            fontFamily: T.display, fontSize: 24, fontWeight: 700,
            letterSpacing: '0.06em', color: T.text,
            textShadow: `0 0 14px ${T.cyanGlow}`,
          }}>
            ÉCHIQUIER
          </div>
        </div>

        <ChessBoard />

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/" style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>
            ← RETOUR
          </Link>
        </div>
      </div>
    </main>
  );
}
