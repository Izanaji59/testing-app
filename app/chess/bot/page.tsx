'use client';

import Link from 'next/link';
import { MobileChrome } from '@/components/hud/MobileChrome';
import { DataReadout } from '@/components/hud/DataReadout';
import { BotChessBoard } from '@/components/chess/BotChessBoard';
import { modeTabStyle } from '@/components/chess/modeTabStyle';
import { T } from '@/lib/tokens';

export default function ChessBotPage() {
  return (
    <main style={{ minHeight: '100vh', position: 'relative', color: T.text }}>
      <MobileChrome />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <DataReadout color={T.cyan} size={9} letterSpacing="0.4em">LATRACTION · CHESS</DataReadout>
          <div style={{
            marginTop: 8, fontFamily: T.display, fontSize: 24, fontWeight: 700,
            letterSpacing: '0.06em', color: T.text, textShadow: `0 0 14px ${T.cyanGlow}`,
          }}>
            CONTRE LE BOT
          </div>
          <DataReadout size={9} color={T.textDim} style={{ display: 'block', marginTop: 6 }}>
            TU JOUES LES BLANCS
          </DataReadout>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
          <Link href="/chess" style={modeTabStyle(false)}>LOCAL</Link>
          <div style={modeTabStyle(true)}>BOT</div>
          <Link href="/chess/online" style={modeTabStyle(false)}>EN LIGNE</Link>
        </div>

        <BotChessBoard />

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/chess" style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>
            ← RETOUR
          </Link>
        </div>
      </div>
    </main>
  );
}
