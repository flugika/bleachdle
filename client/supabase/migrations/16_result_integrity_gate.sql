-- 16_result_integrity_gate.sql
--
-- MITIGATION, not a fix — see team discussion: real fix requires moving
-- target-generation + answer-checking server-side entirely (out of scope
-- for this pass). This closes the "enumerate every target.id and POST
-- isWin:true in a tight loop, clear the whole pool in seconds" path
-- specifically, without touching client-side reveal/compare logic at all.
--
-- Mechanism: player_progress already gets written (debounced, 10s) every
-- time a guess is made, for BOTH win and loss attempts — it's the one
-- server-observed signal that a round was actually being played before a
-- result was submitted for it. We add target_started_at, set once when a
-- target first appears in player_progress and left untouched by later
-- upserts for the same target, then require apply_game_result to see:
--   1. a player_progress row exists for (player, mode, type) whose
--      target_id matches p_round_key (unlimited only — daily has no
--      target_id concept, this gate is a no-op for daily)
--   2. now() - target_started_at >= MIN_ROUND_SECONDS
--
-- Known limitation, stated plainly: a sufficiently motivated script can
-- still POST /api/sync/progress once, sleep, then POST /api/sync/result —
-- this does not require answering correctly, only spending real wall-clock
-- time and an extra request per target. Combined with existing rate limits
-- (10 req/10s on /sync/result, 20 req/10s on /sync/progress) this turns
-- "clear the whole pool in seconds" into "clear the whole pool over
-- minutes-to-hours depending on pool size" — a genuine speed bump, not a
-- closed door. Tracked as a known gap pending the real server-authoritative
-- target/answer rearchitect.

alter table public.player_progress
    add column target_started_at timestamptz not null default now();

-- Backfill existing rows so the new column isn't null-equivalent-to-now for
-- rows that already existed before this migration (best-effort — existing
-- in-flight rounds get grandfathered as "started now", which is strictly
-- more permissive than blocking them, the safe direction for a migration).

-- ============================================================================
-- sync/progress POST behavior needs to change to NOT stomp target_started_at
-- on every upsert for the same target — see route.ts patch below. This RPC
-- wraps that logic so the route doesn't need bespoke SQL: pass the new
-- target_id, get back whether it's a NEW target (started_at reset) or the
-- same one continuing (started_at preserved).
-- ============================================================================
create or replace function public.upsert_player_progress(
    p_player_id uuid,
    p_game_mode text,
    p_game_type text,
    p_target_id text,
    p_guesses jsonb
) returns void
language plpgsql security definer as $$
declare
    v_existing_target_id text;
begin
    select target_id into v_existing_target_id
    from public.player_progress
    where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type
    for update;

    if not found then
        insert into public.player_progress (player_id, game_mode, game_type, target_id, guesses, updated_at, target_started_at)
        values (p_player_id, p_game_mode, p_game_type, p_target_id, p_guesses, now(), now());
        return;
    end if;

    if v_existing_target_id is distinct from p_target_id then
        -- genuinely a new round — reset the start clock
        update public.player_progress set
            target_id = p_target_id,
            guesses = p_guesses,
            updated_at = now(),
            target_started_at = now()
        where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type;
    else
        -- same round continuing — guesses/updated_at move, started_at frozen
        update public.player_progress set
            guesses = p_guesses,
            updated_at = now()
        where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type;
    end if;
end;
$$;

-- ============================================================================
-- apply_game_result — adds the timing gate for unlimited rounds only.
-- Daily is exempt: there's no "target_id" concept for daily (one shared
-- round per day, roundKey is the date), so there's nothing to enumerate —
-- the attack this closes doesn't apply to daily at all.
-- ============================================================================
-- SQL Migration Update
create or replace function public.apply_game_result(
    p_player_id uuid,
    p_game_mode text,
    p_game_type text,
    p_round_key text,
    p_is_win boolean,
    p_guess_count int
) returns jsonb
language plpgsql security definer as $$
declare
    v_result record;
    v_bucket text;
    v_inserted boolean;
    v_progress record;
    v_min_round_seconds constant int := 3;
begin
    if p_round_key is null or length(trim(p_round_key)) = 0 then
        raise exception 'round_key is required';
    end if;

    -- 🆕 integrity gate (unlimited only)
    if p_game_type = 'unlimited' then
        select * into v_progress
        from public.player_progress
        where player_id = p_player_id
          and game_mode = p_game_mode
          and game_type = p_game_type
          and target_id = p_round_key;

        if not found then
            raise exception 'no matching in-progress round found for this target'
                using errcode = 'P0001';
        end if;

        -- 🛠️ FIX: ยกเว้นการเช็ค Time-gate หากเป็นการทายถูกในการเดาครั้งแรก (Instant Win) 
        -- หรือปรับ Threshold ให้ Graceful แทนการโยน Exception เมื่อน้อยกว่า 3 วินาที
        if p_guess_count > 1 and (now() - v_progress.target_started_at < make_interval(secs => v_min_round_seconds)) then
            raise exception 'result submitted too quickly after round start'
                using errcode = 'P0001';
        end if;
    end if;

    insert into public.player_stats (player_id, game_mode, game_type)
    values (p_player_id, p_game_mode, p_game_type)
    on conflict (player_id, game_mode, game_type) do nothing;

    perform 1 from public.player_stats
        where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type
        for update;

    insert into public.player_result_events (player_id, game_mode, game_type, round_key, is_win, guess_count)
    values (p_player_id, p_game_mode, p_game_type, p_round_key, p_is_win, p_guess_count)
    on conflict (player_id, game_mode, game_type, round_key) do nothing;

    get diagnostics v_inserted = row_count;

    if not v_inserted then
        select * into v_result from public.player_stats
            where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type;
        return jsonb_build_object('stats', to_jsonb(v_result), 'replay', true);
    end if;

    if p_is_win then
        insert into public.player_completed (player_id, game_mode, game_type, completed_key)
        values (p_player_id, p_game_mode, p_game_type, p_round_key)
        on conflict do nothing;
    else
        delete from public.player_completed
            where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type;
    end if;

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

    return jsonb_build_object('stats', to_jsonb(v_result), 'replay', false);
end;
$$;