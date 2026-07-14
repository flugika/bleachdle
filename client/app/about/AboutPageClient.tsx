// src/features/about/AboutPageClient.tsx
"use client";

import { useRouter } from "next/navigation";
import { useSenkaimon } from "@/src/shared/ui/context/NavigationContext";
import { ArrowUpRight } from "lucide-react";
import { BL_MODES_METADATA, MODE_ORDER } from "@/src/config/mode";
import Image from "next/image";
import Link from "next/link";

// ================= 🎨 SHARED DESIGN TOKENS =================
// Kept local so this page never drifts from the Kido card language used on
// /support (corner brackets, gold accent, Cinzel kanji headers). If those
// primitives ever get extracted into a shared component, swap these for it.

// Set NEXT_PUBLIC_PORTFOLIO_URL in your .env — same variable PortfolioCard.tsx
// reads, so both places always point at the same link.
const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL || "https://www.instagram.com/sandyflugika/";

function KidoCard({
    kanji,
    eyebrow,
    children,
}: {
    kanji: string;
    eyebrow: string;
    children: React.ReactNode;
}) {
    return (
        <div className="relative bg-gradient-to-b from-[#0a0a0f]/90 to-[#020205]/95 border border-[#c8a96e]/25 p-6 md:p-9 shadow-[0_30px_70px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
            <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
            <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
            <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />

            <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8a96e]/60" />
                <span
                    className="text-lg font-bold text-[#c8a96e] tracking-[0.3em]"
                    style={{ fontFamily: "'Cinzel', serif" }}
                >
                    {kanji}
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8a96e]/60" />
            </div>
            <p className="text-center text-[11px] uppercase tracking-[0.35em] text-[#eed9c4]/50 font-mono mb-8">
                {eyebrow}
            </p>

            {children}
        </div>
    );
}

// ================= 🕹️ MODE INDEX =================
// Pulled straight from BL_MODES_METADATA (config/mode.ts) instead of a local
// hardcoded kanji list — that config is the single source of truth for mode
// symbols across Home / About / Stats, so this can never drift out of sync
// with it again.
const MODES = MODE_ORDER.map((key) => ({
    name: BL_MODES_METADATA[key].id.charAt(0).toUpperCase() + BL_MODES_METADATA[key].id.slice(1),
    kanji: BL_MODES_METADATA[key].symbol,
}));

