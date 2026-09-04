-- =====================================================================
-- LATRACTION — Migration 0003 · Classe MBTI publique, profils consultables, chat
-- =====================================================================
-- À exécuter APRÈS 0001 et 0002 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
-- =====================================================================

-- ----------------------------------------------------------------------
-- 1. Classe MBTI dérivée, stockée en snapshot sur le profil.
--    Le MBTI brut (profiles.mbti) reste privé — jamais renvoyé par les
--    fonctions publiques ci-dessous, seule mbti_class (le nom de classe) l'est.
-- ----------------------------------------------------------------------
alter table public.profiles
  add column if not exists mbti_class text not null default 'NON CALIBRÉ';

-- ----------------------------------------------------------------------
-- 2. Lecture publique ciblée d'UN profil (jamais un listing global).
--    security definer : bypass RLS volontairement, mais ne renvoie QUE
--    les colonnes validées comme publiques. Pas de mbti brut, pas d'email
--    (profiles n'en stocke pas), pas de champs internes (active_boss_id...).
-- ----------------------------------------------------------------------
create or replace function public.get_public_profile(target_user uuid)
returns table (
  user_id       uuid,
  display_name  text,
  operator_code text,
  level         int,
  rank_letter   rank_letter,
  rank_tier     rank_tier,
  total_xp      bigint,
  mbti_class    text
)
language sql
security definer
set search_path = public
stable
as $$
  select user_id, display_name, operator_code, level, rank_letter, rank_tier, total_xp, mbti_class
  from public.profiles
  where user_id = target_user;
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to authenticated;

-- ----------------------------------------------------------------------
-- 3. Lecture publique ciblée des 9 stats d'un joueur (même principe).
-- ----------------------------------------------------------------------
create or replace function public.get_public_stats(target_user uuid)
returns setof public.stats
language sql
security definer
set search_path = public
stable
as $$
  select * from public.stats where user_id = target_user;
$$;

revoke all on function public.get_public_stats(uuid) from public;
grant execute on function public.get_public_stats(uuid) to authenticated;

-- ----------------------------------------------------------------------
-- 4. Chat global (une seule salle pour l'instant, pas de DM).
--    sender_name est un snapshot du pseudo au moment de l'envoi (pas de
--    lecture croisée de profiles.* nécessaire pour afficher le fil).
-- ----------------------------------------------------------------------
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  sender_name text not null,
  body        text not null check (char_length(body) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index if not exists idx_chat_messages_created on public.chat_messages(created_at desc);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select" on public.chat_messages;
drop policy if exists "chat_messages_insert" on public.chat_messages;

create policy "chat_messages_select" on public.chat_messages
  for select to authenticated using (true);

create policy "chat_messages_insert" on public.chat_messages
  for insert to authenticated with check (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when others then null; end $$;

-- =====================================================================
-- FIN DE LA MIGRATION 0003
-- =====================================================================
