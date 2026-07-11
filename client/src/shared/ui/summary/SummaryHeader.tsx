// src/shared/ui/summary/SummaryHeader.tsx
"use client";

import { ReactNode } from 'react';

interface SummaryHeaderProps {
    /** Mode-specific glyph: ❝ (quote), ♪ (song), 卍 (character), ❖ (emoji), ۞ (release), ❄ (silhouette)... */
    icon: ReactNode;
    iconColor: string;
    isWin: boolean;
    /** e.g. "Testimony Traced to Registered Speaker" / "Melodic Link Severed" */
    subtitle: string;
    /** Every mode currently shares this pair, but left overridable in case a future mode differs. */
    winTitle?: string;
    loseTitle?: string;
    subtitleColorClassName?: string;
    className?: string;
    /** Icon wrapper — most modes render `<span class="text-3xl">` inline, Silhouette
     *  wraps it in its own `flex justify-center mb-1` row instead. Pass a full
     *  className to render the icon as a block; leave undefined for the default inline span. */
    iconWrapperClassName?: string;
    iconSizeClassName?: string; // default 'text-3xl'
    /** Title/subtitle full class overrides — Silhouette uses a denser type scale. */
    titleClassName?: string;
    subtitleClassName?: string;
}

/**
 * 🪧 Shared "REISHI KAKUNIN / KONPAKU DANZETSU" endgame title block, used
 * across every *SummaryGuess mode — glyph, subtitle text, and (for
 * Silhouette) a slightly denser type scale change per feature via the
 * optional className overrides.
 */
export const SummaryHeader = ({
    icon,
    iconColor,
    isWin,
    subtitle,
    winTitle = 'REISHI KAKUNIN',
    loseTitle = 'KONPAKU DANZETSU',
    subtitleColorClassName = 'text-[#ebc7c7]/50',
    className = 'text-center mb-6 relative z-10',
    iconWrapperClassName,
    iconSizeClassName = 'text-3xl',
    titleClassName = 'text-2xl font-bold mt-2 tracking-[0.2em] uppercase',
    subtitleClassName,
}: SummaryHeaderProps) => {
    const iconEl = <span className={iconSizeClassName} style={{ color: iconColor }}>{icon}</span>;

    return (
        <div className={className}>
            {iconWrapperClassName ? <div className={iconWrapperClassName}>{iconEl}</div> : iconEl}
            <h2
                className={titleClassName}
                style={{ color: isWin ? '#c8a96e' : '#e84d4d' }}
            >
                {isWin ? winTitle : loseTitle}
            </h2>
            <p className={subtitleClassName ?? `text-[11px] tracking-[0.3em] uppercase ${subtitleColorClassName} mt-1`}>
                {subtitle}
            </p>
        </div>
    );
};