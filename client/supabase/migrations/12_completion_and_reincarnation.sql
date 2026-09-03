-- 12_completion_and_reincarnation.sql
--
-- Fixes two real gaps caught in review:
--
-- 1. player_completed was defined in 001 but never written to — apply_game_result()
--    only ever touched player_stats. This migration makes apply_game_result()
--    write to player_completed in the SAME transaction, using round_key as
--    completed_key (they're the same value: daily='YYYY-MM-DD', unlimited=target id
--    — exactly what local completedData already tracks for pool-exclusion).
--
--    Mirrors the existing local semantics exactly, including the "loss wipes the
--    whole completed list" behavior already present in createDailyGuessGameStore /
--    createUnlimitedGuessGameStore (`completedData.unlimited = isWin ? [...] : []`).
--    On a loss, ALL player_completed rows for that (player, mode, type) are cleared,
--    not just the current round's — same as local.
--
-- 2. Soul registry (name + reincarnation count) never existed server-side at all.
--    It's a genuinely separate concept from player_completed: "I've exhausted every
--    target in this mode's pool, register a name, then reincarnate" — resets
--    current_streak to 0 (keeping max_streak), clears player_completed for that
--    mode/type so the pool refills, and increments reincarnation_count. Added as
--    its own table + RPC rather than overloading player_stats, since soul_name and
--    reincarnation_count are per (player, game_mode) — not per (player, game_mode,
--    game_type), since only 'unlimited' has a concept of "exhausting the pool".
--
-- 3. Retention: player_result_events already had purge_old_result_events() (30
--    days) from 003, but nothing ever called it on a schedule. See the updated
--    cron route — it now calls both purge functions in one run.

-- ============================================================================
-- Soul registry
-- ============================================================================
create table public.player_soul_registry (
    player_id uuid not null references public.players(id) on delete cascade,
    game_mode text not null,
    soul_name text,
    reincarnation_count int not null default 0,
    updated_at timestamptz not null default now(),
    primary key (player_id, game_mode)
);

alter table public.player_soul_registry enable row level security;
-- deny-all, same as every other player_* table.

-- ============================================================================
-- apply_game_result — now also writes player_completed, atomically
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
        -- replay — stats unchanged, and deliberately don't touch
        -- player_completed either (a replay shouldn't re-trigger the
        -- win/loss completion-list effect a second time)
        select * into v_result from public.player_stats
            where player_id = p_player_id and game_mode = p_game_mode and game_type = p_game_type;
        return jsonb_build_object('stats', to_jsonb(v_result), 'replay', true);
    end if;

    -- 🆕 player_completed: mirrors local completedData exactly.
    --   win  → add this round_key to the completed set (idempotent insert)
    --   loss → wipe the ENTIRE completed set for this (player, mode, type),
    --          matching `completedData.unlimited = isWin ? [...] : []` locally
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

-- ============================================================================
-- reincarnate — the server-side counterpart of hardReset()/resetStreakKeepMax().
-- Only meaningful for 'unlimited' (only that game_type has an exhaustible pool).
-- ============================================================================
create or replace function public.reincarnate(
    p_player_id uuid,
    p_game_mode text
) returns jsonb
language plpgsql security definer as $$
declare
    v_result record;
begin
    -- 1. รีเซ็ต current_streak เป็น 0 แต่เก็บ max_streak ไว้เหมือนเดิมใน player_stats
    update public.player_stats set
        current_streak = 0,
        updated_at = now()
    where player_id = p_player_id and game_mode = p_game_mode;

    -- 2. ล้างข้อมูล player_completed เฉพาะโหมดนี้ เพื่อให้ pool ถูกเติมเต็มใหม่
    delete from public.player_completed
    where player_id = p_player_id and game_mode = p_game_mode;

    -- 3. บันทึกหรืออัปเดตตาราง player_soul_registry โดยเพิ่ม reincarnation_count ทีละ 1 ทุกครั้งที่เกิดใหม่
    insert into public.player_soul_registry (player_id, game_mode, reincarnation_count, updated_at)
    values (p_player_id, p_game_mode, 1, now())
    on conflict (player_id, game_mode) do update set
        reincarnation_count = public.player_soul_registry.reincarnation_count + 1,
        updated_at = now();

    -- 4. ดึงข้อมูลล่าสุดเพื่อส่งกลับไปให้ client
    select reincarnation_count into v_result
    from public.player_soul_registry
    where player_id = p_player_id and game_mode = p_game_mode;

    return jsonb_build_object('success', true, 'reincarnationCount', v_result.reincarnation_count);
end;
$$;

-- ============================================================================
-- register_soul_name — separate from reincarnate() because naming happens
-- once (first time the pool is exhausted) while reincarnate() can happen
-- many times after that with the name already set.
-- ============================================================================
create or replace function public.register_soul_name(
    p_player_id uuid,
    p_game_mode text,
    p_soul_name text
) returns jsonb
language plpgsql security definer as $$
declare
    v_registry record;
begin
    if p_soul_name is null or length(trim(p_soul_name)) = 0 then
        raise exception 'soul_name must not be empty';
    end if;
    if length(p_soul_name) > 40 then
        raise exception 'soul_name too long';
    end if;

    insert into public.player_soul_registry (player_id, game_mode, soul_name)
    values (p_player_id, p_game_mode, p_soul_name)
    on conflict (player_id, game_mode) do update set
        soul_name = excluded.soul_name,
        updated_at = now()
    returning * into v_registry;

    return to_jsonb(v_registry);
end;
$$;