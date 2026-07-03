// src/lib/support/rateLimitCookie.ts
//
// Signed, httpOnly cookie helpers for rate limiting the support form.
// Deliberately does NOT use IP address, user-agent, or any other identifying
// data — everything needed to enforce the limit lives in a cookie scoped to
// the browser that sent it. The signature stops the client from editing the
// value; it does not stop the client from deleting the cookie outright. That
// is an accepted trade-off in exchange for not tracking anything about the
// device or network.

import crypto from "crypto";

const SECRET = process.env.SUPPORT_COOKIE_SECRET;

if (!SECRET) {
    throw new Error("Missing env var: SUPPORT_COOKIE_SECRET");
}

function sign(payload: string): string {
    return crypto.createHmac("sha256", SECRET as string).update(payload).digest("hex");
}

/** Pack a payload string into "payload.signature" for use as a cookie value. */
export function packCookie(payload: string): string {
    return `${payload}.${sign(payload)}`;
}

/** Verify and unwrap a cookie value. Returns the original payload, or null if missing/invalid. */
export function unpackCookie(raw: string | undefined): string | null {
    if (!raw) return null;

    const separatorIndex = raw.lastIndexOf(".");
    if (separatorIndex === -1) return null;

    const payload = raw.slice(0, separatorIndex);
    const signature = raw.slice(separatorIndex + 1);
    const expected = sign(payload);

    if (signature.length !== expected.length) return null;

    const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    return isValid ? payload : null;
}

/** Current UTC date as "YYYY-MM-DD", used as the rollover key for the daily counter. */
export function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}