import type { Metadata } from 'next';

const description = 'Joue aux échecs dans ton navigateur : à deux sur le même écran, contre un bot ou en ligne, sans compte. Par Slumbywise.';

export const metadata: Metadata = {
  title: 'Échecs en ligne, à deux ou contre un bot | Slumbywise',
  description,
  openGraph: {
    title: 'Échecs — à deux, contre un bot ou en ligne',
    description,
    url: '/chess/',
    siteName: 'Slumbywise',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/images/slumbywise/chess-preview.png', width: 800, height: 600, alt: 'Le plateau d’échecs de Slumbywise' }],
  },
};

export default function ChessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
