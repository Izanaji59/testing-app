-- =====================================================================
-- Migration 0027 · Communauté des personnages : vote complet et favoris
-- =====================================================================
-- À exécuter après 0026. Idempotente.
--
-- Vote : MBTI et/ou ennéagramme (type + aile adjacente), argument facultatif
-- (400 caractères, public avec le pseudo pour les membres connectés),
-- vote modifiable ou retirable, limite anti-abus.
-- Favoris : un cœur par personnage, visibles sur le profil public si le joueur
-- le choisit (profiles.show_fiction, filtré côté serveur comme 0021).
-- Réputation de typeur : votes, arguments et accord avec le consensus.
-- Aucune XP, aucune statistique de jeu modifiée.
-- =====================================================================
begin;

-- ── Votes ────────────────────────────────────────────────────────────
create or replace function public.f_valid_enneagram(p text)
returns boolean language plpgsql immutable set search_path=public as $$
declare core int; wing int;
begin
 if p is null or p !~ '^[1-9](w[1-9])?$' then return false; end if;
 if length(p)=1 then return true; end if;
 core := substr(p,1,1)::int; wing := substr(p,3,1)::int;
 return abs(core-wing)=1 or (core=1 and wing=9) or (core=9 and wing=1);
end $$;

alter table public.fiction_votes alter column mbti drop not null;
alter table public.fiction_votes add column if not exists enneagram text;
alter table public.fiction_votes add column if not exists reason text;
do $$ begin
  alter table public.fiction_votes add constraint fiction_votes_enneagram check (enneagram is null or public.f_valid_enneagram(enneagram));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fiction_votes add constraint fiction_votes_reason check (reason is null or char_length(reason) between 1 and 400);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fiction_votes add constraint fiction_votes_not_empty check (mbti is not null or enneagram is not null);
exception when duplicate_object then null; end $$;
create index if not exists idx_fiction_votes_user on public.fiction_votes(user_id, updated_at desc);

