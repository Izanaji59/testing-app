// Notifications (0029) : mentions du tchat, inscriptions, événements modifiés ou annulés. PGlite, toutes les migrations.
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
  await db.exec(fs.readFileSync('supabase/migrations/0029_notifications.sql', 'utf8')); // ré-exécution sans effet

  const a = '00000000-0000-4000-8000-00000000000a', b = '00000000-0000-4000-8000-00000000000b', c = '00000000-0000-4000-8000-00000000000c';
  await db.exec(`grant usage on schema public to authenticated; grant select, insert on chat_messages to authenticated;
    insert into auth.users values('${a}'),('${b}'),('${c}');
    insert into profiles(user_id, display_name) values('${a}','Alpha'),('${b}','Beta'),('${c}','Gamma');`);
  const as = async (uid, role = 'authenticated') => { await db.exec('reset role'); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [uid || '']); await db.exec('set role ' + role); };
  const rows = async (sql, p) => (await db.query(sql, p)).rows;
  const mine = () => rows('select kind, title, body, link, read_at from notifications order by created_at');
  const inDays = d => new Date(Date.now() + d * 86400000).toISOString();

  // Mentions : chaque personne mentionnée une fois, jamais soi-même ni un profil inexistant ; extrait lisible.
  await as(a);
  const ghost = '00000000-0000-4000-8000-0000000000ff';
  await db.query('insert into chat_messages(user_id, sender_name, body) values($1,$2,$3)', [a, 'Alpha',
    `Salut @[Beta](u:${b}) et @[Gamma](u:${c}), @[Beta](u:${b}) encore, moi @[Alpha](u:${a}), @[X](u:${ghost}), tu as vu @[Light](c:anilist-char-80) ?`]);
  assert.equal((await mine()).length, 0, 'pas de notification pour soi');
  await as(b);
  let n = await mine();
  assert.equal(n.length, 1, 'une seule notification même si mentionné deux fois');
  assert.deepEqual([n[0].kind, n[0].title, n[0].link], ['mention', 'Alpha t’a mentionné dans le tchat', '/chat']);
  assert.ok(n[0].body.startsWith('Salut @Beta et @Gamma, @Beta encore') && n[0].body.includes('@Light') && !n[0].body.includes('u:'), 'extrait sans identifiants');
  await as(c); assert.equal((await mine()).length, 1);

  // Lecture et suppression : uniquement les siennes ; pas d'écriture directe.
  await as(b);
  assert.equal((await rows('select mark_notifications_read() n'))[0].n, 1);
  assert.ok((await mine())[0].read_at);
  assert.equal((await rows('select mark_notifications_read() n'))[0].n, 0, 'déjà lues');
  await assert.rejects(db.query(`insert into notifications(user_id, kind, title) values($1,'mention','Faux')`, [c]));
  await assert.rejects(db.query(`update notifications set title='x'`));
  await as(c); const cId = (await rows('select id from notifications'))[0].id;
  await as(b); await db.query('delete from notifications where id=$1', [cId]);
  await as(c); assert.equal((await mine()).length, 1, 'B ne peut pas supprimer la notification de C');
  await db.query('delete from notifications where id=$1', [cId]); assert.equal((await mine()).length, 0);

  // Événements : inscription → organisateur ; changement de date → inscrits ; description seule → rien ; annulation → inscrits.
  await as(a);
  const start = inDays(2);
  const ev = (await rows('select create_event($1,$2,$3,$4,$5,$6,$7,$8,$9) id', ['Soirée typage', 'Death Note', 'personnages', start, null, 'en_ligne', '', 'https://meet.example/x', null]))[0].id;
  await as(b); await db.query('select register_event($1)', [ev]);
  await as(c); await db.query('select register_event($1)', [ev]);
  await as(a);
  n = await mine();
  assert.deepEqual(n.map(x => [x.kind, x.title]), [['inscription', 'Beta s’inscrit à ton événement'], ['inscription', 'Gamma s’inscrit à ton événement']]);
  assert.equal(n[0].link, '/evenements/?id=' + ev);
  await db.query('select update_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [ev, 'Soirée typage', 'Nouvelle description', 'personnages', start, null, 'en_ligne', '', 'https://meet.example/x', null]);
  await as(b); assert.equal((await mine()).filter(x => x.kind !== 'mention').length, 0, 'description seule : pas de notification');
  await as(a);
  await db.query('select update_event($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [ev, 'Soirée typage', 'Nouvelle description', 'personnages', inDays(3), null, 'en_ligne', '', 'https://meet.example/y', null]);
  await db.query('select cancel_event($1)', [ev]);
  assert.equal((await mine()).filter(x => x.kind.startsWith('evenement')).length, 0, 'l’organisateur ne se notifie pas');
  await as(b);
  n = (await mine()).filter(x => x.kind !== 'mention');
  assert.deepEqual(n.map(x => x.kind), ['evenement_modifie', 'evenement_annule']);
  assert.equal(n[1].title, 'Événement annulé : Soirée typage');

  // Visiteurs non connectés : rien.
  await as(null, 'anon');
  await assert.rejects(db.query('select * from notifications'));
  await assert.rejects(db.query('select mark_notifications_read()'));
  await db.exec('reset role');
  await db.close();
  console.log('Notifications SQL OK: migrations 0001-0029 (idempotentes), mentions (une par personne, ni soi ni inconnu, extrait lisible), lecture/suppression des siennes uniquement, inscription → organisateur, modification et annulation → inscrits, anon refusé.');
})().catch(e => { console.error(e); process.exitCode = 1; });
