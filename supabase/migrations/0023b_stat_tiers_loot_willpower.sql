-- =====================================================================
-- 0023b · Difficulté par statistique, butin de donjon, réservoir de volonté
-- =====================================================================
-- À exécuter APRÈS 0023a (valeur d'enum AGUERRISSEMENT).
-- 0. Stat AGUERRISSEMENT créée pour les profils existants.
-- 1. Quêtes et projets : plusieurs statistiques, chacune avec sa difficulté
--    (stat_tiers = {"FOCUS":"NOTABLE","MENTALITE":"HARD"}). La difficulté
--    globale devient la plus haute ; reward_stats / primary_stat suivent.
--    Le budget d'une quête reste UNIQUE (jamais multiplié par le nombre de
--    stats) : il est réparti entre les stats au prorata de leur difficulté.
-- 2. Butin de donjon : l'XP gagnée par les quêtes d'un projet s'accumule en
--    réserve (taux selon la difficulté du projet) et se verse d'un coup dans
--    les stats du projet quand le joueur le termine. Le butin ne compte pas
--    dans le plafond quotidien de 600 XP (il vient d'XP déjà plafonnée).
-- 3. Réservoir de volonté et batterie sociale : déclarations du joueur
--    (distractions qu'il juge ressourçantes ou vidantes, méthode 20/20/20,
--    batterie sociale dépensée ou rechargée) et profil social. Aucun effet sur
--    l'XP ; les jauges sont calculées côté client (lib/engine/willpower.ts,
--    lib/engine/socialBattery.ts).
-- Idempotente.
-- =====================================================================
begin;

insert into public.stats (user_id, kind)
select user_id, 'AGUERRISSEMENT' from public.profiles
on conflict do nothing;

alter table public.quests   add column if not exists stat_tiers jsonb;
alter table public.projects add column if not exists stat_tiers jsonb;

