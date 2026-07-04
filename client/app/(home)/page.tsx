// app/(home)/page.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSenkaimon } from "@/src/shared/ui/context/NavigationContext"; // 💡 ตรวจสอบ Path ให้ตรงกับโครงสร้างจริงของคุณ
import { HeaderDivider } from "@/src/shared/layout/HeaderDivider";
import SoulSyncLoader from "@/src/shared/ui/loader/SoulSyncLoader";

// ================= 📖 GAME MODE DATABASE (used by the "What is Bleachdle" section) =================
const GAME_MODES = [
    {
        id: "character",
        kanji: "士",
        accent: "#c8a96e",
        name: "CHARACTER",
        tagline: "Classic deduction",
        description:
            "Guess the character one clue at a time — race, affiliation, height, first appearance, and more. Every guess narrows the field until only one soul reiatsu signature matches.",
    },
    {
        id: "quote",
        kanji: "言",
        accent: "#c8a96e",
        name: "QUOTE",
        tagline: "Who said it?",
        description:
            "A single line of dialogue is pulled from the series. Read it, feel it out, and name the character behind the words.",
    },
    {
        id: "image",
        kanji: "像",
        accent: "#60a5fa",
        name: "IMAGE",
        tagline: "Zoom & reveal",
        description:
            "You start with an extreme close-up crop of a character. Every wrong guess pulls the camera back a little. You get 10 attempts total — after that, the full image and the answer are revealed.",
    },
    {
        id: "emoji",
        kanji: "絵",
        accent: "#60a5fa",
        name: "EMOJI",
        tagline: "Four symbols, one soul",
        description:
            "A character is encoded into four emoji. One is shown to start — each wrong guess unlocks another, up to all four. Five wrong guesses and the round ends.",
    },
    {
        id: "song",
        kanji: "曲",
        accent: "#c8a96e",
        name: "SONG",
        tagline: "Name that track",
        description:
            "Listen to a short clip from a Bleach opening, ending, or OST track — starting at just 0.2s and stretching to 1s, 3s, 5s, 10s, and 15s the longer you need. Name the track before time runs out.",
    },
    {
        id: "release",
        kanji: "解",
        accent: "#60a5fa",
        name: "RELEASE",
        tagline: "Command the blade",
        description:
            "You're given a release cue — an image of the moment, or an audio hint like the start of a Shikai incantation. Type the exact full release command to prove you know the blade.",
    },
] as const;

