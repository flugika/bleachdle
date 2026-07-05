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