-- ============================================================================
-- SUPPORT TICKETS — Bleach Reiatsu Support Desk
-- Place this file under supabase/migrations/ and run via `supabase db push`,
-- or paste directly into the Supabase Dashboard SQL Editor.
--
-- Privacy note: this schema intentionally captures NO IP address and NO
-- user-agent. Spam protection is handled entirely at the API layer via
-- signed httpOnly cookies — see src/app/api/support/route.ts and
-- src/lib/support/rateLimitCookie.ts.
-- ============================================================================

create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  category    text not null check (category in ('bug', 'feedback', 'suggestion', 'other')),
  message     text not null check (char_length(message) between 10 and 1000),

  -- Random UUID generated client-side and stored in localStorage.
  -- Not personally identifying — just lets you spot repeat submissions
  -- from the same browser if you're triaging tickets later.
  client_ref  text,

  status      text not null default 'new' check (status in ('new', 'seen', 'resolved', 'ignored'))
);

create index if not exists support_tickets_status_idx
  on public.support_tickets (status);

-- Row Level Security is enabled with NO policies attached, on purpose.
-- Result: anon and authenticated keys are fully blocked from reading or
-- writing this table. Only the Service Role Key (used server-side inside
-- the API route) can bypass RLS. End users can never insert here directly
-- from the browser — every write goes through /api/support.
alter table public.support_tickets enable row level security;

comment on table public.support_tickets is
  'Feedback/bug reports from /support. Writable only via the service role (API route). No IP or user-agent is stored anywhere in this table.';

CREATE OR REPLACE FUNCTION get_support_tickets(
    p_status   TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_limit    INT DEFAULT 50,
    p_offset   INT DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
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
 
-- ----------------------------------------------------------------------------
-- update_ticket_status
--   Simple, validated status transition. Returns the updated row (or NULL
--   if no ticket matched the id) so the client can optimistically reconcile.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_ticket_status(
    p_id     UUID,
    p_status TEXT
)
RETURNS jsonb
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