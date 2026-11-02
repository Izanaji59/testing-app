// Embedded PostgreSQL tests: no connection to production or real account data.
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
(async () => {
 const db = new PGlite();
 const u = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
 const q = '10000000-0000-4000-8000-000000000001', q2 = '10000000-0000-4000-8000-000000000002';
 await db.exec(`
 create role anon; create role authenticated;
 create schema auth;
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon;
 create function uuid_generate_v4() returns uuid language sql as $$ select gen_random_uuid() $$;
 create type difficulty_tier as enum ('ROUTINE');
 create type quest_status as enum ('PENDING','IN_PROGRESS','COMPLETED','SKIPPED','EXPIRED');
 create table profiles(user_id uuid primary key);
 create table stats(user_id uuid,kind text,xp bigint default 0,level int default 1,last_gain_at timestamptz,decay_pct int default 0,unique(user_id,kind));
 create table quests(id uuid primary key,user_id uuid,due_at timestamptz,status quest_status,difficulty_tier difficulty_tier,starts_at timestamptz);
 create function f_stat_xp_for_level(int) returns int language sql as $$ select 1000 $$;
 create function f_base_xp_for_tier(difficulty_tier) returns int language sql as $$ select 35 $$;
 insert into profiles values ('${u}'),('${other}');
 insert into quests values ('${q}','${u}','2020-01-01','PENDING','ROUTINE'),('${q2}','${other}','2020-01-01','PENDING','ROUTINE');
 `);
 await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations/0013b_resignation_stat.sql'), 'utf8'));
 const migration = fs.readFileSync(path.join(__dirname, '../supabase/migrations/0015_deadline_review.sql'), 'utf8');
 await db.exec(migration); await db.exec(migration); // reapplication is safe
 await db.exec(`set role authenticated; set request.jwt.claim.sub='${u}';`);
 const review = (id, due, reason, choice) => db.query('select review_missed_quest($1,$2,$3,$4) as amount', [id,due,reason,choice]);
 await db.query('select cron_expire_overdue_quests()');
 await assert.rejects(review(q,'2020-01-01','   ','avoidance'));
 await assert.rejects(review(q,'2020-01-01','Contrainte','invalid'));
 await assert.rejects(review(q2,'2020-01-01','Autre compte','avoidance'));
 await assert.rejects(review(q,'2020-01-02','Échéance périmée','avoidance'));
 await assert.rejects(db.query(`select award_resignation($1,'DEADLINE_MISSED',$2,35)`,[u,q]));
 assert.equal((await review(q,'2020-01-01','Imprévu','constraint')).rows[0].amount,0);
 assert.equal((await review(q,'2020-01-01','Double clic','avoidance')).rows[0].amount,0);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int as n from resignation_events')).rows[0].n,0);
 assert.equal((await db.query('select status from quests where id=$1',[q])).rows[0].status,'PENDING');
 await db.query("update quests set due_at='2020-01-02' where id=$1",[q]);
 await db.exec('set role authenticated');
 assert.equal((await review(q,'2020-01-02','Évitement volontaire','avoidance')).rows[0].amount,35);
 assert.equal((await review(q,'2020-01-02','Réseau réessayé','avoidance')).rows[0].amount,35);
 assert.equal((await db.query('select count(*)::int as n from quest_deadline_reviews')).rows[0].n,2);
 await db.exec(`set request.jwt.claim.sub='${other}';`);
 assert.equal((await db.query('select count(*)::int as n from quest_deadline_reviews')).rows[0].n,0);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int as n from resignation_events')).rows[0].n,1);
 assert.equal((await db.query("select xp from stats where user_id=$1 and kind='RESIGNATION'",[u])).rows[0].xp,35);
 // A direct status change, including from an old client, no longer charges missed deadlines.
 await db.query("update quests set status='EXPIRED' where id=$1",[q2]);
 assert.equal((await db.query('select count(*)::int as n from resignation_events')).rows[0].n,1);
 await db.query("update quests set status='SKIPPED' where id=$1",[q2]);
 assert.equal((await db.query('select count(*)::int as n from resignation_events')).rows[0].n,2);

 // 0017 : mission démarrée un jour précédent, toujours en cours.
 const m17 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/0017_started_quest_daily_review.sql'), 'utf8');
 await db.exec(m17); await db.exec(m17); // reapplication is safe
 const q3 = '10000000-0000-4000-8000-000000000003', q4 = '10000000-0000-4000-8000-000000000004';
 await db.query(`insert into quests(id,user_id,due_at,status,difficulty_tier,starts_at) values ($1,$3,null,'IN_PROGRESS','ROUTINE',now()-interval '30 hours'),($2,$3,null,'IN_PROGRESS','ROUTINE',now())`, [q3,q4,u]);
 const dayEnd = (await db.query(`select date_trunc('day', now()) as d`)).rows[0].d;
 const started = (id, day, reason, choice) => db.query('select review_started_quest($1,$2,$3,$4) as amount', [id,day,reason,choice]);
 await db.exec(`set role authenticated; set request.jwt.claim.sub='${u}';`);
 await assert.rejects(started(q3, dayEnd, '  ', 'avoidance'));
 await assert.rejects(started(q2, dayEnd, 'Autre compte', 'avoidance'));
 await assert.rejects(started(q4, dayEnd, 'Démarrée aujourd’hui', 'avoidance'));
 await assert.rejects(started(q3, new Date(Date.now() + 3600000), 'Journée future', 'avoidance'));
 await assert.rejects(started(q3, new Date(Date.now() - 3 * 86400000), 'Journée trop ancienne', 'avoidance'));
 assert.equal((await started(q3, dayEnd, 'J’ai repoussé', 'avoidance')).rows[0].amount, 35);
 assert.equal((await started(q3, dayEnd, 'Double clic', 'constraint')).rows[0].amount, 35);
 assert.equal((await started(q3, new Date(dayEnd.getTime() - 2 * 3600000), 'Autre fuseau, même journée', 'avoidance')).rows[0].amount, 35);
 await db.exec('reset role');
 assert.equal((await db.query('select status from quests where id=$1',[q3])).rows[0].status, 'IN_PROGRESS');
 assert.equal((await db.query("select count(*)::int as n from resignation_events where source='OBJECTIVE_POSTPONED'")).rows[0].n, 1);
 assert.equal((await db.query("select xp from stats where user_id=$1 and kind='RESIGNATION'",[u])).rows[0].xp, 70);
 assert.equal((await db.query("select kind from quest_deadline_reviews where quest_id=$1",[q])).rows[0].kind, 'deadline');
 await db.close();
 console.log('SQL OK: actual migrations, no automatic deadline points, required response, ownership/RLS, protected award function, zero-point constraint, idempotent retry, changed deadline, explicit abandonment preserved, started missions: one review per day, points on avoidance, status kept.');
})().catch(e => { console.error(e); process.exitCode=1; });
