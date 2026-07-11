// src/shared/ui/summary/NarrativeFlavorText.tsx
"use client";

interface NarrativeFlavorTextProps {
    flavor: string;
    textColorClassName?: string;
}

/**
 * 💬 Shared italic flavor-text quote block ("{activeTier.flavor}").
 * Only the text color tint drifts slightly between modes
 * (#ebc7c7/70 vs #eed9c4/70), so that's exposed as an override.
 */
export const NarrativeFlavorText = ({
    flavor,
    textColorClassName = 'text-[#ebc7c7]/70',
}: NarrativeFlavorTextProps) => {
    return (
        <div className={`text-center italic ${textColorClassName} text-xs leading-relaxed px-2 my-5 border-l-2 border-[#c8a96e]/50`}>
            "{flavor}"
        </div>
    );
};