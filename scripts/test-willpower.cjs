// Réservoir de volonté (lib/engine/willpower.ts) et stats à difficulté (lib/engine/statTiers.ts).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
const load = file => {
  const m = { exports: {} };
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(m.exports, () => ({}));
  return m.exports;
};
const W = load('lib/engine/willpower.ts');
const S = load('lib/engine/statTiers.ts');
const B = load('lib/engine/socialBattery.ts');
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.01, `${msg ?? ''} ${a} ≈ ${b}`);

const now = new Date(2026, 10, 14, 15, 0);
const at = (d, h, m = 0) => new Date(2026, 10, d, h, m).toISOString();
const run = (x) => W.computeWillpower({ quests: [], sessions: [], events: [], now, ...x });

// Sans rien : le sommeil remonte la jauge, mais pas au-delà de 60 %.
let w = run({});
assert.deepEqual([w.level, w.state], [60, 'stable']);
assert.equal(w.morning, false);

// Une journée : scroll au réveil jugé vidant (coûte double), effort d'une quête, distractions, rencontre ressourçante.
w = run({
  events: [
    { id: '1', kind: 'DOPAMINE', activity: 'SCROLL', minutes: 30, occurred_at: at(14, 8) },
    { id: '2', kind: 'RECHARGE', activity: 'RENCONTRE', minutes: 90, occurred_at: at(14, 13) },
  ],
  quests: [{ status: 'COMPLETED', difficulty_tier: 'NOTABLE', estimated_minutes: 60, completed_at: at(14, 10), reward_stats: ['FOCUS'], stat_tiers: null }],
  sessions: [{ ended_at: at(14, 11), interruptions: 2 }],
});
// 60 − 30 (scroll ×2 : 24 + attention 6) − 9 (effort) − 6 (distractions) + 27 (rencontre) = 42
assert.equal(w.level, 42);
assert.equal(w.state, 'stable');
assert.deepEqual(w.today, { recharge: 27, drain: 30, method: false, morningDrain: true });
assert.match(W.willpowerAdvice(w)[0], /double le matin/);
// Le même scroll l'après-midi coûte moitié moins.
assert.equal(run({ events: [{ id: '1', kind: 'DOPAMINE', activity: 'SCROLL', minutes: 30, occurred_at: at(14, 14) }] }).level, 45);

// C'est le joueur qui juge. Une partie de LoL appréciée reste prenante : elle rend 9 mais consomme 12.
assert.equal(run({ events: [{ id: 'l', kind: 'RECHARGE', activity: 'JEU_VIDEO', minutes: 60, occurred_at: at(14, 14) }] }).level, 57);
// Cinq heures d'échecs : ressourçantes (rendement décroissant au-delà d'1 h 30) ou vidantes.
assert.equal(run({ events: [{ id: 'c', kind: 'RECHARGE', activity: 'ECHECS', minutes: 300, occurred_at: at(14, 14) }] }).level, 67);
assert.equal(run({ events: [{ id: 'c', kind: 'DOPAMINE', activity: 'ECHECS', minutes: 300, occurred_at: at(14, 14) }] }).level, 0);
// Une bonne distraction (marche, lecture) ne coûte rien et recharge pleinement.
close(W.distractionImpact({ kind: 'RECHARGE', activity: 'MARCHE', minutes: 60 }, false).recharge, 18);
assert.equal(W.distractionImpact({ kind: 'RECHARGE', activity: 'LECTURE', minutes: 60 }, true).cost, 0);
close(W.restfulMinutes(300), 90 + 0.3 * 210);
assert.equal(W.distractionImpact({ kind: 'RECHARGE', activity: 'INCONNU', minutes: 10 }, false).recharge, 1.5, 'activité inconnue = « Autre »');

// Recharges plafonnées à 60 par jour ; au-dessus de 60 %, la nuit ne retire rien.
w = run({ events: [
  { id: 'a', kind: 'RECHARGE', activity: 'AVENTURE', minutes: 240, occurred_at: at(13, 10) },
  { id: 'b', kind: 'RECHARGE', activity: 'NATURE', minutes: 240, occurred_at: at(13, 16) },
] });
assert.equal(w.level, 100, 'hier : 60 + 54 + 6 (plafond du jour), puis la nuit ne retire rien');
assert.equal(w.today.recharge, 0);
assert.equal(w.state, 'charge');

