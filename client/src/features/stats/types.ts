// src/features/stats/types.ts (or wherever your shared types live)

export interface StatSummary {
    playedCount: number;
    passedCount: number;
    guessDistribution: Record<string, number>;
}

export type GameModeId =
    | "character"
    | "song"
    | "silhouette"
    | "release"
    | "emoji"
    | "quote";

export type { DailyStats, ModeStat } from "@/src/shared/ui/daily-hub/DailyStatsBar";