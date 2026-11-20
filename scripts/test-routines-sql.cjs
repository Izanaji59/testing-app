// Quêtes quotidiennes d'un donjon (routines) et identité du donjon, sur toutes les migrations réelles (PGlite).
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('fs'), assert = require('assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;grant usage on schema storage to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;create function storage.extension(text) returns text language sql immutable as $$select regexp_replace($1,'^.*[.]','')$$;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create publication supabase_realtime;`);
  for (const name of fs.readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort())
    await db.exec(fs.readFileSync('supabase/migrations/' + name, 'utf8').replace(/^create extension[^;]+;/gm, ''));
  await db.exec(fs.readFileSync('supabase/migrations/0025_quest_routines_identity.sql', 'utf8')); // ré-exécution sans effet

  const a = '00000000-0000-4000-8000-00000000000a', b = '00000000-0000-4000-8000-00000000000b';
  await db.exec(`grant usage on schema public to authenticated; grant select,insert,update,delete on all tables in schema public to authenticated;
    insert into auth.users values('${a}'),('${b}');
    insert into profiles(user_id, display_name) values('${a}','Alpha'),('${b}','Beta');`);
  const as = uid => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid}';`);
  const rows = async (sql, p) => (await db.query(sql, p)).rows;
  const day = (offsetDays = 0) => { const s = new Date(); s.setUTCHours(0, 0, 0, 0); s.setUTCDate(s.getUTCDate() + offsetDays); const e = new Date(s.getTime() + 86400000 - 1); return [s.toISOString(), e.toISOString()]; };
  const [start, end] = day();

  await as(a);
  // Identité du donjon : phrase libre, 160 caractères maximum.
  const project = (await rows(`insert into projects(user_id,type,title,status,identity,ends_at) values($1,'CAMPAIGN','Forme','ACTIVE','Je suis quelqu''un qui bouge chaque jour', now() + interval '10 days') returning id`, [a]))[0].id;
  assert.equal((await rows('select identity from projects where id=$1', [project]))[0].identity, 'Je suis quelqu\'un qui bouge chaque jour');
  await assert.rejects(db.query(`update projects set identity=$2 where id=$1`, [project, 'x'.repeat(161)]));

  // Routine : stats nettoyées comme une quête (difficulté = la plus haute).
  const routine = (await rows(`insert into quest_routines(user_id,project_id,title,estimated_minutes,stat_tiers) values($1,$2,'Marcher 8 000 pas',60,'{"FORCE":"NOTABLE","MENTALITE":"ROUTINE"}') returning id, difficulty_tier, reward_stats`, [a, project]))[0];
  assert.equal(routine.difficulty_tier, 'NOTABLE'); assert.equal(String(routine.reward_stats), '{FORCE,MENTALITE}');
  await assert.rejects(db.query(`insert into quest_routines(user_id,project_id,title,stat_tiers) values($1,$2,'Argent','{"REVENU":"HARD"}')`, [a, project]));

  // Émission : une quête par jour, datée de la fin de journée, rattachée à la routine ; XP figée à la création.
  assert.equal((await rows('select ensure_routine_quests($1,$2) as n', [start, end]))[0].n, 1);
  assert.equal((await rows('select ensure_routine_quests($1,$2) as n', [start, end]))[0].n, 0, 'idempotent');
  const [q] = await rows('select * from quests where routine_id=$1', [routine.id]);
  assert.equal(q.title, 'Marcher 8 000 pas'); assert.equal(q.project_id, project); assert.equal(q.status, 'PENDING');
  assert.equal(new Date(q.due_at).toISOString(), end); assert.equal(q.difficulty_tier, 'NOTABLE'); assert.ok(q.reward_xp_base > 0);
  await assert.rejects(db.query('select ensure_routine_quests($1,$2)', [...day(-3)]), /Journée invalide/, 'pas de rattrapage des jours passés');
  await assert.rejects(db.query('select ensure_routine_quests($1,$2)', [start, new Date(Date.parse(start) + 3600000).toISOString()]), /Journée invalide/);

  // Terminer la quête du jour ne la ré-émet pas le même jour.
  await db.query(`update quests set status='COMPLETED' where id=$1`, [q.id]);
  assert.equal((await rows('select ensure_routine_quests($1,$2) as n', [start, end]))[0].n, 0);

  // Défi et routine dans le même donjon : la quête de la routine ne remplace pas celle du défi.
  const pushups = (await rows(`select id from challenges where title='100 pompes par jour'`))[0].id;
  const challengeProject = (await rows('select join_challenge($1) as id', [pushups]))[0].id;
  await db.query(`insert into quest_routines(user_id,project_id,title) values($1,$2,'Étirements')`, [a, challengeProject]);
  assert.equal((await rows('select ensure_routine_quests($1,$2) as n', [start, end]))[0].n, 1);
  assert.equal((await rows('select ensure_challenge_quests($1,$2) as n', [start, end]))[0].n, 1, 'quête du défi toujours émise');

  // Fin de transmission : routine arrêtée, terminée, pas encore émise, donjon en pause ou échu → rien.
  const fresh = async () => { await db.query('delete from quests where routine_id is not null'); return (await rows('select ensure_routine_quests($1,$2) as n', [start, end]))[0].n; };
  await db.query(`update quest_routines set active=false where project_id=$1`, [challengeProject]);
  assert.equal(await fresh(), 1, 'seule la routine active');
  await db.query(`update quest_routines set ends_at=$2 where id=$1`, [routine.id, start]);
  assert.equal(await fresh(), 0, 'routine arrivée à sa fin de transmission');
  await db.query(`update quest_routines set ends_at=null, starts_at=now() + interval '2 days' where id=$1`, [routine.id]);
  assert.equal(await fresh(), 0, 'pas encore émise');
  await db.query(`update quest_routines set starts_at=now() - interval '1 day' where id=$1`, [routine.id]);
  await db.query(`update projects set ends_at=$2 where id=$1`, [project, start]);
  assert.equal(await fresh(), 0, 'le donjon est arrivé à sa fin de transmission');
  await db.query(`update projects set ends_at=null, status='PAUSED' where id=$1`, [project]);
  assert.equal(await fresh(), 0, 'donjon en pause');
  await db.query(`update projects set status='ACTIVE' where id=$1`, [project]);
  assert.equal(await fresh(), 1, 'sans date de fin : jusqu’à l’arrêt');

  // RLS : routines privées, impossible d'en attacher une au donjon d'un autre.
  await as(b);
  assert.equal((await rows('select count(*)::int as n from quest_routines'))[0].n, 0);
  await assert.rejects(db.query(`insert into quest_routines(user_id,project_id,title) values($1,$2,'Intrus')`, [b, project]));
  await assert.rejects(db.query(`insert into quest_routines(user_id,project_id,title) values($1,$2,'Intrus')`, [a, project]));
  assert.equal((await rows('select ensure_routine_quests($1,$2) as n', [start, end]))[0].n, 0);
  await db.query(`update quest_routines set active=false`);
  await as(a);
  assert.equal((await rows('select count(*)::int as n from quest_routines where active'))[0].n, 1, 'B ne peut pas arrêter les routines de A');

  // Visiteurs non connectés : aucun accès.
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from quest_routines'));
  await assert.rejects(db.query('select ensure_routine_quests($1,$2)', [start, end]));
  await db.exec('reset role');
  await db.close();
  console.log('Routines SQL OK: identité du donjon, quête quotidienne émise une fois par jour (stats, difficulté, XP figée), pas de rattrapage, coexistence avec les défis, fin de transmission (routine, donjon, pause, arrêt), RLS, anon refusé.');
})().catch(e => { console.error(e); process.exitCode = 1; });