// Quêtes Social et Aguerrissement : elles rechargent au lieu de vider.
assert.deepEqual(W.questImpact({ status: 'COMPLETED', difficulty_tier: 'NOTABLE', estimated_minutes: 60, completed_at: null, reward_stats: ['SOCIAL'], stat_tiers: { SOCIAL: 'NOTABLE' } }), { effort: 0, recharge: 12, social: 12 });
const mixed = W.questImpact({ status: 'COMPLETED', difficulty_tier: 'HARD', estimated_minutes: 100, completed_at: null, reward_stats: null, stat_tiers: { FOCUS: 'NOTABLE', AGUERRISSEMENT: 'HARD' } });
close(mixed.recharge, 100 * 0.35 * 1.25 * 180 / 260, 'recharge aguerrissement');
close(mixed.effort, 100 * 0.25 * 80 / 260, 'effort focus');
assert.deepEqual(W.questImpact({ status: 'COMPLETED', difficulty_tier: 'HARD', estimated_minutes: 40, completed_at: null, reward_stats: ['DISCIPLINE'], stat_tiers: null }), { effort: 10, recharge: 0, social: 0 });

// Méthode 20/20/20 : à l'aube +15, plus tard +6 ; elle éteint le conseil du matin.
assert.equal(run({ events: [{ id: 'r', kind: 'RITUAL', activity: 'RITUEL_202020', minutes: 60, occurred_at: at(14, 7) }] }).level, 75);
assert.equal(run({ events: [{ id: 'r', kind: 'RITUAL', activity: 'RITUEL_202020', minutes: 60, occurred_at: at(14, 12) }] }).level, 66);
const dawn = new Date(2026, 10, 14, 7, 30);
const early = W.computeWillpower({ quests: [], sessions: [], events: [], now: dawn });
assert.equal(early.morning, true);
assert.match(W.willpowerAdvice(early)[0], /méthode 20\/20\/20/);
const methodDone = W.computeWillpower({ quests: [], sessions: [], events: [{ id: 'r', kind: 'RITUAL', activity: 'RITUEL_202020', minutes: 60, occurred_at: at(14, 6) }], now: dawn });
assert.equal(methodDone.today.method, true);
assert.ok(!W.willpowerAdvice(methodDone).some(t => /20\/20\/20/.test(t)));

// Bornes : 0 à 100, hors fenêtre ignoré, état à sec, conseil de recharge.
w = run({ events: [{ id: 'd', kind: 'DOPAMINE', activity: 'VIDEO', minutes: 300, occurred_at: at(14, 9) }] });
assert.deepEqual([w.level, w.state], [0, 'vide']);
assert.match(W.willpowerAdvice(w).at(-1), /Einstein/);
assert.equal(run({ events: [{ id: 'o', kind: 'RECHARGE', activity: 'AVENTURE', minutes: 240, occurred_at: new Date(2026, 9, 31, 9).toISOString() }] }).level, 60, 'il y a 14 jours : hors fenêtre');
for (const [k, a] of Object.entries(W.ACTIVITIES)) { assert.ok(a.label && W.GROUPS[a.group] && a.recharge > 0, k); assert.ok(a.group !== 'saine' || a.attention === 0, k + ' : une bonne distraction ne coûte rien'); }
assert.ok(['LECTURE', 'MARCHE', 'SPORT'].every(k => W.ACTIVITIES[k].group === 'saine'));
assert.equal(W.ACTIVITIES.SCROLL.group, 'piege');