export default function AboutPageClient() {
    const router = useRouter();
    const { navigate, state } = useSenkaimon();

    // 🛡️ Same gated-navigation pattern used across the app: prevent default,
    // let the Senkaimon transition own the actual route change, and ignore
    // clicks while a transition is already in flight.
    const handleGateNavigate = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        if (state !== "idle") return;
        navigate(path);
    };

    return (
        <div className="relative min-h-screen w-full text-white overflow-hidden">
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 md:py-24">
                {/* ================= HEADER ================= */}
                <div className="text-center mb-14 font-[family-name:var(--font-display)]">
                    <button
                        onClick={() => router.push("/")}
                        className="text-[11px] uppercase tracking-[0.3em] text-[#eed9c4]/50 hover:text-[#c8a96e] mb-6 transition-colors duration-200 cursor-pointer"
                    >
                        ← Return To Living World Gateway
                    </button>

                    <h1 className="text-3xl md:text-5xl font-black tracking-[0.15em] bg-gradient-to-r from-[#c8a96e] via-[#f5ebd5] to-[#c8a96e] bg-clip-text text-transparent mb-3">
                        About This Project
                    </h1>
                    <p className="text-[12px] md:text-xs uppercase tracking-[0.3em] text-[#eed9c4]/40 font-mono">
                        A Fan-Made Record, Not An Official Archive
                    </p>

                    <div className="w-full mt-6 flex items-center justify-center px-[5%] opacity-90">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
                        <div className="mx-8 relative flex items-center justify-center">
                            <div className="w-6 h-6 border border-[#c8a96e] rotate-45 flex items-center justify-center shadow-[0_0_17px_rgba(200,169,110,0.3)] bg-black/20">
                                <div className="w-1.5 h-1.5 bg-[#c8a96e] rotate-0 shadow-[0_0_10px_#c8a96e]" />
                            </div>
                            <div className="absolute -left-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                            <div className="absolute -right-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                        </div>
                        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
                    </div>
                </div>

                <div className="flex flex-col gap-8">
                    {/* ================= WHAT IS A "DLE"? ================= */}
                    <KidoCard kanji="遊戯" eyebrow="For First-Time Visitors">
                        <h2 className="flex gap-2 text-xl font-bold text-white mb-4 tracking-wide font-[family-name:var(--font-display)]">
                            <Image
                                src="/icon.svg"
                                alt=""
                                width={24}
                                height={24}
                                className="w-5 h-5 md:w-6 md:h-6 bd-anim"
                                style={{
                                    animation: "icon-reiatsu-breathe 3.2s ease-in-out infinite",
                                }}
                            />
                            What is Bleachdle?
                        </h2>
                        <p className="text-sm text-neutral-300 leading-relaxed mb-4">
                            Bleachdle belongs to a small family of browser games nicknamed{" "}
                            <span className="text-[#c8a96e] font-semibold">&ldquo;-dle&rdquo; games</span>, after{" "}
                            <span className="text-white font-semibold underline decoration-[#c8a96e]/40 underline-offset-4">
                                Wordle
                            </span>
                            . This site applies that format to{" "}
                            <span className="text-white font-semibold">Bleach</span>, across six modes built
                            around characters, dialogue, silhouettes, emoji, music, and release commands. No
                            account, no install, no prior experience with this style of game required — pick a
                            mode and the interface explains the rest.
                        </p>
                        <p className="text-sm text-neutral-300 leading-relaxed mb-6">
                            Every mode comes in two variants, and they play quite differently:
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Daily */}
                            <div className="border border-[#c8a96e]/25 bg-black/20 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg text-[#c8a96e]">日</span>
                                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#c8a96e] font-[family-name:var(--font-display)]">
                                        Daily
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-300 leading-relaxed">
                                    <span className="text-white font-semibold">Everyone gets the same puzzle</span>,
                                    reset once a day. You get{" "}
                                    <span className="text-[#c8a96e] font-semibold">15 guesses{" "}</span> to land it —
                                    one attempt at today&apos;s answer, same as everyone else playing today.
                                </p>
                            </div>

                            {/* Unlimited */}
                            <div className="border border-[#4a90d9]/25 bg-black/20 p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-lg text-[#4a90d9]">無</span>
                                    <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#4a90d9] font-[family-name:var(--font-display)]">
                                        Unlimited
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-300 leading-relaxed">
                                    Play back-to-back with{" "}
                                    <span className="text-[#4a90d9] font-semibold">10 guesses{" "}</span> per quiz.
                                    Answering correctly retires that target from the pool, so the next quiz
                                    won&apos;t repeat it — you keep going until every target in the pool has been
                                    cleared once.
                                </p>
                                <p className="text-sm text-neutral-300 leading-relaxed mt-3">
                                    Once the pool is empty, it resets — and that reset is logged to a{" "}
                                    <span className="text-white font-semibold">soul registry</span>: the name
                                    you&apos;ve registered, and how many full clears you&apos;ve racked up under
                                    it.
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-neutral-300 leading-relaxed mt-6">
                            One rule holds across every mode, Daily or Unlimited:{" "}
                            <span className="underline decoration-[#c8a96e]/40 underline-offset-4">
                                the answer is never revealed until the quiz is over
                            </span>{" "}
                            — win or run out of guesses. No peeking ahead mid-attempt.
                        </p>
                    </KidoCard>

                    {/* ================= MODE INDEX ================= */}
                    <KidoCard kanji="卍解" eyebrow="Six Ways To Play">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {MODES.map((m) => (
                                <div
                                    key={m.name}
                                    className="flex items-center gap-2.5 border border-white/8 bg-black/20 px-3.5 py-2.5"
                                >
                                    <span className="text-lg text-[#c8a96e]/70">{m.kanji}</span>
                                    <span className="text-[11px] uppercase tracking-[0.15em] text-neutral-300 font-[family-name:var(--font-display)]">
                                        {m.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-[#eed9c4]/40 font-mono text-center mt-6">
                            New puzzles every day
                        </p>
                    </KidoCard>

                    {/* ================= WHY I MADE THIS ================= */}
                    <KidoCard kanji="由来" eyebrow="Why This Exists">
                        <h2 className="text-xl font-bold text-white mb-4 tracking-wide font-[family-name:var(--font-display)]">
                            Why I made this
                        </h2>
                        <div className="text-sm text-neutral-300 leading-relaxed space-y-4">
                            <p>
                                I met Bleach young, on a local cartoon channel, and I didn&apos;t stay long.{" "}
                                <span className="italic text-neutral-200">The Hollows genuinely scared me</span>{" "}
                                at that age. I watched enough to get through Soul Society and into the Bount
                                arc, and then quietly stopped — not knowing, at the time, that{" "}
                                <span className="underline decoration-[#c8a96e]/40 underline-offset-4">
                                    Bount was filler
                                </span>{" "}
                                and the real story hadn&apos;t actually lost me at all.
                            </p>
                            <p>
                                <span className="text-white font-semibold">Twenty years{" "}</span> passed before I
                                came back to it. I&apos;d just finished a degree in Computer Engineering and
                                had a month of downtime waiting on paperwork before my first job started. I
                                spent some of it catching up on anime news, and one headline stopped me:{" "}
                                <span className="text-[#c8a96e] font-semibold">Thousand-Year Blood War</span>{" "}
                                was airing. I&apos;d <span className="line-through decoration-neutral-500">assumed
                                    Bleach ended years ago</span> — instead all three cours were already out, and I
                                went back to episode one of the original series to watch the whole thing in
                                order before touching TYBW.
                            </p>
                            <p>
                                By the end, Bleach had become <span className="text-white font-semibold">one
                                    of my favorite anime ever made</span> — second only to Attack on Titan, ahead
                                of My Hero Academia. The original run has real rough edges in pacing and
                                animation, so what happened with{" "}
                                <span className="text-[#c8a96e] font-semibold">TYBW&apos;s very first episode</span>{" "}
                                landed even harder: the animation, the voice direction, the score, even a
                                dedicated ending theme — every part of the production spoke the same intent,
                                that this was being made as a <span className="italic text-white">masterpiece</span>,
                                not just a comeback season.
                            </p>
                            <p>
                                I draw as well, and Bleach&apos;s character design, anatomy, and rim-lighting
                                are a direct influence on my own art — some of it is up on my portfolio, linked
                                from the Support page.
                            </p>
                            <p>
                                The idea for a Bleach daily-puzzle site sat unbuilt for{" "}
                                <span className="text-white font-semibold">over a year</span>, behind a
                                full-time job and mandatory military service. What finally freed up the time
                                was reaching the tail end of that service — the rotation where duty hours thin
                                out and the standby shifts stop asking much of you. I started writing code
                                during the quiet stretches of duty, and kept going in the evenings before bed.
                            </p>
                            <p>
                                A few friends already played animedle, mangadle, and Wordle-style games and
                                wanted a Bleach version, so I built one for them first. Once the modes started
                                coming together, it turned into something worth finishing properly —{" "}
                                <span className="italic text-neutral-200">both as a gift to them and as a
                                    portfolio piece of my own.</span>
                            </p>
                            <p>
                                <span className="text-white font-semibold">Performance{" "}</span> was one problem I
                                cared about solving well. In most games like this, submitting a guess means
                                waiting on a server round-trip just to confirm whether it&apos;s correct — and
                                that pause alone tends to give the answer away before the screen does. I wanted
                                that gone: <span className="text-[#c8a96e] font-semibold">instant feedback</span>,
                                nothing that spoils the puzzle through lag.
                            </p>
                            <p>
                                More than anything, I want playing this to feel different from a generic{" "}
                                <span className="italic">-dle</span> clone — like it was built by someone who{" "}
                                <span className="underline decoration-[#c8a96e]/50 underline-offset-4">
                                    actually loves Bleach
                                </span>
                                , not assembled from a template.
                            </p>
                            <p>
                                The site is still growing: things like the typeface are on my list to revisit
                                for readability, but the project has gotten large enough that a full pass takes
                                real time, and right now I&apos;d rather keep shipping new features and circle
                                back after.
                            </p>
                            <p>
                                Some of the character data — episode and chapter references especially — may
                                have small errors I was already aware of while building the dataset. Fixing
                                every one before launch would have stalled the project for little real payoff,
                                since that detail matters more for <span className="italic">double-checking</span>{" "}
                                than for the puzzle itself. Most of that data was compiled from{" "}
                                <span className="text-white font-semibold">fan wikis</span>, and I&apos;m glad
                                to credit them for that — I&apos;m deliberately{" "}
                                <span className="font-semibold text-white">not linking{" "}</span> to them
                                directly here, since they run ads and aren&apos;t the official source. If you
                                spot something wrong,{" "}
                                <span className="text-[#c8a96e] font-semibold">Support &amp; Reports</span> is
                                the fastest way to reach me about it.
                            </p>
                        </div>
                    </KidoCard>

                    {/* ================= FAN-MADE / NON-COMMERCIAL / CREDITS ================= */}
                    <KidoCard kanji="権利" eyebrow="Rights &amp; Ownership">
                        <h2 className="text-xl font-bold text-white mb-4 tracking-wide font-[family-name:var(--font-display)]">
                            Fan-made, non-commercial, no ads
                        </h2>
                        <p className="text-sm text-neutral-300 leading-relaxed mb-4">
                            Bleachdle is an <span className="italic text-neutral-200">unofficial fan
                                project</span>. It carries{" "}
                            <span className="text-white font-semibold">no advertising</span>, runs no analytics
                            sold to third parties, and{" "}
                            <span className="underline decoration-[#c8a96e]/40 underline-offset-4">
                                does not accept payment or donations
                            </span>{" "}
                            of any kind. Nothing here is monetized, and nothing about that is likely to change.
                        </p>
                        <p className="text-sm text-neutral-300 leading-relaxed mb-4">
                            <span className="text-white font-semibold">Bleach</span> — its characters, story,
                            names, artwork, audio, and all related media — is the property of{" "}
                            <span className="text-white font-semibold">Tite Kubo</span>,{" "}
                            <span className="text-white font-semibold">Dentsu</span>,{" "}
                            <span className="text-white font-semibold">TV Tokyo</span>,{" "}
                            <span className="text-white font-semibold">Shueisha</span>, and{" "}
                            <span className="text-white font-semibold">Studio Pierrot</span>, along with their
                            respective licensors. This site references that material for the purpose of a
                            fan-made trivia game and{" "}
                            <span className="font-semibold text-white">claims no ownership</span> over any of
                            it.
                        </p>
                        <p className="text-sm text-neutral-300 leading-relaxed mb-5">
                            If you&apos;d like to support the work anyway, the better place for that is my{" "}
                            <span className="text-[#c8a96e] font-semibold">portfolio</span> — it&apos;s where
                            my own original work lives, separate from{" "}
                            <span className="italic">someone else&apos;s IP</span>.
                        </p>
                        <div className="flex justify-center">
                            <Link
                                href={PORTFOLIO_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative font-[family-name:var(--font-display)] font-black inline-flex items-center gap-2 border border-[#c8a96e]/50 px-6 py-2.5 text-[12px] uppercase tracking-[0.25em] text-[#c8a96e] transition-all duration-300 hover:border-[#c8a96e] hover:bg-[#c8a96e] hover:text-[#0a0a0f] hover:shadow-[0_0_27px_rgba(200,169,110,0.5)]"
                            >
                                View My Portfolio
                                <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </Link>
                        </div>
                    </KidoCard>

                    {/* ================= CONTACT / FEEDBACK — LINK ONLY ================= */}
                    <div className="flex flex-col items-center gap-3 pt-4">
                        <p className="text-[11px] uppercase tracking-[0.3em] text-[#eed9c4]/40 font-mono">
                            Found a bug, or have feedback?
                        </p>
                        <Link
                            href="/support"
                            onClick={(e) => handleGateNavigate(e, "/support")}
                            className="group font-black relative font-[family-name:var(--font-display)] inline-flex items-center gap-2 border border-[#c8a96e]/50 px-7 py-3 text-[12px] uppercase tracking-[0.25em] text-[#c8a96e] transition-all duration-300 hover:border-[#c8a96e] hover:bg-[#c8a96e] hover:text-[#0a0a0f] hover:shadow-[0_0_27px_rgba(200,169,110,0.5)]"
                        >
                            Go To Support &amp; Reports
                            <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}