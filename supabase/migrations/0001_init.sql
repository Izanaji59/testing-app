-- =====================================================================
-- LATRACTION — Migration 0001 · Initialisation complète
-- =====================================================================
-- À exécuter dans le SQL Editor Supabase, projet vide.
-- Idempotent : safe à re-exécuter.
-- =====================================================================

-- ----------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------
-- 1. Enums (idempotents)
-- ----------------------------------------------------------------------
do $$ begin
  create type rank_letter as enum ('E','D','C','B','A','S','MONARCH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type rank_tier as enum ('MINUS','NEUTRAL','PLUS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type stat_kind as enum (
    'DISCIPLINE','FOCUS','INTELLIGENCE','CREATIVITY',
    'LEADERSHIP','ENERGY','MENTAL_RESISTANCE','TECHNIQUE','SOCIAL'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_type as enum ('OPERATION','CAMPAIGN','RAID','DUNGEON','BOSS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('PLANNED','ACTIVE','PAUSED','COMPLETED','ABANDONED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quest_status as enum ('PENDING','IN_PROGRESS','COMPLETED','SKIPPED','EXPIRED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type difficulty_tier as enum ('TRIVIAL','ROUTINE','NOTABLE','HARD','LEGENDARY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type spec_kind as enum (
    'ARCHITECT','STRATEGIST','CREATOR','WARRIOR',
    'DIPLOMAT','SCHOLAR','MONARCH'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type xp_source as enum (
    'QUEST_COMPLETE','SESSION','BOSS_PHASE','CRIT','STREAK_BONUS',
    'DAILY_BRIEFING','ADJUSTMENT','DECAY'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_quality as enum ('LOW','NET','MAXIMAL');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------

-- profiles (1-1 avec auth.users)
create table if not exists public.profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  operator_code  text not null unique default ('OPERATOR_' || lpad(floor(random()*9999)::text, 4, '0')),
  display_name   text,
  mbti           text check (mbti is null or mbti ~ '^[EI][NS][TF][JP]$'),
  level          int not null default 1 check (level >= 1),
  total_xp       bigint not null default 0 check (total_xp >= 0),
  rank_letter    rank_letter not null default 'E',
  rank_tier      rank_tier not null default 'NEUTRAL',
  constance      numeric(5,2) not null default 0 check (constance between 0 and 100),
  mastery_points int not null default 0 check (mastery_points >= 0),
  active_boss_id uuid,
  active_raid_id uuid,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_active_at timestamptz
);
create index if not exists idx_profiles_rank on public.profiles(rank_letter, level desc);

-- stats (1-9)
create table if not exists public.stats (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  kind         stat_kind not null,
  level        int not null default 1 check (level >= 1),
  xp           bigint not null default 0 check (xp >= 0),
  last_gain_at timestamptz,
  decay_pct    numeric(5,2) not null default 0 check (decay_pct between 0 and 30),
  unique (user_id, kind)
);
create index if not exists idx_stats_user on public.stats(user_id);

-- specializations
create table if not exists public.specializations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  kind        spec_kind not null,
  is_primary  boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, kind)
);
create unique index if not exists idx_specializations_one_primary
  on public.specializations(user_id)
  where is_primary = true;

-- skills
create table if not exists public.skills (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  spec_kind   spec_kind not null,
  skill_code  text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, skill_code)
);

-- missions
create table if not exists public.missions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  title       text not null,
  description text,
  horizon     text not null check (horizon in ('QUARTER','YEAR','LIFE')),
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists idx_missions_user_active on public.missions(user_id) where is_active;

-- projects
create table if not exists public.projects (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(user_id) on delete cascade,
  mission_id     uuid references public.missions(id) on delete set null,
  type           project_type not null,
  title          text not null,
  description    text,
  status         project_status not null default 'PLANNED',
  progress_pct   numeric(5,2) not null default 0 check (progress_pct between 0 and 100),
  hp_total       int,
  hp_remaining   int,
  phase_count    int default 1,
  phase_current  int default 1,
  difficulty     difficulty_tier,
  starts_at      timestamptz,
  ends_at        timestamptz,
  completed_at   timestamptz,
  primary_stat   stat_kind,
  secondary_stat stat_kind,
  is_locked      boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_projects_user_status on public.projects(user_id, status);
create index if not exists idx_projects_mission     on public.projects(mission_id);
create unique index if not exists idx_projects_one_active_raid
  on public.projects(user_id)
  where type = 'RAID' and status = 'ACTIVE';
create unique index if not exists idx_projects_one_active_boss
  on public.projects(user_id)
  where type = 'BOSS' and status = 'ACTIVE';

-- quests
create table if not exists public.quests (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(user_id) on delete cascade,
  project_id        uuid not null references public.projects(id) on delete cascade,
  title             text not null,
  description       text,
  status            quest_status not null default 'PENDING',
  difficulty_score  numeric(4,3) check (difficulty_score is null or difficulty_score between 0 and 1),
  difficulty_tier   difficulty_tier,
  estimated_minutes int,
  actual_minutes    int,
  starts_at         timestamptz,
  due_at            timestamptz,
  completed_at      timestamptz,
  reward_xp_base    int,
  reward_stats      stat_kind[],
  is_flash          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists idx_quests_project on public.quests(project_id);
create index if not exists idx_quests_user_status on public.quests(user_id, status);
create index if not exists idx_quests_due on public.quests(due_at) where status in ('PENDING','IN_PROGRESS');

-- tasks
create table if not exists public.tasks (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  quest_id      uuid not null references public.quests(id) on delete cascade,
  title         text not null,
  is_done       boolean not null default false,
  estimated_min int check (estimated_min is null or estimated_min between 5 and 90),
  done_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_tasks_quest on public.tasks(quest_id);

-- sessions
create table if not exists public.sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  quest_id      uuid references public.quests(id) on delete set null,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  duration_sec  int generated always as (
                  case when ended_at is not null
                       then extract(epoch from (ended_at - started_at))::int
                       else null end
                ) stored,
  quality       session_quality,
  interruptions int default 0,
  notes         text
);
create index if not exists idx_sessions_user_date on public.sessions(user_id, started_at desc);

-- xp_events (journal immuable)
create table if not exists public.xp_events (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  source          xp_source not null,
  source_ref_id   uuid,
  stat_kind       stat_kind,
  xp_amount       int not null,
  is_crit         boolean default false,
  crit_multiplier numeric(3,2),
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists idx_xp_events_user_date on public.xp_events(user_id, created_at desc);
create index if not exists idx_xp_events_source on public.xp_events(source, source_ref_id);

-- rank_history
create table if not exists public.rank_history (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(user_id) on delete cascade,
  from_letter     rank_letter,
  from_tier       rank_tier,
  to_letter       rank_letter not null,
  to_tier         rank_tier not null,
  boss_id         uuid references public.projects(id),
  level_at_rankup int not null,
  citation        text,
  created_at      timestamptz not null default now()
);

-- briefings
create table if not exists public.briefings (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(user_id) on delete cascade,
  kind         text not null check (kind in ('MORNING','EVENING','WEEKLY')),
  payload      jsonb not null,
  generated_at timestamptz not null default now()
);
create index if not exists idx_briefings_user on public.briefings(user_id, generated_at desc);

-- analytics_daily
create table if not exists public.analytics_daily (
  user_id          uuid not null references public.profiles(user_id) on delete cascade,
  day              date not null,
  total_xp         int not null default 0,
  sessions_count   int not null default 0,
  focus_minutes    int not null default 0,
  quests_completed int not null default 0,
  projects_touched int not null default 0,
  cognitive_load   numeric(5,2),
  primary key (user_id, day)
);
create index if not exists idx_analytics_daily_user on public.analytics_daily(user_id, day desc);

-- ----------------------------------------------------------------------
-- 3. RLS — chaque user voit/modifie uniquement ses propres lignes
-- ----------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.stats           enable row level security;
alter table public.specializations enable row level security;
alter table public.skills          enable row level security;
alter table public.missions        enable row level security;
alter table public.projects        enable row level security;
alter table public.quests          enable row level security;
alter table public.tasks           enable row level security;
alter table public.sessions        enable row level security;
alter table public.xp_events       enable row level security;
alter table public.rank_history    enable row level security;
alter table public.briefings       enable row level security;
alter table public.analytics_daily enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','stats','specializations','skills','missions','projects',
    'quests','tasks','sessions','xp_events','rank_history','briefings','analytics_daily'
  ]
  loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_delete" on public.%1$I', t);
    execute format(
      'create policy "%1$s_select" on public.%1$I for select using (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$I for insert with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s_update" on public.%1$I for update using (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$I for delete using (auth.uid() = user_id)', t);
  end loop;
end$$;

-- ----------------------------------------------------------------------
-- 4. Fonctions formules
-- ----------------------------------------------------------------------
create or replace function f_xp_for_level(target_level int)
returns bigint language sql immutable as $$
  select floor(100 * power(target_level::numeric, 1.6))::bigint
$$;

create or replace function f_stat_xp_for_level(current_level int)
returns int language sql immutable as $$
  select floor(60 + 18*current_level + 3*power(current_level::numeric, 1.5))::int
$$;

create or replace function f_difficulty_tier(score numeric)
returns difficulty_tier language sql immutable as $$
  select case
    when score < 0.2 then 'TRIVIAL'::difficulty_tier
    when score < 0.4 then 'ROUTINE'::difficulty_tier
    when score < 0.6 then 'NOTABLE'::difficulty_tier
    when score < 0.8 then 'HARD'::difficulty_tier
    else 'LEGENDARY'::difficulty_tier
  end
$$;

create or replace function f_base_xp_for_tier(t difficulty_tier)
returns int language sql immutable as $$
  select case t
    when 'TRIVIAL'   then 15
    when 'ROUTINE'   then 35
    when 'NOTABLE'   then 80
    when 'HARD'      then 180
    when 'LEGENDARY' then 400
  end
$$;

create or replace function f_diversity_coefficient(p_user uuid)
returns numeric language sql stable as $$
  with active_stats as (
    select count(distinct stat_kind) as n
    from public.xp_events
    where user_id = p_user
      and created_at > now() - interval '14 days'
      and stat_kind is not null
  )
  select greatest(0.5, least(1.0, (n::numeric / 9.0) * 0.6 + 0.4))
  from active_stats
$$;

-- ----------------------------------------------------------------------
-- 5. Fonction maîtresse : award_xp
-- ----------------------------------------------------------------------
create or replace function award_xp(
  p_user      uuid,
  p_source    xp_source,
  p_ref_id    uuid,
  p_stat      stat_kind,
  p_amount    int,
  p_is_crit   boolean default false,
  p_crit_mult numeric default null
) returns void
language plpgsql security definer as $$
declare
  v_diversity     numeric;
  v_final_xp      int;
  v_today_stat_xp int;
  v_new_total     bigint;
  v_old_level     int;
  v_new_level     int;
  v_new_stat_xp   bigint;
  v_new_stat_lv   int;
begin
  -- 1. Anti-grind : diminishing returns par stat / jour
  if p_stat is not null then
    select coalesce(sum(xp_amount), 0)
      into v_today_stat_xp
      from public.xp_events
     where user_id = p_user
       and stat_kind = p_stat
       and created_at::date = current_date;

    if v_today_stat_xp > 200 then p_amount := floor(p_amount * 0.5);  end if;
    if v_today_stat_xp > 400 then p_amount := floor(p_amount * 0.5);  end if;
    if v_today_stat_xp > 600 then p_amount := floor(p_amount * 0.4);  end if;
  end if;

  -- 2. Coefficient diversité
  v_diversity := coalesce(f_diversity_coefficient(p_user), 1.0);
  v_final_xp  := greatest(1, floor(p_amount * v_diversity));

  -- 3. Crit
  if p_is_crit and p_crit_mult is not null then
    v_final_xp := floor(v_final_xp * p_crit_mult);
  end if;

  -- 4. Insert event
  insert into public.xp_events (user_id, source, source_ref_id, stat_kind, xp_amount, is_crit, crit_multiplier)
  values (p_user, p_source, p_ref_id, p_stat, v_final_xp, p_is_crit, p_crit_mult);

  -- 5. Stat individuelle
  if p_stat is not null then
    update public.stats
       set xp = xp + v_final_xp,
           last_gain_at = now(),
           decay_pct = 0
     where user_id = p_user and kind = p_stat
     returning xp, level into v_new_stat_xp, v_new_stat_lv;

    while v_new_stat_xp >= f_stat_xp_for_level(v_new_stat_lv) loop
      v_new_stat_xp := v_new_stat_xp - f_stat_xp_for_level(v_new_stat_lv);
      v_new_stat_lv := v_new_stat_lv + 1;
    end loop;

    update public.stats
       set xp = v_new_stat_xp, level = v_new_stat_lv
     where user_id = p_user and kind = p_stat;
  end if;

  -- 6. Profile global
  update public.profiles
     set total_xp = total_xp + v_final_xp,
         updated_at = now(),
         last_active_at = now()
   where user_id = p_user
   returning total_xp, level into v_new_total, v_old_level;

  v_new_level := v_old_level;
  while v_new_total >= f_xp_for_level(v_new_level + 1) loop
    v_new_level := v_new_level + 1;
  end loop;

  if v_new_level > v_old_level then
    update public.profiles
       set level = v_new_level,
           mastery_points = mastery_points + (v_new_level - v_old_level)
     where user_id = p_user;
  end if;
end;
$$;

-- ----------------------------------------------------------------------
-- 6. Trigger : on quest completed
-- ----------------------------------------------------------------------
create or replace function trg_on_quest_completed()
returns trigger language plpgsql as $$
declare
  v_base_xp     int;
  v_stat        stat_kind;
  v_crit_chance numeric;
  v_is_crit     boolean := false;
  v_crit_mult   numeric;
begin
  if new.status = 'COMPLETED' and (old.status is null or old.status <> 'COMPLETED') then
    new.completed_at := coalesce(new.completed_at, now());

    v_base_xp := f_base_xp_for_tier(coalesce(new.difficulty_tier, 'ROUTINE'));

    v_crit_chance := case new.difficulty_tier
      when 'TRIVIAL'   then 0.00
      when 'ROUTINE'   then 0.02
      when 'NOTABLE'   then 0.05
      when 'HARD'      then 0.08
      when 'LEGENDARY' then 0.15
      else 0.02
    end;

    if random() < v_crit_chance then
      v_is_crit := true;
      v_crit_mult := 1.5 + random();
      if random() < 0.05 then v_crit_mult := 3.0; end if;
    end if;

    if new.reward_stats is not null and array_length(new.reward_stats, 1) > 0 then
      foreach v_stat in array new.reward_stats loop
        perform award_xp(new.user_id, 'QUEST_COMPLETE', new.id, v_stat, v_base_xp, v_is_crit, v_crit_mult);
      end loop;
    else
      perform award_xp(new.user_id, 'QUEST_COMPLETE', new.id, null, v_base_xp, v_is_crit, v_crit_mult);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists quest_completed on public.quests;
create trigger quest_completed
before update on public.quests
for each row execute function trg_on_quest_completed();

-- ----------------------------------------------------------------------
-- 7. Trigger : bootstrap profile + 9 stats à la première connexion
-- ----------------------------------------------------------------------
create or replace function trg_on_profile_created()
returns trigger language plpgsql as $$
declare s stat_kind;
begin
  for s in select unnest(enum_range(null::stat_kind)) loop
    insert into public.stats(user_id, kind) values (new.user_id, s) on conflict do nothing;
  end loop;
  return new;
end;
$$;

drop trigger if exists profile_created on public.profiles;
create trigger profile_created
after insert on public.profiles
for each row execute function trg_on_profile_created();

-- ----------------------------------------------------------------------
-- 8. Cron candidat : decay quotidien (à brancher via pg_cron ou edge function)
-- ----------------------------------------------------------------------
create or replace function cron_apply_stat_decay()
returns void language plpgsql as $$
begin
  update public.stats s
     set decay_pct = least(30, decay_pct + 1)
   where (last_gain_at is null or last_gain_at < now() - interval '7 days')
     and decay_pct < 30;
end$$;

-- =====================================================================
-- FIN DE LA MIGRATION 0001
-- =====================================================================
