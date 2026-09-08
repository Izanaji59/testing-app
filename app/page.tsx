import type { Metadata } from 'next';
import { SlumbywiseLanding } from '@/components/slumbywise/SlumbywiseLanding';

export const metadata: Metadata = {
  title: 'Slumbywise — Le sommeil, ton terrain de jeu',
  description: "Le sommeil n'est pas un luxe. C'est ton terrain de jeu. Le livre, le carnet, la lettre. Porté par l'association Denshiku.",
};

/**
 * Racine du domaine (slumbywise.com) : la landing Slumbywise, pas
 * Grindleveling. L'app Grindleveling démarre maintenant sur /grindleveling
 * (voir app/grindleveling/page.tsx — ancien contenu de cette page).
 */
export default function RootPage() {
  return <SlumbywiseLanding />;
}
