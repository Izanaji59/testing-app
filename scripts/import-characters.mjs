// Personnages des œuvres Allflix, via les API officielles uniquement :
// TMDB pour les films et séries, AniList pour les animés (repli TMDB sinon).
// Écrit public/characters/index.json et complète public/characters/typings.json
// sans jamais modifier un typage déjà saisi.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(root, 'public', 'characters');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export function cleanCharacterName(raw) {
  const name = String(raw ?? '')
    .replace(/\s*\((voice|uncredited|archive footage|voix)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!name || /^(self|himself|herself|themselves|narrator|narrateur|narratrice)$/i.test(name)) return '';
  return name;
}

const norm = value => String(value ?? '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9぀-ヿ一-鿿]+/g, '');

/** Meilleur résultat AniList pour une œuvre Allflix, ou null si aucun n'est assez sûr. */
export function pickAnilistMatch(candidates, title) {
  const wanted = [title.title, title.originalTitle].map(norm).filter(Boolean);
  const year = Number(title.year) || null;
  let best = null, bestScore = 0;
  candidates.forEach((media, i) => {
    let score = i === 0 ? 1 : 0;
    const names = [media.title?.romaji, media.title?.english, media.title?.native].map(norm).filter(Boolean);
    if (names.some(n => wanted.includes(n))) score += 3;
    if (year && media.startDate?.year === year) score += 3;
    if ((title.media === 'movie') === (media.format === 'MOVIE')) score += 2;
    if (score > bestScore) { best = media; bestScore = score; }
  });
  return bestScore >= 4 ? best : null;
}

export function tmdbCharacters(title, credits, perTitle) {
  const cast = (credits.cast ?? []).map(c => {
    if (title.media === 'movie') return { name: c.character, actor: c.name, photo: c.profile_path, creditId: c.credit_id, order: c.order ?? 999 };
    const role = [...(c.roles ?? [])].sort((a, b) => (b.episode_count ?? 0) - (a.episode_count ?? 0))[0] ?? {};
    return { name: role.character, actor: c.name, photo: c.profile_path, creditId: role.credit_id, order: c.order ?? 999 };
  }).sort((a, b) => a.order - b.order);
  const seen = new Set(), out = [];
  for (const c of cast) {
    const name = cleanCharacterName(c.name);
    if (!name || !c.creditId || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push({
      id: 'tmdb-credit-' + c.creditId, name, titleId: title.id, title: title.title,
      image: c.photo ? 'https://image.tmdb.org/t/p/w342' + c.photo : null, imageKind: 'actor',
      actor: c.actor || undefined, source: 'tmdb',
      sourceUrl: `https://www.themoviedb.org/${title.media}/${title.tmdbId}/cast`,
    });
    if (out.length >= perTitle) break;
  }
  return out;
}

export function anilistCharacters(title, media, perTitle) {
  const roles = { MAIN: 'Principal', SUPPORTING: 'Secondaire' };
  return (media.characters?.edges ?? [])
    .filter(e => e.node && roles[e.role] && cleanCharacterName(e.node.name?.full || e.node.name?.native))
    .slice(0, perTitle)
    .map(e => ({
      id: 'anilist-char-' + e.node.id, name: cleanCharacterName(e.node.name.full || e.node.name.native),
      nativeName: e.node.name.native || undefined, titleId: title.id, title: title.title,
      image: e.node.image?.large ?? null, imageKind: 'illustration', role: roles[e.role],
      source: 'anilist', sourceUrl: e.node.siteUrl,
    }));
}

/**
 * Fusionne l'index existant et les personnages fraîchement importés pour les œuvres `processed`.
 * Un personnage présent dans plusieurs œuvres (série et film, deux éditions) n'a qu'une entrée :
 * sa première œuvre dans `titleId`, les autres dans `alsoIn`.
 */
export function mergeIndex(previous, fresh, processed, titleNames) {
  const characters = [];
  for (const c of previous) {
    const titles = [c.titleId, ...(c.alsoIn ?? [])].filter(id => !processed.has(id));
    if (titles.length) characters.push({ ...c, titleId: titles[0], title: titleNames.get(titles[0]) ?? c.title, alsoIn: titles.slice(1) });
  }
  const byId = new Map(characters.map(c => [c.id, c]));
  let shared = 0;
  for (const c of fresh) {
    const existing = byId.get(c.id);
    if (!existing) { const entry = { ...c, alsoIn: [] }; byId.set(c.id, entry); characters.push(entry); continue; }
    if (existing.titleId !== c.titleId && !existing.alsoIn.includes(c.titleId)) { existing.alsoIn.push(c.titleId); shared++; }
  }
  for (const c of characters) if (!c.alsoIn.length) delete c.alsoIn;
  return { characters, shared };
}

/**
 * Une entrée par personnage, dans l'ordre du catalogue, pour faciliter la saisie.
 * Une entrée existante n'est jamais modifiée ; une entrée remplie dont le personnage
 * a disparu est conservée à la fin ; seules les entrées vides orphelines sont retirées.
 */
export function mergeTypings(existing, characters) {
  const filled = entry => [entry?.mbti, entry?.enneagramme, entry?.note].some(v => String(v ?? '').trim());
  const typings = {};
  let added = 0;
  for (const c of characters) {
    if (existing[c.id]) { typings[c.id] = existing[c.id]; continue; }
    typings[c.id] = { personnage: c.name, oeuvre: c.title, mbti: '', enneagramme: '', note: '' };
    added++;
  }
  let removed = 0;
  for (const [id, entry] of Object.entries(existing)) {
    if (typings[id]) continue;
    if (filled(entry)) typings[id] = entry; else removed++;
  }
  return { typings, added, removed };
}

function tmdbClient(key) {
  return async function get(route) {
    const url = new URL('https://api.themoviedb.org/3/' + route);
    url.search = new URLSearchParams({ api_key: key, language: 'fr-FR' });
    for (let attempt = 0; attempt < 4; attempt++) {
      let response;
      try { response = await fetch(url, { signal: AbortSignal.timeout(30000) }); }
      catch { if (attempt === 3) throw new Error('TMDB injoignable'); await sleep(1500); continue; }
      if (response.ok) return response.json();
      if (response.status === 429 || response.status >= 500) { await sleep(2000 * (attempt + 1)); continue; }
      throw new Error('TMDB a répondu HTTP ' + response.status);
    }
    throw new Error('TMDB indisponible');
  };
}

const MEDIA_FIELDS = `id siteUrl format startDate { year } title { romaji english native }
  characters(sort: [ROLE, RELEVANCE, ID], perPage: $per) { edges { role node { id siteUrl name { full native } image { large } } } }`;

async function anilist(query, variables) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(2200); // AniList accepte environ 30 requêtes par minute.
    let response;
    try {
      response = await fetch('https://graphql.anilist.co', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000),
      });
    } catch { if (attempt === 4) throw new Error('AniList injoignable'); continue; }
    if (response.status === 429) { await sleep((Number(response.headers.get('retry-after')) || 60) * 1000); continue; }
    if (response.status >= 500) { await sleep(3000 * (attempt + 1)); continue; }
    const body = await response.json();
    if (response.status === 404) return { data: null };
    if (!response.ok || body.errors) throw new Error('AniList : ' + (body.errors?.[0]?.message ?? 'HTTP ' + response.status));
    return body;
  }
  throw new Error('AniList indisponible');
}

