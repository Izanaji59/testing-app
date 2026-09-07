'use client';

import type { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { T } from '@/lib/tokens';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS_WHITE = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const GLYPH: Record<Color, Record<PieceSymbol, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

export const PROMOTION_CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

type Props = {
  game: Chess;
  selected: Square | null;
  legalTargets: Set<Square>;
  lastMove: { from: Square; to: Square } | undefined;
  onSquareClick: (sq: Square) => void;
  flipped?: boolean;
  pendingPromotionColor?: Color | null;
  onPromote?: (piece: PieceSymbol) => void;
  disabled?: boolean;
};

/**
 * Rendu pur du plateau : ne connaît aucune règle d'échecs, juste "affiche
 * cette position et dis-moi quand une case est cliquée". Toute la logique
 * (sélection, coups légaux, tour de qui) vit dans useChessInteraction et
 * les composants qui l'utilisent (local / bot / en ligne).
 */
export function Board({
  game, selected, legalTargets, lastMove, onSquareClick,
  flipped = false, pendingPromotionColor = null, onPromote, disabled = false,
}: Props) {
  const ranks = flipped ? [...RANKS_WHITE].reverse() : RANKS_WHITE;
  const files = flipped ? [...FILES].reverse() : FILES;

  let kingInCheckSquare: Square | null = null;
  if (game.isCheck()) {
    for (const row of game.board()) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === game.turn()) kingInCheckSquare = cell.square;
      }
    }
  }

  return (
    <div style={{ position: 'relative', width: 'min(94vw, 420px)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        border: `1px solid ${T.lineMid}`,
        boxShadow: '0 0 30px rgba(78, 205, 255, 0.1)',
      }}>
        {ranks.map(rank => files.map(file => {
          const sq = `${file}${rank}` as Square;
          const piece = game.get(sq);
          const dark = (FILES.indexOf(file) + RANKS_WHITE.indexOf(rank)) % 2 === 1;
          const isSelected = sq === selected;
          const isTarget = legalTargets.has(sq);
          const isLastMove = lastMove && (lastMove.from === sq || lastMove.to === sq);
          const isCheckSquare = sq === kingInCheckSquare;

          return (
            <button
              key={sq}
              onClick={() => !disabled && onSquareClick(sq)}
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
                cursor: disabled ? 'default' : 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 'min(7vw, 30px)',
                lineHeight: 1,
                color: piece?.color === 'w' ? T.cyanHi : T.amber,
                padding: 0,
                opacity: disabled ? 0.75 : 1,
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

      {pendingPromotionColor && onPromote && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(3, 6, 13, 0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {PROMOTION_CHOICES.map(p => (
            <button
              key={p}
              onClick={() => onPromote(p)}
              style={{
                width: 48, height: 48,
                background: 'rgba(78, 205, 255, 0.08)',
                border: `1px solid ${T.cyan}`,
                fontSize: 26,
                color: T.cyanHi,
                cursor: 'pointer',
              }}
            >
              {GLYPH[pendingPromotionColor][p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
