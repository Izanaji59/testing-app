// Metadata only. Playback links live separately and are never overwritten by an import.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const env=await fs.readFile(path.join(root,'.env.local'),'utf8').catch(()=>'');
const key=process.env.TMDB_API_KEY || env.match(/^TMDB_API_KEY=["']?([^\s"']+)/m)?.[1];
if(!key)throw new Error('TMDB_API_KEY is required in the local environment.');
const arg=(name,fallback)=>Number(process.argv.find(x=>x.startsWith(name+'='))?.split('=')[1]??fallback);
const start=arg('--start',1),pages=arg('--pages',1);
if(!Number.isInteger(start)||!Number.isInteger(pages)||start<1||pages<1||start+pages>501)throw new Error('Pages must be within 1–500.');
async function get(route,params={}){
 const url=new URL('https://api.themoviedb.org/3/'+route);url.search=new URLSearchParams({api_key:key,language:'fr-FR',...params});
 for(let attempt=0;attempt<4;attempt++){
  let response;try{response=await fetch(url,{signal:AbortSignal.timeout(30000)});}catch{if(attempt===3)throw new Error('TMDB connection failed');await new Promise(r=>setTimeout(r,1500));continue;}
  if(response.ok)return response.json();
  if(response.status===429||response.status>=500){await new Promise(r=>setTimeout(r,2000*(attempt+1)));continue;}
  throw new Error('TMDB returned HTTP '+response.status);
 }throw new Error('TMDB is temporarily unavailable');
}
const target=path.join(root,'public/allflix/catalog.json');
const existing=JSON.parse(await fs.readFile(target,'utf8').catch(()=>' {"titles":[]}'));
const titles=new Map(existing.titles.map(t=>[t.id,t]));
const pending=new Map();
for(let page=start;page<start+pages;page++)for(const [media,params] of [['movie',{}],['tv',{}],['tv',{with_genres:'16',with_original_language:'ja'}],['movie',{with_genres:'16',with_original_language:'ja'}]]){
 const result=await get('discover/'+media,{page:String(page),include_adult:'false',sort_by:'popularity.desc',...params});
 for(const item of result.results)pending.set(`${media}-${item.id}`,{media,id:item.id});
}
// Bounded concurrency; retain complete previous catalogue if any request fails.
const work=[...pending.values()];let index=0,completed=0;
async function worker(){while(index<work.length){const {media,id}=work[index++];const d=await get(`${media}/${id}`);if(d.adult)continue;
 const seasons=[];
 if(media==='tv')for(const season of d.seasons??[]){
  const data=await get(`tv/${id}/season/${season.season_number}`);
  seasons.push({number:season.season_number,title:season.name,episodes:(data.episodes??[]).map(e=>({number:e.episode_number,title:e.name,synopsis:e.overview||'',minutes:e.runtime??null,image:e.still_path,date:e.air_date||null}))});
 }
 titles.set(`tmdb-${media}-${id}`,{id:`tmdb-${media}-${id}`,tmdbId:id,media,anime:d.original_language==='ja'&&(d.genres??[]).some(g=>g.id===16),title:d.title||d.name,originalTitle:d.original_title||d.original_name,synopsis:d.overview||'',year:(d.release_date||d.first_air_date||'').slice(0,4),poster:d.poster_path,backdrop:d.backdrop_path,genres:(d.genres??[]).map(g=>g.name),minutes:d.runtime??d.episode_run_time?.[0]??null,rating:Math.round((d.vote_average||0)*10)/10,seasons,source:`https://www.themoviedb.org/${media}/${id}`});
 completed++;if(completed%10===0)console.log(`Imported ${completed}/${work.length} titles`);
}}
await Promise.all([worker(),worker()]);
await fs.mkdir(path.dirname(target),{recursive:true});
await fs.mkdir(path.join(path.dirname(target),'titles'),{recursive:true});
for(const {media,id} of work){const title=titles.get(`tmdb-${media}-${id}`);if(title)await fs.writeFile(path.join(path.dirname(target),'titles',title.id+'.json'),JSON.stringify(title)+'\n');}
const indexTitles=[...titles.values()].map(t=>({...t,seasons:t.seasons.map(s=>({...s,episodes:[]}))}));
await fs.writeFile(target+'.tmp',JSON.stringify({updatedAt:new Date().toISOString(),titles:indexTitles})+'\n');
await fs.rename(target+'.tmp',target);
console.log(`Allflix: ${titles.size} titles, ${[...titles.values()].reduce((n,t)=>n+t.seasons.reduce((s,x)=>s+x.episodes.length,0),0)} episodes. No playback links changed.`);
