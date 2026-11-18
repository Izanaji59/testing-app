-- =====================================================================
-- Migration 0025 · Quêtes quotidiennes d'un donjon + identité du donjon
-- =====================================================================
-- À exécuter après 0024. Idempotente.
--
-- Une quête est soit UNIQUE (émise une fois, à terminer avant sa fin de
-- transmission = échéance), soit QUOTIDIENNE : une « routine » rattachée à un
-- donjon émet chaque jour une quête datée de la fin de la journée, depuis son
-- émission jusqu'à sa fin de transmission (sa date, sinon celle du donjon,
-- sinon jusqu'à l'arrêt). Même mécanique que les défis communs (0022), mais
-- privée. Les jours manqués passent par le bilan d'excuse habituel ; aucun
-- rattrapage des jours passés. L'XP suit les triggers de quête (0019, 0023b).
--
-- projects.identity : la phrase d'identité du donjon (« Je suis quelqu'un qui… »).
-- =====================================================================
begin;

alter table public.projects add column if not exists identity text;
do $$ begin
  alter table public.projects add constraint projects_identity_len check (identity is null or char_length(identity) <= 160);
exception when duplicate_object then null; end $$;

create table if not exists public.quest_routines (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(user_id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  title             text not null check (char_length(btrim(title)) between 1 and 140),
  estimated_minutes int not null default 30 check (estimated_minutes between 5 and 480),
  difficulty_tier   difficulty_tier not null default 'ROUTINE',
  reward_stats      stat_kind[],
  stat_tiers        jsonb,
  starts_at         timestamptz not null default now(),
  ends_at           timestamptz,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);
create index if not exists idx_quest_routines_user on public.quest_routines(user_id) where active;

alter table public.quests add column if not exists routine_id uuid references public.quest_routines(id) on delete set null;
create index if not exists idx_quests_routine_due on public.quests(routine_id, due_at) where routine_id is not null;

alter table public.quest_routines enable row level security;
drop policy if exists quest_routines_select on public.quest_routines;
drop policy if exists quest_routines_insert on public.quest_routines;
drop policy if exists quest_routines_update on public.quest_routines;
drop policy if exists quest_routines_delete on public.quest_routines;
create policy quest_routines_select on public.quest_routines for select to authenticated using (user_id = auth.uid());
create policy quest_routines_insert on public.quest_routines for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy quest_routines_update on public.quest_routines for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy quest_routines_delete on public.quest_routines for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.quest_routines to authenticated;

-- Stats d'une routine nettoyées comme celles des quêtes (difficulté = la plus haute).
create or replace function public.trg_routine_stat_tiers()
returns trigger language plpgsql set search_path=public as $$
declare kinds stat_kind[]; top difficulty_tier;
begin
 new.stat_tiers := public.f_clean_stat_tiers(new.stat_tiers);
 if new.stat_tiers is not null then
   select array_agg(kind order by weight desc, kind::text), (array_agg(tier order by weight desc, kind::text))[1]
     into kinds, top from public.f_stat_weights(new.stat_tiers);
   new.reward_stats := kinds;
   new.difficulty_tier := top;
 end if;
 return new;
end $$;
drop trigger if exists a0_routine_stat_tiers on public.quest_routines;
create trigger a0_routine_stat_tiers before insert or update on public.quest_routines
for each row execute function public.trg_routine_stat_tiers();

-- Émet la quête du jour de chaque routine active (une seule par journée locale).
create or replace function public.ensure_routine_quests(p_day_start timestamptz, p_day_end timestamptz)
returns int
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_created int := 0;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_day_start is null or p_day_end is null
     or p_day_end - p_day_start not between interval '22 hours' and interval '26 hours'
     or p_day_start > now() or p_day_end <= now() then
    raise exception 'Journée invalide';
  end if;

  for r in
    select qr.*
      from public.quest_routines qr
      join public.projects p on p.id = qr.project_id and p.user_id = qr.user_id
     where qr.user_id = auth.uid()
       and qr.active
       and p.status = 'ACTIVE'
       and qr.starts_at < p_day_end
       and (coalesce(qr.ends_at, p.ends_at) is null or p_day_start < coalesce(qr.ends_at, p.ends_at))
     for update of qr
  loop
    if not exists (select 1 from public.quests q
                    where q.routine_id = r.id and q.due_at > p_day_start and q.due_at <= p_day_end) then
      insert into public.quests(user_id, project_id, routine_id, title, status, difficulty_tier, estimated_minutes, reward_stats, stat_tiers, due_at, is_flash)
      values (auth.uid(), r.project_id, r.id, r.title, 'PENDING', r.difficulty_tier, r.estimated_minutes, r.reward_stats, r.stat_tiers, p_day_end, false);
      v_created := v_created + 1;
    end if;
  end loop;
  return v_created;
end;
$$;
revoke all on function public.ensure_routine_quests(timestamptz, timestamptz) from public, anon;
grant execute on function public.ensure_routine_quests(timestamptz, timestamptz) to authenticated;

-- Défis (0024) : une quête quotidienne de donjon dans le même projet ne remplace pas la quête du défi.
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
                    where q.project_id = m.project_id and q.routine_id is null and q.due_at > p_day_start and q.due_at <= p_day_end) then
      insert into public.quests(user_id, project_id, title, status, difficulty_tier, estimated_minutes, reward_stats, stat_tiers, due_at, is_flash)
      values (auth.uid(), m.project_id, m.daily_goal, 'PENDING', 'ROUTINE', m.minutes, array[m.stat_kind], m.stat_tiers, p_day_end, false);
      v_created := v_created + 1;
    end if;
  end loop;
  return v_created;
end;
$$;

notify pgrst, 'reload schema';
commit;
