// src/lib/moderation/filterSoulName.ts
//
// ⚠️ This is a lightweight, best-effort filter — NOT a comprehensive
// moderation solution. soul_name is publicly visible to every player
// (StatsHubPage's "§ 03 — Soul Registry Roll" shows a public leaderboard of
// names), so SOME server-side check is better than none, but a short
// blocklist will never catch everything (leetspeak substitutions, other
// languages, creative evasion). If abuse becomes a real problem, replace
// this with a proper moderation API (e.g. a hosted profanity-detection
// service) rather than expanding this list indefinitely — word lists don't
// scale well and are easy to route around.
//
// Also strips characters that could cause rendering/display issues
// (control characters, zero-width characters used for spoofing) since
// those are a UI-integrity concern independent of profanity.

const BLOCKED_SUBSTRINGS = [
    // intentionally short and generic — expand cautiously, false positives
    // (blocking an innocent name) are also a real cost to players
    'fuck', 'shit', 'bitch', 'nigger', 'nigga', 'faggot', 'cunt', 'retard',
    'rape', 'admin', 'moderator', 'official', 'bleachdle',
];

// Zero-width / control characters sometimes used to make offensive names
// harder to filter by breaking up blocked substrings, or to visually spoof
// other players' names.
const DISALLOWED_CHARS_RE = /[\u0000-\u001F\u200B-\u200F\u202A-\u202E\uFEFF]/g;

export interface FilterResult {
    ok: boolean;
    cleaned: string;
    reason?: string;
}

export function filterSoulName(raw: string): FilterResult {
    const stripped = raw.replace(DISALLOWED_CHARS_RE, '').trim();

    if (!stripped) {
        return { ok: false, cleaned: '', reason: 'name cannot be empty' };
    }
    if (stripped.length > 40) {
        return { ok: false, cleaned: stripped, reason: 'name too long' };
    }

    const normalized = stripped.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const blocked of BLOCKED_SUBSTRINGS) {
        if (normalized.includes(blocked)) {
            return { ok: false, cleaned: stripped, reason: 'name not allowed' };
        }
    }

    return { ok: true, cleaned: stripped };
}