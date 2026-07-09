// app/(home)/HomePageClient.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSenkaimon } from "@/src/shared/ui/context/NavigationContext";
import { HeaderDivider } from "@/src/shared/ui/layout/HeaderDivider";
import SoulSyncLoader from "@/src/shared/ui/loader/SoulSyncLoader";
import { ModeSelectorModal, GameMode } from "@/src/shared/ui/game-selector/ModeSelectorModal";
import { MODE_ACCENT } from "@/src/config/mode";
import { HeroDailyCTA } from "@/src/shared/ui/daily-hub/HeroDailyCTA";

// ================= 📖 GAME MODE DATABASE =================
// Accent colors now pull from MODE_ACCENT (mode-accents.ts) so every place this
// mode shows up — this grid, DailyStatsBar, the mode selector modal — agrees on
// the same identity color instead of each spot picking its own gold/blue guess.
const GAME_MODES = [
    {
        id: "character",
        kanji: "士",
        accent: MODE_ACCENT.character.base,
        name: "CHARACTER",
        tagline: "Classic deduction",
        description: "Guess the character one clue at a time — race, affiliation, height, first appearance, and more.",
    },
    {
        id: "quote",
        kanji: "言",
        accent: MODE_ACCENT.quote.base,
        name: "QUOTE",
        tagline: "Who said it?",
        description: "A single line of dialogue is pulled from the series. Read it, feel it out, and name the character.",
    },
    {
        id: "silhouette",
        kanji: "像",
        accent: MODE_ACCENT.silhouette.base,
        name: "SILHOUETTE",
        tagline: "Shadows don't lie",
        description: "The character's silhouette is locked behind a grid of panels. Every wrong guess randomly shatters a tile, exposing another piece of the shadow.",
    },
    {
        id: "emoji",
        kanji: "絵",
        accent: MODE_ACCENT.emoji.base,
        name: "EMOJI",
        tagline: "Four symbols, one soul",
        description: "A character is encoded into four emoji. One is shown to start — each wrong guess unlocks another.",
    },
    {
        id: "song",
        kanji: "曲",
        accent: MODE_ACCENT.song.base,
        name: "SONG",
        tagline: "Name that track",
        description: "Listen to a short clip from a Bleach opening, ending, or OST track. Name the track before time runs out.",
    },
    {
        id: "release",
        kanji: "解",
        accent: MODE_ACCENT.release.base,
        name: "RELEASE",
        tagline: "Command the blade",
        description: "Listen to a short audio clip of a release command. Search by technique name or its English meaning to guess the correct blade.",
    },
];

// ================= ✨ AMBIENT REISHI PARTICLES =================
// Fixed values (no Math.random at render time) so server/client markup always match.
const PARTICLES = [
    { left: 3, delay: 0, duration: 17, size: 2 },
    { left: 9, delay: 4, duration: 21, size: 3 },
    { left: 16, delay: 8, duration: 15, size: 2 },
    { left: 24, delay: 1.5, duration: 19, size: 2 },
    { left: 33, delay: 11, duration: 16, size: 3 },
    { left: 41, delay: 5.5, duration: 22, size: 2 },
    { left: 49, delay: 2, duration: 18, size: 2 },
    { left: 57, delay: 9.5, duration: 20, size: 3 },
    { left: 64, delay: 6, duration: 17, size: 2 },
    { left: 71, delay: 0.8, duration: 19, size: 2 },
    { left: 79, delay: 7.2, duration: 16, size: 3 },
    { left: 86, delay: 3.4, duration: 21, size: 2 },
    { left: 13, delay: 12.5, duration: 18, size: 2 },
    { left: 46, delay: 14, duration: 20, size: 2 },
    { left: 68, delay: 10.2, duration: 17, size: 3 },
    { left: 93, delay: 6.8, duration: 19, size: 2 },
];

interface HomePageClientProps {
    initialStats: Record<string, any>;
}

