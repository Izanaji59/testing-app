import { readFile, writeFile } from 'node:fs/promises';
import { providerRow } from './allflix-links.mjs';

const root = new URL('../public/allflix/', import.meta.url);
const envText = await readFile(new URL('../.env.local', import.meta.url), 'utf8').catch(() => '');
const apiKey = process.env.TMDB_API_KEY || envText.match(/^TMDB_API_KEY=["']?([^\s"']+)/m)?.[1];
if (!apiKey) throw new Error('TMDB_API_KEY est requise.');
const target = Number(process.argv.find(arg => arg.startsWith('--target='))?.slice(9) ?? 300);
if (!Number.isInteger(target) || target < 1 || target > 500) throw new Error('Objectif attendu : 1 à 500 fiches par catégorie.');

const catalogPath = new URL('catalog.json', root);
const playbackPath = new URL('playback.json', root);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const playback = JSON.parse(await readFile(playbackPath, 'utf8'));
const titles = new Map(catalog.titles.map(title => [title.id, title]));
const category = title => title.anime ? 'anime' : title.media;
const imported = new Map();
const seen = new Set();
const counts = { movie: 0, tv: 0, anime: 0 };
for (const title of titles.values()) {
  if (title.tmdbId > 0 && playback[title.id]?.type === 'link') counts[category(title)]++;
}

async function tmdb(route, params = {}) {
  const url = new URL(route, 'https://api.themoviedb.org/3/');
  url.search = new URLSearchParams({ api_key: apiKey, language: 'fr-FR', ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(12000) }); } catch {}
    if (response?.ok) return response.json();
    if (response?.status === 404) return null;
    if (response && response.status !== 429 && response.status < 500) {
      throw new Error(`TMDB HTTP ${response.status} pour ${route}`);
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
  throw new Error(`TMDB inaccessible pour ${route}`);
}

async function resolveTitle(media, id, bucket) {
  const key = `tmdb-${media}-${id}`;
  const data = await tmdb(`${media}/${id}`, { append_to_response: 'watch/providers' });
  if (!data || data.adult) return null;
  const anime = data.original_language === 'ja' && data.genres?.some(genre => genre.id === 16);
  if (category({ media, anime }) !== bucket) return null;
  const offer = providerRow({ id:key, media, title:data.title || data.name }, data['watch/providers']?.results?.FR);
  if (!offer.url) return null;
  const url = new URL(offer.url);
  const watchPath = new RegExp(`^/${media}/${id}(?:-[^/]+)?/watch/?$`);
  if (url.origin !== 'https://www.themoviedb.org' || !watchPath.test(url.pathname) || url.searchParams.get('locale') !== 'FR') return null;
  return {
    offer: { type: 'link', url: url.href, label: 'Où regarder en France' },
    title: {
      id:key, tmdbId:id, media, anime, title:data.title || data.name,
      originalTitle:data.original_title || data.original_name, synopsis:data.overview || '',
      year:(data.release_date || data.first_air_date || '').slice(0,4),
      poster:data.poster_path, backdrop:data.backdrop_path,
      genres:(data.genres ?? []).map(genre => genre.name),
      minutes:data.runtime ?? data.episode_run_time?.[0] ?? null,
      rating:Math.round((data.vote_average || 0)*10)/10, seasons:[],
      source:`https://www.themoviedb.org/${media}/${id}`,
    },
  };
}

async function addPage(media, bucket, page) {
  const result = await tmdb(`discover/${media}`, {
    page:String(page), watch_region:'FR', with_watch_monetization_types:'flatrate|free|ads|rent|buy',
    include_adult:'false', sort_by:'popularity.desc', 'vote_count.gte':'10',
    ...(bucket === 'anime' ? { with_original_language:'ja', with_genres:'16' } : {}),
  });
  const ids = (result?.results ?? []).filter(item => {
    const anime = item.original_language === 'ja' && item.genre_ids?.includes(16);
    const key = `tmdb-${media}-${item.id}`;
    if (category({media, anime}) !== bucket || seen.has(key) || playback[key]) return false;
    seen.add(key);
    return true;
  }).map(item => item.id);
  for (let offset = 0; offset < ids.length && counts[bucket] < target; offset += 8) {
    const candidates = await Promise.all(ids.slice(offset, offset+8).map(id => resolveTitle(media,id,bucket)));
    for (const candidate of candidates) {
      if (!candidate || counts[bucket] >= target) continue;
      const {title,offer} = candidate;
      if (!titles.has(title.id)) {
        titles.set(title.id,title);
        imported.set(title.id,title);
      }
      playback[title.id] = offer;
      counts[bucket]++;
    }
  }
  return page < Math.min(result?.total_pages ?? 0, 500);
}

for (const bucket of ['movie','tv','anime']) {
  const mediaTypes = bucket === 'anime' ? ['tv','movie'] : [bucket];
  const remaining = new Set(mediaTypes);
  for (let page = 1; counts[bucket] < target && remaining.size; page++) {
    for (const media of remaining) {
      if (counts[bucket] >= target) break;
      if (!await addPage(media, bucket, page)) remaining.delete(media);
    }
    if (page % 5 === 0) console.log(bucket, counts[bucket], '/', target);
  }
  console.log(bucket, counts[bucket], '/', target);
  if (counts[bucket] < target) throw new Error(`Offres vérifiables insuffisantes pour ${bucket}.`);
}

for (const title of imported.values()) {
  await writeFile(new URL(`titles/${title.id}.json`, root), JSON.stringify(title)+'\n');
}
await writeFile(playbackPath, JSON.stringify(playback,null,2)+'\n');
await writeFile(catalogPath, JSON.stringify({updatedAt:new Date().toISOString(),titles:[...titles.values()]})+'\n');
console.log('Fiches ajoutées :', imported.size);
