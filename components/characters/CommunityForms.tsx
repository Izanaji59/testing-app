'use client';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { characterHref } from '@/lib/characters';
import { MBTI_RANK_PROFILES } from '@/lib/engine/rankTitles';
import type { Catalog } from '@/lib/allflix/types';
import { useFictionCommunity } from './useFictionCommunity';
import { CharacterVote } from './CharacterVote';
import s from './characters.module.css';

const TYPES=Object.keys(MBTI_RANK_PROFILES);
function message(error:unknown){
 const value=error as {code?:string;message?:string};
 if(value.code==='23505'||value.message?.includes('déjà présent'))return 'Ce personnage est déjà présent dans cette œuvre.';
 if(value.message?.startsWith('Image ')||value.message?.startsWith('Choisis ')||value.message?.startsWith('Indique '))return value.message;
 return 'L’enregistrement n’a pas abouti. Tes informations sont conservées, tu peux réessayer.';
}
function imageUrl(value:string){const parsed=new URL(value);if(parsed.protocol!=='https:'||parsed.username||parsed.password)throw new Error('Image HTTPS requise.');return parsed.href;}
async function uploadImage(userId:string,file:File|null,url:string){
 if(!file)return {url:url.trim()?imageUrl(url.trim()):null,path:null};
 const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[file.type];
 if(!ext||file.size>3*1024*1024)throw new Error('Image JPG, PNG ou WebP, 3 Mo maximum.');
 const path=`${userId}/${crypto.randomUUID()}.${ext}`;
 const {error}=await supabase().storage.from('character-images').upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 return {url:supabase().storage.from('character-images').getPublicUrl(path).data.publicUrl,path};
}
function ImageFields({url,setUrl,setFile}:{url:string;setUrl:(v:string)=>void;setFile:(v:File|null)=>void}){
 return <div className={s.imageFields}><label>Image du personnage<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/><small>JPG, PNG ou WebP, 3 Mo maximum.</small></label><label>Ou une adresse d’image<input type="url" placeholder="https://…" value={url} onChange={e=>setUrl(e.target.value)}/></label></div>;
}
function AccountNotice({loading,available,user}:{loading:boolean;available:boolean;user:boolean}){
 if(loading)return <p className={s.hint}>Chargement…</p>;
 if(!user)return <p className={s.hint}><Link href="/login/">Se connecter avec son compte Slumbywise</Link> pour participer. Le même compte que Grindleveling.</p>;
 if(!available)return <p className={s.hint}>Les contributions ne sont pas encore disponibles. Réessaie un peu plus tard.</p>;
 return null;
}

