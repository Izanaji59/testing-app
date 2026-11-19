import { readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../public/allflix/', import.meta.url);
const load = async name => JSON.parse(await readFile(new URL(name, directory), 'utf8'));
const save = (name, value) => writeFile(new URL(name, directory), JSON.stringify(value)+'\n');
const catalog = await load('catalog.json');
const playback = await load('playback.json');
const films = new Map(catalog.titles.map(title => [title.id, title]));
const usedFiles = new Set(Object.values(playback).filter(row => row.type === 'video').map(row => {
  try { return decodeURIComponent(new URL(row.url).pathname.split('/').at(-1)).replaceAll('_',' '); }
  catch { return ''; }
}));
const normalize = title => title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const duplicates = new Set([...films.values()].map(t => normalize(t.title)+':'+t.year));
const added = [];
const target = Number(process.argv.find(arg => arg.startsWith('--target='))?.slice(9) ?? 300);
if (!Number.isInteger(target) || target < 1 || target > 2000) throw new Error('Objectif attendu : 1 à 2000 films.');
const userAgent = 'AllflixLocalCatalog/1.0 (https://slumbywise.com/allflix/)';

async function get(base, params) {
  const url = new URL(base);
  url.search = new URLSearchParams(params);
  for (let attempt=1; attempt<=3; attempt++) {
    const response = await fetch(url, { headers:{'User-Agent':userAgent}, signal:AbortSignal.timeout(18000) });
    if (response.ok) return response.json();
    if (![429,500,502,503,504].includes(response.status)) throw new Error(`${url.hostname}: HTTP ${response.status}`);
    await new Promise(resolve => setTimeout(resolve, attempt*2000));
  }
  throw new Error(`Service indisponible : ${url.hostname}`);
}

async function section(q, prop, offset) {
  const response = await get('https://wikiflix.toolforge.org/api.php', {action:'get_section',language:'fr',q,prop,offset,limit:50});
  if (response.status !== 'OK' || !Array.isArray(response.data?.entries)) throw new Error('Page WikiFlix invalide.');
  return response.data.entries;
}

function candidate(entry) {
  if (entry.available !== '1' || !/^\d+$/.test(entry.q) || !entry.title || !/^\d{4}$/.test(entry.year)) return;
  const expected = Number(entry.minutes);
  const file = entry.files.find(item => item.property === 10 && item.is_trailer === 0
    && /\.(webm|mp4)$/i.test(item.key) && !/\b(?:trailer|extract|excerpt|teaser|clip|fragment)\b/i.test(item.key)
    && item.minutes >= 1 && (!expected || item.minutes >= expected * 0.8));
  if (file) return {entry,file};
}

async function verify(batch) {
  if (!batch.length) return [];
  const response = await get('https://commons.wikimedia.org/w/api.php', {
    action:'query', format:'json', formatversion:'2', redirects:'1',
    prop:'imageinfo', iiprop:'url|mime|extmetadata', iiurlwidth:'480',
    iiextmetadatafilter:'LicenseShortName|LicenseUrl|Copyrighted',
    titles:batch.map(({file}) => 'File:'+file.key).join('|'),
  });
  const pages = new Map((response.query?.pages ?? []).map(page => [page.title, page.imageinfo?.[0]]));
  return batch.flatMap(({entry,file}) => {
    const image = pages.get('File:'+file.key.replaceAll('_',' '));
    const metadata = image?.extmetadata;
    const license = metadata?.LicenseShortName?.value ?? '';
    const publicDomain = license === 'Public domain' && metadata.Copyrighted?.value === 'False';
    const creativeCommons = /^CC (?:BY(?:-SA)? [34]\.0|0)$/i.test(license);
    if (!image || (!publicDomain && !creativeCommons) || !['video/webm','video/mp4'].includes(image.mime)) return [];
    const url = new URL(image.url);
    if (url.origin !== 'https://upload.wikimedia.org') return [];
    url.search = '';
    const thumb = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(image.thumburl || '') ? image.thumburl : null;
    return [{entry,file,license,url:url.href,source:image.descriptionurl,thumb}];
  });
}

function addFilm(item, anime) {
  const {entry,file,license,url,source,thumb} = item;
  const id = 'open-movie-wikiflix-'+entry.q;
  const dedupe = normalize(entry.title)+':'+entry.year;
  if (films.has(id) || duplicates.has(dedupe) || usedFiles.has(file.key)) return false;
  const title = {id,tmdbId:0,media:'movie',anime,title:entry.title,originalTitle:entry.title,synopsis:'',
    year:entry.year,poster:thumb,backdrop:null,genres:[anime?'Animation':'Archives'],minutes:Number(entry.minutes)||file.minutes,rating:0,seasons:[],source};
  films.set(id,title);
  duplicates.add(dedupe);
  usedFiles.add(file.key);
  playback[id] = {type:'video',url,credit:`Wikimedia Commons (${license})`,creditUrl:source};
  added.push(title);
  return true;
}

const animeRows = [];
for (const prop of [136,31]) {
  for (let offset=0; offset<150; offset+=50) {
    const entries = await section('1107',String(prop),String(offset));
    animeRows.push(...entries);
    if (entries.length<50) break;
  }
}
const animeIds = new Set(animeRows.map(entry=>entry.q));
for (let offset=0; offset<animeRows.length; offset+=20) {
  for (const verified of await verify(animeRows.slice(offset,offset+20).map(candidate).filter(Boolean))) addFilm(verified,true);
}

const hasDirectVideo = title => playback[title.id]?.type === 'video';
let filmCount = [...films.values()].filter(t => t.media === 'movie' && !t.anime && hasDirectVideo(t)).length;
for (const group of ['11424','24862','17517379','202866']) {
  for (let offset=0; offset<4000 && filmCount<target; offset+=50) {
    const entries = await section(group,'31',String(offset));
    const batch = entries.filter(entry=>!animeIds.has(entry.q)).map(candidate).filter(Boolean);
    for (let index=0; index<batch.length && filmCount<target; index+=20) {
      for (const verified of await verify(batch.slice(index,index+20))) {
        if (filmCount<target && addFilm(verified,false)) filmCount++;
      }
    }
    if (offset%250 === 0) console.log('Films avec fichier direct :', filmCount);
    if (entries.length<50) break;
  }
  if (filmCount>=target) break;
}

async function entities(ids, props) {
  const results = {};
  for (let index=0; index<ids.length; index+=40) {
    const response = await get('https://www.wikidata.org/w/api.php',{
      action:'wbgetentities',format:'json',ids:ids.slice(index,index+40).join('|'),props,languages:'fr|en',
    });
    Object.assign(results,response.entities);
  }
  return results;
}

const episodeRows = [];
for (let offset=0;offset<150;offset+=50) {
  const rows=await section('21191270','31',String(offset));
  episodeRows.push(...rows.map(candidate).filter(Boolean));
  if (rows.length<50) break;
}
const episodeClaims = await entities(episodeRows.map(row=>'Q'+row.entry.q), 'claims');
const series = new Map();
const value = claim => claim?.mainsnak?.datavalue?.value;
for (let offset=0;offset<episodeRows.length;offset+=20) {
  for (const item of await verify(episodeRows.slice(offset,offset+20))) {
    const claims = episodeClaims['Q'+item.entry.q]?.claims;
    const membership = claims?.P179?.find(claim=>claim.rank!=='deprecated' && /^Q\d+$/.test(value(claim)?.id));
    const seriesQ = value(membership)?.id;
    const number = Number(membership?.qualifiers?.P1545?.[0]?.datavalue?.value ?? value(claims?.P1545?.[0]));
    if (!seriesQ || !Number.isInteger(number) || number < 1 || number > 10000) continue;
    if (!series.has(seriesQ)) series.set(seriesQ,new Map());
    if (!series.get(seriesQ).has(number)) series.get(seriesQ).set(number,item);
  }
}
const seriesLabels = await entities([...series.keys()],'labels|descriptions');
let seriesCount=0;
let episodeCount=0;
for (const [seriesQ, entries] of series) {
  const details = seriesLabels[seriesQ];
  const name = details?.labels?.fr?.value ?? details?.labels?.en?.value;
  if (!name) continue;
  const id = 'open-tv-wikiflix-'+seriesQ.slice(1);
  const first = entries.values().next().value;
  const episodes=[];
  for (const [number,item] of [...entries].sort(([a],[b])=>a-b)) {
    episodes.push({number,title:item.entry.title,synopsis:'',minutes:item.file.minutes,image:item.thumb,date:null});
    playback[id+':s0:e'+number]={type:'video',url:item.url,credit:`Wikimedia Commons (${item.license})`,creditUrl:item.source};
    episodeCount++;
  }
  const show={id,tmdbId:0,media:'tv',anime:false,title:name,originalTitle:name,
    year:'',synopsis:details?.descriptions?.fr?.value ?? '',poster:first.thumb,backdrop:null,genres:['Archives'],
    minutes:null,rating:0,seasons:[{number:0,title:'Épisodes d’archive',episodes}],source:'https://www.wikidata.org/wiki/'+seriesQ};
  films.set(show.id,{...show,seasons:[]});
  added.push(show);
  seriesCount++;
}

for (const title of added) await save('titles/'+title.id+'.json',title);
await writeFile(new URL('playback.json',directory),JSON.stringify(playback,null,2)+'\n');
await save('catalog.json',{updatedAt:new Date().toISOString(),titles:[...films.values()]});
console.log({films:filmCount, nouveauxFilms:added.filter(t=>t.media==='movie'&&!t.anime).length, nouveauxAnimes:added.filter(t=>t.anime).length, series:seriesCount, episodes:episodeCount});
