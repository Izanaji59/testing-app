// Bilan du jour (/cmd) et modèles de projets (/donjon).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const load = file => {
  const m = { exports: {} };
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m.exports, () => ({}));
  return m.exports;
};
const { alertLevel, idleDays, completedToday, hoursBeforeMidnight } = load('lib/engine/dailyCheck.ts');
const { PROJECT_TEMPLATES } = load('lib/engine/projectTemplates.ts');

// Niveau d'alerte selon l'heure, tant que rien n'est accompli.
assert.equal(alertLevel(0, 9), 'calm');
assert.equal(alertLevel(0, 11), 'calm');
assert.equal(alertLevel(0, 12), 'warn');
assert.equal(alertLevel(0, 17), 'warn');
assert.equal(alertLevel(0, 18), 'danger');
assert.equal(alertLevel(0, 23), 'danger');
for (const h of [0, 9, 15, 22]) assert.equal(alertLevel(1, h), 'done', 'une quête validée suffit à ' + h + ' h');

// Journée locale et inactivité.
const now = new Date(2026, 10, 13, 19, 30);
const at = (d, h) => new Date(2026, 10, d, h).toISOString();
const quests = [
  { status: 'COMPLETED', completed_at: at(10, 8) },
  { status: 'COMPLETED', completed_at: at(11, 22) },
  { status: 'PENDING', completed_at: null },
  { status: 'SKIPPED', completed_at: at(13, 9) },
  { status: 'COMPLETED', completed_at: 'pas une date' },
];
assert.equal(idleDays(quests, now), 2, 'dernière validation le 11 → 2 jours pleins');
assert.equal(idleDays([], now), null);
assert.equal(idleDays([{ status: 'COMPLETED', completed_at: at(13, 0) }], now), 0);
assert.equal(completedToday(quests, now).length, 0, 'une quête abandonnée ne valide pas la journée');
assert.equal(completedToday([...quests, { status: 'COMPLETED', completed_at: at(13, 7) }], now).length, 1);
assert.equal(hoursBeforeMidnight(now), 5);
assert.equal(hoursBeforeMidnight(new Date(2026, 10, 13, 23, 59)), 1);

// Modèles de projets : valeurs acceptées par la base (types, paliers, durées).
const TYPES = ['OPERATION', 'CAMPAIGN', 'RAID', 'DUNGEON', 'BOSS'];
const TIERS = ['TRIVIAL', 'ROUTINE', 'NOTABLE', 'HARD', 'LEGENDARY'];
const STATS = ['DISCIPLINE', 'FOCUS', 'INTELLIGENCE', 'CREATIVITY', 'LEADERSHIP', 'FORCE', 'MENTALITE', 'TECHNIQUE', 'SOCIAL', 'REVENU'];
const ids = new Set();
assert.ok(PROJECT_TEMPLATES.length >= 5);
assert.ok(PROJECT_TEMPLATES.some(t => t.domain === 'Santé'), 'au moins un modèle santé');
for (const t of PROJECT_TEMPLATES) {
  assert.ok(!ids.has(t.id), 'id unique ' + t.id); ids.add(t.id);
  assert.ok(TYPES.includes(t.type), t.id + ' type');
  assert.ok(TIERS.includes(t.difficulty), t.id + ' difficulté');
  assert.ok(STATS.includes(t.stat), t.id + ' stat');
  assert.ok(t.days === null || (Number.isInteger(t.days) && t.days > 0 && t.days <= 365), t.id + ' durée');
  assert.ok(t.title.length >= 3 && t.title.length <= 80, t.id + ' titre');
  assert.ok(t.quests.length >= 2 && t.quests.length <= 6, t.id + ' quêtes');
  for (const q of t.quests) {
    assert.ok(q.title.length >= 3 && q.title.length <= 120, q.title);
    assert.ok(Number.isInteger(q.minutes) && q.minutes >= 5 && q.minutes <= 240, q.title + ' minutes');
    assert.ok(TIERS.includes(q.tier), q.title + ' palier');
  }
}
console.log(`Daily check OK: alertes matin/après-midi/soir, inactivité, journée locale ; ${PROJECT_TEMPLATES.length} modèles de projets valides.`);
