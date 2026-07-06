// src/lib/security/turnstile.ts

interface TurnstileVerifyResponse {
    success: boolean;
    'error-codes'?: string[];
    challenge_ts?: string;
    hostname?: string;
    action?: string;
    cdata?: string;
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const VERIFY_TIMEOUT_MS = 5000;

/**
 * Verifies a Cloudflare Turnstile token server-side.
 *
 * Design notes:
 * - fail-CLOSED when the token itself is invalid/expired (data.success === false)
 *   → this is a real signal that the client didn't pass the challenge.
 * - fail-OPEN when *our* verification request errors out (network error, timeout,
 *   Cloudflare outage) → this endpoint only feeds aggregate daily_stats, so we'd
 *   rather let a legit player's stat through than block everyone because a
 *   third-party dependency hiccuped. Re-evaluate this tradeoff if this util is
 *   ever reused for something higher-stakes.
 */
export async function verifyTurnstileToken(
    token: string | undefined | null,
    ip: string | null
): Promise<boolean> {
    if (!token) return false;

    try {
        const response = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: token,
                ...(ip ? { remoteip: ip } : {}),
            }),
            signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
        });

        if (!response.ok) {
            console.error(`[turnstile] siteverify HTTP ${response.status}`);
            // Cloudflare itself errored (5xx/4xx from their side) — not a token problem.
            return true; // fail-open
        }

        const data: TurnstileVerifyResponse = await response.json();

        if (!data.success) {
            console.warn('[turnstile] verification failed:', data['error-codes']);
        }

        return data.success === true;
    } catch (err) {
        // Network error, timeout, DNS failure, etc. — our infra/Cloudflare's, not the user's fault.
        console.error('[turnstile] verify request errored, failing open:', err);
        return true; // fail-open
    }
}