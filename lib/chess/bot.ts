import { Chess } from 'chess.js';
import type { Color, Move, PieceSymbol } from 'chess.js';

const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3.1, r: 5, q: 9, k: 0 };
const CENTER = new Set(['d4', 'd5', 'e4', 'e5']);

/** Score du plateau du point de vue des BLANCS (positif = bon pour les blancs). */
function evaluateForWhite(game: Chess): number {
  if (game.isCheckmate()) return game.turn() === 'w' ? -9999 : 9999;
  if (game.isDraw() || game.isStalemate()) return 0;

  let score = 0;
  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const value = PIECE_VALUES[cell.type] + (CENTER.has(cell.square) ? 0.15 : 0);
      score += cell.color === 'w' ? value : -value;
    }
  }
  return score;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) return evaluateForWhite(game);

  const moves = game.moves();
  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      game.move(m);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const m of moves) {
    game.move(m);
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/**
 * Bot "facile" : minimax + élagage alpha-bêta, profondeur ~2 (le coup du bot
 * + la meilleure réponse adverse), matériel + léger bonus de centre. Assez
 * pour ne pas jouer n'importe quoi, battable sans difficulté — un premier
 * niveau, pas un moteur compétitif (ça, ce serait Stockfish/WASM, hors scope).
 */
export function pickBotMove(game: Chess, botColor: Color, depth = 2): Move | null {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = botColor === 'w' ? -Infinity : Infinity;

  for (const m of moves) {
    game.move(m);
    const nextMaximizing = game.turn() === 'w';
    const score = minimax(game, depth - 1, -Infinity, Infinity, nextMaximizing);
    game.undo();

    if (botColor === 'w' ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }
  return bestMove;
}
