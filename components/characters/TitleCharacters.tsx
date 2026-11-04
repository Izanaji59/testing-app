'use client';

import { useState } from 'react';
import Link from 'next/link';
import s from '@/components/allflix/allflix.module.css';
import c from './characters.module.css';
import { useCharacters } from './useCharacters';
import { characterHref, type Character, type TypedCharacter } from '@/lib/characters';

export const anilistCredit = <p>Personnages d’animés et leurs illustrations : <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>.</p>;

export const typeLine = (ch: TypedCharacter) =>
  ch.typing ? [ch.typing.mbti, ch.typing.enneagram].filter(Boolean).join(' · ') : 'Non typé';

export function Portrait({ character, tag }: { character: Character; tag?: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={s.cover}>
    {character.image && !failed ? <img src={character.image} alt="" loading="lazy" onError={() => setFailed(true)} /> : <span>{character.name}</span>}
    {tag && <span className={s.coverTag}>{tag}</span>}
  </div>;
}

/** Rangée « Personnages » d'une fiche Allflix. */
export function TitleCharacters({ titleId }: { titleId: string }) {
  const { characters, loading } = useCharacters();
  const list = characters.filter(ch => ch.titleId === titleId || ch.alsoIn?.includes(titleId));
  if (loading || !list.length) return null;
  return <section className={c.titleSection} aria-label="Personnages">
    <h2>Personnages</h2>
    <ul className={c.strip}>
      {list.map(ch => <li key={ch.id}>
        <Link className={c.person} href={characterHref(ch.id)}>
          <Portrait character={ch} />
          <strong>{ch.name}</strong>
          <small>{typeLine(ch)}</small>
        </Link>
      </li>)}
    </ul>
  </section>;
}