async function findAnime(title, sources, perTitle) {
  const source = sources[title.id];
  if (source && source.anilistId === null) return null; // forcé sur TMDB
  if (source?.anilistId) {
    const body = await anilist(`query ($id: Int, $per: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`, { id: source.anilistId, per: perTitle });
    return body.data?.Media ?? null;
  }
  for (const search of [...new Set([title.originalTitle, title.title].filter(Boolean))]) {
    const body = await anilist(`query ($search: String, $per: Int) { Page(perPage: 6) { media(search: $search, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } } }`, { search, per: perTitle });
    const media = pickAnilistMatch(body.data?.Page?.media ?? [], title);
    if (media) return media;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => args.find(a => a.startsWith(name + '='))?.split('=').slice(1).join('=') ?? fallback;
  const only = opt('--only', '');
  const perTitle = Number(opt('--per-title', 10));
  if (!Number.isInteger(perTitle) || perTitle < 1 || perTitle > 25) throw new Error('--per-title doit être un entier entre 1 et 25.');

  const env = await fs.readFile(path.join(root, '.env.local'), 'utf8').catch(() => '');
  const key = process.env.TMDB_API_KEY || env.match(/^TMDB_API_KEY=["']?([^\s"']+)/m)?.[1];
  if (!key) throw new Error('TMDB_API_KEY est requis (variable d’environnement ou .env.local).');
  const tmdb = tmdbClient(key);

  const readJson = async (file, fallback) => {
    const text = await fs.readFile(file, 'utf8').catch(() => null);
    return text === null ? fallback : JSON.parse(text);
  };
  const catalog = await readJson(path.join(root, 'public/allflix/catalog.json'), { titles: [] });
  const titles = catalog.titles.filter(t => !only || t.id === only);
  if (only && !titles.length) throw new Error('Œuvre inconnue dans Allflix : ' + only);
  await fs.mkdir(OUT_DIR, { recursive: true });
  const index = await readJson(path.join(OUT_DIR, 'index.json'), { updatedAt: null, characters: [] });
  const sources = await readJson(path.join(OUT_DIR, 'sources.json'), {});
  const existingTypings = await readJson(path.join(OUT_DIR, 'typings.json'), {});

  const fresh = [], failed = new Map(), fallback = [];
  let fromTmdb = 0, fromAnilist = 0;
  for (const [i, title] of titles.entries()) {
    process.stdout.write(`[${i + 1}/${titles.length}] ${title.title} … `);
    try {
      let characters = [];
      if (title.anime) {
        const media = await findAnime(title, sources, perTitle);
        if (media) characters = anilistCharacters(title, media, perTitle);
        if (characters.length) { fromAnilist++; console.log(`AniList #${media.id} « ${media.title?.romaji ?? ''} », ${characters.length} personnages`); }
        else fallback.push(title.id);
      }
      if (!characters.length) {
        const credits = await tmdb(title.media === 'movie' ? `movie/${title.tmdbId}/credits` : `tv/${title.tmdbId}/aggregate_credits`);
        characters = tmdbCharacters(title, credits, perTitle);
        fromTmdb++;
        console.log(`TMDB, ${characters.length} personnages`);
      }
      fresh.push(...characters);
    } catch (error) {
      failed.set(title.id, error.message);
      console.log('échec : ' + error.message);
    }
  }

  // Une œuvre en échec garde ses personnages précédents.
  const processed = new Set(titles.map(t => t.id).filter(id => !failed.has(id)));
  const titleNames = new Map(catalog.titles.map(t => [t.id, t.title]));
  const { characters, shared } = mergeIndex(index.characters, fresh, processed, titleNames);
  const order = new Map(catalog.titles.map((t, i) => [t.id, i]));
  characters.sort((a, b) => (order.get(a.titleId) ?? 1e9) - (order.get(b.titleId) ?? 1e9));

  const { typings, added, removed } = mergeTypings(existingTypings, characters);
  await fs.writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify({ updatedAt: new Date().toISOString(), characters }) + '\n');
  await fs.writeFile(path.join(OUT_DIR, 'typings.json'), JSON.stringify(typings, null, 2) + '\n');

  const typed = Object.values(typings).filter(t => (t.mbti ?? '').trim() || (t.enneagramme ?? '').trim()).length;
  console.log('');
  console.log(`✓ ${characters.length} personnages (${fromTmdb} œuvres via TMDB, ${fromAnilist} via AniList).`);
  if (fallback.length) console.log(`  Animés sans correspondance AniList, importés via TMDB : ${fallback.join(', ')}`);
  if (shared) console.log(`  ${shared} personnage(s) partagé(s) entre plusieurs œuvres (une seule fiche, un seul typage).`);
  if (failed.size) console.log(`  Échecs (personnages précédents conservés) : ${[...failed].map(([id, m]) => `${id} (${m})`).join(', ')}`);
  console.log(`  typings.json : ${added} nouvelle(s) entrée(s), ${removed} entrée(s) vide(s) retirée(s), ${typed} personnage(s) typé(s).`);
  console.log('  Vérifier les typages saisis : npm run characters:check');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error('✗ ' + error.message); process.exitCode = 1; });
}