export default function HomePageClient({ initialStats }: HomePageClientProps) {
    const { navigate, state } = useSenkaimon();
    const [isMounted, setIsMounted] = useState(false);

    // 🛡️ State Management สำหรับ Interactive Flow
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedGameSubFeature, setSelectedGameSubFeature] = useState<string | null>(null);

    // 🎯 Ambient glow parallax — tracked via ref so it doesn't trigger re-renders
    const glowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        const handleMove = (e: MouseEvent) => {
            if (!glowRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;
            glowRef.current.style.transform = `translate(-50%, -50%) translate(${x * 26}px, ${y * 26}px)`;
        };
        window.addEventListener("mousemove", handleMove);
        return () => window.removeEventListener("mousemove", handleMove);
    }, []);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // กันชนกับ input field และตอน modal เปิดอยู่
            const activeTag = document.activeElement?.tagName;
            if (e.key === "Enter" && !isModalOpen && activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
                navigate("/daily");
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isModalOpen, navigate]);

    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
        if (state !== "idle") {
            e.preventDefault();
            return;
        }
        e.preventDefault();
        navigate(path);
    };

    // 🎯 Handler เมื่อคลิกเลือกเกมใน Database Section
    const handleSubFeatureClick = (subFeatureId: string) => {
        setSelectedGameSubFeature(subFeatureId);
        setIsModalOpen(true);
    };

    // 🚀 Handler เมื่อ Modal โยนค่ากลับมาว่าเลือก Daily หรือ Unlimited
    const handleModeSelection = (baseMode: GameMode) => {
        setIsModalOpen(false); // ปิด Modal
        if (selectedGameSubFeature) {
            // ถ้ายิงมาจาก Database Section ให้ต่อ Path: e.g. /daily/character
            navigate(`/${baseMode}/${selectedGameSubFeature}`);
        } else {
            // เผื่อมีกรณีที่ไม่ได้เลือก SubFeature (Fallback)
            navigate(`/${baseMode}`);
        }
        // ล้าง State ป้องกัน Bug ในอนาคต
        setTimeout(() => setSelectedGameSubFeature(null), 300);
    };

    return (
        <div className="relative w-full min-h-[100vh] flex flex-col items-center justify-center overflow-hidden px-4 md:px-8 select-none pt-16">
            {/* ================= 🛰️ FIXED HUD FRAME (desktop only, ambient chrome) ================= */}
            {/* Incantation rings — tighter + independently paced vs. the ambient background rings */}
            <svg
                className="absolute -top-179 w-[560px] h-[560px] md:w-[1080px] md:h-[1080px] pointer-events-none z-0 opacity-40 group-hover/seal:opacity-70 transition-opacity duration-700"
                viewBox="0 0 200 200"
                aria-hidden="true"
            >
                <circle cx="100" cy="100" r="94" fill="none" stroke="#c8a96e" strokeWidth="0.35" strokeDasharray="0.6 3.2" className="origin-center bd-anim" style={{ animation: "bd-seal-spin 22s linear infinite", transformBox: "fill-box" }} />
                <circle cx="100" cy="100" r="82" fill="none" stroke="#c8a96e" strokeWidth="0.6" strokeDasharray="12 5" className="origin-center bd-anim" style={{ animation: "bd-seal-spin-rev 34s linear infinite", transformBox: "fill-box" }} />
                <circle cx="100" cy="100" r="70" fill="none" stroke="#f5ebd5" strokeWidth="0.3" strokeDasharray="1 2" className="origin-center bd-anim" style={{ animation: "bd-seal-spin 48s linear infinite", transformBox: "fill-box" }} />
                {/* kido tick marks — longer every 4th tick, like a sealing-spell dial */}
                {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i / 24) * 360;
                    const major = i % 4 === 0;
                    return (
                        <line
                            key={i}
                            x1="100" y1="4" x2="100" y2={major ? "14" : "9"}
                            stroke="#c8a96e"
                            strokeWidth={major ? 0.9 : 0.4}
                            opacity={major ? 0.8 : 0.4}
                            transform={`rotate(${angle} 100 100)`}
                        />
                    );
                })}
            </svg>
            <div className="fixed top-3.5 left-7 z-30 hidden lg:flex items-center gap-2 text-[9px] font-mono tracking-[0.3em] text-[#c8a96e]/50 pointer-events-none">
                <span className="w-6 h-px bg-[#c8a96e]/50" /> SYS.ONLINE
            </div>
            <div className="fixed top-3.5 right-7 z-30 hidden lg:flex items-center gap-2 text-[9px] font-mono tracking-[0.3em] text-[#c8a96e]/50 pointer-events-none">
                SENKAIMON.GATE <span className="w-6 h-px bg-[#c8a96e]/50" />
            </div>
            <div className="fixed bottom-3.5 left-7 z-30 hidden lg:block text-[9px] font-mono tracking-[0.3em] text-white/30 pointer-events-none">
                LAT_35.68 // LON_139.69
            </div>
            <div className="fixed bottom-3.5 right-7 z-30 hidden lg:block text-[9px] font-mono tracking-[0.3em] text-white/30 pointer-events-none">
                REIATSU.LINK // STABLE
            </div>

            {/* ================= 🌌 AMBIENT GLOW (mouse-parallax) ================= */}
            <div
                ref={glowRef}
                className={`absolute top-1/2 left-1/2 w-[130vw] h-[130vh] bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.28)_0%,transparent_60%)] pointer-events-none z-0 blur-[110px] transition-opacity duration-[2000ms] ease-in-out will-change-transform ${isMounted ? "opacity-100" : "opacity-0"}`}
                style={{ transform: "translate(-50%, -50%)" }}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.2)_0%,transparent_30%)] bd-anim" style={{ animation: "bd-aura 5s ease-in-out infinite" }} />
            </div>

            {/* Giant kanji watermark */}
            <div className="absolute top-1/2 left-1/2 text-center -translate-x-1/2 -translate-y-1/2 text-[38vw] font-black text-white/[0.02] pointer-events-none tracking-[0.1em] leading-none z-0 select-none transition-all duration-1000 animate-pulse">
                卍解
            </div>

            {/* Scanning sweep line */}
            <div
                className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#c8a96e]/10 to-transparent pointer-events-none z-0 bd-anim"
                style={{ animation: "bd-scan 9s ease-in-out infinite" }}
            />

            {/* Floating reishi particles */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {PARTICLES.map((p, i) => (
                    <span
                        key={i}
                        className="absolute bottom-0 rounded-full bg-[#c8a96e] bd-anim"
                        style={{
                            left: `${p.left}%`,
                            width: p.size,
                            height: p.size,
                            opacity: 0,
                            animation: `bd-float ${p.duration}s ease-in infinite`,
                            animationDelay: `${p.delay}s`,
                            boxShadow: "0 0 6px rgba(200,169,110,0.8)",
                        }}
                    />
                ))}
            </div>

            {/* ================= 🎴 HERO INTRO SECTION ================= */}
            <div className="relative z-20 text-center mb-6 max-w-5xl w-full px-4 flex flex-col items-center justify-center">
                <div className="text-[9px] md:text-xs tracking-[0.7em] text-[#c8a96e] font-mono font-bold mb-6 flex flex-col md:flex-row items-center justify-center gap-3">
                    <div className="flex items-center gap-3">
                        <span className="w-1 h-1 md:w-2 md:h-2 bg-[#c8a96e] animate-ping rounded shrink-0" />
                        <span>S.R.D.I_LINK</span>
                    </div>
                    <span className="hidden md:inline">//</span>
                    <span>SENKAIMON_COORDINATES_STABILIZED</span>
                </div>

                <div className="relative w-full">
                    {/* glow duplicate sits behind the real title for depth */}
                    <h1
                        className="relative text-3xl min-[400px]:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[0.2em] pl-[0.2em] text-transparent bg-gradient-to-r from-[#c8a96e] via-[#f5ebd5] to-[#c8a96e] bg-clip-text drop-shadow-[0_0_60px_rgba(255,255,255,0.2)] select-text whitespace-nowrap text-center block w-full"
                        style={{ animation: "bd-flicker 1.7s ease-out" }}
                    >
                        BLEACHDLE
                    </h1>
                </div>

                <HeaderDivider className="mt-6" />

                <div className="relative mt-8 max-w-xl w-full mx-auto group/subtitle">
                    <span className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-[#c8a96e]/50 group-hover/subtitle:bg-[#c8a96e] transition-colors duration-500" />
                    <span className="absolute -right-[5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-[#c8a96e]/50 group-hover/subtitle:bg-[#c8a96e] transition-colors duration-500" />
                    <p className="relative overflow-hidden text-[10px] sm:text-[13px] md:text-sm font-mono tracking-[0.45em] uppercase border-y border-white/10 py-5 backdrop-blur-sm bg-black/20">
                        <span className="pointer-events-none absolute inset-y-0 left-[-45%] w-1/3 bg-gradient-to-r from-transparent via-[#c8a96e]/20 to-transparent skew-x-[-20deg] animate-[subtitle-scan_4.5s_ease-in-out_infinite]" />
                        <span className="relative text-[#c8a96e]/90">THOUSAND-YEAR BLOOD WAR</span>
                        <br />
                        <span className="relative text-white/40">THE SPIRITUAL DECODING INTERFACE</span>
                    </p>
                </div>
            </div>

            {/* ================= ⛩️ SPIRITUAL RELEASE SEAL (primary CTA) =================
                A kido incantation circle wrapping the daily CTA: rotating rune rings,
                rising embers, a breathing gold aura and a double-bordered "sealed blade"
                button. Everything reuses the page's existing bd-* animation vocabulary
                so it reads as part of the same world instead of a bolted-on widget. */}
            <div className="relative z-20 flex flex-col items-center gap-4 w-full max-w-md px-4 mb-10 md:mb-12 group/seal">
                {/* Faint bankai kanji, glowing softly at the seal's core */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl md:text-9xl font-black text-[#c8a96e]/[0.05] select-none pointer-events-none z-0 bd-anim"
                    style={{ animation: "bd-rune-fade 6s ease-in-out infinite" }}
                    aria-hidden="true"
                >
                    卍
                </div>

                <HeroDailyCTA handleNavigation={(e: any, path) => handleNavigation(e, path)} initialStats={initialStats} />
            </div>

            {/* ================= ⚖️ MODE HIERARCHY: DAILY (featured) + UNLIMITED (secondary) =================
                Same two destinations as before, kept intact — just re-weighted so a first-time
                visitor's eye lands on DAILY first (bigger, brighter, ribboned, ahead in reading order)
                while UNLIMITED stays fully present and still lights up beautifully on hover. */}
            {/* <div className="relative z-20 grid grid-cols-1 lg:grid-cols-5 gap-6 w-full max-w-5xl px-4 pb-12 mt-10 items-stretch">

                <Link
                    href="/daily"
                    onClick={(e) => handleNavigation(e, "/daily")}
                    className="lg:col-span-3 relative group p-8 md:p-12 pt-10 md:pt-12 border border-[#c8a96e]/20 bg-gradient-to-b from-[#0d0b06] to-[#030305] shadow-[0_25px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.03)] hover:border-[#c8a96e]/60 hover:-translate-y-1 transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a96e]"
                >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,169,110,0.18)_0%,transparent_65%)] opacity-70 group-hover:opacity-100 transition-opacity duration-700 bd-anim"
                            style={{ animation: "bd-aura 4s ease-in-out infinite" }}
                        />
                    </div>

                    <div className="absolute top-0 left-8 -translate-y-1/2 z-20">
                        <span className="inline-flex items-center gap-1.5 bg-[#c8a96e] text-black text-[9px] font-mono font-bold tracking-[0.25em] uppercase px-3 py-1 shadow-[0_4px_20px_rgba(200,169,110,0.5)]">
                            <span className="w-1 h-1 bg-black rounded-full animate-pulse" /> Start here
                        </span>
                    </div>

                    <div className="absolute top-0 left-0 w-10 h-[4px] bg-[#c8a96e]/50 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute top-0 left-0 w-[4px] h-10 bg-[#c8a96e]/50 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-10 h-[4px] bg-[#c8a96e]/50 group-hover:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-[4px] h-10 bg-[#c8a96e]/50 group-hover:bg-[#c8a96e] transition-colors duration-500" />

                    <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-[#c8a96e]/30 group-hover:border-[#c8a96e]/70 transition-colors" />
                    <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-[#c8a96e]/30 group-hover:border-[#c8a96e]/70 transition-colors" />

                    <div className="flex flex-col justify-between h-full min-h-[230px] md:min-h-[270px] relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[11px] font-mono tracking-[0.35em] text-[#c8a96e] font-bold uppercase block mb-2">
                                    PHASE_01 // DAILY_MANIFESTATION
                                </span>
                                <h2 className="text-4xl md:text-5xl font-black tracking-[0.15em] text-white group-hover:text-[#c8a96e] group-hover:tracking-[0.18em] transition-all duration-500">
                                    DAILY
                                </h2>
                            </div>
                            <span className="text-7xl md:text-8xl text-[#c8a96e]/[0.06] font-black group-hover:text-[#c8a96e]/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 select-none">
                                日
                            </span>
                        </div>

                        <p className="text-[13px] md:text-sm tracking-widest text-neutral-400 font-light group-hover:text-white leading-relaxed max-w-[95%] transition-colors duration-500">
                            One new character to guess every day. The same puzzle for everyone — come back tomorrow for the next one.
                        </p>

                        <div className="pt-5 border-t border-[#c8a96e]/10 flex items-center justify-between text-[9px] font-mono tracking-[0.25em] text-white/40">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#c8a96e] rounded group-hover:animate-ping" />
                                DATA_STREAM: REISHI_STABLE
                            </span>
                            <span className="group-hover:translate-x-2 group-hover:text-[#c8a96e] transition-all duration-500 font-bold text-[10px]">
                                INITIATE_BREACH →
                            </span>
                        </div>
                    </div>
                </Link>

                <Link
                    href="/unlimited"
                    onClick={(e) => handleNavigation(e, "/unlimited")}
                    className="lg:col-span-2 relative group p-6 md:p-8 border border-white/5 bg-gradient-to-b from-[#08080b] to-[#030305] shadow-[0_15px_40px_rgba(0,0,0,0.7)] hover:border-blue-400/40 hover:-translate-y-1 transition-all duration-500 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_130%,rgba(96,165,250,0.12)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="absolute top-0 left-0 w-6 h-[3px] bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />
                    <div className="absolute top-0 left-0 w-[3px] h-6 bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-6 h-[3px] bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-[3px] h-6 bg-white/10 group-hover:bg-blue-400 transition-colors duration-500" />

                    <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-white/10 group-hover:border-blue-400/40 transition-colors" />
                    <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-white/10 group-hover:border-blue-400/40 transition-colors" />

                    <div className="flex flex-col justify-between h-full min-h-[190px] md:min-h-[270px] relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-[9px] font-mono tracking-[0.3em] text-neutral-500 group-hover:text-blue-400/80 font-bold uppercase block mb-1 transition-colors duration-500">
                                    PHASE_02 // GARGANTA_RIFT
                                </span>
                                <h2 className="text-2xl md:text-3xl font-black tracking-[0.12em] text-neutral-400 group-hover:text-blue-400 group-hover:tracking-[0.15em] transition-all duration-500">
                                    UNLIMITED
                                </h2>
                            </div>
                            <span className="text-5xl md:text-6xl text-white/[0.02] font-black group-hover:text-blue-400/10 group-hover:scale-110 transition-all duration-700 select-none">
                                無
                            </span>
                        </div>

                        <p className="text-[11.5px] tracking-widest text-neutral-500 font-light group-hover:text-neutral-200 leading-relaxed transition-colors duration-500">
                            Unlimited practice. Guess as many random characters as you like — back to back, no daily limit.
                        </p>

                        <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[9px] font-mono tracking-[0.2em] text-white/20">
                            <span className="flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-blue-400/60 rounded group-hover:animate-ping" />
                                UNRESTRICTED_OVERFLOW
                            </span>
                            <span className="group-hover:translate-x-2 group-hover:text-blue-400 transition-all duration-500 font-bold">
                                TEAR_VOID →
                            </span>
                        </div>
                    </div>
                </Link>

            </div> */}

            {/* ================= 🔄 SYNC STATUS STRIP =================
                Reuses the HeaderDivider vocabulary (gradient line + diamond
                node) but the flanking lines are pinned to the circle's own
                vertical center, so the ring reads as the divider's centerpiece
                — a sightline running through it — rather than a spinner
                floating alone in empty space between two sections. */}
            <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-4 mb-10 md:mb-12">
                <span
                    className="text-[8px] md:text-[9px] font-mono tracking-[0.4em] uppercase text-[#c8a96e]/40 mb-4"
                    aria-hidden="true"
                >
                    霊魂同期 // soul sync
                </span>

                <div className="relative w-full flex items-center justify-center">
                    {/* Decorative gate rings — centered exactly on the circle below,
                        not on some distant ancestor, so the two ring motifs read as
                        one deliberate emblem instead of two unrelated overlays. */}
                    <svg
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] max-h-[320px] md:max-w-[400px] md:max-h-[400px] pointer-events-none z-0 opacity-[0.35]"
                        viewBox="0 0 200 200"
                        aria-hidden="true"
                    >
                        <circle cx="100" cy="100" r="92" fill="none" stroke="#c8a96e" strokeWidth="0.5" strokeDasharray="2 6" className="origin-center bd-anim" style={{ animation: "bd-ring 70s linear infinite", transformBox: "fill-box" }} />
                        <circle cx="100" cy="100" r="76" fill="none" stroke="#c8a96e" strokeWidth="0.4" strokeDasharray="1 5" className="origin-center bd-anim" style={{ animation: "bd-ring-rev 46s linear infinite", transformBox: "fill-box" }} />
                    </svg>

                    {/* Sightline running through the circle's vertical center */}
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center gap-3 px-2" aria-hidden="true">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/50 to-[#c8a96e]/25" />
                        <div className="w-1.5 h-1.5 rotate-45 border border-[#c8a96e]/60 bg-[#c8a96e]/20 flex-shrink-0" />
                        <div className="w-28 flex-shrink-0" />
                        <div className="w-1.5 h-1.5 rotate-45 border border-[#c8a96e]/60 bg-[#c8a96e]/20 flex-shrink-0" />
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/50 to-[#c8a96e]/25" />
                    </div>

                    <SoulSyncLoader hideLabel className="relative z-10 mt-0" />
                </div>

                <span
                    className="text-[8px] md:text-[9px] font-mono tracking-[0.35em] uppercase text-[#c8a96e]/25 mt-4"
                    aria-hidden="true"
                >
                    卍　central46 // reiatsu link stable　卍
                </span>
            </div>

            {/* ================= 📖 ABOUT / WHAT IS BLEACHDLE SECTION ================= */}
            <div className="relative z-20 w-full max-w-5xl px-4 pb-16 group/main">
                {/* 📦 Main Outer Container Panel — (ถอด overflow-hidden ออกเพื่อให้ Badge ล้นได้อิสระ) */}
                <div className="relative border border-[#c8a96e]/20 bg-gradient-to-b from-[#0d0b06] to-[#030305] p-6 sm:p-8 md:p-12 shadow-[0_25px_70px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.03)] transition-all duration-500 hover:border-[#c8a96e]/40">

                    {/* ✨ Isolate Background Aura Layer — ย้าย overflow-hidden มาไว้ตรงนี้เพื่อคุมเฉพาะแสงฟลักซ์ไม่ให้ทะลักออกนอกจอ */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                        <div
                            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(200,169,110,0.15)_0%,transparent_65%)] opacity-70 group-hover/main:opacity-100 transition-opacity duration-700 bd-anim"
                            style={{ animation: "bd-aura 4s ease-in-out infinite" }}
                        />
                    </div>

                    {/* 🔖 Floating Header Badge — ปลดปล่อยขีดจำกัด! ลอยพ้นขอบบนได้เต็มตัวแล้ว */}
                    <div className="absolute top-0 left-4 md:left-8 -translate-y-1/2 z-20">
                        <span className="inline-flex items-center gap-1.5 bg-[#c8a96e] text-black text-[9px] font-mono font-bold tracking-[0.25em] uppercase px-3 py-1 shadow-[0_4px_20px_rgba(200,169,110,0.4)]">
                            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse" /> CORE_DATABASE
                        </span>
                    </div>

                    {/* 📐 Heavy Outer Brackets (กรอบเหลี่ยมหนา 4 ทิศทาง) */}
                    <div className="absolute top-0 left-0 w-10 h-[4px] bg-[#c8a96e]/40 group-hover/main:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute top-0 left-0 w-[4px] h-10 bg-[#c8a96e]/40 group-hover/main:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-10 h-[4px] bg-[#c8a96e]/40 group-hover/main:bg-[#c8a96e] transition-colors duration-500" />
                    <div className="absolute bottom-0 right-0 w-[4px] h-10 bg-[#c8a96e]/40 group-hover/main:bg-[#c8a96e] transition-colors duration-500" />

                    {/* 🔬 Fine Inner Micro Brackets (กรอบมุมบางด้านในเสริมดีเทลชั้นสูง) */}
                    <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-[#c8a96e]/20 group-hover/main:border-[#c8a96e]/60 transition-colors" />
                    <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-[#c8a96e]/20 group-hover/main:border-[#c8a96e]/60 transition-colors" />

                    {/* HEADER INFORMATION BLOCK */}
                    <div className="relative z-10 flex items-center gap-4 mb-6">
                        <span className="text-[11px] font-mono tracking-[0.4em] text-[#c8a96e] font-bold uppercase">
                            DATABASE_ENTRY // 12TH_DIV_ARCHIVE
                        </span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <h3 className="relative z-10 text-3xl md:text-4xl font-black tracking-[0.12em] text-white uppercase mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
                        What is Bleachdle?
                    </h3>

                    <p className="relative z-10 text-[13px] sm:text-sm text-neutral-400 font-light leading-relaxed max-w-4xl mb-4">
                        Welcome to <span className="font-bold text-white tracking-wide">Bleachdle</span>, the daily trivia challenge for the Bleach community.
                        Test your knowledge of <span className="text-[#c8a96e] font-medium">Soul Reapers</span>, <span className="text-[#c8a96e] font-medium">Arrancars</span>, and <span className="text-[#c8a96e] font-medium">Quincy</span> across
                        {" "}six modes: <span className="text-white font-medium">character</span>, <span className="text-white font-medium">quote</span>, <span className="text-white font-medium">silhouette</span>, <span className="text-white font-medium">emoji</span>, <span className="text-white font-medium">song</span>, and <span className="text-white font-medium">release</span>.
                    </p>

                    <p className="relative z-10 text-[13px] sm:text-sm text-neutral-400 font-light leading-relaxed max-w-4xl mb-10">
                        <span className="font-semibold text-white">New puzzles every day.</span> Pick a mode below to
                        {" "}<span className="text-[#c8a96e] font-semibold tracking-wide">initiate the Senkaimon protocol</span>.
                    </p>

                    {/* ================= 🕹️ FUSED DYNAMIC GRID INTERFACE ================= */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                        {GAME_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => handleSubFeatureClick(mode.id)}
                                className="group/mode relative p-6 md:p-7 border border-white/8 hover:border-white/20 bg-gradient-to-b from-[#08080b] to-[#030305] shadow-[0_15px_40px_rgba(0,0,0,0.7)] hover:-translate-y-1.5 transition-all duration-500 overflow-hidden text-left focus:outline-none focus:ring-1"
                                // style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
                                aria-label={`Select ${mode.name} mode`}
                            >
                                {/* 🌌 Individual Mode Fluid Aura (เพิ่มความเข้มแสงตอน Hover ชัดเจนขึ้น) */}
                                <div
                                    className="absolute inset-0 opacity-0 scale-100 origin-bottom group-hover/mode:opacity-100 group-hover/mode:scale-105 transition-all duration-700 ease-out pointer-events-none bd-anim mix-blend-screen"
                                    style={{
                                        background: `radial-gradient(circle at 50% 110%, color-mix(in srgb, ${mode.accent} 26%, transparent) 0%, transparent 60%)`,
                                        animation: "bd-aura 4s ease-in-out infinite"
                                    }}
                                />

                                {/* 📐 Dynamic Outer Brackets (เหลี่ยมมุมการ์ดขยับเปลี่ยนสีตามสีประจำโหมด) */}
                                <div
                                    className="absolute top-0 left-0 w-6 h-[3px] transition-colors duration-300 group-hover/mode:!bg-current"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${mode.accent} 20%, transparent)`,
                                        color: mode.accent
                                    }}
                                />
                                <div
                                    className="absolute top-0 left-0 w-[3px] h-6 transition-colors duration-300 group-hover/mode:!bg-current"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${mode.accent} 20%, transparent)`,
                                        color: mode.accent
                                    }}
                                />
                                <div
                                    className="absolute bottom-0 right-0 w-6 h-[3px] transition-colors duration-300 group-hover/mode:!bg-current"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${mode.accent} 20%, transparent)`,
                                        color: mode.accent
                                    }}
                                />
                                <div
                                    className="absolute bottom-0 right-0 w-[3px] h-6 transition-colors duration-300 group-hover/mode:!bg-current"
                                    style={{
                                        backgroundColor: `color-mix(in srgb, ${mode.accent} 20%, transparent)`,
                                        color: mode.accent
                                    }}
                                />

                                {/* 🔬 Dynamic Inner Micro Fine Brackets */}
                                <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-white/5 transition-colors duration-300 group-hover/mode:border-current/40" style={{ color: mode.accent }} />
                                <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-white/5 transition-colors duration-300 group-hover/mode:border-current/40" style={{ color: mode.accent }} />

                                {/* ⚡ Micro-interaction Notification String */}
                                <div className="absolute top-3 right-4 text-[9px] font-mono tracking-widest uppercase opacity-0 group-hover/mode:opacity-100 group-hover/mode:translate-x-0 translate-x-2 transition-all duration-300" style={{ color: mode.accent }}>
                                    INITIATE →
                                </div>

                                {/* INTERIOR CONTENT PACK */}
                                <div className="flex flex-col justify-between h-full min-h-[210px] relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span
                                                className="text-[10px] font-mono tracking-[0.25em] font-bold uppercase block mb-1.5 transition-colors duration-300"
                                                style={{ color: mode.accent }}
                                            >
                                                {mode.tagline}
                                            </span>
                                            <h4 className="text-lg font-black tracking-[0.12em] text-white">
                                                {mode.name}
                                            </h4>
                                        </div>

                                        {/* 卍 Morphing Kanji (ขยายร่าง หมุน และเรืองแสงเพิ่มมิติมุมมองเมื่อทำการโฟกัสหรือโฮเวอร์) */}
                                        <span
                                            className="text-5xl font-black select-none opacity-[0.03] group-hover/mode:opacity-20 group-hover/mode:scale-110 group-hover/mode:rotate-6 transition-all duration-700 will-change-transform"
                                            style={{ color: mode.accent }}
                                        >
                                            {mode.kanji}
                                        </span>
                                    </div>

                                    <p className="text-[12.5px] leading-relaxed text-neutral-500 group-hover/mode:text-neutral-300 transition-colors duration-500 mb-6">
                                        {mode.description}
                                    </p>

                                    {/* 📶 Fused Data Stream Footer Status Bar (แถบซิงโครไนซ์จำลองสถาปัตยกรรมระบบเครื่องมือสื่อสาร) */}
                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[8.5px] font-mono tracking-[0.2em] text-white/20 mt-auto">

                                        {/* 🎯 ฝั่งซ้าย: บังคับโครงสร้างให้เกาะเส้นกึ่งกลาง (Perfect Centering) */}
                                        <span className="flex items-center gap-2 leading-none">
                                            {/* เปลี่ยนเป็น rounded-full + ใช้ translate-y ดึงบาลานซ์ขึ้นจุดตัดกึ่งกลางตัวอักษร */}
                                            <span
                                                className="w-1.5 h-1.5 rounded-full flex-shrink-0 -translate-y-[2px] group-hover/mode:animate-ping"
                                                style={{ backgroundColor: mode.accent }}
                                            />
                                            {/* ห่อ span ให้ตัวหนังสือมีขอบเขต Box Layout ที่ชัดเจน */}
                                            <span className="inline-block">REISHI_SYNC //</span>
                                        </span>

                                        {/* ⚔️ ฝั่งขวา */}
                                        <span
                                            className="group-hover/mode:translate-x-1.5 transition-all duration-500 font-bold leading-none"
                                            style={{ color: mode.accent }}
                                        >
                                            EXECUTE
                                        </span>

                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ================= 🛰️ FOOTER ... ================= */}

            {/* 🚪 PORTAL: Mode Selector Modal */}
            <ModeSelectorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelectMode={handleModeSelection}
                selectedSubFeature={selectedGameSubFeature}
            />
        </div>
    );
}