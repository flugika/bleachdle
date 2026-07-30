// src/lib/support/rateLimitCookie.ts
import crypto from "crypto";

// ดึง SECRET หรือใช้ fallback สำหรับช่วง build time ใน CI
function getSecret(): string {
    const secret = process.env.SUPPORT_COOKIE_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
            throw new Error("Missing env var: SUPPORT_COOKIE_SECRET");
        }
        return "development-or-ci-fallback-secret-key-32bytes!";
    }
    return secret;
}

function sign(payload: string): string {
    return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
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