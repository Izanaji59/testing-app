import type { Metadata } from 'next';

const description = 'Grindleveling, par Slumbywise : un système de progression pour avancer vers n’importe quel objectif, une quête après l’autre. Donjons, quêtes, concentration et statistiques.';

export const metadata: Metadata = {
  title: 'Grindleveling — un système de progression, quête après quête | Slumbywise',
  description,
  openGraph: {
    title: 'Grindleveling — un système de progression, quête après quête',
    description,
    url: '/grindleveling/',
    siteName: 'Slumbywise',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/icons/slumbywise-256.png', width: 256, height: 256 }],
  },
};

export default function GrindlevelingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
