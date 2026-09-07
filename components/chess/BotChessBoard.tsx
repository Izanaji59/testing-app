'use client';

import { useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { T } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';
import { Board } from './Board';
import { MoveHistory } from './MoveHistory';
import { gameStatus } from './gameStatus';
import { useChessInteraction } from './useChessInteraction';
import { pickBotMove } from '@/lib/chess/bot';

const HUMAN_COLOR = 'w' as const;

/** Contre le bot — l'humain joue toujours les blancs pour cette première version. */
export function BotChessBoard() {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const rerender = () => setTick(n => n + 1);
  const [thinking, setThinking] = useState(false);
  const game = gameRef.current;

  const { selected, legalTargets, lastMove, pendingPromotion, onSquareClick, promote, clearSelection } =
    useChessInteraction({ game, playableColor: HUMAN_COLOR, disabled: thinking, onMove: rerender });

  useEffect(() => {
    if (game.isGameOver() || game.turn() === HUMAN_COLOR) return;

    setThinking(true);
    const timer = setTimeout(() => {
      const move = pickBotMove(game, game.turn());
      if (move) game.move(move);
      setThinking(false);
      rerender();
    }, 450);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.fen()]);

  function reset() {
    gameRef.current = new Chess();
    clearSelection();
    setThinking(false);
    rerender();
  }

  const status = gameStatus(game);
  const history = game.history({ verbose: true });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%' }}>
      <DataReadout size={11} color={status.color} style={{ letterSpacing: '0.2em' }}>
        {thinking ? 'LE BOT RÉFLÉCHIT…' : status.text}
      </DataReadout>

      <Board
        game={game}
        selected={selected}
        legalTargets={legalTargets}
        lastMove={lastMove}
        onSquareClick={onSquareClick}
        pendingPromotionColor={pendingPromotion ? game.turn() : null}
        onPromote={promote}
        disabled={thinking}
      />

      <button
        onClick={reset}
        style={{
          background: 'transparent', color: T.textDim, border: `1px solid ${T.line}`,
          padding: '10px 18px', fontFamily: T.mono, fontSize: 10, letterSpacing: '0.24em',
          cursor: 'pointer',
        }}
      >
        NOUVELLE PARTIE
      </button>

      <MoveHistory history={history} />
    </div>
  );
}
