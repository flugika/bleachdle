CREATE TYPE song_segment_pair AS (
    song_id TEXT,
    segment_id TEXT
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_item_pair') THEN
        CREATE TYPE group_item_pair AS (
            group_id TEXT,
            item_id  TEXT
        );
    END IF;
END $$;

CREATE TYPE release_type AS ENUM ('Shikai', 'Bankai', 'Resurreccion', 'Vollstandig');