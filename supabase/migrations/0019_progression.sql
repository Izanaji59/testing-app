begin;

-- Cumulative XP anchors shared with lib/engine/xp.ts. Existing XP is retained.
create or replace function public.f_xp_for_level(target_level int)
returns bigint language sql immutable set search_path=public as $$
 select floor(case
 when target_level <= 1 then 0
 when target_level <= 10 then (target_level-1)*4000.0/9
 when target_level <= 25 then 4000+(target_level-10)*8000.0/15
 when target_level <= 50 then 12000+(target_level-25)*18000.0/25
 when target_level <= 80 then 30000+(target_level-50)*35000.0/30
 when target_level <= 110 then 65000+(target_level-80)*85000.0/30
 else 150000+(target_level-110)*5000.0 end)::bigint
$$;
create or replace function public.f_level_for_xp(amount bigint)
returns int language plpgsql immutable set search_path=public as $$
declare lv int:=1;
begin
 while public.f_xp_for_level(lv+1)<=amount loop lv:=lv+1; end loop;
 return lv;
end $$;

create or replace function public.f_quest_budget(t difficulty_tier, minutes int)
returns int language sql immutable set search_path=public as $$
 select greatest(1,least(coalesce(minutes,30),case coalesce(t,'ROUTINE')
 when 'TRIVIAL' then 15 when 'ROUTINE' then 35 when 'NOTABLE' then 80
 when 'HARD' then 180 else 400 end))
$$;
create or replace function public.f_base_xp_for_tier(t difficulty_tier)
returns int language sql immutable as $$
 select case t when 'TRIVIAL' then 15 when 'ROUTINE' then 35 when 'NOTABLE' then 80 when 'HARD' then 180 when 'LEGENDARY' then 400 end
$$;

-- A project counts only after completion, with three completed non-flash quests.
create or replace function public.f_rank_projects(p_user uuid)
returns int language sql stable set search_path=public as $$
 select count(*)::int from public.projects p where p.user_id=p_user and p.status='COMPLETED'
 and (select count(*) from public.quests q where q.project_id=p.id and q.user_id=p_user and q.status='COMPLETED' and not q.is_flash)>=3
$$;
create or replace function public.f_earned_rank(amount bigint, completed_projects int)
returns rank_letter language sql immutable set search_path=public as $$
 select case when amount>=300000 and completed_projects>=12 then 'MONARCH'::rank_letter
 when amount>=150000 and completed_projects>=8 then 'S'::rank_letter
 when amount>=65000 and completed_projects>=3 then 'A'::rank_letter
 when amount>=30000 then 'B'::rank_letter when amount>=12000 then 'C'::rank_letter
 when amount>=4000 then 'D'::rank_letter else 'E'::rank_letter end
$$;
create or replace function public.trg_progression_profile()
returns trigger language plpgsql set search_path=public as $$
declare lv int;
begin
 if current_user in ('authenticated','anon') then
   if TG_OP='INSERT' then
     new.total_xp:=0;new.level:=1;new.rank_letter:='E';new.rank_tier:='NEUTRAL';new.mastery_points:=0;new.constance:=0;
   elsif new.total_xp is distinct from old.total_xp or new.level is distinct from old.level
      or new.rank_letter is distinct from old.rank_letter or new.rank_tier is distinct from old.rank_tier
      or new.mastery_points is distinct from old.mastery_points or new.constance is distinct from old.constance then
     raise exception 'La progression est calculée par Grindleveling';
   end if;
 else
   lv:=public.f_level_for_xp(new.total_xp);
   new.level:=lv;
   if TG_OP='UPDATE' then new.mastery_points:=old.mastery_points+greatest(0,lv-old.level); end if;
   new.rank_letter:=public.f_earned_rank(new.total_xp,public.f_rank_projects(new.user_id));
   new.rank_tier:='NEUTRAL';
 end if;
 return new;
end $$;
drop trigger if exists progression_profile on public.profiles;
create trigger progression_profile before insert or update on public.profiles for each row execute function public.trg_progression_profile();

create or replace function public.apply_stat_xp(p_user uuid,p_stat stat_kind,p_amount int)
returns void language plpgsql security definer set search_path=public as $$
declare remaining bigint; lv int;
begin
 if p_stat is null or p_amount<=0 then return; end if;
 insert into public.stats(user_id,kind) values(p_user,p_stat) on conflict(user_id,kind) do nothing;
 update public.stats set xp=xp+p_amount,last_gain_at=now(),decay_pct=0
 where user_id=p_user and kind=p_stat returning xp,level into remaining,lv;
 while remaining>=public.f_stat_xp_for_level(lv) loop
   remaining:=remaining-public.f_stat_xp_for_level(lv);lv:=lv+1;
 end loop;
 update public.stats set xp=remaining,level=lv where user_id=p_user and kind=p_stat;
end $$;
revoke all on function public.apply_stat_xp(uuid,stat_kind,int) from public,anon,authenticated;

