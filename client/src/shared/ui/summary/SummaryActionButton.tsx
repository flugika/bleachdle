// src/shared/ui/summary/SummaryActionButton.tsx
"use client";

import { Button } from "@/src/shared/ui/button";
import { ShareResultButton } from "./ShareResultButton";
import type { ShareResultData } from "./ShareResultCard";

interface SummaryActionButtonProps {
    mode: 'daily' | 'unlimited';
    isWin: boolean;
    onClose: () => void;
    label?: string;
    /** 🆕 Share data — passed through so this component can own the full
     *  action stack (Share + Restart) instead of the two buttons being
     *  wired up separately by every summary card. Omit to render this
     *  component without the Share button (e.g. daily mode still wants
     *  Share on its own even though it has no restart CTA). */
    shareData?: ShareResultData;
}

/**
 * 🎯 Action stack for the summary card — owns the full hierarchy instead of
 * each button styling itself in isolation:
 *
 *  1. SHARE RESULT — secondary. Muted outline, no fill (styled inside
 *     ShareResultButton itself), so it visually recedes. It's the "nice to
 *     have" action.
 *  2. OPEN SENKAIMON 卍 — primary. Solid gold fill by default (not just an
 *     outline like before) so it reads immediately as *the* next step in
 *     unlimited mode, with the outline-on-hover invert giving it the same
 *     tactile "press" feedback the rest of the app uses. Hover tint still
 *     flips green/red on win/loss.
 *
 * 🆕 Previously both buttons used identical outline-gold styling with no
 * hierarchy — a person glancing at the card couldn't tell which action was
 * the "main" one. Solid vs outline now does that job at a glance, without
 * needing extra copy or size changes.
 */
export const SummaryActionButton = ({
    mode,
    isWin,
    onClose,
    label = 'OPEN SENKAIMON 卍',
    shareData,
}: SummaryActionButtonProps) => {
    const showRestart = mode === 'unlimited';

    if (!showRestart && !shareData) return null;

    return (
        <div className="flex flex-col gap-2 mt-3">
            {shareData && <ShareResultButton data={shareData} />}

            {showRestart && (
                <Button
                    variant="primary"
                    className={`w-full !bg-[#c8a96e] !text-[#0a0a0f] !border-[#c8a96e] shadow-[0_0_18px_rgba(200,169,110,0.18)] ${isWin
                        ? "hover:!bg-transparent hover:!text-[#4de880] hover:!border-[#4de880]"
                        : "hover:!bg-transparent hover:!text-[#e84d4d] hover:!border-[#e84d4d]"
                        }`}
                    onClick={onClose}
                >
                    {label}
                </Button>
            )}
        </div>
    );
};