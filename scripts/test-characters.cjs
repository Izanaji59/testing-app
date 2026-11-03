// Personnages : logique de typage, import (sans réseau) et vérification des fichiers publiés.
// Aussi lancé par `npm run characters:check` après une saisie dans typings.json.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const { pathToFileURL } = require('node:url');
const root = path.join(__dirname, '..');
const mod = { exports: {} };
new Function('exports', 'module', ts.transpileModule(fs.readFileSync(path.join(root, 'lib/characters.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports, mod);
const L = mod.exports;

(async () => {
  // Typage éditorial
  assert.equal(L.normalizeMbti(' intj '), 'INTJ');
  for (const bad of ['INTJ-A', 'XNTP', 'INT', '']) assert.equal(L.normalizeMbti(bad), null, bad);
  for (const [raw, out] of [['5', '5'], ['5w4', '5w4'], [' 5W6 ', '5w6'], ['1w9', '1w9'], ['9w1', '9w1'], ['9w8', '9w8']]) assert.equal(L.normalizeEnneagram(raw), out, raw);
  for (const bad of ['5w7', '5w5', '10', 'w5', '0', '1w3']) assert.equal(L.normalizeEnneagram(bad), null, bad);
  assert.equal(L.readTyping({ mbti: '', enneagramme: '' }), null);
  assert.deepEqual(L.readTyping({ mbti: 'enfp', enneagramme: '7w6', note: ' Énergie ' }), { mbti: 'ENFP', enneagram: '7w6', note: 'Énergie' });
  assert.deepEqual(L.invalidTypings({ a: { mbti: 'INTJ-A' }, b: { mbti: 'INTJ', enneagramme: '5w4' }, c: { mbti: '', enneagramme: '5w7' }, d: {} }), ['a', 'c']);
  const typed = L.withTypings({ updatedAt: '', characters: [{ id: 'anilist-char-1' }, { id: 'anilist-char-2' }] }, { 'anilist-char-1': { mbti: 'INFJ' } });
  assert.equal(typed[0].typing.mbti, 'INFJ'); assert.equal(typed[1].typing, null);
  assert.ok(L.CHARACTER_ID.test('tmdb-credit-52fe4220c3a36847f80020bf') && L.CHARACTER_ID.test('anilist-char-40'));
  assert.ok(!L.CHARACTER_ID.test('anilist-char-1;alert(1)') && !L.CHARACTER_ID.test('../index'));

  // Import (fonctions pures, aucun appel réseau)
  const I = await import(pathToFileURL(path.join(root, 'scripts/import-characters.mjs')).href);
  assert.equal(I.cleanCharacterName('Woody (voice)'), 'Woody');
  assert.equal(I.cleanCharacterName('Himself'), '');
  const movie = { id: 'tmdb-movie-155', tmdbId: 155, media: 'movie', title: 'The Dark Knight', originalTitle: 'The Dark Knight', year: '2008' };
  const credits = { cast: [
    { character: 'Joker', name: 'Heath Ledger', profile_path: '/h.jpg', credit_id: 'bbbbbb', order: 1 },
    { character: 'Bruce Wayne / Batman', name: 'Christian Bale', profile_path: '/c.jpg', credit_id: 'aaaaaa', order: 0 },
    { character: 'Joker', name: 'Doublure', credit_id: 'cccccc', order: 2 },
    { character: 'Himself', name: 'X', credit_id: 'dddddd', order: 3 },
    { character: 'Sans identifiant', name: 'Y', order: 4 },
  ] };
  const m = I.tmdbCharacters(movie, credits, 10);
  assert.deepEqual(m.map(c => c.name), ['Bruce Wayne / Batman', 'Joker']);
  assert.equal(m[0].id, 'tmdb-credit-aaaaaa'); assert.equal(m[0].image, 'https://image.tmdb.org/t/p/w342/c.jpg'); assert.equal(m[0].imageKind, 'actor');
  assert.equal(I.tmdbCharacters(movie, credits, 1).length, 1);
  const tv = I.tmdbCharacters({ ...movie, id: 'tmdb-tv-1', media: 'tv' }, { cast: [{ name: 'Bryan Cranston', order: 0, roles: [{ character: 'Walter White', credit_id: 'eeeeee', episode_count: 62 }, { character: 'Heisenberg', credit_id: 'ffffff', episode_count: 2 }] }] }, 10);
  assert.deepEqual(tv.map(c => [c.name, c.id]), [['Walter White', 'tmdb-credit-eeeeee']]);

  const anime = { id: 'tmdb-movie-10494', media: 'movie', title: 'Perfect Blue', originalTitle: 'PERFECT BLUE', year: '1998' };
  const wrong = { id: 1, format: 'TV', startDate: { year: 2019 }, title: { romaji: 'Perfect Blue Days' } };
  const right = { id: 437, format: 'MOVIE', startDate: { year: 1998 }, title: { romaji: 'Perfect Blue', native: 'パーフェクトブルー' } };
  assert.equal(I.pickAnilistMatch([wrong, right], anime).id, 437);
  assert.equal(I.pickAnilistMatch([wrong], anime), null, 'aucune correspondance sûre');
  const chars = I.anilistCharacters(anime, { characters: { edges: [
    { role: 'MAIN', node: { id: 2, siteUrl: 'https://anilist.co/character/2', name: { full: 'Mima Kirigoe', native: '霧越未麻' }, image: { large: 'https://img/2.png' } } },
    { role: 'BACKGROUND', node: { id: 3, name: { full: 'Passant' } } },
    { role: 'SUPPORTING', node: { id: 4, name: { full: 'Rumi' }, image: {} } },
  ] } }, 10);
  assert.deepEqual(chars.map(c => [c.id, c.role, c.imageKind]), [['anilist-char-2', 'Principal', 'illustration'], ['anilist-char-4', 'Secondaire', 'illustration']]);

  assert.equal(I.anilistCharacters(anime, { characters: { edges: [{ role: 'MAIN', node: { id: 9, name: { full: 'Narrator' } } }] } }, 10).length, 0, 'le narrateur n’est pas un personnage');

  // Personnage partagé entre une série et son film : une seule fiche, deux œuvres.
  const names = new Map([['t-serie', 'Série'], ['t-film', 'Film'], ['t-autre', 'Autre']]);
  const tanjiro = (titleId) => ({ id: 'anilist-char-7', name: 'Tanjirou', titleId, title: names.get(titleId) });
  let merged = I.mergeIndex([], [tanjiro('t-serie'), tanjiro('t-film')], new Set(['t-serie', 't-film']), names);
  assert.equal(merged.characters.length, 1); assert.deepEqual(merged.characters[0].alsoIn, ['t-film']); assert.equal(merged.shared, 1);
  merged = I.mergeIndex(merged.characters, [], new Set(['t-serie']), names);
  assert.deepEqual([merged.characters[0].titleId, merged.characters[0].title, merged.characters[0].alsoIn], ['t-film', 'Film', undefined], 'ré-import d’une seule œuvre : le personnage reste rattaché à l’autre');
  merged = I.mergeIndex([{ ...tanjiro('t-autre') }], [tanjiro('t-serie')], new Set(['t-serie']), names);
  assert.deepEqual(merged.characters.map(c => [c.titleId, c.alsoIn]), [['t-autre', ['t-serie']]]);

  const { typings, added, removed } = I.mergeTypings({
    'anilist-char-2': { personnage: 'Mima', mbti: 'INFP', enneagramme: '4w5', note: 'saisi' },
    'tmdb-credit-orphelin-vide': { personnage: 'Ancien', mbti: '', enneagramme: '', note: '' },
    'tmdb-credit-orphelin-rempli': { personnage: 'Ancien typé', mbti: 'ESTP', enneagramme: '', note: '' },
  }, chars);
  assert.equal(added, 1); assert.equal(removed, 1);
  assert.deepEqual(Object.keys(typings), ['anilist-char-2', 'anilist-char-4', 'tmdb-credit-orphelin-rempli'], 'ordre du catalogue, typage orphelin conservé à la fin');
  assert.deepEqual(typings['anilist-char-2'], { personnage: 'Mima', mbti: 'INFP', enneagramme: '4w5', note: 'saisi' }, 'un typage saisi n’est jamais modifié');
  assert.deepEqual(typings['anilist-char-4'], { personnage: 'Rumi', oeuvre: 'Perfect Blue', mbti: '', enneagramme: '', note: '' });

  // Fichiers publiés
  const dir = path.join(root, 'public/characters');
  if (fs.existsSync(path.join(dir, 'index.json'))) {
    const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
    const ids = index.characters.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length, 'identifiants de personnages uniques');
    for (const id of ids) assert.ok(L.CHARACTER_ID.test(id), 'identifiant invalide : ' + id);
    const file = JSON.parse(fs.readFileSync(path.join(dir, 'typings.json'), 'utf8'));
    const bad = L.invalidTypings(file);
    if (bad.length) {
      console.error('Typages mal écrits (attendu : MBTI en 4 lettres, ennéagramme « 5 » ou « 5w4 ») :');
      for (const id of bad) console.error(`  - ${file[id].personnage ?? id} (${file[id].oeuvre ?? ''}) : mbti « ${file[id].mbti ?? ''} », enneagramme « ${file[id].enneagramme ?? ''} »`);
      process.exitCode = 1;
      return;
    }
    const filled = Object.values(file).filter(t => L.readTyping(t)).length;
    console.log(`Fichiers OK : ${ids.length} personnages, ${filled} typés.`);
  }
  console.log('Characters OK: MBTI/ennéagramme, typages invalides signalés, import TMDB/AniList (noms, doublons, correspondances), typages saisis préservés.');
})().catch(e => { console.error(e); process.exitCode = 1; });