-- One global award, never multiplied by the number of selected statistics.
-- Daily ceiling is explicit; no hidden diversity penalty and no random award.
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
 where user_id=p_user and created_at >= date_trunc('day',now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
 credited:=least(p_amount,greatest(0,600-daily));
 insert into public.xp_events(user_id,source,source_ref_id,stat_kind,xp_amount,is_crit,metadata)
 values(p_user,p_source,p_ref_id,p_stat,credited,false,jsonb_build_object('progression_version',2,'budget',p_amount,'daily_cap',600));
 perform public.apply_stat_xp(p_user,p_stat,credited);
 update public.profiles set total_xp=total_xp+credited,last_active_at=now(),updated_at=now() where user_id=p_user;
end $$;
revoke all on function public.award_xp(uuid,xp_source,uuid,stat_kind,int,boolean,numeric) from public,anon,authenticated;

create or replace function public.trg_freeze_quest_budget()
returns trigger language plpgsql set search_path=public as $$
begin
 if TG_OP='INSERT' then new.reward_xp_base:=public.f_quest_budget(new.difficulty_tier,new.estimated_minutes);
 else new.reward_xp_base:=coalesce(old.reward_xp_base,public.f_quest_budget(old.difficulty_tier,old.estimated_minutes)); end if;
 return new;
end $$;
drop trigger if exists a_quest_budget on public.quests;
create trigger a_quest_budget before insert or update on public.quests for each row execute function public.trg_freeze_quest_budget();

create or replace function public.trg_on_quest_completed()
returns trigger language plpgsql security definer set search_path=public as $$
declare earned int; kinds stat_kind[]; k stat_kind; i int:=0; n int;
begin
 if new.status='COMPLETED' and old.status is distinct from 'COMPLETED' then
   new.completed_at:=coalesce(new.completed_at,now());
   perform 1 from public.profiles where user_id=new.user_id for update;
   if exists(select 1 from public.xp_events where user_id=new.user_id and source='QUEST_COMPLETE' and source_ref_id=new.id) then return new; end if;
   perform public.award_xp(new.user_id,'QUEST_COMPLETE',new.id,null,coalesce(new.reward_xp_base,public.f_quest_budget(new.difficulty_tier,new.estimated_minutes)),false,null);
   select xp_amount into earned from public.xp_events where user_id=new.user_id and source='QUEST_COMPLETE' and source_ref_id=new.id order by created_at desc limit 1;
   select array_agg(distinct x order by x) into kinds from unnest(new.reward_stats) x where x not in ('REVENU','RESIGNATION');
   if coalesce(array_length(kinds,1),0)=0 then kinds:=array['DISCIPLINE']::stat_kind[]; end if;
   n:=array_length(kinds,1);
   foreach k in array kinds loop
     i:=i+1;perform public.apply_stat_xp(new.user_id,k,earned/n+case when i<=earned%n then 1 else 0 end);
   end loop;
   update public.xp_events set stat_kind=kinds[1],metadata=metadata||jsonb_build_object('reward_stats',kinds)
   where user_id=new.user_id and source='QUEST_COMPLETE' and source_ref_id=new.id;
   if coalesce(new.reward_eur,0)>0 then perform public.apply_stat_xp(new.user_id,'REVENU',least(round(new.reward_eur),2147483647)::int); end if;
 end if;
 return new;
end $$;

create or replace function public.trg_on_project_completed()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='COMPLETED' and old.status is distinct from 'COMPLETED' then
   new.completed_at:=coalesce(new.completed_at,now());
   if exists(select 1 from public.quests where project_id=new.id and user_id=new.user_id and status='COMPLETED' and not is_flash) then
     perform public.award_xp(new.user_id,'ADJUSTMENT',new.id,new.primary_stat,100,false,null);
   end if;
 end if;
 return new;
end $$;
create or replace function public.trg_refresh_rank()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.profiles set total_xp=total_xp where user_id=new.user_id;
 return new;
end $$;
drop trigger if exists project_completed on public.projects;
create trigger project_completed before update on public.projects for each row execute function public.trg_on_project_completed();
drop trigger if exists project_rank on public.projects;
create trigger project_rank after update of status on public.projects for each row when(old.status is distinct from new.status) execute function public.trg_refresh_rank();
drop trigger if exists quest_rank on public.quests;
create trigger quest_rank after update of status on public.quests for each row when(old.status is distinct from new.status) execute function public.trg_refresh_rank();

-- Existing rewards remain intact; only the level/rank presentation is recalibrated.
update public.profiles set total_xp=total_xp;

-- Earned statistics cannot be edited through the profile editor or direct client writes.
revoke insert,update,delete on public.stats,public.xp_events from anon,authenticated;
alter function public.trg_on_profile_created() security definer;
alter function public.trg_on_profile_created() set search_path=public;

notify pgrst,'reload schema';
commit;
