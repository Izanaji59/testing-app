import fs from 'node:fs/promises';
const catalog=JSON.parse(await fs.readFile('public/allflix/catalog.json','utf8')),characters=JSON.parse(await fs.readFile('public/characters/index.json','utf8'));
const report=JSON.parse(await fs.readFile('public/allflix/image-report.json','utf8'));
const manifest=JSON.parse(await fs.readFile('scripts/data/anime-sama-image-files.json','utf8'));
const paths=new Set(manifest.files),updated=[];
for(const title of catalog.titles.filter(t=>!t.poster&&t.source?.startsWith('https://anime-sama.to/catalogue/'))){
 try{
  const response=await fetch(title.source,{signal:AbortSignal.timeout(20000)});if(!response.ok)continue;
  const body=await response.text();let image;
  for(const tag of body.match(/<meta\b[^>]+>/gi)||[]){
   const attrs=Object.fromEntries([...tag.matchAll(/([a-z:-]+)\s*=\s*["']([^"']*)["']/gi)].map(m=>[m[1].toLowerCase(),m[2]]));
   if(attrs.property==='og:image'||attrs.name==='og:image')image=attrs.content?.replaceAll('&amp;','&');
  }
  if(image){
   const imageUrl=new URL(image,title.source),filename=imageUrl.pathname.split('/').at(-1).replace(/-\d+\.(webp|jpg)$/i,'.$1');
   const stem=filename.replace(/\.(jpg|png|webp)$/i,'');
   const path=[`contenu/thumb/${stem}.webp`,`contenu/${stem}.jpg`,`contenu/${stem}.png`].find(p=>paths.has(p));
   if(path){title.poster='https://cdn.jsdelivr.net/gh/Anime-Sama/IMG@img/'+path;updated.push(title);report.sources.push({id:title.id,url:title.poster,source:title.source});}
  }
 }catch{}
}
const env=await fs.readFile('.env.local','utf8'),key=process.env.TMDB_API_KEY||env.match(/^TMDB_API_KEY=["']?([^\s"']+)/m)?.[1];
async function tmdb(route){const url=new URL(route,'https://api.themoviedb.org/3/');url.search=new URLSearchParams({api_key:key});const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('TMDB '+response.status);return response.json();}
let portraits=0;
for(const ch of characters.characters.filter(c=>!c.image&&c.source==='tmdb')){
 try{
  const title=catalog.titles.find(t=>t.id===ch.titleId);if(!title?.tmdbId)continue;
  const credits=await tmdb(`${title.media}/${title.tmdbId}/${title.media==='movie'?'credits':'aggregate_credits'}`);
  const actor=credits.cast?.find(c=>ch.id==='tmdb-credit-'+c.credit_id||c.roles?.some(r=>ch.id==='tmdb-credit-'+r.credit_id));
  if(!actor?.id)continue;
  let file=actor.profile_path;if(!file){const images=await tmdb(`person/${actor.id}/images`);file=images.profiles?.[0]?.file_path;}
  if(file){ch.image='https://image.tmdb.org/t/p/w342'+file;portraits++;}
 }catch{}
}
for(const title of updated){const file=`public/allflix/titles/${title.id}.json`,detail=JSON.parse(await fs.readFile(file,'utf8'));detail.poster=title.poster;await fs.writeFile(file,JSON.stringify(detail)+'\n');}
report.filled+=updated.length;report.remaining=catalog.titles.filter(t=>!t.poster).map(t=>({id:t.id,title:t.title}));report.at=new Date().toISOString();
await fs.writeFile('public/allflix/catalog.json',JSON.stringify(catalog)+'\n');await fs.writeFile('public/allflix/image-report.json',JSON.stringify(report)+'\n');
if(portraits)await fs.writeFile('public/characters/index.json',JSON.stringify(characters)+'\n');
console.log(JSON.stringify({sourcePosters:updated.length,portraits,remainingPosters:report.remaining.length,remainingPortraits:characters.characters.filter(c=>!c.image).length},null,2));
