-- =====================================================================
-- Migration 0029 · Notifications de la communauté (la cloche de Grindleveling)
-- =====================================================================
-- À exécuter après 0028. Idempotente.
--
-- Créées uniquement par des triggers côté serveur (jamais par le navigateur) :
--  - mention : quelqu'un t'a mentionné (@[pseudo](u:<id>)) dans le tchat ;
--  - inscription : un membre s'inscrit à ton événement ;
--  - evenement_modifie / evenement_annule : un événement auquel tu es inscrit change ou est annulé.
-- Chacun ne lit, ne marque lu et ne supprime que ses propres notifications.
-- Les rappels « ça commence bientôt » sont calculés à l'affichage (aucune tâche planifiée).
-- =====================================================================
begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  kind text not null check (kind in ('mention','inscription','evenement_modifie','evenement_annule')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 300),
  link text not null default '/chat' check (link ~ '^/[^/]' and char_length(link) <= 300),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select, delete on public.notifications to authenticated;
drop policy if exists notifications_select on public.notifications;
drop policy if exists notifications_delete on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
 if auth.uid() is null then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_ids is null or id = any(p_ids));
 get diagnostics n = row_count;
 return n;
end $$;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Pseudo affiché d'un membre.
create or replace function public.f_display_name(p_user uuid)
returns text language sql stable security definer set search_path=public as $$
 select coalesce(nullif(btrim(display_name),''), operator_code, 'Un joueur') from public.profiles where user_id = p_user
$$;
revoke all on function public.f_display_name(uuid) from public, anon, authenticated;

-- Mentions du tchat : @[libellé](u:<uuid>) → une notification par personne mentionnée (5 au plus par message).
create or replace function public.trg_chat_mentions()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  target uuid;
  excerpt text := left(regexp_replace(new.body, '@\[([^\]\[()]{1,60})\]\((?:u|c):[A-Za-z0-9-]{1,80}\)', '@\1', 'g'), 140);
begin
  for target in
    select distinct (m[1])::uuid
      from regexp_matches(new.body, '@\[[^\]\[()]{1,60}\]\(u:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)', 'g') m
     limit 5
  loop
    continue when target = new.user_id or not exists(select 1 from public.profiles where user_id = target);
    insert into public.notifications(user_id, kind, title, body, link)
    values (target, 'mention', left(new.sender_name, 60) || ' t’a mentionné dans le tchat', excerpt, '/chat');
  end loop;
  return new;
end $$;
drop trigger if exists chat_mentions_notify on public.chat_messages;
create trigger chat_mentions_notify after insert on public.chat_messages
for each row execute function public.trg_chat_mentions();

-- Inscription à un événement → l'organisateur est prévenu.
create or replace function public.trg_event_registration()
returns trigger language plpgsql security definer set search_path=public as $$
declare e public.community_events%rowtype;
begin
  select * into e from public.community_events where id = new.event_id;
  if found and e.organizer <> new.user_id then
    insert into public.notifications(user_id, kind, title, body, link)
    values (e.organizer, 'inscription', left(public.f_display_name(new.user_id), 60) || ' s’inscrit à ton événement',
            left(e.title, 140), '/evenements/?id=' || e.id);
  end if;
  return new;
end $$;
drop trigger if exists event_registration_notify on public.event_registrations;
create trigger event_registration_notify after insert on public.event_registrations
for each row execute function public.trg_event_registration();

-- Événement annulé ou modifié (date, lieu, lien) → les inscrits sont prévenus.
create or replace function public.trg_event_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare k text; t text;
begin
  if new.cancelled and not old.cancelled then
    k := 'evenement_annule'; t := 'Événement annulé : ' || left(new.title, 100);
  elsif new.starts_at is distinct from old.starts_at or new.ends_at is distinct from old.ends_at
     or new.place is distinct from old.place or new.online_url is distinct from old.online_url or new.mode is distinct from old.mode then
    k := 'evenement_modifie'; t := 'Événement modifié : ' || left(new.title, 100);
  else
    return new;
  end if;
  insert into public.notifications(user_id, kind, title, body, link)
  select r.user_id, k, t,
         case when k = 'evenement_annule' then 'L’organisateur a annulé cet événement.' else 'La date, le lieu ou le lien a changé : vérifie avant d’y aller.' end,
         '/evenements/?id=' || new.id
    from public.event_registrations r where r.event_id = new.id and r.user_id <> new.organizer;
  return new;
end $$;
drop trigger if exists event_change_notify on public.community_events;
create trigger event_change_notify after update on public.community_events
for each row execute function public.trg_event_change();

notify pgrst, 'reload schema';
commit;
