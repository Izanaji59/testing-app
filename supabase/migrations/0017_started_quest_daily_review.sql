-- =====================================================================
-- LATRACTION — Migration 0017 · Mission démarrée, non terminée dans la journée
-- =====================================================================
-- À exécuter APRÈS 0015_deadline_review et 0016. Idempotent.
--
-- « Démarrer » passe une quête en IN_PROGRESS sans échéance : le bilan de
-- 0015 (basé sur due_at) ne la voyait jamais. Désormais, une mission démarrée
-- et toujours en cours après la fin de la journée demande le même bilan
-- « Quelle est ton excuse ? », une fois par journée :
--   - contrainte réelle      → aucun point ;
--   - évitement volontaire   → résignation = XP de base qu'aurait rapportée
--                               la quête (f_base_xp_for_tier), source
--                               OBJECTIVE_POSTPONED.
-- Dans les deux cas la mission RESTE en cours : aucun changement de statut.
--
-- La fin de journée est le minuit local du navigateur ; le RPC vérifie
-- qu'elle est plausible (passée, de moins de 26 h, après le démarrage) et
-- qu'une seule réponse est enregistrée par mission et par journée.
-- =====================================================================
begin;

alter table public.quest_deadline_reviews
  add column if not exists kind text not null default 'deadline';

do $$ begin
  alter table public.quest_deadline_reviews
    add constraint quest_deadline_reviews_kind_check check (kind in ('deadline', 'started_day'));
exception when duplicate_object then null; end $$;

create or replace function public.review_started_quest(
  p_quest_id uuid, p_day_end timestamptz, p_reason text, p_decision text
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
  if p_day_end is null then raise exception 'Journée manquante'; end if;

  -- Verrou par quête : doubles clics et onglets concurrents restent idempotents.
  select * into q from public.quests where id = p_quest_id and user_id = auth.uid() for update;
  if not found then raise exception 'Quête introuvable'; end if;

  -- Journée déjà traitée (quel que soit le fuseau envoyé) : on renvoie la réponse existante.
  select amount into v_amount from public.quest_deadline_reviews
   where quest_id = q.id
     and (due_at = p_day_end
          or (kind = 'started_day' and abs(extract(epoch from (due_at - p_day_end))) < 72000))
   limit 1;
  if found then return v_amount; end if;

  if q.status <> 'IN_PROGRESS' or q.starts_at is null or q.starts_at >= p_day_end
     or p_day_end > now() or p_day_end <= now() - interval '26 hours' then
    raise exception 'Cette mission ne nécessite pas de bilan';
  end if;

  v_amount := case when p_decision = 'avoidance'
    then public.f_base_xp_for_tier(coalesce(q.difficulty_tier, 'ROUTINE')) else 0 end;

  insert into public.quest_deadline_reviews(user_id, quest_id, due_at, reason, decision, amount, kind)
    values (q.user_id, q.id, p_day_end, btrim(p_reason), p_decision, v_amount, 'started_day');

  if v_amount > 0 then
    perform public.award_resignation(q.user_id, 'OBJECTIVE_POSTPONED', q.id, v_amount);
  end if;
  return v_amount;
end;
$$;

revoke all on function public.review_started_quest(uuid, timestamptz, text, text) from public, anon;
grant execute on function public.review_started_quest(uuid, timestamptz, text, text) to authenticated;

notify pgrst, 'reload schema';
commit;

-- =====================================================================
-- FIN DE LA MIGRATION 0017
-- =====================================================================
