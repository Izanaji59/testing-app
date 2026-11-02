'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import { supabase } from '@/lib/supabase/client';
import styles from './carnet.module.css';

export function CarnetContent() {
  useSlumbywiseBody();
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    if (typeof email !== 'string' || !email.trim()) return;

    setNewsletterStatus('sending');
    try {
      const { error } = await supabase().from('newsletter_subscribers').insert({ email: email.trim() });
      // Une adresse déjà inscrite peut continuer à recevoir la lettre.
      setNewsletterStatus(error && error.code !== '23505' ? 'error' : 'done');
    } catch {
      setNewsletterStatus('error');
    }
  }

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

        <section className="sw-letter" id="letter">
          <div className="sw-letter-inner">
            <p className={styles.eyebrow}>La lettre du Carnet</p>
            <h2 className="sw-letter-title">Continuer la lecture, <em>au fil des nuits.</em></h2>
            <p className="sw-letter-desc">Les nouvelles du Carnet et de Slumbywise, directement dans ta boîte mail.</p>

            {newsletterStatus === 'done' ? (
              <p className="sw-letter-desc" role="status">
                Merci, ton inscription est bien enregistrée.
              </p>
            ) : (
              <form className={`sw-letter-form ${styles.newsletterForm}`} onSubmit={handleNewsletterSubmit}>
                <label className={styles.srOnly} htmlFor="carnet-email">Ton adresse email</label>
                <input id="carnet-email" type="email" name="email" autoComplete="email" placeholder="Ton adresse email" required disabled={newsletterStatus === 'sending'} />
                <button type="submit" disabled={newsletterStatus === 'sending'}>
                  {newsletterStatus === 'sending' ? 'Inscription…' : "S'inscrire"}
                </button>
              </form>
            )}
            {newsletterStatus === 'error' && (
              <p className="sw-letter-note" role="alert" style={{ color: '#e7a7a7' }}>L&apos;inscription n&apos;a pas abouti. Réessaie dans un instant.</p>
            )}
            <p className="sw-letter-note">Ton adresse sert à recevoir la lettre du Carnet.</p>
          </div>
        </section>
        </main>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
