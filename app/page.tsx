import type { Metadata } from 'next';
import { SlumbywiseLanding } from '@/components/slumbywise/SlumbywiseLanding';

export const metadata: Metadata = {
  title: 'Slumbywise — Voir, lire et se divertir correctement',
  description: 'Le Carnet, le Livre et Allflix pour voir ou lire correctement ; Grindleveling, les échecs et Empreinte pour se divertir correctement. Un projet porté par Denshiku : l’héritage, c’est le partage.',
};

/**
 * Racine du domaine (slumbywise.com) : la landing Slumbywise, pas
 * Grindleveling. L'app Grindleveling démarre maintenant sur /grindleveling
 * (voir app/grindleveling/page.tsx — ancien contenu de cette page).
 */
export default function RootPage() {
  return <SlumbywiseLanding />;
}