-- Valide {STAT: DIFFICULTÉ}. Revenu (gagné en euros) et résignation (subie) exclus.
create or replace function public.f_clean_stat_tiers(p jsonb)
returns jsonb language plpgsql immutable set search_path=public as $$
declare r record; result jsonb := '{}'::jsonb;
begin
 if p is null or jsonb_typeof(p) = 'null' then return null; end if;
 if jsonb_typeof(p) <> 'object' then raise exception 'Statistiques invalides'; end if;
 for r in select key, value from jsonb_each(p) loop
   if jsonb_typeof(r.value) <> 'string'
      or r.key not in ('DISCIPLINE','FOCUS','INTELLIGENCE','CREATIVITY','LEADERSHIP','FORCE','MENTALITE','TECHNIQUE','SOCIAL','AGUERRISSEMENT')
      or (r.value #>> '{}') not in ('TRIVIAL','ROUTINE','NOTABLE','HARD','LEGENDARY') then
     raise exception 'Statistique ou difficulté invalide : %', r.key;
   end if;
   result := result || jsonb_build_object(r.key, r.value #>> '{}');
 end loop;
 return nullif(result, '{}'::jsonb);
end $$;

-- Poids d'une stat = plafond d'XP de sa difficulté (15 / 35 / 80 / 180 / 400).
create or replace function public.f_stat_weights(p jsonb)
returns table(kind stat_kind, tier difficulty_tier, weight int)
language sql immutable set search_path=public as $$
 select key::stat_kind, value::difficulty_tier, public.f_base_xp_for_tier(value::difficulty_tier)
 from jsonb_each_text(coalesce(p, '{}'::jsonb))
$$;

-- Répartit un montant entier selon des poids ; le reste va aux premiers (les plus lourds).
create or replace function public.f_split_weighted(p_amount int, p_weights int[])
returns int[] language plpgsql immutable set search_path=public as $$
declare n int := coalesce(array_length(p_weights, 1), 0); total bigint; shares int[] := '{}'; given int := 0; i int;
begin
 if n = 0 then return '{}'; end if;
 if coalesce(p_amount, 0) <= 0 then return array_fill(0, array[n]); end if;
 select coalesce(sum(greatest(w, 0)), 0) into total from unnest(p_weights) w;
 if total = 0 then p_weights := array_fill(1, array[n]); total := n; end if;
 for i in 1..n loop
   shares := shares || floor(p_amount::numeric * greatest(p_weights[i], 0) / total)::int;
   given := given + shares[i];
 end loop;
 i := 1;
 while given < p_amount loop
   shares[i] := shares[i] + 1; given := given + 1; i := i % n + 1;
 end loop;
 return shares;
end $$;

-- Quêtes : reward_stats (stat dominante en tête) et difficulté globale suivent stat_tiers.
-- Nom en « a0_ » : passe avant a_quest_budget, qui fige le budget à la création.
create or replace function public.trg_quest_stat_tiers()
returns trigger language plpgsql set search_path=public as $$
declare kinds stat_kind[]; top difficulty_tier;
begin
 new.stat_tiers := public.f_clean_stat_tiers(new.stat_tiers);
 if new.stat_tiers is not null then
   select array_agg(kind order by weight desc, kind::text), (array_agg(tier order by weight desc, kind::text))[1]
     into kinds, top from public.f_stat_weights(new.stat_tiers);
   new.reward_stats := kinds;
   new.difficulty_tier := top;
 end if;
 return new;
end $$;
drop trigger if exists a0_quest_stat_tiers on public.quests;
create trigger a0_quest_stat_tiers before insert or update on public.quests
for each row execute function public.trg_quest_stat_tiers();

-- Projets : stat principale / secondaire et difficulté suivent stat_tiers.
create or replace function public.trg_project_stat_tiers()
returns trigger language plpgsql set search_path=public as $$
declare kinds stat_kind[]; top difficulty_tier;
begin
 new.stat_tiers := public.f_clean_stat_tiers(new.stat_tiers);
 if new.stat_tiers is not null then
   select array_agg(kind order by weight desc, kind::text), (array_agg(tier order by weight desc, kind::text))[1]
     into kinds, top from public.f_stat_weights(new.stat_tiers);
   new.primary_stat := kinds[1];
   new.secondary_stat := kinds[2];
   new.difficulty := top;
 end if;
 return new;
end $$;
drop trigger if exists a0_project_stat_tiers on public.projects;
create trigger a0_project_stat_tiers before insert or update on public.projects
for each row execute function public.trg_project_stat_tiers();

-- Plafond quotidien inchangé (600 XP), mais le butin de donjon n'y entre pas.
create or replace function public.award_xp(p_user uuid,p_source xp_source,p_ref_id uuid,p_stat stat_kind,p_amount int,p_is_crit boolean default false,p_crit_mult numeric default null)
returns void language plpgsql security definer set search_path=public as $$
declare daily int; credited int;
begin
 perform 1 from public.profiles where user_id=p_user for update;
 if not found or p_amount is null or p_amount<=0 then return; end if;
 if p_source in ('QUEST_COMPLETE','ADJUSTMENT') and p_ref_id is not null and exists(
   select 1 from public.xp_events where user_id=p_user and source=p_source and source_ref_id=p_ref_id
 ) then return; end if;
 select coalesce(sum(greatest(0,xp_amount)),0)::int into daily from public.xp_events
 where user_id=p_user and created_at >= date_trunc('day',now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
   and coalesce(metadata->>'kind','') <> 'project_loot';
 credited:=least(p_amount,greatest(0,600-daily));
 insert into public.xp_events(user_id,source,source_ref_id,stat_kind,xp_amount,is_crit,metadata)
 values(p_user,p_source,p_ref_id,p_stat,credited,false,jsonb_build_object('progression_version',2,'budget',p_amount,'daily_cap',600));
 perform public.apply_stat_xp(p_user,p_stat,credited);
 update public.profiles set total_xp=total_xp+credited,last_active_at=now(),updated_at=now() where user_id=p_user;
end $$;
revoke all on function public.award_xp(uuid,xp_source,uuid,stat_kind,int,boolean,numeric) from public,anon,authenticated;

-- Validation d'une quête : budget unique, réparti au prorata des difficultés
-- (à parts égales pour les anciennes quêtes sans stat_tiers, comme avant).
create or replace function public.trg_on_quest_completed()
returns trigger language plpgsql security definer set search_path=public as $$
declare earned int; kinds stat_kind[]; weights int[]; shares int[]; i int;
begin
 if new.status='COMPLETED' and old.status is distinct from 'COMPLETED' then
   new.completed_at:=coalesce(new.completed_at,now());
   perform 1 from public.profiles where user_id=new.user_id for update;
   if exists(select 1 from public.xp_events where user_id=new.user_id and source='QUEST_COMPLETE' and source_ref_id=new.id) then return new; end if;
   perform public.award_xp(new.user_id,'QUEST_COMPLETE',new.id,null,coalesce(new.reward_xp_base,public.f_quest_budget(new.difficulty_tier,new.estimated_minutes)),false,null);
   select xp_amount into earned from public.xp_events where user_id=new.user_id and source='QUEST_COMPLETE' and source_ref_id=new.id order by created_at desc limit 1;
   earned := coalesce(earned, 0);
   if new.stat_tiers is not null then
     select array_agg(kind order by weight desc, kind::text), array_agg(weight order by weight desc, kind::text)
       into kinds, weights from public.f_stat_weights(new.stat_tiers);
   else
     select array_agg(distinct x order by x) into kinds from unnest(new.reward_stats) x where x not in ('REVENU','RESIGNATION');
     weights := array_fill(1, array[coalesce(array_length(kinds,1),0)]);
   end if;
   if coalesce(array_length(kinds,1),0)=0 then kinds:=array['DISCIPLINE']::stat_kind[]; weights:=array[1]; end if;
   shares := public.f_split_weighted(earned, weights);
   for i in 1..array_length(kinds,1) loop
     perform public.apply_stat_xp(new.user_id,kinds[i],shares[i]);
   end loop;
   update public.xp_events set stat_kind=kinds[1],metadata=metadata||jsonb_build_object('reward_stats',kinds,'shares',shares)
   where user_id=new.user_id and source='QUEST_COMPLETE' and source_ref_id=new.id;
   if coalesce(new.reward_eur,0)>0 then perform public.apply_stat_xp(new.user_id,'REVENU',least(round(new.reward_eur),2147483647)::int); end if;
 end if;
 return new;
end $$;

-- Taux du butin selon la difficulté du projet.
create or replace function public.f_loot_rate(t difficulty_tier)
returns numeric language sql immutable set search_path=public as $$
 select case coalesce(t,'NOTABLE') when 'TRIVIAL' then 0.25 when 'ROUTINE' then 0.40
   when 'NOTABLE' then 0.60 when 'HARD' then 0.80 else 1.00 end
$$;

-- XP réellement créditée par les quêtes terminées d'un projet (quêtes flash exclues).
create or replace function public.f_project_earned(p_project uuid)
returns int language sql stable set search_path=public as $$
 select coalesce(sum(greatest(e.xp_amount,0)),0)::int
 from public.quests q
 join public.xp_events e on e.source='QUEST_COMPLETE' and e.source_ref_id=q.id and e.user_id=q.user_id
 where q.project_id=p_project and q.status='COMPLETED' and not q.is_flash
$$;

-- Fin d'un projet : verse le butin une seule fois, hors plafond quotidien.
create or replace function public.trg_on_project_completed()
returns trigger language plpgsql security definer set search_path=public as $$
declare earned int; rate numeric; loot int; kinds stat_kind[]; weights int[]; shares int[]; i int;
begin
 if new.status='COMPLETED' and old.status is distinct from 'COMPLETED' then
   new.completed_at:=coalesce(new.completed_at,now());
   perform 1 from public.profiles where user_id=new.user_id for update;
   if not found then return new; end if;
   if exists(select 1 from public.xp_events where user_id=new.user_id and source='ADJUSTMENT' and source_ref_id=new.id) then return new; end if;
   earned := public.f_project_earned(new.id);
   rate := public.f_loot_rate(new.difficulty);
   loot := floor(earned * rate)::int;
   if loot <= 0 then return new; end if;
   if new.stat_tiers is not null then
     select array_agg(kind order by weight desc, kind::text), array_agg(weight order by weight desc, kind::text)
       into kinds, weights from public.f_stat_weights(new.stat_tiers);
   elsif new.primary_stat is not null and new.primary_stat not in ('REVENU','RESIGNATION') then
     kinds := array[new.primary_stat]; weights := array[1];
   end if;
   if coalesce(array_length(kinds,1),0)=0 then kinds:=array['DISCIPLINE']::stat_kind[]; weights:=array[1]; end if;
   shares := public.f_split_weighted(loot, weights);
   insert into public.xp_events(user_id,source,source_ref_id,stat_kind,xp_amount,is_crit,metadata)
   values(new.user_id,'ADJUSTMENT',new.id,kinds[1],loot,false,jsonb_build_object(
     'kind','project_loot','progression_version',3,'earned',earned,'rate',rate,'reward_stats',kinds,'shares',shares));
   for i in 1..array_length(kinds,1) loop
     perform public.apply_stat_xp(new.user_id,kinds[i],shares[i]);
   end loop;
   update public.profiles set total_xp=total_xp+loot,last_active_at=now(),updated_at=now() where user_id=new.user_id;
 end if;
 return new;
end $$;

-- Butin en réserve de chaque projet du joueur connecté (RLS appliquée).
create or replace function public.get_project_loot()
returns table(project_id uuid, earned_xp int, loot_xp int, rate numeric, paid_xp int)
language sql stable security invoker set search_path=public as $$
 select p.id, e.earned, floor(e.earned * public.f_loot_rate(p.difficulty))::int, public.f_loot_rate(p.difficulty),
   (select x.xp_amount from public.xp_events x where x.user_id=p.user_id and x.source='ADJUSTMENT' and x.source_ref_id=p.id limit 1)
 from public.projects p
 cross join lateral (select public.f_project_earned(p.id) as earned) e
 where p.user_id = auth.uid()
$$;
revoke all on function public.get_project_loot() from public, anon;
grant execute on function public.get_project_loot() to authenticated;

-- Réservoir de volonté et batterie sociale : ce que le joueur déclare (le reste vient des
-- quêtes et du minuteur).
-- Une distraction est jugée par le joueur : RECHARGE (il s'en est ressourcé) ou DOPAMINE
-- (elle l'a vidé), quelle qu'elle soit. RITUAL = méthode 20/20/20 faite.
-- Batterie sociale, au ressenti : SOCIAL_SPENT (un peu / beaucoup) et SOCIAL_RECHARGE
-- (un peu / à moitié / complètement), sans durée.
create table if not exists public.willpower_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(user_id) on delete cascade,
  kind        text not null check (kind in ('DOPAMINE','RECHARGE','RITUAL','SOCIAL_SPENT','SOCIAL_RECHARGE')),
  activity    text not null,
  minutes     int check (minutes between 1 and 1440),
  occurred_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  check (
    (kind in ('DOPAMINE','RECHARGE') and minutes is not null and activity in (
      'LECTURE','MARCHE','SPORT','MEDITATION','NATURE','RENCONTRE','NETWORKING','AVENTURE','LOISIR',
      'ECHECS','JEU_VIDEO','JEU_ARGENT','VIDEO','SCROLL','AUTRE'))
    or (kind = 'RITUAL' and minutes is not null and activity = 'RITUEL_202020')
    or (kind = 'SOCIAL_SPENT' and activity in ('UN_PEU','BEAUCOUP'))
    or (kind = 'SOCIAL_RECHARGE' and activity in ('UN_PEU','MOITIE','COMPLET'))
  )
);

-- Profil social du joueur ; null = déduit du MBTI (I → introverti, E → extraverti).
alter table public.profiles add column if not exists social_profile text;
alter table public.profiles drop constraint if exists profiles_social_profile_check;
alter table public.profiles add constraint profiles_social_profile_check
  check (social_profile is null or social_profile in ('INTROVERTI','EXTRAVERTI','AMBIVERTI'));
create index if not exists idx_willpower_events_user_time on public.willpower_events(user_id, occurred_at desc);

-- Déclaration datée au plus 36 h en arrière (« ce matin ») et jamais dans le futur.
create or replace function public.trg_willpower_event_time()
returns trigger language plpgsql set search_path=public as $$
begin
 new.created_at := now();
 if new.occurred_at is null or new.occurred_at > now() + interval '5 minutes' or new.occurred_at < now() - interval '36 hours' then
   new.occurred_at := now();
 end if;
 return new;
end $$;
drop trigger if exists willpower_event_time on public.willpower_events;
create trigger willpower_event_time before insert on public.willpower_events
for each row execute function public.trg_willpower_event_time();

alter table public.willpower_events enable row level security;
drop policy if exists "willpower_events_select" on public.willpower_events;
drop policy if exists "willpower_events_insert" on public.willpower_events;
drop policy if exists "willpower_events_delete" on public.willpower_events;
create policy "willpower_events_select" on public.willpower_events for select using (auth.uid() = user_id);
create policy "willpower_events_insert" on public.willpower_events for insert with check (auth.uid() = user_id);
create policy "willpower_events_delete" on public.willpower_events for delete using (auth.uid() = user_id);
revoke all on public.willpower_events from anon;
grant select, insert, delete on public.willpower_events to authenticated;

notify pgrst,'reload schema';
commit;
