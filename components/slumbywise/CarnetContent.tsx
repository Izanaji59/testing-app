'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import { CARNET_ARTICLES } from '@/lib/content/carnetArticles';
import { supabase } from '@/lib/supabase/client';

export function CarnetContent() {
  useSlumbywiseBody();
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function handleNewsletterSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    if (typeof email !== 'string' || !email) return;

    setNewsletterStatus('sending');
    const { error } = await supabase().from('newsletter_subscribers').insert({ email });
    // Doublon = déjà inscrit·e : on traite ça comme un succès, pas une erreur.
    setNewsletterStatus(error && error.code !== '23505' ? 'error' : 'done');
  }

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

        <section className="sw-letter" id="letter">
          <div className="sw-letter-inner">
            <div className="sw-eyebrow sw-letter-eyebrow">La lettre du carnet</div>
            <h2 className="sw-letter-title">Une lettre par mois. <em>Le Chapitre 1 offert.</em></h2>
            <p className="sw-letter-desc">Une lecture longue, un entretien avec un veilleur, une découverte scientifique récente sur le sommeil et la chronobiologie. Envoyée le premier samedi du mois. En t&apos;inscrivant, le Chapitre 1 du livre t&apos;est offert tout de suite.</p>

            {newsletterStatus === 'done' ? (
              <p className="sw-letter-desc" style={{ color: 'var(--pool-teal)' }}>
                C&apos;est fait — merci. <Link href="/carnet/chapitre-1" style={{ color: 'var(--amber)', textDecoration: 'underline' }}>Lire le Chapitre 1 offert →</Link>
              </p>
            ) : (
              <form className="sw-letter-form" onSubmit={handleNewsletterSubmit}>
                <input type="email" name="email" placeholder="ton adresse email" required disabled={newsletterStatus === 'sending'} />
                <button type="submit" disabled={newsletterStatus === 'sending'}>
                  {newsletterStatus === 'sending' ? 'Inscription…' : "S'inscrire"}
                </button>
              </form>
            )}
            {newsletterStatus === 'error' && (
              <p className="sw-letter-note" style={{ color: '#e05a5a' }}>Un souci est survenu — réessaie dans un instant.</p>
            )}
            <p className="sw-letter-note">Aucune publicité. Un lien de désinscription à chaque lettre.</p>
          </div>
        </section>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
