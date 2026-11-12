// Visibilité du profil public et pseudo obligatoire, sur toutes les migrations réelles (PGlite, aucune base distante).
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('fs'), assert = require('assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create publication supabase_realtime;`);
  for (const name of fs.readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort())
    await db.exec(fs.readFileSync('supabase/migrations/' + name, 'utf8').replace(/^create extension[^;]+;/gm, ''));
  const m21 = fs.readFileSync('supabase/migrations/0021_profile_visibility.sql', 'utf8');
  await db.exec(m21); // ré-exécution sans effet

  const me = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
  await db.exec(`grant select,insert,update,delete on all tables in schema public to authenticated;
    insert into auth.users values('${me}'),('${other}');
    insert into profiles(user_id, display_name, mbti, mbti_class) values('${me}','Sosso',null,'NON CALIBRÉ'),('${other}','  ','INTJ','VISIONNAIRE');`);
  const row = async (sql, params) => (await db.query(sql, params)).rows;

  // Pseudo obligatoire : vide → code opérateur, jamais null.
  const [o] = await row('select display_name, operator_code from profiles where user_id=$1', [other]);
  assert.equal(o.display_name, o.operator_code);
  await db.query(`update profiles set display_name='   ' where user_id=$1`, [me]);
  assert.match((await row('select display_name from profiles where user_id=$1', [me]))[0].display_name, /^OPERATOR_/);
  await db.query(`update profiles set display_name=null where user_id=$1`, [me]);
  assert.match((await row('select display_name from profiles where user_id=$1', [me]))[0].display_name, /^OPERATOR_/);
  assert.equal((await row(`select count(*)::int as n from pg_constraint where conname='profiles_display_name_required'`))[0].n, 1);
  await db.query(`update profiles set display_name='Sosso' where user_id=$1`, [me]);

  const as = async (uid) => db.exec(`reset role; set role authenticated; set request.jwt.claim.sub='${uid}';`);
  const pub = async (uid) => (await row('select * from get_public_profile($1)', [uid]))[0];
  const kinds = async (uid) => (await row('select kind from get_public_stats($1) order by kind', [uid])).map(r => r.kind);

  // Par défaut : stats, rang et MBTI visibles ; dimension économique masquée.
  await as(me);
  let p = await pub(other);
  assert.equal(p.mbti_class, 'VISIONNAIRE');
  assert.equal(typeof p.level, 'number'); assert.ok(p.rank_letter); assert.ok(p.total_xp !== null);
  assert.deepEqual([p.show_stats, p.show_revenue, p.show_rank, p.show_mbti], [true, false, true, true]);
  let k = await kinds(other);
  assert.ok(k.length > 3 && !k.includes('REVENU') && k.includes('DISCIPLINE'));

  // Le joueur masque tout sauf l'économie : les autres ne reçoivent plus rien d'autre.
  await as(other);
  await db.query('update profiles set show_stats=false, show_rank=false, show_mbti=false, show_revenue=true where user_id=$1', [other]);
  await as(me);
  p = await pub(other);
  assert.equal(p.display_name, o.operator_code, 'pseudo toujours visible');
  assert.deepEqual([p.level, p.rank_letter, p.rank_tier, p.total_xp, p.mbti_class], [null, null, null, null, null]);
  assert.deepEqual(await kinds(other), ['REVENU']);

  // Un autre joueur ne peut pas changer les préférences d'autrui (RLS : uniquement son profil).
  await db.query('update profiles set show_mbti=true where user_id=$1', [other]);
  await db.exec('reset role');
  assert.equal((await row('select show_mbti from profiles where user_id=$1', [other]))[0].show_mbti, false);

  // Les visiteurs non connectés n'ont pas accès aux profils publics.
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from get_public_profile($1)', [other]));
  await assert.rejects(db.query('select * from get_public_stats($1)', [other]));
  await db.exec('reset role');
  await db.close();
  console.log('Profile visibility SQL OK: migrations 0001-0021, défauts, champs masqués côté serveur, stat REVENU séparée, pseudo jamais vide, RLS, anon refusé.');
})().catch(e => { console.error(e); process.exitCode = 1; });
