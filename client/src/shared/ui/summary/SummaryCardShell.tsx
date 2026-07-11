// src/shared/ui/summary/SummaryCardShell.tsx
"use client";

import { ReactNode } from 'react';

interface SummaryCardShellProps {
    children: ReactNode;
    /** Full win/lose bg-gradient + border + shadow class string, computed by the caller from `isWin`. */
    cardBgStyle?: string;
    /** Tier kanji rendered as a giant faint background watermark. */
    kanji: string;
    kanjiColor: string;
    isWin: boolean;
    /** Outer wrapper width, e.g. 'max-w-xl' (default) or 'max-w-md' (Silhouette). */
    maxWidthClassName?: string;
    /** Outer wrapper top margin, e.g. 'mt-8' (default) or 'mt-6' (Silhouette). */
    marginTopClassName?: string;
    /** Inner card padding, e.g. 'p-6' (default) or 'p-6 md:p-8' (Release). */
    innerPaddingClassName?: string;
    /**
     * Full watermark position/size/weight/opacity class string.
     * Default matches Quote/Song/Character/Emoji/Release. Silhouette overrides
     * with a slightly bigger/heavier/fainter variant.
     */
    watermarkClassName?: string;
}

/**
 * 🎴 Shared outer shell for every *SummaryGuess card: the animated wrapper,
 * the bordered/backdrop-blurred panel, and the giant faint tier-kanji
 * watermark in the top-right corner. Everything that sits *inside* the
 * panel (header, tier badge, reveal block, history, flavor text, streaks,
 * CTA) is passed in as `children` so per-mode reveal content (testimony
 * card, song metadata, character dossier, silhouette radar, etc.) stays
 * exactly where it already lives — this component never needs to know
 * about it.
 */
export const SummaryCardShell = ({
    children,
    cardBgStyle,
    kanji,
    kanjiColor,
    isWin,
    maxWidthClassName = 'max-w-xl',
    marginTopClassName = 'mt-8',
    innerPaddingClassName = 'p-6 md:p-8',
    watermarkClassName = 'right-[-20px] top-[-14px] text-[12rem] font-bold opacity-[0.025]',
}: SummaryCardShellProps) => {

    const CARD_STYLE = isWin
        ? "bg-gradient-to-b from-[#281508] via-[#0f0a07] to-[#0a0705] border-[#d47a2a]/45 shadow-[0_0_50px_rgba(212,122,42,0.25)] ring-1 ring-[#d47a2a]/10"
        : "bg-gradient-to-b from-[#0f0e1a] via-[#090912] to-[#05050a] border-[#c8a96e]/50 shadow-[0_0_37px_rgba(200,169,110,0.1)] ring-1 ring-[#c8a96e]/10";

    if (!cardBgStyle) {
        cardBgStyle = CARD_STYLE
    }

    return (
        <div className={`w-full ${maxWidthClassName} mx-auto animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center ${marginTopClassName}`}>
            <div className={`w-full ${innerPaddingClassName} backdrop-blur-md relative overflow-hidden transition-all duration-500 border ${cardBgStyle}`}>

                {/* Background Kanji Watermark */}
                <div
                    className={`absolute ${watermarkClassName} pointer-events-none select-none transition-all duration-500`}
                    style={{ color: kanjiColor }}
                >
                    {kanji}
                </div>

                {children}
            </div>
        </div>
    );
};