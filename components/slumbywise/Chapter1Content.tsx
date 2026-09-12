'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CHAPTER1_TITLE, CHAPTER1_BODY } from '@/lib/content/chapter1';

export function Chapter1Content() {
  useSlumbywiseBody();

  return (
    <>
      <SlumbywiseStyles />

      <div className="sw-root">
        <SlumbywiseNav />

        <article className="sw-page-hero" style={{ maxWidth: 760 }}>
          <Link href="/" className="sw-btn-ghost">← Retour</Link>

          <div className="sw-eyebrow" style={{ marginTop: 40 }}>Offert aux inscrits de la lettre</div>
          <h1 className="sw-section-title" style={{ marginTop: 12 }}>{CHAPTER1_TITLE}</h1>

          <div className="sw-article-body">
            {CHAPTER1_BODY.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <p className="sw-letter-note" style={{ marginTop: 32 }}>
            La suite ? <Link href="/#letter">Reçois la lettre du carnet chaque mois</Link> ou{' '}
            <Link href="/carnet">lis les autres entrées publiées</Link>.
          </p>
        </article>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
