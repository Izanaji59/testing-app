'use client';

import { useMemo, useState } from 'react';
import type { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';

type Options = {
  game: Chess;
  /** Couleur que l'utilisateur a le droit de jouer. 'both' = local pass-and-play. */
  playableColor: Color | 'both';
  /** Appelé juste après qu'un coup a été appliqué à `game` (mutation en place). */
  onMove?: (move: Move) => void;
  disabled?: boolean;
};

/**
 * Logique de sélection/clic partagée par les 3 modes (local, bot, en ligne) :
 * sélectionner une pièce, voir ses coups légaux, jouer, gérer la promotion.
 * Ne sait rien du reset, de l'historique affiché, ni de ce qui se passe
 * après le coup (ça, c'est aux composants appelants de le décider via onMove).
 */
export function useChessInteraction({ game, playableColor, onMove, disabled }: Options) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  const legalMoves = useMemo<Move[]>(() => {
    if (!selected) return [];
    return game.moves({ square: selected, verbose: true });
  }, [selected, game]);

  const legalTargets = useMemo(() => new Set(legalMoves.map(m => m.to)), [legalMoves]);

  const history = game.history({ verbose: true });
  const lastMove = history[history.length - 1];

  const canInteract = !disabled && !game.isGameOver()
    && (playableColor === 'both' || game.turn() === playableColor);

  function onSquareClick(sq: Square) {
    if (!canInteract || pendingPromotion) return;

    if (selected) {
      if (sq === selected) { setSelected(null); return; }

      const move = legalMoves.find(m => m.to === sq);
      if (move) {
        if (move.flags.includes('p')) {
          setPendingPromotion({ from: selected, to: sq });
        } else {
          const applied = game.move({ from: selected, to: sq });
          setSelected(null);
          if (applied) onMove?.(applied);
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
    const applied = game.move({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
    setPendingPromotion(null);
    setSelected(null);
    if (applied) onMove?.(applied);
  }

  function clearSelection() {
    setSelected(null);
    setPendingPromotion(null);
  }

  return {
    selected,
    legalTargets,
    lastMove,
    pendingPromotion,
    onSquareClick,
    promote,
    clearSelection,
  };
}
