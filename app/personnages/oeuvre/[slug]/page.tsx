// Page statique d'une œuvre : « Les types MBTI des personnages de Death Note ».

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Frame } from '@/components/allflix/Allflix';
import s from '@/components/allflix/allflix.module.css';
import c from '@/components/characters/characters.module.css';
import { StaticGrid, anilistCreditStatic } from '@/components/characters/StaticCharacterParts';
import { loadCharacterData } from '@/lib/characterData';
import { SITE, typeUrl, workUrl } from '@/lib/characterPages';

export const dynamicParams = false;
export const generateStaticParams = () => loadCharacterData().works.map(w => ({ slug: w.slug }));

const workOf = (slug: string) => loadCharacterData().works.find(w => w.slug === slug) ?? null;

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const work = workOf(params.slug);
  if (!work) return {};
  const title = `Les types MBTI des personnages de ${work.title}`;
  const names = work.characters.slice(0, 3).map(ch => ch.name).join(', ');
  const description = `${title} : ${names}${work.characters.length > 3 ? '…' : ''} Vote pour leur type MBTI et leur ennéagramme sur Grindleveling.`.slice(0, 160);
  return { title: `${title} | Grindleveling`, description, alternates: { canonical: SITE + workUrl(work.slug) },
    openGraph: { title, description, url: SITE + workUrl(work.slug), siteName: 'Grindleveling', locale: 'fr_FR', type: 'website',
      images: work.characters.find(ch => ch.image)?.image ? [{ url: work.characters.find(ch => ch.image)!.image! }] : undefined } };
}

export default function WorkPage({ params }: { params: { slug: string } }) {
  const work = workOf(params.slug);
  if (!work) notFound();
  const types = new Map<string, number>();
  for (const ch of work.characters) if (ch.typing?.mbti) types.set(ch.typing.mbti, (types.get(ch.typing.mbti) ?? 0) + 1);
  const titleId = work.titleId.startsWith('titre:') ? null : work.titleId;
  return <Frame extraCredit={anilistCreditStatic}><main className={s.catalog}>
    <nav aria-label="Fil d’Ariane" className={s.back}><Link href="/personnages/">Personnages</Link> › {work.title}</nav>
    <div className={s.sectionTitle}>
      <div><span className={s.eyebrow}>Œuvre</span><h1 style={{ margin: '6px 0', fontSize: 'clamp(28px,4vw,44px)', letterSpacing: '-1px' }}>Les types MBTI de {work.title}</h1></div>
      <p>{work.characters.length} personnage{work.characters.length > 1 ? 's' : ''}{titleId && <> · <Link href={`/allflix/fiche/?id=${titleId}`}>Voir l’œuvre sur Allflix</Link></>}</p>
    </div>
    {types.size > 0 && <nav aria-label="Types présents" className={c.typeLinks}>{[...types].sort((a, b) => b[1] - a[1]).map(([t, n]) => <Link key={t} href={typeUrl(t)}>{t} · {n}</Link>)}</nav>}
    <StaticGrid characters={work.characters} />
  </main></Frame>;
}
