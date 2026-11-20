import type { Metadata } from 'next';
import { AllflixCatalog } from '@/components/allflix/Allflix';

const description = 'Le catalogue Allflix par Slumbywise : films, séries et animés, avec synopsis, saisons et épisodes réunis sur une même fiche.';

export const metadata: Metadata = {
  title: 'Allflix | Films, séries et animés',
  description,
  openGraph: { title: 'Allflix — films, séries et animés', description, url: '/allflix/', siteName: 'Slumbywise', locale: 'fr_FR', type: 'website' },
};

export default function Page() {
  return <>
    {/* Sans JavaScript, le catalogue ne peut pas se charger : titre et description restent lisibles. */}
    <noscript><h1>Allflix — films, séries et animés</h1><p>{description} Active JavaScript pour parcourir le catalogue, ou <a href="/">retourne à l’accueil</a>.</p></noscript>
    <AllflixCatalog />
  </>;
}
