'use client';

// Cœur d'un personnage : ajoute ou retire des favoris (toggle_fiction_favorite, 0027).

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { useFictionCommunity } from './useFictionCommunity';
import s from './characters.module.css';

export function FavoriteButton({ characterId }: { characterId: string }) {
  const community = useFictionCommunity();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const count = community.data?.favorites?.[characterId] ?? 0;
  const on = !!community.data?.myFavorites?.includes(characterId);

  if (!community.user) {
    return <p className={s.favoriteLine}><span className={s.favoriteCount}>♥ {count}</span> <Link href="/login/">Connecte-toi pour l’ajouter à tes favoris</Link></p>;
  }

  async function toggle() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { error: failure } = await supabase().rpc('toggle_fiction_favorite', { p_character_id: characterId });
      if (failure) throw failure;
      await community.refresh();
    } catch (failure) {
      const text = (failure as { message?: string })?.message ?? '';
      setError(text.startsWith('Tu as déjà') ? text + '.' : 'Le favori n’a pas pu être enregistré. Réessaie.');
    } finally { setBusy(false); }
  }

  return <p className={s.favoriteLine}>
    <button type="button" className={on ? s.favoriteOn : s.favorite} aria-pressed={on} disabled={busy || !community.available} onClick={() => void toggle()}>
      <span aria-hidden="true">{on ? '♥' : '♡'}</span> {on ? 'Dans mes favoris' : 'Ajouter aux favoris'}
    </button>
    <span className={s.favoriteCount}>{count} favori{count > 1 ? 's' : ''}</span>
    {error && <span role="alert" className={s.formError}>{error}</span>}
  </p>;
}
