// Éléments des pages statiques des personnages, rendus au moment de la construction (sans JavaScript requis).
// Pas de 'use client' : utilisable depuis les pages serveur. Portrait reste un composant client.

import Link from 'next/link';
import s from '@/components/allflix/allflix.module.css';
import { Portrait } from './TitleCharacters';
import { characterUrl } from '@/lib/characterPages';
import type { TypedCharacter } from '@/lib/characters';

export const typeLabel = (ch: TypedCharacter) =>
  ch.typing ? [ch.typing.mbti, ch.typing.enneagram].filter(Boolean).join(' / ') : 'Non typé';

/** Retire les champs inutiles côté navigateur (le portrait n'a besoin que de l'image et du nom). */
const portraitOf = (ch: TypedCharacter) => ({ id: ch.id, name: ch.name, image: ch.image, imageKind: ch.imageKind, titleId: ch.titleId, title: ch.title, source: ch.source, sourceUrl: ch.sourceUrl });

export function StaticCard({ ch }: { ch: TypedCharacter }) {
  return <Link className={s.card} href={characterUrl(ch)}>
    <Portrait character={portraitOf(ch)} tag={typeLabel(ch)} />
    <h3>{ch.name}</h3>
    <p>{ch.title}</p>
  </Link>;
}

export function StaticGrid({ characters }: { characters: TypedCharacter[] }) {
  return <div className={s.grid}>{characters.map(ch => <StaticCard key={ch.id} ch={ch} />)}</div>;
}

export const anilistCreditStatic = <p>Personnages d’animés et leurs illustrations : <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>.</p>;
