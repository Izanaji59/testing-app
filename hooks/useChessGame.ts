'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type ChessGameRow = {
  id: string;
  white_user_id: string;
  black_user_id: string | null;
  fen: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED';
  winner: 'white' | 'black' | 'draw' | null;
};

/**
 * Partie d'échecs en ligne : lit/écrit la ligne `chess_games` correspondante,
 * s'abonne en realtime aux coups de l'adversaire. Le FEN de la ligne est la
 * source de vérité — le Chess local est juste rechargé depuis ce FEN à
 * chaque changement, jamais l'inverse.
 */
export function useChessGame(gameId: string | null) {
  const [row, setRow] = useState<ChessGameRow | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const gameRef = useRef(new Chess());

  useEffect(() => {
    supabase().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!gameId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase().from('chess_games').select('*').eq('id', gameId).maybeSingle();
    if (data) {
      setRow(data as ChessGameRow);
      gameRef.current.load(data.fen);
    }
    setLoading(false);
  }, [gameId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!gameId) return;
    const sb = supabase();
    let channel: RealtimeChannel | null = null;

    channel = sb
      .channel(`chess_game_${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chess_games', filter: `id=eq.${gameId}` },
        payload => {
          const data = payload.new as ChessGameRow;
          setRow(data);
          gameRef.current.load(data.fen);
        })
      .subscribe();

    return () => { sb.removeChannel(channel!); };
  }, [gameId]);

  async function createGame(): Promise<string | null> {
    const sb = supabase();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return null;
    const { data, error } = await sb
      .from('chess_games')
      .insert({ white_user_id: auth.user.id, fen: START_FEN, status: 'WAITING' })
      .select('id')
      .single();
    if (error || !data) return null;
    return data.id as string;
  }

  async function joinGame(id: string) {
    const sb = supabase();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return;
    await sb.from('chess_games')
      .update({ black_user_id: auth.user.id, status: 'ACTIVE' })
      .eq('id', id);
  }

  async function pushMove(fen: string, isOver: boolean, winner: ChessGameRow['winner']) {
    if (!gameId) return;
    await supabase()
      .from('chess_games')
      .update({ fen, status: isOver ? 'COMPLETED' : 'ACTIVE', winner: winner ?? null, updated_at: new Date().toISOString() })
      .eq('id', gameId);
  }

  const myColor: 'w' | 'b' | null =
    !row || !userId ? null
    : row.white_user_id === userId ? 'w'
    : row.black_user_id === userId ? 'b'
    : null;

  return { row, game: gameRef.current, userId, myColor, loading, createGame, joinGame, pushMove };
}
