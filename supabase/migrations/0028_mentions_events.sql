-- =====================================================================
-- Migration 0028 · @mentions et événements communautaires (façon Eventbrite)
-- =====================================================================
-- À exécuter après 0027. Idempotente.
--
-- @mentions : recherche de pseudos pour l'autocomplétion (le pseudo est la seule
-- donnée toujours publique). La fiche d'un @profil passe ensuite par
-- get_public_profile / get_fiction_profile, qui appliquent les choix de visibilité.
--
-- Événements : un membre crée un événement (en ligne ou sur place), les autres
-- s'inscrivent dans la limite des places. Le lien de connexion d'un événement en
-- ligne n'est visible que des inscrits et de l'organisateur ; la liste des
-- participants, que de l'organisateur. Aucune XP.
-- =====================================================================
begin;

-- ── @mentions ────────────────────────────────────────────────────────
create or replace function public.search_mention_profiles(p_query text)
returns table(user_id uuid, display_name text)
language plpgsql stable security definer set search_path=public as $$
declare q text := lower(btrim(coalesce(p_query,'')));
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if char_length(q) < 1 or char_length(q) > 40 then return; end if;
 return query
 select p.user_id, coalesce(nullif(btrim(p.display_name),''), p.operator_code)
   from public.profiles p
  where left(lower(coalesce(nullif(btrim(p.display_name),''), p.operator_code)), char_length(q)) = q
  order by lower(coalesce(nullif(btrim(p.display_name),''), p.operator_code))
  limit 8;
end $$;

-- ── Événements ───────────────────────────────────────────────────────
create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  organizer uuid not null references public.profiles(user_id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 100),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null check (category in ('rencontre','jeux','personnages','sommeil','grindleveling','autre')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  mode text not null check (mode in ('en_ligne','sur_place')),
  place text not null default '' check (char_length(place) <= 200),
  online_url text check (online_url is null or (char_length(online_url) <= 500 and online_url ~ '^https://[^[:space:]<>"]+$')),
  capacity int check (capacity is null or capacity between 1 and 1000),
  cancelled boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (mode = 'en_ligne' or char_length(btrim(place)) >= 2)
);
create index if not exists idx_community_events_start on public.community_events(starts_at);

