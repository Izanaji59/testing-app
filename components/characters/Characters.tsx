'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Frame } from '@/components/allflix/Allflix';
import s from '@/components/allflix/allflix.module.css';
import c from './characters.module.css';
import { useCharacters } from './useCharacters';
import { Portrait, typeLine } from './TitleCharacters';
import { CHARACTER_ID, characterHref, type TypedCharacter } from '@/lib/characters';
import { MBTI_GROUPS, MBTI_RANK_PROFILES, type MbtiGroupKey } from '@/lib/engine/rankTitles';
import { MBTI_CLASSES, type MbtiType } from '@/lib/engine/mbtiClasses';

const TYPES = Object.keys(MBTI_RANK_PROFILES) as MbtiType[];
const isType = (value: string): value is MbtiType => (TYPES as string[]).includes(value);
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const anilistCredit = <p>Personnages d’animés et leurs illustrations : <a href="https://anilist.co" target="_blank" rel="noopener noreferrer">AniList</a>.</p>;

function CharacterCard({ ch }: { ch: TypedCharacter }) {
  return <Link className={s.card} href={characterHref(ch.id)}>
    <Portrait character={ch} tag={typeLine(ch)} />
    <h3>{ch.name}</h3>
    <p>{ch.title}</p>
  </Link>;
}

export function CharactersCatalog() {
  const { characters, loading, error, retry } = useCharacters();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  useEffect(() => {
    const value = (new URLSearchParams(location.search).get('type') ?? '').toUpperCase();
    if (isType(value)) setType(value);
  }, []);
  function chooseType(value: string) {
    setType(value);
    history.replaceState(null, '', isType(value) ? `?type=${value}` : location.pathname);
  }
  const list = useMemo(() => characters.filter(ch =>
    (!query || normalize(`${ch.name} ${ch.nativeName ?? ''} ${ch.title}`).includes(normalize(query))) &&
    (type === '' || (type === 'typed' ? !!ch.typing : type === 'untyped' ? !ch.typing : ch.typing?.mbti === type))
  ), [characters, query, type]);
  const typedCount = characters.filter(ch => ch.typing).length;

  return <Frame extraCredit={anilistCredit}><main className={s.catalog}>
    <div className={s.sectionTitle}>
      <div><span className={s.eyebrow}>Personnages</span><h2>{isType(type) ? `Les ${type} de la fiction` : 'Les types MBTI de la fiction'}</h2></div>
      {!loading && !error && <p>{typedCount} typés sur {characters.length}</p>}
    </div>
    <div className={s.searchRow}>
      <label className={s.search}><span>Rechercher un personnage ou une œuvre</span>
        <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Un personnage, un film, un animé…" />
      </label>
      <label className={s.select}>Type
        <select aria-label="Type" value={type} onChange={e => chooseType(e.target.value)}>
          <option value="">Tous</option>
          <option value="typed">Typés</option>
          <option value="untyped">Non typés</option>
          {(Object.keys(MBTI_GROUPS) as MbtiGroupKey[]).map(g => <optgroup key={g} label={MBTI_GROUPS[g].label}>
            {TYPES.filter(t => MBTI_RANK_PROFILES[t].group === g).map(t => <option key={t} value={t}>{t} · {MBTI_RANK_PROFILES[t].profile}</option>)}
          </optgroup>)}
        </select>
      </label>
    </div>
    {loading && <p role="status" className={s.empty}>Chargement des personnages…</p>}
    {error && <div className={s.empty} role="alert"><h3>Les personnages n’ont pas pu être chargés.</h3><button onClick={retry}>Réessayer</button></div>}
    {!loading && !error && <>
      <p className={s.resultCount} role="status">{list.length} personnage{list.length > 1 ? 's' : ''}</p>
      {list.length
        ? <div className={s.grid}>{list.map(ch => <CharacterCard key={ch.id} ch={ch} />)}</div>
        : <div className={s.empty}><h3>Aucun personnage ici.</h3><p>Un personnage apparaît dans un type dès qu’il est renseigné dans le typage éditorial.</p></div>}
    </>}
  </main></Frame>;
}

