// src/services/monitor/logEvent.ts
//
// Fire-and-forget telemetry for the /monitor dashboard. Never awaited by
// callers on the critical path, never throws, never blocks a response.
import { supabaseServer } from "@/src/lib/supabase/supabase-server";

export type EventLevel = "success" | "warning" | "error";

export function logApiEvent(endpoint: string, level: EventLevel, statusCode?: number, note?: string) {
    // Intentionally not awaited by callers — this must never slow down or
    // break the actual request it's reporting on.
    void supabaseServer
        .rpc("log_api_event", {
            p_endpoint: endpoint,
            p_level: level,
            p_status_code: statusCode ?? null,
            p_note: note ?? null,
        })
        .then(({ error }) => {
            if (error) console.warn(`[monitor] log_api_event failed for ${endpoint}:`, error.message);
        });
}