create table if not exists public.event_registrations (
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists idx_event_registrations_user on public.event_registrations(user_id);

alter table public.community_events enable row level security;
alter table public.event_registrations enable row level security;
revoke all on public.community_events, public.event_registrations from public, anon, authenticated;

-- Fin effective d'un événement (3 h par défaut sans heure de fin).
create or replace function public.f_event_end(p_start timestamptz, p_end timestamptz)
returns timestamptz language sql immutable as $$ select coalesce(p_end, p_start + interval '3 hours') $$;

create or replace function public.f_check_event(p_title text, p_description text, p_category text, p_starts_at timestamptz, p_ends_at timestamptz, p_mode text, p_place text, p_online_url text, p_capacity int)
returns void language plpgsql stable set search_path=public as $$
begin
 if p_title is null or char_length(btrim(p_title)) not between 3 and 100 then raise exception 'Donne un titre de 3 à 100 caractères'; end if;
 if char_length(coalesce(p_description,'')) > 2000 then raise exception 'Description trop longue : 2000 caractères maximum'; end if;
 if p_category is null or p_category not in ('rencontre','jeux','personnages','sommeil','grindleveling','autre') then raise exception 'Choisis une catégorie'; end if;
 if p_starts_at is null or p_starts_at < now() then raise exception 'Choisis une date à venir'; end if;
 if p_starts_at > now() + interval '2 years' then raise exception 'La date est trop lointaine'; end if;
 if p_ends_at is not null and p_ends_at <= p_starts_at then raise exception 'La fin doit être après le début'; end if;
 if p_mode is null or p_mode not in ('en_ligne','sur_place') then raise exception 'Choisis en ligne ou sur place'; end if;
 if p_mode = 'sur_place' and char_length(btrim(coalesce(p_place,''))) < 2 then raise exception 'Indique le lieu'; end if;
 if p_online_url is not null and btrim(p_online_url) <> '' and (char_length(p_online_url) > 500 or p_online_url !~ '^https://[^[:space:]<>"]+$') then raise exception 'Le lien doit commencer par https://'; end if;
 if p_capacity is not null and p_capacity not between 1 and 1000 then raise exception 'Le nombre de places va de 1 à 1000'; end if;
end $$;

create or replace function public.create_event(p_title text, p_description text, p_category text, p_starts_at timestamptz, p_ends_at timestamptz, p_mode text, p_place text, p_online_url text, p_capacity int)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 perform public.f_check_event(p_title,p_description,p_category,p_starts_at,p_ends_at,p_mode,p_place,p_online_url,p_capacity);
 if (select count(*) from public.community_events where organizer=auth.uid() and created_at > now() - interval '1 day') >= 5 then
   raise exception 'Tu as déjà créé 5 événements aujourd’hui';
 end if;
 insert into public.community_events(organizer,title,description,category,starts_at,ends_at,mode,place,online_url,capacity)
 values(auth.uid(),btrim(p_title),coalesce(btrim(p_description),''),p_category,p_starts_at,p_ends_at,p_mode,
        case when p_mode='sur_place' then btrim(p_place) else coalesce(btrim(p_place),'') end,
        nullif(btrim(coalesce(p_online_url,'')),''),p_capacity)
 returning id into v_id;
 return v_id;
end $$;

create or replace function public.update_event(p_id uuid, p_title text, p_description text, p_category text, p_starts_at timestamptz, p_ends_at timestamptz, p_mode text, p_place text, p_online_url text, p_capacity int)
returns void language plpgsql security definer set search_path=public as $$
declare e public.community_events%rowtype;
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 select * into e from public.community_events where id=p_id for update;
 if not found or e.organizer <> auth.uid() then raise exception 'Seul l’organisateur peut modifier cet événement'; end if;
 if e.cancelled then raise exception 'Cet événement est annulé'; end if;
 perform public.f_check_event(p_title,p_description,p_category,p_starts_at,p_ends_at,p_mode,p_place,p_online_url,p_capacity);
 if p_capacity is not null and p_capacity < (select count(*) from public.event_registrations where event_id=p_id) then
   raise exception 'Il y a déjà plus d’inscrits que ce nombre de places';
 end if;
 update public.community_events set title=btrim(p_title),description=coalesce(btrim(p_description),''),category=p_category,
   starts_at=p_starts_at,ends_at=p_ends_at,mode=p_mode,place=coalesce(btrim(p_place),''),
   online_url=nullif(btrim(coalesce(p_online_url,'')),''),capacity=p_capacity
  where id=p_id;
end $$;

create or replace function public.cancel_event(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 update public.community_events set cancelled=true where id=p_id and organizer=auth.uid();
 if not found then raise exception 'Seul l’organisateur peut annuler cet événement'; end if;
end $$;

-- Liste : « a_venir », « mes » (organisés ou inscrits), « passes ». p_id : un seul événement (lien partagé).
create or replace function public.list_events(p_scope text default 'a_venir', p_id uuid default null)
returns table(id uuid, title text, description text, category text, starts_at timestamptz, ends_at timestamptz,
  mode text, place text, online_url text, capacity int, cancelled boolean, organizer_id uuid, organizer_name text,
  participants int, registered boolean, is_organizer boolean)
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 return query
 with base as (
  select e.*, (select count(*)::int from public.event_registrations r where r.event_id=e.id) n,
         exists(select 1 from public.event_registrations r where r.event_id=e.id and r.user_id=auth.uid()) me,
         e.organizer=auth.uid() org
    from public.community_events e
   where (p_id is not null and e.id=p_id)
      or (p_id is null and (
           (p_scope='a_venir' and public.f_event_end(e.starts_at,e.ends_at) >= now() and (not e.cancelled or e.organizer=auth.uid()
              or exists(select 1 from public.event_registrations r where r.event_id=e.id and r.user_id=auth.uid())))
        or (p_scope='mes' and (e.organizer=auth.uid() or exists(select 1 from public.event_registrations r where r.event_id=e.id and r.user_id=auth.uid())))
        or (p_scope='passes' and public.f_event_end(e.starts_at,e.ends_at) < now() and not e.cancelled)))
 )
 select b.id, b.title, b.description, b.category, b.starts_at, b.ends_at, b.mode, b.place,
        case when b.me or b.org then b.online_url end,
        b.capacity, b.cancelled, b.organizer,
        coalesce(nullif(btrim(p.display_name),''), p.operator_code, 'Joueur'),
        b.n, b.me, b.org
   from base b join public.profiles p on p.user_id=b.organizer
  order by case when p_scope='passes' then null else b.starts_at end asc nulls last, b.starts_at desc
  limit 100;
end $$;

create or replace function public.register_event(p_id uuid)
returns int language plpgsql security definer set search_path=public as $$
declare e public.community_events%rowtype; taken int;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 select * into e from public.community_events where id=p_id for update;
 if not found then raise exception 'Événement introuvable'; end if;
 if e.cancelled then raise exception 'Cet événement est annulé'; end if;
 if public.f_event_end(e.starts_at,e.ends_at) < now() then raise exception 'Cet événement est terminé'; end if;
 if exists(select 1 from public.event_registrations where event_id=p_id and user_id=auth.uid()) then
   return (select count(*)::int from public.event_registrations where event_id=p_id);
 end if;
 select count(*)::int into taken from public.event_registrations where event_id=p_id;
 if e.capacity is not null and taken >= e.capacity then raise exception 'Complet : il n’y a plus de place'; end if;
 insert into public.event_registrations(event_id,user_id) values(p_id,auth.uid());
 return taken + 1;
end $$;

create or replace function public.unregister_event(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 delete from public.event_registrations where event_id=p_id and user_id=auth.uid();
end $$;

create or replace function public.get_event_participants(p_id uuid)
returns table(display_name text, registered_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if not exists(select 1 from public.community_events where id=p_id and organizer=auth.uid()) then
   raise exception 'Seul l’organisateur voit la liste des participants';
 end if;
 return query
 select coalesce(nullif(btrim(p.display_name),''), p.operator_code, 'Joueur'), r.created_at
   from public.event_registrations r join public.profiles p on p.user_id=r.user_id
  where r.event_id=p_id order by r.created_at;
end $$;

revoke all on function public.search_mention_profiles(text), public.create_event(text,text,text,timestamptz,timestamptz,text,text,text,int),
  public.update_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,int), public.cancel_event(uuid),
  public.list_events(text,uuid), public.register_event(uuid), public.unregister_event(uuid), public.get_event_participants(uuid),
  public.f_check_event(text,text,text,timestamptz,timestamptz,text,text,text,int) from public, anon;
grant execute on function public.search_mention_profiles(text), public.create_event(text,text,text,timestamptz,timestamptz,text,text,text,int),
  public.update_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,int), public.cancel_event(uuid),
  public.list_events(text,uuid), public.register_event(uuid), public.unregister_event(uuid), public.get_event_participants(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