export function CharacterDetail() {
  const [id, setId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    function read() {
      const value = new URLSearchParams(location.search).get('id');
      setId(value && CHARACTER_ID.test(value) ? value : null);
      setReady(true);
    }
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  const { characters, loading, error, retry } = useCharacters();
  const ch = characters.find(x => x.id === id);
  const typing = ch?.typing;
  const profile = typing?.mbti ? MBTI_RANK_PROFILES[typing.mbti] : null;
  const sameType = typing?.mbti ? characters.filter(x => x.id !== ch!.id && x.typing?.mbti === typing.mbti).slice(0, 12) : [];
  const sameTitle = ch ? characters.filter(x => x.id !== ch.id && x.titleId === ch.titleId) : [];

  return <Frame extraCredit={anilistCredit}><main className={s.detail}>
    <Link className={s.back} href="/personnages/">Tous les personnages</Link>
    {(!ready || (id && loading)) && <p role="status" className={s.empty}>Chargement du personnage…</p>}
    {ready && !loading && (!id || error || !ch) && <div className={s.empty}>
      <h1>Ce personnage est introuvable.</h1>
      {error ? <button onClick={retry}>Réessayer</button> : <p>Retrouve les personnages disponibles dans la liste.</p>}
    </div>}
    {ch && <>
      <section className={s.titleIntro}>
        <div className={s.detailCover}><Portrait character={ch} /></div>
        <div>
          <span className={s.eyebrow}>{ch.role ? `${ch.role} / ` : ''}<Link href={`/allflix/fiche/?id=${ch.titleId}`}>{ch.title}</Link></span>
          <h1>{ch.name}</h1>
          {ch.nativeName && ch.nativeName !== ch.name && <p lang="ja" className={c.native}>{ch.nativeName}</p>}
          {typing ? <div className={c.typing}>
            {typing.mbti && profile && <div className={c.typeBlock}>
              <span className={c.typeCode}>{typing.mbti}</span>
              <div>
                <strong>{profile.profile} · {MBTI_CLASSES[typing.mbti].label}</strong>
                <p>{MBTI_GROUPS[profile.group].label} — {MBTI_GROUPS[profile.group].keywords}</p>
                <p>{MBTI_CLASSES[typing.mbti].identity}</p>
              </div>
            </div>}
            {typing.enneagram && <p className={c.enneagram}>Ennéagramme <strong>{typing.enneagram}</strong></p>}
            {typing.note && <p className={s.synopsis}>{typing.note}</p>}
            <p className={c.hint}>Typage éditorial Slumbywise.</p>
          </div> : <p className={c.hint}>Pas encore typé.</p>}
          <p className={c.hint}>
            {ch.imageKind === 'actor' && ch.actor ? `Photo : ${ch.actor}, interprète. ` : ''}
            <a href={ch.sourceUrl} target="_blank" rel="noopener noreferrer">Source : {ch.source === 'anilist' ? 'AniList' : 'TMDB'}</a>
          </p>
        </div>
      </section>
      {sameType.length > 0 && typing?.mbti && <section className={c.related}>
        <div className={s.sectionTitle}><h2>Autres {typing.mbti}</h2><Link href={`/personnages/?type=${typing.mbti}`}>Voir tous les {typing.mbti}</Link></div>
        <div className={s.grid}>{sameType.map(x => <CharacterCard key={x.id} ch={x} />)}</div>
      </section>}
      {sameTitle.length > 0 && <section className={c.related}>
        <div className={s.sectionTitle}><h2>Dans {ch.title}</h2></div>
        <div className={s.grid}>{sameTitle.map(x => <CharacterCard key={x.id} ch={x} />)}</div>
      </section>}
    </>}
  </main></Frame>;
}
