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
console.log('Deadline selection OK: local offsets, unfinished dated tasks, no estimated-time penalty, one review per deadline.');
