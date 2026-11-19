import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const catalog=JSON.parse(await fs.readFile('public/allflix/catalog.json','utf8'));
const playback=JSON.parse(await fs.readFile('public/allflix/playback.json','utf8'));
const norm=value=>String(value||'').replace(/&amp;/g,'&').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g,'');
const changes=new Map();
const cleanImage=value=>{try{const url=new URL(value);return url.protocol==='https:'&&['s4.anilist.co','upload.wikimedia.org','thumb.wikimedia.org','archive.org'].includes(url.hostname)?url.href:null;}catch{return null;}};
function set(title,poster,source,media){
 poster=cleanImage(poster);if(!poster||title.poster)return;title.poster=poster;
 if(media){title.anime=true;if(!title.year&&media.startDate?.year)title.year=String(media.startDate.year);if(media.idMal>0&&!title.malIds?.length)title.malIds=[media.idMal];}
 changes.set(title.id,{title,source});
}
const pending=catalog.titles.filter(t=>!t.poster&&!t.id.includes('wikiflix')&&t.id!=='open-tv-morevna');
for(let i=0;i<pending.length;){
 const batch=[],variables={},parts=[];
 for(let next=i;next<pending.length&&batch.length<6;next++){
  if(batch.length&&(batch[0].malIds?.length===1||pending[next].malIds?.length===1))break;
  batch.push(pending[next]);
 }
 const chunk=batch;i+=chunk.length;
 chunk.forEach((title,n)=>{
  const fields='id idMal siteUrl format synonyms startDate{year} title{romaji english native} coverImage{extraLarge large}';
  if(title.malIds?.length===1)parts.push(`m${n}: Media(type:ANIME,idMal:${title.malIds[0]}){${fields}}`);
  else{variables['q'+n]=title.title.replace(/&amp;/g,'&');parts.push(`m${n}: Page(perPage:5){media(type:ANIME,search:$q${n},sort:SEARCH_MATCH,isAdult:false){${fields}}}`);}
 });
 const declarations=Object.keys(variables).map(k=>`$${k}:String!`).join(',');
 const query=`query${declarations?'('+declarations+')':''}{${parts.join(' ')}}`;
 try{
  let response;
  for(let attempt=0;attempt<3;attempt++){
   response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(25000)});
   if(response.status!==429)break;await new Promise(r=>setTimeout(r,Math.min(45000,1000*Number(response.headers.get('retry-after')||20))));
  }
  if(response.ok){const body=await response.json();chunk.forEach((title,n)=>{
   const result=body.data?.['m'+n];
   const candidates=result?.media||[result].filter(Boolean);
   const names=[title.title,title.originalTitle,...(title.aliases||[])].map(norm).filter(Boolean);
   const media=candidates.find(m=>(m.format==='MOVIE')===(title.media==='movie')&&[m.title?.romaji,m.title?.english,m.title?.native,...(m.synonyms||[])].map(norm).some(name=>name&&names.includes(name)));
   if(media)set(title,media.coverImage?.extraLarge||media.coverImage?.large,media.siteUrl,media);
  });}
 }catch{}
 if(i%30===0)console.log(`Affiches AniList : ${i}/${pending.length}, ${changes.size} trouvées`);
 await new Promise(r=>setTimeout(r,2200));
}
// Exact Wikidata IDs identify archive film illustrations without title guessing.
const archives=catalog.titles.filter(t=>!t.poster&&t.id.includes('wikiflix'));
for(let i=0;i<archives.length;i+=20){
 const batch=archives.slice(i,i+20),url=new URL('https://www.wikidata.org/w/api.php');
 url.search=new URLSearchParams({action:'wbgetentities',format:'json',props:'claims',ids:batch.map(t=>'Q'+t.id.split('-').at(-1)).join('|')});
 try{
  const body=await(await fetch(url,{signal:AbortSignal.timeout(25000)})).json();
  for(const title of batch){
   const entity=body.entities?.['Q'+title.id.split('-').at(-1)],file=entity?.claims?.P18?.find(c=>c.rank!=='deprecated')?.mainsnak?.datavalue?.value;
   if(!file)continue;
   const name=file.replaceAll(' ','_'),hash=crypto.createHash('md5').update(name).digest('hex');
   set(title,`https://upload.wikimedia.org/wikipedia/commons/${hash[0]}/${hash.slice(0,2)}/${encodeURIComponent(name)}`,`https://www.wikidata.org/wiki/${entity.id}`);
  }
 }catch{}
}
for(const title of catalog.titles.filter(t=>!t.poster)){
 const entry=playback[title.id]||Object.entries(playback).find(([key])=>key.startsWith(title.id+':'))?.[1];
 const id=entry?.url?.match(/^https:\/\/archive\.org\/download\/([^/]+)/)?.[1];if(!id)continue;
 try{const data=await(await fetch(`https://archive.org/metadata/${id}`,{signal:AbortSignal.timeout(15000)})).json();if(data.files?.some(f=>f.name==='__ia_thumb.jpg'))set(title,`https://archive.org/download/${id}/__ia_thumb.jpg`,`https://archive.org/details/${id}`);}catch{}
}
for(const {title}of changes.values()){
 const path=`public/allflix/titles/${title.id}.json`,detail=JSON.parse(await fs.readFile(path,'utf8'));
 Object.assign(detail,{poster:title.poster,anime:title.anime,year:title.year,malIds:title.malIds});await fs.writeFile(path,JSON.stringify(detail)+'\n');
}
catalog.updatedAt=new Date().toISOString();await fs.writeFile('public/allflix/catalog.json',JSON.stringify(catalog)+'\n');
const previous=JSON.parse(await fs.readFile('public/allflix/image-report.json','utf8'));
previous.sources.push(...[...changes].map(([id,{title,source}])=>({id,url:title.poster,source})));
previous.filled+=changes.size;previous.remaining=catalog.titles.filter(t=>!t.poster).map(t=>({id:t.id,title:t.title}));previous.at=catalog.updatedAt;
await fs.writeFile('public/allflix/image-report.json',JSON.stringify(previous)+'\n');
console.log(JSON.stringify({added:changes.size,totalFilled:previous.filled,remaining:previous.remaining.length},null,2));
