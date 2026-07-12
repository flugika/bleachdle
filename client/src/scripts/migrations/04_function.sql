-- Helper: สร้างลำดับ id แบบสุ่มสับใหม่ทุกรอบ ไม่ให้ pattern ซ้ำเดิม
-- และกันไม่ให้ตัวสุดท้ายของรอบก่อน = ตัวแรกของรอบถัดไป (กันเดาซ้ำวันติดกัน)
CREATE OR REPLACE FUNCTION build_no_repeat_sequence(p_table TEXT, p_length INT)
RETURNS TEXT[]
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    pool TEXT[];
    pool_size INT;
    result TEXT[] := ARRAY[]::TEXT[];
    lap TEXT[];
    tmp TEXT;
BEGIN
    -- 🩹 FIX 1: บังคับสุ่มตั้งแต่ตอนดึงออกจากตารางหลักครั้งแรก
    EXECUTE format('
        SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) 
        FROM (SELECT id FROM %I ORDER BY random()) t
    ', p_table) INTO pool;

    pool_size := cardinality(pool);

    IF pool_size = 0 THEN
        RETURN array_fill(NULL::TEXT, ARRAY[p_length]);
    END IF;

    WHILE cardinality(result) < p_length LOOP
        -- 🩹 FIX 2: ดึง unnest ไปไว้ใน FROM clause เพื่อบังคับให้ random() ทำงานทุกๆ แถวชัวร์ๆ
        SELECT COALESCE(array_agg(val), ARRAY[]::TEXT[]) INTO lap
        FROM (SELECT unnest(pool) AS val ORDER BY random()) t;

        -- ถ้าตัวแรกของรอบใหม่ ดันซ้ำกับตัวสุดท้ายของรอบก่อน ให้สลับตำแหน่งกับตัวถัดไป
        IF cardinality(result) > 0
           AND lap[1] = result[cardinality(result)]
           AND pool_size > 1 THEN
            tmp := lap[1];
            lap[1] := lap[2];
            lap[2] := tmp;
        END IF;

        result := result || lap;
    END LOOP;

    RETURN result[1:p_length];
END;
$$;

CREATE OR REPLACE FUNCTION build_song_segment_sequence(p_length INT)
RETURNS song_segment_pair[]
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    song_pool TEXT[];
    pool_idx INT := 1;
    pool_size INT;
    final_pairs song_segment_pair[] := ARRAY[]::song_segment_pair[];
    
    current_song_id TEXT;
    prev_song_id TEXT := NULL;
    selected_segment_id TEXT;
    
    i INT;
    temp_swap TEXT;
BEGIN
    SELECT array_agg(id), cardinality(array_agg(id)) INTO song_pool, pool_size
    FROM (SELECT id FROM songs ORDER BY random()) t;

    -- 🩹 FIX: ถ้ายังไม่มีข้อมูลเพลง ให้คืนค่า Array(NULL, NULL) กลับไป
    IF pool_size IS NULL OR pool_size = 0 THEN
        RETURN array_fill(ROW(NULL::TEXT, NULL::TEXT)::song_segment_pair, ARRAY[p_length]);
    END IF;

    FOR i IN 1..p_length LOOP
        IF pool_idx > pool_size THEN
            SELECT array_agg(id) INTO song_pool
            FROM (SELECT id FROM songs ORDER BY random()) t;
            pool_idx := 1;
        END IF;

        current_song_id := song_pool[pool_idx];

        IF current_song_id = prev_song_id AND pool_size > 1 AND pool_idx < pool_size THEN
            temp_swap := song_pool[pool_idx];
            song_pool[pool_idx] := song_pool[pool_idx + 1];
            song_pool[pool_idx + 1] := temp_swap;
            current_song_id := song_pool[pool_idx];
        END IF;

        SELECT id INTO selected_segment_id
        FROM song_segments
        WHERE song_id = current_song_id
        ORDER BY random()
        LIMIT 1;

        IF selected_segment_id IS NULL THEN
            selected_segment_id := 'no-segment'; 
        END IF;

        final_pairs := final_pairs || ROW(current_song_id, selected_segment_id)::song_segment_pair;
        
        prev_song_id := current_song_id;
        pool_idx := pool_idx + 1;
    END LOOP;

    RETURN final_pairs;
