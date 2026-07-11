// src/shared/ui/summary/IdentificationHistoryPanel.tsx
"use client";

import { ReactNode, useState } from 'react';

interface IdentificationHistoryPanelProps {
    guessCount: number;
    /**
     * The per-guess "matrix" — a single colored square (Quote/Song/Emoji/
     * Release), or a row of multiple squares per RESULT_KEYS
     * (Character). Rendering stays with the caller since the shape of a
     * "result" differs per game; this panel only supplies the label,
     * count, and layout wrapper around whatever squares are passed in.
     */
    matrix: ReactNode;
    /** e.g. "Voice Chronicle // View Logs", "Reiatsu Chronicle // View Logs" */
    chronicleLabel: string;
    /**
     * Pre-rendered list of chronicle log rows (one <div> per guess entry).
     * Row content (image + name vs title/artist vs technique/character)
     * differs per game, so callers keep building rows themselves and just
     * hand the finished list in — this panel only owns the accordion
     * shell, scroll container, and expand/collapse state.
     */
    logRows: ReactNode;
    historyLabel?: string;
    countSuffix?: string;
    labelColorClassName?: string;
    countSuffixColorClassName?: string;
    /** Expanded wrapper max-height — Quote/Character/Emoji/Release use 140px, Song/Release-log use 160px. */
    expandedMaxHeightClassName?: string;
    innerMaxHeightClassName?: string;
    /** Full class override for the "Identification History" label — Silhouette
     *  uses a smaller mono/tracked variant instead of the default. */
    historyLabelClassName?: string;
    /** Full class override for the accordion trigger button — Silhouette uses
     *  fainter bg opacities, smaller text, and rounded-xs corners. */
    triggerButtonClassName?: string;
    triggerLabelWrapperClassName?: string; // default 'flex items-center gap-1.5'
}

/**
 * 📜 Shared "Identification History" block: attempt counter, per-guess
 * matrix squares, and a collapsible chronicle log of past guesses.
 * Bundles its own `isHistoryExpanded` state so every mode no longer needs
 * to declare + wire up that `useState` and accordion toggle by hand.
 */
export const IdentificationHistoryPanel = ({
    guessCount,
    matrix,
    chronicleLabel,
    logRows,
    historyLabel = 'Identification History',
    countSuffix = 'attempts',
    labelColorClassName = 'text-[#ebc7c7]/50',
    countSuffixColorClassName = 'text-[#ebc7c7]/50',
    expandedMaxHeightClassName = 'max-h-[140px]',
    innerMaxHeightClassName = 'max-h-[137px]',
    historyLabelClassName,
    triggerButtonClassName = 'flex items-center justify-between w-full border border-[#c8a96e]/15 bg-[#c8a96e]/5 hover:bg-[#c8a96e]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[#c8a96e] transition-all duration-200 select-none',
    triggerLabelWrapperClassName = 'flex items-center gap-1.5',
}: IdentificationHistoryPanelProps) => {
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

    return (
        <div className="my-4 border-t border-white/[0.05] pt-4 flex flex-col items-center w-full">
            <p className={historyLabelClassName ?? `text-[12px] ${labelColorClassName} uppercase tracking-widest mb-1`}>{historyLabel}</p>
            <p className="text-2xl font-mono font-bold mb-4 text-[#f5ebd5]">
                {guessCount} <span className={`text-xs ${countSuffixColorClassName} font-normal`}>{countSuffix}</span>
            </p>

            {/* Matrix Squares */}
            <div className="flex flex-wrap gap-1.5 items-center justify-center mb-4 max-w-[280px]">
                {matrix}
            </div>

            {/* Accordion Trigger */}
            <button
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className={triggerButtonClassName}
            >
                <span className={triggerLabelWrapperClassName}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] animate-pulse"></span>
                    {chronicleLabel}
                </span>
                <svg
                    className={`w-3 h-3 text-[#c8a96e] transition-transform duration-300 ${isHistoryExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Chronicle Storage Logs */}
            <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${isHistoryExpanded ? `${expandedMaxHeightClassName} opacity-100 mt-2.5` : 'max-h-0 opacity-0'}`}>
                <div className={`grid grid-cols-1 gap-1.5 ${innerMaxHeightClassName} overflow-y-auto pr-1 text-left scrollbar-thin scrollbar-thumb-white/10`}>
                    {logRows}
                </div>
            </div>
        </div>
    );
};