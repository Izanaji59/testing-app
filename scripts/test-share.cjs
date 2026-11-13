// Liens de partage : quête encodée dans l'URL, lien de défi, détection dans le tchat.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const m = { exports: {} };
new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/share.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m.exports, () => ({}));
const { encodeSharedQuest, decodeSharedQuest, questSharePath, challengeSharePath, findShareLink, shareMessage, SHARE_TITLE_MAX } = m.exports;

// Aller-retour, accents et emoji compris.
const q = { title: 'Réviser 30 min d’anglais 🇬🇧 — chapitre « été »', minutes: 30, tier: 'NOTABLE', stats: ['INTELLIGENCE', 'DISCIPLINE'] };
assert.deepEqual(decodeSharedQuest(encodeSharedQuest(q)), q);
assert.match(encodeSharedQuest(q), /^[A-Za-z0-9_-]+$/, 'code sûr dans une URL');

// Nettoyage : stats inconnues, RÉSIGNATION / REVENU ignorées, doublons, 2 maximum ; titre borné.
const cleaned = decodeSharedQuest(encodeSharedQuest({ title: '  a\n\tb  ', minutes: 45, tier: 'HARD', stats: ['RESIGNATION', 'REVENU', 'FORCE', 'FORCE', 'FOCUS', 'SOCIAL'] }));
assert.deepEqual(cleaned, { title: 'a b', minutes: 45, tier: 'HARD', stats: ['FORCE', 'FOCUS'] });
assert.equal(decodeSharedQuest(encodeSharedQuest({ ...q, title: 'x'.repeat(400) })).title.length, SHARE_TITLE_MAX);

// Liens abîmés ou trafiqués : refusés.
const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
for (const bad of [null, '', '%%%', 'abc', 'x'.repeat(800),
  enc({ v: 2, t: 'ok', m: 30, d: 1, s: [] }),
  enc({ v: 1, t: '   ', m: 30, d: 1, s: [] }),
  enc({ v: 1, t: 'ok', m: 3, d: 1, s: [] }),
  enc({ v: 1, t: 'ok', m: 500, d: 1, s: [] }),
  enc({ v: 1, t: 'ok', m: 30.5, d: 1, s: [] }),
  enc({ v: 1, t: 'ok', m: 30, d: 9, s: [] }),
  enc({ v: 1, t: 42, m: 30, d: 1, s: [] }),
]) assert.equal(decodeSharedQuest(bad), null, 'refusé : ' + String(bad).slice(0, 40));
assert.deepEqual(decodeSharedQuest(enc({ v: 1, t: 'ok', m: 30, d: 1, s: 'FORCE' })).stats, [], 'stats invalides → aucune');

// Détection dans le tchat, quel que soit le domaine ; chemin reconstruit (pas d'URL brute réutilisée).
const id = '0b6c1f9e-2f7a-4c1e-9d3b-5a8e7f6d4c21';
const qUrl = 'https://slumbywise.com' + questSharePath(q);
const fq = findShareLink('⚔ Quête à relever : ' + q.title + ' ' + qUrl);
assert.equal(fq.kind, 'quest'); assert.deepEqual(fq.quest, q); assert.equal(fq.raw, qUrl); assert.ok(fq.path.startsWith('/quests/?partage='));
const fc = findShareLink('Rejoins-moi https://grindleveling.netlify.app/defis/?defi=' + id.toUpperCase() + ' !');
assert.deepEqual([fc.kind, fc.id, fc.path], ['challenge', id, challengeSharePath(id)]);
assert.equal(findShareLink('https://evil.example/defis?defi=' + id).path, '/defis/?defi=' + id, 'domaine ignoré, chemin interne');
assert.equal(findShareLink('https://x.fr/defis/?defi=pas-un-uuid'), null);
assert.equal(findShareLink('https://x.fr/quests/?partage=abc'), null);
assert.equal(findShareLink('https://x.fr/autre/?defi=' + id), null);
assert.equal(findShareLink('salut tout le monde'), null);

// Message du tchat : 500 caractères maximum, le titre saute avant le lien.
const url = 'https://slumbywise.com' + questSharePath(q);
assert.equal(shareMessage('⚔ Quête', 'Titre', url), '⚔ Quête : Titre ' + url);
assert.equal(shareMessage('⚔ Quête', 'T'.repeat(480), url), '⚔ Quête ' + url);
assert.equal(shareMessage('⚔ Quête', 'T', 'https://a.fr/' + 'x'.repeat(600)), null);
const longest = 'https://grindleveling.netlify.app' + questSharePath({ title: 'é'.repeat(120), minutes: 240, tier: 'LEGENDARY', stats: ['INTELLIGENCE', 'DISCIPLINE'] });
assert.ok(shareMessage('⚔ Quête à relever', 'é'.repeat(120), longest).length <= 500, 'pire cas : tient dans un message (' + longest.length + ' car.)');

console.log('Share OK: aller-retour UTF-8, nettoyage, liens trafiqués refusés, détection tchat (chemin interne), limite de 500 caractères.');
