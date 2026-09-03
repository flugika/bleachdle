-- 13_pairing_hardening.sql
--
-- Addresses the real gap: 004's cap was per-PLAYER (20 codes/24h), but
-- nothing stopped an attacker from creating unlimited fresh players (each
-- one silently provisioned on every page load via /api/device/init) and
-- resetting the cap every time. A macro doing that would grow `players`,
-- `player_devices`, AND `pairing_codes` without bound — the per-player cap
-- alone never touches this.
--
-- Fix: rate-limit PROVISIONING ITSELF at the IP level, in Postgres (not
-- edge memory, which resets per-instance/region and is trivially evaded by
-- distributing requests). This is the actual root-cause fix; the
-- per-player pairing-code cap from 004 is now a secondary layer on top of
-- it, not the only layer.

-- ============================================================================
-- 1. IP-based provisioning rate limit
-- ============================================================================
-- Hourly bucket per hashed IP (never store raw IPs — hash with a
-- server-only pepper so this table alone can't be used to deanonymize
-- visitors, and so it's safe even if this table were ever exposed).
create table public.device_provision_log (
    ip_hash text not null,
    hour_bucket timestamptz not null, -- truncated to the hour
    count int not null default 0,
    primary key (ip_hash, hour_bucket)
);

create index idx_device_provision_log_bucket on public.device_provision_log (hour_bucket);

alter table public.device_provision_log enable row level security;
-- deny-all, service role only, same as every other internal table here.

create or replace function public.purge_old_provision_log() returns void
language sql as $$
    delete from public.device_provision_log where hour_bucket < now() - interval '48 hours';
$$;

-- Returns true if this request is allowed to provision a new player+device,
-- false if the IP has already hit the hourly cap. Increments atomically
-- either way is not what we want — only increments when allowed to record
-- provisioning attempts is the more useful signal for tuning MAX_PER_HOUR,
-- but that would let an attacker "free-probe" the limit without consuming
-- it. Instead: always increment first, then check — a rejected attempt
-- still counts against the bucket, which is what actually stops sustained
-- abuse (an attacker retrying past the limit doesn't get free future
-- headroom).
create or replace function public.check_and_log_provision_attempt(
    p_ip_hash text
) returns boolean
language plpgsql security definer as $$
declare
    v_bucket timestamptz := date_trunc('hour', now());
    v_max_per_hour constant int := 20;
    v_count int;
begin
    insert into public.device_provision_log (ip_hash, hour_bucket, count)
    values (p_ip_hash, v_bucket, 1)
    on conflict (ip_hash, hour_bucket) do update set count = device_provision_log.count + 1
    returning count into v_count;

    return v_count <= v_max_per_hour;
end;
$$;

-- ============================================================================
-- 2. player_devices — add a human-readable label so Manage never requires
--    guessing which device is which from a bare UUID.
-- ============================================================================
alter table public.player_devices add column device_label text;

-- ============================================================================
-- 3. Tighter, dual-scoped pairing-code cap: per player AND per device.
--    Per-device matters because a single device could otherwise create many
--    throwaway players (each getting its own fresh 20/day player-scoped
--    allowance) and still spam codes from itself. Lowered from 20→8 per
--    scope per day — legitimate use is "link 1-2 devices," 8 covers retries
--    with real headroom, without leaving much room for abuse.
-- ============================================================================
create or replace function public.create_pairing_code(
    p_player_id uuid,
    p_device_id uuid
) returns table(code varchar, expires_at timestamptz)
language plpgsql security definer as $$
declare
    v_code varchar(6);
    v_tries int := 0;
    v_player_count int;
    v_device_count int;
    v_max_per_scope_per_day constant int := 8;
begin
    perform public.purge_expired_pairing_codes();

    select count(*) into v_player_count
    from public.pairing_codes
    where player_id = p_player_id and created_at > now() - interval '24 hours';

    select count(*) into v_device_count
    from public.pairing_codes
    where created_by_device_id = p_device_id and created_at > now() - interval '24 hours';

    if v_player_count >= v_max_per_scope_per_day or v_device_count >= v_max_per_scope_per_day then
        raise exception 'too many pairing codes created in the last 24 hours, please try again later';
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

-- ============================================================================
-- 4. Immediate cleanup on consume — don't wait for the hourly cron sweep.
--    confirm_pairing() now DELETEs the row outright instead of marking
--    consumed_at and leaving it for purge_expired_pairing_codes to catch
--    later. This is the common case (most codes get used, not abandoned)
--    so this alone meaningfully shrinks steady-state table size.
-- ============================================================================
-- 1. เปิดใช้งาน RLS บนตาราง pairing_codes
ALTER TABLE public.pairing_codes ENABLE ROW LEVEL SECURITY;

-- 2. ลบ Policy "Enable read access for all users" ออก (หากเคยสร้างไว้)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.pairing_codes;

-- 3. ยืนยัน RPC Function confirm_pairing ( Security Definer + Delete Code เมื่อผูกสำเร็จ )
CREATE OR REPLACE FUNCTION public.confirm_pairing(
    p_code VARCHAR,
    p_device_b_id UUID,
    p_device_b_secret_hash TEXT,
    p_device_b_label TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row pairing_codes%ROWTYPE;
BEGIN
    SELECT * INTO v_row FROM public.pairing_codes WHERE code = p_code FOR UPDATE;

    IF NOT FOUND OR v_row.expires_at < NOW() THEN
        RAISE EXCEPTION 'pairing code invalid or expired';
    END IF;

    IF v_row.attempt_count >= v_row.max_attempts THEN
        RAISE EXCEPTION 'pairing code locked after too many attempts';
    END IF;

    -- ผูก Device B เข้ากับ Player A
    INSERT INTO public.player_devices (device_id, player_id, device_secret_hash, device_label)
    VALUES (p_device_b_id, v_row.player_id, p_device_b_secret_hash, p_device_b_label)
    ON CONFLICT (device_id) DO UPDATE SET
        player_id = EXCLUDED.player_id,
        device_secret_hash = EXCLUDED.device_secret_hash,
        device_label = COALESCE(EXCLUDED.device_label, player_devices.device_label),
        last_seen_at = NOW();

    -- ลบ code ค้างทั้งหมดของ player นี้ทันทีที่ผูกสำเร็จ
    DELETE FROM public.pairing_codes WHERE player_id = v_row.player_id;

    RETURN v_row.player_id;
END;
$$;

-- ============================================================================
-- 5. Shrink the purge grace window from 1 hour to 10 minutes past expiry —
--    the 1h buffer had no functional purpose (check_pairing_code already
--    rejects anything past expires_at regardless of whether the row still
--    physically exists), it was just needlessly keeping dead rows around
--    longer than necessary.
-- ============================================================================
create or replace function public.purge_expired_pairing_codes() returns void
language sql as $$
    delete from public.pairing_codes where expires_at < now() - interval '10 minutes';
$$;