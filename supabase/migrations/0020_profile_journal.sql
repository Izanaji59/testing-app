begin;
-- Visitors receive levels only, never remaining XP that could expose revenue amounts.
drop function if exists public.get_public_stats(uuid);
create function public.get_public_stats(target_user uuid)
returns table(kind public.stat_kind,level int)
language sql stable security definer set search_path=public as $$
 select s.kind,s.level from public.stats s where s.user_id=target_user
$$;
revoke all on function public.get_public_stats(uuid) from public,anon;
grant execute on function public.get_public_stats(uuid) to authenticated;
create table if not exists public.profile_presentations (
 user_id uuid primary key references public.profiles(user_id) on delete cascade,
 bio text not null default '' check(char_length(bio)<=600),
 tagline text not null default '' check(char_length(tagline)<=100),
 avatar text not null default 'moon' check(avatar in ('moon','leaf','book','star','wave','flame')),
 theme text not null default 'night' check(theme in ('night','forest','amber','violet')),
 updated_at timestamptz not null default now()
);
create table if not exists public.profile_posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 1 and 140),
 body text not null check(char_length(btrim(body)) between 1 and 12000),
 is_published boolean not null default false,
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_profile_posts_author on public.profile_posts(user_id,created_at desc);
alter table public.profile_presentations enable row level security;
alter table public.profile_posts enable row level security;
drop policy if exists presentation_read on public.profile_presentations;
drop policy if exists presentation_insert on public.profile_presentations;
drop policy if exists presentation_update on public.profile_presentations;
create policy presentation_read on public.profile_presentations for select to authenticated using(true);
create policy presentation_insert on public.profile_presentations for insert to authenticated with check(user_id=auth.uid());
create policy presentation_update on public.profile_presentations for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists journal_read on public.profile_posts;
drop policy if exists journal_insert on public.profile_posts;
drop policy if exists journal_update on public.profile_posts;
create policy journal_read on public.profile_posts for select to authenticated using(is_published or user_id=auth.uid());
create policy journal_insert on public.profile_posts for insert to authenticated with check(user_id=auth.uid());
create policy journal_update on public.profile_posts for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on public.profile_presentations,public.profile_posts from anon;
grant select,insert,update on public.profile_presentations,public.profile_posts to authenticated;
revoke delete on public.profile_presentations,public.profile_posts from authenticated;
create or replace function public.trg_journal_dates()
returns trigger language plpgsql set search_path=public as $$
begin
 new.updated_at:=now();
 if TG_TABLE_NAME='profile_posts' then
   if TG_OP='INSERT' then new.created_at:=now();new.published_at:=case when new.is_published then now() else null end;
   else new.created_at:=old.created_at;new.published_at:=case when new.is_published then coalesce(old.published_at,now()) else old.published_at end; end if;
 end if;
 return new;
end $$;
drop trigger if exists journal_dates on public.profile_posts;
create trigger journal_dates before insert or update on public.profile_posts for each row execute function public.trg_journal_dates();
drop trigger if exists presentation_dates on public.profile_presentations;
create trigger presentation_dates before insert or update on public.profile_presentations for each row execute function public.trg_journal_dates();
notify pgrst,'reload schema';
commit;
