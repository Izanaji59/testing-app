-- =====================================================================
-- Migration 0024 · Défis à plusieurs stats, chacune avec sa difficulté
-- =====================================================================
-- À exécuter après 0023b. Idempotente.
-- Un défi porte `stat_tiers` comme les quêtes et les donjons ; `stat_kind` suit la
-- stat la plus difficile (compatibilité). Le projet créé en rejoignant le défi et
-- chaque quête du jour reprennent ces stats ; la difficulté de la quête devient la
-- plus haute (triggers a0_* de 0023b). Les défis sans stat_tiers restent comme avant
-- (une stat, quête routinière).
-- =====================================================================
begin;

alter table public.challenges add column if not exists stat_tiers jsonb;

create or replace function public.trg_challenge_stat_tiers()
returns trigger language plpgsql set search_path=public as $$
declare top stat_kind;
begin
 new.stat_tiers := public.f_clean_stat_tiers(new.stat_tiers);
 if new.stat_tiers is not null then
   select kind into top from public.f_stat_weights(new.stat_tiers) order by weight desc, kind::text limit 1;
   new.stat_kind := top;
 end if;
 return new;
end $$;
drop trigger if exists a0_challenge_stat_tiers on public.challenges;
create trigger a0_challenge_stat_tiers before insert or update on public.challenges
for each row execute function public.trg_challenge_stat_tiers();

-- La liste renvoie aussi stat_tiers (type de retour modifié : la fonction est recréée).
drop function if exists public.get_challenges();
create function public.get_challenges()
returns table(
  id uuid, title text, description text, daily_goal text, stat_kind public.stat_kind, stat_tiers jsonb,
  duration_days int, minutes int, mine boolean, official boolean, members int,
  joined_at timestamptz, project_id uuid
)
language sql stable security definer set search_path = public as $$
  select c.id, c.title, c.description, c.daily_goal, c.stat_kind, c.stat_tiers, c.duration_days, c.minutes,
         coalesce(c.created_by = auth.uid(), false), c.created_by is null,
         (select count(*)::int from public.challenge_members m where m.challenge_id = c.id),
         me.joined_at, me.project_id
    from public.challenges c
    left join public.challenge_members me on me.challenge_id = c.id and me.user_id = auth.uid()
   where auth.uid() is not null
   order by (c.created_by is null) desc, c.created_at desc
   limit 200
$$;
revoke all on function public.get_challenges() from public, anon;
grant execute on function public.get_challenges() to authenticated;

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

  insert into public.projects(user_id, type, title, description, status, primary_stat, stat_tiers, starts_at, ends_at)
  values (auth.uid(), 'CAMPAIGN', left('Défi · ' || c.title, 120), c.daily_goal, 'ACTIVE', c.stat_kind, c.stat_tiers,
          now(), now() + make_interval(days => c.duration_days))
  returning id into v_project;

  insert into public.challenge_members(challenge_id, user_id, project_id) values (c.id, auth.uid(), v_project);
  return v_project;
end;
$$;

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
    select cm.project_id, c.daily_goal, c.stat_kind, c.stat_tiers, c.minutes
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
      insert into public.quests(user_id, project_id, title, status, difficulty_tier, estimated_minutes, reward_stats, stat_tiers, due_at, is_flash)
      values (auth.uid(), m.project_id, m.daily_goal, 'PENDING', 'ROUTINE', m.minutes, array[m.stat_kind], m.stat_tiers, p_day_end, false);
      v_created := v_created + 1;
    end if;
  end loop;
  return v_created;
end;
$$;
revoke all on function public.join_challenge(uuid) from public, anon;
revoke all on function public.ensure_challenge_quests(timestamptz, timestamptz) from public, anon;
grant execute on function public.join_challenge(uuid) to authenticated;
grant execute on function public.ensure_challenge_quests(timestamptz, timestamptz) to authenticated;

notify pgrst, 'reload schema';
commit;
