import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoContent } from '@/components/slumbywise/InfoContent';

const description = 'Denshiku, l’association qui porte Slumbywise : un numérique bien utilisé pour les enfants et les personnes âgées, des étudiants rémunérés et une aide aux enfants démunis dans le monde.';

export const metadata: Metadata = {
  title: 'Denshiku — L’héritage, c’est le partage | Slumbywise',
  description,
  openGraph: { title: 'Denshiku — L’héritage, c’est le partage', description, url: '/association/', siteName: 'Slumbywise', locale: 'fr_FR', type: 'website', images: [{ url: '/images/slumbywise/night-window.jpg', width: 1659, height: 948 }] },
};

export default function AssociationPage() {
  return <InfoContent title="Denshiku." intro="L’héritage, c’est le partage. Donne et échange ce qui a de la valeur, pas ce qui est matériel. Donne-lui de quoi ne pas être gourmand s’il a faim.">
    <section><h2>Notre objectif</h2><p>Accompagner les enfants et les personnes âgées dans le numérique : qu’il serve à apprendre, se reposer et grandir, plutôt qu’à s’y perdre.</p></section>
    <section><h2>Où va l’argent</h2><p>Une partie de ce que nous gagnons rémunère des étudiants.</p><p>L’autre partie revient à l’association, qui aide les enfants démunis dans le monde entier, en particulier dans les pays en développement.</p></section>
    <section><h2>Le projet</h2><p>Slumbywise est le site associatif de Denshiku, consacré au sommeil, en particulier pour celles et ceux qui vivent ou travaillent la nuit : <Link href="/carnet">le Carnet</Link> et <Link href="/livre">le livre</Link>. Pour se divertir : <Link href="/chess">les échecs</Link>, <a href="/game/memoire/">Empreinte</a> et <Link href="/grindleveling">Grindleveling</Link>.</p></section>
    <section><h2>Entrer en contact</h2><p>Pour connaître les actions de l’association, proposer une collaboration ou demander des informations sur son fonctionnement :</p><p><a href="mailto:denshiku.corp@gmail.com">denshiku.corp@gmail.com</a></p></section>
  </InfoContent>;
}
