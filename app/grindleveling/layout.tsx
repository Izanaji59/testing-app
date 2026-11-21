import type { Metadata } from 'next';

const description = 'Grindleveling : ta personnalité te fait progresser. Pars de ton type MBTI et de qui tu veux être, avance quête après quête, et rejoins une communauté MBTI.';

export const metadata: Metadata = {
  title: 'Grindleveling — ta personnalité te fait progresser',
  description,
  applicationName: 'Grindleveling',
  alternates: { canonical: '/grindleveling/' },
  openGraph: {
    title: 'Grindleveling — ta personnalité te fait progresser',
    description,
    url: '/grindleveling/',
    siteName: 'Grindleveling',
    locale: 'fr_FR',
    type: 'website',
    images: [{ url: '/icons/slumbywise-256.png', width: 256, height: 256 }],
  },
};

export default function GrindlevelingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
