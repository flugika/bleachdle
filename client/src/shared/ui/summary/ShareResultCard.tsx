// src/shared/ui/summary/ShareResultCard.tsx
"use client";

import { forwardRef } from 'react';

export interface ShareResultTier {
    kanji: string;
    color: string;
    badge: string;
    sub: string;
}

// 🆕 หนึ่งรอบทายอาจมีหลายช่องสี (เช่น Character ที่เช็คทีละ property)
// mode ที่มีช่องเดียวก็ส่ง colors: [color] ได้เลย
export interface ShareResultMatrixRow {
    colors: string[];
}

export interface ShareResultData {
    gameMode: string;
    icon: string;
    playMode: 'daily' | 'unlimited';
    isWin: boolean;
    guessCount: number;
    maxGuesses?: number;
    tier: ShareResultTier;
    currentStreak: number;
    maxStreak: number;
    attemptMatrix?: ShareResultMatrixRow[];
    /** 🆕 คำคมท้ายเกม จาก activeTier.flavor — ให้ฟีลเดียวกับการ์ดจริง */
    flavor?: string;
    dateLabel: string;
    caseFileId: string;
    siteUrl?: string;
}

const WIN_BORDER = '#d47a2a';
const LOSE_BORDER = '#c8a96e';
const GOLD = '#c8a96e';
const CREAM = '#f5ebd5';
const RED = '#e84d4d';

export const CARD_W = 1080;
// 📐 No more fixed CARD_H. The card used to be pinned at 1350px tall no
// matter what, which meant a short result (1 guess, no matrix, short
// flavor) left a huge dead gap before the stats row (that empty space in
// the screenshot). Height now comes from content + a sane floor, so the
// card is always visually "full" regardless of mode/outcome.
export const CARD_MIN_H = 980;

/**
 * 🎨 Tailwind conversion note: everything with a FIXED, known-at-build-time
 * value (spacing, typography, absolute positioning, borders that don't
 * depend on `data`) is a Tailwind utility class below. Anything whose
 * value comes from `data`/`tier` at runtime (accent border color, the
 * background gradient, tier.color-tinted glows, per-cell matrix colors)
 * stays as inline `style` — Tailwind's JIT only knows about class strings
 * it can see in source at build time, so it can't compile a color that
 * only exists once `tier.color` is known in the browser. Forcing those
 * into arbitrary-value classes (e.g. `bg-[${tier.color}]`) would silently
 * produce an unstyled node in production, since that class was never
 * generated at build time — so this split is intentional, not leftover.
 */
