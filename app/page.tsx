import type { Metadata } from 'next';
import { SlumbywiseLanding } from '@/components/slumbywise/SlumbywiseLanding';

export const metadata: Metadata = {
  title: 'Slumbywise — Lire, avancer, jouer',
  description: 'Les articles du Carnet, Le Carnet du Concierge, les quêtes de Grindleveling et les jeux Slumbywise. Un projet porté par Denshiku.',
};

/**
 * Racine du domaine (slumbywise.com) : la landing Slumbywise, pas
 * Grindleveling. L'app Grindleveling démarre maintenant sur /grindleveling
 * (voir app/grindleveling/page.tsx — ancien contenu de cette page).
 */
export default function RootPage() {
  return <SlumbywiseLanding />;
}
