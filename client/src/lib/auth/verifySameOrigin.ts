// src/lib/auth/verifySameOrigin.ts
//
// Defense-in-depth on top of SameSite=Lax cookies (which already block
// cross-site fetch() POST/DELETE from sending our cookies in the first
// place — this is not the primary defense, it's a second layer for state-
// changing routes in case a browser's SameSite handling is ever weaker
// than expected, or a future change accidentally loosens cookie options).
//
// Checks the Origin header (sent by browsers on same-origin fetch/XHR
// requests) against the request's own host. Falls back to checking
// Referer if Origin is absent (some older/edge-case requests omit Origin
// but include Referer). If neither header is present at all, we allow the
// request through rather than block it — some legitimate same-origin
// requests (e.g. certain redirects, some non-browser tooling used for
// local dev/testing) don't always send these headers, and SameSite=Lax is
// already doing the real work; this check exists to catch obviously
// cross-origin attempts, not to be a hard gate that breaks edge cases.
import { NextRequest } from 'next/server';

export function verifySameOrigin(req: NextRequest): boolean {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    if (!host) return true; // can't check, don't block

    const candidate = origin || referer;
    if (!candidate) return true; // neither header present — allow, see note above

    try {
        const candidateHost = new URL(candidate).host;
        return candidateHost === host;
    } catch {
        return false; // malformed header — treat as suspicious, block
    }
}