export default function Home() {
    const { navigate, state } = useSenkaimon();

    // ⚔️ SENKAIMON GATEWAY INTERCEPTOR (SEO & USER EXPERIENCE SAFEGUARD)
    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) {
            return;
        }
        if (state !== "idle") {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        navigate(path);
    };

    return (
        <div className="relative w-full min-h-[100vh] flex flex-col items-center justify-center overflow-hidden px-4 md:px-8 select-none mt-16">

            {/* 🌌 VISUAL LAYER 1: Cinematic Reishi Fields & Scanner Lines */}
            <div className="absolute inset-0 bleach-scanlines pointer-events-none z-10 opacity-30 select-none" />
            {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,15,28,0.95)_0%,#020204_100%)] pointer-events-none z-0" /> */}

            {/* ⚡ VISUAL LAYER 2: Ambient Reiatsu Core Eruption */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.03)_0%,transparent_70%)] pointer-events-none z-0 blur-[80px]" />

            {/* 卍解 VISUAL LAYER 3: Massive Shifting KANJI Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[38vw] font-black text-white/[0.012] pointer-events-none tracking-[0.1em] leading-none z-0 select-none font-serif select-none transition-all duration-1000 animate-pulse">
                卍解
            </div>

            {/* ================= ⚔️ HERO INTRO SECTION ⚔================= */}
            <div className="relative z-20 text-center mb-6 max-w-5xl w-full px-4 flex flex-col items-center justify-center">

                {/* HUD Top-Link Trace */}
                <div className="text-[10px] md:text-xs tracking-[0.7em] text-[#c8a96e] font-mono font-bold mb-6 flex items-center justify-center gap-3">
                    <span className="w-2 h-2 bg-[#c8a96e] animate-ping rounded" />
                    S.R.D.I_LINK // SENKAIMON_COORDINATES_STABILIZED
                </div>

                {/* Titanium Chrome Title Text */}
                {/* 🛠️ FIX: ล็อคคำด้วย `whitespace-nowrap` และปรับสเกลฟอนต์ให้สมดุล (เริ่มต้นที่ text-5xl ไล่ระดับไปจนถึง text-8xl บน PC) */}
                <h1
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.2em] pl-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-neutral-500 drop-shadow-[0_0_50px_rgba(255,255,255,0.18)] uppercase select-text whitespace-nowrap text-center block w-full"
                    style={{ fontFamily: "'Cinzel', serif" }}
                >
                    BLEACHDLE
                </h1>

                <HeaderDivider className="mt-6"/>

                {/* Subtitle Division Log — reworked with a sweeping HUD scan-light + two-tone label split */}
                <div className="relative mt-8 max-w-xl w-full mx-auto group/subtitle">
                    <span className="absolute -left-[3px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-[#c8a96e]/50 group-hover/subtitle:bg-[#c8a96e] transition-colors duration-500" />
                    <span className="absolute -right-[3px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-[#c8a96e]/50 group-hover/subtitle:bg-[#c8a96e] transition-colors duration-500" />
                    <p className="relative overflow-hidden text-[10px] md:text-xs font-mono tracking-[0.45em] uppercase border-y border-white/10 py-4 backdrop-blur-sm bg-black/20">
                        <span className="pointer-events-none absolute inset-y-0 left-[-45%] w-1/3 bg-gradient-to-r from-transparent via-[#c8a96e]/20 to-transparent skew-x-[-20deg] animate-[subtitle-scan_4.5s_ease-in-out_infinite]" />
                        <span className="relative text-[#c8a96e]/90">THOUSAND-YEAR BLOOD WAR</span>
                        <br />
                        <span className="relative text-white/40">THE SPIRITUAL DECODING INTERFACE</span>
                    </p>
                </div>
            </div>

            <SoulSyncLoader hideLabel className="mt-0 mb-0" />

            {/* ================= 🌌 DIMENSIONAL GATEWAY CHASSIS ================= */}
            <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-4 pb-12">

                {/* ☀️ CARD 1: DAILY REISHI RESONANCE (SHINIGAMI THEME) */}
                <Link
                    href="/daily"
                    onClick={(e) => handleNavigation(e, "/daily")}
                    className="relative group p-8 md:p-10 border border-white/5 bg-gradient-to-b from-[#09090e] to-[#030305] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-[#c8a96e]/40 transition-all duration-500 overflow-hidden"
                >
                    {/* Golden Reiatsu Ignition Flare */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_130%,rgba(200,169,110,0.12)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    {/* Shifting Golden Grid Edge Overlays */}
                    <div className="absolute top-0 left-0 w-8 h-[2px] bg-white/10 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute top-0 left-0 w-[2px] h-8 bg-white/10 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-white/10 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-white/10 group-hover:bg-[#c8a96e] transition-colors duration-500" />

                    {/* Subtle Crosshair Interface Vector */}
                    <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/10 group-hover:border-[#c8a96e]/40 transition-colors" />
                    <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/10 group-hover:border-[#c8a96e]/40 transition-colors" />

                    {/* Core Layout Content */}
                    <div className="flex flex-col justify-between h-full min-h-[170px] relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-mono tracking-[0.35em] text-[#c8a96e] font-bold uppercase block mb-1">
                                    PHASE_01 // DAILY_MANIFESTATION
                                </span>
                                <h2 className="text-3xl font-black tracking-[0.15em] text-white group-hover:text-[#c8a96e] group-hover:tracking-[0.18em] transition-all duration-500">
                                    DAILY
                                </h2>
                            </div>
                            <span className="text-6xl font-serif text-white/[0.02] font-black group-hover:text-[#c8a96e]/10 group-hover:scale-110 transition-all duration-700 select-none">
                                日
                            </span>
                        </div>

                        {/* ✅ Simplified copy: same tone, plain meaning */}
                        <p className="text-[12px] tracking-widest text-neutral-400 font-light group-hover:text-white leading-relaxed max-w-[90%] transition-colors duration-500">
                            One new character to guess every day. The same puzzle for everyone — come back tomorrow for the next one.
                        </p>

                        <div className="pt-5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono tracking-[0.25em] text-white/30">
                            <span className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-[#c8a96e] rounded group-hover:animate-ping" />
                                DATA_STREAM: REISHI_STABLE
                            </span>
                            <span className="group-hover:translate-x-2 group-hover:text-[#c8a96e] transition-all duration-500 font-bold">
                                INITIATE_BREACH →
                            </span>
                        </div>
                    </div>
                </Link>

                {/* 🌌 CARD 2: GARGANTA ABYSSAL VOID (QUINCY / HOLLOW THEME) */}
                <Link
                    href="/unlimited"
                    onClick={(e) => handleNavigation(e, "/unlimited")}
                    className="relative group p-8 md:p-10 border border-white/5 bg-gradient-to-b from-[#09090e] to-[#030305] shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.02)] hover:border-blue-400/40 transition-all duration-500 overflow-hidden"
                >
                    {/* Blue Quincy/Void Reiatsu Ignition Flare */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_130%,rgba(96,165,250,0.1)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    {/* Shifting Blue Grid Edge Overlays */}
                    <div className="absolute top-0 left-0 w-8 h-[2px] bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />
                    <div className="absolute top-0 left-0 w-[2px] h-8 bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />

                    {/* Subtle Crosshair Interface Vector */}
                    <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/10 group-hover:border-blue-400/40 transition-colors" />
                    <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/10 group-hover:border-blue-400/40 transition-colors" />

                    {/* Core Layout Content */}
                    <div className="flex flex-col justify-between h-full min-h-[170px] relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-mono tracking-[0.35em] text-blue-400/80 font-bold uppercase block mb-1">
                                    PHASE_02 // GARGANTA_ABYSSAL_RIFT
                                </span>
                                <h2 className="text-3xl font-black tracking-[0.15em] text-white group-hover:text-blue-400 group-hover:tracking-[0.18em] transition-all duration-500">
                                    UNLIMITED
                                </h2>
                            </div>
                            <span className="text-6xl font-serif text-white/[0.02] font-black group-hover:text-blue-400/10 group-hover:scale-110 transition-all duration-700 select-none">
                                無
                            </span>
                        </div>

                        {/* ✅ Simplified copy: same tone, plain meaning */}
                        <p className="text-[12px] tracking-widest text-neutral-400 font-light group-hover:text-white leading-relaxed max-w-[90%] transition-colors duration-500">
                            Unlimited practice. Guess as many random characters as you like, back to back, no daily limit.
                        </p>

                        <div className="pt-5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono tracking-[0.25em] text-white/30">
                            <span className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-blue-400 rounded group-hover:animate-ping" />
                                RIFT_STREAM: UNRESTRICTED_OVERFLOW
                            </span>
                            <span className="group-hover:translate-x-2 group-hover:text-blue-400 transition-all duration-500 font-bold">
                                TEAR_VOID →
                            </span>
                        </div>
                    </div>
                </Link>

            </div>

            {/* ================= 📖 ABOUT / WHAT IS BLEACHDLE SECTION ================= */}
            <div className="relative z-20 w-full max-w-5xl px-4 pb-16">
                <div className="relative border border-white/5 bg-gradient-to-b from-[#09090e] to-[#030305] p-8 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.02)] overflow-hidden">

                    {/* Corner ticks to match the gateway cards' HUD language */}
                    <div className="absolute top-0 left-0 w-8 h-[2px] bg-white/10" />
                    <div className="absolute top-0 left-0 w-[2px] h-8 bg-white/10" />
                    <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-white/10" />
                    <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-white/10" />

                    {/* Section eyebrow */}
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-[9px] font-mono tracking-[0.4em] text-[#c8a96e] font-bold uppercase">
                            DATABASE_ENTRY // 12TH_DIV_ARCHIVE
                        </span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <h3
                        className="text-2xl md:text-3xl font-black tracking-[0.12em] text-white uppercase mb-4"
                        style={{ fontFamily: "'Cinzel', serif" }}
                    >
                        What is Bleachdle?
                    </h3>

                    <p className="text-[13px] md:text-sm text-neutral-400 font-light leading-relaxed max-w-3xl mb-2">
                        Bleachdle is a fan-made guessing game built by fans, for fans. It has no official
                        connection to Tite Kubo, Shueisha, Studio Pierrot, or any Bleach publisher — just a
                        tribute project for the community.
                    </p>
                    <p className="text-[13px] md:text-sm text-neutral-400 font-light leading-relaxed max-w-3xl mb-10">
                        Six modes, six different ways to test how well you really know the Soul Society.
                    </p>

                    {/* Mode grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {GAME_MODES.map((mode) => (
                            <div
                                key={mode.id}
                                className="group/mode relative p-5 border border-white/5 bg-black/20 hover:bg-black/30 transition-colors duration-500 overflow-hidden"
                                style={{ borderColor: "rgba(255,255,255,0.05)" }}
                            >
                                <div
                                    className="absolute inset-0 opacity-0 group-hover/mode:opacity-100 transition-opacity duration-500 pointer-events-none"
                                    style={{
                                        background: `radial-gradient(circle at 50% 120%, ${mode.accent}1a 0%, transparent 60%)`,
                                    }}
                                />
                                <div className="relative z-10 flex items-start justify-between mb-3">
                                    <div>
                                        <span
                                            className="text-[9px] font-mono tracking-[0.3em] font-bold uppercase block mb-1"
                                            style={{ color: mode.accent }}
                                        >
                                            {mode.tagline}
                                        </span>
                                        <h4 className="text-lg font-black tracking-[0.12em] text-white">
                                            {mode.name}
                                        </h4>
                                    </div>
                                    <span
                                        className="text-3xl font-serif font-black select-none opacity-[0.08] group-hover/mode:opacity-20 transition-opacity duration-500"
                                        style={{ color: mode.accent }}
                                    >
                                        {mode.kanji}
                                    </span>
                                </div>
                                <p className="relative z-10 text-[11.5px] leading-relaxed text-neutral-500 group-hover/mode:text-neutral-300 transition-colors duration-500">
                                    {mode.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ================= 🛰️ FOOTER RADAR HUD DECORATION ================= */}
            <div className="absolute bottom-6 left-8 right-8 z-20 flex justify-between items-center text-[9px] font-mono tracking-[0.4em] text-white/10 hidden lg:flex pointer-events-none select-none">
                <div className="flex items-center gap-3">
                    <span className="w-1 h-1 bg-white/20 rounded-full animate-pulse" />
                    SYS_LOC: // SEIREITEI_CENTRAL_COMM_CENTER
                </div>
                <div>AUTHENTICATION_KEY: STATUS_VERIFIED_BY_12TH_DIV</div>
            </div>
        </div>
    );
}