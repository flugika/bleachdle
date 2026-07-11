// src/app/stats/page.tsx
//
// ============================================================================
// Two tabs: DAILY and UNLIMITED — they pull from different localStorage keys
// and render StatsHubPage with variant="daily" | "unlimited". Daily has no
// soul registry (no login/persistent character in that mode), so those
// sections are hidden by StatsHubPage itself when variant="daily".
//
// DATA AVAILABILITY NOTE (updated):
//   - Both daily and unlimited stats now come straight from each mode's
//     STATS localStorage key (STORAGE_KEYS.<MODE>_STATS), which the guess
//     game store factories write to on finalizeGame(). Shape per store:
//       { daily?: Stats; unlimited?: Stats }
//     where Stats = { currentStreak, maxStreak, playedCount, passedCount,
//     guessDistribution }. This replaces the earlier COMPLETED-length /
//     boolean-flag approximation, which couldn't report streaks or guess
//     distribution at all.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import StatsHubPage, { ModeStat, BadgeTier } from "@/src/features/stats/components/StatsHubPage";
import { STORAGE_KEYS } from "@/src/const/localStorage"; // adjust path if STORAGE_KEYS lives elsewhere
import { SubFeatureKey } from "@/src/config/mode";

const MODE_ORDER: SubFeatureKey[] = ["character", "quote", "silhouette", "emoji", "song", "release"];

// STATS keys hold { daily?: Stats, unlimited?: Stats } written by
// createDailyGuessGameStore / createUnlimitedGuessGameStore's finalizeGame().
const MODE_TO_STATS_KEY: Record<SubFeatureKey, string> = {
    character: STORAGE_KEYS.CHARACTER_STATS,
    song: STORAGE_KEYS.SONG_STATS,
    silhouette: STORAGE_KEYS.SILHOUETTE_STATS,
    release: STORAGE_KEYS.RELEASE_STATS,
    emoji: STORAGE_KEYS.EMOJI_STATS,
    quote: STORAGE_KEYS.QOUTE_STATS, // spelled QOUTE in your STORAGE_KEYS
};

interface RawStats {
    currentStreak: number;
    maxStreak: number;
    playedCount: number;
    passedCount: number;
    guessDistribution: Record<string, number>;
}

const EMPTY_RAW_STATS: RawStats = {
    currentStreak: 0,
    maxStreak: 0,
    playedCount: 0,
    passedCount: 0,
    guessDistribution: {},
};

function readJSON<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

// Reads STORAGE_KEYS.<MODE>_STATS for every mode and maps the requested
// dimension ("daily" | "unlimited") straight onto ModeStat, including
// currentStreak/maxStreak so the hub can render them (and the streak badge).
function buildPersonal(dimension: "daily" | "unlimited"): Partial<Record<SubFeatureKey, ModeStat>> {
    const result: Partial<Record<SubFeatureKey, ModeStat>> = {};
    for (const mode of MODE_ORDER) {
        const statsData = readJSON<Partial<Record<"daily" | "unlimited", RawStats>>>(MODE_TO_STATS_KEY[mode], {});
        const s = statsData[dimension] ?? EMPTY_RAW_STATS;
        result[mode] = {
            played: s.playedCount,
            passed: s.passedCount,
            guess_distribution: s.guessDistribution ?? {},
            currentStreak: s.currentStreak,
            maxStreak: s.maxStreak,
        };
    }
    return result;
}

