// Liens Allflix par tableur : lecture CSV, sources autorisées, clés série/épisode. Aucun appel réseau.
const assert = require('node:assert/strict'), path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const L = await import(pathToFileURL(path.join(__dirname, 'allflix-links.mjs')).href);

  // Excel français : « ; », BOM, CRLF, guillemets et retour à la ligne dans une cellule
  const rows = L.parseCsv('﻿id;titre;url;libelle\r\ntmdb-movie-155;"The Dark ""Knight""";https://www.netflix.com/title/1;"Sur\nNetflix"\r\n\r\n');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { line: 2, id: 'tmdb-movie-155', titre: 'The Dark "Knight"', url: 'https://www.netflix.com/title/1', libelle: 'Sur\nNetflix' });
  assert.equal(L.parseCsv('id,url\ntmdb-movie-1,https://vimeo.com/1\n')[0].url, 'https://vimeo.com/1');

  // Aller-retour export → import
  const back = L.parseCsv(L.toCsv([{ id: 'tmdb-tv-1', titre: 'A; B', lecture: 'link', url: 'https://www.themoviedb.org/tv/1/watch?locale=FR' }]));
  assert.equal(back[0].titre, 'A; B');

  // Domaines autorisés (sous-domaines inclus, HTTPS uniquement)
  const domains = ['netflix.com', 'themoviedb.org', 'youtube.com'];
  assert.ok(L.isAllowedUrl('https://www.netflix.com/title/1', domains));
  assert.ok(L.isAllowedUrl('https://themoviedb.org/movie/1/watch', domains));
  for (const bad of ['http://www.netflix.com/x', 'https://netflix.com.evil.example/x', 'https://evilnetflix.com/x', 'https://darlav.com/b/1', 'https://user:p@netflix.com/', 'pas une url'])
    assert.equal(L.isAllowedUrl(bad, domains), false, bad);

  // Construction de playback.json
  const titles = [{ id: 'tmdb-movie-155', media: 'movie' }, { id: 'tmdb-tv-1396', media: 'tv' }];
  const { entries, errors, skipped } = L.buildPlayback([
    { line: 2, id: 'tmdb-movie-155', lecture: 'link', url: 'https://www.themoviedb.org/movie/155/watch?locale=FR', libelle: 'Où regarder' },
    { line: 3, id: 'tmdb-tv-1396', lecture: '', url: 'https://www.netflix.com/title/70143836', libelle: '' },
    { line: 4, id: 'tmdb-tv-1396', lecture: 'embed', saison: '1', episode: '2', url: 'https://www.youtube.com/embed/abc' },
    { line: 5, id: 'tmdb-movie-155', url: '' },
    { line: 6, id: 'tmdb-movie-999', url: 'https://www.netflix.com/x' },
    { line: 7, id: 'tmdb-movie-155', url: 'https://darlav.com/72723a9/b/darlav/1' },
    { line: 8, id: 'tmdb-movie-155', saison: '1', episode: '1', url: 'https://www.netflix.com/x' },
    { line: 9, id: 'tmdb-tv-1396', saison: '1', url: 'https://www.netflix.com/x' },
    { line: 10, id: 'tmdb-movie-155', lecture: 'stream', url: 'https://www.netflix.com/x' },
  ], titles, domains);
  assert.deepEqual(entries, {
    'tmdb-movie-155': { type: 'link', url: 'https://www.themoviedb.org/movie/155/watch?locale=FR', label: 'Où regarder' },
    'tmdb-tv-1396': { type: 'link', url: 'https://www.netflix.com/title/70143836' },
    'tmdb-tv-1396:s1:e2': { type: 'embed', url: 'https://www.youtube.com/embed/abc' },
  });
  assert.equal(skipped, 1);
  assert.deepEqual(errors.map(e => e.split(' :')[0]), ['ligne 6', 'ligne 7', 'ligne 8', 'ligne 9', 'ligne 10']);

  // Ligne pré-remplie depuis TMDB / JustWatch
  const title = { id: 'tmdb-movie-155', title: 'The Dark Knight', media: 'movie', year: '2008' };
  const row = L.providerRow(title, { link: 'https://www.themoviedb.org/movie/155-x/watch?locale=FR', flatrate: [{ provider_name: 'Netflix' }], rent: [{ provider_name: 'Apple TV' }, { provider_name: 'Netflix' }] });
  assert.deepEqual([row.lecture, row.url, row.plateformes_fr], ['link', 'https://www.themoviedb.org/movie/155-x/watch?locale=FR', 'Netflix, Apple TV']);
  const none = L.providerRow(title, null);
  assert.deepEqual([none.lecture, none.url, none.plateformes_fr], ['', '', 'Aucune plateforme référencée en France']);
  console.log('Allflix links OK: CSV Excel (; , BOM, guillemets), aller-retour, domaines autorisés uniquement, clés œuvre / épisode, lignes refusées signalées.');
})().catch(e => { console.error(e); process.exitCode = 1; });
