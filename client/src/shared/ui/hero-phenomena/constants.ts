// src/shared/ui/hero-phenomena/constants.ts

export const PHENOMENON_KEYS = ["garganta", "almighty", "kurohitsugi", "zerodivision"] as const;
export type PhenomenonKey = (typeof PHENOMENON_KEYS)[number];
export type PhenomenonPhase = "entrance" | "idle";

export const PHENOMENON_LABELS: Record<PhenomenonKey, { name: string; kanji: string; sub: string }> = {
    garganta: { name: "GARGANTA", kanji: "裂空", sub: "A tear opens between worlds" },
    almighty: { name: "ALMIGHTY", kanji: "全能", sub: "The Emperor's eyes have opened" },
    kurohitsugi: { name: "HADŌ #90 · KUROHITSUGI", kanji: "黒棺", sub: "The black coffin descends" },
    zerodivision: { name: "ZERO DIVISION", kanji: "零番隊", sub: "Five brushes complete the seal" },
};

// ----------------------------------------------------------------------------
// Entrance choreography length. Every phenomenon resolves its "opening move"
// (gate widening / rift tearing / eyes opening / ink completing the seal) by
// this mark and settles into its quiet idle loop. HeroDailyCTA imports this
// SAME constant to time its own "torn open" reveal, so the background event
// and the CTA read as one continuous moment instead of two components
// animating independently on their own clocks.
// ----------------------------------------------------------------------------
export const PHENOMENON_ENTRANCE_MS = 2800;

// ----------------------------------------------------------------------------
// One line of in-universe justification per phenomenon, printed under the
// daily play button by <PhenomenonLoreCaption>. This is what turns the CTA
// from "a button colored like the background" into "an object that was
// already part of this world before the player showed up" — the button
// IS the shard of Garganta / the eye Almighty opened / etc., not a UI
// element sitting in front of it.
// ----------------------------------------------------------------------------
export const PHENOMENON_CTA_LORE: Record<PhenomenonKey, { jp: string; en: string }> = {
    garganta: {
        jp: "現世と尸魂界を繋いだ最初の裂け目、その欠片",
        en: "a shard of the first Garganta ever torn — it still opens one gate a day",
    },
    almighty: {
        jp: "王の眼が見留めた、選ばれし一戦",
        en: "marked by the Emperor's eyes — one trial, chosen daily",
    },
    kurohitsugi: {
        jp: "黒棺に封じられし、今日の裁き",
        en: "sealed inside the black coffin until the verdict is claimed",
    },
    zerodivision: {
        jp: "五刃の筆が結んだ、今日の誓約",
        en: "bound by five brushes into a single daily vow",
    },
};