import fs from 'node:fs/promises';
const root=new URL('../',import.meta.url),load=async path=>JSON.parse(await fs.readFile(new URL(path,root),'utf8'));
const catalog=await load('public/allflix/catalog.json'),playback=await load('public/allflix/playback.json');
const manifest=await load('scripts/data/anime-sama-image-files.json');
const cache=await load('scripts/data/allflix-image-cache.json').catch(()=>({}));
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const changed=new Map(),counts={catalog:0,animeImages:0,commons:0,tmdb:0};
function assign(title,url,source,kind){if(title.poster||!url)return;title.poster=url;changed.set(title.id,{title,source});counts[kind]++;}
const images=new Map();
for(const path of [...manifest.files].sort((a,b)=>Number(b.includes('/thumb/'))-Number(a.includes('/thumb/')))){
 const key=norm(path.split('/').at(-1).replace(/\.(jpg|png|webp)$/i,''));
 if(!images.has(key))images.set(key,'https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/'+path);
}
const existing=new Map();
for(const t of catalog.titles)if(t.poster)for(const name of[t.title,t.originalTitle,...(t.aliases||[])])if(norm(name)){
 const key=`${t.media}:${norm(name)}`;if(!existing.has(key))existing.set(key,[]);existing.get(key).push({year:t.year,url:t.poster});
}
for(const t of catalog.titles){
 if(t.poster)continue;
 const names=[t.title,t.originalTitle,...(t.aliases||[])].filter(Boolean);
 if(t.id.includes('wikiflix'))continue;
 const reused=names.map(n=>{const matches=existing.get(`${t.media}:${norm(n)}`)||[];const exact=t.year?matches.filter(x=>x.year===t.year):matches;const urls=[...new Set(exact.map(x=>x.url))];return urls.length===1?urls[0]:null;}).find(Boolean);
 if(reused){assign(t,reused,'Affiche de la même œuvre déjà présente','catalog');continue;}
 let slug='';try{slug=new URL(t.source).pathname.match(/^\/catalogue\/([^/]+)/)?.[1]||'';}catch{}
 const asset=[slug,...names].map(n=>images.get(norm(n))).find(Boolean);
 if(asset)assign(t,asset,manifest.source,'animeImages');
}
console.log('Affiches réutilisées et catalogue animé :',counts);
const commons=catalog.titles.filter(t=>!t.poster).map(t=>{
 const entry=playback[t.id]||Object.entries(playback).find(([key])=>key.startsWith(t.id+':'))?.[1];
 let file;try{file=decodeURIComponent(new URL(entry?.creditUrl).pathname).split('File:')[1];}catch{}
 if(!file&&entry?.url?.startsWith('https://upload.wikimedia.org/'))file=decodeURIComponent(new URL(entry.url).pathname.split('/').at(-1));
 return file?{title:t,file}:null;
}).filter(Boolean);
for(let i=0;i<commons.length;i+=20){
 const batch=commons.slice(i,i+20),url=new URL('https://commons.wikimedia.org/w/api.php');
 url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',iiprop:'url',iiurlwidth:'480',titles:batch.map(t=>'File:'+t.file).join('|')});
 try{
  let data;
  for(let attempt=0;attempt<4;attempt++){
   const response=await fetch(url,{headers:{'User-Agent':'Allflix-image-import/1.0 (https://slumbywise.com)'},signal:AbortSignal.timeout(20000)});
   if(response.ok){data=await response.json();if(!data.error)break;}
   await new Promise(r=>setTimeout(r,1000*(attempt+1)));
  }
  if(!data?.query)continue;
  for(const page of data.query?.pages||[]){
   const info=page.imageinfo?.[0],item=batch.find(x=>norm('File:'+x.file)===norm(page.title));
   if(!item||!info?.thumburl)continue;
   const image=new URL(info.thumburl);if(!['thumb.wikimedia.org','upload.wikimedia.org'].includes(image.hostname))continue;image.search='';
   assign(item.title,image.href,info.descriptionurl,'commons');
  }
 }catch{}
 await new Promise(r=>setTimeout(r,250));
 if(i%200===0)console.log('Vignettes de films :',counts.commons);
}
const env=await fs.readFile(new URL('.env.local',root),'utf8');
const key=process.env.TMDB_API_KEY||env.match(/^TMDB_API_KEY=["']?([^\s"']+)/m)?.[1];
const pending=catalog.titles.filter(t=>!t.poster);let index=0,done=0;
async function worker(){while(index<pending.length){
 const title=pending[index++],queries=[...new Set([title.title,title.originalTitle].filter(Boolean))].slice(0,2);
 for(const query of queries){
  const cacheKey=`${title.media}:${title.year}:${norm(query)}`;let found=cache[cacheKey];
  if(found===undefined&&key){
   const url=new URL(`https://api.themoviedb.org/3/search/${title.media}`);url.search=new URLSearchParams({api_key:key,query,language:'fr-FR',include_adult:'false'});
   try{
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
    if(response.status===429){await new Promise(r=>setTimeout(r,3000));continue;}
    if(response.ok){
     const data=await response.json(),wanted=[title.title,title.originalTitle,...(title.aliases||[])].map(norm);
     const match=(data.results||[]).find(row=>row.poster_path&&[row.title,row.name,row.original_title,row.original_name].some(n=>n&&wanted.includes(norm(n)))&&(!title.year||Math.abs(Number((row.release_date||row.first_air_date||'').slice(0,4))-Number(title.year))<=1));
     found=match?{path:match.poster_path,source:`https://www.themoviedb.org/${title.media}/${match.id}`}:null;
     cache[cacheKey]=found;
    }
   }catch{}
   await new Promise(r=>setTimeout(r,160));
  }
  if(found?.path){assign(title,found.path,found.source,'tmdb');break;}
 }
 done++;if(done%100===0)console.log(`Recherche d’affiches ${done}/${pending.length} : ${counts.tmdb} correspondances exactes`);
}}
await Promise.all([worker(),worker(),worker()]);
for(const {title}of changed.values()){
 const path=new URL(`public/allflix/titles/${title.id}.json`,root);
 const detail=JSON.parse(await fs.readFile(path,'utf8'));detail.poster=title.poster;await fs.writeFile(path,JSON.stringify(detail)+'\n');
}
catalog.updatedAt=new Date().toISOString();
await fs.writeFile(new URL('public/allflix/catalog.json',root),JSON.stringify(catalog)+'\n');
await fs.writeFile(new URL('scripts/data/allflix-image-cache.json',root),JSON.stringify(cache)+'\n');
const report={at:catalog.updatedAt,counts,filled:changed.size,remaining:catalog.titles.filter(t=>!t.poster).map(t=>({id:t.id,title:t.title})),sources:[...changed].map(([id,x])=>({id,url:x.title.poster,source:x.source}))};
await fs.writeFile(new URL('public/allflix/image-report.json',root),JSON.stringify(report)+'\n');
console.log(JSON.stringify({filled:report.filled,counts,remaining:report.remaining.length},null,2));