END;
$$;

CREATE OR REPLACE FUNCTION build_grouped_no_repeat_sequence(
    p_item_table TEXT,
    p_group_column TEXT,
    p_length INT,
    p_item_id_column TEXT DEFAULT 'id'
)
RETURNS group_item_pair[]
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    group_pool TEXT[];
    pool_idx INT := 1;
    pool_size INT;
    final_pairs group_item_pair[] := ARRAY[]::group_item_pair[];

    current_group_id TEXT;
    prev_group_id TEXT := NULL;
    selected_item_id TEXT;

    i INT;
    temp_swap TEXT;
BEGIN
    EXECUTE format(
        'SELECT COALESCE(array_agg(gid), ARRAY[]::TEXT[])
         FROM (
             SELECT gid FROM (
                 SELECT DISTINCT %I AS gid FROM %I WHERE %I IS NOT NULL
             ) d
             ORDER BY random()
         ) t',
        p_group_column, p_item_table, p_group_column
    ) INTO group_pool;

    pool_size := cardinality(group_pool);

    -- 🩹 FIX: ถ้าตารางไม่มีข้อมูล หรือไม่มีคอลัมน์นี้ ให้คืนค่า Array(NULL, NULL) กลับไปเลย (ไม่พ่น Error)
    IF pool_size IS NULL OR pool_size = 0 THEN
        RETURN array_fill(ROW(NULL::TEXT, NULL::TEXT)::group_item_pair, ARRAY[p_length]);
    END IF;

    FOR i IN 1..p_length LOOP
        IF pool_idx > pool_size THEN
            EXECUTE format(
                'SELECT array_agg(gid)
                 FROM (
                     SELECT gid FROM (
                         SELECT DISTINCT %I AS gid FROM %I WHERE %I IS NOT NULL
                     ) d
                     ORDER BY random()
                 ) t',
                p_group_column, p_item_table, p_group_column
            ) INTO group_pool;
            pool_idx := 1;
        END IF;

        current_group_id := group_pool[pool_idx];

        IF current_group_id = prev_group_id AND pool_size > 1 AND pool_idx < pool_size THEN
            temp_swap := group_pool[pool_idx];
            group_pool[pool_idx] := group_pool[pool_idx + 1];
            group_pool[pool_idx + 1] := temp_swap;
            current_group_id := group_pool[pool_idx];
        END IF;

        EXECUTE format(
            'SELECT %I FROM %I WHERE %I = $1 ORDER BY random() LIMIT 1',
            p_item_id_column, p_item_table, p_group_column
        ) INTO selected_item_id USING current_group_id;

        IF selected_item_id IS NULL THEN
            selected_item_id := 'no-item';
        END IF;

        final_pairs := final_pairs || ROW(current_group_id, selected_item_id)::group_item_pair;

        prev_group_id := current_group_id;
        pool_idx := pool_idx + 1;
    END LOOP;

    RETURN final_pairs;
END;
$$;

CREATE OR REPLACE FUNCTION generate_daily_schedule()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    char_ids TEXT[];
    total_days INT;
    start_date DATE;

    song_pair_seq song_segment_pair[];

    quote_pair_seq group_item_pair[];
    silhouette_pair_seq group_item_pair[];
    release_pair_seq group_item_pair[];
    emoji_pair_seq group_item_pair[];
