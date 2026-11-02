'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase/client';
import {ProfileSpace} from '@/components/profile/ProfileSpace';
import type {PublicProfile,PublicStat} from '@/lib/types';
import s from '@/components/profile/profile.module.css';
export default function MemberPage(){
 const [data,setData]=useState<{profile:PublicProfile;stats:PublicStat[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let cancelled=false;const uid=new URLSearchParams(window.location.search).get('id');
 if(!uid||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)){setError('Ce profil est introuvable.');return;}
 Promise.all([supabase().rpc('get_public_profile',{target_user:uid}),supabase().rpc('get_public_stats',{target_user:uid})]).then(([p,st])=>{if(cancelled)return;if(p.error||st.error||!p.data?.[0]){setError('Ce profil n’a pas pu être chargé.');return;}setData({profile:p.data[0],stats:st.data??[]});}).catch(()=>{if(!cancelled)setError('Ce profil n’a pas pu être chargé.');});return()=>{cancelled=true};},[]);
 return <div className={s.member}><Link href="/chat">Retour à la communauté</Link>{error?<p role="alert" className={s.alert}>{error}</p>:data?<ProfileSpace profile={data.profile} stats={data.stats}/>:<p className={s.load}>Chargement du profil…</p>}</div>;
}
