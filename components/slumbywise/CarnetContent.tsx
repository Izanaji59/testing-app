'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';

const ARTICLES = [
  {
    num: 'N° 003',
    date: '17 nov. 2026',
    tag: 'Habiter',
    title: <>Pourquoi la <em>lumière chaude</em> à 2700K change une nuit de garde.</>,
    excerpt: "Le veilleur d'hôpital, l'ouvrier en 3×8 et l'insomniaque partagent un même adversaire silencieux : la lumière blanche des néons. Retour sur un des rituels les plus simples et les plus sous-estimés du livre.",
  },
  {
    num: 'N° 002',
    date: '03 nov. 2026',
    tag: 'Subir',
    title: <>Blaise, barman : <em>« Épanoui la nuit, la clientèle est différente. »</em></>,
    excerpt: "Premier des entretiens de la série Fraternité silencieuse. Blaise raconte pourquoi la nuit lui va, comment il dort d'un seul bloc après le service, et ce que le jour ne lui offre plus depuis longtemps.",
  },
  {
    num: 'N° 001',
    date: '20 oct. 2026',
    tag: 'Partager',
    title: <>Le couple <em>en décalé :</em> géométrie des présences.</>,
    excerpt: "Quand l'un rentre, l'autre part. Les protocoles concrets — les trente minutes sacrées, le repas hebdomadaire ritualisé, les week-ends recalés — qui font tenir un couple séparé par les horaires.",
  },
];

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
              {ARTICLES.map(a => (
                <a href="#" key={a.num} className="sw-blog-card">
                  <div className="sw-blog-meta">
                    <span className="sw-num">{a.num}</span>
                    <span>{a.date}</span>
                    <span>· {a.tag}</span>
                  </div>
                  <h3 className="sw-blog-cardtitle">{a.title}</h3>
                  <p className="sw-blog-excerpt">{a.excerpt}</p>
                  <div className="sw-blog-read">Lire</div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <SlumbywiseFooter />
      </div>
    </>
  );
}
