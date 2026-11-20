// Vote rapide des personnages : axes MBTI, clavier, ennéagramme et ailes, consensus, marathon.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const m = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/engine/fictionVote.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(m.exports);
const { axesFromType, typeFromAxes, axesWithKey, wingsOf, validEnneagram, splitEnneagram, joinEnneagram, consensusOf, share, nextToVote, EMPTY_AXES } = m.exports;

// Axes ↔ type.
assert.deepEqual(axesFromType('intj'), ['I', 'N', 'T', 'J']);
assert.deepEqual(axesFromType('ESFP'), ['E', 'S', 'F', 'P']);
assert.deepEqual(axesFromType('INTX'), ['', '', '', '']);
assert.deepEqual(axesFromType(null), ['', '', '', '']);
assert.equal(typeFromAxes(['I', 'N', 'T', 'J']), 'INTJ');
assert.equal(typeFromAxes(['I', '', 'T', 'J']), null);

// Clavier : chaque lettre règle son axe, la même lettre le libère, les autres touches sont ignorées.
let axes = [...EMPTY_AXES];
for (const k of ['e', 'n', 'f', 'p']) axes = axesWithKey(axes, k);
assert.equal(typeFromAxes(axes), 'ENFP');
axes = axesWithKey(axes, 'i'); assert.equal(typeFromAxes(axes), 'INFP');
axes = axesWithKey(axes, 'P'); assert.deepEqual(axes, ['I', 'N', 'F', '']);
assert.equal(axesWithKey(axes, 'x'), null); assert.equal(axesWithKey(axes, 'Enter'), null);

// Ennéagramme : ailes adjacentes, 1 et 9 voisins (mêmes règles que f_valid_enneagram).
assert.deepEqual(wingsOf(1), [9, 2]); assert.deepEqual(wingsOf(9), [8, 1]); assert.deepEqual(wingsOf(5), [4, 6]);
for (const ok of ['4', '4w5', '4w3', '1w9', '9w1', '9w8']) assert.equal(validEnneagram(ok), true, ok);
for (const ko of ['4w6', '4w4', '2w8', '10', 'w5', '', null]) assert.equal(validEnneagram(ko), false, String(ko));
assert.deepEqual(splitEnneagram('6w7'), { core: 6, wing: 7 }); assert.deepEqual(splitEnneagram('x'), { core: null, wing: null });
assert.equal(joinEnneagram(6, 7), '6w7'); assert.equal(joinEnneagram(6, 9), '6', 'aile non voisine ignorée'); assert.equal(joinEnneagram(null, 7), null);

// Consensus et votes serrés.
assert.equal(consensusOf(undefined), null);
assert.equal(consensusOf({ counts: { INTJ: 3 }, total: 3, leader: 'INTJ' }), null, 'trop peu de votes');
assert.equal(consensusOf({ counts: { INTJ: 4, ENTJ: 1 }, total: 5, leader: 'INTJ' }), 'consensus');
assert.equal(consensusOf({ counts: { INTJ: 3, ENTJ: 2, INTP: 1 }, total: 6, leader: 'INTJ' }), 'serre');
assert.equal(consensusOf({ counts: { INTJ: 2, ENTJ: 2 }, total: 4, leader: null }), 'serre');
assert.equal(consensusOf({ counts: { INTJ: 3, ENTJ: 1, INTP: 1, ISTJ: 1 }, total: 6, leader: 'INTJ' }), null, '50 % pile, écart de 2');
assert.equal(share(1, 3), 33); assert.equal(share(0, 0), 0);

// Marathon : prochain personnage non voté de l'œuvre, en reprenant après le courant.
const ids = ['a', 'b', 'c', 'd'];
assert.equal(nextToVote(ids, 'b', new Set()), 'c');
assert.equal(nextToVote(ids, 'b', new Set(['c'])), 'd');
assert.equal(nextToVote(ids, 'd', new Set(['b'])), 'a', 'reprend au début');
assert.equal(nextToVote(ids, 'a', new Set(['b', 'c', 'd'])), 'b', 'tout est voté : simplement le suivant');
assert.equal(nextToVote(['a'], 'a', new Set()), null);
console.log('Fiction vote OK: 4 axes et clavier, ennéagramme et ailes adjacentes, consensus / vote serré, marathon.');