export function AddCharacter(){
 const community=useFictionCommunity();
 const {data:catalog}=useSWR<Catalog>('/allflix/catalog.json',async (url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error('Catalogue indisponible');return response.json();});
 const [name,setName]=useState(''),[work,setWork]=useState(''),[url,setUrl]=useState(''),[file,setFile]=useState<File|null>(null),[mbti,setMbti]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState<string|null>(null),[fileKey,setFileKey]=useState(0);
 useEffect(()=>{const id=new URLSearchParams(location.search).get('oeuvre');const title=catalog?.titles.find(t=>t.id===id);if(title)setWork(title.title);},[catalog]);
 async function submit(event:FormEvent){
  event.preventDefault();if(!community.user||busy)return;setBusy(true);setError('');setSaved(null);
  let path:string|null=null;let created:string|null=null;
  try{
   const image=await uploadImage(community.user.id,file,url);path=image.path;
   const title=catalog?.titles.find(t=>!t.redirectUrl&&t.title.toLocaleLowerCase('fr')===work.trim().toLocaleLowerCase('fr'));
   const {data,error:failure}=await supabase().rpc('submit_fiction_character',{p_name:name.trim(),p_title:work.trim(),p_title_id:title?.id??'',p_image_url:image.url});
   if(failure)throw failure;
   created=data as string;setSaved(created);
   if(mbti){const {error:voteFailure}=await supabase().rpc('vote_fiction_character',{p_character_id:created,p_mbti:mbti});if(voteFailure)setError('Le personnage est ajouté. Tu peux enregistrer ton vote depuis sa fiche.');}
   setName('');setUrl('');setFile(null);setMbti('');setFileKey(k=>k+1);await community.refresh();
  }catch(failure){if(path&&!created)await supabase().storage.from('character-images').remove([path]);setError(message(failure));}
  finally{setBusy(false);}
 }
 const suggestions=(catalog?.titles??[]).filter(t=>work.length>=2&&t.title.toLocaleLowerCase('fr').includes(work.toLocaleLowerCase('fr'))).slice(0,20);
 return <section id="contribuer" className={s.communityPanel}><details><summary>Ajouter un personnage</summary><AccountNotice loading={community.authLoading||community.loading} available={community.available} user={!!community.user}/>{community.user&&community.available&&<form onSubmit={submit} className={s.communityForm}><label>Nom du personnage<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)} autoComplete="off"/></label><label>Œuvre d’origine<input required maxLength={180} list="fiction-works" placeholder="Film, série, animé, livre…" value={work} onChange={e=>setWork(e.target.value)}/><datalist id="fiction-works">{suggestions.map(t=><option key={t.id} value={t.title}/>)}</datalist><small>Tu peux saisir une œuvre qui n’est pas encore dans le catalogue.</small></label><ImageFields key={fileKey} url={url} setUrl={setUrl} setFile={setFile}/><label>Ton vote MBTI (facultatif)<select aria-label="Ton vote MBTI (facultatif)" value={mbti} onChange={e=>setMbti(e.target.value)}><option value="">Choisir plus tard</option>{TYPES.map(t=><option key={t}>{t}</option>)}</select></label><button type="submit" disabled={busy}>{busy?'Enregistrement…':'Ajouter le personnage'}</button></form>}{error&&<p role="alert" className={s.formError}>{error}</p>}{saved&&<p role="status">Personnage ajouté. <Link href={characterHref(saved)}>Ouvrir sa fiche</Link></p>}</details></section>;
}

/** Fiche d'un personnage : vote rapide (CharacterVote) et proposition d'image. */
export function CharacterCommunity({characterId,nextId,onNext}:{characterId:string;nextId?:string|null;onNext?:(id:string)=>void}){
 const community=useFictionCommunity();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 const [url,setUrl]=useState(''),[file,setFile]=useState<File|null>(null),[fileKey,setFileKey]=useState(0);
 useEffect(()=>{setError('');setSuccess('');},[characterId]);
 async function photo(event:FormEvent){event.preventDefault();if(busy||!community.user)return;setBusy(true);setError('');setSuccess('');let path:string|null=null;try{const image=await uploadImage(community.user.id,file,url);path=image.path;if(!image.url)throw new Error('Choisis une image.');const {error:failure}=await supabase().rpc('submit_fiction_image',{p_character_id:characterId,p_image_url:image.url});if(failure)throw failure;await community.refresh();setUrl('');setFile(null);setFileKey(k=>k+1);setSuccess('Ton image est ajoutée au personnage.');}catch(failure){if(path)await supabase().storage.from('character-images').remove([path]);setError(message(failure));}finally{setBusy(false);}}
 return <><CharacterVote characterId={characterId} nextId={nextId} onNext={onNext}/>
  {community.user&&community.available&&<section className={s.communityPanel}><details className={s.imageProposal}><summary>Proposer une image du personnage</summary><form onSubmit={photo} className={s.communityForm}><ImageFields key={fileKey} url={url} setUrl={setUrl} setFile={setFile}/><button disabled={busy||!file&&!url.trim()}>{busy?'Enregistrement…':'Ajouter cette image'}</button></form></details>{error&&<p role="alert" className={s.formError}>{error}</p>}{success&&<p role="status">{success}</p>}</section>}</>;
}
