// Défis communs, sur toutes les migrations réelles (PGlite, aucune base distante).
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('fs'), assert = require('assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create publication supabase_realtime;`);
  for (const name of fs.readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort())
    await db.exec(fs.readFileSync('supabase/migrations/' + name, 'utf8').replace(/^create extension[^;]+;/gm, ''));
  await db.exec(fs.readFileSync('supabase/migrations/0022_challenges.sql', 'utf8')); // ré-exécution sans effet

  const a = '00000000-0000-4000-8000-00000000000a', b = '00000000-0000-4000-8000-00000000000b';
  await db.exec(`grant usage on schema public to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated;
    insert into auth.users values('${a}'),('${b}');
    insert into profiles(user_id, display_name) values('${a}','Alpha'),('${b}','Beta');`);
  const as = uid => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid}';`);
  const rows = async (sql, p) => (await db.query(sql, p)).rows;
  const day = (offsetDays = 0) => { const s = new Date(); s.setUTCHours(0, 0, 0, 0); s.setUTCDate(s.getUTCDate() + offsetDays); const e = new Date(s.getTime() + 86400000 - 1); return [s.toISOString(), e.toISOString()]; };

  // Défis officiels présents une seule fois.
  assert.equal((await rows(`select count(*)::int as n from challenges where created_by is null`))[0].n, 5);

  await as(a);
  let list = await rows('select * from get_challenges()');
  const pushups = list.find(c => c.title === '100 pompes par jour');
  assert.ok(pushups && pushups.official && pushups.members === 0 && pushups.joined_at === null);

  // Rejoindre : un projet CAMPAGNE + adhésion ; rejoindre deux fois ne duplique rien.
  const project = (await rows('select join_challenge($1) as id', [pushups.id]))[0].id;
  assert.equal((await rows('select join_challenge($1) as id', [pushups.id]))[0].id, project);
  const [p] = await rows('select type, title, status, primary_stat from projects where id=$1', [project]);
  assert.deepEqual([p.type, p.title, p.status, p.primary_stat], ['CAMPAIGN', 'Défi · 100 pompes par jour', 'ACTIVE', 'FORCE']);

  // Quête du jour : créée une fois, datée de la fin de journée, récompense la stat du défi.
  const [start, end] = day();
  assert.equal((await rows('select ensure_challenge_quests($1,$2) as n', [start, end]))[0].n, 1);
  assert.equal((await rows('select ensure_challenge_quests($1,$2) as n', [start, end]))[0].n, 0);
  const [q] = await rows('select title, status, reward_stats, due_at, reward_xp_base from quests where project_id=$1', [project]);
  assert.equal(q.title, 'Faire 100 pompes'); assert.equal(q.status, 'PENDING');
  assert.ok(String(q.reward_stats).includes('FORCE')); assert.ok(q.reward_xp_base > 0);
  await assert.rejects(db.query('select ensure_challenge_quests($1,$2)', [...day(-3)]), /Journée invalide/);
  await assert.rejects(db.query('select ensure_challenge_quests($1,$2)', [start, new Date(Date.parse(start) + 3600000).toISOString()]), /Journée invalide/);

  // B rejoint aussi ; classement : pseudo + jours réussis, sans autre donnée.
  await as(b);
  await db.query('select join_challenge($1)', [pushups.id]);
  await as(a);
  await db.query(`update quests set status='COMPLETED' where project_id=$1`, [project]);
  const board = await rows('select * from get_challenge_board($1)', [pushups.id]);
  assert.deepEqual(board.map(r => [r.display_name, r.days_done, r.days_total, r.is_me]), [['Alpha', 1, 30, true], ['Beta', 0, 30, false]]);
  assert.deepEqual(Object.keys(board[0]).sort(), ['days_done', 'days_total', 'display_name', 'is_me', 'joined_at']);
  list = await rows('select * from get_challenges()');
  assert.equal(list.find(c => c.id === pushups.id).members, 2);

  // RLS : on ne voit que ses adhésions ; impossible de s'inscrire à la place d'un autre.
  assert.equal((await rows('select count(*)::int as n from challenge_members'))[0].n, 1);
  await assert.rejects(db.query('insert into challenge_members(challenge_id,user_id) values($1,$2)', [pushups.id, b]));
  await assert.rejects(db.query('insert into challenge_members(challenge_id,user_id) values($1,$2)', [list[1].id, a]), 'adhésion directe interdite');

  // Créer un défi : seulement à son nom ; le supprimer tant que personne d'autre ne l'a rejoint.
  await assert.rejects(db.query(`insert into challenges(title,daily_goal,duration_days,created_by) values('Faux','Rien',7,$1)`, [b]));
  const mine = (await rows(`insert into challenges(title,daily_goal,stat_kind,duration_days,created_by) values('Gainage 2 min','Tenir 2 minutes de gainage','FORCE',14,$1) returning id`, [a]))[0].id;
  await assert.rejects(db.query(`insert into challenges(title,daily_goal,stat_kind,duration_days,created_by) values('Argent','Gagner','REVENU',14,$1)`, [a]));
  await as(b); await db.query('select join_challenge($1)', [mine]);
  await as(a); await db.query('delete from challenges where id=$1', [mine]);
  assert.equal((await rows('select count(*)::int as n from challenges where id=$1', [mine]))[0].n, 1, 'déjà rejoint par un autre : conservé');
  await assert.rejects(db.query(`delete from challenges where created_by is null`).then(async () => { if ((await rows('select count(*)::int as n from challenges where created_by is null'))[0].n !== 5) throw new Error('supprimé'); throw new Error('ok'); }), /ok/);

  // Quitter : l'adhésion disparaît, le projet reste dans les donjons ; plus de quête du jour.
  await db.query('delete from challenge_members where challenge_id=$1', [pushups.id]);
  assert.equal((await rows('select count(*)::int as n from projects where id=$1', [project]))[0].n, 1);
  assert.equal((await rows('select ensure_challenge_quests($1,$2) as n', [start, end]))[0].n, 0);

  // Visiteurs non connectés : aucun accès.
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from get_challenges()'));
  await assert.rejects(db.query('select * from challenges'));
  await db.exec('reset role');
  await db.close();
  console.log('Challenges SQL OK: migrations 0001-0022, défis officiels, rejoindre (idempotent), quête du jour unique, journée validée, classement minimal, RLS, création/suppression, quitter, anon refusé.');
})().catch(e => { console.error(e); process.exitCode = 1; });
