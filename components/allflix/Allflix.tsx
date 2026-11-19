'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Catalog, Title, Playback, playbackKey, playbackApiUrl, safePlayback } from '@/lib/allflix/types';
import s from './allflix.module.css';
import { TitleCharacters, anilistCredit } from '@/components/characters/TitleCharacters';
import navigation from '@/config/allflix-navigation.json';

const fetcher=async(url:string)=>{const response=await fetch(url);if(!response.ok)throw new Error('Catalogue indisponible');return response.json();};
const image=(path:string|null,size='w500')=>path?.startsWith('https://video.blender.org/')||path?.startsWith('https://upload.wikimedia.org/')||path?.startsWith('https://thumb.wikimedia.org/')||path?.startsWith('https://archive.org/download/')||path?.startsWith('https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/')||path?.startsWith('https://i.ytimg.com/')||path?.startsWith('https://s4.anilist.co/')||path?.startsWith('https://cdn.myanimelist.net/')||path?.startsWith('https://image.tmdb.org/')?path:path?`https://image.tmdb.org/t/p/${size}${path}`:undefined;
const kind=(t:Title)=>t.anime?(t.media==='movie'?'Film d’animation':'Animé'):t.media==='movie'?'Film':'Série';
const href=(t:Title)=>safePlayback({type:'link',url:t.redirectUrl??''})?.url??`/allflix/fiche/?id=${t.id}`;
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// API de lecture externe (fonction Netlify `playback`) : activ\u00e9e au build par NEXT_PUBLIC_ALLFLIX_PLAYBACK_API=on.
const PLAYBACK_API=process.env.NEXT_PUBLIC_ALLFLIX_PLAYBACK_API==='on';
const playbackFetcher=async(url:string):Promise<Playback|null>=>{const response=await fetch(url);if(response.status===404)return null;if(!response.ok)throw new Error('Lecture indisponible');return response.json();};

export function Frame({children,extraCredit,onCategory}:{children:React.ReactNode;extraCredit?:React.ReactNode;onCategory?:(category:string)=>void}){
 return <div className={s.app}><header className={s.nav}><div className={s.navInner}><Link href="/allflix/" className={s.brand}><svg viewBox="0 0 36 36" aria-hidden="true"><rect x="1" y="1" width="34" height="34" rx="10"/><path d="m15 11 11 7-11 7Z"/></svg><span className={s.brandName}>allflix<small>par Slumbywise</small></span></Link><nav aria-label="Navigation Allflix"><div className={s.navCategories}>{[['all','Catalogue'],['movie','Films'],['tv','Séries'],['anime','Animés']].map(([type,label])=><a key={type} href={onCategory?'#catalogue':`/allflix/?type=${type}#catalogue`} onClick={()=>onCategory?.(type)}>{label}</a>)}</div><div className={s.navOther}><Link href="/personnages/">Personnages</Link><Link href="/">Slumbywise</Link></div></nav></div></header>{children}<footer className={s.footer}><div><strong>allflix</strong><p>Films, séries, animés.</p></div><div className={s.credits}><a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer"><img src="/allflix/tmdb.svg" alt="TMDB" width="95" height="22"/></a><p>Fiches et images fournies par TMDB. Plateformes de visionnage : JustWatch.</p>{extraCredit}<p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div></footer></div>;
}

