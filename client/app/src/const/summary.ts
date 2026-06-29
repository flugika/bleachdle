import { ComparisonOutcome, MatchResult } from "@/src/features/character";

export const STATUS_COLORS: Record<MatchResult, string> = {
    correct: '#4de880',
    partial: '#e8b830',
    wrong: '#3a2828',
    higher: '#7090f0',
    lower: '#7090f0',
};

export const RESULT_KEYS: (keyof ComparisonOutcome)[] = [
    'gender', 'race', 'affiliation', 'height', 'age',
    'eyeColor', 'hairColor', 'weapon', 'primaryAbility',
    'release', 'firstAppearanceChapter'
];

export const TIERS = [
    {
        min: 196,
        kanji: "王",
        badge: "Reiō · The Soul King",
        sub: "REIATSU // THE LYNCHPIN OF EXISTENCE",
        flavor: "There is no sky here, only the void where rules are written. You have become the absolute anchor of the three worlds. Without your breath, reality itself collapses into dust.",
        color: "#ffce46", // Sovereign Reio Gold
        badgeStyles: "bg-gradient-to-r from-[#2a1e08] via-[#0a0702] to-[#2a1e08] border-[#d69e2e]/45 shadow-[0_0_30px_rgba(214,158,46,0.35)] animate-pulse duration-[4s]",
        kanjiStyles: "border-[#d69e2e]/30 bg-[#120c02]"
    },
    {
        min: 150,
        kanji: "超",
        badge: "Chōetsusha · Transcendent Being",
        sub: "REIATSU // THE DIMENSIONAL PARADOX",
        flavor: "You have evolved past the boundaries of both Shinigami and Hollow. To gaze upon your spiritual pressure is to submit to the gravitational pull of a dimension beyond reason. Lower beings cannot even feel your presence.",
        color: "#cfabf0", // Hogyoku Indigo-Violet
        badgeStyles: "bg-gradient-to-r from-[#1c0f30] via-[#0b0414] to-[#1c0f30] border-[#b794f4]/35 shadow-[0_0_20px_rgba(183,148,244,0.2)]",
        kanjiStyles: "border-[#b794f4]/25 bg-[#0d0517]"
    },
    {
        min: 120,
        kanji: "零",
        badge: "Royal Guard · Zero Division",
        sub: "REIATSU // THE FIVE HEAVENLY PILLARS",
        flavor: "If it is by our hands that the world is weighed, then let the heavens shake beneath our robes. You step upon the marrow of ancient stars to guard the inner sanctum of the throne.",
        color: "#f76c6c", // Vermilion Silk Crimson
        badgeStyles: "bg-gradient-to-r from-[#2d0808] to-[#0c0202] border-[#f56565]/30 shadow-[0_0_15px_rgba(245,101,101,0.15)]",
        kanjiStyles: "border-[#f56565]/20 bg-[#0f0303]"
    },
    {
        min: 100,
        kanji: "総",
        badge: "Captain-Commander · Gotei 13",
        sub: "REIATSU // SUPREME ABSOLUTE DECREE",
        flavor: "Do not waver. Burn the world to cinders if it means holding the law. Your shadow alone is an edict that binds the sky, and your breath carries the ashes of a thousand broken blades.",
        color: "#e99a41", // Ryujin Jakka Amber
        badgeStyles: "bg-gradient-to-r from-[#2c1305] to-[#0c0401] border-[#ed8936]/20",
        kanjiStyles: "border-[#ed8936]/20 bg-[#070502]"
    },
    {
        min: 85,
        kanji: "代",
        badge: "Shinigami Daikō · Substitute Shinigami",
        sub: "REIATSU // THE UNBOUND HYBRID REGULATION",
        flavor: "An untamed hybrid soul wielding a Bankai that terrifies the heavens. That wooden badge was never an honor—it was a seal built by the Seireitei to monitor and restrict your world-shaking potential.",
        color: "#e79d60", // Karakura Twilight Orange
        badgeStyles: "bg-gradient-to-r from-[#291103] via-[#0a0400] to-[#291103] border-[#ed8936]/40 shadow-[0_0_20px_rgba(237,137,54,0.25)] animate-pulse duration-[5s]",
        kanjiStyles: "border-[#ed8936]/20 bg-[#120701]"
    },
    {
        min: 70,
        kanji: "隊",
        badge: "Taichō · Gotei 13 Captain",
        sub: "REIATSU // SOVEREIGN BANKAI HOLDER",
        flavor: "To wear the white haori is to become the wall that stands between the world and the void. Let your Bankai shatter the illusions of the enemy and rewrite the rules of the battlefield.",
        color: "#8bb2e0", // Captain Haori White
        badgeStyles: "bg-gradient-to-r from-[#1a1c20] to-[#0d0e10] border-white/20 shadow-inner",
        kanjiStyles: "border-white/15 bg-white/5"
    },
    {
        min: 50,
        kanji: "副",
        badge: "Fukutaichō · Gotei 13 Lieutenant",
        sub: "REIATSU // DIVISION ADJUTANT SIGNATURE",
        flavor: "Walking one step behind greatness, yet carrying the sky when they fall. A shadow cannot exist without the light, but it is the shadow that protects the rear line from ultimate despair.",
        color: "#6b92be", // Traditional Ochre
        badgeStyles: "bg-[#0b0a07] border-[#ecc94b]/15",
        kanjiStyles: "border-[#ecc94b]/10 bg-[#050403]"
    },
    {
        min: 30,
        kanji: "席",
        badge: "Sekikan · Seated Officer",
        sub: "REIATSU // 3RD TO 5TH SEAT ELITE",
        flavor: "The blade is honed by blood, the mind by patience. You are no longer just a sword in the crowd; you are the razor-sharp edge trusted to command the frontline grid.",
        color: "#486b8d", // Zanpakuto Steel Blue
        badgeStyles: "bg-[#05080c] border-[#4299e1]/15",
        kanjiStyles: "border-[#4299e1]/10 bg-[#010305]"
    },
    {
        min: 20,
        kanji: "卒",
        badge: "Taisotsu · Court Guard Shinigami",
        sub: "REIATSU // SHIHAKUSHO ENLISTED STANDARDS",
        flavor: "Clad in the black robes of death, stepping over the threshold of the living world. The Zanpakuto in your hands is heavy, but your eyes have finally learned to perceive the unseen.",
        color: "#354e6b", // Shihakusho Slate
        badgeStyles: "bg-[#06080a] border-[#8a9ba8]/10",
        kanjiStyles: "border-[#8a9ba8]/10 bg-[#020304]"
    },
    {
        min: 15,
        kanji: "禍",
        badge: "Ryoka · Spirit Intruder",
        sub: "REIATSU // SEIREITEI SECURITY ANOMALY",
        flavor: "An uninvited ghost breaches the white walls of the court guards. You obey no laws of the Soul Society, carrying a volatile presence that forces the captains to draw their steel.",
        color: "#9ae6b4", // Ryoka Spirit Green
        badgeStyles: "bg-[#040a06] border-[#48bb78]/15",
        kanjiStyles: "border-[#48bb78]/15 bg-[#010402]"
    },
    {
        min: 10,
        kanji: "整",
        badge: "Plus Soul · Awakened Spirit",
        sub: "REIATSU // DENSE SPIRIT NUCLEUS",
        flavor: "The chains of fate are clinking violently against your chest. You can hunger, you can weep, and you can see the entities hiding in the neon alleys. The spiritual cycle has claimed you.",
        color: "#5c6169", // Spectral Astral Grey
        badgeStyles: "bg-[#050607] border-white/[0.02]",
        kanjiStyles: "border-white/[0.02] bg-neutral-900"
    },
    {
        min: 5,
        kanji: "人",
        badge: "Spirit-Aware Mortal",
        sub: "REIATSU // FLICKERING VEIL PERCEPTION",
        flavor: "A slight chill down your spine, a shadow that moves when you look away. You are starting to pierce the veil, catching brief glints of a world made entirely of ghosts.",
        color: "#53535a", // Zinc
        badgeStyles: "bg-[#030303] border-transparent",
        kanjiStyles: "border-transparent text-neutral-500 bg-neutral-900"
    },
    {
        min: 0,
        kanji: "凡",
        badge: "Unawakened Whole",
        sub: "REIATSU // ZERO SPIRIT DENSITY",
        flavor: "If I cannot touch your blade, I cannot protect you. You walk through the crowded streets completely blind to the ocean of souls crashing around your feet.",
        color: "#3f3f46", // Charcoal Dust
        badgeStyles: "bg-[#020202] border-transparent opacity-60",
        kanjiStyles: "border-transparent text-neutral-600 bg-black"
    }
];