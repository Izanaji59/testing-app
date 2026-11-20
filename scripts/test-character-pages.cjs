// Pages statiques des personnages : adresses lisibles et uniques, descriptions Google, catalogue réel.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const m = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/characterPages.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m.exports);
const { slugify, shortId, characterSlug, characterUrl, workSlugs, typeUrl, workUrl, characterDescription } = m.exports;

assert.equal(slugify('Lélouch Lamperouge !'), 'lelouch-lamperouge');
assert.equal(slugify('  Ça — Œuvre / Été 2026 '), 'ca-oeuvre-ete-2026');
assert.equal(slugify('ルド'), '');
assert.ok(slugify('a'.repeat(80)).length <= 60);
assert.equal(shortId('anilist-char-80'), 'a80');
assert.equal(shortId('tmdb-credit-52fe4250c3a36847f80149f3'), 't52fe4250c3');
assert.equal(shortId('community-char-0b6c1f9e-2f7a-4c1e-9d3b-5a8e7f6d4c21'), null);
assert.equal(characterSlug({ id: 'anilist-char-266433', name: 'Rudo' }), 'rudo-a266433');
assert.equal(characterSlug({ id: 'anilist-char-1', name: 'ルド' }), 'personnage-a1', 'nom non latin');
assert.equal(characterUrl({ id: 'anilist-char-80', name: 'Light Yagami' }), '/personnages/light-yagami-a80/');
assert.equal(characterUrl({ id: 'community-char-0b6c1f9e-2f7a-4c1e-9d3b-5a8e7f6d4c21', name: 'X' }), '/personnages/fiche/?id=community-char-0b6c1f9e-2f7a-4c1e-9d3b-5a8e7f6d4c21', 'communauté : fiche dynamique');
assert.equal(typeUrl('INTJ'), '/personnages/type/intj/');
assert.equal(workUrl('death-note'), '/personnages/oeuvre/death-note/');

// Œuvres homonymes : identifiant ajouté pour rester unique.
const ws = workSlugs([{ titleId: 'tmdb-tv-1', title: 'Death Note' }, { titleId: 'tmdb-movie-2', title: 'Death Note' }, { titleId: 'tmdb-tv-3', title: 'Naruto' }]);
assert.equal(ws.get('tmdb-tv-3'), 'naruto');
assert.notEqual(ws.get('tmdb-tv-1'), ws.get('tmdb-movie-2'));
assert.ok(ws.get('tmdb-tv-1').startsWith('death-note-'));

// Descriptions : 160 caractères maximum, type mentionné s'il existe.
assert.ok(characterDescription('Light Yagami', 'Death Note', 'INTJ', '5w4').includes('INTJ, ennéagramme 5w4'));
assert.ok(characterDescription('Light', 'Death Note', null, null).startsWith('Quel est le type MBTI de Light'));
assert.ok(characterDescription('N'.repeat(100), 'T'.repeat(100), 'INTJ', null).length <= 160);

// Catalogue réel : chaque personnage importé a une adresse unique ; chaque œuvre aussi.
const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/characters/index.json'), 'utf8'));
const slugs = index.characters.map(characterSlug).filter(Boolean);
assert.equal(slugs.length, index.characters.filter(c => c.source !== 'community').length, 'tous les importés ont une page');
assert.equal(new Set(slugs).size, slugs.length, 'adresses uniques');
assert.ok(slugs.every(s => /^[a-z0-9-]+$/.test(s)));
const works = [...new Map(index.characters.map(c => [c.titleId || 'titre:' + c.title, { titleId: c.titleId || 'titre:' + c.title, title: c.title }])).values()];
const wslugs = [...workSlugs(works).values()];
assert.equal(new Set(wslugs).size, works.length, 'œuvres uniques');
for (const c of index.characters) assert.ok(characterDescription(c.name, c.title, 'INTJ', '5w4').length <= 160, c.name);
console.log(`Character pages OK: ${slugs.length} personnages et ${works.length} œuvres avec des adresses uniques, slugs propres, descriptions ≤ 160 caractères.`);
