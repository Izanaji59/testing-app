'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Catalog, Title, Playback, playbackKey, safePlayback } from '@/lib/allflix/types';
import s from './allflix.module.css';
import { TitleCharacters } from '@/components/characters/TitleCharacters';

const fetcher=async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error('Catalogue indisponible');return response.json();};
const image=(path:string|null,size='w500')=>path?`https://image.tmdb.org/t/p/${size}${path}`:undefined;
const kind=(t:Title)=>t.anime?(t.media==='movie'?'Film d’animation':'Animé'):t.media==='movie'?'Film':'Série';
const href=(t:Title)=>`/allflix/fiche/?id=${t.id}`;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export function Frame({children,extraCredit}:{children:React.ReactNode;extraCredit?:React.ReactNode}){
 return <div className={s.app}><header className={s.nav}><Link href="/allflix/" className={s.brand}>allflix<span>par Slumbywise</span></Link><nav aria-label="Navigation Allflix"><Link href="/allflix/">Catalogue</Link><Link href="/personnages/">Personnages</Link><Link href="/">Slumbywise</Link></nav></header>{children}<footer className={s.footer}><div><strong>allflix</strong><p>Films, séries, animés.</p></div><div className={s.credits}><a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="/allflix/tmdb.svg" alt="TMDB" width="95" height="22"/></a><p>Fiches et images fournies par TMDB.</p>{extraCredit}<p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div></footer></div>;
}

function Cover({title}:{title:Title}){const [failed,setFailed]=useState(false);return <div className={s.cover}>{title.poster&&!failed?<img src={image(title.poster)} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span>{title.title}</span>}<span className={s.coverTag}>{kind(title)}</span></div>;}
function Card({title}:{title:Title}){return <Link className={s.card} href={href(title)}><Cover title={title}/><h3>{title.title}</h3><p>{title.year||'Date à venir'}{title.rating>0?` / ${title.rating.toFixed(1)} sur TMDB`:''}</p></Link>;}

