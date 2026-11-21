import type { Metadata } from 'next';
import { CharacterDetail } from '@/components/characters/Characters';

export const metadata: Metadata = { title: 'Personnage | Grindleveling', robots: { index: false, follow: true } };

export default function Page() { return <CharacterDetail />; }
