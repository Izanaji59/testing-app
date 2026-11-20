// @mentions et événements communautaires (0028), sur toutes les migrations réelles (PGlite).
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
  await db.exec(fs.readFileSync('supabase/migrations/0028_mentions_events.sql', 'utf8')); // ré-exécution sans effet

  const a = '00000000-0000-4000-8000-00000000000a', b = '00000000-0000-4000-8000-00000000000b', c = '00000000-0000-4000-8000-00000000000c';
  await db.exec(`grant usage on schema public to authenticated;
    insert into auth.users values('${a}'),('${b}'),('${c}');
    insert into profiles(user_id, display_name) values('${a}','Alpha'),('${b}','Alphonse'),('${c}','Beta');`);
  const as = async (uid, role = 'authenticated') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']); await db.exec('set role ' + role); };
  const rows = async (sql, p) => (await db.query(sql, p)).rows;
  const inDays = d => new Date(Date.now() + d * 86400000).toISOString();
  const create = (o = {}) => rows('select create_event($1,$2,$3,$4,$5,$6,$7,$8,$9) id', [
    o.title ?? 'Soirée typage', o.description ?? 'On type Death Note.', o.category ?? 'personnages', o.starts ?? inDays(2), o.ends ?? null,
    o.mode ?? 'en_ligne', o.place ?? '', o.url === undefined ? 'https://meet.example/abc' : o.url, o.capacity === undefined ? 2 : o.capacity]).then(r => r[0].id);

  // @mentions : préfixe insensible à la casse, pseudos uniquement ; caractères spéciaux sans effet.
  await as(c);
  assert.deepEqual((await rows('select display_name from search_mention_profiles($1)', ['alph'])).map(r => r.display_name), ['Alpha', 'Alphonse']);
  assert.deepEqual(Object.keys((await rows('select * from search_mention_profiles($1)', ['al']))[0]).sort(), ['display_name', 'user_id']);
  assert.equal((await rows('select * from search_mention_profiles($1)', ['%'])).length, 0, 'pas de joker');
  assert.equal((await rows('select * from search_mention_profiles($1)', [''])).length, 0);

  // Création : validations.
  await as(a);
  for (const bad of [{ title: 'ab' }, { category: 'x' }, { starts: inDays(-1) }, { starts: inDays(900) }, { ends: inDays(1) }, { mode: 'sur_place', place: '' },
    { url: 'http://meet.example' }, { url: 'javascript:alert(1)' }, { capacity: 0 }, { description: 'x'.repeat(2001) }])
    await assert.rejects(create(bad), JSON.stringify(bad));
  const ev = await create();
  const onSite = await create({ title: 'Échecs au parc', category: 'jeux', mode: 'sur_place', place: 'Lille, parc de la Citadelle', url: null, capacity: null });

  // Liste : le lien en ligne n'est visible que de l'organisateur et des inscrits.
  let list = await rows('select * from list_events($1)', ['a_venir']);
  assert.equal(list.length, 2); assert.equal(list[0].id, ev, 'tri par date');
  assert.equal(list.find(e => e.id === ev).online_url, 'https://meet.example/abc'); assert.equal(list[0].is_organizer, true);
  await as(b);
  let mine = (await rows('select * from list_events($1,$2)', ['a_venir', ev]))[0];
  assert.equal(mine.online_url, null, 'lien caché avant inscription'); assert.equal(mine.organizer_name, 'Alpha'); assert.equal(mine.participants, 0);

  // Inscription : idempotente, places limitées, désinscription.
  assert.equal((await rows('select register_event($1) n', [ev]))[0].n, 1);
  assert.equal((await rows('select register_event($1) n', [ev]))[0].n, 1, 'idempotent');
  mine = (await rows('select * from list_events($1,$2)', ['a_venir', ev]))[0];
  assert.equal(mine.registered, true); assert.equal(mine.online_url, 'https://meet.example/abc');
  await as(c); assert.equal((await rows('select register_event($1) n', [ev]))[0].n, 2);
  await as(a); await assert.rejects(db.query('select register_event($1)', [ev]), /Complet/);
  assert.equal((await rows('select register_event($1) n', [onSite]))[0].n, 1, 'sans limite de places');

  // Participants : réservés à l'organisateur ; « mes » événements.
  assert.deepEqual((await rows('select display_name from get_event_participants($1)', [ev])).map(r => r.display_name), ['Alphonse', 'Beta']);
  await as(b); await assert.rejects(db.query('select * from get_event_participants($1)', [ev]), /organisateur/);
  assert.deepEqual((await rows('select id from list_events($1)', ['mes'])).map(r => r.id), [ev]);
  await db.query('select unregister_event($1)', [ev]);
  assert.equal((await rows('select * from list_events($1,$2)', ['a_venir', ev]))[0].participants, 1);

  // Modification et annulation : organisateur seulement ; places jamais sous les inscrits.
  await assert.rejects(db.query('select update_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [ev, 'Piratage', '', 'autre', inDays(3), null, 'en_ligne', '', null, null]), /organisateur/);
  await assert.rejects(db.query('select cancel_event($1)', [ev]), /organisateur/);
  await as(a);
  await db.query('select update_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [ev, 'Soirée typage (2e)', 'Suite.', 'personnages', inDays(3), inDays(3.1), 'en_ligne', '', 'https://meet.example/xyz', 5]);
  assert.equal((await rows('select * from list_events($1,$2)', ['a_venir', ev]))[0].title, 'Soirée typage (2e)');
  await db.query('select register_event($1)', [onSite]);
  await as(b); await db.query('select register_event($1)', [onSite]);
  await as(a); await assert.rejects(db.query('select update_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [onSite, 'Échecs au parc', '', 'jeux', inDays(2), null, 'sur_place', 'Lille', null, 1]), /inscrits/);
  await db.query('select cancel_event($1)', [ev]);
  await as(b); await assert.rejects(db.query('select register_event($1)', [ev]), /annulé/);
  assert.equal((await rows('select * from list_events($1)', ['a_venir'])).some(e => e.id === ev), false, 'annulé : caché aux non-inscrits');
  await as(c);
  assert.equal((await rows('select * from list_events($1)', ['a_venir'])).find(e => e.id === ev)?.cancelled, true, 'un inscrit voit l’annulation');

  // Événements passés : plus d'inscription ; liste « passes ».
  await db.exec('reset role');
  await db.query(`update community_events set starts_at=now()-interval '2 days', ends_at=now()-interval '1 day' where id=$1`, [onSite]);
  await as(c);
  await assert.rejects(db.query('select register_event($1)', [onSite]), /terminé/);
  assert.deepEqual((await rows('select id from list_events($1)', ['passes'])).map(r => r.id), [onSite]);

  // Limite : 5 créations par jour. Tables jamais accessibles directement.
  await as(b);
  for (let i = 0; i < 5; i++) await create({ title: 'Événement ' + i });
  await assert.rejects(create({ title: 'Un de trop' }), /5 événements/);
  await assert.rejects(db.query('select * from community_events'));
  await assert.rejects(db.query('select * from event_registrations'));
  await assert.rejects(db.query('insert into event_registrations(event_id,user_id) values($1,$2)', [onSite, b]));

  // Visiteurs non connectés : rien.
  await as(null, 'anon');
  await assert.rejects(db.query('select * from list_events($1)', ['a_venir']));
  await assert.rejects(db.query('select * from search_mention_profiles($1)', ['al']));
  await assert.rejects(db.query('select register_event($1)', [ev]));
  await db.exec('reset role');
  await db.close();
  console.log('Events SQL OK: migrations 0001-0028 (idempotentes), @mentions (préfixe, pseudos seuls), création validée, lien en ligne réservé aux inscrits, places limitées, inscription idempotente, participants pour l’organisateur seul, modification/annulation, événements passés, limite de création, anon refusé.');
})().catch(e => { console.error(e); process.exitCode = 1; });
