// Lecture Allflix fournie par une API externe autorisée, appelée côté serveur pour que
// la clé ne soit jamais exposée au navigateur. Inactive tant que ALLFLIX_PLAYBACK_API_URL
// n'est pas définie dans les variables d'environnement Netlify. Contrat : docs/allflix.md.

const TYPES = new Set(['video', 'embed', 'link']);

/** Requête attendue : ?media=movie&tmdbId=155 ou ?media=tv&tmdbId=1396&s=1&e=2 */
export function parseQuery(params) {
  const media = params.get('media');
  const tmdbId = Number(params.get('tmdbId'));
  if (!['movie', 'tv'].includes(media) || !Number.isInteger(tmdbId) || tmdbId <= 0) return null;
  if (media === 'movie') return params.has('s') || params.has('e') ? null : { media, tmdbId };
  const season = Number(params.get('s')), episode = Number(params.get('e'));
  if (!params.has('s') || !params.has('e') || !Number.isInteger(season) || season < 0 || !Number.isInteger(episode) || episode < 1) return null;
  return { media, tmdbId, season, episode };
}

/** Réponse du fournisseur réduite à un lien ou un lecteur HTTPS sûr, sinon null. */
export function sanitizePlayback(payload) {
  if (!payload || !TYPES.has(payload.type) || typeof payload.url !== 'string') return null;
  let url;
  try { url = new URL(payload.url); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password) return null;
  const label = typeof payload.label === 'string' && payload.label.trim() ? payload.label.trim().slice(0, 80) : undefined;
  return label ? { type: payload.type, url: url.href, label } : { type: payload.type, url: url.href };
}

export async function resolvePlayback(params, env, fetchImpl = fetch) {
  const endpoint = env.ALLFLIX_PLAYBACK_API_URL;
  if (!endpoint) return { status: 404, body: { error: 'not_configured' } };
  const query = parseQuery(params);
  if (!query) return { status: 400, body: { error: 'invalid_request' } };
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (env.ALLFLIX_PLAYBACK_API_TOKEN) headers.Authorization = `Bearer ${env.ALLFLIX_PLAYBACK_API_TOKEN}`;
  let response;
  try {
    response = await fetchImpl(endpoint, { method: 'POST', headers, body: JSON.stringify(query), signal: AbortSignal.timeout(8000) });
  } catch {
    return { status: 502, body: { error: 'upstream_unreachable' } };
  }
  if (response.status === 404) return { status: 404, body: { error: 'not_available' } };
  if (!response.ok) return { status: 502, body: { error: 'upstream_error' } };
  const playback = sanitizePlayback(await response.json().catch(() => null));
  return playback ? { status: 200, body: playback } : { status: 502, body: { error: 'invalid_upstream_response' } };
}

export default async request => {
  const { status, body } = await resolvePlayback(new URL(request.url).searchParams, process.env);
  // Courte mise en cache CDN : les URL signées des fournisseurs expirent.
  const cdn = status === 200 ? 'public, s-maxage=300' : status === 404 ? 'public, s-maxage=900' : 'no-store';
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Netlify-CDN-Cache-Control': cdn,
      'Netlify-Vary': 'query=media|tmdbId|s|e',
    },
  });
};
