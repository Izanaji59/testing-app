'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useChessGame } from '@/hooks/useChessGame';
import { MobileChrome } from '@/components/hud/MobileChrome';
import { DataReadout } from '@/components/hud/DataReadout';
import { Board } from '@/components/chess/Board';
import { MoveHistory } from '@/components/chess/MoveHistory';
import { gameStatus } from '@/components/chess/gameStatus';
import { useChessInteraction } from '@/components/chess/useChessInteraction';
import { modeTabStyle } from '@/components/chess/modeTabStyle';
import { T } from '@/lib/tokens';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20 }}>
      <div>{children}</div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: T.cyan, color: T.bg, border: 'none', padding: '14px 20px',
  fontFamily: T.mono, fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', cursor: 'pointer',
  boxShadow: `0 0 10px ${T.cyanGlow}`,
};

function OnlineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = searchParams.get('game');

  const [authChecked, setAuthChecked] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  const { row, game, userId, myColor, loading, createGame, joinGame, pushMove } = useChessGame(gameId);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session);
      setAuthChecked(true);
    });
  }, []);

  async function handleCreate() {
    setCreating(true);
    const id = await createGame();
    setCreating(false);
    if (id) router.replace(`/chess/online?game=${id}`);
  }

  async function handleJoin() {
    if (gameId) await joinGame(gameId);
  }

  function copyLink() {
    const url = `${window.location.origin}/chess/online?game=${gameId}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleMove() {
    const isOver = game.isGameOver();
    let winner: 'white' | 'black' | 'draw' | null = null;
    if (game.isCheckmate()) winner = game.turn() === 'w' ? 'black' : 'white';
    else if (isOver) winner = 'draw';
    await pushMove(game.fen(), isOver, winner);
  }

  // Hooks toujours appelés, même si on affiche un écran d'attente ensuite —
  // `game` est un Chess valide (position de départ) dès l'init du hook.
  const { selected, legalTargets, lastMove, pendingPromotion, onSquareClick, promote } = useChessInteraction({
    game,
    playableColor: myColor ?? 'w',
    disabled: myColor === null || row?.status !== 'ACTIVE',
    onMove: handleMove,
  });

  if (!authChecked || loading) {
    return <Centered><DataReadout color={T.cyan}>CHARGEMENT…</DataReadout></Centered>;
  }

  if (!loggedIn) {
    return (
      <Centered>
        <DataReadout color={T.danger} style={{ display: 'block', marginBottom: 10 }}>
          CONNEXION REQUISE POUR JOUER EN LIGNE.
        </DataReadout>
        <Link href="/login" style={{ fontFamily: T.mono, fontSize: 11, color: T.cyan }}>SE CONNECTER →</Link>
      </Centered>
    );
  }

  if (!gameId) {
    return (
      <Centered>
        <button onClick={handleCreate} disabled={creating} style={primaryBtn}>
          {creating ? 'CRÉATION…' : '+ CRÉER UNE PARTIE'}
        </button>
      </Centered>
    );
  }

  if (!row) {
    return <Centered><DataReadout color={T.danger}>PARTIE INTROUVABLE.</DataReadout></Centered>;
  }

  if (row.status === 'WAITING') {
    const isCreator = userId === row.white_user_id;
    if (isCreator) {
      return (
        <Centered>
          <DataReadout color={T.cyan} style={{ display: 'block', marginBottom: 12 }}>
            EN ATTENTE D&apos;UN ADVERSAIRE…
          </DataReadout>
          <button onClick={copyLink} style={primaryBtn}>{copied ? 'LIEN COPIÉ ✓' : 'COPIER LE LIEN'}</button>
        </Centered>
      );
    }
    return (
      <Centered>
        <DataReadout style={{ display: 'block', marginBottom: 12 }}>PARTIE OUVERTE.</DataReadout>
        <button onClick={handleJoin} style={primaryBtn}>REJOINDRE LA PARTIE</button>
      </Centered>
    );
  }

  const status = gameStatus(game);
  const history = game.history({ verbose: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%' }}>
      <DataReadout size={9} color={T.textDim}>
        {myColor ? `TU JOUES LES ${myColor === 'w' ? 'BLANCS' : 'NOIRS'}` : 'SPECTATEUR'}
      </DataReadout>
      <DataReadout size={11} color={status.color} style={{ letterSpacing: '0.2em' }}>{status.text}</DataReadout>

      <Board
        game={game}
        selected={selected}
        legalTargets={legalTargets}
        lastMove={lastMove}
        onSquareClick={onSquareClick}
        pendingPromotionColor={pendingPromotion ? game.turn() : null}
        onPromote={promote}
        flipped={myColor === 'b'}
        disabled={myColor === null}
      />

      <MoveHistory history={history} />
    </div>
  );
}

export default function ChessOnlinePage() {
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
            EN LIGNE
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
          <Link href="/chess" style={modeTabStyle(false)}>LOCAL</Link>
          <Link href="/chess/bot" style={modeTabStyle(false)}>BOT</Link>
          <div style={modeTabStyle(true)}>EN LIGNE</div>
        </div>

        <Suspense fallback={<Centered><DataReadout color={T.cyan}>CHARGEMENT…</DataReadout></Centered>}>
          <OnlineContent />
        </Suspense>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/chess" style={{ fontFamily: T.mono, fontSize: 9, color: T.textMute, letterSpacing: '0.2em' }}>
            ← RETOUR
          </Link>
        </div>
      </div>
    </main>
  );
}
