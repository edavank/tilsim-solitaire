-- Staged migration. Apply with the compatible client; no legacy row is deleted
-- or claimed by a client-supplied device ID. Historical rows remain read-only.
begin;
alter table public.leaderboard add column if not exists owner_id uuid references auth.users(id) on delete cascade;
create unique index if not exists leaderboard_owner_id_key on public.leaderboard(owner_id);
alter table public.leaderboard enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='leaderboard' loop
    execute format('drop policy %I on public.leaderboard',p.policyname);
  end loop;
end $$;
revoke all on public.leaderboard from public,anon,authenticated;
grant select on public.leaderboard to anon,authenticated;
grant update(display_name) on public.leaderboard to authenticated;
create policy leaderboard_read on public.leaderboard for select to anon,authenticated using (true);
create policy leaderboard_insert_owned on public.leaderboard for insert to authenticated
  with check ((select auth.uid())=owner_id and device_id='user_'||(select auth.uid())::text);
create policy leaderboard_update_owned on public.leaderboard for update to authenticated
  using ((select auth.uid())=owner_id)
  with check ((select auth.uid())=owner_id and device_id='user_'||(select auth.uid())::text);
create policy leaderboard_delete_owned on public.leaderboard for delete to authenticated
  using ((select auth.uid())=owner_id);

-- Scores come from this caller's synced progress, never a supplied score/device ID.
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
