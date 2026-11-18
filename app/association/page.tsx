import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoContent } from '@/components/slumbywise/InfoContent';

export const metadata: Metadata = {
  title: 'Denshiku — L’héritage, c’est le partage | Slumbywise',
  description: 'Denshiku, l’association qui porte Slumbywise : digitaliser correctement les enfants et les personnes âgées, rémunérer des étudiants et aider les enfants démunis dans le monde.',
};

export default function AssociationPage() {
  return <InfoContent title="Denshiku." intro="L’héritage, c’est le partage. Donne et échange ce qui a de la valeur, pas ce qui est matériel. Donne-lui de quoi ne pas être gourmand s’il a faim.">
    <section><h2>Notre objectif</h2><p>Digitaliser correctement les enfants et les personnes âgées : que le numérique serve à voir, lire et se divertir correctement, plutôt qu’à s’y perdre.</p></section>
    <section><h2>Où va l’argent</h2><p>Une partie de ce que nous gagnons rémunère des étudiants.</p><p>L’autre partie revient à l’association, qui aide les enfants démunis dans le monde entier, en particulier dans les pays en développement.</p></section>
    <section><h2>Le projet</h2><p>Slumbywise réunit ce que nous faisons : <Link href="/carnet">le Carnet</Link>, <Link href="/livre">le Livre</Link> et <Link href="/allflix/">Allflix</Link> pour voir ou lire correctement ; <Link href="/grindleveling">Grindleveling</Link>, <Link href="/chess">les échecs</Link> et <a href="/game/memoire/">Empreinte</a> pour se divertir correctement.</p></section>
    <section><h2>Entrer en contact</h2><p>Pour connaître les actions de l’association, proposer une collaboration ou demander des informations sur son fonctionnement :</p><p><a href="mailto:denshiku.corp@gmail.com">denshiku.corp@gmail.com</a></p></section>
  </InfoContent>;
}
