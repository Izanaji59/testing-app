-- =====================================================================
-- Migration 0021 · Visibilité du profil public, pseudo obligatoire
-- =====================================================================
-- À exécuter après 0001 à 0020. Idempotent.
--
-- Chaque joueur choisit ce que les autres voient : statistiques, dimension
-- économique (stat REVENU), rang et niveau, MBTI. Le pseudo est toujours visible.
-- Le filtrage est fait ici, côté serveur : une donnée masquée n'est jamais
-- envoyée au navigateur des autres joueurs.
-- Par défaut : stats, rang et MBTI visibles (comportement précédent) ;
-- dimension économique masquée.
-- =====================================================================
begin;

alter table public.profiles
  add column if not exists show_stats   boolean not null default true,
  add column if not exists show_revenue boolean not null default false,
  add column if not exists show_rank    boolean not null default true,
  add column if not exists show_mbti    boolean not null default true;

-- ---------------------------------------------------------------------
-- Pseudo obligatoire : jamais vide (repli sur le code opérateur), 60 car. max.
-- ---------------------------------------------------------------------
create or replace function public.trg_profile_pseudo()
returns trigger language plpgsql set search_path = public as $$
begin
  new.display_name := nullif(btrim(coalesce(new.display_name, '')), '');
  if new.display_name is null then new.display_name := new.operator_code; end if;
  new.display_name := left(new.display_name, 60);
  return new;
end;
$$;

drop trigger if exists profile_pseudo on public.profiles;
create trigger profile_pseudo
before insert or update of display_name on public.profiles
for each row execute function public.trg_profile_pseudo();

update public.profiles set display_name = operator_code
 where display_name is null or btrim(display_name) = '';

do $$ begin
  alter table public.profiles add constraint profiles_display_name_required
    check (display_name is not null and char_length(btrim(display_name)) between 1 and 60);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Profil public : champs masqués renvoyés à null, préférences jointes.
-- ---------------------------------------------------------------------
drop function if exists public.get_public_profile(uuid);
create function public.get_public_profile(target_user uuid)
returns table(
  user_id uuid, display_name text, operator_code text,
  level int, rank_letter public.rank_letter, rank_tier public.rank_tier, total_xp bigint,
  mbti_class text,
  show_stats boolean, show_revenue boolean, show_rank boolean, show_mbti boolean
)
language sql stable security definer set search_path = public as $$
  select p.user_id, p.display_name, p.operator_code,
         case when p.show_rank then p.level end,
         case when p.show_rank then p.rank_letter end,
         case when p.show_rank then p.rank_tier end,
         case when p.show_rank then p.total_xp end,
         case when p.show_mbti then p.mbti_class end,
         p.show_stats, p.show_revenue, p.show_rank, p.show_mbti
    from public.profiles p
   where p.user_id = target_user
$$;
revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

-- Statistiques publiques : REVENU suit la dimension économique, les autres suivent show_stats.
create or replace function public.get_public_stats(target_user uuid)
returns table(kind public.stat_kind, level int)
language sql stable security definer set search_path = public as $$
  select s.kind, s.level
    from public.stats s
    join public.profiles p on p.user_id = s.user_id
   where s.user_id = target_user
     and case when s.kind = 'REVENU' then p.show_revenue else p.show_stats end
$$;
revoke all on function public.get_public_stats(uuid) from public, anon;
grant execute on function public.get_public_stats(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- =====================================================================
-- FIN DE LA MIGRATION 0021
-- =====================================================================
