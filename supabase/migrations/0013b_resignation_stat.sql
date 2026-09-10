-- =====================================================================
-- LATRACTION — Migration 0013b · Stat RÉSIGNATION (2/2)
-- =====================================================================
-- ÉTAPE 2/2. Exécute d'abord 0013a (dans sa propre query), PUIS celle-ci.
-- Idempotent : safe à re-exécuter.
--
-- RÉSIGNATION : fuite, facilité, abandon de l'effort — choisir le confort
-- immédiat au détriment de sa progression. Indépendante de MENTALITÉ :
-- une forte mentalité n'empêche pas d'accumuler de la résignation.
--
-- Câblé maintenant : deadline dépassée (quête EXPIRED) et quête abandonnée
-- (quête SKIPPED) — les deux seuls événements qui ont déjà un support en
-- base. Les 3 autres (habitude ignorée, objectif repoussé, distraction
-- choisie) sont réservés dans l'enum mais pas encore déclenchés : ils ont
-- besoin de concepts qui n'existent pas encore (suivi d'habitudes
-- récurrentes, historique de report, auto-déclaration).
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. Rétro-création de la ligne RESIGNATION pour les comptes existants.
-- ----------------------------------------------------------------------
insert into public.stats (user_id, kind)
select user_id, 'RESIGNATION' from public.profiles
on conflict do nothing;

-- ----------------------------------------------------------------------
-- 2. Enum des événements de résignation.
-- ----------------------------------------------------------------------
do $$ begin
  create type resignation_source as enum (
    'DEADLINE_MISSED', 'QUEST_ABANDONED', 'HABIT_IGNORED',
    'OBJECTIVE_POSTPONED', 'DISTRACTION_CHOSEN'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------
-- 3. Journal des événements de résignation (immuable, comme xp_events).
-- ----------------------------------------------------------------------
create table if not exists public.resignation_events (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(user_id) on delete cascade,
  source        resignation_source not null,
  source_ref_id uuid,
  amount        int not null check (amount > 0),
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_resignation_events_user_date on public.resignation_events(user_id, created_at desc);

alter table public.resignation_events enable row level security;

drop policy if exists "resignation_events_select" on public.resignation_events;
create policy "resignation_events_select" on public.resignation_events
  for select using (auth.uid() = user_id);
-- Pas de policy insert : uniquement écrit par les fonctions SECURITY DEFINER.

-- ----------------------------------------------------------------------
-- 4. award_resignation — parallèle à award_xp, mais sans les mécaniques
--    de diminishing-returns / diversité (pensées pour de l'engagement
--    positif, pas pour une pénalité).
-- ----------------------------------------------------------------------
create or replace function award_resignation(
  p_user   uuid,
  p_source resignation_source,
  p_ref_id uuid,
  p_amount int
) returns void
language plpgsql security definer as $$
declare
  v_new_xp bigint;
  v_new_lv int;
begin
  insert into public.resignation_events(user_id, source, source_ref_id, amount)
  values (p_user, p_source, p_ref_id, p_amount);

  update public.stats
     set xp = xp + p_amount, last_gain_at = now(), decay_pct = 0
   where user_id = p_user and kind = 'RESIGNATION'
   returning xp, level into v_new_xp, v_new_lv;

  while v_new_xp >= f_stat_xp_for_level(v_new_lv) loop
    v_new_xp := v_new_xp - f_stat_xp_for_level(v_new_lv);
    v_new_lv := v_new_lv + 1;
  end loop;

  update public.stats
     set xp = v_new_xp, level = v_new_lv
   where user_id = p_user and kind = 'RESIGNATION';
end;
$$;

-- ----------------------------------------------------------------------
-- 5. Trigger quête : SKIPPED → QUEST_ABANDONED, EXPIRED → DEADLINE_MISSED.
--    Montant = même barème que l'XP qu'aurait rapporté la quête
--    (f_base_xp_for_tier), pour rester cohérent avec l'échelle existante
--    plutôt que d'inventer un nouveau nombre.
-- ----------------------------------------------------------------------
create or replace function trg_on_quest_resignation()
returns trigger language plpgsql as $$
declare
  v_amount int;
begin
  if new.status = 'SKIPPED' and (old.status is null or old.status <> 'SKIPPED') then
    v_amount := f_base_xp_for_tier(coalesce(new.difficulty_tier, 'ROUTINE'));
    perform award_resignation(new.user_id, 'QUEST_ABANDONED', new.id, v_amount);
  elsif new.status = 'EXPIRED' and (old.status is null or old.status <> 'EXPIRED') then
    v_amount := f_base_xp_for_tier(coalesce(new.difficulty_tier, 'ROUTINE'));
    perform award_resignation(new.user_id, 'DEADLINE_MISSED', new.id, v_amount);
  end if;
  return new;
end;
$$;

drop trigger if exists quest_resignation on public.quests;
create trigger quest_resignation
before update on public.quests
for each row execute function trg_on_quest_resignation();

-- ----------------------------------------------------------------------
-- 6. Cron candidat : bascule les quêtes en retard en EXPIRED (déclenche
--    automatiquement le trigger ci-dessus). À brancher via pg_cron ou
--    edge function, comme cron_apply_stat_decay.
-- ----------------------------------------------------------------------
create or replace function cron_expire_overdue_quests()
returns void language plpgsql as $$
begin
  update public.quests
     set status = 'EXPIRED'
   where status in ('PENDING', 'IN_PROGRESS')
     and due_at is not null and due_at < now();
end$$;

-- =====================================================================
-- FIN DE LA MIGRATION 0013b
-- =====================================================================
