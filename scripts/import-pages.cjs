const fs=require('fs'),crypto=require('crypto');
const rows=JSON.parse(fs.readFileSync(process.argv[2],'utf8').replace(/^\uFEFF/,''));
const catalog=JSON.parse(fs.readFileSync('public/allflix/catalog.json','utf8'));
const groups=new Map();
for(const row of rows){
 if(String(row.statut)!=='200'||!row.titre)continue;
 let u;try{u=new URL(row.page_url)}catch{continue}
 if(u.protocol!=='https:'||u.hostname!=='anime-sama.to'||u.username||u.password)continue;
 const parts=u.pathname.split('/').filter(Boolean);if(parts[0]!=='catalogue'||!parts[1])continue;
 const id='source-'+crypto.createHash('sha256').update(parts[1]).digest('hex').slice(0,16);
 const label=row.titre.split(' | ')[0].trim();
 const title=label.replace(/\s*-\s*(Saison|Film|Scan|OAV|Spécial).*$/i,'').trim()||label;
 if(!groups.has(id))groups.set(id,{id,tmdbId:0,media:'tv',anime:true,title,originalTitle:title,synopsis:'',year:'',poster:null,backdrop:null,genres:[],minutes:null,rating:0,seasons:[],source:u.origin+'/catalogue/'+parts[1]+'/',externalLinks:[]});
 const g=groups.get(id);if(!g.externalLinks.some(l=>l.url===u.href))g.externalLinks.push({url:u.href,label:label+(parts.includes('vf')?' — VF':parts.includes('vostfr')?' — VOSTFR':'')});
}
catalog.titles=catalog.titles.filter(t=>!t.id.startsWith('source-'));
for(const title of groups.values()){title.redirectUrl=title.externalLinks[0].url;fs.writeFileSync('public/allflix/titles/'+title.id+'.json',JSON.stringify(title));catalog.titles.push({...title,externalLinks:undefined});}
catalog.updatedAt=new Date().toISOString();fs.writeFileSync('public/allflix/catalog.json',JSON.stringify(catalog));
console.log(`${groups.size} fiches, ${[...groups.values()].reduce((n,t)=>n+t.externalLinks.length,0)} liens uniques importés.`);
