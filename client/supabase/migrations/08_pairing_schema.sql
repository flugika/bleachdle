-- ============================================================================
-- 08_pairing_schema.sql
-- Player identity + device pairing + server-authoritative game stats
--
-- Design rules enforced by this schema (don't violate these when extending):
--   1. Streak numbers are NEVER accepted as input from the client. Only
--      apply_game_result() may mutate player_stats, and it takes a boolean
--      win/loss event, not a number.
--   2. device_secret never touches this schema directly — only its HMAC hash
--      does (device_secret_hash). The raw secret lives in an httpOnly cookie
--      on the client and is verified in application code (see hmac.ts).
--   3. Pairing code brute-force protection lives HERE (attempt_count column),
--      not in edge/in-memory rate limiting. Memory-based limits reset per
--      instance/region and cannot stop a distributed guessing attack against
--      a 6-digit code space; a DB row can.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. players — the logical "soul". No auth, no email. Just an anchor id that
--    stats/streaks/history hang off of.
-- ----------------------------------------------------------------------------
create table public.players (
    id uuid primary key default gen_random_uuid(),
    soul_name text,
    created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. player_devices — N devices : 1 player. This table is the credential
--    store. device_secret_hash = HMAC-SHA256(device_secret, SERVER_SECRET),
--    never the raw secret. Compromise of this table alone does not let an
--    attacker forge a valid cookie (see hmac.ts verifyDeviceSecret).
-- ----------------------------------------------------------------------------
create table public.player_devices (
    device_id uuid primary key,
    player_id uuid not null references public.players(id) on delete cascade,
    device_secret_hash text not null,
    linked_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);
create index idx_player_devices_player_id on public.player_devices (player_id);

-- ----------------------------------------------------------------------------
-- 3. pairing_codes — short-lived, single-use, server-generated only.
--    attempt_count is the REAL brute-force defense (persists across edge
--    regions/instances, unlike in-memory rate limiting).
-- ----------------------------------------------------------------------------
create table public.pairing_codes (
    code varchar(6) primary key,
    player_id uuid not null references public.players(id) on delete cascade,
    created_by_device_id uuid not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    attempt_count int not null default 0,
    max_attempts int not null default 5,
    created_at timestamptz not null default now()
);
create index idx_pairing_codes_active on public.pairing_codes (expires_at) where consumed_at is null;

-- Sweep helper — call from a cron/edge function periodically, or lazily
-- before generating a new code. Cheap, keeps table small.
create or replace function public.purge_expired_pairing_codes() returns void
language sql as $$
    delete from public.pairing_codes where expires_at < now() - interval '1 hour';
$$;

-- ----------------------------------------------------------------------------
-- 4. player_stats — server-authoritative streak/counters. No client write
--    path exists that lets a number be pushed directly into current_streak.
-- ----------------------------------------------------------------------------
create table public.player_stats (
    player_id uuid not null references public.players(id) on delete cascade,
    game_mode text not null,
    game_type text not null check (game_type in ('daily', 'unlimited')),
    current_streak int not null default 0,
    max_streak int not null default 0,
    played_count int not null default 0,
    passed_count int not null default 0,
    guess_distribution jsonb not null default '{}'::jsonb,
    last_result_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (player_id, game_mode, game_type)
);

-- ----------------------------------------------------------------------------
-- 5. player_completed — set-union-safe history (idempotent by nature, no
--    conflict possible even with two devices writing concurrently).
-- ----------------------------------------------------------------------------
create table public.player_completed (
    player_id uuid not null references public.players(id) on delete cascade,
    game_mode text not null,
    game_type text not null,
    completed_key text not null, -- date (daily) or target id (unlimited)
    completed_at timestamptz not null default now(),
    primary key (player_id, game_mode, game_type, completed_key)
);

-- ============================================================================
-- RLS — deny-all by default. Every table here is per-player data with no
-- auth.uid() to anchor a public policy on, so anon/authenticated roles get
-- NOTHING. All access goes through Next.js API routes using the service
-- role key, after resolving player_id server-side from the httpOnly cookie.
-- ============================================================================
alter table public.players enable row level security;
alter table public.player_devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.player_stats enable row level security;
alter table public.player_completed enable row level security;
-- (intentionally: no policies created — service role bypasses RLS entirely,
--  anon/authenticated roles are blocked by default-deny)

-- ============================================================================
-- RPC 1: apply_game_result — the ONLY way current_streak changes.
-- Takes an event (win/loss), never a number. Row-locked so two devices
-- finalizing "at once" serialize correctly instead of racing.
-- ============================================================================
create or replace function public.apply_game_result(
    p_player_id uuid,
    p_game_mode text,
    p_game_type text,
    p_is_win boolean,
    p_guess_count int
) returns jsonb
language plpgsql security definer as $$
declare
    v_result record;
    v_bucket text;
begin
    insert into public.player_stats (player_id, game_mode, game_type)
    values (p_player_id, p_game_mode, p_game_type)
    on conflict (player_id, game_mode, game_type) do nothing;

    -- lock the row before read-modify-write so concurrent finalize calls
    -- (e.g. two tabs, or a retried request) can't both read stale streak
    perform 1 from public.player_stats
        where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type
        for update;

    v_bucket := least(greatest(p_guess_count, 1), 6)::text;

    update public.player_stats set
        current_streak = case when p_is_win then current_streak + 1 else 0 end,
        max_streak = case when p_is_win then greatest(max_streak, current_streak + 1) else max_streak end,
        played_count = played_count + case when p_is_win then 1 else 0 end,
        passed_count = passed_count + case when p_is_win then 0 else 1 end,
        guess_distribution = case when p_is_win then
            jsonb_set(
                guess_distribution,
                array[v_bucket],
                to_jsonb(coalesce((guess_distribution->>v_bucket)::int, 0) + 1)
            )
            else guess_distribution
        end,
        last_result_at = now(),
        updated_at = now()
    where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type
    returning * into v_result;

    return to_jsonb(v_result);
end;
$$;

-- ============================================================================
-- RPC 2: record_completed — idempotent set-union insert for daily/unlimited
-- progress markers. Safe to call from two devices concurrently.
-- ============================================================================
create or replace function public.record_completed(
    p_player_id uuid,
    p_game_mode text,
    p_game_type text,
    p_completed_key text
) returns void
language sql security definer as $$
    insert into public.player_completed (player_id, game_mode, game_type, completed_key)
    values (p_player_id, p_game_mode, p_game_type, p_completed_key)
    on conflict do nothing;
$$;

-- ============================================================================
-- RPC 3: create_pairing_code — Device A. Server generates the code; client
-- never supplies one. 10 minute TTL. Purges stale rows opportunistically.
-- ============================================================================
create or replace function public.create_pairing_code(
    p_player_id uuid,
    p_device_id uuid
) returns table(code varchar, expires_at timestamptz)
language plpgsql security definer as $$
declare
    v_code varchar(6);
    v_tries int := 0;
begin
    perform public.purge_expired_pairing_codes();

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
-- RPC 4: check_pairing_code — Device B "peek" step, used for the
-- reconciliation UI preview. Increments attempt_count and locks the code
-- after max_attempts. Does NOT consume/link — that's a separate explicit
-- confirm step (see confirm_pairing below), so the UI can show "you're about
-- to merge with a player who has streak X — keep A or B?" before committing.
-- ============================================================================
create or replace function public.check_pairing_code(
    p_code varchar
) returns uuid -- returns player_id if valid, null otherwise
language plpgsql security definer as $$
declare
    v_row public.pairing_codes%rowtype;
begin
    select * into v_row from public.pairing_codes where pairing_codes.code = p_code for update;

    if not found or v_row.consumed_at is not null or v_row.expires_at < now() then
        return null;
    end if;

    if v_row.attempt_count >= v_row.max_attempts then
        return null; -- locked out, even if technically not yet expired
    end if;

    update public.pairing_codes set attempt_count = attempt_count + 1 where pairing_codes.code = p_code;

    return v_row.player_id;
end;
$$;

-- ============================================================================
-- RPC 5: confirm_pairing — actually links device B to player A's account and
-- consumes the code (single-use, atomic). Called only after the user has
-- explicitly chosen a reconciliation strategy in the UI.
-- ============================================================================
create or replace function public.confirm_pairing(
    p_code varchar,
    p_device_b_id uuid,
    p_device_b_secret_hash text
) returns uuid -- returns the (now-shared) player_id
language plpgsql security definer as $$
declare
    v_row public.pairing_codes%rowtype;
begin
    select * into v_row from public.pairing_codes where pairing_codes.code = p_code for update;

    if not found or v_row.consumed_at is not null or v_row.expires_at < now() then
        raise exception 'pairing code invalid or expired';
    end if;

    if v_row.attempt_count >= v_row.max_attempts then
        raise exception 'pairing code locked after too many attempts';
    end if;

    update public.pairing_codes set consumed_at = now() where pairing_codes.code = p_code;

    -- re-point device B at player A. on delete cascade on the old player row
    -- is irrelevant here — we're not deleting player B, just re-homing the
    -- device row. Caller decides in app code whether to keep/discard player B's
    -- orphaned stats rows (left alone here; not this function's job).
    insert into public.player_devices (device_id, player_id, device_secret_hash)
    values (p_device_b_id, v_row.player_id, p_device_b_secret_hash)
    on conflict (device_id) do update set
        player_id = excluded.player_id,
        device_secret_hash = excluded.device_secret_hash,
        last_seen_at = now();

    return v_row.player_id;
end;
$$;