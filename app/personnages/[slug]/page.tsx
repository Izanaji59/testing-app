// Page statique d'un personnage : contenu visible de Google, vote et favoris interactifs.

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Frame } from '@/components/allflix/Allflix';
import s from '@/components/allflix/allflix.module.css';
import c from '@/components/characters/characters.module.css';
import { Portrait } from '@/components/characters/TitleCharacters';
import { FavoriteButton } from '@/components/characters/FavoriteButton';
import { CharacterVoteIsland } from '@/components/characters/CharacterVoteIsland';
import { StaticGrid, anilistCreditStatic } from '@/components/characters/StaticCharacterParts';
import { loadCharacterData, workKey } from '@/lib/characterData';
import { SITE, characterDescription, characterUrl, typeUrl, workUrl } from '@/lib/characterPages';
import { MBTI_GROUPS, MBTI_RANK_PROFILES } from '@/lib/engine/rankTitles';
import { MBTI_CLASSES } from '@/lib/engine/mbtiClasses';

export const dynamicParams = false;

export function generateStaticParams() {
  return [...loadCharacterData().bySlug.keys()].map(slug => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const ch = loadCharacterData().bySlug.get(params.slug);
  if (!ch) return {};
  const title = `${ch.name} : type MBTI et ennéagramme (${ch.title})`;
  const description = characterDescription(ch.name, ch.title, ch.typing?.mbti ?? null, ch.typing?.enneagram ?? null);
  const url = SITE + characterUrl(ch);
  return {
    title: `${title} | Grindleveling`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Grindleveling', locale: 'fr_FR', type: 'profile', images: ch.image ? [{ url: ch.image, alt: `Portrait de ${ch.name}` }] : undefined },
  };
}

export default function CharacterPage({ params }: { params: { slug: string } }) {
  const data = loadCharacterData();
  const ch = data.bySlug.get(params.slug);
  if (!ch) notFound();
  const typing = ch.typing;
  const profile = typing?.mbti ? MBTI_RANK_PROFILES[typing.mbti] : null;
  const work = data.works.find(w => w.titleId === workKey(ch));
  const sameWork = (work?.characters ?? []).filter(x => x.id !== ch.id);
  const sameType = typing?.mbti ? data.characters.filter(x => x.id !== ch.id && x.typing?.mbti === typing.mbti).slice(0, 12) : [];
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'WebPage', name: `${ch.name} : type MBTI`, url: SITE + characterUrl(ch),
    about: { '@type': 'Thing', name: ch.name, description: `Personnage de ${ch.title}` },
    breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Personnages', item: SITE + '/personnages/' },
      ...(work ? [{ '@type': 'ListItem', position: 2, name: work.title, item: SITE + workUrl(work.slug) }] : []),
      { '@type': 'ListItem', position: work ? 3 : 2, name: ch.name, item: SITE + characterUrl(ch) },
    ] },
  };

  return <Frame extraCredit={anilistCreditStatic}><main className={s.detail}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    <nav aria-label="Fil d’Ariane" className={s.back}>
      <Link href="/personnages/">Personnages</Link>{work && <> › <Link href={workUrl(work.slug)}>{work.title}</Link></>} › {ch.name}
    </nav>
    <section className={s.titleIntro}>
      <div className={s.detailCover}><Portrait character={{ id: ch.id, name: ch.name, image: ch.image, imageKind: ch.imageKind, titleId: ch.titleId, title: ch.title, source: ch.source, sourceUrl: ch.sourceUrl }} /></div>
      <div>
        <span className={s.eyebrow}>{ch.role ? `${ch.role} / ` : ''}{ch.titleId ? <Link href={`/allflix/fiche/?id=${ch.titleId}`}>{ch.title}</Link> : ch.title}</span>
        <h1>{ch.name}</h1>
        {ch.nativeName && ch.nativeName !== ch.name && <p lang="ja" className={c.native}>{ch.nativeName}</p>}
        <FavoriteButton characterId={ch.id} />
        {typing ? <div className={c.typing}>
          {typing.mbti && profile && <div className={c.typeBlock}>
            <Link href={typeUrl(typing.mbti)} className={c.typeCode}>{typing.mbti}</Link>
            <div>
              <strong>{profile.profile} · {MBTI_CLASSES[typing.mbti].label}</strong>
              <p>{MBTI_GROUPS[profile.group].label} — {MBTI_GROUPS[profile.group].keywords}</p>
              <p>{MBTI_CLASSES[typing.mbti].identity}</p>
            </div>
          </div>}
          {typing.enneagram && <p className={c.enneagram}>Ennéagramme <strong>{typing.enneagram}</strong></p>}
          {typing.note && <p className={s.synopsis}>{typing.note}</p>}
          <p className={c.hint}>{typing.suggested ? 'Suggestion de typage Grindleveling, à confirmer par ton vote.' : 'Typage éditorial Grindleveling.'}</p>
        </div> : <p className={c.hint}>Pas encore typé : donne ton avis ci-dessous.</p>}
        <p className={c.hint}>
          {ch.imageKind === 'actor' && ch.actor ? `Photo : ${ch.actor}, interprète. ` : ''}
          <a href={ch.sourceUrl} target="_blank" rel="noopener noreferrer">Source : {ch.source === 'anilist' ? 'AniList' : 'TMDB'}</a>
        </p>
      </div>
    </section>
    <CharacterVoteIsland characterId={ch.id} work={(work?.characters ?? [ch]).map(x => ({ id: x.id, url: characterUrl(x) }))} />
    {sameType.length > 0 && typing?.mbti && <section className={c.related}>
      <div className={s.sectionTitle}><h2>Autres {typing.mbti}</h2><Link href={typeUrl(typing.mbti)}>Tous les personnages {typing.mbti}</Link></div>
      <StaticGrid characters={sameType} />
    </section>}
    {sameWork.length > 0 && work && <section className={c.related}>
      <div className={s.sectionTitle}><h2>Dans {work.title}</h2><Link href={workUrl(work.slug)}>Les types de {work.title}</Link></div>
      <StaticGrid characters={sameWork} />
    </section>}
  </main></Frame>;
}
