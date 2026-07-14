-- pg_dump "postgresql://postgres:[pass]@db.orpnqtgwqjfblpcjcliy.supabase.co:5432/postgres" --schema=public --schema-only --no-owner --no-privileges -f ./06_new_schema_dump.sql
--
-- PostgreSQL database dump
--

\restrict SXwHmKNLFQmy6cMiVbvZ4RX3j73gCpjITvKTkD4bctnCA8n21viyYJNNQD7t813

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: group_item_pair; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.group_item_pair AS (
	group_id text,
	item_id text
);


--
-- Name: release_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.release_type AS ENUM (
    'Shikai',
    'Bankai',
    'Resurreccion',
    'Vollstandig'
);


--
-- Name: song_segment_pair; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.song_segment_pair AS (
	song_id text,
	segment_id text
);


--
-- Name: _merge_guess_distribution(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._merge_guess_distribution(p_column text) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    AS $_$
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
$_$;


--
-- Name: _stat_summary(integer, integer, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._stat_summary(p_played integer, p_passed integer, p_dist jsonb) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $_$
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
$_$;


--
-- Name: build_grouped_no_repeat_sequence(text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.build_grouped_no_repeat_sequence(p_item_table text, p_group_column text, p_length integer, p_item_id_column text DEFAULT 'id'::text) RETURNS public.group_item_pair[]
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
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
    -- 🩹 FIX: แยก DISTINCT (ชั้นใน) กับ ORDER BY random() (ชั้นนอก) ออกจากกัน
    -- เพราะ SELECT DISTINCT ... ORDER BY random() ทำไม่ได้ตรงๆ ใน Postgres
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

    IF pool_size IS NULL OR pool_size = 0 THEN
        RAISE EXCEPTION 'ไม่มี distinct % ในตาราง %', p_group_column, p_item_table;
    END IF;

    FOR i IN 1..p_length LOOP
        IF pool_idx > pool_size THEN
            -- 🩹 FIX: เหมือนกันกับตอน reshuffle
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
$_$;


--
-- Name: build_no_repeat_sequence(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.build_no_repeat_sequence(p_table text, p_length integer) RETURNS text[]
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


--
-- Name: build_song_segment_sequence(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.build_song_segment_sequence(p_length integer) RETURNS public.song_segment_pair[]
    LANGUAGE plpgsql
    SET search_path TO 'public'
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


--
-- Name: generate_daily_schedule(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_daily_schedule() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_api_events(timestamp with time zone, timestamp with time zone, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_api_events(p_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end timestamp with time zone DEFAULT NULL::timestamp with time zone, p_level text DEFAULT NULL::text, p_endpoint text DEFAULT NULL::text, p_limit integer DEFAULT 200) RETURNS jsonb
    LANGUAGE sql STABLE
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


--
-- Name: get_api_health(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_api_health(p_hours integer DEFAULT 24) RETURNS jsonb
    LANGUAGE sql STABLE
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


--
-- Name: get_daily_stats(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_daily_stats(p_date date DEFAULT CURRENT_DATE) RETURNS jsonb
    LANGUAGE sql STABLE
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


--
-- Name: get_global_stats_alltime(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_stats_alltime() RETURNS jsonb
    LANGUAGE plpgsql STABLE
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


--
-- Name: get_global_stats_today(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_global_stats_today(p_date date) RETURNS jsonb
    LANGUAGE sql STABLE
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


--
-- Name: get_stats_history(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stats_history(p_days integer DEFAULT 7) RETURNS jsonb
    LANGUAGE sql STABLE
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


--
-- Name: get_support_tickets(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_support_tickets(p_status text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  WITH filtered AS (
    SELECT id, created_at, category, message, client_ref, status
    FROM support_tickets
    WHERE (p_status IS NULL OR status = p_status)
      AND (p_category IS NULL OR category = p_category)
  ),
  page AS (
    SELECT *
    FROM filtered
    ORDER BY created_at DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 200)
    OFFSET GREATEST(p_offset, 0)
  ),
  counts AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'new')      AS new,
      COUNT(*) FILTER (WHERE status = 'seen')      AS seen,
      COUNT(*) FILTER (WHERE status = 'resolved')  AS resolved,
      COUNT(*) FILTER (WHERE status = 'ignored')   AS ignored,
      COUNT(*)                                      AS total
    FROM support_tickets
    WHERE (p_category IS NULL OR category = p_category)
  ),
  category_counts AS (
    SELECT COALESCE(jsonb_object_agg(category, n), '{}'::jsonb) AS by_category
    FROM (
      SELECT category, COUNT(*) AS n
      FROM support_tickets
      WHERE (p_status IS NULL OR status = p_status)
      GROUP BY category
    ) c
  )
  SELECT jsonb_build_object(
    'tickets', COALESCE((SELECT jsonb_agg(row_to_json(page)) FROM page), '[]'::jsonb),
    'counts', (SELECT row_to_json(counts) FROM counts),
    'by_category', (SELECT by_category FROM category_counts),
    'has_more', (SELECT total FROM counts) > (p_offset + p_limit)
  );
$$;


--
-- Name: increment_daily_stat(date, text, boolean, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_daily_stat(p_date date, p_mode text, p_passed boolean, p_guess_count integer DEFAULT NULL::integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
$_$;


--
-- Name: log_api_event(text, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_api_event(p_endpoint text, p_level text, p_status_code integer DEFAULT NULL::integer, p_note text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: update_ticket_status(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_ticket_status(p_id uuid, p_status text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    updated jsonb;
BEGIN
    IF p_status NOT IN ('new', 'seen', 'resolved', 'ignored') THEN
        RAISE EXCEPTION 'invalid status: %', p_status;
    END IF;
 
    UPDATE support_tickets
    SET status = p_status
    WHERE id = p_id
    RETURNING row_to_json(support_tickets)::jsonb INTO updated;
 
    RETURN updated; -- NULL if no row matched
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_events (
    id bigint NOT NULL,
    endpoint text NOT NULL,
    level text NOT NULL,
    status_code smallint,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_events_level_check CHECK ((level = ANY (ARRAY['success'::text, 'warning'::text, 'error'::text])))
);


--
-- Name: api_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.api_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.api_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.characters (
    id text NOT NULL,
    name text NOT NULL,
    gender text,
    race text[],
    affiliation text,
    height_cm integer,
    age integer,
    eye_color text,
    hair_color text,
    first_appearance_chapter text,
    weapon text[],
    release text[],
    primary_ability text[],
    image text
);


--
-- Name: daily_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_schedule (
    date date NOT NULL,
    character_id text,
    song_id text,
    song_segment_id text,
    silhouette_id text,
    release_id text,
    emoji_id text,
    quote_id text
);


--
-- Name: daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_stats (
    date date NOT NULL,
    character_played_count integer DEFAULT 0 NOT NULL,
    character_passed_count integer DEFAULT 0 NOT NULL,
    song_played_count integer DEFAULT 0 NOT NULL,
    song_passed_count integer DEFAULT 0 NOT NULL,
    silhouette_played_count integer DEFAULT 0 NOT NULL,
    silhouette_passed_count integer DEFAULT 0 NOT NULL,
    release_played_count integer DEFAULT 0 NOT NULL,
    release_passed_count integer DEFAULT 0 NOT NULL,
    emoji_played_count integer DEFAULT 0 NOT NULL,
    emoji_passed_count integer DEFAULT 0 NOT NULL,
    character_guess_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    song_guess_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    release_guess_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    emoji_guess_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    quote_guess_distribution jsonb DEFAULT '{}'::jsonb NOT NULL,
    quote_played_count integer DEFAULT 0 NOT NULL,
    quote_passed_count integer DEFAULT 0 NOT NULL,
    silhouette_guess_distribution jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: emojis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emojis (
    id text NOT NULL,
    character_id text NOT NULL,
    emoji_list text[] NOT NULL
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id text NOT NULL,
    character_id text,
    text text NOT NULL,
    episode integer,
    chapter integer,
    arc text,
    context text
);


--
-- Name: releases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.releases (
    id text NOT NULL,
    character_id text NOT NULL,
    release_type public.release_type,
    trigger_phrase text,
    technique_name text,
    technique_translation text,
    audio_url text,
    clip_end_ms integer,
    source_episode text
);


--
-- Name: silhouettes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.silhouettes (
    id text NOT NULL,
    character_id text,
    image text NOT NULL
);


--
-- Name: song_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.song_segments (
    id text NOT NULL,
    song_id text NOT NULL,
    segment_name text NOT NULL,
    start_time_ms integer NOT NULL,
    difficulty_level text DEFAULT 'normal'::text
);


--
-- Name: songs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.songs (
    id text NOT NULL,
    title text NOT NULL,
    artist text DEFAULT 'Unknown'::text,
    album text,
    audio_url text NOT NULL,
    character_id text,
    youtube_url text,
    spotify_url text
);


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    category text NOT NULL,
    message text NOT NULL,
    client_ref text,
    status text DEFAULT 'new'::text NOT NULL,
    CONSTRAINT support_tickets_category_check CHECK ((category = ANY (ARRAY['bug'::text, 'feedback'::text, 'suggestion'::text, 'other'::text]))),
    CONSTRAINT support_tickets_message_check CHECK (((char_length(message) >= 10) AND (char_length(message) <= 1000))),
    CONSTRAINT support_tickets_status_check CHECK ((status = ANY (ARRAY['new'::text, 'seen'::text, 'resolved'::text, 'ignored'::text])))
);


--
-- Name: TABLE support_tickets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.support_tickets IS 'Feedback/bug reports from /support. Writable only via the service role (API route). No IP or user-agent is stored anywhere in this table.';


--
-- Name: api_events api_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_events
    ADD CONSTRAINT api_events_pkey PRIMARY KEY (id);


--
-- Name: characters characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);


--
-- Name: daily_schedule daily_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_pkey PRIMARY KEY (date);


--
-- Name: daily_stats daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_stats
    ADD CONSTRAINT daily_stats_pkey PRIMARY KEY (date);


--
-- Name: emojis emojis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emojis
    ADD CONSTRAINT emojis_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: releases releases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.releases
    ADD CONSTRAINT releases_pkey PRIMARY KEY (id);


--
-- Name: silhouettes silhouettes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silhouettes
    ADD CONSTRAINT silhouettes_pkey PRIMARY KEY (id);


--
-- Name: song_segments song_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_segments
    ADD CONSTRAINT song_segments_pkey PRIMARY KEY (id);


--
-- Name: songs songs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.songs
    ADD CONSTRAINT songs_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: idx_api_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_events_created_at ON public.api_events USING btree (created_at DESC);


--
-- Name: idx_api_events_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_events_endpoint ON public.api_events USING btree (endpoint, created_at DESC);


--
-- Name: support_tickets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_tickets_status_idx ON public.support_tickets USING btree (status);


--
-- Name: daily_schedule daily_schedule_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL;


--
-- Name: daily_schedule daily_schedule_emoji_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_emoji_id_fkey FOREIGN KEY (emoji_id) REFERENCES public.emojis(id) ON DELETE SET NULL;


--
-- Name: daily_schedule daily_schedule_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: daily_schedule daily_schedule_release_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_release_id_fkey FOREIGN KEY (release_id) REFERENCES public.releases(id) ON DELETE SET NULL;


--
-- Name: daily_schedule daily_schedule_silhouette_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_silhouette_id_fkey FOREIGN KEY (silhouette_id) REFERENCES public.silhouettes(id) ON DELETE SET NULL;


--
-- Name: daily_schedule daily_schedule_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE SET NULL;


--
-- Name: daily_schedule daily_schedule_song_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_schedule
    ADD CONSTRAINT daily_schedule_song_segment_id_fkey FOREIGN KEY (song_segment_id) REFERENCES public.song_segments(id) ON DELETE SET NULL;


--
-- Name: emojis emojis_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emojis
    ADD CONSTRAINT emojis_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: releases releases_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.releases
    ADD CONSTRAINT releases_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: silhouettes silhouettes_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.silhouettes
    ADD CONSTRAINT silhouettes_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id);


--
-- Name: song_segments song_segments_song_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.song_segments
    ADD CONSTRAINT song_segments_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;


--
-- Name: songs songs_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.songs
    ADD CONSTRAINT songs_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL;


--
-- Name: api_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_events ENABLE ROW LEVEL SECURITY;

--
-- Name: characters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_schedule; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: emojis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emojis ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: releases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

--
-- Name: silhouettes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.silhouettes ENABLE ROW LEVEL SECURITY;

--
-- Name: song_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.song_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: songs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

--
-- Name: support_tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict SXwHmKNLFQmy6cMiVbvZ4RX3j73gCpjITvKTkD4bctnCA8n21viyYJNNQD7t813

