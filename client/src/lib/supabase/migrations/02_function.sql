CREATE OR REPLACE FUNCTION generate_daily_schedule()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    char_ids TEXT[];
    song_ids TEXT[];
    image_ids TEXT[];
    release_ids TEXT[];
    emoji_ids TEXT[];
    quote_ids TEXT[]; -- เพิ่มตัวแปร quote_ids
    
    total_chars INT;
    song_count INT := 0;
    image_count INT := 0;
    release_count INT := 0;
    emoji_count INT := 0;
    quote_count INT := 0; -- เพิ่มตัวแปร quote_count
    
    start_date DATE;
    v_song_id TEXT;
    v_image_id TEXT;
    v_release_id TEXT;
    v_emoji_id TEXT;
    v_quote_id TEXT; -- เพิ่มตัวแปร v_quote_id
BEGIN
    IF EXISTS (SELECT 1 FROM daily_schedule WHERE date = CURRENT_DATE) THEN
        RETURN 'Notification: Schedule for today already exists. No action taken.';
    END IF;

    SELECT COALESCE(MAX(date) + 1, CURRENT_DATE) INTO start_date FROM daily_schedule;

    -- Fetch IDs
    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO char_ids FROM (SELECT id FROM characters ORDER BY random()) t;
    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO song_ids FROM (SELECT id FROM songs ORDER BY random()) t;
    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO image_ids FROM (SELECT id FROM images ORDER BY random()) t;
    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO release_ids FROM (SELECT id FROM releases ORDER BY random()) t;
    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO emoji_ids FROM (SELECT id FROM emojis ORDER BY random()) t;
    SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO quote_ids FROM (SELECT id FROM quotes ORDER BY random()) t; -- ดึง Quote

    total_chars := cardinality(char_ids);
    
    IF total_chars = 0 THEN
        RETURN 'Error: No characters found in the database.';
    END IF;

    song_count := cardinality(song_ids);
    image_count := cardinality(image_ids);
    release_count := cardinality(release_ids);
    emoji_count := cardinality(emoji_ids);
    quote_count := cardinality(quote_ids); -- นับจำนวน Quote

    FOR i IN 1..total_chars LOOP
        v_song_id    := CASE WHEN song_count > 0 THEN song_ids[((i - 1) % song_count) + 1] ELSE NULL END;
        v_image_id   := CASE WHEN image_count > 0 THEN image_ids[((i - 1) % image_count) + 1] ELSE NULL END;
        v_release_id := CASE WHEN release_count > 0 THEN release_ids[((i - 1) % release_count) + 1] ELSE NULL END;
        v_emoji_id   := CASE WHEN emoji_count > 0 THEN emoji_ids[((i - 1) % emoji_count) + 1] ELSE NULL END;
        v_quote_id   := CASE WHEN quote_count > 0 THEN quote_ids[((i - 1) % quote_count) + 1] ELSE NULL END; -- Assign Quote

        INSERT INTO daily_schedule (date, character_id, song_id, image_id, release_id, emoji_id, quote_id)
        VALUES (
            start_date + (i - 1),
            char_ids[i],
            v_song_id,
            v_image_id,
            v_release_id,
            v_emoji_id,
            v_quote_id -- เพิ่มเข้าไปในการ INSERT
        )
        ON CONFLICT (date) DO NOTHING;
    END LOOP;

    RETURN 'Success: Generated ' || total_chars || ' days of schedule starting from ' || start_date;
END;
$$;

CREATE OR REPLACE FUNCTION increment_daily_stat(
  p_date date,
  p_mode text,
  p_passed boolean,
  p_guess_count integer DEFAULT NULL
) RETURNS void AS $$
DECLARE
  played_col text := p_mode || '_played_count';
  passed_col text := p_mode || '_passed_count';
  dist_col   text := p_mode || '_guess_distribution';
  dist_key   text := COALESCE(p_guess_count::text, 'fail');
BEGIN
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
$$ LANGUAGE plpgsql;