-- Les retards demandent un bilan explicite. À exécuter après 0013b.
-- Aucune pénalité existante n'est effacée ou recalculée.
begin;

create table if not exists public.quest_deadline_reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  quest_id uuid not null references public.quests(id) on delete cascade,
  due_at timestamptz not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 1000),
  decision text not null check (decision in ('constraint', 'avoidance')),
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (quest_id, due_at)
);
alter table public.quest_deadline_reviews enable row level security;
drop policy if exists deadline_reviews_select on public.quest_deadline_reviews;
create policy deadline_reviews_select on public.quest_deadline_reviews
  for select to authenticated using (user_id = auth.uid());
revoke all on public.quest_deadline_reviews from anon, authenticated;
grant select on public.quest_deadline_reviews to authenticated;

-- Compatibilité avec les anciennes pages et les éventuels appels planifiés :
-- une échéance dépassée ne doit plus provoquer une pénalité automatique.
create or replace function public.cron_expire_overdue_quests()
returns void language plpgsql as $$ begin return; end; $$;

-- L'abandon explicite reste inchangé. Le retard est traité par le bilan.
create or replace function public.trg_on_quest_resignation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'SKIPPED' and old.status is distinct from 'SKIPPED' then
    perform public.award_resignation(new.user_id, 'QUEST_ABANDONED', new.id,
      public.f_base_xp_for_tier(coalesce(new.difficulty_tier, 'ROUTINE')));
  end if;
  return new;
end;
$$;

-- Seules les fonctions internes doivent pouvoir attribuer directement les points.
revoke execute on function public.award_resignation(uuid, public.resignation_source, uuid, integer)
  from public, anon, authenticated;

create or replace function public.review_missed_quest(
  p_quest_id uuid, p_due_at timestamptz, p_reason text, p_decision text
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  q public.quests%rowtype;
  v_amount integer;
begin
  if auth.uid() is null then raise exception 'Authentification requise'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 1000 then
    raise exception 'Une réponse de 1 à 1000 caractères est requise';
  end if;
  if p_decision is null or p_decision not in ('constraint', 'avoidance') then
    raise exception 'Choix de bilan invalide';
  end if;

  -- Verrou unique par quête : doubles clics et onglets concurrents sont idempotents.
  select * into q from public.quests where id = p_quest_id and user_id = auth.uid() for update;
  if not found then raise exception 'Quête introuvable'; end if;
  select amount into v_amount from public.quest_deadline_reviews
    where quest_id = q.id and due_at = p_due_at;
  if found then return v_amount; end if;
  if q.status not in ('PENDING', 'IN_PROGRESS') or q.due_at is null
      or q.due_at is distinct from p_due_at or q.due_at > now() then
    raise exception 'Cette échéance ne nécessite plus de bilan';
  end if;

  v_amount := case when p_decision = 'avoidance'
    then public.f_base_xp_for_tier(coalesce(q.difficulty_tier, 'ROUTINE')) else 0 end;
  insert into public.quest_deadline_reviews(user_id, quest_id, due_at, reason, decision, amount)
    values (q.user_id, q.id, q.due_at, btrim(p_reason), p_decision, v_amount);
  if v_amount > 0 then
    update public.quests set status = 'EXPIRED' where id = q.id;
    perform public.award_resignation(q.user_id, 'DEADLINE_MISSED', q.id, v_amount);
  end if;
  return v_amount;
end;
$$;
revoke all on function public.review_missed_quest(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.review_missed_quest(uuid, timestamptz, text, text) to authenticated;

notify pgrst, 'reload schema';
commit;
