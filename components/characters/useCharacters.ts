'use client';

import useSWR from 'swr';
import { withTypings, normalizeMbti, CHARACTER_ID, type TypedCharacter, type CharacterIndex, type TypingEntry } from '@/lib/characters';
import { useFictionCommunity } from './useFictionCommunity';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Personnages indisponibles');
  return response.json();
};

export function useCharacters() {
  const index = useSWR<CharacterIndex>('/characters/index.json', fetcher);
  const typings = useSWR<Record<string, TypingEntry>>('/characters/typings.json', fetcher);
  const community=useFictionCommunity();
  const local=withTypings(index.data,typings.data);
  const ids=new Set(local.map(ch=>ch.id));
  const added=(community.data?.characters??[]).filter(ch=>CHARACTER_ID.test(ch.id)&&!ids.has(ch.id)).map(ch=>({...ch,typing:null}));
  const characters:TypedCharacter[]=[...local,...added].map(ch=>{
    const image=community.data?.images[ch.id];
    const mbti=normalizeMbti(community.data?.votes[ch.id]?.leader??undefined);
    const typing=ch.typing??(mbti?{mbti,enneagram:null,note:'',suggested:false}:null);
    return {...ch,...(image?.startsWith('https://')?{image,imageKind:'illustration' as const,communityImage:true}:{}),typing,typingSource:ch.typing?'editorial' as const:'community' as const};
  });
  return {
    characters,
    communityLoading:community.loading,
    loading: !index.data && !index.error,
    error: index.error ?? typings.error,
    retry: () => { void index.mutate(); void typings.mutate(); },
  };
}
