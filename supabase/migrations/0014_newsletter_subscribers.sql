-- =====================================================================
-- LATRACTION — Migration 0014 · Abonnés newsletter Slumbywise
-- =====================================================================
-- À exécuter APRÈS 0001 à 0013b dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Table publique en écriture (inscription depuis le site, sans compte) —
-- mais jamais lisible ni modifiable depuis le client, uniquement du
-- SQL Editor / futur back-office. Anti-doublon sur l'email.
-- =====================================================================

create table if not exists public.newsletter_subscribers (
  id            uuid primary key default uuid_generate_v4(),
  email         text not null unique,
  subscribed_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_subscribers_insert" on public.newsletter_subscribers;
create policy "newsletter_subscribers_insert" on public.newsletter_subscribers
  for insert to anon, authenticated
  with check (true);

-- Pas de policy select/update/delete : personne ne peut lire ou modifier
-- la liste depuis le client, seulement l'ajouter (formulaire public).

-- =====================================================================
-- FIN DE LA MIGRATION 0014
-- =====================================================================
