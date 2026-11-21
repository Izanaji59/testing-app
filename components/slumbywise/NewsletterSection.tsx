'use client';

// La lettre du Carnet : inscription avec consentement explicite (case non cochée, obligatoire).
// Utilisée sur l'accueil et sur /carnet.

import { useId, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import n from './newsletter.module.css';

export function NewsletterSection({ id = 'letter' }: { id?: string }) {
  const uid = useId();
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [consent, setConsent] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get('email');
    if (typeof email !== 'string' || !email.trim() || !consent) return;
    setStatus('sending');
    try {
      const { error } = await supabase().from('newsletter_subscribers').insert({ email: email.trim() });
      // Une adresse déjà inscrite peut continuer à recevoir la lettre.
      setStatus(error && error.code !== '23505' ? 'error' : 'done');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="sw-letter" id={id} aria-labelledby={`${uid}-title`}>
      <div className="sw-letter-inner">
        <p className={n.eyebrow}>La lettre du Carnet</p>
        <h2 className="sw-letter-title" id={`${uid}-title`}>Continuer la lecture, <em>au fil des nuits.</em></h2>
        <p className="sw-letter-desc">Les nouveaux articles du Carnet sur le sommeil et la vie de nuit, directement dans ta boîte mail.</p>

        {status === 'done' ? (
          <p className="sw-letter-desc" role="status">Merci, ton inscription est bien enregistrée.</p>
        ) : (
          <form onSubmit={submit} className={n.form}>
            <div className={`sw-letter-form ${n.row}`}>
              <label className={n.srOnly} htmlFor={`${uid}-email`}>Ton adresse email</label>
              <input id={`${uid}-email`} type="email" name="email" autoComplete="email" placeholder="Ton adresse email" required disabled={status === 'sending'} />
              <button type="submit" disabled={status === 'sending' || !consent}>
                {status === 'sending' ? 'Inscription…' : "S'inscrire"}
              </button>
            </div>
            <label className={n.consent} htmlFor={`${uid}-consent`}>
              <input id={`${uid}-consent`} type="checkbox" name="consent" required checked={consent} onChange={e => setConsent(e.target.checked)} disabled={status === 'sending'} />
              <span>J’accepte de recevoir la lettre du Carnet par e-mail. Je peux me désinscrire à tout moment. <Link href="/informations#confidentialite">Politique de confidentialité</Link></span>
            </label>
          </form>
        )}
        {status === 'error' && (
          <p className="sw-letter-note" role="alert" style={{ color: '#e7a7a7' }}>L&apos;inscription n&apos;a pas abouti. Réessaie dans un instant.</p>
        )}
        <p className="sw-letter-note">Ton adresse sert uniquement à recevoir la lettre du Carnet.</p>
      </div>
    </section>
  );
}
