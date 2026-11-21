import type { Metadata } from 'next';
import { SlumbywiseLanding } from '@/components/slumbywise/SlumbywiseLanding';

const description = 'Le sommeil quand on vit ou travaille la nuit : les articles du Carnet et le livre Le Carnet du Concierge. Un site associatif porté par Denshiku.';

export const metadata: Metadata = {
  title: 'Slumbywise — Bien dormir, même quand on vit la nuit',
  description,
  openGraph: {
    title: 'Bien dormir, même quand on vit la nuit',
    description,
    url: '/',
    siteName: 'Slumbywise',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/images/slumbywise/night-window.jpg', width: 1659, height: 948, alt: 'Une fenêtre sur la ville, la nuit' }],
  },
};

/**
 * Racine du domaine (slumbywise.com) : la landing Slumbywise, pas
 * Grindleveling. L'app Grindleveling démarre maintenant sur /grindleveling
 * (voir app/grindleveling/page.tsx — ancien contenu de cette page).
 */
export default function RootPage() {
  return <SlumbywiseLanding />;
}
