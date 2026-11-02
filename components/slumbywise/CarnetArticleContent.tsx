'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import type { CarnetArticle } from '@/lib/content/carnetArticles';
import styles from './carnet.module.css';

export function CarnetArticleContent({ article }: { article: CarnetArticle }) {
  useSlumbywiseBody();

  return (
    <>
      <SlumbywiseStyles />

      <div className="sw-root">
        <SlumbywiseNav />

        <main className={styles.articleMain}>
        <article>
          <Link href="/carnet" className={styles.backLink}>← Tous les articles du Carnet</Link>

          <div className={styles.articleMeta} style={{ marginTop: 48 }}>
            <span>Le Carnet</span>
            <span>{article.tag}</span>
          </div>

          <h1 className={styles.articleTitle}>{article.title}</h1>
          <p className={styles.articleIntroduction}>{article.excerpt}</p>

          <div className="sw-article-body">
            {article.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <div className={styles.articleEnd}>
            <Link href="/carnet">Poursuivre dans les articles <span aria-hidden="true">↗</span></Link>
            <Link href="/livre">Découvrir le livre <span aria-hidden="true">↗</span></Link>
          </div>
        </article>
        </main>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
