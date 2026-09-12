'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import type { CarnetArticle } from '@/lib/content/carnetArticles';

export function CarnetArticleContent({ article }: { article: CarnetArticle }) {
  useSlumbywiseBody();

  return (
    <>
      <SlumbywiseStyles />

      <div className="sw-root">
        <SlumbywiseNav />

        <article className="sw-page-hero" style={{ maxWidth: 760 }}>
          <Link href="/carnet" className="sw-btn-ghost">← Retour au carnet</Link>

          <div className="sw-blog-meta" style={{ marginTop: 40 }}>
            <span className="sw-num">{article.num}</span>
            <span>{article.date}</span>
            <span>· {article.tag}</span>
          </div>

          <h1 className="sw-section-title" style={{ marginTop: 12 }}>{article.title}</h1>
          <p className="sw-hero-message" style={{ marginTop: 8, marginBottom: 0 }}>{article.excerpt}</p>

          <div className="sw-article-body">
            {article.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </article>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
