-- ============================================================================
-- RLS POLICIES — public read access for game data tables
--
-- Context: rls_auto_enable() event trigger auto-enables RLS on every new
-- table (deny-by-default), but no policies were ever attached. Without a
-- SELECT policy, the client (anon key via Data API) cannot read ANY row.
--
-- Scope: SELECT-only, public (anon + authenticated). No INSERT/UPDATE/DELETE
-- policies here — writes go through SECURITY DEFINER functions or the
-- service role key, which bypass RLS entirely.
--
-- NOT covered here (intentionally locked, zero policies):
--   - support_tickets  -> service role only
--   - api_events       -> internal health log, service role only
-- ============================================================================

CREATE POLICY "Allow public read" ON public.characters
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.songs
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.song_segments
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.quotes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.releases
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.emojis
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.silhouettes
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.daily_schedule
  FOR SELECT USING (true);

CREATE POLICY "Allow public read" ON public.daily_stats
  FOR SELECT USING (true);

-- Verification query — run after applying:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename;