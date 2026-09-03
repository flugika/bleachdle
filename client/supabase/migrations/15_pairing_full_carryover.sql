-- 15_pairing_full_carryover.sql
--
-- Fixes a real data-loss bug in the pairing confirm flow: keepChoices only
-- ever covered (game_mode, game_type) pairs that existed on BOTH device A
-- and device B (an actual conflict). Any mode device B had played solo —
-- which the UI explicitly told the player would "carry over as-is" — was
-- never actually copied to player A. Those rows just sat orphaned under
-- player B's id forever. Same gap existed for player_completed (never
-- merged at all, any choice) and player_soul_registry.reincarnation_count
-- (never merged either).
--
-- This migration adds one RPC, carry_over_pairing_data(), that the confirm
-- route calls right before confirm_pairing(). It handles all three tables
-- in one atomic pass:
--   player_stats:      solo-B rows → copied to A unconditionally.
--                       conflicting rows → copied to A ONLY when the
--                       caller passed keep='B' for that (mode,type); a
--                       'A' choice is a deliberate no-op (unchanged, we
--                       don't touch A's row at all — the reconciliation
--                       modal already showed the player both numbers and
--                       they explicitly chose A's).
--   player_completed:   always a set union, regardless of the stats keep
--                       choice — "which targets have I already seen" isn't
--                       something a player would ever want to LOSE by
--                       picking the other side's streak number. Losing
--                       union here would just cause already-seen content
--                       to be re-served, which has no upside for anyone.
--   player_soul_registry (reincarnation_count only, soul_name already
--                       lives on players.soul_name as of 14 and needs no
--                       merge logic): merged as max(A, B) per mode — never
--                       loses progress either side made.
create or replace function public.carry_over_pairing_data(
    p_player_a_id uuid,
    p_player_b_id uuid,
    p_keep_b_modes jsonb -- array of {gameMode, gameType} where the caller chose to keep B's stats
) returns void
language plpgsql security definer as $$
declare
    v_keep_b_set jsonb := coalesce(p_keep_b_modes, '[]'::jsonb);
    v_b_stat record;
    v_b_completed record;
    v_b_registry record;
    v_a_has_row boolean;
    v_should_take_b boolean;
begin
    -- ── player_stats ────────────────────────────────────────────────────
    for v_b_stat in
        select * from public.player_stats where player_id = p_player_b_id
    loop
        select exists(
            select 1 from public.player_stats
            where player_id = p_player_a_id
              and game_mode = v_b_stat.game_mode
              and game_type = v_b_stat.game_type
        ) into v_a_has_row;

        if not v_a_has_row then
            -- solo-B row — unconditional carry-over, this is the bug fix
            insert into public.player_stats (
                player_id, game_mode, game_type, current_streak, max_streak,
                played_count, passed_count, guess_distribution, last_result_at, updated_at
            ) values (
                p_player_a_id, v_b_stat.game_mode, v_b_stat.game_type, v_b_stat.current_streak,
                v_b_stat.max_streak, v_b_stat.played_count, v_b_stat.passed_count,
                v_b_stat.guess_distribution, v_b_stat.last_result_at, now()
            )
            on conflict (player_id, game_mode, game_type) do nothing; -- race safety, shouldn't happen given the check above
        else
            -- conflict — only overwrite A if caller explicitly chose 'B' for this mode/type
            select exists(
                select 1 from jsonb_array_elements(v_keep_b_set) elem
                where elem->>'gameMode' = v_b_stat.game_mode
                  and elem->>'gameType' = v_b_stat.game_type
            ) into v_should_take_b;

            if v_should_take_b then
                update public.player_stats set
                    current_streak = v_b_stat.current_streak,
                    max_streak = v_b_stat.max_streak,
                    played_count = v_b_stat.played_count,
                    passed_count = v_b_stat.passed_count,
                    guess_distribution = v_b_stat.guess_distribution,
                    last_result_at = v_b_stat.last_result_at,
                    updated_at = now()
                where player_id = p_player_a_id
                  and game_mode = v_b_stat.game_mode
                  and game_type = v_b_stat.game_type;
            end if;
            -- keep='A' (or unspecified) → deliberate no-op, A's row is untouched
        end if;
    end loop;

    -- ── player_completed — always a set union, no choice needed ─────────
    for v_b_completed in
        select * from public.player_completed where player_id = p_player_b_id
    loop
        insert into public.player_completed (player_id, game_mode, game_type, completed_key, completed_at)
        values (p_player_a_id, v_b_completed.game_mode, v_b_completed.game_type, v_b_completed.completed_key, v_b_completed.completed_at)
        on conflict do nothing;
    end loop;

    -- ── player_soul_registry.reincarnation_count — max-merge per mode ───
    for v_b_registry in
        select * from public.player_soul_registry where player_id = p_player_b_id
    loop
        insert into public.player_soul_registry (player_id, game_mode, reincarnation_count)
        values (p_player_a_id, v_b_registry.game_mode, v_b_registry.reincarnation_count)
        on conflict (player_id, game_mode) do update set
            reincarnation_count = greatest(player_soul_registry.reincarnation_count, excluded.reincarnation_count),
            updated_at = now();
    end loop;
end;
$$;