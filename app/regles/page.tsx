import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoContent } from '@/components/slumbywise/InfoContent';

export const metadata: Metadata = {
  title: 'Règles de la communauté | Grindleveling',
  description: 'Les règles de la communauté Grindleveling : respect, sécurité, contenus, votes honnêtes et signalement. Version bêta.',
};

/** Règles de conduite (prototype bêta). Les conditions générales complètes viendront à la sortie de la bêta. */
export default function RulesPage() {
  return <InfoContent title="Règles de la communauté." intro="Grindleveling est en version bêta. Ces règles valent pour le tchat, les profils, les votes et arguments sur les personnages, et les événements. Elles sont simples : on débat des types, jamais des personnes.">
    <section id="respect"><h2>Le respect</h2>
      <p>Pas d’insulte, de moquerie, de harcèlement, de menace ni de propos discriminants. On peut être en désaccord sur un type : on argumente, on n’attaque pas la personne.</p>
    </section>
    <section id="securite"><h2>Ta sécurité et celle des autres</h2>
      <p>Ne partage jamais d’adresse personnelle, de numéro de téléphone ni d’informations privées, les tiennes comme celles des autres. Ne publie pas la photo de quelqu’un sans son accord.</p>
      <p>Pour un événement sur place, choisis un lieu public. Si tu es mineur, parles-en à un adulte de confiance avant d’y aller.</p>
    </section>
    <section id="contenus"><h2>Les contenus</h2>
      <p>Pas de contenu sexuel, violent ou illégal, pas de spam ni de publicité non sollicitée.</p>
      <p>Pour les images des personnages, partage seulement des images que tu as le droit de diffuser ; un lien vers une image déjà publique est préférable à un envoi de fichier.</p>
    </section>
    <section id="votes"><h2>Personnages et votes</h2>
      <p>On type des personnages de fiction, pas des personnes réelles. Un compte par personne, un vote par personnage : pas de votes en masse ni de comptes multiples pour peser sur un résultat.</p>
    </section>
    <section id="signaler"><h2>Signaler un problème</h2>
      <p>Un message, un profil, une image ou un événement te pose problème ? Écris à <a href="mailto:denshiku.corp@gmail.com?subject=Signalement%20Grindleveling">denshiku.corp@gmail.com</a> en indiquant où il se trouve.</p>
      <p>Un contenu qui ne respecte pas ces règles peut être retiré, et un compte qui les enfreint peut être suspendu.</p>
    </section>
    <section id="cadre"><h2>Pendant la bêta</h2>
      <p>Ces règles complètent les <Link href="/informations">informations légales et la confidentialité</Link>. Les conditions générales d’utilisation complètes seront publiées à la sortie de la bêta.</p>
    </section>
  </InfoContent>;
}
