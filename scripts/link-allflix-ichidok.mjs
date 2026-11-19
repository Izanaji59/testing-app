import fs from 'node:fs/promises';
const root=new URL('../public/allflix/',import.meta.url);
const load=name=>fs.readFile(new URL(name,root),'utf8').then(JSON.parse);
const report=await load('ichidok-import.json');
const playback=await load('playback.json');
const catalog=await load('catalog.json'),knownIds=new Set(catalog.titles.map(t=>t.id));
for(const [key,source]of Object.entries(playback))if(source.credit==='Source du lecteur : Ichidok / Zokoanime'&&!knownIds.has(key.split(':')[0]))delete playback[key];
let added=0,works=0,withoutId=0,unknownEpisodes=0,externalUpdated=0;
for(const id of new Set(report.entries.map(row=>row.id))){
 const title=await load(`titles/${id}.json`);
 const mals=[...new Set(title.malIds||[])];
 if(mals.length!==1){withoutId++;continue;}
 const mal=mals[0];
 if(!Number.isSafeInteger(mal)||mal<1||title.releaseStatus==='upcoming'||Number(title.year)>new Date().getFullYear())continue;
 let episodes=[];
 if(title.media==='movie')episodes=[{key:id,number:1}];
 else{
  const season=title.seasons.find(s=>s.number===1);
  episodes=(season?.episodes||[]).map(e=>({key:`${id}:s${season.number}:e${e.number}`,number:e.number}));
 }
 if(!episodes.length){unknownEpisodes++;continue;}
 let linked=false;
 for(const episode of episodes){
  const url=`https://zokoanime.video/stream/mal/${mal}/${episode.number}/sub`;
  // The user requested an embedded player without the sandbox attribute.
  if(playback[episode.key]?.url===url){playback[episode.key]={...playback[episode.key],type:'embed',label:'Lecteur intégré (SUB)'};externalUpdated++;continue;}
  // Keep explicit existing episode sources; an existing direct video also wins.
  if(playback[episode.key]||playback[id]?.type==='video'||episode.number===1&&playback[id])continue;
  playback[episode.key]={type:'embed',url,label:'Lecteur intégré (SUB)',credit:'Source du lecteur : Ichidok / Zokoanime',creditUrl:report.source,verified:episode.number===1&&[52991,31964].includes(mal)};
  added++;linked=true;
 }
 if(linked)works++;
}
await fs.writeFile(new URL('playback.json',root),JSON.stringify(playback,null,2)+'\n');
console.log(JSON.stringify({addedEpisodeLinks:added,worksLinked:works,externalUpdated,withoutUnambiguousMalId:withoutId,withoutEpisodeList:unknownEpisodes},null,2));
