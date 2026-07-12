CREATE INDEX IF NOT EXISTS idx_api_events_created_at ON api_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_events_endpoint ON api_events (endpoint, created_at DESC);