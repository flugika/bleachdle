-- Helper: สร้างลำดับ id แบบสุ่มสับใหม่ทุกรอบ ไม่ให้ pattern ซ้ำเดิม
-- และกันไม่ให้ตัวสุดท้ายของรอบก่อน = ตัวแรกของรอบถัดไป (กันเดาซ้ำวันติดกัน)
CREATE OR REPLACE FUNCTION build_no_repeat_sequence(p_table TEXT, p_length INT)
RETURNS TEXT[]
LANGUAGE plpgsql
AS $$
DECLARE
    pool TEXT[];
    pool_size INT;
    result TEXT[] := ARRAY[]::TEXT[];
    lap TEXT[];
    tmp TEXT;
BEGIN
    EXECUTE format('SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) FROM %I', p_table) INTO pool;
    pool_size := cardinality(pool);

    IF pool_size = 0 THEN
        RETURN array_fill(NULL::TEXT, ARRAY[p_length]);
    END IF;

    WHILE cardinality(result) < p_length LOOP
        SELECT COALESCE(array_agg(id), ARRAY[]::TEXT[]) INTO lap
        FROM (SELECT unnest(pool) AS id ORDER BY random()) t;

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

    RETURN result[1:p_length]; -- ตัดท้ายให้พอดี ถ้ารอบสุดท้ายเกิน
END;
$$;

CREATE OR REPLACE FUNCTION build_song_segment_sequence(p_length INT)
RETURNS song_segment_pair[] -- เปลี่ยน return type
LANGUAGE plpgsql
AS $$
DECLARE
    song_pool TEXT[];
    pool_idx INT := 1;
    final_pairs song_segment_pair[] := ARRAY[]::song_segment_pair[];
    
    current_song_id TEXT;
    prev_song_id TEXT := NULL;
    selected_segment_id TEXT;
    
    i INT;
    temp_swap TEXT;
BEGIN
    -- ดึงรายการเพลงทั้งหมดมาทำ Pool
    SELECT array_agg(id) INTO song_pool
    FROM (SELECT id FROM songs ORDER BY random()) t;

    FOR i IN 1..p_length LOOP
        -- Reshuffle ถ้าใช้เพลงหมดสำรับ
        IF pool_idx > cardinality(song_pool) THEN
            SELECT array_agg(id) INTO song_pool
            FROM (SELECT id FROM songs ORDER BY random()) t;
            pool_idx := 1;
        END IF;

        current_song_id := song_pool[pool_idx];

        -- กันเพลงซ้ำติดกัน
        IF current_song_id = prev_song_id AND cardinality(song_pool) > 1 THEN
            temp_swap := song_pool[pool_idx];
            song_pool[pool_idx] := song_pool[pool_idx + 1];
            song_pool[pool_idx + 1] := temp_swap;
            current_song_id := song_pool[pool_idx];
        END IF;

        -- สุ่มเลือก Segment ที่ผูกกับ Song นี้แน่นอน
        SELECT id INTO selected_segment_id
        FROM song_segments
        WHERE song_id = current_song_id
        ORDER BY random()
        LIMIT 1;

        -- เพิ่ม Pair เข้าใน Array
        final_pairs := final_pairs || ROW(current_song_id, selected_segment_id)::song_segment_pair;
        
        prev_song_id := current_song_id;
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

    -- เปลี่ยนโครงสร้างตัวแปรรับค่า
    song_pair_seq song_segment_pair[]; 
    
    image_seq   TEXT[];
    release_seq TEXT[];
    emoji_seq   TEXT[];
    quote_seq   TEXT[];
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

    -- รับค่าคู่ (song_id, segment_id)
    song_pair_seq := build_song_segment_sequence(total_days);
    
    image_seq   := build_no_repeat_sequence('images', total_days);
    release_seq := build_no_repeat_sequence('releases', total_days);
    emoji_seq   := build_no_repeat_sequence('emojis', total_days);
    quote_seq   := build_no_repeat_sequence('quotes', total_days);

    FOR i IN 1..total_days LOOP
        INSERT INTO daily_schedule (
            date, character_id, 
            song_id, song_segment_id, -- ใส่ทั้ง 2 คอลัมน์ที่ผูกกัน
            image_id, release_id, emoji_id, quote_id
        )
        VALUES (
            start_date + (i - 1),
            char_ids[i],
            (song_pair_seq[i]).song_id,      -- ดึงจาก struct
            (song_pair_seq[i]).segment_id,   -- ดึงจาก struct
            image_seq[i],
            release_seq[i],
            emoji_seq[i],
            quote_seq[i]
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
  IF p_mode NOT IN ('character', 'song', 'image', 'release', 'emoji', 'quote') THEN
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