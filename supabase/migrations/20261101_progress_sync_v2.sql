-- Additive migration. Keep legacy clients working and preserve existing saves.
begin;

alter table public.user_progress add column if not exists state_v2 jsonb;
alter table public.user_progress add column if not exists revision bigint not null default 0;

-- Once this account uses v2, a legacy max(balance) upsert must not undo spending.
-- Other accounts retain the legacy path until they first opt in to v2.
create or replace function public.protect_progress_v2() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if old.state_v2 is not null and new.revision=old.revision then
    raise exception 'SYNC_UPDATE_REQUIRED' using errcode='40001';
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists(select 1 from pg_trigger where tgname='protect_progress_v2' and tgrelid='public.user_progress'::regclass) then
    create trigger protect_progress_v2 before update on public.user_progress for each row execute function public.protect_progress_v2();
  end if;
end $$;

create table if not exists public.progress_sync_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (length(request_id) between 12 and 160),
  response jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);
alter table public.progress_sync_receipts enable row level security;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='progress_sync_receipts' and policyname='own_sync_receipts_select') then
    create policy own_sync_receipts_select on public.progress_sync_receipts for select to authenticated using ((select auth.uid())=user_id);
  end if;
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='progress_sync_receipts' and policyname='own_sync_receipts_insert') then
    create policy own_sync_receipts_insert on public.progress_sync_receipts for insert to authenticated with check ((select auth.uid())=user_id);
  end if;
end $$;
grant select,insert on public.progress_sync_receipts to authenticated;

-- SECURITY INVOKER: existing user_progress RLS and column permissions still apply.
create or replace function public.sync_progress_v2(p_request_id text,p_expected_revision bigint,p_state jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  previous public.user_progress%rowtype;
  result jsonb;
  next_revision bigint;
begin
  if owner_id is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if length(p_request_id) not between 12 and 160 or jsonb_typeof(p_state) <> 'object' then
    raise exception 'INVALID_SYNC_REQUEST' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text,0));
  select response into result from public.progress_sync_receipts where user_id=owner_id and request_id=p_request_id;
  if found then return result; end if;
  select * into previous from public.user_progress where user_id=owner_id for update;
  if coalesce(previous.revision,0) <> p_expected_revision then
    raise exception 'SYNC_CONFLICT' using errcode='40001';
  end if;
  if coalesce((p_state->>'coins')::bigint,0) < 0 or coalesce((p_state->>'xp')::bigint,0) < 0 then
    raise exception 'NEGATIVE_BALANCE' using errcode='22023';
  end if;
  next_revision := coalesce(previous.revision,0)+1;
  insert into public.user_progress(user_id,current_level,coins,total_games,total_wins,best_score,streak,xp,updated_at,state_v2,revision)
  values(owner_id,greatest(coalesce((p_state->>'currentLevel')::integer,1),1),
    coalesce((p_state->>'coins')::bigint,0),coalesce((p_state->>'totalGames')::integer,0),
    coalesce((p_state->>'totalWins')::integer,0),coalesce((p_state->>'bestScore')::bigint,0),
    coalesce((p_state->>'streak')::integer,0),coalesce((p_state->>'xp')::bigint,0),now(),p_state,next_revision)
  on conflict(user_id) do update set current_level=excluded.current_level,coins=excluded.coins,
    total_games=excluded.total_games,total_wins=excluded.total_wins,best_score=excluded.best_score,
    streak=excluded.streak,xp=excluded.xp,updated_at=excluded.updated_at,state_v2=excluded.state_v2,revision=excluded.revision;
  result := jsonb_build_object('revision',next_revision,'state',p_state);
  insert into public.progress_sync_receipts(user_id,request_id,response) values(owner_id,p_request_id,result);
  return result;
end;
$$;
revoke all on function public.sync_progress_v2(text,bigint,jsonb) from public,anon;
grant execute on function public.sync_progress_v2(text,bigint,jsonb) to authenticated;

commit;