// Real shape confirmed from your component code:
//   bleachdle-soul-registry → { quote: { name, count }, character: { name, count }, ... }
// It's keyed PER MODE, not one global name/count — each discipline has its
// own name + cycle count. This reader surfaces BOTH the aggregate (for the
// "dedication" headline number) and the per-mode breakdown (for per-card
// badges and for exploit-resistant mastery tiers), instead of collapsing
// everything into one silently-summed figure.
//
// soulName resolution: previously "first mode in MODE_ORDER that has a name
// wins" — a silent, array-order-dependent pick with no signal to the player
// if their names diverged across modes. Now we pick the name used by the
// MOST modes (majority vote), tie-broken by MODE_ORDER position, and surface
// `nameMismatch` so the UI can flag the divergence instead of hiding it.
function readSoulRegistry(): {
    soulName: string | null;
    totalCycles: number;
    maxModeCycles: number;
    cyclesByMode: Partial<Record<SubFeatureKey, number>>;
    namesByMode: Partial<Record<SubFeatureKey, string | null>>;
    nameMismatch: boolean;
} {
    const registryData = readJSON<Partial<Record<SubFeatureKey, { name?: string; count?: number }>>>(
        STORAGE_KEYS.SOUL_REGISTRY,
        {}
    );

    const cyclesByMode: Partial<Record<SubFeatureKey, number>> = {};
    const namesByMode: Partial<Record<SubFeatureKey, string | null>> = {};
    const nameVotes = new Map<string, number>();
    let totalCycles = 0;
    let maxModeCycles = 0;

    for (const mode of MODE_ORDER) {
        const entry = registryData[mode];
        if (!entry) continue;
        const count = entry.count ?? 0;
        cyclesByMode[mode] = count;
        namesByMode[mode] = entry.name ?? null;
        totalCycles += count;
        if (count > maxModeCycles) maxModeCycles = count;
        if (entry.name) {
            nameVotes.set(entry.name, (nameVotes.get(entry.name) ?? 0) + 1);
        }
    }

    let soulName: string | null = null;
    let bestVotes = 0;
    for (const mode of MODE_ORDER) {
        const name = registryData[mode]?.name;
        if (!name) continue;
        const votes = nameVotes.get(name) ?? 0;
        if (votes > bestVotes) {
            bestVotes = votes;
            soulName = name;
        }
    }

    return { soulName, totalCycles, maxModeCycles, cyclesByMode, namesByMode, nameMismatch: nameVotes.size > 1 };
}

interface GlobalStatsResponse {
    global: Partial<Record<SubFeatureKey, ModeStat>>;
    globalTickerStats: Record<string, { played: number; passed: number; win_rate: number; avg_guesses: number | null }>;
    topSouls: { name: string; cycles: number }[];
}

const EMPTY_GLOBAL: GlobalStatsResponse = { global: {}, globalTickerStats: {}, topSouls: [] };

async function fetchGlobalStats(dimension: "daily" | "unlimited"): Promise<GlobalStatsResponse> {
    try {
        const res = await fetch(`/api/stats/global?dimension=${dimension}`, { cache: "no-store" });

        // Guard against Next's HTML 404/500 page — that's what caused the
        // "Unexpected token '<'" crash before: the route didn't exist, so
        // .json() tried to parse an HTML error page as JSON.
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.includes("application/json")) {
            console.error(`[stats] /api/stats/global returned non-JSON (status ${res.status})`);
            return EMPTY_GLOBAL;
        }

        return (await res.json()) as GlobalStatsResponse;
    } catch (err) {
        console.error("[stats] failed to load global stats", err);
        return EMPTY_GLOBAL;
    }
}

// TWO SEPARATE BADGE TRACKS — see readSoulRegistry() comment above for why.
//
// 1. "Dedication" track (buildDedicationTiers) — takes the MIN cycle count
//    across every mode (not the sum). A player who only grinds one
//    discipline and leaves the rest at 0 gets min = 0, so this track can no
//    longer be cleared by farming a single mode; it only advances once every
//    discipline has been cycled roughly evenly. Copy says so explicitly so
//    players understand why the number here isn't just "total cycles".
//
// 2. "Mastery" track (buildMasteryTiers) — keyed off the single BEST mode's
//    cycle count (max, not min/sum). This is the prestige track: it rewards
//    depth in one discipline, independent of breadth, and is intentionally
//    the track a single-mode grinder CAN complete.
//
// THRESHOLD SCALE — a single "cycle" isn't one guess, it's clearing that
// mode's ENTIRE pool (~100–200 items) without repeats before it resets. So:
//   - Mastery threshold 5  ≈ 500–1000 correct guesses in ONE discipline.
//   - Dedication threshold 1 ≈ full pool cleared in ALL SIX disciplines
//     (600–1200 guesses total, spread across every mode) — already a real
//     achievement at tier 1, so this track deliberately tops out much lower
//     than Mastery's ceiling.
const DEDICATION_TIERS = [
    { id: "dedication-1", label: "First Awakening", kanji: "初", threshold: 1 },
    { id: "dedication-2", label: "Reiatsu Rising", kanji: "覚", threshold: 2 },
    { id: "dedication-3", label: "Seated Officer", kanji: "座", threshold: 3 },
    { id: "dedication-5", label: "Central 46 Legend", kanji: "伝", threshold: 5 },
] as const;

