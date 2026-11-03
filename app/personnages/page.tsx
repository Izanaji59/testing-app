import type { Metadata } from 'next';
import { CharactersCatalog } from '@/components/characters/Characters';

export const metadata: Metadata = {
  title: 'Personnages | Les types MBTI de la fiction',
  description: 'Les personnages de films, séries et animés, typés MBTI et Ennéagramme par Slumbywise.',
};

export default function Page() { return <CharactersCatalog />; }
