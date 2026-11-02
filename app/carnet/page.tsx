import type { Metadata } from 'next';
import { CarnetContent } from '@/components/slumbywise/CarnetContent';

export const metadata: Metadata = {
  title: 'Les articles du Carnet — Slumbywise',
  description: 'Le Carnet rassemble les articles de Slumbywise sur la nuit, les habitudes et la vie en horaires décalés.',
};

export default function CarnetPage() {
  return <CarnetContent />;
}
