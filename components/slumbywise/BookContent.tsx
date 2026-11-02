'use client';

import Link from 'next/link';
import { SlumbywiseStyles, useSlumbywiseBody, WHATSAPP_ORDER_URL } from './SlumbywiseStyles';
import { SlumbywiseNav } from './SlumbywiseNav';
import { SlumbywiseFooter } from './SlumbywiseFooter';
import styles from './book.module.css';

const PRACTICES = [
  {
    number: '01',
    title: 'Comprendre ton rythme',
    text: 'Prendre le temps d’observer tes nuits, tes moments d’attention et tes besoins de repos. Partir de ta vie telle qu’elle est.',
  },
  {
    number: '02',
    title: 'Habiter tes nuits',
    text: 'Faire une place aux gestes du quotidien : préparer son environnement, construire ses rituels et trouver une transition après la veille.',
  },
  {
    number: '03',
    title: 'Garder le lien',
    text: 'Vivre en décalé tout en préservant des moments partagés. Donner une place aux autres dans un rythme qui ne ressemble pas toujours au leur.',
  },
];

export function BookContent() {
  useSlumbywiseBody();

  return (
    <>
      <SlumbywiseStyles />
      <div className="sw-root">
        <SlumbywiseNav />
        <main className={styles.main}>
          <div className={styles.breadcrumb} aria-label="Fil d’Ariane">
            <Link href="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <span>Le Livre</span>
          </div>

          <section className={styles.hero} aria-labelledby="book-title">
            <div className={styles.coverStage}>
              <img
                src="/images/slumbywise/carnet-du-concierge-cover.jpg"
                alt="Couverture du livre Le Carnet du Concierge"
                className={styles.cover}
                fetchPriority="high"
              />
              <span className={styles.coverCaption}>Un livre Slumbywise</span>
            </div>

            <div className={styles.intro}>
              <p className={styles.eyebrow}>Le Livre</p>
              <h1 id="book-title" className={styles.title}>Le Carnet<br />du <em>Concierge.</em></h1>
              <p className={styles.subtitle}>Des repères pour mieux vivre tes nuits.</p>
              <p className={styles.description}>
                Travailler, créer, veiller. Quand ton quotidien se déroule à d’autres heures,
                trouver ton rythme demande de l’attention. Ce guide t’accompagne dans cette
                pratique, avec des pistes à essayer et des habitudes à construire, nuit après nuit.
              </p>

              <div className={styles.order}>
                <p className={styles.price}>19 <span>EUR</span></p>
                <a className="sw-btn-primary" href={WHATSAPP_ORDER_URL} target="_blank" rel="noopener noreferrer">
                  Commander le livre
                </a>
              </div>
              <p className={styles.orderNote}>Commande par échange direct sur WhatsApp.</p>

              <div className={styles.readingLink}>
                <span>Envie de commencer par une lecture ?</span>
                <Link href="/carnet">Parcourir les articles du Carnet <span aria-hidden="true">↗</span></Link>
              </div>
            </div>
          </section>

          <section className={styles.practice} aria-labelledby="practice-title">
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Au quotidien</p>
              <h2 id="practice-title">Lire. Essayer.<br /><em>Trouver ce qui te convient.</em></h2>
              <p>Un livre à garder près de soi et à retrouver au fil de ses nuits.</p>
            </div>
            <div className={styles.practiceList}>
              {PRACTICES.map(practice => (
                <div className={styles.practiceItem} key={practice.number}>
                  <span className={styles.number}>{practice.number}</span>
                  <div>
                    <h3>{practice.title}</h3>
                    <p>{practice.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.carnetLink} aria-labelledby="carnet-link-title">
            <div>
              <p className={styles.eyebrow}>Continuer la lecture</p>
              <h2 id="carnet-link-title">Le Carnet, <em>au fil des articles.</em></h2>
              <p>Les articles en ligne prolongent la réflexion autour de la nuit, des habitudes et de la vie en décalé.</p>
            </div>
            <Link href="/carnet" className="sw-btn-ghost">Lire les articles</Link>
          </section>
        </main>
        <SlumbywiseFooter />
      </div>
    </>
  );
}
