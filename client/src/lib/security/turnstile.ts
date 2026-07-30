// src/lib/security/turnstile.ts
const SECRET = process.env.TURNSTILE_SECRET_KEY;

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

export async function verifyTurnstileToken(
    token: string | undefined | null,
    ip: string | null
): Promise<boolean> {
    // 1. Bypass เมื่อรันในสภาพแวดล้อม Test หรือได้ Mock Token
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_DISABLE_TURNSTILE === 'true';
    if (isTestEnv || token === 'mock-test-token') {
        return true;
    }

    // 2. ย้าย Guard Check เข้ามาในฟังก์ชัน (ป้องกันปัญหากระทบตอน pnpm build)
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
        if (SECRET?.match(/^[123]x0000000000000000000000000000000AA$/)) {
            console.error('[turnstile] Dummy secret key detected in production runtime!');
            return false;
        }
    }

    if (!token) return false;

    try {
        const response = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                secret: SECRET,
                response: token,
                ...(ip ? { remoteip: ip } : {}),
            }),
            signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
        });

        if (!response.ok) {
            console.error(`[turnstile] siteverify HTTP ${response.status}`);
            return true; // fail-open
        }

        const data: TurnstileVerifyResponse = await response.json();

        if (!data.success) {
            console.warn('[turnstile] verification failed:', data['error-codes']);
        }

        return data.success === true;
    } catch (err) {
        console.error('[turnstile] verify request errored, failing open:', err);
        return true; // fail-open
    }
}