function FeaturedFilms({titles}:{titles:Title[]}){
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false),[hovered,setHovered]=useState(false);
 const films=navigation.featuredIds.map(id=>titles.find(t=>t.id===id)).filter((t):t is Title=>!!t&&!!t.backdrop);
 const signature=films.map(t=>t.id).join(',');
 const current=index%Math.max(1,films.length),film=films[current];
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)setPaused(true);},[]);
 useEffect(()=>{
  if(paused||hovered||films.length<2)return;
  const interval=window.setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%films.length);},7000);
  return()=>window.clearInterval(interval);
 },[paused,hovered,signature,current,films.length]);
 function move(step:number){setIndex((current+step+films.length)%films.length);}
 return <section className={s.hero} aria-label="Films à l’affiche" aria-roledescription="carrousel" onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)} onFocusCapture={()=>setHovered(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHovered(false);}}>
  {film?.backdrop&&<img key={film.id} className={s.heroImage} src={image(film.backdrop,'w1280')} alt="" fetchPriority="high"/>}
  <div className={s.heroContent}><span className={s.eyebrow}>À l’affiche sur allflix</span><h1>{film?.title??'Votre prochain film commence ici.'}</h1>{film&&<div className={s.heroMetadata}><span>{film.year}</span>{film.minutes&&<span>{Math.floor(film.minutes/60)} h {String(film.minutes%60).padStart(2,'0')}</span>}<span>{film.genres.slice(0,2).join(' / ')}</span></div>}<p>{film?.synopsis??'Films, séries et animés. Trouvez votre prochaine histoire.'}</p><div className={s.actions}>{film&&<Link className={s.primary} href={href(film)}>Découvrir le film</Link>}<a className={s.secondary} href="#catalogue">Explorer le catalogue</a></div></div>
  {films.length>1&&<div className={s.carouselBar}><div className={s.carouselPages} role="group" aria-label="Choisir un film">{films.map((title,i)=><button type="button" key={title.id} aria-label={`Afficher ${title.title}`} aria-pressed={i===current} onClick={()=>setIndex(i)}>{String(i+1).padStart(2,'0')}</button>)}</div><div className={s.carouselControls}><button type="button" aria-label="Film précédent" onClick={()=>move(-1)}>←</button><button type="button" aria-label={paused?'Relancer le carrousel':'Mettre le carrousel en pause'} onClick={()=>setPaused(!paused)}>{paused?'▶':'Ⅱ'}</button><button type="button" aria-label="Film suivant" onClick={()=>move(1)}>→</button></div></div>}
 </section>;
}

