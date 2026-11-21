'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import { NewsletterSection } from './NewsletterSection';
import styles from './carnet.module.css';

export function CarnetContent() {
  useSlumbywiseBody();
  return (
    <>
      <SlumbywiseStyles />

      <div className="sw-root">
        <SlumbywiseNav />

        <main>
          <header className={styles.header}>
            <div className={styles.breadcrumb} aria-label="Fil d’Ariane">
              <Link href="/">Accueil</Link>
              <span aria-hidden="true">/</span>
              <span>Le Carnet</span>
            </div>
            <p className={styles.eyebrow}>Le Carnet</p>
            <h1 className={styles.title}>Des articles pour<br /><em>habiter la nuit.</em></h1>
            <p className={styles.introduction}>Rythmes décalés, habitudes et liens du quotidien. Des lectures pour prendre du recul, trouver des idées et poursuivre la réflexion.</p>
          </header>

          <section className={styles.articles} aria-label="Les articles du Carnet">
            <div className={styles.articlesHeading}>
              <h2>Toutes les lectures</h2>
              <span>{CARNET_ARTICLES.length} articles</span>
            </div>
            <div className={styles.articleGrid}>
              {CARNET_ARTICLES.map(a => (
                <Link href={`/carnet/${a.slug}`} key={a.num} className={styles.articleCard}>
                  <div className={styles.articleMeta}>
                    <span>{a.num}</span>
                    <span>{a.tag}</span>
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.excerpt}</p>
                  <span className={styles.readLink}>Lire l&apos;article <span aria-hidden="true">↗</span></span>
                </Link>
              ))}
            </div>
          </section>

          <aside className={styles.bookNote}>
            <div>
              <p className={styles.eyebrow}>Le Livre</p>
              <h2>Le Carnet du Concierge</h2>
              <p>Un guide pratique à garder près de soi, pour accompagner tes nuits au quotidien.</p>
            </div>
            <Link href="/livre" className="sw-btn-ghost">Découvrir le livre</Link>
          </aside>

        <NewsletterSection />
        </main>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
