'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Frame } from '@/components/allflix/Allflix';
import s from '@/components/allflix/allflix.module.css';
import c from './characters.module.css';
import { useCharacters } from './useCharacters';
import { Portrait, anilistCredit, typeLine } from './TitleCharacters';
import { CHARACTER_ID, characterHref, type TypedCharacter } from '@/lib/characters';
import { MBTI_GROUPS, MBTI_RANK_PROFILES, type MbtiGroupKey } from '@/lib/engine/rankTitles';
import { MBTI_CLASSES, type MbtiType } from '@/lib/engine/mbtiClasses';
import { AddCharacter, CharacterCommunity } from './CommunityForms';
import { FavoriteButton } from './FavoriteButton';
import { useFictionCommunity } from './useFictionCommunity';
import { nextToVote } from '@/lib/engine/fictionVote';

const TYPES = Object.keys(MBTI_RANK_PROFILES) as MbtiType[];
const isType = (value: string): value is MbtiType => (TYPES as string[]).includes(value);
const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function CharacterCard({ ch, favorite = false }: { ch: TypedCharacter; favorite?: boolean }) {
  return <Link className={s.card} href={characterHref(ch.id)}>
    <Portrait character={ch} tag={(favorite ? '♥ ' : '') + typeLine(ch)} />
    <h3>{ch.name}</h3>
    <p>{ch.title}</p>
  </Link>;
}

export function CharactersCatalog() {
  const { characters, loading, error, retry } = useCharacters();
  const community = useFictionCommunity();
  const favorites = useMemo(() => new Set(community.data?.myFavorites ?? []), [community.data]);
  const voted = useMemo(() => new Set([...Object.keys(community.data?.myVotes ?? {}), ...Object.keys(community.data?.myEnneagrams ?? {})]), [community.data]);
  const myType = community.data?.myType && isType(community.data.myType) ? community.data.myType : null;
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
    (type === '' || (type === 'typed' ? !!ch.typing : type === 'untyped' ? !ch.typing : type === 'favorites' ? favorites.has(ch.id) : type === 'tovote' ? !voted.has(ch.id) : ch.typing?.mbti === type))
  ), [characters, query, type, favorites, voted]);
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
          {community.user && <option value="favorites">♥ Mes favoris ({favorites.size})</option>}
          {community.user && <option value="tovote">Pas encore votés par moi</option>}
          {(Object.keys(MBTI_GROUPS) as MbtiGroupKey[]).map(g => <optgroup key={g} label={MBTI_GROUPS[g].label}>
            {TYPES.filter(t => MBTI_RANK_PROFILES[t].group === g).map(t => <option key={t} value={t}>{t} · {MBTI_RANK_PROFILES[t].profile}</option>)}
          </optgroup>)}
        </select>
      </label>
    </div>
    {myType && type !== myType && <p className={c.lookalike}>Ton type : <strong>{myType}</strong>. <button type="button" onClick={() => chooseType(myType)}>Voir les personnages qui te ressemblent →</button></p>}
    <AddCharacter/>
    {loading && <p role="status" className={s.empty}>Chargement des personnages…</p>}
    {error && <div className={s.empty} role="alert"><h3>Les personnages n’ont pas pu être chargés.</h3><button onClick={retry}>Réessayer</button></div>}
    {!loading && !error && <>
      <p className={s.resultCount} role="status">{list.length} personnage{list.length > 1 ? 's' : ''}</p>
      {list.length
        ? <div className={s.grid}>{list.map(ch => <CharacterCard key={ch.id} ch={ch} favorite={favorites.has(ch.id)} />)}</div>
        : <div className={s.empty}><h3>Aucun personnage ici.</h3><p>{type === 'favorites' ? 'Ajoute un personnage à tes favoris depuis sa fiche : ♡.' : type === 'tovote' ? 'Tu as voté pour tous les personnages. Bravo.' : 'Tu peux ajouter un personnage et proposer son type MBTI.'}</p></div>}
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
  const { characters, loading, communityLoading, error, retry } = useCharacters();
  const community = useFictionCommunity();
  const ch = characters.find(x => x.id === id);
  const typing = ch?.typing;
  const profile = typing?.mbti ? MBTI_RANK_PROFILES[typing.mbti] : null;
  const sameType = typing?.mbti ? characters.filter(x => x.id !== ch!.id && x.typing?.mbti === typing.mbti).slice(0, 12) : [];
  // Même œuvre : par identifiant d'œuvre, sinon par titre (personnages ajoutés sans œuvre du catalogue).
  const work = ch ? characters.filter(x => (ch.titleId ? x.titleId === ch.titleId : x.title === ch.title)) : [];
  const sameTitle = work.filter(x => x.id !== ch?.id);
  const voted = new Set([...Object.keys(community.data?.myVotes ?? {}), ...Object.keys(community.data?.myEnneagrams ?? {})]);
  const nextId = ch ? nextToVote(work.map(x => x.id), ch.id, voted) : null;
  /** Mode marathon : on change de fiche sans recharger la page. */
  const goTo = useCallback((next: string) => {
    history.pushState(null, '', characterHref(next));
    setId(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return <Frame extraCredit={anilistCredit}><main className={s.detail}>
    <Link className={s.back} href="/personnages/">Tous les personnages</Link>
    {(!ready || (id && (loading || communityLoading && id.startsWith('community-char-')))) && <p role="status" className={s.empty}>Chargement du personnage…</p>}
    {ready && !loading && !communityLoading && (!id || error || !ch) && <div className={s.empty}>
      <h1>Ce personnage est introuvable.</h1>
      {error ? <button onClick={retry}>Réessayer</button> : <p>Retrouve les personnages disponibles dans la liste.</p>}
    </div>}
    {ch && <>
      <section className={s.titleIntro}>
        <div className={s.detailCover}><Portrait character={ch} /></div>
        <div>
          <span className={s.eyebrow}>{ch.role ? `${ch.role} / ` : ''}{ch.titleId?<Link href={`/allflix/fiche/?id=${ch.titleId}`}>{ch.title}</Link>:ch.title}</span>
          <h1>{ch.name}</h1>
          {ch.nativeName && ch.nativeName !== ch.name && <p lang="ja" className={c.native}>{ch.nativeName}</p>}
          <FavoriteButton characterId={ch.id} />
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
            <p className={c.hint}>{ch.typingSource==='community'?'Type en tête du vote communautaire.':typing.suggested ? 'Suggestion de typage Slumbywise, à valider.' : 'Typage éditorial Slumbywise.'}</p>
          </div> : <p className={c.hint}>Pas encore typé.</p>}
          <p className={c.hint}>
            {ch.imageKind === 'actor' && ch.actor ? `Photo : ${ch.actor}, interprète. ` : ''}
            {ch.communityImage&&'Image proposée par la communauté. '}{ch.source==='community'?'Personnage ajouté par la communauté Slumbywise.':<a href={ch.sourceUrl} target="_blank" rel="noopener noreferrer">Source : {ch.source === 'anilist' ? 'AniList' : 'TMDB'}</a>}
          </p>
        </div>
      </section>
      <CharacterCommunity characterId={ch.id} nextId={nextId} onNext={goTo}/>
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
