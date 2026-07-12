// src/features/admin/monitorAuth.ts
//
// The monitor dashboard exposes internal request-volume/error data — keep it
// behind a shared secret rather than making it public. Set MONITOR_SECRET in
// your env, then visit /monitor?key=... once; the page stores it in a cookie
// so you don't have to keep pasting it.
import { NextRequest } from "next/server";

const COOKIE_NAME = "mntr_key";

export function isAuthorizedForMonitor(req: NextRequest): boolean {
    const secret = process.env.MONITOR_SECRET;
    if (!secret) return process.env.NODE_ENV !== "production"; // open only in local dev if unset

    const fromQuery = req.nextUrl.searchParams.get("key");
    const fromCookie = req.cookies.get(COOKIE_NAME)?.value;
    const fromHeader = req.headers.get("x-monitor-key");

    return fromQuery === secret || fromCookie === secret || fromHeader === secret;
}

export const MONITOR_COOKIE_NAME = COOKIE_NAME;