export function AllflixCatalog(){
 const {data,error,mutate}=useSWR<Catalog>('/allflix/catalog.json',fetcher);
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[genre,setGenre]=useState(''),[sort,setSort]=useState('selection'),[limit,setLimit]=useState(24);
 const titles=data?.titles??[];
 const genres=[...new Set(titles.flatMap(t=>t.genres))].sort((a,b)=>a.localeCompare(b,'fr'));
 const results=titles.filter(t=>(filter==='all'||filter==='anime'&&t.anime||filter==='movie'&&t.media==='movie'&&!t.anime||filter==='tv'&&t.media==='tv'&&!t.anime)&&(!genre||t.genres.includes(genre))&&normalize(t.title+' '+t.originalTitle).includes(normalize(query)));
 if(sort==='title')results.sort((a,b)=>a.title.localeCompare(b.title,'fr'));
 if(sort==='year')results.sort((a,b)=>Number(b.year)-Number(a.year));
 if(sort==='rating')results.sort((a,b)=>b.rating-a.rating);
 const featured=titles.find(t=>t.media==='movie'&&t.backdrop&&t.synopsis);
 useEffect(()=>setLimit(24),[query,filter,genre,sort]);
 function reset(){setQuery('');setFilter('all');setGenre('');setSort('selection');}
 return <Frame><main>
  <section className={s.hero}>
   {featured?.backdrop&&<img className={s.heroImage} src={image(featured.backdrop,'w1280')} alt="" fetchPriority="high"/>}
   <div className={s.heroContent}><span className={s.eyebrow}>Le cinéma, à portée de nuit</span><h1>{featured?.title??'Une histoire pour ce soir.'}</h1><p>{featured?.synopsis||'Parcourir les films, retrouver une série, découvrir un animé.'}</p><div className={s.actions}>{featured&&<Link className={s.primary} href={href(featured)}>Découvrir le film</Link>}<a className={s.secondary} href="#catalogue">Explorer le catalogue</a></div><span className={s.availability}>Les fiches sont disponibles. La lecture sera ajoutée titre par titre.</span></div>
  </section>
  <section id="catalogue" className={s.catalog}><div className={s.sectionTitle}><div><span className={s.eyebrow}>À explorer</span><h2>Le catalogue</h2></div><p>{titles.length>0?`${titles.length} œuvres référencées`:'Première sélection en préparation'}</p></div>
   <div className={s.searchRow}><label className={s.search}><span>Rechercher un titre</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Un film, une série, un animé…"/></label><label className={s.select}>Genre<select aria-label="Genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="">Tous les genres</option>{genres.map(g=><option key={g}>{g}</option>)}</select></label><label className={s.select}>Trier<select aria-label="Trier" value={sort} onChange={e=>setSort(e.target.value)}><option value="selection">Sélection</option><option value="title">Titre de A à Z</option><option value="year">Année</option><option value="rating">Note TMDB</option></select></label></div>
   <div className={s.filters} aria-label="Type d’œuvre">{[['all','Tout'],['movie','Films'],['tv','Séries'],['anime','Animés']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div>
   {error?<div className={s.empty} role="alert"><h3>Le catalogue n’a pas pu être chargé.</h3><button onClick={()=>mutate()}>Réessayer</button></div>:!data?<p role="status" className={s.empty}>Chargement du catalogue…</p>:<><p role="status" className={s.resultCount}>{results.length} résultat{results.length>1?'s':''}</p><div className={s.grid}>{results.slice(0,limit).map(t=><Card key={t.id} title={t}/>)}</div>{results.length===0&&<div className={s.empty}><h3>Aucun titre pour cette recherche.</h3><p>La première sélection s’enrichira au fil des imports.</p><button onClick={reset}>Réinitialiser les filtres</button></div>}{results.length>limit&&<button className={s.more} onClick={()=>setLimit(limit+24)}>Afficher plus de titres</button>}</>}
  </section>
 </main></Frame>;
}

function Player({source,title,poster}:{source?:Playback;title:string;poster?:string}){
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 if(!source)return <div className={s.playerEmpty}><span className={s.playIcon} aria-hidden="true">▷</span><h3>Lecture à venir</h3><p>Le lien de lecture de {title} n’est pas encore disponible.</p></div>;
 if(source.type==='link')return <div className={s.playerEmpty}><h3>{title}</h3><a className={s.primary} href={source.url} target="_blank" rel="noopener noreferrer">{source.label||'Ouvrir la lecture'}</a></div>;
 if(!playing)return <div className={s.playerEmpty}>{poster&&<img src={poster} alt=""/>}<button className={s.primary} onClick={()=>setPlaying(true)}>Lire {title}</button></div>;
 if(source.type==='embed')return <iframe className={s.player} src={source.url} title={`Lecture de ${title}`} allow="fullscreen; picture-in-picture; encrypted-media" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="no-referrer"/>;
 return <div><video className={s.player} src={source.url} poster={poster} controls playsInline autoPlay onError={()=>setFailed(true)}/>{failed&&<p role="alert">La vidéo n’a pas pu être chargée. <a href={source.url} target="_blank" rel="noopener noreferrer">Ouvrir le lien de lecture</a></p>}</div>;
}

export function AllflixDetail(){
 const [id,setId]=useState<string|null>(null),[ready,setReady]=useState(false),[seasonNumber,setSeasonNumber]=useState<number|null>(null),[episodeNumber,setEpisodeNumber]=useState<number|null>(null);
 useEffect(()=>{function read(){const p=new URLSearchParams(location.search);const value=p.get('id');setId(value&&/^tmdb-(movie|tv)-\d+$/.test(value)?value:null);const sn=p.get('s'),en=p.get('e');setSeasonNumber(sn!==null&&/^\d+$/.test(sn)?Number(sn):null);setEpisodeNumber(en!==null&&/^\d+$/.test(en)?Number(en):null);setReady(true);}read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[]);
 const {data:title,error,mutate}=useSWR<Title>(id?`/allflix/titles/${id}.json`:null,fetcher);
 const {data:links,error:linkError,mutate:retryLinks}=useSWR<Record<string,Playback>>('/allflix/playback.json',fetcher);
 const season=title?.seasons.find(s=>s.number===seasonNumber)??title?.seasons.find(s=>s.number>0)??title?.seasons[0];
 const episode=season?.episodes.find(e=>e.number===episodeNumber)??season?.episodes[0];
 function choose(sn:number,en?:number){setSeasonNumber(sn);setEpisodeNumber(en??null);const p=new URLSearchParams({id:id!,s:String(sn)});if(en!==undefined)p.set('e',String(en));history.replaceState(null,'','?'+p.toString());}
 const key=title?playbackKey(title,season?.number,episode?.number):'';
 const source=safePlayback(links?.[key]);
 const label=title?.media==='tv'&&episode?`S${season!.number} E${episode.number} — ${episode.title}`:title?.title??'';
 return <Frame><main className={s.detail}><Link className={s.back} href="/allflix/#catalogue">Retour au catalogue</Link>
  {(!ready||id&&!title&&!error)&&<p role="status" className={s.empty}>Chargement de la fiche…</p>}
  {ready&&(!id||error)&&<div className={s.empty}><h1>Cette fiche est indisponible.</h1><p>Retrouve les titres disponibles dans le catalogue.</p>{id&&<button onClick={()=>mutate()}>Réessayer</button>}</div>}
  {title&&<><section className={s.titleIntro}><div className={s.detailCover}><Cover title={title}/></div><div><span className={s.eyebrow}>{kind(title)}{title.year?` / ${title.year}`:''}</span><h1>{title.title}</h1><div className={s.metadata}>{title.genres.map(g=><span key={g}>{g}</span>)}{!!title.minutes&&<span>{title.minutes} min</span>}{title.rating>0&&<span>{title.rating.toFixed(1)} / 10 TMDB</span>}</div><h2>Synopsis</h2><p className={s.synopsis}>{title.synopsis||'Le synopsis en français n’est pas encore renseigné.'}</p><a href={title.source} target="_blank" rel="noopener noreferrer" className={s.source}>Fiche originale sur TMDB</a></div></section>
  <section className={s.watch} aria-label="Lecture"><div className={s.sectionTitle}><h2>{title.media==='movie'?'Le film':'Les épisodes'}</h2>{title.media==='tv'&&title.seasons.length>0&&<label className={s.select}>Saison<select aria-label="Saison" value={season?.number??''} onChange={e=>choose(Number(e.target.value))}>{title.seasons.map(s=><option key={s.number} value={s.number}>{s.title||`Saison ${s.number}`}</option>)}</select></label>}</div>
   {title.media==='tv'&&<div className={s.episodeList} aria-label="Choix de l’épisode">{season?.episodes.map(e=><button key={e.number} aria-pressed={e.number===episode?.number} onClick={()=>choose(season.number,e.number)}><span>{String(e.number).padStart(2,'0')}</span><span>{e.title||`Épisode ${e.number}`}<small>{e.minutes?`${e.minutes} min / `:''}{safePlayback(links?.[playbackKey(title,season.number,e.number)])?'Lecture disponible':'Lecture à venir'}</small></span></button>)}{!season?.episodes.length&&<p>Les épisodes de cette saison ne sont pas encore renseignés.</p>}</div>}
   <div className={s.playerHeading}><h3>{label}</h3>{title.media==='tv'&&episode?.synopsis&&<details><summary>Synopsis de cet épisode</summary><p>{episode.synopsis}</p></details>}</div>
   {linkError?<div className={s.empty} role="alert">Les liens de lecture n’ont pas pu être chargés. <button onClick={()=>retryLinks()}>Réessayer</button></div>:!links?<p role="status">Vérification de la disponibilité…</p>:<Player key={key+(source?.url??'')} source={source} title={label} poster={image(title.backdrop,'w1280')}/>}
   {title.media==='tv'&&episode&&season&&<div className={s.episodeNav}><button disabled={season.episodes.indexOf(episode)===0} onClick={()=>choose(season.number,season.episodes[season.episodes.indexOf(episode)-1].number)}>Épisode précédent</button><button disabled={season.episodes.indexOf(episode)===season.episodes.length-1} onClick={()=>choose(season.number,season.episodes[season.episodes.indexOf(episode)+1].number)}>Épisode suivant</button></div>}
  </section><TitleCharacters titleId={title.id}/></>}
 </main></Frame>;
}
