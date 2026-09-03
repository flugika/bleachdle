// src/lib/sync/roundKey.ts
//
// Single source of truth for "what identifies this round" — every
// finalizeGame() call site must derive roundKey through these helpers, not
// by hand, so the value sent to the server always matches what the server
// expects to validate against (see 003_replay_protection.sql /
// apply_game_result's p_round_key).
export function dailyRoundKey(scheduledDate: string): string {
    return scheduledDate; // already 'YYYY-MM-DD' everywhere in this codebase
}

export function unlimitedRoundKey(targetId: string): string {
    return targetId;
}