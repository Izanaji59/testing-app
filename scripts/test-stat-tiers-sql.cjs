// Migration 0023 : difficulté par statistique (quêtes, projets) et butin de donjon.
const {PGlite}=require(process.env.PGLITE_MODULE || '@electric-sql/pglite');const fs=require('fs'),assert=require('assert/strict');
(async()=>{const db=new PGlite();await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create publication supabase_realtime;`);
for(const name of fs.readdirSync('supabase/migrations').filter(n=>n.endsWith('.sql')).sort()){const sql=fs.readFileSync('supabase/migrations/'+name,'utf8').replace(/^create extension[^;]+;/gm,'');try{await db.exec(sql);}catch(e){console.error('MIGRATION',name,e.message);throw e;}}

const u='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
await db.exec(`grant select,insert,update,delete on all tables in schema public to authenticated;revoke insert,update,delete on public.stats,public.xp_events from authenticated;insert into auth.users values('${u}'),('${other}');insert into profiles(user_id) values('${u}'),('${other}');set role authenticated;set request.jwt.claim.sub='${u}';`);
const one=async(sql,args=[])=>(await db.query(sql,args)).rows[0];
// XP cumulée d'une stat, niveaux franchis compris.
const statXp=async kind=>{const r=await one('select xp+(select coalesce(sum(f_stat_xp_for_level(l)),0) from generate_series(1,level-1) l) t from stats where user_id=$1 and kind=$2',[u,kind]);return r?Number(r.t):0;};
const total=async()=>Number((await one('select total_xp from profiles where user_id=$1',[u])).total_xp);

// Quêtes : difficulté par stat, budget unique réparti au prorata.
const project=(await one(`insert into projects(user_id,type,title,stat_tiers) values($1,'DUNGEON','Santé','{"FORCE":"HARD"}') returning id,primary_stat,secondary_stat,difficulty`,[u]));
assert.equal(project.primary_stat,'FORCE');assert.equal(project.secondary_stat,null);assert.equal(project.difficulty,'HARD');
const q=await one(`insert into quests(user_id,project_id,title,estimated_minutes,difficulty_tier,stat_tiers) values($1,$2,'Lire',60,'TRIVIAL','{"FOCUS":"NOTABLE","MENTALITE":"HARD"}') returning id,difficulty_tier,reward_stats,reward_xp_base`,[u,project.id]);
assert.equal(q.difficulty_tier,'HARD','difficulté globale = la plus haute');
assert.equal(String(q.reward_stats),'{MENTALITE,FOCUS}','stat dominante en tête');
assert.equal(q.reward_xp_base,60,'budget unique : 1 XP par minute dans le plafond DIFFICILE');
await db.query("update quests set status='COMPLETED' where id=$1",[q.id]);
assert.equal(await statXp('MENTALITE'),42);assert.equal(await statXp('FOCUS'),18);assert.equal(await total(),60,'jamais multiplié par le nombre de stats');
// Valeurs refusées.
for(const bad of ['{"REVENU":"HARD"}','{"FOCUS":"EXTREME"}','{"RESIGNATION":"TRIVIAL"}','["FOCUS"]','{"FOCUS":3}'])
  await assert.rejects(db.query(`insert into quests(user_id,project_id,title,stat_tiers) values($1,$2,'X',$3::jsonb)`,[u,project.id,bad]),undefined,bad);
// Objet vide = aucune stat ; anciennes quêtes : partage égal inchangé.
assert.equal((await one(`insert into quests(user_id,project_id,title,stat_tiers) values($1,$2,'Vide','{}') returning stat_tiers`,[u,project.id])).stat_tiers,null);
const legacy=await one(`insert into quests(user_id,project_id,title,estimated_minutes,difficulty_tier,reward_stats) values($1,$2,'Ancienne',35,'ROUTINE',array['DISCIPLINE','SOCIAL']::stat_kind[]) returning id`,[u,project.id]);
await db.query("update quests set status='COMPLETED' where id=$1",[legacy.id]);
assert.equal(await statXp('DISCIPLINE'),18);assert.equal(await statXp('SOCIAL'),17);

// Projets à plusieurs stats.
const multi=await one(`insert into projects(user_id,type,title,stat_tiers) values($1,'CAMPAIGN','Multi','{"FOCUS":"NOTABLE","FORCE":"LEGENDARY","SOCIAL":"TRIVIAL"}') returning primary_stat,secondary_stat,difficulty`,[u]);
assert.deepEqual([multi.primary_stat,multi.secondary_stat,multi.difficulty],['FORCE','FOCUS','LEGENDARY']);

// Butin : 95 XP gagnés dans le donjon (stats MEN/FOC/DISC/SOC) → 80 % en FORCE (DIFFICILE).
let loot=await one('select * from get_project_loot() where project_id=$1',[project.id]);
assert.deepEqual([loot.earned_xp,loot.loot_xp,Number(loot.rate),loot.paid_xp],[95,76,0.8,null]);
await db.exec(`set request.jwt.claim.sub='${other}'`);assert.equal((await db.query('select * from get_project_loot()')).rows.length,0,'butin des autres invisible');
await db.exec(`set request.jwt.claim.sub='${u}'`);
// Atteindre le plafond quotidien avant de terminer : le butin passe quand même.
const filler=await one(`insert into quests(user_id,project_id,title,estimated_minutes,difficulty_tier,reward_stats,is_flash) values($1,$2,'Grosse',400,'LEGENDARY',array['TECHNIQUE']::stat_kind[],true) returning id`,[u,project.id]);
await db.query("update quests set status='COMPLETED' where id=$1",[filler.id]);
assert.equal(await total(),495);
const capped=await one(`insert into quests(user_id,project_id,title,estimated_minutes,difficulty_tier,reward_stats) values($1,$2,'Après plafond',180,'HARD',array['DISCIPLINE']::stat_kind[]) returning id`,[u,project.id]);
await db.query("update quests set status='COMPLETED' where id=$1",[capped.id]);
assert.equal(await total(),600,'plafond de 600 XP par jour');
loot=await one('select loot_xp,earned_xp from get_project_loot() where project_id=$1',[project.id]);
assert.equal(loot.earned_xp,200,'quête flash exclue, quête plafonnée comptée pour ce qu’elle a rapporté');
assert.equal(loot.loot_xp,160);
const forceBefore=await statXp('FORCE');
await db.query("update projects set status='COMPLETED' where id=$1",[project.id]);
assert.equal(await total(),760,'butin hors plafond quotidien');
assert.equal(await statXp('FORCE')-forceBefore,160,'tout le butin en FORCE');
const ev=await one(`select xp_amount,stat_kind,metadata from xp_events where source='ADJUSTMENT' and source_ref_id=$1`,[project.id]);
assert.equal(ev.xp_amount,160);assert.equal(ev.stat_kind,'FORCE');assert.equal(ev.metadata.kind,'project_loot');
assert.equal((await one('select paid_xp from get_project_loot() where project_id=$1',[project.id])).paid_xp,160);
// Rouvrir puis terminer à nouveau : pas de second butin.
await db.query("update projects set status='ACTIVE' where id=$1",[project.id]);await db.query("update projects set status='COMPLETED' where id=$1",[project.id]);
assert.equal(await total(),760);
// Le butin n'entame pas le plafond du jour : rien de plus (600 déjà atteints), mais pas moins non plus.
const after=await one(`insert into quests(user_id,project_id,title,estimated_minutes,difficulty_tier) values($1,$2,'Encore',30,'ROUTINE') returning id`,[u,project.id]);
await db.query("update quests set status='COMPLETED' where id=$1",[after.id]);assert.equal(await total(),760);

// Butin partagé entre plusieurs stats, au prorata des difficultés ; donjon sans quête = aucun butin.
await db.exec('reset role');await db.exec(`delete from xp_events where user_id='${u}'`);await db.exec(`set role authenticated;set request.jwt.claim.sub='${u}';`);
const shared=await one(`insert into projects(user_id,type,title,stat_tiers) values($1,'DUNGEON','Partagé','{"FORCE":"HARD","MENTALITE":"NOTABLE"}') returning id`,[u]);
const sq=await one(`insert into quests(user_id,project_id,title,estimated_minutes,stat_tiers) values($1,$2,'Séance',100,'{"DISCIPLINE":"NOTABLE"}') returning id`,[u,shared.id]);
await db.query("update quests set status='COMPLETED' where id=$1",[sq.id]);
const f0=await statXp('FORCE'),m0=await statXp('MENTALITE');
await db.query("update projects set status='COMPLETED' where id=$1",[shared.id]);
// 80 XP gagnés × 0,8 = 64 → FORCE 180/260, MENTALITÉ 80/260.
assert.equal(await statXp('FORCE')-f0,45);assert.equal(await statXp('MENTALITE')-m0,19);
const sev=await one(`select xp_amount,metadata from xp_events where source='ADJUSTMENT' and source_ref_id=$1`,[shared.id]);
assert.equal(sev.xp_amount,64);assert.deepEqual(sev.metadata.reward_stats,['FORCE','MENTALITE']);assert.deepEqual(sev.metadata.shares,[45,19]);
const empty=await one(`insert into projects(user_id,type,title) values($1,'RAID','Vide') returning id`,[u]);
await db.query("update projects set status='COMPLETED' where id=$1",[empty.id]);
assert.equal((await one(`select count(*)::int n from xp_events where source='ADJUSTMENT' and source_ref_id=$1`,[empty.id])).n,0);
// Personne d'autre ne peut appeler le versement direct ni modifier les stats.
await assert.rejects(db.query("select award_xp($1,'ADJUSTMENT',null,null,100,false,null)",[u]));
await db.exec('reset role');
for(const [amount,weights,expected] of [[60,[180,80],[42,18]],[10,[1,1,1],[4,3,3]],[0,[5],[0]],[7,[0,0],[4,3]]])
  assert.deepEqual((await one('select f_split_weighted($1,$2::int[]) s',[amount,weights])).s,expected);
// Stat AGUERRISSEMENT : créée pour les profils, choisissable avec une difficulté.
assert.equal((await one(`select count(*)::int n from stats where kind='AGUERRISSEMENT'`)).n,2);
await db.exec(`set role authenticated;set request.jwt.claim.sub='${u}';`);
const hard=await one(`insert into quests(user_id,project_id,title,estimated_minutes,stat_tiers) values($1,$2,'Marcher 60 km',400,'{"AGUERRISSEMENT":"LEGENDARY"}') returning id,difficulty_tier`,[u,empty.id]);
assert.equal(hard.difficulty_tier,'LEGENDARY');
// Réservoir de volonté : déclarations du joueur seulement, datées au plus 36 h en arrière.
const morning=new Date(Date.now()-3*3600e3).toISOString(),old=new Date(Date.now()-5*86400e3).toISOString();
const w1=await one(`insert into willpower_events(user_id,kind,activity,minutes,occurred_at) values($1,'DOPAMINE','SCROLL',30,$2) returning id,occurred_at`,[u,morning]);
assert.ok(Math.abs(Date.parse(w1.occurred_at)-Date.parse(morning))<1000,'« ce matin » conservé');
const w2=await one(`insert into willpower_events(user_id,kind,activity,minutes,occurred_at) values($1,'RECHARGE','RENCONTRE',90,$2) returning occurred_at`,[u,old]);
assert.ok(Date.now()-Date.parse(w2.occurred_at)<60e3,'date trop ancienne ramenée à maintenant');
await one(`insert into willpower_events(user_id,kind,activity,minutes) values($1,'RITUAL','RITUEL_202020',60) returning id`,[u]);
// Le joueur juge lui-même : une partie d'échecs peut ressourcer ou vider.
await one(`insert into willpower_events(user_id,kind,activity,minutes) values($1,'RECHARGE','ECHECS',45) returning id`,[u]);
await one(`insert into willpower_events(user_id,kind,activity,minutes) values($1,'DOPAMINE','ECHECS',300) returning id`,[u]);
for(const [kind,activity] of [['RITUAL','SCROLL'],['RECHARGE','RITUEL_202020'],['XP','SCROLL'],['RECHARGE','TIKTOK']])
  await assert.rejects(db.query(`insert into willpower_events(user_id,kind,activity,minutes) values($1,$2,$3,10)`,[u,kind,activity]),undefined,kind+'/'+activity);
await assert.rejects(db.query(`insert into willpower_events(user_id,kind,activity,minutes) values($1,'DOPAMINE','SCROLL',10)`,[other]),undefined,'pas pour un autre joueur');
// Batterie sociale : au ressenti, sans durée ; profil social choisi ou déduit du MBTI.
await one(`insert into willpower_events(user_id,kind,activity) values($1,'SOCIAL_SPENT','BEAUCOUP') returning id`,[u]);
await one(`insert into willpower_events(user_id,kind,activity) values($1,'SOCIAL_RECHARGE','COMPLET') returning id`,[u]);
for(const [kind,activity,minutes] of [['SOCIAL_SPENT','COMPLET',null],['SOCIAL_RECHARGE','BEAUCOUP',null],['DOPAMINE','SCROLL',null],['RITUAL','RITUEL_202020',null]])
  await assert.rejects(db.query(`insert into willpower_events(user_id,kind,activity,minutes) values($1,$2,$3,$4)`,[u,kind,activity,minutes]),undefined,kind+'/'+activity);
assert.equal((await one(`update profiles set social_profile='INTROVERTI' where user_id=$1 returning social_profile`,[u])).social_profile,'INTROVERTI');
await assert.rejects(db.query(`update profiles set social_profile='TIMIDE' where user_id=$1`,[u]));
await one(`update profiles set social_profile=null where user_id=$1 returning user_id`,[u]);
await db.exec(`set request.jwt.claim.sub='${other}'`);
assert.equal((await one('select count(*)::int n from willpower_events')).n,0,'déclarations privées');
assert.equal((await db.query('delete from willpower_events where id=$1 returning id',[w1.id])).rows.length,0);
await db.exec(`set request.jwt.claim.sub='${u}'`);
assert.equal((await db.query('delete from willpower_events where id=$1 returning id',[w1.id])).rows.length,1,'annuler sa déclaration');
await db.exec('reset role');
// Migrations rejouables.
await db.exec(fs.readFileSync('supabase/migrations/0023a_aguerrissement_enum.sql','utf8'));
await db.exec(fs.readFileSync('supabase/migrations/0023b_stat_tiers_loot_willpower.sql','utf8'));
console.log('Stat tiers SQL OK: difficulté par stat (quêtes, projets), budget unique réparti au prorata, valeurs refusées, anciennes quêtes inchangées, butin de donjon (taux, quêtes flash exclues, hors plafond, une seule fois, plusieurs stats), RPC limitée au joueur, stat Aguerrissement, déclarations du réservoir (types, date, RLS, annulation), migrations rejouables.');
await db.close();})().catch(e=>{console.error(e);process.exitCode=1});
