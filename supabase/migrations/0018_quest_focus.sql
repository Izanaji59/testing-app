begin;
alter table public.sessions add column if not exists focus_seconds integer check (focus_seconds between 0 and 10800);
alter table public.sessions add column if not exists quest_completed boolean not null default false;
create index if not exists idx_sessions_quest_focus on public.sessions(quest_id) where focus_seconds is not null;

create or replace function public.save_quest_focus(
 p_session_id uuid, p_quest_id uuid, p_started_at timestamptz, p_ended_at timestamptz,
 p_focus_seconds integer, p_interruptions integer, p_notes text, p_complete boolean
) returns boolean language plpgsql security definer set search_path = public as $$
declare
 q public.quests%rowtype;
 previous public.sessions%rowtype;
 previous_seconds bigint;
 minutes_delta integer;
 completed boolean;
begin
 if auth.uid() is null then raise exception 'Authentification requise'; end if;
 if p_session_id is null or p_quest_id is null then raise exception 'Session et quête requises'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));
 select * into previous from public.sessions where id = p_session_id;
 if found then
   if previous.user_id <> auth.uid() or previous.quest_id is distinct from p_quest_id or previous.focus_seconds is null then
     raise exception 'Session incompatible';
   end if;
   return previous.quest_completed or exists(select 1 from public.quests where id = p_quest_id and user_id = auth.uid() and status = 'COMPLETED');
 end if;
 if p_focus_seconds is null or p_focus_seconds not between 0 and 10800
    or p_interruptions is null or p_interruptions not between 0 and 10000
    or p_started_at is null or p_ended_at is null or not isfinite(p_started_at) or not isfinite(p_ended_at) or p_started_at > p_ended_at
    or p_ended_at > now() + interval '5 minutes'
    or p_focus_seconds > extract(epoch from p_ended_at - p_started_at) + 1
    or p_complete is null or char_length(coalesce(p_notes,'')) > 1000 then
   raise exception 'Bilan invalide';
 end if;
 select * into q from public.quests where id = p_quest_id and user_id = auth.uid() for update;
 if not found then raise exception 'Quête introuvable'; end if;
 if q.status = 'SKIPPED' then raise exception 'Cette quête a été abandonnée'; end if;
 select coalesce(sum(focus_seconds),0) into previous_seconds from public.sessions
   where quest_id = q.id and user_id = auth.uid();
 -- Les secondes sont exactes. Les minutes affichées sont arrondies sur le total,
 -- sans ajouter une minute supplémentaire à chaque courte session.
 minutes_delta := ceil((previous_seconds + p_focus_seconds)::numeric / 60)::integer
                  - ceil(previous_seconds::numeric / 60)::integer;
 completed := p_complete or q.status = 'COMPLETED';
 insert into public.sessions(id,user_id,quest_id,started_at,ended_at,focus_seconds,interruptions,notes,quest_completed)
 values(p_session_id,auth.uid(),q.id,p_started_at,p_ended_at,p_focus_seconds,p_interruptions,coalesce(p_notes,''),p_complete and q.status <> 'COMPLETED');
 update public.quests set
   actual_minutes = coalesce(actual_minutes,0) + minutes_delta,
   status = case when p_complete then 'COMPLETED'::quest_status else status end,
   completed_at = case when p_complete then coalesce(completed_at,now()) else completed_at end
 where id = q.id;
 -- La validation utilise les triggers existants : XP et progression du projet.
 -- Une quête déjà terminée ne redonne donc pas ses récompenses.
 return completed;
end;
$$;
revoke all on function public.save_quest_focus(uuid,uuid,timestamptz,timestamptz,integer,integer,text,boolean) from public,anon;
grant execute on function public.save_quest_focus(uuid,uuid,timestamptz,timestamptz,integer,integer,text,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
