'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';

export function CarnetContent() {
  useSlumbywiseBody();

  return (
    <>
      <SlumbywiseStyles />

      <div className="sw-root">
        <SlumbywiseNav />

        <div className="sw-page-hero">
          <Link href="/" className="sw-btn-ghost">← Retour</Link>
          <div className="sw-eyebrow" style={{ marginTop: 40 }}>Le carnet</div>
          <h1 className="sw-section-title">Nuit après nuit, <em>nous continuons d&apos;écrire.</em></h1>
        </div>

        <section className="sw-blog">
          <div className="sw-section-inner" style={{ paddingTop: 0 }}>
            <div className="sw-blog-grid">
              {CARNET_ARTICLES.map(a => (
                <Link href={`/carnet/${a.slug}`} key={a.num} className="sw-blog-card">
                  <div className="sw-blog-meta">
                    <span className="sw-num">{a.num}</span>
                    <span>{a.date}</span>
                    <span>· {a.tag}</span>
                  </div>
                  <h3 className="sw-blog-cardtitle">{a.title}</h3>
                  <p className="sw-blog-excerpt">{a.excerpt}</p>
                  <div className="sw-blog-read">Lire</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
