// Échelle adaptative du radar des statistiques.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const m = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/engine/radar.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m.exports);
const { radarScale } = m.exports;

assert.equal(radarScale([2, 3, 2, 1, 1, 1, 3, 1, 1, 1, 3]), 5, 'rang E : niveaux 1 à 3 → échelle 5');
assert.equal(radarScale([1, 1, 1]), 5);
assert.equal(radarScale([4]), 5);
assert.equal(radarScale([5]), 10, 'marge de 25 % : 5 → 6,25 → palier 10');
assert.equal(radarScale([12, 3]), 15);
assert.equal(radarScale([40]), 50);
assert.equal(radarScale([80]), 100);
assert.equal(radarScale([130]), 200);
assert.equal(radarScale([]), 5);
assert.equal(radarScale([NaN, 2]), 5);
// La meilleure stat n'atteint jamais le bord : il reste de la place pour progresser.
for (let lv = 1; lv <= 150; lv++) assert.ok(lv / radarScale([lv]) <= 0.8 + 1e-9, 'niveau ' + lv);
console.log('Stat radar OK: échelle 5 au rang E, paliers, marge de 25 %, entrées vides ou invalides.');
