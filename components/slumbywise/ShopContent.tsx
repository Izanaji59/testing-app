'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import s from './shop.module.css';

export type Product = { id: string; nom: string; description?: string; prix?: string; image?: string; lien?: string; statut?: 'bientot' | 'disponible' | 'epuise' };

const WHATSAPP = 'https://wa.me/33783416511?text=';
const fetcher = async (url: string) => { const r = await fetch(url); if (!r.ok) throw new Error('Boutique indisponible'); return r.json(); };

/** Lien d'achat HTTPS uniquement ; sinon la commande passe par WhatsApp, comme pour le Livre. */
export function buyHref(p: Product): string {
  try { const u = new URL(p.lien ?? ''); if (u.protocol === 'https:') return u.href; } catch {}
  return WHATSAPP + encodeURIComponent(`Bonjour, je souhaite commander : ${p.nom}.`);
}
const waitlistHref = (p: Product) => WHATSAPP + encodeURIComponent(`Bonjour, prévenez-moi quand « ${p.nom} » sera disponible.`);
const safeImage = (src?: string) => (src && /^\/(?!\/)[\w\-./]+$/.test(src) ? src : null);

export function ShopContent() {
  useSlumbywiseBody();
  const { data, error } = useSWR<{ produits: Product[] }>('/shop/products.json', fetcher);
  const products = (data?.produits ?? []).filter(p => p.id && p.nom);
  return <>
    <SlumbywiseStyles />
    <div className="sw-root">
      <SlumbywiseNav />
      <main className={s.shop}>
        <Link href="/" style={{ color: '#c4b7d7', fontSize: 13, textUnderlineOffset: 4 }}>Accueil</Link>
        <h1>La boutique du sommeil.</h1>
        <p className={s.intro}>Des objets pensés pour les soirs calmes et les nuits réparatrices, dans l’esprit Slumbywise.</p>
        {error && <p role="alert" className={s.note}>La boutique n’a pas pu être chargée. Réessaie dans un instant.</p>}
        {!data && !error && <p role="status" className={s.note}>Chargement de la boutique…</p>}
        <div className={s.grid}>
          {products.map(p => {
            const status = p.statut ?? 'bientot';
            const img = safeImage(p.image);
            return (
              <article key={p.id} className={s.card} aria-labelledby={`produit-${p.id}`}>
                <div className={s.visual}>
                  {img ? <img src={img} alt={p.nom} loading="lazy" /> : <span className={s.placeholder} aria-hidden="true">☾</span>}
                  {status !== 'disponible' && <span className={s.badge}>{status === 'epuise' ? 'Épuisé' : 'Bientôt'}</span>}
                </div>
                <div className={s.body}>
                  <h2 id={`produit-${p.id}`}>{p.nom}</h2>
                  {p.description && <p>{p.description}</p>}
                  {p.prix && <p className={s.price}>{p.prix}</p>}
                  <div className={s.action}>
                    {status === 'disponible'
                      ? <a href={buyHref(p)} target="_blank" rel="noopener noreferrer">Commander</a>
                      : status === 'bientot'
                        ? <a className={s.waitlist} href={waitlistHref(p)} target="_blank" rel="noopener noreferrer">Me prévenir</a>
                        : <span>Indisponible</span>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className={s.note}>Les commandes et les demandes passent par un échange direct sur WhatsApp, ou par la page de paiement indiquée sur l’article.</p>
      </main>
      <SlumbywiseFooter />
    </div>
  </>;
}
