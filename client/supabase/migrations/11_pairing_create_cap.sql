-- 11_pairing_create_cap.sql
--
-- Edge rate limiting (5/min) only stops bursts on one edge instance — a
-- patient script can still generate 5 codes/min indefinitely across the
-- 10-minute TTL window, growing pairing_codes without bound and adding
-- noise. This adds a real DB-level cap: a player can create at most
-- MAX_CODES_PER_DAY codes in a rolling 24h window, enforced inside the
-- same transaction as code creation (no separate check-then-act race).

create or replace function public.create_pairing_code(
    p_player_id uuid,
    p_device_id uuid
) returns table(code varchar, expires_at timestamptz)
language plpgsql security definer as $$
declare
    v_code varchar(6);
    v_tries int := 0;
    v_recent_count int;
    v_max_codes_per_day constant int := 20;
begin
    perform public.purge_expired_pairing_codes();

    select count(*) into v_recent_count
    from public.pairing_codes
    where player_id = p_player_id
      and created_at > now() - interval '24 hours';

    if v_recent_count >= v_max_codes_per_day then
        raise exception 'too many pairing codes created in the last 24 hours, please try again later'
            using errcode = 'P0001';
    end if;

    loop
        v_code := lpad(floor(random() * 1000000)::text, 6, '0');
        v_tries := v_tries + 1;
        exit when not exists (
            select 1 from public.pairing_codes
            where pairing_codes.code = v_code and consumed_at is null and pairing_codes.expires_at > now()
        );
        if v_tries > 20 then
            raise exception 'could not allocate a unique pairing code, try again';
        end if;
    end loop;

    insert into public.pairing_codes (code, player_id, created_by_device_id, expires_at)
    values (v_code, p_player_id, p_device_id, now() + interval '10 minutes');

    return query select v_code, now() + interval '10 minutes';
end;
$$;