BEGIN
    IF EXISTS (SELECT 1 FROM daily_schedule WHERE date = CURRENT_DATE) THEN
        RETURN 'Notification: Schedule for today already exists.';
    END IF;

    SELECT COALESCE(MAX(date) + 1, CURRENT_DATE) INTO start_date FROM daily_schedule;

    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO char_ids
    FROM (SELECT id FROM characters ORDER BY random()) t;

    total_days := cardinality(char_ids);
    IF total_days = 0 THEN
        RETURN 'Error: No characters found.';
    END IF;

    song_pair_seq := build_song_segment_sequence(total_days);

    -- Quote / Silhouette: always populate (shipped verticals)
    quote_pair_seq      := build_grouped_no_repeat_sequence('quotes', 'character_id', total_days, 'id');
    silhouette_pair_seq := build_grouped_no_repeat_sequence('silhouettes', 'character_id', total_days, 'id');

    -- 🩹 Release / Emoji: still unshipped (FEATURE_FLAGS.release/emoji = false in both modes).
    -- Their tables may be empty or fully NULL character_id — guard so we don't attempt a
    -- pool build against zero rows and instead fall back to a NULL sequence directly.
    IF EXISTS (SELECT 1 FROM releases WHERE character_id IS NOT NULL) THEN
        release_pair_seq := build_grouped_no_repeat_sequence('releases', 'character_id', total_days, 'id');
    ELSE
        release_pair_seq := array_fill(ROW(NULL::TEXT, NULL::TEXT)::group_item_pair, ARRAY[total_days]);
    END IF;

    IF EXISTS (SELECT 1 FROM emojis WHERE character_id IS NOT NULL) THEN
        emoji_pair_seq := build_grouped_no_repeat_sequence('emojis', 'character_id', total_days, 'id');
    ELSE
        emoji_pair_seq := array_fill(ROW(NULL::TEXT, NULL::TEXT)::group_item_pair, ARRAY[total_days]);
    END IF;

    FOR i IN 1..total_days LOOP
        INSERT INTO daily_schedule (
            date, character_id,
            song_id, song_segment_id,
            quote_id, silhouette_id, release_id, emoji_id
        )
        VALUES (
            start_date + (i - 1),
            char_ids[i],
            (song_pair_seq[i]).song_id,
            (song_pair_seq[i]).segment_id,
            (quote_pair_seq[i]).item_id,
            (silhouette_pair_seq[i]).item_id,
            (release_pair_seq[i]).item_id,
            (emoji_pair_seq[i]).item_id
        )
        ON CONFLICT (date) DO NOTHING;
    END LOOP;

    RETURN 'Success: Generated ' || total_days || ' days starting from ' || start_date;
END;
$$;

