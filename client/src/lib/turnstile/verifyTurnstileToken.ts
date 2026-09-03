// src/lib/turnstile/verifyTurnstileToken.ts
//
// ⚠️ If the project already has a Turnstile verify function (used by the
// daily finalize flow's `recordDailyStat(..., turnstileToken, ...)`), reuse
// THAT instead of this one — don't run two separate verification
// implementations side by side. I don't have visibility into that file in
// this codebase, so this is a self-contained equivalent that talks to
// Cloudflare's siteverify endpoint directly. Swap the import at the two
// call sites (device/init, pair/create) if you'd rather point at your
// existing util — the call shape (`verifyTurnstileToken(token, remoteIp?)
// => Promise<boolean>`) is intentionally the obvious/standard shape so
// swapping is a one-line change.
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(token: string | undefined | null, remoteIp?: string): Promise<boolean> {
    if (!token) return false;

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
        console.error('[verifyTurnstileToken] TURNSTILE_SECRET_KEY is not set — refusing to verify');
        return false;
    }

    try {
        const body = new URLSearchParams({ secret, response: token });
        if (remoteIp) body.set('remoteip', remoteIp);

        const res = await fetch(SITEVERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
        });

        if (!res.ok) return false;
        const data = await res.json();
        return data?.success === true;
    } catch (err) {
        console.error('[verifyTurnstileToken] verification request failed:', err);
        return false;
    }
}