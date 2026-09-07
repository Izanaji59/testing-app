-- =====================================================================
-- LATRACTION — Migration 0009 · Parties d'échecs en ligne (multijoueur)
-- =====================================================================
-- À exécuter APRÈS 0001 à 0008 dans le SQL Editor Supabase.
-- Idempotent : safe à re-exécuter.
--
-- Une partie = une ligne. Créateur = blancs. N'importe qui avec le lien
-- (l'id de la partie) peut la rejoindre en tant que noirs tant que la place
-- est libre — comme un lien d'invitation, pas un listing public de parties.
-- =====================================================================

create table if not exists public.chess_games (
  id            uuid primary key default uuid_generate_v4(),
  white_user_id uuid not null references public.profiles(user_id) on delete cascade,
  black_user_id uuid references public.profiles(user_id) on delete cascade,
  fen           text not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status        text not null default 'WAITING' check (status in ('WAITING', 'ACTIVE', 'COMPLETED')),
  winner        text check (winner in ('white', 'black', 'draw')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_chess_games_players on public.chess_games(white_user_id, black_user_id);

alter table public.chess_games enable row level security;

drop policy if exists "chess_games_select" on public.chess_games;
drop policy if exists "chess_games_insert" on public.chess_games;
drop policy if exists "chess_games_join" on public.chess_games;
drop policy if exists "chess_games_update_players" on public.chess_games;

create policy "chess_games_select" on public.chess_games
  for select to authenticated using (true);

create policy "chess_games_insert" on public.chess_games
  for insert to authenticated with check (auth.uid() = white_user_id);

-- Rejoindre : autorisé tant que la place noire est libre, uniquement pour
-- se déclarer soi-même (pas pour usurper la place de quelqu'un d'autre).
create policy "chess_games_join" on public.chess_games
  for update to authenticated
  using (black_user_id is null and status = 'WAITING')
  with check (black_user_id = auth.uid());

-- Jouer un coup / clore la partie : réservé aux deux joueurs de CETTE partie.
create policy "chess_games_update_players" on public.chess_games
  for update to authenticated
  using (auth.uid() = white_user_id or auth.uid() = black_user_id)
  with check (auth.uid() = white_user_id or auth.uid() = black_user_id);

do $$
begin
  alter publication supabase_realtime add table public.chess_games;
exception when others then null; end $$;

-- =====================================================================
-- FIN DE LA MIGRATION 0009
-- =====================================================================
