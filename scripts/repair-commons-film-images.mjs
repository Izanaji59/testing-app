import fs from 'node:fs/promises';
const catalog=JSON.parse(await fs.readFile('public/allflix/catalog.json','utf8')),playback=JSON.parse(await fs.readFile('public/allflix/playback.json','utf8'));
const report=JSON.parse(await fs.readFile('public/allflix/image-report.json','utf8'));
const clean=s=>String(s).normalize('NFC').replaceAll('_',' ').trim();
const pending=[];
for(const title of catalog.titles){
 const source=playback[title.id]||Object.entries(playback).find(([key])=>key.startsWith(title.id+':'))?.[1];
 if(!source?.url?.startsWith('https://upload.wikimedia.org/'))continue;
 const file=decodeURIComponent(new URL(source.url).pathname.split('/').at(-1));
 let shown=null;
 if(title.poster?.includes('.wikimedia.org/')&&title.poster.includes('/thumb/'))shown=decodeURIComponent(new URL(title.poster).pathname.split('/').at(-2));
 if(!title.poster||shown&&clean(shown)!==clean(file))pending.push({title,file,wasMissing:!title.poster});
}
let added=0,repaired=0;
for(let i=0;i<pending.length;i+=15){
 const batch=pending.slice(i,i+15),url=new URL('https://commons.wikimedia.org/w/api.php');
 url.search=new URLSearchParams({action:'query',format:'json',formatversion:'2',prop:'imageinfo',iiprop:'url',iiurlwidth:'480',titles:batch.map(x=>'File:'+x.file).join('|')});
 try{const body=await(await fetch(url,{headers:{'User-Agent':'Allflix-image-import/1.0 (https://slumbywise.com)'},signal:AbortSignal.timeout(25000)})).json();
  for(const page of body.query?.pages||[]){
   const item=batch.find(x=>clean('File:'+x.file)===clean(page.title)),info=page.imageinfo?.[0];if(!item||!info?.thumburl)continue;
   const image=new URL(info.thumburl);if(!['thumb.wikimedia.org','upload.wikimedia.org'].includes(image.hostname))continue;image.search='';item.title.poster=image.href;
   const file=`public/allflix/titles/${item.title.id}.json`,detail=JSON.parse(await fs.readFile(file,'utf8'));detail.poster=image.href;await fs.writeFile(file,JSON.stringify(detail)+'\n');
   report.sources=report.sources.filter(x=>x.id!==item.title.id);report.sources.push({id:item.title.id,url:image.href,source:info.descriptionurl});if(item.wasMissing)added++;else repaired++;
  }
 }catch{}
 await new Promise(r=>setTimeout(r,400));
}
report.filled+=added;report.remaining=catalog.titles.filter(t=>!t.poster).map(t=>({id:t.id,title:t.title}));report.at=new Date().toISOString();catalog.updatedAt=report.at;
await fs.writeFile('public/allflix/catalog.json',JSON.stringify(catalog)+'\n');await fs.writeFile('public/allflix/image-report.json',JSON.stringify(report)+'\n');
console.log(JSON.stringify({candidates:pending.length,added,repaired,totalFilled:report.filled,remaining:report.remaining.length},null,2));
