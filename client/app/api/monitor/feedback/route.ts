// app/api/monitor/feedback/route.ts
//
// Backs the "Feedback" tab on /monitor. Same auth story as /api/monitor/health:
// proxy.ts (middleware) already gates the /monitor page itself, but this route
// can be hit directly too, so it re-checks isAuthorizedForMonitor defensively.
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase/supabase-server";
import { isAuthorizedForMonitor } from "@/src/features/admin/monitorAuth";
import { logApiEvent } from "@/src/services/monitor/logEvent";

export const runtime = "nodejs";

const ENDPOINT = "monitor.feedback";
const ALLOWED_STATUS = ["new", "seen", "resolved", "ignored"] as const;
const ALLOWED_CATEGORY = ["bug", "feedback", "suggestion", "other"] as const;

export async function GET(req: NextRequest) {
    if (!isAuthorizedForMonitor(req)) {
        return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const { searchParams } = req.nextUrl;
        const statusParam = searchParams.get("status");
        const categoryParam = searchParams.get("category");
        const limit = Number(searchParams.get("limit")) || 50;
        const offset = Number(searchParams.get("offset")) || 0;

        const status = statusParam && (ALLOWED_STATUS as readonly string[]).includes(statusParam) ? statusParam : null;
        const category = categoryParam && (ALLOWED_CATEGORY as readonly string[]).includes(categoryParam) ? categoryParam : null;

        const { data, error } = await supabaseServer.rpc("get_support_tickets", {
            p_status: status,
            p_category: category,
            p_limit: limit,
            p_offset: offset,
        });

        if (error) throw error;

        return NextResponse.json({ ok: true, ...data });
    } catch (err) {
        console.error("[/api/monitor/feedback] GET error:", err);
        logApiEvent(ENDPOINT, "error", 500, err instanceof Error ? err.message : "unknown_error");
        return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    if (!isAuthorizedForMonitor(req)) {
        return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    try {
        const body = await req.json().catch(() => null);
        const id = body?.id;
        const status = body?.status;

        if (typeof id !== "string" || !(ALLOWED_STATUS as readonly string[]).includes(status)) {
            return NextResponse.json({ ok: false, error: "Invalid id or status." }, { status: 400 });
        }

        const { data, error } = await supabaseServer.rpc("update_ticket_status", {
            p_id: id,
            p_status: status,
        });

        if (error) throw error;
        if (!data) {
            return NextResponse.json({ ok: false, error: "Ticket not found." }, { status: 404 });
        }

        logApiEvent(ENDPOINT, "success", 200, `status->${status}`);
        return NextResponse.json({ ok: true, ticket: data });
    } catch (err) {
        console.error("[/api/monitor/feedback] PATCH error:", err);
        logApiEvent(ENDPOINT, "error", 500, err instanceof Error ? err.message : "unknown_error");
        return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
    }
}