create or replace function public.cast_fiction_vote(p_character_id text, p_mbti text default null, p_enneagram text default null, p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare
 v_mbti text := nullif(upper(btrim(coalesce(p_mbti,''))),'');
 v_enn text := nullif(lower(btrim(coalesce(p_enneagram,''))),'');
 v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if not exists(select 1 from public.fiction_characters where id=p_character_id) then raise exception 'Personnage introuvable'; end if;
 if v_mbti is not null and v_mbti !~ '^[EI][NS][TF][JP]$' then raise exception 'Choisis un type MBTI valide'; end if;
 if v_enn is not null and not public.f_valid_enneagram(v_enn) then raise exception 'Choisis un ennéagramme valide (l’aile est un type voisin)'; end if;
 if v_mbti is null and v_enn is null then raise exception 'Choisis au moins un type MBTI ou un ennéagramme'; end if;
 if v_reason is not null and char_length(v_reason) > 400 then raise exception 'Argument trop long : 400 caractères maximum'; end if;
 if (select count(*) from public.fiction_votes where user_id=auth.uid() and updated_at > now() - interval '10 minutes') >= 200 then
   raise exception 'Trop de votes d’un coup : fais une pause de quelques minutes';
 end if;
 insert into public.fiction_votes(character_id,user_id,mbti,enneagram,reason)
 values(p_character_id,auth.uid(),v_mbti,v_enn,v_reason)
 on conflict(character_id,user_id) do update set mbti=excluded.mbti,enneagram=excluded.enneagram,reason=excluded.reason,updated_at=now();
end $$;

create or replace function public.clear_fiction_vote(p_character_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 delete from public.fiction_votes where character_id=p_character_id and user_id=auth.uid();
end $$;

-- Arguments publics : pseudo + vote + argument, pour les membres connectés uniquement.
create or replace function public.get_fiction_reasons(p_character_id text)
returns table(display_name text, mbti text, enneagram text, reason text, updated_at timestamptz, is_me boolean)
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 return query
 select coalesce(nullif(btrim(p.display_name),''), p.operator_code, 'Joueur'), v.mbti, v.enneagram, v.reason, v.updated_at, v.user_id=auth.uid()
   from public.fiction_votes v join public.profiles p on p.user_id=v.user_id
  where v.character_id=p_character_id and v.reason is not null
  order by (v.user_id=auth.uid()) desc, v.updated_at desc
  limit 50;
end $$;

-- ── Favoris ──────────────────────────────────────────────────────────
create table if not exists public.fiction_favorites (
 character_id text not null references public.fiction_characters(id) on delete cascade,
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(character_id,user_id)
);
create index if not exists idx_fiction_favorites_user on public.fiction_favorites(user_id, created_at desc);
alter table public.fiction_favorites enable row level security;
revoke all on public.fiction_favorites from public, anon, authenticated;

create or replace function public.toggle_fiction_favorite(p_character_id text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if not exists(select 1 from public.fiction_characters where id=p_character_id) then raise exception 'Personnage introuvable'; end if;
 if exists(select 1 from public.fiction_favorites where character_id=p_character_id and user_id=auth.uid()) then
   delete from public.fiction_favorites where character_id=p_character_id and user_id=auth.uid();
   return false;
 end if;
 if (select count(*) from public.fiction_favorites where user_id=auth.uid()) >= 500 then raise exception 'Tu as déjà 500 favoris'; end if;
 insert into public.fiction_favorites(character_id,user_id) values(p_character_id,auth.uid());
 return true;
end $$;

-- ── Profil public : ce que le joueur choisit de montrer ──────────────
alter table public.profiles add column if not exists show_fiction boolean not null default true;

create or replace function public.get_fiction_profile(p_user uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare visible boolean; agree int; considered int;
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 select (p.show_fiction or p.user_id=auth.uid()) into visible from public.profiles p where p.user_id=p_user;
 if visible is null then return null; end if;
 if not visible then return jsonb_build_object('visible',false); end if;
 with counts as (
   select character_id,mbti,count(*)::int n from public.fiction_votes where mbti is not null group by character_id,mbti
 ), totals as (
   select character_id,sum(n)::int total,array_agg(mbti order by n desc,mbti) types,array_agg(n order by n desc,mbti) numbers from counts group by character_id
 ), leaders as (
   select character_id,types[1] leader from totals where total>=3 and numbers[1]>coalesce(numbers[2],0)
 )
 select count(*) filter (where v.mbti=l.leader)::int, count(*)::int into agree, considered
   from public.fiction_votes v join leaders l on l.character_id=v.character_id
  where v.user_id=p_user and v.mbti is not null;
 return jsonb_build_object(
  'visible',true,
  'favorites',coalesce((select jsonb_agg(character_id order by created_at desc) from (select character_id,created_at from public.fiction_favorites where user_id=p_user order by created_at desc limit 24) f),'[]'::jsonb),
  'favoriteCount',(select count(*)::int from public.fiction_favorites where user_id=p_user),
  'votes',(select count(*)::int from public.fiction_votes where user_id=p_user),
  'reasons',(select count(*)::int from public.fiction_votes where user_id=p_user and reason is not null),
  'agreement',agree,'considered',considered
 );
end $$;

-- ── Vue d'ensemble : votes MBTI, ennéagramme, favoris ────────────────
create or replace function public.get_fiction_community()
returns jsonb language sql stable security definer set search_path=public as $$
 with counts as (
  select character_id,mbti,count(*)::int n from public.fiction_votes where mbti is not null group by character_id,mbti
 ), totals as (
  select character_id,jsonb_object_agg(mbti,n) counts,sum(n)::int total,
   array_agg(mbti order by n desc,mbti) types,array_agg(n order by n desc,mbti) numbers
  from counts group by character_id
 ), ecounts as (
  select character_id,split_part(enneagram,'w',1) core,count(*)::int n from public.fiction_votes where enneagram is not null group by character_id,split_part(enneagram,'w',1)
 ), etotals as (
  select character_id,jsonb_object_agg(core,n) counts,sum(n)::int total,
   array_agg(core order by n desc,core) types,array_agg(n order by n desc,core) numbers
  from ecounts group by character_id
 ), ewings as (
  -- Aile la plus votée pour le type en tête (sinon le type seul).
  select distinct on (v.character_id) v.character_id,v.enneagram full_type
    from public.fiction_votes v join etotals t on t.character_id=v.character_id
   where v.enneagram like t.types[1]||'w%'
   group by v.character_id,v.enneagram
   order by v.character_id,count(*) desc,v.enneagram
 ), images as (
  select distinct on(character_id) character_id,image_url from public.fiction_images order by character_id,updated_at desc,user_id
 ), favs as (
  select character_id,count(*)::int n from public.fiction_favorites group by character_id
 )
 select jsonb_build_object(
  'characters',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'titleId',c.title_id,'title',c.title,'image',c.image_url,'imageKind',c.image_kind,'source','community','sourceUrl','')) from public.fiction_characters c where c.source='community'),'[]'::jsonb),
  'images',coalesce((select jsonb_object_agg(character_id,image_url) from images),'{}'::jsonb),
  'votes',coalesce((select jsonb_object_agg(character_id,jsonb_build_object('counts',counts,'total',total,'leader',case when numbers[1]>coalesce(numbers[2],0) then types[1] else null end)) from totals),'{}'::jsonb),
  'enneagrams',coalesce((select jsonb_object_agg(t.character_id,jsonb_build_object('counts',t.counts,'total',t.total,'leader',case when t.numbers[1]>coalesce(t.numbers[2],0) then coalesce(w.full_type,t.types[1]) else null end)) from etotals t left join ewings w on w.character_id=t.character_id),'{}'::jsonb),
  'favorites',coalesce((select jsonb_object_agg(character_id,n) from favs),'{}'::jsonb),
  'myVotes',coalesce((select jsonb_object_agg(character_id,mbti) from public.fiction_votes where user_id=auth.uid() and mbti is not null),'{}'::jsonb),
  'myEnneagrams',coalesce((select jsonb_object_agg(character_id,enneagram) from public.fiction_votes where user_id=auth.uid() and enneagram is not null),'{}'::jsonb),
  'myReasons',coalesce((select jsonb_object_agg(character_id,reason) from public.fiction_votes where user_id=auth.uid() and reason is not null),'{}'::jsonb),
  'myFavorites',coalesce((select jsonb_agg(character_id order by created_at desc) from public.fiction_favorites where user_id=auth.uid()),'[]'::jsonb),
  'myType',(select mbti from public.profiles where user_id=auth.uid())
 )
$$;

revoke all on function public.cast_fiction_vote(text,text,text,text), public.clear_fiction_vote(text), public.get_fiction_reasons(text),
  public.toggle_fiction_favorite(text), public.get_fiction_profile(uuid) from public, anon;
grant execute on function public.cast_fiction_vote(text,text,text,text), public.clear_fiction_vote(text), public.get_fiction_reasons(text),
  public.toggle_fiction_favorite(text), public.get_fiction_profile(uuid) to authenticated;
revoke all on function public.get_fiction_community() from public;
grant execute on function public.get_fiction_community() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
