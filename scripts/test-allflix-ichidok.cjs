const assert=require('node:assert/strict'),fs=require('node:fs');
const catalog=require('../public/allflix/catalog.json'),report=require('../public/allflix/ichidok-import.json'),playback=require('../public/allflix/playback.json');
const titles=new Map(catalog.titles.map(t=>[t.id,t]));
assert.equal(titles.size,catalog.titles.length);
assert.equal(report.seedEntries+report.auditAdded,report.entries.length+report.excluded.length);
for(const row of report.entries){
 const title=titles.get(row.id);assert.ok(title,row.id);assert.ok(!title.redirectUrl,row.id);
 assert.ok(/^(?:tmdb-(?:movie|tv)-\d+|open-(?:movie|tv)-[a-z0-9-]+)$/.test(row.id));
 const detail=JSON.parse(fs.readFileSync('public/allflix/titles/'+row.id+'.json','utf8'));
 assert.equal(detail.id,row.id);
 for(const mal of detail.malIds||[])assert.ok(Number.isSafeInteger(mal)&&mal>0);
}
assert.deepEqual(titles.get('tmdb-tv-37854').malIds,[21],'One Piece uses MAL 21, not a similarly mislabelled seed entry');
assert.ok(titles.get('tmdb-tv-65930').malIds.includes(31964));
assert.ok(titles.get('open-tv-mal-37510').title.includes('Mob Psycho'));
assert.deepEqual(titles.get('open-tv-mal-52991').malIds,[52991],'Japanese native names must not collapse unrelated anime into Frieren');
assert.deepEqual(titles.get('open-tv-mal-38000').malIds,[38000]);
assert.notEqual(report.entries.find(e=>e.malId===52991).id,report.entries.find(e=>e.malId===54492).id,'Frieren and The Apothecary Diaries remain separate works');
let links=0;
for(const [key,source]of Object.entries(playback)){
 if(!source.url.startsWith('https://zokoanime.video/'))continue;
 const id=key.split(':')[0],title=titles.get(id),detail=JSON.parse(fs.readFileSync('public/allflix/titles/'+id+'.json','utf8'));
 const match=/^https:\/\/zokoanime\.video\/stream\/mal\/(\d+)\/(\d+)\/sub$/.exec(source.url);
 assert.ok(match);assert.ok(title.malIds.includes(Number(match[1])));assert.equal(source.type,'embed');
 if(title.media==='tv'){
  const suffix=/:s(\d+):e(\d+)$/.exec(key);assert.ok(suffix);
  assert.equal(Number(suffix[2]),Number(match[2]));
  assert.ok(detail.seasons.find(s=>s.number===Number(suffix[1]))?.episodes.some(e=>e.number===Number(suffix[2])));
 }
 assert.equal(typeof source.verified,'boolean');links++;
}
assert.ok(links>1000);assert.equal(Object.values(playback).filter(p=>p.type==='video').length,1030,'Existing direct videos preserved');
console.log(`Ichidok OK: ${report.entries.length} source entries reconciled, ${links} episode links, valid identities, exact episode mapping, previous videos preserved.`);
