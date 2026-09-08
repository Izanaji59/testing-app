import type { Metadata } from 'next';
import { CarnetContent } from '@/components/slumbywise/CarnetContent';

export const metadata: Metadata = {
  title: 'Le carnet — Slumbywise',
  description: "Nuit après nuit, nous continuons d'écrire. Le carnet du veilleur, par Slumbywise x Denshiku.",
};

export default function CarnetPage() {
  return <CarnetContent />;
}
