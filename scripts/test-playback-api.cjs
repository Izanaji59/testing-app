// API de lecture Allflix (fonction Netlify) : validation, sécurité et repli. Aucun appel réseau.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { pathToFileURL } = require('node:url');
const root = path.join(__dirname, '..');
const types = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(root, 'lib/allflix/types.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(types.exports);

(async () => {
  const F = await import(pathToFileURL(path.join(root, 'netlify/functions/playback.mjs')).href);
  const q = s => new URLSearchParams(s);

  // URL construite par la fiche
  const movie = { id: 'tmdb-movie-155', tmdbId: 155, media: 'movie' }, tv = { id: 'tmdb-tv-1396', tmdbId: 1396, media: 'tv' };
  assert.equal(types.exports.playbackApiUrl(movie), '/.netlify/functions/playback?media=movie&tmdbId=155');
  assert.equal(types.exports.playbackApiUrl(tv, 1, 2), '/.netlify/functions/playback?media=tv&tmdbId=1396&s=1&e=2');
  assert.equal(types.exports.playbackApiUrl(tv), null);

  // Requêtes acceptées / refusées
  assert.deepEqual(F.parseQuery(q('media=movie&tmdbId=155')), { media: 'movie', tmdbId: 155 });
  assert.deepEqual(F.parseQuery(q('media=tv&tmdbId=1396&s=0&e=1')), { media: 'tv', tmdbId: 1396, season: 0, episode: 1 });
  for (const bad of ['media=movie&tmdbId=0', 'media=movie&tmdbId=1.5', 'media=game&tmdbId=1', 'media=movie&tmdbId=155&s=1', 'media=tv&tmdbId=1', 'media=tv&tmdbId=1&s=1&e=0', 'media=tv&tmdbId=1&s=-1&e=1'])
    assert.equal(F.parseQuery(q(bad)), null, bad);

  // Réponses du fournisseur
  assert.deepEqual(F.sanitizePlayback({ type: 'embed', url: 'https://player.example.com/e/1', label: '  Regarder  ' }), { type: 'embed', url: 'https://player.example.com/e/1', label: 'Regarder' });
  for (const bad of [null, { type: 'video', url: 'http://cdn.example.com/a.mp4' }, { type: 'video', url: 'javascript:alert(1)' }, { type: 'iframe', url: 'https://x.example' }, { type: 'link', url: 'https://user:pass@x.example' }, { type: 'link' }])
    assert.equal(F.sanitizePlayback(bad), null, JSON.stringify(bad));

  // Non configurée : 404, aucun appel sortant
  let calls = 0;
  const never = async () => { calls++; throw new Error('ne doit pas être appelé'); };
  assert.deepEqual(await F.resolvePlayback(q('media=movie&tmdbId=155'), {}, never), { status: 404, body: { error: 'not_configured' } });
  assert.equal((await F.resolvePlayback(q('media=movie&tmdbId=abc'), { ALLFLIX_PLAYBACK_API_URL: 'https://api.example.com/resolve' }, never)).status, 400);
  assert.equal(calls, 0);

  // Configurée : clé envoyée au fournisseur, jamais renvoyée au navigateur
  const env = { ALLFLIX_PLAYBACK_API_URL: 'https://api.example.com/resolve', ALLFLIX_PLAYBACK_API_TOKEN: 'secret-token' };
  let seen;
  const ok = async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ type: 'video', url: 'https://cdn.example.com/155.mp4' }) }; };
  const result = await F.resolvePlayback(q('media=tv&tmdbId=1396&s=1&e=2'), env, ok);
  assert.deepEqual(result, { status: 200, body: { type: 'video', url: 'https://cdn.example.com/155.mp4' } });
  assert.equal(seen.url, env.ALLFLIX_PLAYBACK_API_URL);
  assert.equal(seen.init.headers.Authorization, 'Bearer secret-token');
  assert.deepEqual(JSON.parse(seen.init.body), { media: 'tv', tmdbId: 1396, season: 1, episode: 2 });
  assert.ok(!JSON.stringify(result).includes('secret-token'));

  const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
  assert.deepEqual(await F.resolvePlayback(q('media=movie&tmdbId=155'), env, reply(404, {})), { status: 404, body: { error: 'not_available' } });
  assert.equal((await F.resolvePlayback(q('media=movie&tmdbId=155'), env, reply(500, {}))).status, 502);
  assert.equal((await F.resolvePlayback(q('media=movie&tmdbId=155'), env, reply(200, { type: 'video', url: 'http://insecure.example/a.mp4' }))).status, 502);
  assert.equal((await F.resolvePlayback(q('media=movie&tmdbId=155'), env, async () => { throw new Error('timeout'); })).status, 502);

  // Gestionnaire Netlify complet
  const response = await F.default(new Request('https://site.example/.netlify/functions/playback?media=movie&tmdbId=155'));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  console.log('Playback API OK: URL de la fiche, requêtes validées, réponses HTTPS seulement, clé jamais exposée, repli sans configuration.');
})().catch(e => { console.error(e); process.exitCode = 1; });
