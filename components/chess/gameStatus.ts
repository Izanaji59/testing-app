import type { Chess } from 'chess.js';
import { T } from '@/lib/tokens';

export function gameStatus(game: Chess): { text: string; color: string } {
  if (game.isCheckmate()) {
    return { text: `ÉCHEC ET MAT · ${game.turn() === 'w' ? 'NOIRS' : 'BLANCS'} GAGNENT`, color: T.amber };
  }
  if (game.isStalemate()) return { text: 'PAT · PARTIE NULLE', color: T.amber };
  if (game.isDraw()) return { text: 'PARTIE NULLE', color: T.amber };
  const inCheck = game.isCheck();
  return {
    text: `TRAIT AUX ${game.turn() === 'w' ? 'BLANCS' : 'NOIRS'}${inCheck ? ' · ÉCHEC' : ''}`,
    color: inCheck ? T.danger : T.cyan,
  };
}
