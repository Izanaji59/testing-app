-- =====================================================================
-- LATRACTION — Migration 0010 · Historique des saisies MBTI
-- =====================================================================
-- À exécuter APRÈS 0001 à 0009 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Chaque saisie MBTI est conservée (au lieu d'écraser une seule valeur)
-- pour calculer un type dominant + un pourcentage de confiance sur le
-- profil (ex: 7× INTJ, 3× INTP sur 10 tests → INTJ assuré à 70%).
-- profiles.mbti / mbti_class restent la "meilleure estimation actuelle"
-- (le type dominant), recalculée à chaque nouvelle saisie côté client.
-- =====================================================================

create table if not exists public.mbti_submissions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(user_id) on delete cascade,
  mbti       text not null check (mbti ~ '^[EI][NS][TF][JP]$'),
  created_at timestamptz not null default now()
);
create index if not exists idx_mbti_submissions_user on public.mbti_submissions(user_id, created_at desc);

alter table public.mbti_submissions enable row level security;

drop policy if exists "mbti_submissions_select" on public.mbti_submissions;
drop policy if exists "mbti_submissions_insert" on public.mbti_submissions;

create policy "mbti_submissions_select" on public.mbti_submissions
  for select using (auth.uid() = user_id);

create policy "mbti_submissions_insert" on public.mbti_submissions
  for insert with check (auth.uid() = user_id);

-- =====================================================================
-- FIN DE LA MIGRATION 0010
-- =====================================================================