const MASTERY_TIERS = [
    { id: "mastery-1", label: "First Awakening", kanji: "初", threshold: 1 },
    { id: "mastery-2", label: "Bankai Attained", kanji: "卍", threshold: 2 },
    { id: "mastery-5", label: "Captain Class", kanji: "隊", threshold: 5 },
    { id: "mastery-10", label: "Soul King", kanji: "王", threshold: 10 },
] as const;

// Dedication tiers are unlocked by the LOWEST cycle count among all modes —
// so "Clear N cycles" here means N in your weakest discipline, i.e. every
// mode has been played to that level, not just one.
function buildDedicationTiers(cyclesByMode: Partial<Record<SubFeatureKey, number>>): BadgeTier[] {
    const minCycles = Math.min(...MODE_ORDER.map((m) => cyclesByMode[m] ?? 0));
    return DEDICATION_TIERS.map((t) => ({
        id: t.id,
        label: t.label,
        kanji: t.kanji,
        requirementValue: String(t.threshold),
        requirementLabel: `full cycle${t.threshold > 1 ? "s" : ""} · every discipline`,
        unlocked: minCycles >= t.threshold,
    }));
}

function buildMasteryTiers(maxModeCycles: number): BadgeTier[] {
    return MASTERY_TIERS.map((t) => ({
        id: t.id,
        label: t.label,
        kanji: t.kanji,
        requirementValue: String(t.threshold),
        requirementLabel: `full cycle${t.threshold > 1 ? "s" : ""} · single discipline`,
        unlocked: maxModeCycles >= t.threshold,
    }));
}

