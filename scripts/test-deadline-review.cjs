const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const mod = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/quest-review.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod.exports);
const { pendingDeadlineReviews, deadlineKey } = mod.exports;
const now = Date.parse('2026-10-14T18:00:00Z');
const quests = [
  { id: 'late', status: 'PENDING', due_at: '2026-10-14T19:00:00+02:00' },
  { id: 'future', status: 'PENDING', due_at: '2026-10-14T23:59:59+02:00' },
  { id: 'done', status: 'COMPLETED', due_at: '2026-10-13T20:00:00Z' },
  { id: 'undated', status: 'PENDING', due_at: null, estimated_minutes: 5 },
  { id: 'invalid', status: 'PENDING', due_at: 'invalid' },
];
assert.deepEqual(pendingDeadlineReviews(quests, [], now).map(q => q.id), ['late']);
assert.deepEqual(pendingDeadlineReviews(quests, [{ quest_id: 'late', due_at: '2026-10-14T17:00:00Z' }], now), []);
assert.equal(deadlineKey('late', quests[0].due_at), deadlineKey('late', '2026-10-14T17:00:00.000Z'));
assert.equal(pendingDeadlineReviews([{ ...quests[0], due_at: '2026-10-14T17:30:00Z' }], [{ quest_id: 'late', due_at: quests[0].due_at }], now).length, 1);
assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '../hooks/useQuests.ts'), 'utf8'), /rpc\(['"]cron_expire/);

// Mission démarrée un jour précédent, toujours en cours : un bilan par journée.
const { pendingStartedReviews, startOfLocalDay } = mod.exports;
const dayEnd = startOfLocalDay(now);
const iso = ms => new Date(ms).toISOString();
assert.equal(new Date(dayEnd).getHours(), 0);
const started = [
  { id: 'started-yesterday', status: 'IN_PROGRESS', starts_at: iso(dayEnd - 3600000), due_at: null },
  { id: 'started-today', status: 'IN_PROGRESS', starts_at: iso(dayEnd + 60000), due_at: null },
  { id: 'pending-old', status: 'PENDING', starts_at: null, due_at: null },
  { id: 'done-old', status: 'COMPLETED', starts_at: iso(dayEnd - 86400000), due_at: null },
  { id: 'no-start', status: 'IN_PROGRESS', starts_at: null, due_at: null },
  { id: 'dated-late', status: 'IN_PROGRESS', starts_at: iso(dayEnd - 86400000), due_at: iso(dayEnd - 1) },
  { id: 'dated-future', status: 'IN_PROGRESS', starts_at: iso(dayEnd - 86400000), due_at: iso(dayEnd + 86400000) },
];
assert.deepEqual(pendingStartedReviews(started, [], now).map(q => q.id), ['started-yesterday']);
assert.deepEqual(pendingStartedReviews(started, [{ quest_id: 'started-yesterday', due_at: iso(dayEnd + 2 * 3600000), amount: 0, kind: 'started_day' }], now), [], 'une réponse du même jour, autre fuseau, couvre la journée');
assert.deepEqual(pendingStartedReviews(started, [{ quest_id: 'started-yesterday', due_at: iso(dayEnd - 86400000), amount: 35, kind: 'started_day' }], now).map(q => q.id), ['started-yesterday'], 'la réponse de la veille ne couvre pas aujourd’hui');
assert.deepEqual(pendingStartedReviews(started, [{ quest_id: 'started-yesterday', due_at: iso(dayEnd), amount: 0, kind: 'deadline' }], now), [], 'un bilan au même instant compte');
console.log('Deadline selection OK: local offsets, unfinished dated tasks, no estimated-time penalty, one review per deadline, started missions reviewed once per day.');