// Batterie sociale : profil déduit du MBTI, effets selon le profil, ressenti, isolement, lien avec la volonté.
assert.deepEqual(B.socialProfileOf(null, 'INTJ'), { profile: 'INTROVERTI', fromMbti: true });
assert.deepEqual(B.socialProfileOf(null, 'enfp'), { profile: 'EXTRAVERTI', fromMbti: true });
assert.deepEqual(B.socialProfileOf('AMBIVERTI', 'INTJ'), { profile: 'AMBIVERTI', fromMbti: false });
assert.deepEqual(B.socialProfileOf(null, null), { profile: 'AMBIVERTI', fromMbti: false });
assert.equal(B.socialDelta('INTROVERTI', 'RENCONTRE', 90), -36);
assert.equal(B.socialDelta('INTROVERTI', 'NETWORKING', 60), -30);
close(B.socialDelta('EXTRAVERTI', 'NETWORKING', 60), 18);
close(B.socialDelta('AMBIVERTI', 'RENCONTRE', 60), 9);
close(B.socialDelta('AMBIVERTI', 'RENCONTRE', 120), -6, 'trop de monde vide aussi un ambiverti');
assert.equal(B.questSocialMinutes({ status: 'COMPLETED', difficulty_tier: 'NOTABLE', estimated_minutes: 60, completed_at: null, reward_stats: null, stat_tiers: { SOCIAL: 'NOTABLE', FOCUS: 'NOTABLE' } }), 30);
const sb = (profile, events, quests = []) => B.computeSocialBattery({ profile, events, quests, now });
// Introverti : une soirée vide la batterie… mais recharge sa volonté (il s'en dit ressourcé).
const evening = [{ id: 's1', kind: 'RECHARGE', activity: 'RENCONTRE', minutes: 90, occurred_at: at(14, 13) }];
let b = sb('INTROVERTI', evening);
assert.deepEqual([b.level, b.state, b.today.spent], [34, 'basse', 36]);
assert.equal(W.computeWillpower({ quests: [], sessions: [], events: evening, now, socialFactor: B.socialWillpowerFactor(b) }).level, 87);
assert.match(B.socialAdvice(b), /temps seul/);
// « Je me suis rechargé seul — complètement » remet à 100 %.
b = sb('INTROVERTI', [...evening, { id: 's2', kind: 'SOCIAL_RECHARGE', activity: 'COMPLET', minutes: null, occurred_at: at(14, 14) }]);
assert.deepEqual([b.level, b.state, b.today.recharged], [100, 'pleine', 66]);
assert.equal(sb('INTROVERTI', [{ id: 's3', kind: 'SOCIAL_SPENT', activity: 'BEAUCOUP', minutes: null, occurred_at: at(14, 9) }]).level, 35);
assert.equal(sb('INTROVERTI', [{ id: 's3', kind: 'SOCIAL_RECHARGE', activity: 'MOITIE', minutes: null, occurred_at: at(14, 9) }]).level, 100);
// Introverti à plat : une rencontre ne recharge plus la volonté.
const flat = [
  { id: 'f1', kind: 'SOCIAL_SPENT', activity: 'BEAUCOUP', minutes: null, occurred_at: at(14, 9) },
  { id: 'f2', kind: 'SOCIAL_SPENT', activity: 'BEAUCOUP', minutes: null, occurred_at: at(14, 9, 30) },
  { id: 'f3', kind: 'RECHARGE', activity: 'RENCONTRE', minutes: 60, occurred_at: at(14, 12) },
];
b = sb('INTROVERTI', flat);
assert.equal(b.state, 'plat');
assert.equal(W.computeWillpower({ quests: [], sessions: [], events: flat, now, socialFactor: B.socialWillpowerFactor(b) }).level, 60, 'à plat : la rencontre ne rend rien à la volonté');
assert.equal(W.computeWillpower({ quests: [], sessions: [], events: flat, now }).level, 78, 'sans batterie : +18');
// Extraverti : le networking remplit les deux jauges.
const network = [{ id: 'n1', kind: 'RECHARGE', activity: 'NETWORKING', minutes: 60, occurred_at: at(14, 12) }];
assert.equal(sb('EXTRAVERTI', network).level, 88);
// Extraverti isolé : −10 par nuit après 24 h sans contact, à compter de sa première activité ; à court, ses rencontres rechargent plus la volonté.
b = sb('EXTRAVERTI', [{ id: 'i1', kind: 'SOCIAL_SPENT', activity: 'UN_PEU', minutes: null, occurred_at: at(10, 10) }]);
assert.deepEqual([b.level, b.state], [25, 'basse']);
assert.equal(B.socialWillpowerFactor(b)(now.getTime()), 1.25);
assert.match(B.socialAdvice(b), /Appelle/);
assert.equal(sb('EXTRAVERTI', []).level, 70, 'nouveau joueur : pas d’isolement compté');
assert.equal(sb('INTROVERTI', [{ id: 'i2', kind: 'RECHARGE', activity: 'LECTURE', minutes: 60, occurred_at: at(5, 10) }]).level, 70, 'introverti : le temps seul ne coûte rien');
// La batterie ne touche pas la volonté hors temps social ; la volonté ignore les déclarations sociales.
assert.equal(run({ events: [{ id: 'x', kind: 'SOCIAL_SPENT', activity: 'BEAUCOUP', minutes: null, occurred_at: at(14, 9) }] }).level, 60);
// Quêtes Social : la batterie d'un introverti baisse.
assert.equal(sb('INTROVERTI', [], [{ status: 'COMPLETED', difficulty_tier: 'NOTABLE', estimated_minutes: 60, completed_at: at(14, 11), reward_stats: ['SOCIAL'], stat_tiers: { SOCIAL: 'NOTABLE' } }]).level, 46);

