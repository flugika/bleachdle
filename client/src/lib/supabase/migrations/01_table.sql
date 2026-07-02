--ลบตารางเก่าออกก่อนเพื่อล้างสเปก UUID (ถ้ามี)
DROP TABLE IF EXISTS daily_schedule;
DROP TABLE IF EXISTS songs;
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS releases;
DROP TABLE IF EXISTS emojis;
DROP TABLE IF EXISTS characters;

-- 1. ตารางหลัก characters (เปลี่ยน id เป็น TEXT)
CREATE TABLE characters (
    id TEXT PRIMARY KEY,                   -- รองรับ ID ทุกรูปแบบจาก JSON ตรงๆ
    name TEXT NOT NULL,
    gender TEXT,
    race TEXT[],                           
    affiliation TEXT,
    height_cm INT4,                       
    age INT4,
    eye_color TEXT,
    hair_color TEXT,
    first_appearance_chapter TEXT,
    weapon TEXT[],                         
    release TEXT[],                        
    primary_ability TEXT[],                
    image TEXT
);

-- 2. ตารางโหมดเพลง (songs)
CREATE TABLE songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,                     
    artist TEXT DEFAULT 'Unknown',           
    album TEXT,                              
    audio_url TEXT NOT NULL,                 
    youtube_url text,
    spotify_url text,       
    start_time_ms INT4 DEFAULT 0,
    character_id TEXT REFERENCES characters(id) ON DELETE SET NULL -- เชื่อมโยงด้วย TEXT
);

CREATE TABLE public.song_segments (
    id text NOT NULL,
    song_id text NOT NULL,                  -- ผูกกับ songs.id
    segment_name text NOT NULL,             -- เช่น 'Intro Breath', 'Main Hook'
    start_time_ms integer NOT NULL,         -- ⏱️ จุดเริ่มต้น (หน่วย ms) เช่น 200, 42500
    difficulty_level text DEFAULT 'normal',  -- 'easy' | 'normal' | 'hard'
    CONSTRAINT song_segments_pkey PRIMARY KEY (id),
    CONSTRAINT song_segments_song_id_fkey FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE
);

-- 3. ตารางโหมดรูปภาพซูม (images)
CREATE TABLE images (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    zoom_urls TEXT[] NOT NULL,               
    full_image_url TEXT NOT NULL             
);

-- 4. ตารางโหมดคำปลดปล่อยพลัง (releases)
CREATE TABLE releases (
    id TEXT PRIMARY KEY,
    character_id TEXT REFERENCES characters(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,                 
    correct_answer TEXT NOT NULL,            
    acceptable_answers TEXT[] NOT NULL        
);

-- 5. ตารางโหมดเอโมจิคำใบ้ (emojis)
CREATE TABLE emojis (
    id TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    emoji_list TEXT[] NOT NULL                
);

CREATE TABLE quotes (
    id TEXT PRIMARY KEY,
    character_id TEXT REFERENCES characters(id) ON DELETE CASCADE,
    text TEXT NOT NULL
);

-- 6. ตารางจัดคิวรายวัน (daily_schedule)
CREATE TABLE daily_schedule (
    date DATE PRIMARY KEY,
    character_id TEXT REFERENCES characters(id) ON DELETE SET NULL,
    song_id TEXT REFERENCES songs(id) ON DELETE SET NULL,
    image_id TEXT REFERENCES images(id) ON DELETE SET NULL,
    release_id TEXT REFERENCES releases(id) ON DELETE SET NULL,
    emoji_id TEXT REFERENCES emojis(id) ON DELETE SET NULL,
    quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL
);

CREATE TABLE public.daily_stats (
    date date NOT NULL PRIMARY KEY,

    character_played_count integer NOT NULL DEFAULT 0,
    character_passed_count integer NOT NULL DEFAULT 0,

    song_played_count integer NOT NULL DEFAULT 0,
    song_passed_count integer NOT NULL DEFAULT 0,

    image_played_count integer NOT NULL DEFAULT 0,
    image_passed_count integer NOT NULL DEFAULT 0,

    release_played_count integer NOT NULL DEFAULT 0,
    release_passed_count integer NOT NULL DEFAULT 0,

    emoji_played_count integer NOT NULL DEFAULT 0,
    emoji_passed_count integer NOT NULL DEFAULT 0,

    qoute_played_count integer NOT NULL DEFAULT 0,
    qoute_passed_count integer NOT NULL DEFAULT 0,

    character_guess_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
    song_guess_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
    image_guess_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
    release_guess_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
    emoji_guess_distribution jsonb NOT NULL DEFAULT '{}'::jsonb,
    quote_guess_distribution jsonb NOT NULL DEFAULT '{}'::jsonb
);