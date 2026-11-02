const {PGlite}=require('../../deadline-sql-test/node_modules/@electric-sql/pglite');const fs=require('fs'),assert=require('assert/strict');
(async()=>{const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create publication supabase_realtime;`);
for(const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort()){let sql=fs.readFileSync('supabase/migrations/'+name,'utf8').replace(/^create extension[^;]+;/gm,'');try{await db.exec(sql);console.log('OK',name);}catch(e){console.error('MIGRATION',name,e.message);throw e;}}

const u='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
await db.exec(`grant select,insert,update,delete on all tables in schema public to authenticated;revoke insert,update,delete on public.stats,public.xp_events from authenticated;insert into auth.users values('${u}'),('${other}');insert into profiles(user_id) values('${u}'),('${other}');set role authenticated;set request.jwt.claim.sub='${u}';`);
const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
await assert.rejects(db.query('update profiles set total_xp=999999 where user_id=$1',[u]));
await assert.rejects(db.query("select award_xp($1,'ADJUSTMENT',null,null,100,false,null)",[u]));
await assert.rejects(db.query('update stats set level=99 where user_id=$1',[u]));
const project=(await one("insert into projects(user_id,type,title) values($1,'DUNGEON','Test') returning id",[u])).id;
const makeQuest=async(minutes,tier='HARD')=>(await one(`insert into quests(user_id,project_id,title,difficulty_tier,estimated_minutes,reward_xp_base,reward_stats) values($1,$2,'Test',$3,$4,999999,array['DISCIPLINE','FOCUS']::stat_kind[]) returning id,reward_xp_base`,[u,project,tier,minutes]));
const q=await makeQuest(180);assert.equal(q.reward_xp_base,180);
await db.query('update quests set reward_xp_base=99999,estimated_minutes=400 where id=$1',[q.id]);assert.equal((await one('select reward_xp_base from quests where id=$1',[q.id])).reward_xp_base,180);
await db.query("update quests set status='COMPLETED' where id=$1",[q.id]);assert.equal(Number((await one('select total_xp from profiles where user_id=$1',[u])).total_xp),180);
await db.query("update quests set status='PENDING' where id=$1",[q.id]);await db.query("update quests set status='COMPLETED' where id=$1",[q.id]);assert.equal(Number((await one('select total_xp from profiles where user_id=$1',[u])).total_xp),180);
const q2=await makeQuest(400,'LEGENDARY'),q3=await makeQuest(180);
for(const id of[q2.id,q3.id])await db.query("update quests set status='COMPLETED' where id=$1",[id]);assert.equal(Number((await one('select total_xp from profiles where user_id=$1',[u])).total_xp),600);
assert.equal((await one('select count(*)::int n from xp_events where user_id=$1',[u])).n,3);
await db.query("insert into profile_presentations(user_id,bio,theme) values($1,'Bio','violet')",[u]);
const post=(await one("insert into profile_posts(user_id,title,body) values($1,'Mon journal','Texte') returning id",[u])).id;
await db.exec(`set request.jwt.claim.sub='${other}'`);assert.equal((await one('select count(*)::int n from profile_posts')).n,0);
await assert.rejects(db.query("insert into profile_presentations(user_id,bio) values($1,'Intrusion')",[u]));
await db.exec(`set request.jwt.claim.sub='${u}'`);await db.query('update profile_posts set is_published=true where id=$1',[post]);
await db.exec(`set request.jwt.claim.sub='${other}'`);assert.equal((await one('select count(*)::int n from profile_posts')).n,1);
assert.equal((await db.query("update profile_posts set title='Intrusion' where id=$1 returning id",[post])).rows.length,0);
await db.exec(`set request.jwt.claim.sub='${u}'`);await db.query('update profile_posts set is_published=false where id=$1',[post]);
await db.exec(`set request.jwt.claim.sub='${other}'`);assert.equal((await one('select count(*)::int n from profile_posts')).n,0);
await db.exec('reset role');
for(const [xp,projects,rank] of [[0,0,'E'],[4000,0,'D'],[12000,0,'C'],[30000,0,'B'],[65000,0,'B'],[65000,3,'A'],[150000,8,'S']])assert.equal((await one('select f_earned_rank($1,$2) r',[xp,projects])).r,rank);
for(const [level,xp] of [[1,0],[10,4000],[25,12000],[50,30000],[80,65000],[110,150000]]){assert.equal(Number((await one('select f_xp_for_level($1) x',[level])).x),xp);assert.equal((await one('select f_level_for_xp($1) l',[xp])).l,level);}
await db.exec(fs.readFileSync('supabase/migrations/0017_progression.sql','utf8'));await db.exec(fs.readFileSync('supabase/migrations/0018_profile_journal.sql','utf8'));
assert.equal(Number((await one('select total_xp from profiles where user_id=$1',[u])).total_xp),600);
console.log('PASS: curve, frozen rewards, daily cap, duplicate completion, protected stats, journal privacy/publishing/ownership, idempotent migrations.');await db.close();})().catch(e=>{console.error(e.message);process.exitCode=1});
