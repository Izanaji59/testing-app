import type { Metadata } from 'next';
import { SlumbywiseLanding } from '@/components/slumbywise/SlumbywiseLanding';

export const metadata: Metadata = {
  title: 'Slumbywise — Vivre la nuit',
  description: "Un site pour ceux qui vivent la nuit. Le livre, le carnet, la lettre. Porté par l'association Denshiku.",
};

/**
 * Racine du domaine (slumbywise.com) : la landing Slumbywise, pas
 * Grindleveling. L'app Grindleveling démarre maintenant sur /grindleveling
 * (voir app/grindleveling/page.tsx — ancien contenu de cette page).
 */
export default function RootPage() {
  return <SlumbywiseLanding />;
}
