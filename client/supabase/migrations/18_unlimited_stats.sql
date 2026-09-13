-- คืน stats เฉพาะของ player_id เดียว, เฉพาะ game_type='unlimited'
CREATE OR REPLACE FUNCTION public.get_player_stats(
    p_player_id uuid,
    p_game_type text DEFAULT 'unlimited'
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        jsonb_object_agg(
            game_mode,
            jsonb_build_object(
                'played', played_count,
                'passed', passed_count,
                'guess_distribution', guess_distribution,
                'current_streak', current_streak,
                'max_streak', max_streak
            )
        ),
        '{}'::jsonb
    )
    FROM player_stats
    WHERE player_id = p_player_id
      AND game_type = p_game_type;
$$;

-- reincarnation count ต่อ mode ของ player คนเดียว (สำหรับ cycle badge)
CREATE OR REPLACE FUNCTION public.get_player_soul_registry(p_player_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        jsonb_object_agg(game_mode, reincarnation_count),
        '{}'::jsonb
    )
    FROM player_soul_registry
    WHERE player_id = p_player_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_player_stats(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_stats(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_player_soul_registry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_soul_registry(uuid) TO service_role;