begin;
insert into public.web_bookings(id,request_hash,nombre,email,starts_at,ends_at,google_event_id,calendar_id)
values ('eeeeeeee-1111-4111-8111-111111111111','test','TEST ROLLBACK','test@example.invalid','2099-01-01 14:00Z','2099-01-01 15:00Z','dbtestrollback1','primary');
do $$ begin
  begin
    insert into public.web_bookings(id,request_hash,nombre,email,starts_at,ends_at,google_event_id,calendar_id)
    values ('eeeeeeee-2222-4222-8222-222222222222','test','TEST ROLLBACK','test@example.invalid','2099-01-01 14:30Z','2099-01-01 15:30Z','dbtestrollback2','primary');
    raise exception 'FAIL: overlapping reservation accepted';
  exception when exclusion_violation then null;
  end;
  if has_table_privilege('anon','public.web_bookings','SELECT') or has_table_privilege('authenticated','public.web_bookings','INSERT') then raise exception 'FAIL: public table access'; end if;
  if has_function_privilege('anon','public.booking_rate_limit(text,integer,integer)','EXECUTE') then raise exception 'FAIL: public rate limit RPC'; end if;
  if not public.booking_rate_limit('test-rollback',1,60) then raise exception 'FAIL: first request'; end if;
  if public.booking_rate_limit('test-rollback',1,60) then raise exception 'FAIL: limit bypass'; end if;
end $$;
select 'PASS: overlap constraint, private access, rate limiting' as result;
rollback;
