import type { Metadata } from 'next';
import { Chapter1Content } from '@/components/slumbywise/Chapter1Content';

export const metadata: Metadata = {
  title: 'Le Livre — Le Carnet du Concierge | Slumbywise',
  description: 'Découvrir Le Carnet du Concierge, le guide pratique de Slumbywise pour mieux vivre ses nuits.',
  alternates: { canonical: '/livre' },
};

export default function Chapter1Page() {
  return <Chapter1Content />;
}
