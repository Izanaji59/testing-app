'use client';

// Partie interactive d'une page statique de personnage : vote rapide, mode marathon vers la page suivante.

import { useRouter } from 'next/navigation';
import { CharacterCommunity } from './CommunityForms';
import { useFictionCommunity } from './useFictionCommunity';
import { nextToVote } from '@/lib/engine/fictionVote';

export function CharacterVoteIsland({ characterId, work }: { characterId: string; work: Array<{ id: string; url: string }> }) {
  const router = useRouter();
  const community = useFictionCommunity();
  const voted = new Set([...Object.keys(community.data?.myVotes ?? {}), ...Object.keys(community.data?.myEnneagrams ?? {})]);
  const nextId = nextToVote(work.map(w => w.id), characterId, voted);
  const nextUrl = work.find(w => w.id === nextId)?.url;
  return <CharacterCommunity characterId={characterId} nextId={nextUrl ? nextId : null} onNext={() => { if (nextUrl) router.push(nextUrl); }} />;
}
