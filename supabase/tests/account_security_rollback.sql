-- Run after the ownership migration INSIDE the same uncommitted transaction.
-- Only generated test IDs are used; no existing player record is selected/deleted.
create temporary table audit_player_ids(a uuid,b uuid) on commit drop;
alter table audit_player_ids enable row level security;
create policy audit_fixture_read on audit_player_ids for select to authenticated,anon using (true);
insert into audit_player_ids values(gen_random_uuid(),gen_random_uuid());
grant select on audit_player_ids to authenticated,anon;
insert into auth.users(id) select a from audit_player_ids union all select b from audit_player_ids;
insert into public.user_progress(user_id,best_score,current_level,total_wins)
select a,17,3,2 from audit_player_ids union all select b,99,8,7 from audit_player_ids;
insert into public.progress_sync_receipts(user_id,request_id,response)
select b,'audit-cascade-only', '{}'::jsonb from audit_player_ids;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true) from audit_player_ids;
set local role authenticated;
select public.submit_score_v2('audit A','👤','tr');
do $$ begin
 if (select score from public.leaderboard where owner_id=(select a from pg_temp.audit_player_ids)) <> 17 then raise exception 'FAIL: score not derived from progress'; end if;
 begin update public.leaderboard set score=999 where owner_id=(select a from pg_temp.audit_player_ids); raise exception 'FAIL: direct score write allowed'; exception when insufficient_privilege then null; end;
 begin update public.leaderboard set owner_id=(select b from pg_temp.audit_player_ids) where owner_id=(select a from pg_temp.audit_player_ids); raise exception 'FAIL: owner rewrite allowed'; exception when insufficient_privilege then null; end;
 begin insert into public.leaderboard(owner_id,device_id) select b,'user_'||b::text from pg_temp.audit_player_ids; raise exception 'FAIL: forged insert allowed'; exception when insufficient_privilege then null; end;
 update public.leaderboard set display_name='audit own' where owner_id=(select a from pg_temp.audit_player_ids);
 if not found then raise exception 'FAIL: own profile update blocked'; end if;
 if exists(select 1 from public.user_progress where user_id=(select b from pg_temp.audit_player_ids)) then raise exception 'FAIL: another account progress readable'; end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true) from audit_player_ids;
set local role authenticated;
select public.submit_score_v2('audit B','👤','tr');
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true) from audit_player_ids;
set local role authenticated;
do $$ declare changed integer; begin
 update public.leaderboard set display_name='forged' where owner_id=(select b from pg_temp.audit_player_ids);
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL: cross-account profile write'; end if;
 update public.user_progress set coins=1 where user_id=(select b from pg_temp.audit_player_ids);
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'FAIL: cross-account progress write'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$ begin
 if not exists(select 1 from public.leaderboard where owner_id=(select b from pg_temp.audit_player_ids)) then raise exception 'FAIL: public score read blocked'; end if;
 begin update public.leaderboard set display_name='anon' where owner_id=(select b from pg_temp.audit_player_ids); raise exception 'FAIL: anonymous write'; exception when insufficient_privilege then null; end;
 begin perform public.submit_score_v2('anon','👤','tr'); raise exception 'FAIL: anonymous score RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.users where id=(select b from audit_player_ids);
do $$ begin
 if exists(select 1 from public.user_progress where user_id=(select b from pg_temp.audit_player_ids)) or exists(select 1 from public.leaderboard where owner_id=(select b from pg_temp.audit_player_ids)) or exists(select 1 from public.progress_sync_receipts where user_id=(select b from pg_temp.audit_player_ids)) then raise exception 'FAIL: account cascade incomplete'; end if;
end $$;
