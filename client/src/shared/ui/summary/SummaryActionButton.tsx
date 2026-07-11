// src/shared/ui/summary/SummaryActionButton.tsx
"use client";

import { Button } from "@/src/shared/ui/button";

interface SummaryActionButtonProps {
    mode: 'daily' | 'unlimited';
    isWin: boolean;
    onClose: () => void;
    label?: string;
}

/**
 * 🚪 Shared "OPEN SENKAIMON 卍" CTA — only rendered in 'unlimited' mode in
 * every game (daily mode has no restart action). Hover tint flips win/loss
 * green vs red, identical across all modes.
 */
export const SummaryActionButton = ({
    mode,
    isWin,
    onClose,
    label = 'OPEN SENKAIMON 卍',
}: SummaryActionButtonProps) => {
    if (mode !== 'unlimited') return null;

    return (
        <Button
            variant="primary"
            className={`w-full ${isWin
                ? "hover:!bg-[#4de880] hover:!border-[#4de880]"
                : "hover:!bg-[#e84d4d] hover:!border-[#e84d4d]"
                }`}
            onClick={onClose}
        >
            {label}
        </Button>
    );
};