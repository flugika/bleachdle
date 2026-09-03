-- 10_replay_protection.sql
--
-- PROBLEM: apply_game_result() had no concept of "which round" a result
-- belonged to. hasFinalized is a client-side Zustand flag — trivially
-- bypassed by calling POST /api/sync/result directly with devtools, any
-- number of times, each call incrementing current_streak further. There
-- was nothing in the database stopping it.
--
-- FIX: every call to apply_game_result must supply a round_key that
-- uniquely identifies the round being finalized:
--   - daily:     the scheduled date, 'YYYY-MM-DD' (one round per day, same
--                for everyone — matches targetDate already computed client-
--                side in every finalizeGame())
--   - unlimited: the target's id (one round per randomly-picked target;
--                a new target = a new round, replaying the same target id
--                is impossible under normal play since a new target is only
--                assigned after the previous one resolves)
--
-- We record (player_id, game_mode, game_type, round_key) in a table with a
-- UNIQUE constraint and INSERT ... ON CONFLICT DO NOTHING before touching
-- player_stats. If the insert affects 0 rows, this round was already
-- applied — we return the current (unchanged) stats instead of erroring,
-- which makes retries/duplicate network calls safe/idempotent rather than
-- something the client has to avoid triggering.

create table public.player_result_events (
    player_id uuid not null references public.players(id) on delete cascade,
    game_mode text not null,
    game_type text not null check (game_type in ('daily', 'unlimited')),
    round_key text not null,
    is_win boolean not null,
    guess_count int not null,
    created_at timestamptz not null default now(),
    primary key (player_id, game_mode, game_type, round_key)
);

-- Cheap cleanup — daily rows are only ever relevant for ~2 days (today +
-- timezone slop), unlimited rows are relevant until the target changes,
-- which has already happened by the time anyone would care. Keep 30 days
-- for dispute/debug purposes, prune older than that.
create index idx_player_result_events_created_at on public.player_result_events (created_at);

create or replace function public.purge_old_result_events() returns void
language sql as $$
    delete from public.player_result_events where created_at < now() - interval '30 days';
$$;

alter table public.player_result_events enable row level security;
-- deny-all, same as every other player_* table — service role only.

-- ============================================================================
-- Replaces apply_game_result() from 001_pairing_schema.sql. Adds p_round_key
-- and makes the whole thing replay-safe via the unique event row above.
-- ============================================================================
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
begin
    if p_round_key is null or length(trim(p_round_key)) = 0 then
        raise exception 'round_key is required';
    end if;

    -- Row-lock the stats row up front so a concurrent duplicate call (two
    -- tabs, a retried fetch, a replay attempt racing the first legitimate
    -- call) serializes behind this one instead of both reading stale state.
    insert into public.player_stats (player_id, game_mode, game_type)
    values (p_player_id, p_game_mode, p_game_type)
    on conflict (player_id, game_mode, game_type) do nothing;

    perform 1 from public.player_stats
        where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type
        for update;

    -- The actual replay guard: this INSERT can only succeed once per
    -- (player, mode, type, round_key) ever, by the primary key constraint.
    insert into public.player_result_events (player_id, game_mode, game_type, round_key, is_win, guess_count)
    values (p_player_id, p_game_mode, p_game_type, p_round_key, p_is_win, p_guess_count)
    on conflict (player_id, game_mode, game_type, round_key) do nothing;

    get diagnostics v_inserted = row_count;

    if not v_inserted then
        -- Already recorded — this is a replay/duplicate, not an error.
        -- Return current stats unchanged so the client's UI still gets a
        -- normal-looking response (idempotent), it just doesn't move the
        -- streak a second time.
        select * into v_result from public.player_stats
            where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type;
        return jsonb_build_object('stats', to_jsonb(v_result), 'replay', true);
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