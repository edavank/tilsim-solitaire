-- Additive QA preparation: retain all legacy rows and permissions for installed clients.
-- The final ownership migration is a separate, later cutover.
begin;
alter table public.leaderboard add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create unique index if not exists leaderboard_owner_id_key on public.leaderboard(owner_id);
do $$ begin
 if exists(select 1 from public.leaderboard where owner_id is null and left(device_id,5)='user_') then
  raise exception 'LEGACY_NAMESPACE_REVIEW_REQUIRED';
 end if;
end $$;
create or replace function public.guard_owned_leaderboard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if current_user in ('postgres','service_role','supabase_auth_admin') then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_op='DELETE' then
  if old.owner_id is not null then raise exception 'OWNED_ROW_WRITE_REQUIRED' using errcode='42501'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.owner_id is not null then
  if auth.uid()=old.owner_id and (to_jsonb(new)-'display_name')=(to_jsonb(old)-'display_name') then return new; end if;
  raise exception 'OWNED_ROW_WRITE_REQUIRED' using errcode='42501';
 end if;
 if new.owner_id is not null or left(new.device_id,5)='user_' then
  raise exception 'OWNED_ROW_WRITE_REQUIRED' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function public.guard_owned_leaderboard() from public,anon,authenticated;
drop trigger if exists protect_owned_leaderboard on public.leaderboard;
create trigger protect_owned_leaderboard before insert or update or delete on public.leaderboard
for each row execute function public.guard_owned_leaderboard();
create or replace function public.submit_score_v2(p_display_name text,p_avatar_emoji text,p_language text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare player_id uuid := auth.uid(); progress public.user_progress%rowtype; row_id uuid;
begin
  if player_id is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  select * into progress from public.user_progress where user_id=player_id;
  if not found then raise exception 'PROGRESS_SYNC_REQUIRED' using errcode='22023'; end if;
  insert into public.leaderboard(owner_id,device_id,display_name,avatar_emoji,score,level,total_wins,language,updated_at)
  values(player_id,'user_'||player_id::text,left(coalesce(nullif(btrim(p_display_name),''),'Oyuncu'),50),
    left(coalesce(nullif(p_avatar_emoji,''),'👤'),16),greatest(coalesce(progress.best_score,0),0),
    greatest(coalesce(progress.current_level,1),1),greatest(coalesce(progress.total_wins,0),0),
    case when p_language in ('tr','en','de','fr','es','ar','ru') then p_language else 'tr' end,now())
  on conflict(owner_id) do update set display_name=excluded.display_name,avatar_emoji=excluded.avatar_emoji,
    score=excluded.score,level=excluded.level,total_wins=excluded.total_wins,language=excluded.language,updated_at=excluded.updated_at
  returning id into row_id;
  return jsonb_build_object('id',row_id);
end;
$$;
revoke all on function public.submit_score_v2(text,text,text) from public,anon;
grant execute on function public.submit_score_v2(text,text,text) to authenticated;
commit;
