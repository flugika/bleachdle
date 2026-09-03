// src/lib/auth/hmac.ts
//
// The device_secret is a bearer credential. We never store it raw anywhere —
// not in the DB, not in logs. We store HMAC-SHA256(secret, SERVER_SECRET)
// and compare hashes on every request. This means a leaked DB dump does not
// hand out working credentials (attacker would need SERVER_SECRET too, which
// only lives in env vars, never in the DB).
//
// Constant-time comparison prevents timing attacks on the hash check.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function getServerSecret(): string {
    const secret = process.env.DEVICE_SECRET_HMAC_KEY;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error(
            '[hmac] DEVICE_SECRET_HMAC_KEY is not set. Refusing to start in production ' +
            'without it — device auth would be forgeable.'
        );
    }
    return secret || 'dev-only-insecure-fallback';
}

/** Generates a new random bearer secret for a device. 256 bits, base64url. */
export function generateDeviceSecret(): string {
    return randomBytes(32).toString('base64url');
}

/** Hashes a raw device_secret for storage in player_devices.device_secret_hash. */
export function hashDeviceSecret(secret: string): string {
    return createHmac('sha256', getServerSecret())
        .update(secret)
        .digest('hex');
}

/** Constant-time-safe hash of a client IP for rate-limit bucketing */
export function hashIp(ip: string): string {
    return createHmac('sha256', getServerSecret())
        .update(ip)
        .digest('hex');
}

export function verifyDeviceSecret(candidateSecret: string, storedHash: string): boolean {
    const candidateHash = hashDeviceSecret(candidateSecret);

    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(storedHash, 'hex');
    if (a.length !== b.length) return false;

    return timingSafeEqual(a, b);
}