import type { Metadata } from 'next';
import { Chapter1Content } from '@/components/slumbywise/Chapter1Content';

export const metadata: Metadata = {
  title: 'Chapitre 1 offert — Slumbywise',
  description: "Le premier chapitre du Carnet du Concierge, offert aux inscrits de la lettre mensuelle de Slumbywise.",
};

export default function Chapter1Page() {
  return <Chapter1Content />;
}