CREATE OR REPLACE FUNCTION increment_daily_stat(
  p_date date,
  p_mode text,
  p_passed boolean,
  p_guess_count integer DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  played_col text;
  passed_col text;
  dist_col   text;
  dist_key   text := COALESCE(p_guess_count::text, 'fail');
BEGIN
  IF p_mode NOT IN ('character', 'song', 'silhouette', 'release', 'emoji', 'quote') THEN
    RAISE EXCEPTION 'invalid mode: %', p_mode;
  END IF;

  -- ✅ เพิ่มตรงนี้: กัน guess_count นอก range แม้เรียก RPC ตรงๆ
  IF p_guess_count IS NOT NULL AND (p_guess_count < 1 OR p_guess_count > 10) THEN
    RAISE EXCEPTION 'invalid guess count: %', p_guess_count;
  END IF;

  played_col := p_mode || '_played_count';
  passed_col := p_mode || '_passed_count';
  dist_col   := p_mode || '_guess_distribution';

  EXECUTE format('
    INSERT INTO daily_stats (date, %I, %I, %I)
    VALUES ($1, 1, CASE WHEN $2 THEN 1 ELSE 0 END,
            jsonb_build_object($3, 1))
    ON CONFLICT (date) DO UPDATE SET
      %I = daily_stats.%I + 1,
      %I = daily_stats.%I + CASE WHEN $2 THEN 1 ELSE 0 END,
      %I = jsonb_set(
             daily_stats.%I,
             ARRAY[$3],
             (COALESCE((daily_stats.%I ->> $3)::int, 0) + 1)::text::jsonb
           )
  ', played_col, passed_col, dist_col,
     played_col, played_col,
     passed_col, passed_col,
     dist_col, dist_col, dist_col)
  USING p_date, p_passed, dist_key;
END;
$$;

CREATE OR REPLACE FUNCTION _stat_summary(p_played int, p_passed int, p_dist jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'played', p_played,
    'passed', p_passed,
    'win_rate', CASE WHEN p_played > 0
      THEN ROUND((p_passed::numeric / p_played) * 100, 1)
      ELSE 0 END,
    'avg_guesses', (
      SELECT CASE WHEN SUM(value::numeric) > 0
        THEN ROUND(SUM(key::numeric * value::numeric) / SUM(value::numeric), 2)
        ELSE NULL END
      FROM jsonb_each_text(p_dist)
    )
  );
$$;

CREATE OR REPLACE FUNCTION get_daily_stats(p_date date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'character', _stat_summary(
      COALESCE(ds.character_played_count, 0),
      COALESCE(ds.character_passed_count, 0),
      COALESCE(ds.character_guess_distribution, '{}'::jsonb)
    ),
    'song', _stat_summary(
      COALESCE(ds.song_played_count, 0),
      COALESCE(ds.song_passed_count, 0),
      COALESCE(ds.song_guess_distribution, '{}'::jsonb)
    ),
    'silhouette', _stat_summary(
      COALESCE(ds.silhouette_played_count, 0),
      COALESCE(ds.silhouette_passed_count, 0),
      COALESCE(ds.silhouette_guess_distribution, '{}'::jsonb)
    ),
    'release', _stat_summary(
      COALESCE(ds.release_played_count, 0),
      COALESCE(ds.release_passed_count, 0),
      COALESCE(ds.release_guess_distribution, '{}'::jsonb)
    ),
    'emoji', _stat_summary(
      COALESCE(ds.emoji_played_count, 0),
      COALESCE(ds.emoji_passed_count, 0),
      COALESCE(ds.emoji_guess_distribution, '{}'::jsonb)
    ),
    'quote', _stat_summary(
      COALESCE(ds.quote_played_count, 0),
      COALESCE(ds.quote_passed_count, 0),
      COALESCE(ds.quote_guess_distribution, '{}'::jsonb)
    )
  )
  FROM (SELECT p_date AS date) d
  LEFT JOIN daily_stats ds ON ds.date = d.date;
$$;

-- sql/get_global_stats.sql
--
-- Two RPCs backing GET /api/stats/global:
--   get_global_stats_today(p_date)  → single day's numbers (Daily tab)
--   get_global_stats_alltime()      → summed across every stored day
--                                     (used as the "Unlimited" global number
--                                     until a dedicated all-time rollup table
--                                     exists — see note at bottom of this file)
--
-- Both return one JSONB object shaped like:
--   {
--     "character": { "played": 123, "passed": 45, "guess_distribution": {"1":2,...} },
--     "quote": {...}, "song": {...}, "silhouette": {...}, "emoji": {...}, "release": {...}
--   }
-- so the API route can loop over a fixed mode list without six near-identical
-- SQL blocks in the route handler itself.

CREATE OR REPLACE FUNCTION get_global_stats_today(p_date date)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    SELECT jsonb_build_object(
        'character', jsonb_build_object(
            'played', COALESCE(character_played_count, 0),
            'passed', COALESCE(character_passed_count, 0),
            'guess_distribution', COALESCE(character_guess_distribution, '{}'::jsonb)
        ),
        'song', jsonb_build_object(
            'played', COALESCE(song_played_count, 0),
            'passed', COALESCE(song_passed_count, 0),
            'guess_distribution', COALESCE(song_guess_distribution, '{}'::jsonb)
        ),
        'silhouette', jsonb_build_object(
            'played', COALESCE(silhouette_played_count, 0),
            'passed', COALESCE(silhouette_passed_count, 0),
            'guess_distribution', COALESCE(silhouette_guess_distribution, '{}'::jsonb)
        ),
        'release', jsonb_build_object(
            'played', COALESCE(release_played_count, 0),
            'passed', COALESCE(release_passed_count, 0),
            'guess_distribution', COALESCE(release_guess_distribution, '{}'::jsonb)
        ),
        'emoji', jsonb_build_object(
            'played', COALESCE(emoji_played_count, 0),
            'passed', COALESCE(emoji_passed_count, 0),
            'guess_distribution', COALESCE(emoji_guess_distribution, '{}'::jsonb)
        ),
        'quote', jsonb_build_object(
            'played', COALESCE(quote_played_count, 0),
            'passed', COALESCE(quote_passed_count, 0),
            'guess_distribution', COALESCE(quote_guess_distribution, '{}'::jsonb)
        )
    )
    FROM daily_stats
    WHERE date = p_date;
$$;

-- Merges a jsonb distribution column across every row into one {"1": n, "2": n, ...}
CREATE OR REPLACE FUNCTION _merge_guess_distribution(p_column text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result jsonb;
BEGIN
    EXECUTE format(
        $q$
            SELECT COALESCE(jsonb_object_agg(bucket, total), '{}'::jsonb)
            FROM (
                SELECT key AS bucket, SUM(value::int) AS total
                FROM daily_stats, jsonb_each_text(%I)
                GROUP BY key
            ) buckets
        $q$,
        p_column
    ) INTO result;
    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_global_stats_alltime()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    totals record;
BEGIN
    SELECT
        SUM(character_played_count)  AS character_played,
        SUM(character_passed_count)  AS character_passed,
        SUM(song_played_count)       AS song_played,
        SUM(song_passed_count)       AS song_passed,
        SUM(silhouette_played_count) AS silhouette_played,
        SUM(silhouette_passed_count) AS silhouette_passed,
        SUM(release_played_count)    AS release_played,
        SUM(release_passed_count)    AS release_passed,
        SUM(emoji_played_count)      AS emoji_played,
        SUM(emoji_passed_count)      AS emoji_passed,
        SUM(quote_played_count)      AS quote_played,
        SUM(quote_passed_count)      AS quote_passed
    INTO totals
    FROM daily_stats;

    RETURN jsonb_build_object(
        'character', jsonb_build_object(
            'played', COALESCE(totals.character_played, 0),
            'passed', COALESCE(totals.character_passed, 0),
            'guess_distribution', _merge_guess_distribution('character_guess_distribution')
        ),
        'song', jsonb_build_object(
            'played', COALESCE(totals.song_played, 0),
            'passed', COALESCE(totals.song_passed, 0),
            'guess_distribution', _merge_guess_distribution('song_guess_distribution')
        ),
        'silhouette', jsonb_build_object(
            'played', COALESCE(totals.silhouette_played, 0),
            'passed', COALESCE(totals.silhouette_passed, 0),
            'guess_distribution', _merge_guess_distribution('silhouette_guess_distribution')
        ),
        'release', jsonb_build_object(
            'played', COALESCE(totals.release_played, 0),
            'passed', COALESCE(totals.release_passed, 0),
            'guess_distribution', _merge_guess_distribution('release_guess_distribution')
        ),
        'emoji', jsonb_build_object(
            'played', COALESCE(totals.emoji_played, 0),
            'passed', COALESCE(totals.emoji_passed, 0),
            'guess_distribution', _merge_guess_distribution('emoji_guess_distribution')
        ),
        'quote', jsonb_build_object(
            'played', COALESCE(totals.quote_played, 0),
            'passed', COALESCE(totals.quote_passed, 0),
            'guess_distribution', _merge_guess_distribution('quote_guess_distribution')
        )
    );
END;
$$;

-- ============================================================================
-- NOTE on "Unlimited" numbers:
-- daily_stats only ever tracks the shared daily puzzle (PK = date), so
-- get_global_stats_alltime() is really "all-time totals of the Daily mode",
-- NOT global stats for the Unlimited game mode (which has no server-side
-- table at all right now — it's 100% client localStorage, per-player, with
-- no submission endpoint). If you want a real global Unlimited leaderboard
-- (e.g. "X players have cleared Unlimited"), you need a new table that
-- Unlimited actually writes to when a player finishes a full clear. Until
-- that exists, the API route below returns this alltime-Daily rollup for
-- both tabs so the page doesn't show fake data, with a `dimension` field
-- so the client can label it honestly.
-- ============================================================================

-- ============================================================================
-- FIX: 22P02 "invalid input syntax for type numeric: 'fail'"
--
-- Root cause: increment_daily_stat() stores failed attempts in the
-- guess_distribution jsonb under the literal key "fail":
--     dist_key := COALESCE(p_guess_count::text, 'fail');
--
-- _stat_summary()'s avg_guesses subquery iterates over EVERY key in that
-- jsonb (including "fail") and tries `key::numeric`, which explodes the
-- moment a single loss has ever been recorded for that mode/day.
--
-- Fix: only aggregate keys that are actually numeric guess counts.
-- ============================================================================

CREATE OR REPLACE FUNCTION _stat_summary(p_played int, p_passed int, p_dist jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'played', p_played,
    'passed', p_passed,
    'win_rate', CASE WHEN p_played > 0
      THEN ROUND((p_passed::numeric / p_played) * 100, 1)
      ELSE 0 END,
    'avg_guesses', (
      SELECT CASE WHEN SUM(value::numeric) > 0
        THEN ROUND(SUM(key::numeric * value::numeric) / SUM(value::numeric), 2)
        ELSE NULL END
      FROM jsonb_each_text(p_dist)
      WHERE key ~ '^[0-9]+$'   -- 🩹 skip the "fail" bucket, only real guess counts
    )
  );
$$;

-- Auto-prune so this table never becomes the next incident. Called opportunistically
-- from log_api_event() itself (cheap: only runs the delete 1 in ~200 inserts).
CREATE OR REPLACE FUNCTION log_api_event(
    p_endpoint TEXT,
    p_level TEXT,
    p_status_code INT DEFAULT NULL,
    p_note TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_level NOT IN ('success', 'warning', 'error') THEN
        RETURN; -- never let bad telemetry break the caller
    END IF;

    INSERT INTO api_events (endpoint, level, status_code, note)
    VALUES (p_endpoint, p_level, p_status_code, NULLIF(left(p_note, 200), ''));

    IF random() < 0.005 THEN
        DELETE FROM api_events WHERE created_at < now() - interval '14 days';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Telemetry must never be the reason a real request fails.
    NULL;
END;
$$;

-- Returns hourly buckets for the last p_hours hours, plus per-endpoint totals,
-- shaped for the monitor dashboard's bar chart + table.
CREATE OR REPLACE FUNCTION get_api_health(p_hours INT DEFAULT 24)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH bounds AS (
    SELECT date_trunc('hour', now()) - ((p_hours - 1) || ' hours')::interval AS start_hour
  ),
  buckets AS (
    SELECT generate_series(
      (SELECT start_hour FROM bounds),
      date_trunc('hour', now()),
      interval '1 hour'
    ) AS bucket_hour
  ),
  agg AS (
    SELECT date_trunc('hour', created_at) AS bucket_hour, level, COUNT(*) AS n
    FROM api_events, bounds
    WHERE created_at >= bounds.start_hour
    GROUP BY 1, 2
  ),
  timeline AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'hour', to_char(b.bucket_hour, 'HH24:MI'),
        'success', COALESCE((SELECT n FROM agg WHERE agg.bucket_hour = b.bucket_hour AND level = 'success'), 0),
        'warning', COALESCE((SELECT n FROM agg WHERE agg.bucket_hour = b.bucket_hour AND level = 'warning'), 0),
        'error',   COALESCE((SELECT n FROM agg WHERE agg.bucket_hour = b.bucket_hour AND level = 'error'), 0)
      ) ORDER BY b.bucket_hour
    ) AS series
    FROM buckets b
  ),
  totals AS (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE level = 'success') AS success,
      COUNT(*) FILTER (WHERE level = 'warning') AS warning,
      COUNT(*) FILTER (WHERE level = 'error') AS error
    FROM api_events, bounds
    WHERE created_at >= bounds.start_hour
  ),
  by_endpoint AS (
    SELECT jsonb_agg(row_to_json(e) ORDER BY e.total DESC) AS endpoints
    FROM (
      SELECT
        endpoint,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE level = 'success') AS success,
        COUNT(*) FILTER (WHERE level = 'warning') AS warning,
        COUNT(*) FILTER (WHERE level = 'error') AS error
      FROM api_events, bounds
      WHERE created_at >= bounds.start_hour
      GROUP BY endpoint
    ) e
  )
  SELECT jsonb_build_object(
    'hours', p_hours,
    'total', COALESCE((SELECT total FROM totals), 0),
    'success', COALESCE((SELECT success FROM totals), 0),
    'warning', COALESCE((SELECT warning FROM totals), 0),
    'error', COALESCE((SELECT error FROM totals), 0),
    'success_rate', CASE WHEN COALESCE((SELECT total FROM totals), 0) = 0 THEN 100
      ELSE ROUND(((SELECT success FROM totals)::numeric / (SELECT total FROM totals)) * 100, 1)
    END,
    'timeline', COALESCE((SELECT series FROM timeline), '[]'::jsonb),
    'endpoints', COALESCE((SELECT endpoints FROM by_endpoint), '[]'::jsonb)
  );
