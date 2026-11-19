-- Fiction community uses the existing Slumbywise account; never awards XP or edits profiles.
begin;
create table if not exists public.fiction_characters (
 id text primary key check (id ~ '^(tmdb-credit-[0-9a-f]{6,40}|anilist-char-[0-9]{1,9}|community-char-[0-9a-f-]{36})$'),
 name text not null check (length(btrim(name)) between 1 and 120),
 title_id text not null default '', title text not null check(length(btrim(title)) between 1 and 180),
 image_url text, image_kind text not null default 'illustration' check(image_kind in ('actor','illustration')),
 source text not null check(source in ('tmdb','anilist','community')),source_url text not null default '',
 created_by uuid references public.profiles(user_id) on delete set null,created_at timestamptz not null default now(),
 check(image_url is null or (length(image_url)<=2048 and image_url ~ '^https://[^[:space:]<>"@]+$'))
);
create unique index if not exists fiction_community_name_work on public.fiction_characters(lower(btrim(name)),lower(btrim(title))) where source='community';
create table if not exists public.fiction_votes (
 character_id text not null references public.fiction_characters(id) on delete cascade,
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 mbti text not null check(mbti ~ '^[EI][NS][TF][JP]$'),updated_at timestamptz not null default now(),
 primary key(character_id,user_id)
);
create table if not exists public.fiction_images (
 character_id text not null references public.fiction_characters(id) on delete cascade,
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 image_url text not null check(length(image_url)<=2048 and image_url ~ '^https://[^[:space:]<>"@]+$'),
 updated_at timestamptz not null default now(),primary key(character_id,user_id)
);
alter table public.fiction_characters enable row level security;
alter table public.fiction_votes enable row level security;
alter table public.fiction_images enable row level security;
revoke all on public.fiction_characters,public.fiction_votes,public.fiction_images from public,anon,authenticated;

create or replace function public.get_fiction_community()
returns jsonb language sql stable security definer set search_path=public as $$
 with counts as (
  select character_id,mbti,count(*)::int n from public.fiction_votes group by character_id,mbti
 ), totals as (
  select character_id,jsonb_object_agg(mbti,n) counts,sum(n)::int total,
   array_agg(mbti order by n desc,mbti) types,array_agg(n order by n desc,mbti) numbers
  from counts group by character_id
 ), images as (
  select distinct on(character_id) character_id,image_url from public.fiction_images order by character_id,updated_at desc,user_id
 )
 select jsonb_build_object(
  'characters',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'titleId',c.title_id,'title',c.title,'image',c.image_url,'imageKind',c.image_kind,'source','community','sourceUrl','')) from public.fiction_characters c where c.source='community'),'[]'::jsonb),
  'images',coalesce((select jsonb_object_agg(character_id,image_url) from images),'{}'::jsonb),
  'votes',coalesce((select jsonb_object_agg(character_id,jsonb_build_object('counts',counts,'total',total,'leader',case when numbers[1]>coalesce(numbers[2],0) then types[1] else null end)) from totals),'{}'::jsonb),
  'myVotes',coalesce((select jsonb_object_agg(character_id,mbti) from public.fiction_votes where user_id=auth.uid()),'{}'::jsonb)
 )
$$;

create or replace function public.vote_fiction_character(p_character_id text,p_mbti text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if p_mbti is null or upper(btrim(p_mbti)) !~ '^[EI][NS][TF][JP]$' then raise exception 'Choisis un type MBTI valide'; end if;
 if not exists(select 1 from public.fiction_characters where id=p_character_id) then raise exception 'Personnage introuvable'; end if;
 insert into public.fiction_votes(character_id,user_id,mbti) values(p_character_id,auth.uid(),upper(btrim(p_mbti)))
 on conflict(character_id,user_id) do update set mbti=excluded.mbti,updated_at=now();
end $$;

create or replace function public.submit_fiction_character(p_name text,p_title text,p_title_id text default '',p_image_url text default null)
returns text language plpgsql security definer set search_path=public as $$
declare new_id text:='community-char-'||gen_random_uuid()::text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if p_name is null or length(btrim(p_name)) not between 1 and 120 or p_title is null or length(btrim(p_title)) not between 1 and 180 then raise exception 'Indique le personnage et son œuvre'; end if;
 if exists(select 1 from public.fiction_characters where lower(btrim(name))=lower(btrim(p_name)) and lower(btrim(title))=lower(btrim(p_title))) then raise exception 'Ce personnage est déjà présent dans cette œuvre'; end if;
 if length(coalesce(p_title_id,''))>100 or (coalesce(p_title_id,'')<>'' and p_title_id !~ '^(tmdb-(movie|tv)-[0-9]+|open-(movie|tv)-[a-z0-9-]+|source-[a-z0-9]+)$') then raise exception 'Œuvre invalide'; end if;
 insert into public.fiction_characters(id,name,title_id,title,image_url,image_kind,source,created_by)
 values(new_id,btrim(p_name),coalesce(p_title_id,''),btrim(p_title),nullif(btrim(p_image_url),''),'illustration','community',auth.uid());
 return new_id;
end $$;

create or replace function public.submit_fiction_image(p_character_id text,p_image_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where user_id=auth.uid()) then raise exception 'Connecte-toi à ton compte Slumbywise'; end if;
 if not exists(select 1 from public.fiction_characters where id=p_character_id) then raise exception 'Personnage introuvable'; end if;
 if p_image_url is null or length(p_image_url)>2048 or p_image_url !~ '^https://[^[:space:]<>"@]+$' then raise exception 'Image HTTPS requise'; end if;
 insert into public.fiction_images(character_id,user_id,image_url) values(p_character_id,auth.uid(),p_image_url)
 on conflict(character_id,user_id) do update set image_url=excluded.image_url,updated_at=now();
end $$;

revoke all on function public.get_fiction_community() from public;
grant execute on function public.get_fiction_community() to anon,authenticated;
revoke all on function public.vote_fiction_character(text,text),public.submit_fiction_character(text,text,text,text),public.submit_fiction_image(text,text) from public,anon;
grant execute on function public.vote_fiction_character(text,text),public.submit_fiction_character(text,text,text,text),public.submit_fiction_image(text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('character-images','character-images',true,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists fiction_images_upload on storage.objects;
create policy fiction_images_upload on storage.objects for insert to authenticated
with check(bucket_id='character-images' and (storage.foldername(name))[1]=auth.uid()::text and lower(storage.extension(name)) in ('jpg','jpeg','png','webp'));
drop policy if exists fiction_images_remove on storage.objects;
create policy fiction_images_remove on storage.objects for delete to authenticated
using(bucket_id='character-images' and (storage.foldername(name))[1]=auth.uid()::text);
commit;
