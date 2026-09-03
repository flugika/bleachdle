-- 14_soul_name_unification.sql
--
-- Previously soul_name lived in player_soul_registry, scoped per
-- (player_id, game_mode) — every mode had its own independent name. Moving
-- it to players.soul_name: ONE name per player, shared across every mode,
-- editable from the Stats page. player_soul_registry keeps
-- reincarnation_count scoped per (player_id, game_mode) — that part is
-- correctly independent per mode (exhausting the character pool and
-- reincarnating is unrelated to exhausting the song pool) and is untouched
-- by this migration.

-- soul_name no longer belongs on this table — it was always conceptually
-- "the player's name," not "the player's name in this specific mode."
alter table public.player_soul_registry drop column if exists soul_name;

-- ============================================================================
-- register_soul_name — no longer takes game_mode. Sets players.soul_name
-- once. Callable again later to rename (the Stats page editor uses this
-- same RPC for both "first time" and "change my name").
-- ============================================================================
drop function if exists public.register_soul_name(uuid, text, text);

create or replace function public.register_soul_name(
    p_player_id uuid,
    p_soul_name text
) returns jsonb
language plpgsql security definer as $$
declare
    v_player record;
begin
    if p_soul_name is null or length(trim(p_soul_name)) = 0 then
        raise exception 'soul_name must not be empty';
    end if;
    if length(p_soul_name) > 40 then
        raise exception 'soul_name too long';
    end if;

    update public.players set soul_name = trim(p_soul_name)
    where id = p_player_id
    returning * into v_player;

    if not found then
        raise exception 'player not found';
    end if;

    return to_jsonb(v_player);
end;
$$;