$$;

-- ============================================================================
-- ADD-ON: filterable event log (date range + level) and a multi-day stats
-- summary (plays per mode per day), for the /monitor dashboard.
--
-- Assumes:
--   - api_events(id, endpoint, level, status_code, note, created_at) exists
--     (see earlier log_api_event / get_api_health migration)
--   - daily_stats(date date, mode text, played int, passed int,
--     guess_distribution jsonb) exists, upserted by increment_daily_stat()
--     and read by get_daily_stats(p_date). Adjust column names below if your
--     actual table differs.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- get_api_events: raw, filterable event log for the "Roll call" / log table.
--   p_start / p_end: inclusive UTC bounds. Pass NULL to leave a side open.
--   p_level: 'success' | 'warning' | 'error' | NULL (NULL = all)
--   p_endpoint: exact endpoint match, NULL = all
--   p_limit: hard cap so a wide-open range filter can't return unbounded rows
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_api_events(
    p_start    TIMESTAMPTZ DEFAULT NULL,
    p_end      TIMESTAMPTZ DEFAULT NULL,
    p_level    TEXT DEFAULT NULL,
    p_endpoint TEXT DEFAULT NULL,
    p_limit    INT DEFAULT 200
)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(jsonb_agg(row_to_json(e) ORDER BY e.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT id, endpoint, level, status_code, note, created_at
    FROM api_events
    WHERE (p_start IS NULL OR created_at >= p_start)
      AND (p_end   IS NULL OR created_at <= p_end)
      AND (p_level IS NULL OR level = p_level)
      AND (p_endpoint IS NULL OR endpoint = p_endpoint)
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 1000)
  ) e;
