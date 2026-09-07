'use client';

import { useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Square, PieceSymbol, Color, Move } from 'chess.js';
import { T } from '@/lib/tokens';
import { DataReadout } from '@/components/hud/DataReadout';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1']; // haut → bas, blancs en bas

const GLYPH: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const PROMOTION_CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

/**
 * Plateau d'échecs local (pass-and-play, 1 seul écran). Moteur = chess.js,
 * aucun réseau/multi ici — c'est la brique de base du module, avant
 * ligues/tournois/anti-triche. Tap-to-move plutôt que drag & drop : plus
 * fiable au tactile sur mobile, le drag pourra s'ajouter plus tard sans
 * toucher au moteur.
 */
export function ChessBoard() {
  const gameRef = useRef(new Chess());
  const [, setTick] = useState(0);
  const rerender = () => setTick(n => n + 1);
  const game = gameRef.current;

  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const legalMoves = useMemo<Move[]>(() => {
    if (!selected) return [];
    return game.moves({ square: selected, verbose: true });
  }, [selected, game]);

  const legalTargets = useMemo(() => new Set(legalMoves.map(m => m.to)), [legalMoves]);
  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];

  function onSquareClick(sq: Square) {
    if (pendingPromotion || game.isGameOver()) return;

    if (selected) {
      if (sq === selected) { setSelected(null); return; }

      const move = legalMoves.find(m => m.to === sq);
      if (move) {
        if (move.flags.includes('p')) {
          setPendingPromotion({ from: selected, to: sq });
        } else {
          game.move({ from: selected, to: sq });
          setSelected(null);
          rerender();
        }
        return;
      }

      const piece = game.get(sq);
      setSelected(piece && piece.color === game.turn() ? sq : null);
      return;
    }

    const piece = game.get(sq);
    if (piece && piece.color === game.turn()) setSelected(sq);
  }

  function promote(piece: PieceSymbol) {
    if (!pendingPromotion) return;
    game.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
    setPendingPromotion(null);
    setSelected(null);
    rerender();
  }

  function reset() {
    gameRef.current = new Chess();
    setSelected(null);
    setPendingPromotion(null);
    rerender();
  }

  const inCheck = game.isCheck();
  const isMate = game.isCheckmate();
  const isStale = game.isStalemate();
  const isDraw = game.isDraw();

  let status: string;
  let statusColor: string = T.cyan;
  if (isMate) {
    status = `ÉCHEC ET MAT · ${game.turn() === 'w' ? 'NOIRS' : 'BLANCS'} GAGNENT`;
    statusColor = T.amber;
  } else if (isStale) {
    status = 'PAT · PARTIE NULLE';
    statusColor = T.amber;
  } else if (isDraw) {
    status = 'PARTIE NULLE';
    statusColor = T.amber;
  } else {
    status = `TRAIT AUX ${game.turn() === 'w' ? 'BLANCS' : 'NOIRS'}${inCheck ? ' · ÉCHEC' : ''}`;
    statusColor = inCheck ? T.danger : T.cyan;
  }

  let kingInCheckSquare: Square | null = null;
  if (inCheck) {
    for (const row of game.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === game.turn()) kingInCheckSquare = cell.square;
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center', width: '100%' }}>
      <DataReadout size={11} color={statusColor} style={{ letterSpacing: '0.2em' }}>
        {status}
      </DataReadout>

      <div style={{ position: 'relative', width: 'min(94vw, 420px)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          border: `1px solid ${T.lineMid}`,
          boxShadow: '0 0 30px rgba(78, 205, 255, 0.1)',
        }}>
          {RANKS.map(rank => FILES.map(file => {
            const sq = `${file}${rank}` as Square;
            const piece = game.get(sq);
            const dark = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 1;
            const isSelected = sq === selected;
            const isTarget = legalTargets.has(sq);
            const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
            const isCheckSquare = sq === kingInCheckSquare;

            return (
              <button
                key={sq}
                onClick={() => onSquareClick(sq)}
                style={{
                  position: 'relative',
                  aspectRatio: '1 / 1',
                  background: dark ? 'rgba(10, 19, 32, 0.92)' : 'rgba(78, 205, 255, 0.05)',
                  border: 'none',
                  outline: isSelected ? `2px solid ${T.cyan}` : 'none',
                  outlineOffset: -2,
                  boxShadow: isCheckSquare
                    ? `inset 0 0 0 2px ${T.danger}`
                    : isLastMove ? `inset 0 0 0 1px ${T.amber}88` : 'none',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 'min(7vw, 30px)',
                  lineHeight: 1,
                  color: piece?.color === 'w' ? T.cyanHi : T.amber,
                  padding: 0,
                }}
              >
                {piece && GLYPH[piece.color][piece.type]}
                {isTarget && !piece && (
                  <div style={{
                    position: 'absolute', width: '26%', height: '26%', borderRadius: '50%',
                    background: `${T.cyan}66`,
                  }} />
                )}
                {isTarget && piece && (
                  <div style={{
                    position: 'absolute', inset: 3, borderRadius: '50%',
                    boxShadow: `inset 0 0 0 2px ${T.danger}aa`,
                  }} />
                )}
              </button>
            );
          }))}
        </div>

        {pendingPromotion && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(3, 6, 13, 0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {PROMOTION_CHOICES.map(p => (
              <button
                key={p}
                onClick={() => promote(p)}
                style={{
                  width: 48, height: 48,
                  background: 'rgba(78, 205, 255, 0.08)',
                  border: `1px solid ${T.cyan}`,
                  fontSize: 26,
                  color: T.cyanHi,
                  cursor: 'pointer',
                }}
              >
                {GLYPH[game.turn()][p]}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={reset}
        style={{
          background: 'transparent',
          color: T.textDim,
          border: `1px solid ${T.line}`,
          padding: '10px 18px',
          fontFamily: T.mono,
          fontSize: 10,
          letterSpacing: '0.24em',
          cursor: 'pointer',
        }}
      >
        NOUVELLE PARTIE
      </button>

      {history.length > 0 && (
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
      )}
    </div>
  );
}
