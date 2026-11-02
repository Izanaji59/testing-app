'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/lib/supabase/client';
import { StatRadar } from '@/components/hud/StatRadar';
import { RankEmblem } from '@/components/hud/RankEmblem';
import { STAT_META } from '@/lib/engine/stats';
import type { PublicProfile, PublicStat } from '@/lib/types';
import { getRankTitle, mbtiFromClassLabel } from '@/lib/engine/rankTitles';
import { fmtRank } from '@/lib/utils';
import s from './profile.module.css';

type Presentation={user_id:string;bio:string;tagline:string;avatar:string;theme:string};
type Post={id:string;user_id:string;title:string;body:string;is_published:boolean;published_at:string|null;created_at?:string};
const AVATARS:Record<string,string>={moon:'☾',leaf:'❧',book:'▤',star:'✦',wave:'≈',flame:'♨'};
const LABELS:Record<string,string>={moon:'Lune',leaf:'Feuille',book:'Livre',star:'Étoile',wave:'Vague',flame:'Flamme'};
const ORDER=Object.keys(STAT_META) as (keyof typeof STAT_META)[];

/** The exact same earned-statistics block is rendered for owners and visitors. */
export function ProfileStatistics({profile,stats}:{profile:PublicProfile;stats:PublicStat[]}) {
  const rank=fmtRank(profile.rank_letter,profile.rank_tier);
  return <section className={s.stats} aria-label="Statistiques Grindleveling"><div className={s.statsHeader}><RankEmblem letter={profile.rank_letter} tier={profile.rank_tier==='PLUS'?'+':profile.rank_tier==='MINUS'?'-':''} size={58}/><div><h2>Rang {rank}</h2><p>Niveau {profile.level} / {profile.total_xp.toLocaleString('fr-FR')} XP</p><p>{getRankTitle(mbtiFromClassLabel(profile.mbti_class),profile.rank_letter).title}</p></div></div><div className={s.radar}><StatRadar stats={stats} size={240}/></div><div className={s.statGrid}>{ORDER.map(kind=><div key={kind} className={s.stat}><span>{STAT_META[kind].label}</span><strong>{stats.find(x=>x.kind===kind)?.level??1}</strong></div>)}</div><p className={s.note}>Les mêmes statistiques, calculées à partir de tes accomplissements. Les montants de revenus restent privés.</p></section>;
}