$$;

-- ----------------------------------------------------------------------------
-- get_stats_history: per-day, per-mode play summary for the last p_days days
-- (including today), oldest first. Powers the "what happened each day" recap.
-- Reuses the same fail-bucket-safe avg_guesses logic as _stat_summary().
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_stats_history(p_days INT DEFAULT 7)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  WITH bounds AS (
    SELECT (CURRENT_DATE - (LEAST(GREATEST(p_days, 1), 90) - 1)) AS start_date
  ),
  days AS (
    SELECT generate_series((SELECT start_date FROM bounds), CURRENT_DATE, interval '1 day')::date AS d
  ),
  per_day_mode AS (
    SELECT ds.date, m.mode, m.played, m.passed, m.dist
    FROM daily_stats ds, bounds
    CROSS JOIN LATERAL (
      VALUES
        ('character',  ds.character_played_count,  ds.character_passed_count,  ds.character_guess_distribution),
        ('song',       ds.song_played_count,        ds.song_passed_count,       ds.song_guess_distribution),
        ('silhouette', ds.silhouette_played_count,  ds.silhouette_passed_count, ds.silhouette_guess_distribution),
        ('release',    ds.release_played_count,     ds.release_passed_count,    ds.release_guess_distribution),
        ('emoji',      ds.emoji_played_count,       ds.emoji_passed_count,      ds.emoji_guess_distribution),
        ('quote',      ds.quote_played_count,        ds.quote_passed_count,      ds.quote_guess_distribution)
    ) AS m(mode, played, passed, dist)
    WHERE ds.date >= bounds.start_date
      AND m.played > 0
  ),
  per_day_summary AS (
    SELECT date, mode, _stat_summary(played, passed, dist) AS summary, played, passed
    FROM per_day_mode
  ),
  per_day AS (
    SELECT
      d.d AS date,
      COALESCE(
        jsonb_object_agg(pdm.mode, pdm.summary) FILTER (WHERE pdm.mode IS NOT NULL),
        '{}'::jsonb
      ) AS modes,
      COALESCE(SUM(pdm.played), 0) AS total_played,
      COALESCE(SUM(pdm.passed), 0) AS total_passed
    FROM days d
    LEFT JOIN per_day_summary pdm ON pdm.date = d.d
    GROUP BY d.d
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(date, 'YYYY-MM-DD'),
        'total_played', total_played,
        'total_passed', total_passed,
        'modes', modes
      ) ORDER BY date ASC
    ),
    '[]'::jsonb
  )
  FROM per_day;
$$;