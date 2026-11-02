import type { Metadata } from 'next';
import { BookContent } from '@/components/slumbywise/BookContent';

export const metadata: Metadata = {
  title: 'Le Livre — Le Carnet du Concierge | Slumbywise',
  description: 'Le Carnet du Concierge : un guide pratique pour mieux vivre ses nuits, trouver son rythme et préserver ses liens. Découvrir le livre, proposé à 19 EUR.',
  alternates: { canonical: '/livre' },
};

export default function BookPage() {
  return <BookContent />;
}
