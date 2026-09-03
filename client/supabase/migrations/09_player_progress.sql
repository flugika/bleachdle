-- 09_player_progress.sql
--
-- Supports /api/sync/progress — mid-round guess state, mirrored across
-- devices so a second device can see where a session is without waiting for
-- finalize. Explicitly NOT part of streak/anti-cheat: nothing here feeds
-- apply_game_result(), it's read-only convenience state.
create table public.player_progress (
    player_id uuid not null references public.players(id) on delete cascade,
    game_mode text not null,
    game_type text not null check (game_type in ('daily', 'unlimited')),
    target_id text,
    guesses jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now(),
    primary key (player_id, game_mode, game_type)
);

alter table public.player_progress enable row level security;
-- deny-all, same rationale as every other player_* table: no auth.uid() to
-- anchor a public policy on, service role only via API routes.