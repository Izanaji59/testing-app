import type { Metadata } from 'next';
import { ShopContent } from '@/components/slumbywise/ShopContent';

export const metadata: Metadata = {
  title: 'La boutique du sommeil | Slumbywise',
  description: 'Objets autour du sommeil et des soirs calmes, par Slumbywise.',
};

export default function BoutiquePage() { return <ShopContent />; }