export function ProfileSpace({profile,stats,owner=false,onIdentityChange}:{profile:PublicProfile;stats:PublicStat[];owner?:boolean;onIdentityChange?:()=>void}) {
  const uid=profile.user_id;
  const {data,error,mutate}=useSWR(['profile-space',uid,owner],async()=>{
    const sb=supabase();
    const presentation=await sb.from('profile_presentations').select('*').eq('user_id',uid).maybeSingle();
    let query=sb.from('profile_posts').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(50);
    if(!owner)query=query.eq('is_published',true);
    const posts=await query;
    if(presentation.error||posts.error)throw presentation.error||posts.error;
    return {presentation:(presentation.data??{user_id:uid,bio:'',tagline:'',avatar:'moon',theme:'night'}) as Presentation,posts:(posts.data??[]) as Post[]};
  });
  const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[failure,setFailure]=useState(''),[notice,setNotice]=useState('');
  const [form,setForm]=useState<Presentation>({user_id:uid,bio:'',tagline:'',avatar:'moon',theme:'night'});
  const [name,setName]=useState(profile.display_name??'');
  const [draft,setDraft]=useState<Post|null>(null),[preview,setPreview]=useState(false);
  useEffect(()=>{setEditing(false);setDraft(null);setFailure('');setNotice('');},[uid]);
  const presentation=data?.presentation;
  function edit(){setForm(presentation!);setName(profile.display_name??'');setEditing(true);setFailure('');setNotice('');}
  async function savePresentation(){
    if(busy)return;setBusy(true);setFailure('');setNotice('');
    try{
      const sb=supabase();
      const a=await sb.from('profile_presentations').upsert({...form,user_id:uid});if(a.error)throw a.error;
      const b=await sb.from('profiles').update({display_name:name.trim()||null}).eq('user_id',uid);if(b.error)throw b.error;
      await mutate();onIdentityChange?.();setEditing(false);setNotice('Présentation enregistrée.');
    }catch{setFailure('La présentation n’a pas pu être entièrement enregistrée. Tu peux réessayer.');}finally{setBusy(false);}
  }
  function newPost(){setDraft({id:crypto.randomUUID(),user_id:uid,title:'',body:'',is_published:false,published_at:null});setPreview(false);setFailure('');setNotice('');}
  async function savePost(publish:boolean,post=draft){
    if(!post||busy||!post.title.trim()||!post.body.trim())return;
    setBusy(true);setFailure('');setNotice('');
    try{
      const result=await supabase().from('profile_posts').upsert({id:post.id,user_id:uid,title:post.title.trim(),body:post.body.trim(),is_published:publish});
      if(result.error)throw result.error;
      await mutate();setDraft(null);setPreview(false);setNotice(publish?'Article publié sur ton profil, visible par les membres.':'Article conservé en brouillon privé.');
    }catch{setFailure('L’article n’a pas pu être enregistré. Ton texte reste ouvert.');}finally{setBusy(false);}
  }
  return <div className={s.space}>
    <section className={s.banner} data-theme={presentation?.theme??'night'} aria-label="Présentation du profil"><div className={s.avatar} aria-hidden="true">{AVATARS[presentation?.avatar??'moon']??'☾'}</div><h2>{profile.display_name||profile.operator_code}</h2><span className={s.meta}>{profile.mbti_class}</span>{presentation?.tagline&&<p className={s.tagline}>{presentation.tagline}</p>}{presentation?.bio&&<p>{presentation.bio}</p>}{owner&&<div className={s.actions}><button disabled={!data||busy} onClick={edit}>Personnaliser mon profil</button><a className={s.button} href={'/member/?id='+uid}>Voir mon profil de membre</a></div>}</section>
    {error&&<p role="alert" className={s.alert}>La présentation et les articles sont indisponibles pour le moment. Les statistiques restent accessibles.</p>}
    {failure&&<p role="alert" className={s.alert}>{failure}</p>}{notice&&<p role="status" className={s.notice}>{notice}</p>}
    {owner&&editing&&<form className={s.editor} onSubmit={e=>{e.preventDefault();void savePresentation();}}><h3>Ta présentation</h3><label>Pseudo<input maxLength={60} value={name} onChange={e=>setName(e.target.value)}/></label><label>En quelques mots<input maxLength={100} value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})}/></label><label>À propos<textarea maxLength={600} rows={5} value={form.bio} onChange={e=>setForm({...form,bio:e.target.value})}/></label><div className={s.two}><label>Emblème<select aria-label="Emblème" value={form.avatar} onChange={e=>setForm({...form,avatar:e.target.value})}>{Object.keys(AVATARS).map(k=><option key={k} value={k}>{LABELS[k]}</option>)}</select></label><label>Ambiance<select aria-label="Ambiance" value={form.theme} onChange={e=>setForm({...form,theme:e.target.value})}><option value="night">Nuit</option><option value="forest">Forêt</option><option value="amber">Ambre</option><option value="violet">Violet</option></select></label></div><p className={s.note}>Cette présentation est visible par les membres. Le bloc de statistiques garde toujours la même disposition et ses valeurs calculées.</p><div className={s.actions}><button disabled={busy} type="submit">{busy?'Enregistrement…':'Enregistrer la présentation'}</button><button disabled={busy} type="button" onClick={()=>setEditing(false)}>Annuler</button></div></form>}
    <ProfileStatistics profile={profile} stats={stats}/>
    <section className={s.journal} aria-label="Journal du profil"><h2>{owner?'Mon journal':'Journal'}</h2><p className={s.journalIntro}>Notes de parcours, idées et découvertes.</p>{owner&&<button disabled={!data||busy||!!draft} onClick={newPost}>Écrire un article</button>}
      {owner&&draft&&<form className={s.editor} onSubmit={e=>{e.preventDefault();void savePost(false);}} style={{marginTop:18}}><h3>{draft.is_published?'Modifier l’article':'Un nouvel article'}</h3><label>Titre<input required maxLength={140} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label><label>Texte<textarea required maxLength={12000} rows={12} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label><p className={s.note}>Le brouillon reste privé. Publier rend cet article visible aux membres sur ton profil. Écrire un article ne modifie pas tes statistiques.</p><div className={s.actions}><button type="button" onClick={()=>setPreview(!preview)}>{preview?'Fermer l’aperçu':'Aperçu'}</button><button type="submit" disabled={busy}>{busy?'Enregistrement…':'Garder en brouillon'}</button><button type="button" disabled={busy||!draft.title.trim()||!draft.body.trim()} onClick={()=>savePost(true)}>{draft.is_published?'Mettre à jour la publication':'Publier aux membres'}</button><button type="button" disabled={busy} onClick={()=>{if(window.confirm('Fermer cet article sans enregistrer les dernières modifications ?'))setDraft(null);}}>Fermer</button></div>{preview&&<article className={s.post}><h3>{draft.title}</h3><div className={s.postBody}>{draft.body}</div></article>}</form>}
      {!data&&!error&&<p className={s.note}>Chargement du journal…</p>}{data?.posts.length===0&&<p className={s.note}>{owner?'Ton premier article prendra place ici.':'Aucun article publié pour le moment.'}</p>}
      {data?.posts.map(post=><article className={s.post} key={post.id}><span className={s.meta}>{post.is_published?new Date(post.published_at??post.created_at??'').toLocaleDateString('fr-FR'):'Brouillon privé'}</span><h3>{post.title}</h3><div className={s.postBody}>{post.body}</div>{owner&&<div className={s.actions}><button disabled={busy||!!draft} onClick={()=>{setDraft({...post});setPreview(false);}}>Modifier</button>{post.is_published&&<button disabled={busy||!!draft} onClick={()=>savePost(false,post)}>Repasser en brouillon</button>}</div>}</article>)}
    </section>
  </div>;
}