export const ShareResultCard = forwardRef<HTMLDivElement, { data: ShareResultData }>(
    ({ data }, ref) => {
        const {
            gameMode, icon, playMode, isWin, guessCount, maxGuesses,
            tier, currentStreak, maxStreak, attemptMatrix, flavor,
            dateLabel, caseFileId, siteUrl = 'bleachdle-theta.vercel.app',
        } = data;

        const accent = isWin ? WIN_BORDER : LOSE_BORDER;
        const resultColor = isWin ? GOLD : RED;
        const resultLabel = isWin ? 'REISHI KAKUNIN' : 'KONPAKU DANZETSU';

        const bgGradient = isWin
            ? 'linear-gradient(180deg, #281508 0%, #0f0a07 55%, #0a0705 100%)'
            : 'linear-gradient(180deg, #0f0e1a 0%, #090912 55%, #05050a 100%)';

        return (
            <div
                ref={ref}
                className="relative overflow-hidden box-border flex flex-col gap-[30px] p-[64px_76px]"
                style={{
                    width: CARD_W,
                    minHeight: CARD_MIN_H,
                    background: bgGradient,
                    border: `2px solid ${accent}73`,
                    fontFamily: 'var(--font-display, sans-serif)',
                    color: CREAM,
                }}
            >
                {/* Kanji watermark */}
                <div
                    className="absolute -right-[30px] -top-5 text-[460px] font-bold leading-none opacity-[0.05] select-none"
                    style={{ color: tier.color }}
                >
                    {tier.kanji}
                </div>

                {/* Faint full-height scanline texture — keeps short cards from
                    reading as "empty" even when content is light */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-50"
                    style={{
                        backgroundImage: `repeating-linear-gradient(180deg, ${GOLD}0d 0px, ${GOLD}0d 1px, transparent 1px, transparent 34px)`,
                    }}
                />

                {/* Corner accents */}
                <div className="absolute top-7 left-7 w-[22px] h-[22px] border-t-2 border-l-2" style={{ borderColor: `${GOLD}80` }} />
                <div className="absolute top-7 right-7 w-[22px] h-[22px] border-t-2 border-r-2" style={{ borderColor: `${GOLD}80` }} />
                <div className="absolute bottom-7 left-7 w-[22px] h-[22px] border-b-2 border-l-2" style={{ borderColor: `${GOLD}80` }} />
                <div className="absolute bottom-7 right-7 w-[22px] h-[22px] border-b-2 border-r-2" style={{ borderColor: `${GOLD}80` }} />

                {/* Header */}
                <div className="relative z-[1] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: GOLD, boxShadow: `0 0 12px ${GOLD}` }}
                        />
                        <span className="text-xl font-semibold tracking-[6px]" style={{ color: `${GOLD}99` }}>
                            BLEACHDLE // {gameMode}
                        </span>
                    </div>
                    <span className="text-base tracking-[3px] font-['Geist']" style={{ color: `${GOLD}66` }}>
                        {caseFileId}
                    </span>
                </div>

                {/* Result block */}
                <div className="relative z-[1] text-center">
                    <span className="text-[52px]" style={{ color: tier.color }}>{icon}</span>
                    <h1
                        className="mt-4 text-[54px] font-extrabold tracking-[6px] uppercase"
                        style={{ color: resultColor }}
                    >
                        {resultLabel}
                    </h1>

                    {/* 🗓️ Date — now a proper case-file badge instead of a plain
                        gray line, so it reads as a designed element rather than
                        filler text left over in empty space. */}
                    <div
                        className="mt-[18px] inline-flex items-center gap-[18px] px-[22px] py-2.5"
                        style={{ border: `1px solid ${GOLD}40`, background: `${GOLD}12` }}
                    >
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: isWin ? resultColor : GOLD }}
                        />
                        <span
                            className="text-xl tracking-[4px] uppercase font-['Geist'] font-bold"
                            style={{ color: `${GOLD}e6` }}
                        >
                            {playMode === 'daily' ? 'Daily Hub' : 'Unlimited Trial'}
                        </span>
                        {playMode === 'daily' && (
                            <>
                                <span className="w-px h-4" style={{ background: `${GOLD}40` }} />
                                <span className="text-[22px] tracking-[2px] font-['Geist'] font-bold" style={{ color: CREAM }}>
                                    {dateLabel}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Tier badge */}
                <div
                    className="relative z-[1] flex items-center gap-6 px-[30px] py-[22px]"
                    style={{ background: '#0a0a0c', border: `1px solid ${tier.color}40` }}
                >
                    <div
                        className="relative flex-shrink-0 w-20 h-20 flex items-center justify-center"
                        style={{ background: '#0a0a0c', border: `1px solid ${tier.color}40` }}
                    >
                        <span className="relative z-[1] text-[38px] font-light" style={{ color: tier.color }}>
                            {tier.kanji}
                        </span>
                        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundColor: tier.color }} />
                    </div>
                    <div className="flex flex-col gap-[5px]">
                        <span className="text-md tracking-[4px] font-black uppercase" style={{ color: `${GOLD}99` }}>
                            Assigned Title
                        </span>
                        <span className="text-3xl font-black" style={{ color: CREAM }}>{tier.badge}</span>
                        <span className="text-lg tracking-[2px] font-['Geist']" style={{ color: `${GOLD}80` }}>{tier.sub}</span>
                    </div>
                </div>

                {/* 🆕 Attempt matrix — แถวต่อรอบ, หลายช่องต่อแถวได้ */}
                {attemptMatrix && attemptMatrix.length > 0 && (() => {
                    // เช็คว่าการทายทุกรอบมีแค่ 1 ช่องหรือไม่ (เช่น Song, Quote, Emoji)
                    const isSingleBoxMode = attemptMatrix.every((row) => row.colors.length === 1);

                    if (isSingleBoxMode) {
                        return (
                            <div className="relative z-[1] flex flex-wrap justify-center items-center gap-2 max-w-[420px] mx-auto">
                                {attemptMatrix.map((row, i) => (
                                    <div
                                        key={i}
                                        className="w-7 h-7 flex-shrink-0"
                                        style={{
                                            background: row.colors[0],
                                            border: '1px solid rgba(0,0,0,0.35)',
                                            boxShadow: `0 0 10px ${row.colors[0]}59, inset 0 0 0 1px rgba(255,255,255,0.12)`,
                                        }}
                                    />
                                ))}
                            </div>
                        );
                    }

                    // โหมด Character (1 รอบเดา มีหลายช่อง attribute) -> เรียงแถวลงมาตามเดิม
                    return (
                        <div className="relative z-[1] flex flex-col gap-2">
                            {attemptMatrix.map((row, i) => (
                                <div key={i} className="flex justify-center gap-2">
                                    {row.colors.map((c, j) => (
                                        <div
                                            key={j}
                                            className="w-7 h-7"
                                            style={{
                                                background: c,
                                                border: '1px solid rgba(0,0,0,0.35)',
                                                boxShadow: `0 0 10px ${c}59, inset 0 0 0 1px rgba(255,255,255,0.12)`,
                                            }}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    );
                })()}

                {/* 🆕 Flavor quote — ให้ฟีลเดียวกับ NarrativeFlavorText บนการ์ดจริง */}
                {flavor && (
                    <div
                        className="relative z-[1] text-center italic text-[22px] font-['Geist'] font-semibold leading-[1.6] px-6"
                        style={{ color: `${CREAM}b3`, borderLeft: `2px solid ${GOLD}80` }}
                    >
                        &quot;{flavor}&quot;
                    </div>
                )}

                {/* Spacer fills whatever's left instead of dumping all the slack
                    right before the stats row — since the card now has a min-height
                    floor rather than a hard fixed height, this keeps short results
                    from collapsing awkwardly tight while long ones just shrink it
                    to near-zero. */}
                <div className="flex-1" />

                {/* Stats row */}
                <div className="relative z-[1] flex pt-8 border-t border-white/[0.08]">
                    {[
                        { label: 'Attempts', value: `${guessCount}${maxGuesses ? `/${maxGuesses}` : ''}`, color: CREAM },
                        { label: 'Current Streak', value: String(isWin ? currentStreak : 0), color: CREAM },
                        { label: 'Max Streak', value: String(maxStreak), color: tier.color },
                    ].map((s, i) => (
                        <div
                            key={i}
                            className={`flex-1 text-center ${i > 0 ? 'border-l border-white/[0.08]' : ''}`}
                        >
                            <p className="text-lg font-bold tracking-[3px] uppercase" style={{ color: `${CREAM}80` }}>
                                {s.label}
                            </p>
                            <p className="mt-[5px] text-[34px] font-bold" style={{ color: s.color }}>
                                {s.value}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Footer CTA */}
                <div className="relative z-[1] text-center">
                    <p className="text-lg font-['Geist'] font-semibold tracking-[3px]" style={{ color: `${GOLD}80` }}>
                        Can you trace the reiatsu? — {siteUrl}
                    </p>
                </div>
            </div>
        );
    }
);

ShareResultCard.displayName = 'ShareResultCard';