'use client';

// Vitrine « Personnages » d'un profil : favoris et réputation de typeur.
// get_fiction_profile (0027) applique le choix du joueur (show_fiction) côté serveur.

import Link from 'next/link';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { characterUrl } from '@/lib/characterPages';
import { useCharacters } from './useCharacters';
import { Portrait, typeLine } from './TitleCharacters';
import c from './characters.module.css';

type FictionProfile = { visible: false } | {
  visible: true; favorites: string[]; favoriteCount: number; votes: number; reasons: number; agreement: number; considered: number;
};

/** Titre de typeur : une indication, sans aucun effet sur l'XP ni les stats. */
export function typerTitle(p: { votes: number; agreement: number; considered: number }): string {
  const rate = p.considered ? p.agreement / p.considered : 0;
  if (p.votes >= 100 && p.considered >= 20 && rate >= 0.6) return 'Typeur confirmé';
  if (p.votes >= 20) return 'Typeur actif';
  return p.votes > 0 ? 'Nouveau typeur' : 'Pas encore de vote';
}

export function FictionShowcase({ userId, owner = false }: { userId: string; owner?: boolean }) {
  const profile = useSWR<FictionProfile | null>(['fiction-profile', userId], async () => {
    const { data, error } = await supabase().rpc('get_fiction_profile', { p_user: userId });
    if (error) { if (['PGRST202', '42883'].includes(error.code)) return null; throw error; }
    return data as FictionProfile | null;
  });
  const { characters } = useCharacters();
  const p = profile.data;

  if (profile.error || p === null) return null;
  if (!p) return <section className={c.showcase} aria-label="Personnages"><h2>Personnages</h2><p className={c.hint}>Chargement…</p></section>;
  if (!p.visible) return <section className={c.showcase} aria-label="Personnages"><h2>Personnages</h2><p className={c.hint}>Ce joueur garde ses personnages pour lui.</p></section>;

  const favorites = p.favorites.map(id => characters.find(ch => ch.id === id)).filter((ch): ch is NonNullable<typeof ch> => !!ch);
  const rate = p.considered ? Math.round((p.agreement / p.considered) * 100) : null;

  return <section className={c.showcase} aria-label="Personnages">
    <div className={c.showcaseHead}>
      <h2>Personnages</h2>
      <span className={c.typerBadge}>{typerTitle(p)}</span>
    </div>
    <p className={c.hint}>
      {p.votes} vote{p.votes > 1 ? 's' : ''} · {p.reasons} argument{p.reasons > 1 ? 's' : ''}
      {rate !== null ? ` · ${rate} % d’accord avec la communauté (sur ${p.considered} personnage${p.considered > 1 ? 's' : ''} avec consensus)` : ''}
    </p>
    <h3>♥ Favoris {p.favoriteCount > 0 ? `(${p.favoriteCount})` : ''}</h3>
    {favorites.length === 0
      ? <p className={c.hint}>{owner ? <>Aucun favori pour l’instant. <Link href="/personnages/">Parcourir les personnages</Link> et appuyer sur ♡.</> : 'Aucun favori pour l’instant.'}</p>
      : <ul className={c.strip}>
        {favorites.slice(0, 12).map(ch => <li key={ch.id}>
          <Link className={c.person} href={characterUrl(ch)}>
            <Portrait character={ch} />
            <strong>{ch.name}</strong>
            <small>{typeLine(ch)}</small>
          </Link>
        </li>)}
      </ul>}
    {owner && <p className={c.hint}><Link href="/personnages/">Voter pour des personnages</Link> · Choisis plus bas si les autres voient cette partie.</p>}
  </section>;
}
