'use client';
import { useEffect } from 'react';
import useSWR from 'swr';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Character } from '@/lib/characters';
export type VoteSummary={counts:Record<string,number>;total:number;leader:string|null};
/** Champs ajoutés par 0027 : optionnels tant qu’une ancienne version de la fonction répond. */
export type FictionCommunity={characters:Character[];images:Record<string,string>;votes:Record<string,VoteSummary>;myVotes:Record<string,string>;
 enneagrams?:Record<string,VoteSummary>;favorites?:Record<string,number>;myEnneagrams?:Record<string,string>;myReasons?:Record<string,string>;myFavorites?:string[];myType?:string|null};
export function useFictionCommunity(){
 const auth=useSWR<User|null>('fiction-community-user',async()=>{const {data}=await supabase().auth.getUser();return data.user;});
 useEffect(()=>{const {data}=supabase().auth.onAuthStateChange((_event,session)=>{void auth.mutate(session?.user??null,{revalidate:false});});return()=>data.subscription.unsubscribe();},[auth.mutate]);
 const state=useSWR<FictionCommunity|null>(['fiction-community',auth.data?.id??'public'],async()=>{
  const {data,error}=await supabase().rpc('get_fiction_community');
  if(error){if(['PGRST202','42883'].includes(error.code))return null;throw error;}
  return data as FictionCommunity;
 },{refreshInterval:30000,shouldRetryOnError:false});
 return {user:auth.data??null,authLoading:auth.data===undefined,data:state.data,loading:state.data===undefined&&!state.error,available:!!state.data,error:state.error,refresh:state.mutate};
}
