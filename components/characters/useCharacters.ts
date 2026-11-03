'use client';

import useSWR from 'swr';
import { withTypings, type CharacterIndex, type TypingEntry } from '@/lib/characters';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Personnages indisponibles');
  return response.json();
};

export function useCharacters() {
  const index = useSWR<CharacterIndex>('/characters/index.json', fetcher);
  const typings = useSWR<Record<string, TypingEntry>>('/characters/typings.json', fetcher);
  return {
    characters: withTypings(index.data, typings.data),
    loading: !index.data && !index.error,
    error: index.error ?? typings.error,
    retry: () => { void index.mutate(); void typings.mutate(); },
  };
}
