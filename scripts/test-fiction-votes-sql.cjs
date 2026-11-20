// Communauté des personnages (0027) : vote MBTI + ennéagramme + argument, favoris, profil public.
// Toutes les migrations réelles sur PGlite (aucune base distante).
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('fs'), assert = require('assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth,storage to anon,authenticated;create function uuid_generate_v4() returns uuid language sql as $$select gen_random_uuid()$$;create publication supabase_realtime;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
    create function storage.extension(text) returns text language sql immutable as $$select regexp_replace($1,'^.*[.]','')$$;`);
  for (const name of fs.readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort())
    await db.exec(fs.readFileSync('supabase/migrations/' + name, 'utf8').replace(/^create extension[^;]+;/gm, ''));
  await db.exec(fs.readFileSync('supabase/migrations/0027_fiction_votes_favorites.sql', 'utf8')); // ré-exécution sans effet

  const a = '00000000-0000-4000-8000-00000000000a', b = '00000000-0000-4000-8000-00000000000b', c = '00000000-0000-4000-8000-00000000000c';
  await db.exec(`grant usage on schema public to authenticated; grant select, update on profiles to authenticated;
    insert into auth.users values('${a}'),('${b}'),('${c}');
    insert into profiles(user_id, display_name, mbti) values('${a}','Alpha','INTJ'),('${b}','Beta',null),('${c}','Gamma',null);
    insert into fiction_characters(id,name,title_id,title,source) values('anilist-char-1','Light','tmdb-tv-1','Death Note','anilist'),('anilist-char-2','L','tmdb-tv-1','Death Note','anilist');`);
  const as = async (uid, role = 'authenticated') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']); await db.exec('set role ' + role); };
  const rows = async (sql, p) => (await db.query(sql, p)).rows;
  const read = async () => (await rows('select get_fiction_community() d'))[0].d;
  const cast = (id, mbti, enn, reason) => db.query('select cast_fiction_vote($1,$2,$3,$4)', [id, mbti, enn, reason]);

  // Ennéagramme : type seul ou aile adjacente (1 et 9 sont voisins).
  for (const ok of ['4', '4w5', '4w3', '1w9', '9w1', '9w8']) assert.equal((await rows('select f_valid_enneagram($1) v', [ok]))[0].v, true, ok);
  for (const ko of ['4w6', '4w4', '2w8', '10', 'w5', '4w', '', '4W5x']) assert.equal((await rows('select f_valid_enneagram($1) v', [ko]))[0].v, false, ko);

  // Votes : MBTI et/ou ennéagramme, argument facultatif, entrées invalides refusées.
  await as(a);
  await cast('anilist-char-1', 'intj', '5w4', '  Il planifie tout, seul.  ');
  await cast('anilist-char-2', null, '5w6', null);
  for (const bad of [[null, null, null], ['INTX', null, null], [null, '4w6', null], ['INTJ', null, 'x'.repeat(401)]])
    await assert.rejects(cast('anilist-char-1', ...bad), String(bad));
  await assert.rejects(cast('anilist-char-999', 'INTJ', null, null), /introuvable/);
  let d = await read();
  assert.equal(d.myVotes['anilist-char-1'], 'INTJ'); assert.equal(d.myEnneagrams['anilist-char-1'], '5w4');
  assert.equal(d.myReasons['anilist-char-1'], 'Il planifie tout, seul.'); assert.equal(d.myType, 'INTJ');
  assert.equal(d.myVotes['anilist-char-2'], undefined, 'vote ennéagramme seul : pas de MBTI');
  assert.equal(d.votes['anilist-char-2'], undefined, 'les votes sans MBTI ne comptent pas dans la répartition MBTI');
  assert.deepEqual(d.enneagrams['anilist-char-2'], { counts: { 5: 1 }, total: 1, leader: '5w6' });

  // L'ancien vote MBTI ne touche ni à l'ennéagramme ni à l'argument.
  await db.query('select vote_fiction_character($1,$2)', ['anilist-char-1', 'ENTJ']);
  d = await read(); assert.equal(d.myVotes['anilist-char-1'], 'ENTJ'); assert.equal(d.myEnneagrams['anilist-char-1'], '5w4');
  await cast('anilist-char-1', 'INTJ', '5w4', 'Il planifie tout, seul.');

  // Consensus : égalité = pas de type en tête ; aile la plus votée pour le type en tête.
  await as(b); await cast('anilist-char-1', 'ENTJ', '3w4', null);
  d = await read(); assert.equal(d.votes['anilist-char-1'].leader, null); assert.equal(d.enneagrams['anilist-char-1'].leader, null);
  await as(c); await cast('anilist-char-1', 'INTJ', '5w6', 'Ti-Ni, froid et méthodique.');
  d = await read();
  assert.equal(d.votes['anilist-char-1'].leader, 'INTJ'); assert.equal(d.votes['anilist-char-1'].total, 3);
  assert.equal(d.enneagrams['anilist-char-1'].total, 3);
  assert.ok(['5w4', '5w6'].includes(d.enneagrams['anilist-char-1'].leader));
  assert.equal(d.myType, null);

  // Arguments : pseudo + vote, le sien en premier ; réservé aux membres connectés.
  const reasons = await rows('select * from get_fiction_reasons($1)', ['anilist-char-1']);
  assert.deepEqual(reasons.map(r => [r.display_name, r.mbti, r.is_me]), [['Gamma', 'INTJ', true], ['Alpha', 'INTJ', false]]);
  assert.deepEqual(Object.keys(reasons[0]).sort(), ['display_name', 'enneagram', 'is_me', 'mbti', 'reason', 'updated_at']);

  // Retirer son vote.
  await db.query('select clear_fiction_vote($1)', ['anilist-char-1']);
  d = await read(); assert.equal(d.votes['anilist-char-1'].total, 2); assert.equal(d.myVotes['anilist-char-1'], undefined);
  await cast('anilist-char-1', 'INTJ', '5w6', 'Ti-Ni, froid et méthodique.');

  // Favoris : bascule, compte public, liste personnelle ; table jamais accessible directement.
  assert.equal((await rows('select toggle_fiction_favorite($1) v', ['anilist-char-1']))[0].v, true);
  assert.equal((await rows('select toggle_fiction_favorite($1) v', ['anilist-char-2']))[0].v, true);
  assert.equal((await rows('select toggle_fiction_favorite($1) v', ['anilist-char-2']))[0].v, false);
  await as(a); await db.query('select toggle_fiction_favorite($1)', ['anilist-char-1']);
  d = await read(); assert.equal(d.favorites['anilist-char-1'], 2); assert.equal(d.favorites['anilist-char-2'], undefined);
  assert.deepEqual(d.myFavorites, ['anilist-char-1']);
  await assert.rejects(db.query('select * from fiction_favorites'));
  await assert.rejects(db.query('insert into fiction_favorites(character_id,user_id) values($1,$2)', ['anilist-char-2', a]));
  await assert.rejects(db.query('update fiction_votes set mbti=$1', ['INFP']));
  await assert.rejects(db.query('select toggle_fiction_favorite($1)', ['anilist-char-999']), /introuvable/);

  // Profil public : favoris + réputation, masqués si le joueur le choisit (lui seul les voit encore).
  await as(c);
  let p = (await rows('select get_fiction_profile($1) p', [a]))[0].p;
  assert.equal(p.visible, true); assert.deepEqual(p.favorites, ['anilist-char-1']); assert.equal(p.favoriteCount, 1);
  assert.equal(p.votes, 2); assert.equal(p.reasons, 1); assert.equal(p.considered, 1); assert.equal(p.agreement, 1, 'INTJ = consensus sur Light (3 votes)');
  await as(a); await db.query('update profiles set show_fiction=false where user_id=$1', [a]);
  assert.equal((await rows('select get_fiction_profile($1) p', [a]))[0].p.visible, true, 'le joueur voit toujours son propre profil');
  await as(c); p = (await rows('select get_fiction_profile($1) p', [a]))[0].p;
  assert.deepEqual(p, { visible: false }, 'rien d’autre ne sort');
  assert.equal((await rows('select get_fiction_profile($1) p', ['00000000-0000-4000-8000-0000000000ff']))[0].p, null);

  // Limite anti-abus : 200 votes en 10 minutes.
  await db.exec('reset role');
  await db.exec(`insert into fiction_characters(id,name,title,source) select 'anilist-char-'||(1000+g),'Figurant '||g,'Foule','anilist' from generate_series(1,200) g;
    insert into fiction_votes(character_id,user_id,mbti) select 'anilist-char-'||(1000+g),'${b}','ISFJ' from generate_series(1,200) g;`);
  await as(b); await assert.rejects(cast('anilist-char-2', 'INTP', null, null), /pause/);

  // Visiteurs non connectés : la vue d'ensemble seulement.
  await as(null, 'anon');
  d = await read(); assert.deepEqual(d.myFavorites, []); assert.equal(d.myType, null); assert.equal(d.favorites['anilist-char-1'], 2);
  await assert.rejects(cast('anilist-char-1', 'INTJ', null, null));
  await assert.rejects(db.query('select * from get_fiction_reasons($1)', ['anilist-char-1']));
  await assert.rejects(db.query('select toggle_fiction_favorite($1)', ['anilist-char-1']));
  await assert.rejects(db.query('select get_fiction_profile($1)', [a]));
  await db.exec('reset role');
  await db.close();
  console.log('Fiction votes SQL OK: migrations 0001-0027 (idempotentes), MBTI et/ou ennéagramme avec aile adjacente, argument public avec pseudo (membres), vote modifiable et retirable, consensus et égalités, favoris, profil public filtré par show_fiction, réputation, limite anti-abus, anon limité à la vue d’ensemble.');
})().catch(e => { console.error(e); process.exitCode = 1; });