// Stats à difficulté : tri, difficulté globale, répartition identique au SQL.
assert.deepEqual(S.sortedStatTiers({ FOCUS: 'NOTABLE', MENTALITE: 'HARD', REVENU: 'HARD', SOCIAL: 'NOPE' }).map(e => e.kind), ['MENTALITE', 'FOCUS']);
assert.equal(S.topTier({ FOCUS: 'NOTABLE', MENTALITE: 'HARD' }), 'HARD');
assert.equal(S.topTier({ AGUERRISSEMENT: 'LEGENDARY' }), 'LEGENDARY');
assert.equal(S.topTier({}), null);
assert.equal(S.cleanStatTiers({ REVENU: 'HARD' }), null);
assert.deepEqual(S.cleanStatTiers({ FOCUS: 'NOTABLE', MENTALITE: 'HARD' }), { MENTALITE: 'HARD', FOCUS: 'NOTABLE' });
for (const [amount, weights, expected] of [[60, [180, 80], [42, 18]], [10, [1, 1, 1], [4, 3, 3]], [0, [5], [0]], [7, [0, 0], [4, 3]], [5, [], []]])
  assert.deepEqual(S.splitWeighted(amount, weights), expected);
assert.deepEqual(S.questStatTiers({ stat_tiers: null, reward_stats: ['SOCIAL', 'DISCIPLINE'], difficulty_tier: 'ROUTINE' }).map(e => [e.kind, e.tier]), [['DISCIPLINE', 'ROUTINE'], ['SOCIAL', 'ROUTINE']]);
assert.deepEqual(S.projectStatTiers({ stat_tiers: null, primary_stat: 'FORCE', secondary_stat: null, difficulty: 'HARD' }).map(e => e.tier), ['HARD']);
// Butin : stats du donjon au prorata, ancienne stat principale, repli Discipline.
assert.deepEqual(S.lootShares(64, { stat_tiers: { FORCE: 'HARD', MENTALITE: 'NOTABLE' }, primary_stat: 'FORCE' }), [{ kind: 'FORCE', xp: 45 }, { kind: 'MENTALITE', xp: 19 }]);
assert.deepEqual(S.lootShares(10, { stat_tiers: null, primary_stat: 'FORCE' }), [{ kind: 'FORCE', xp: 10 }]);
assert.deepEqual(S.lootShares(10, { stat_tiers: null, primary_stat: 'REVENU' }), [{ kind: 'DISCIPLINE', xp: 10 }]);
assert.equal(S.readyToClose({ progress_pct: 100, ends_at: null }, 3), true);
assert.equal(S.readyToClose({ progress_pct: 100, ends_at: null }, 0), false, 'aucune quête : rien à clore');
assert.equal(S.readyToClose({ progress_pct: 40, ends_at: at(1, 12) }, 5, now.getTime()), true, 'échéance passée');
assert.equal(S.readyToClose({ progress_pct: 40, ends_at: at(30, 12) }, 5, now.getTime()), false);
// Mêmes stats, taux et déclarations que la migration 0023b.
const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/0023b_stat_tiers_loot_willpower.sql'), 'utf8');
for (const [tier, rate] of Object.entries(S.LOOT_RATE)) assert.match(sql, new RegExp(`'${tier}' then ${rate.toFixed(2)}|else ${rate.toFixed(2)}`), tier);
for (const k of S.XP_STAT_KINDS) assert.ok(sql.includes(`'${k}'`), k);
for (const k of [...Object.keys(W.ACTIVITIES), 'RITUEL_202020', 'SOCIAL_SPENT', 'SOCIAL_RECHARGE', 'UN_PEU', 'BEAUCOUP', 'MOITIE', 'COMPLET', 'INTROVERTI', 'EXTRAVERTI', 'AMBIVERTI']) assert.ok(sql.includes(`'${k}'`), k);
console.log('Willpower OK: jauge rejouée sur 14 jours, distractions jugées par le joueur (ressourcé / vidé), coût d’attention des parties prenantes, rendement décroissant au-delà d’1 h 30, ce qui vide coûte double le matin, quêtes Social/Aguerrissement, recharges plafonnées par jour, sommeil plafonné à 60 %, méthode 20/20/20, conseils ; batterie sociale (profil MBTI, introverti/extraverti/ambiverti, ressenti, isolement, lien avec la volonté aux extrêmes) ; stats à difficulté (tri, répartition, butin, clôture) alignées sur 0023b.');