type Tab = "daily" | "unlimited";

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
    const tabs: { id: Tab; label: string; kanji: string }[] = [
        { id: "daily", label: "DAILY", kanji: "日" },
        { id: "unlimited", label: "UNLIMITED", kanji: "無" },
    ];
    return (
        <div className="flex justify-center gap-2 py-4" style={{ borderBottom: "1px solid #2a2620" }}>
            {tabs.map((t) => {
                const isActive = t.id === active;
                return (
                    <button
                        key={t.id}
                        onClick={() => onChange(t.id)}
                        className="px-5 py-2 flex items-center gap-2 transition-colors"
                        style={{
                            border: `1px solid ${isActive ? "#e0bd7e" : "#3a352e"}`,
                            background: isActive ? "rgba(224,189,126,0.1)" : "transparent",
                            color: isActive ? "#ffe4a3" : "#a8998a",
                            fontSize: "12px",
                            letterSpacing: "0.2em",
                            cursor: "pointer",
                        }}
                    >
                        <span style={{ fontSize: "14px" }}>{t.kanji}</span>
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}

export default function StatsPage() {
    const [tab, setTab] = useState<Tab>("daily");
    const [loading, setLoading] = useState(true);
    const [soulName, setSoulName] = useState<string | null>(null);
    const [nameMismatch, setNameMismatch] = useState(false);
    const [reincarnationCount, setReincarnationCount] = useState(0);
    const [maxModeCycles, setMaxModeCycles] = useState(0);
    const [cyclesByMode, setCyclesByMode] = useState<Partial<Record<SubFeatureKey, number>>>({});
    const [disciplineRegistry, setDisciplineRegistry] = useState<
        Partial<Record<SubFeatureKey, { name: string | null; cycles: number }>>
    >({});
    const [dailyPersonal, setDailyPersonal] = useState<Partial<Record<SubFeatureKey, ModeStat>>>({});
    const [unlimitedPersonal, setUnlimitedPersonal] = useState<Partial<Record<SubFeatureKey, ModeStat>>>({});
    const [dailyGlobal, setDailyGlobal] = useState<GlobalStatsResponse>(EMPTY_GLOBAL);
    const [unlimitedGlobal, setUnlimitedGlobal] = useState<GlobalStatsResponse>(EMPTY_GLOBAL);

    // Pulls SOUL_REGISTRY out of localStorage and pushes it into all the
    // derived state (soulName, cycle counts, per-mode registry). Factored out
    // so a rename can re-run the same sync instead of duplicating it.
    const syncSoulRegistryState = () => {
        const {
            soulName: name,
            totalCycles,
            maxModeCycles: maxCycles,
            cyclesByMode: cyclesByModeResult,
            namesByMode,
            nameMismatch: mismatch,
        } = readSoulRegistry();
        setSoulName(name);
        setReincarnationCount(totalCycles);
        setMaxModeCycles(maxCycles);
        setNameMismatch(mismatch);
        setCyclesByMode(cyclesByModeResult);

        const registryByMode: Partial<Record<SubFeatureKey, { name: string | null; cycles: number }>> = {};
        for (const mode of MODE_ORDER) {
            registryByMode[mode] = { name: namesByMode[mode] ?? null, cycles: cyclesByModeResult[mode] ?? 0 };
        }
        setDisciplineRegistry(registryByMode);
        return cyclesByModeResult;
    };

    // Re-etches the name for a single discipline in SOUL_REGISTRY, then
    // re-syncs derived state (soulName majority vote, mismatch flag, etc.
    // all need to be recomputed since one mode's name just changed).
    const handleRenameDiscipline = (mode: SubFeatureKey, newName: string) => {
        if (typeof window === "undefined") return;
        const registryData = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.SOUL_REGISTRY) || "{}");
        if (!registryData[mode]) return; // nothing to rename if this mode has no entry yet
        registryData[mode] = { ...registryData[mode], name: newName };
        window.localStorage.setItem(STORAGE_KEYS.SOUL_REGISTRY, JSON.stringify(registryData));
        syncSoulRegistryState();
    };

    useEffect(() => {
        let cancelled = false;

        // Soul registry only applies to Unlimited — keyed per mode, see readSoulRegistry().
        const cyclesByMode = syncSoulRegistryState();

        setDailyPersonal(buildPersonal("daily"));
        // Merge per-mode cycle counts onto the unlimited ModeStat so the hub
        // can render a "CYCLE n" badge per discipline card, not just the
        // single combined header number.
        const unlimitedBase = buildPersonal("unlimited");
        for (const mode of MODE_ORDER) {
            const stat = unlimitedBase[mode];
            if (stat) stat.cycleCount = cyclesByMode[mode] ?? 0;
        }
        setUnlimitedPersonal(unlimitedBase);

        Promise.all([fetchGlobalStats("daily"), fetchGlobalStats("unlimited")]).then(([daily, unlimited]) => {
            if (cancelled) return;
            setDailyGlobal(daily);
            setUnlimitedGlobal(unlimited);
            setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center" style={{ background: "#050506" }}>
                <p style={{ color: "#a8998a", fontSize: "12px", letterSpacing: "0.3em" }}>OPENING ARCHIVE...</p>
            </div>
        );
    }

    const isDaily = tab === "daily";
    const activePersonal = isDaily ? dailyPersonal : unlimitedPersonal;
    const activeGlobal = isDaily ? dailyGlobal : unlimitedGlobal;

    return (
        <>
            <TabBar active={tab} onChange={setTab} />
            <StatsHubPage
                variant={tab}
                soulName={soulName}
                nameMismatch={nameMismatch}
                reincarnationCount={reincarnationCount}
                personal={activePersonal}
                global={activeGlobal.global}
                globalTickerStats={activeGlobal.globalTickerStats}
                totalCycleTiers={buildDedicationTiers(cyclesByMode)}
                masteryTiers={buildMasteryTiers(maxModeCycles)}
                disciplineRegistry={disciplineRegistry}
                onRenameDiscipline={handleRenameDiscipline}
                topSouls={activeGlobal.topSouls}
            />
        </>
    );
}