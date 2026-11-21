// Page statique d'un type MBTI : « Les personnages INTJ de la fiction ».

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GrindFrame as Frame } from '@/components/grindleveling/GrindFrame';
import s from '@/components/allflix/allflix.module.css';
import c from '@/components/characters/characters.module.css';
import { StaticGrid, anilistCreditStatic } from '@/components/characters/StaticCharacterParts';
import { loadCharacterData } from '@/lib/characterData';
import { SITE, typeUrl } from '@/lib/characterPages';
import { MBTI_GROUPS, MBTI_RANK_PROFILES } from '@/lib/engine/rankTitles';
import { MBTI_CLASSES, type MbtiType } from '@/lib/engine/mbtiClasses';

const TYPES = Object.keys(MBTI_RANK_PROFILES) as MbtiType[];
export const dynamicParams = false;
export const generateStaticParams = () => TYPES.map(t => ({ type: t.toLowerCase() }));

const typeOf = (param: string) => TYPES.find(t => t.toLowerCase() === param) ?? null;

export function generateMetadata({ params }: { params: { type: string } }): Metadata {
  const type = typeOf(params.type);
  if (!type) return {};
  const profile = MBTI_RANK_PROFILES[type];
  const title = `Les personnages ${type} de la fiction (${profile.profile})`;
  const description = `Les personnages de films, séries et animés de type ${type}, ${profile.profile.toLowerCase()} : ${MBTI_CLASSES[type].identity} Vote et débats sur Grindleveling.`.slice(0, 160);
  return { title: `${title} | Grindleveling`, description, alternates: { canonical: SITE + typeUrl(type) },
    openGraph: { title, description, url: SITE + typeUrl(type), siteName: 'Grindleveling', locale: 'fr_FR', type: 'website' } };
}

export default function TypePage({ params }: { params: { type: string } }) {
  const type = typeOf(params.type);
  if (!type) notFound();
  const profile = MBTI_RANK_PROFILES[type];
  const group = MBTI_GROUPS[profile.group];
  const list = loadCharacterData().characters.filter(ch => ch.typing?.mbti === type);
  return <Frame extraCredit={anilistCreditStatic}><main className={s.catalog}>
    <nav aria-label="Fil d’Ariane" className={s.back}><Link href="/personnages/">Personnages</Link> › Type {type}</nav>
    <div className={s.sectionTitle}><div><span className={s.eyebrow}>{group.label}</span><h1 style={{ margin: '6px 0', fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1px' }}>Les personnages {type}</h1></div><p>{list.length} personnage{list.length > 1 ? 's' : ''}</p></div>
    <div className={c.typeBlock} style={{ marginBottom: 28 }}>
      <span className={c.typeCode}>{type}</span>
      <div><strong>{profile.profile} · {MBTI_CLASSES[type].label}</strong><p>{group.keywords}</p><p>{MBTI_CLASSES[type].identity}</p></div>
    </div>
    {list.length ? <StaticGrid characters={list} /> : <div className={s.empty}><h2>Pas encore de personnage {type}.</h2><p>Vote sur les fiches pour en faire apparaître ici.</p></div>}
    <p className={c.hint}>Typages éditoriaux de Grindleveling ; le vote de la communauté est sur chaque fiche.</p>
    <nav aria-label="Autres types" className={c.typeLinks}>{TYPES.filter(t => t !== type).map(t => <Link key={t} href={typeUrl(t)}>{t}</Link>)}</nav>
  </main></Frame>;
}