function FrenchDestinations(){
 return <section className={s.languageSection} aria-labelledby="language-heading"><div className={s.languageIntro}><div><span className={s.eyebrow}>Films, séries et animés</span><h2 id="language-heading">Pratiquez votre anglais</h2></div><p>Pratiquez l’anglais avec les films, séries et animés d’Allflix. Selon le lecteur, la version originale ou les sous-titres sont en anglais.</p></div><div className={s.frenchHeading}><h3>Vous préférez regarder en français ?</h3><span>Choisissez votre programme</span></div><div className={s.destinationGrid}>{navigation.frenchDestinations.map(destination=><a className={s.destinationCard} key={destination.type} href={destination.url} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">{destination.type==='movie'?<><rect x="4" y="6" width="24" height="21" rx="3"/><path d="M4 12h24M10 6l4 6m5-6 4 6m-9 5 6 4-6 3Z"/></>:destination.type==='tv'?<><rect x="3" y="9" width="26" height="18" rx="3"/><path d="m11 3 5 6 5-6M11 30h10"/></>:<><path d="m16 3 3.8 8.9L29 16l-9.2 4.1L16 29l-3.8-8.9L3 16l9.2-4.1Z"/><path d="M16 11v10m-5-5h10"/></>}</svg><h4>{destination.label}</h4><span className={s.destinationAction}>Explorer</span></a>)}</div></section>;
}

function Cover({title}:{title:Title}){const [failed,setFailed]=useState(false);return <div className={s.cover}>{title.poster&&!failed?<img src={image(title.poster)} alt="" loading="lazy" onError={()=>setFailed(true)}/>:<span>{title.title}</span>}<span className={s.coverTag}>{kind(title)}</span></div>;}
function Card({title}:{title:Title}){return <a className={s.card} href={href(title)}><Cover title={title}/><h3>{title.title}</h3><p>{title.year||'Date à venir'}{title.rating>0?` / ${title.rating.toFixed(1)} sur TMDB`:''}</p></a>;}

export function AllflixCatalog(){
 const {data,error,mutate}=useSWR<Catalog>('/allflix/catalog.json',fetcher);
 const {data:playback}=useSWR<Record<string,Playback>>('/allflix/playback.json',fetcher);
 const [integrated,setIntegrated]=useState(false);
 const [watchOffers,setWatchOffers]=useState(false);
 const [recent,setRecent]=useState(true);
 const recentYear=new Date().getFullYear()-2;
 const playableIds=new Set(Object.entries(playback??{}).filter(([,source])=>source.type!=='link'&&safePlayback(source)).map(([key])=>key.split(':')[0]));
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[genre,setGenre]=useState(''),[sort,setSort]=useState('year'),[limit,setLimit]=useState(24);
 const titles=data?.titles??[];
 const genres=[...new Set(titles.flatMap(t=>t.genres))].sort((a,b)=>a.localeCompare(b,'fr'));
 const results=titles.filter(t=>(!recent||Number(t.year)>=recentYear&&Number(t.year)<=new Date().getFullYear()&&t.releaseStatus!=='upcoming')&&(!integrated||playableIds.has(t.id))&&(!watchOffers||(!t.redirectUrl&&safePlayback(playback?.[t.id])?.type==='link'))&&(filter==='all'||filter==='anime'&&t.anime||filter==='movie'&&t.media==='movie'&&!t.anime||filter==='tv'&&t.media==='tv'&&!t.anime)&&(!genre||t.genres.includes(genre))&&normalize([t.title,t.originalTitle,...(t.aliases??[])].join(' ')).includes(normalize(query)));
 if(sort==='title')results.sort((a,b)=>a.title.localeCompare(b.title,'fr'));
 if(sort==='year')results.sort((a,b)=>Number(b.year)-Number(a.year));
 if(sort==='rating')results.sort((a,b)=>b.rating-a.rating);
 useEffect(()=>{const type=new URLSearchParams(window.location.search).get('type');if(type&&['all','movie','tv','anime'].includes(type))setFilter(type);},[]);
 useEffect(()=>setLimit(24),[query,filter,genre,sort,integrated,watchOffers,recent]);
 function reset(){setQuery('');setFilter('all');setGenre('');setSort('year');setIntegrated(false);setWatchOffers(false);setRecent(true);}
 return <Frame onCategory={setFilter} extraCredit={<p>Sélection complémentaire : <a href="https://github.com/forbigbang81-netizen/ichidok" target="_blank" rel="noopener noreferrer">Ichidok</a>.</p>}><main>
  <FeaturedFilms titles={titles}/>
  <FrenchDestinations/>
  <section id="catalogue" className={s.catalog}><div className={s.sectionTitle}><div><span className={s.eyebrow}>À explorer</span><h2>Le catalogue</h2></div><p>{titles.length>0?`${titles.length} œuvres référencées`:'Première sélection en préparation'}</p></div>
   <div className={s.searchRow}><label className={s.search}><span>Rechercher un titre</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Un film, une série, un animé…"/></label><label className={s.select}>Genre<select aria-label="Genre" value={genre} onChange={e=>setGenre(e.target.value)}><option value="">Tous les genres</option>{genres.map(g=><option key={g}>{g}</option>)}</select></label><label className={s.select}>Trier<select aria-label="Trier" value={sort} onChange={e=>setSort(e.target.value)}><option value="selection">Sélection</option><option value="title">Titre de A à Z</option><option value="year">Année</option><option value="rating">Note TMDB</option></select></label></div>
   <div className={s.filters} aria-label="Type d’œuvre">{[['all','Tout'],['movie','Films'],['tv','Séries'],['anime','Animés']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}<button type="button" aria-pressed={integrated} disabled={!playback} onClick={()=>{setWatchOffers(false);setIntegrated(!integrated);}}>Lecture intégrée</button><button type="button" aria-pressed={watchOffers} disabled={!playback} onClick={()=>{setIntegrated(false);setWatchOffers(!watchOffers);}}>Où regarder</button></div>
   <div className={s.filters} aria-label="Période"><button type="button" aria-pressed={recent} onClick={()=>setRecent(true)}>Depuis {recentYear}</button><button type="button" aria-pressed={!recent} onClick={()=>setRecent(false)}>Toutes les années</button></div>
   {error?<div className={s.empty} role="alert"><h3>Le catalogue n’a pas pu être chargé.</h3><button onClick={()=>mutate()}>Réessayer</button></div>:!data?<p role="status" className={s.empty}>Chargement du catalogue…</p>:<><p role="status" className={s.resultCount}>{results.length} résultat{results.length>1?'s':''}</p><div className={s.grid}>{results.slice(0,limit).map(t=><Card key={t.id} title={t}/>)}</div>{results.length===0&&<div className={s.empty}><h3>Aucun titre pour cette recherche.</h3><p>La première sélection s’enrichira au fil des imports.</p><button onClick={reset}>Réinitialiser les filtres</button></div>}{results.length>limit&&<button className={s.more} onClick={()=>setLimit(limit+24)}>Afficher plus de titres</button>}</>}
  </section>
 </main></Frame>;
}

function episodeAvailability(episode?:Playback,series?:Playback){
 const source=safePlayback(episode)??safePlayback(series);
 if(!source)return 'Lecture à venir';
 if(source.verified===false)return 'Lecteur à vérifier';
 return source.type==='link'?'Plateforme externe':'Lecture disponible';
}

function Player({source,title,poster}:{source?:Playback;title:string;poster?:string}){
 const [playing,setPlaying]=useState(false),[failed,setFailed]=useState(false);
 if(!source)return <div className={s.playerEmpty}><span className={s.playIcon} aria-hidden="true">▷</span><h3>Lecture à venir</h3><p>Le lien de lecture de {title} n’est pas encore disponible.</p></div>;
 if(source.type==='link')return <div className={s.playerEmpty}><h3>{title}</h3><a className={s.primary} href={source.url} target="_blank" rel="noopener noreferrer">{source.label||'Ouvrir la lecture'}</a></div>;
 if(!playing)return <div className={s.playerEmpty}>{poster&&<img src={poster} alt=""/>}{source.verified===false&&<p>La lecture de cet épisode reste à vérifier.</p>}<button className={s.primary} onClick={()=>setPlaying(true)}>Lire {title}</button></div>;
 if(source.type==='embed')return <div><iframe className={s.player} src={source.url} title={`Lecture de ${title}`} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="no-referrer"/><p><a className={s.source} href={source.url} target="_blank" rel="noopener noreferrer">Ouvrir le lecteur dans un onglet</a></p></div>;
 return <div><video className={s.player} src={source.url} poster={poster} controls playsInline autoPlay onError={()=>setFailed(true)}/>{source.credit&&<p><a className={s.source} href={safePlayback({type:'link',url:source.creditUrl??'https://creativecommons.org/licenses/by/3.0/'})?.url} target="_blank" rel="noopener noreferrer">{source.credit}</a></p>}{failed&&<p role="alert">La vidéo n’a pas pu être chargée. <a href={source.url} target="_blank" rel="noopener noreferrer">Ouvrir le lien de lecture</a></p>}</div>;
}

export function AllflixDetail(){
 const [id,setId]=useState<string|null>(null),[ready,setReady]=useState(false),[seasonNumber,setSeasonNumber]=useState<number|null>(null),[episodeNumber,setEpisodeNumber]=useState<number|null>(null);
 useEffect(()=>{function read(){const p=new URLSearchParams(location.search);const value=p.get('id');setId(value&&/^(?:tmdb-(?:movie|tv)-\d+|open-(?:movie|tv)-[a-z0-9-]+)$/.test(value)?value:null);const sn=p.get('s'),en=p.get('e');setSeasonNumber(sn!==null&&/^\d+$/.test(sn)?Number(sn):null);setEpisodeNumber(en!==null&&/^\d+$/.test(en)?Number(en):null);setReady(true);}read();window.addEventListener('popstate',read);return()=>window.removeEventListener('popstate',read);},[]);
 const {data:title,error,mutate}=useSWR<Title>(id?`/allflix/titles/${id}.json`:null,fetcher);
 useEffect(()=>{const url=safePlayback({type:'link',url:title?.redirectUrl??''})?.url;if(url)window.location.replace(url);},[title?.redirectUrl]);
 const {data:links,error:linkError,mutate:retryLinks}=useSWR<Record<string,Playback>>('/allflix/playback.json',fetcher);
 const season=title?.seasons.find(s=>s.number===seasonNumber)??title?.seasons.find(s=>s.number>0)??title?.seasons[0];
 const episode=season?.episodes.find(e=>e.number===episodeNumber)??season?.episodes[0];
 function choose(sn:number,en?:number){setSeasonNumber(sn);setEpisodeNumber(en??null);const p=new URLSearchParams({id:id!,s:String(sn)});if(en!==undefined)p.set('e',String(en));history.replaceState(null,'','?'+p.toString());}
 const key=title?playbackKey(title,season?.number,episode?.number):'';
 // Ordre : lien saisi dans playback.json, sinon l'API de lecture si elle est activée.
 // Une série peut avoir un lien par épisode ou un seul lien pour toute l'œuvre.
 const local=safePlayback(links?.[key]??(title?.media==='tv'?links?.[title.id]:undefined));
 const apiUrl=title&&links&&!local&&PLAYBACK_API?playbackApiUrl(title,season?.number,episode?.number):null;
 const {data:remote,isLoading:checking}=useSWR<Playback|null>(apiUrl,playbackFetcher,{shouldRetryOnError:false,revalidateOnFocus:false});
 const source=local??safePlayback(remote??undefined);
 const label=title?.media==='tv'&&episode?`S${season!.number} E${episode.number} — ${episode.title}`:title?.title??'';
 return <Frame extraCredit={anilistCredit}><main className={s.detail}><Link className={s.back} href="/allflix/#catalogue">Retour au catalogue</Link>
  {(!ready||id&&!title&&!error)&&<p role="status" className={s.empty}>Chargement de la fiche…</p>}
  {ready&&(!id||error)&&<div className={s.empty}><h1>Cette fiche est indisponible.</h1><p>Retrouve les titres disponibles dans le catalogue.</p>{id&&<button onClick={()=>mutate()}>Réessayer</button>}</div>}
  {title&&<><section className={s.titleIntro}><div className={s.detailCover}><Cover title={title}/></div><div><span className={s.eyebrow}>{kind(title)}{title.year?` / ${title.year}`:''}</span><h1>{title.title}</h1><div className={s.metadata}>{title.genres.map(g=><span key={g}>{g}</span>)}{!!title.minutes&&<span>{title.minutes} min</span>}{title.rating>0&&<span>{title.rating.toFixed(1)} / 10 TMDB</span>}</div><h2>Synopsis</h2><p className={s.synopsis}>{title.synopsis||'Le synopsis en français n’est pas encore renseigné.'}</p><a href={title.source} target="_blank" rel="noopener noreferrer" className={s.source}>{title.tmdbId ? "Fiche originale sur TMDB" : "Fiche source"}</a></div></section>
  {title.externalLinks?.length ? <section className={s.watch} aria-label="Liens disponibles"><h2>Choisir une saison ou une version</h2><div className={s.episodeList}>{title.externalLinks.map(link=><a className={s.secondary} key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}</div></section> : <section className={s.watch} aria-label="Lecture"><div className={s.sectionTitle}><h2>{title.media==='movie'?'Le film':'Les épisodes'}</h2>{title.media==='tv'&&title.seasons.length>0&&<label className={s.select}>Saison<select aria-label="Saison" value={season?.number??''} onChange={e=>choose(Number(e.target.value))}>{title.seasons.map(s=><option key={s.number} value={s.number}>{s.title||`Saison ${s.number}`}</option>)}</select></label>}</div>
   {title.media==='tv'&&<div className={s.episodeList} aria-label="Choix de l’épisode">{season?.episodes.map(e=><button key={e.number} aria-pressed={e.number===episode?.number} onClick={()=>choose(season.number,e.number)}><span>{String(e.number).padStart(2,'0')}</span><span>{e.title||`Épisode ${e.number}`}<small>{e.minutes?`${e.minutes} min / `:''}{episodeAvailability(links?.[playbackKey(title,season.number,e.number)],links?.[title.id])}</small></span></button>)}{!season?.episodes.length&&<p>{source?.type==='link'?'Consulte les épisodes sur la plateforme.':'Les épisodes de cette saison ne sont pas encore renseignés.'}</p>}</div>}
   <div className={s.playerHeading}><h3>{label}</h3>{title.media==='tv'&&episode?.synopsis&&<details><summary>Synopsis de cet épisode</summary><p>{episode.synopsis}</p></details>}</div>
   {linkError?<div className={s.empty} role="alert">Les liens de lecture n’ont pas pu être chargés. <button onClick={()=>retryLinks()}>Réessayer</button></div>:!links||checking?<p role="status">Vérification de la disponibilité…</p>:<Player key={key+(source?.url??'')} source={source} title={label} poster={image(title.backdrop,'w1280')}/>}
   {title.media==='tv'&&episode&&season&&<div className={s.episodeNav}><button disabled={season.episodes.indexOf(episode)===0} onClick={()=>choose(season.number,season.episodes[season.episodes.indexOf(episode)-1].number)}>Épisode précédent</button><button disabled={season.episodes.indexOf(episode)===season.episodes.length-1} onClick={()=>choose(season.number,season.episodes[season.episodes.indexOf(episode)+1].number)}>Épisode suivant</button></div>}
  </section>}<TitleCharacters titleId={title.id}/></>}
 </main></Frame>;
}
