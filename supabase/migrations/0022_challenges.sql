-- =====================================================================
-- Migration 0022 · Défis communs (ex. 100 pompes par jour)
-- =====================================================================
-- À exécuter après 0001 à 0021. Idempotent.
--
-- Un défi est un objectif quotidien partagé, d'une durée fixe. Le rejoindre
-- crée un projet (CAMPAGNE) dans les donjons du joueur ; chaque jour, une quête
-- datée de la fin de journée est créée côté serveur (ensure_challenge_quests).
-- Une journée manquée passe par le bilan « Quelle est ton excuse ? » existant.
-- Classement entre participants : pseudo + jours réussis uniquement.
-- =====================================================================
begin;

create table if not exists public.challenges (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null check (char_length(btrim(title)) between 3 and 80),
  description   text not null default '' check (char_length(description) <= 500),
  daily_goal    text not null check (char_length(btrim(daily_goal)) between 3 and 120),
  stat_kind     public.stat_kind not null default 'DISCIPLINE' check (stat_kind not in ('REVENU', 'RESIGNATION')),
  duration_days int not null check (duration_days between 3 and 100),
  minutes       int not null default 30 check (minutes between 5 and 240),
  created_by    uuid references public.profiles(user_id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  joined_at    timestamptz not null default now(),
  primary key (challenge_id, user_id)
);
create index if not exists idx_challenge_members_user on public.challenge_members(user_id);

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
revoke all on public.challenges, public.challenge_members from anon;

drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select to authenticated using (true);
drop policy if exists challenges_insert on public.challenges;
create policy challenges_insert on public.challenges for insert to authenticated with check (created_by = auth.uid());
drop policy if exists challenges_update on public.challenges;
create policy challenges_update on public.challenges for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
-- Son créateur peut supprimer un défi tant que personne d'autre ne l'a rejoint.
-- (Fonction security definer : la RLS de challenge_members masquerait les adhésions des autres.)
create or replace function public.challenge_has_other_members(p_challenge uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.challenge_members m where m.challenge_id = p_challenge and m.user_id <> auth.uid())
$$;
revoke all on function public.challenge_has_other_members(uuid) from public, anon;
grant execute on function public.challenge_has_other_members(uuid) to authenticated;
drop policy if exists challenges_delete on public.challenges;
create policy challenges_delete on public.challenges for delete to authenticated
  using (created_by = auth.uid() and not public.challenge_has_other_members(challenges.id));

-- Adhésions : chacun ne lit et ne quitte que les siennes ; on rejoint via join_challenge().
drop policy if exists challenge_members_read on public.challenge_members;
create policy challenge_members_read on public.challenge_members for select to authenticated using (user_id = auth.uid());
drop policy if exists challenge_members_leave on public.challenge_members;
create policy challenge_members_leave on public.challenge_members for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Liste des défis avec nombre de participants et adhésion du joueur.
-- ---------------------------------------------------------------------
create or replace function public.get_challenges()
returns table(
  id uuid, title text, description text, daily_goal text, stat_kind public.stat_kind,
  duration_days int, minutes int, mine boolean, official boolean, members int,
  joined_at timestamptz, project_id uuid
)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.description, c.daily_goal, c.stat_kind, c.duration_days, c.minutes,
         coalesce(c.created_by = auth.uid(), false), c.created_by is null,
         (select count(*)::int from public.challenge_members m where m.challenge_id = c.id),
         me.joined_at, me.project_id
    from public.challenges c
    left join public.challenge_members me on me.challenge_id = c.id and me.user_id = auth.uid()
   where auth.uid() is not null
   order by (c.created_by is null) desc, c.created_at desc
   limit 200
$$;

-- ---------------------------------------------------------------------
-- Rejoindre : crée le projet du défi et l'adhésion, de façon atomique.
-- ---------------------------------------------------------------------
create or replace function public.join_challenge(p_challenge uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  c public.challenges%rowtype;
  v_project uuid;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  select * into c from public.challenges where id = p_challenge;
  if not found then raise exception 'Défi introuvable'; end if;
  select project_id into v_project from public.challenge_members
   where challenge_id = c.id and user_id = auth.uid() for update;
  if found then return v_project; end if;

  insert into public.projects(user_id, type, title, description, status, primary_stat, starts_at, ends_at)
  values (auth.uid(), 'CAMPAIGN', left('Défi · ' || c.title, 120), c.daily_goal, 'ACTIVE', c.stat_kind,
          now(), now() + make_interval(days => c.duration_days))
  returning id into v_project;

  insert into public.challenge_members(challenge_id, user_id, project_id) values (c.id, auth.uid(), v_project);
  return v_project;
end;
$$;

-- ---------------------------------------------------------------------
-- Quête du jour de chaque défi en cours (journée locale fournie par le client).
-- ---------------------------------------------------------------------
create or replace function public.ensure_challenge_quests(p_day_start timestamptz, p_day_end timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare
  m record;
  v_created int := 0;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_day_start is null or p_day_end is null
     or p_day_end - p_day_start not between interval '22 hours' and interval '26 hours'
     or p_day_start > now() or p_day_end <= now() then
    raise exception 'Journée invalide';
  end if;

  for m in
    select cm.project_id, c.daily_goal, c.stat_kind, c.minutes
      from public.challenge_members cm
      join public.challenges c on c.id = cm.challenge_id
      join public.projects p on p.id = cm.project_id
     where cm.user_id = auth.uid()
       and p.status = 'ACTIVE'
       and p_day_start < cm.joined_at + make_interval(days => c.duration_days)
     for update of cm
  loop
    if not exists (select 1 from public.quests q
                    where q.project_id = m.project_id and q.due_at > p_day_start and q.due_at <= p_day_end) then
      insert into public.quests(user_id, project_id, title, status, difficulty_tier, estimated_minutes, reward_stats, due_at, is_flash)
      values (auth.uid(), m.project_id, m.daily_goal, 'PENDING', 'ROUTINE', m.minutes, array[m.stat_kind], p_day_end, false);
      v_created := v_created + 1;
    end if;
  end loop;
  return v_created;
end;
$$;

-- ---------------------------------------------------------------------
-- Classement d'un défi : pseudo, date d'adhésion, jours réussis (heure de Paris).
-- ---------------------------------------------------------------------
create or replace function public.get_challenge_board(p_challenge uuid)
returns table(display_name text, joined_at timestamptz, days_done int, days_total int, is_me boolean)
language sql stable security definer set search_path = public as $$
  select pr.display_name, cm.joined_at,
         (select count(distinct (q.completed_at at time zone 'Europe/Paris')::date)::int
            from public.quests q
           where q.project_id = cm.project_id and q.status = 'COMPLETED' and q.completed_at is not null),
         c.duration_days,
         cm.user_id = auth.uid()
    from public.challenge_members cm
    join public.challenges c on c.id = cm.challenge_id
    join public.profiles pr on pr.user_id = cm.user_id
   where cm.challenge_id = p_challenge and auth.uid() is not null
   order by 3 desc, cm.joined_at asc
   limit 100
$$;

revoke all on function public.get_challenges() from public, anon;
revoke all on function public.join_challenge(uuid) from public, anon;
revoke all on function public.ensure_challenge_quests(timestamptz, timestamptz) from public, anon;
revoke all on function public.get_challenge_board(uuid) from public, anon;
grant execute on function public.get_challenges() to authenticated;
grant execute on function public.join_challenge(uuid) to authenticated;
grant execute on function public.ensure_challenge_quests(timestamptz, timestamptz) to authenticated;
grant execute on function public.get_challenge_board(uuid) to authenticated;

-- Défis de départ (officiels : created_by null).
insert into public.challenges(title, description, daily_goal, stat_kind, duration_days, minutes)
select v.title, v.description, v.daily_goal, v.stat_kind::public.stat_kind, v.duration_days, v.minutes
  from (values
    ('100 pompes par jour', 'Le défi classique : cent pompes chaque jour, en autant de séries que nécessaire.', 'Faire 100 pompes', 'FORCE', 30, 20),
    ('Coucher avant 23 h 30', 'Retrouver un sommeil régulier en se couchant avant 23 h 30.', 'Me coucher avant 23 h 30', 'FORCE', 21, 15),
    ('10 000 pas', 'Marcher au moins 10 000 pas chaque jour.', 'Marcher 10 000 pas', 'FORCE', 30, 60),
    ('Lire 20 minutes', 'Lire au moins vingt minutes chaque jour.', 'Lire 20 minutes', 'INTELLIGENCE', 30, 20),
    ('Pas de réseaux avant midi', 'Ne pas ouvrir de réseau social avant midi.', 'Aucun réseau social avant midi', 'DISCIPLINE', 21, 15)
  ) as v(title, description, daily_goal, stat_kind, duration_days, minutes)
 where not exists (select 1 from public.challenges c where c.title = v.title and c.created_by is null);

notify pgrst, 'reload schema';
commit;

-- =====================================================================
-- FIN DE LA MIGRATION 0022
-- =====================================================================
