// src/shared/ui/summary/TierBadgeCard.tsx
"use client";

interface ActiveTier {
    kanji: string;
    color: string;
    badge: string;
    sub: string;
}

interface TierBadgeCardProps {
    activeTier: ActiveTier;
}

/**
 * 🏅 Shared "Assigned Title" tier badge card — byte-for-byte identical
 * across Quote / Song / Character / Emoji / Release. Purely driven by
 * whatever `useCharacterTier` / `useSongTier` returns, so it stays a pure
 * display component with zero game-specific knowledge.
 */
export const TierBadgeCard = ({ activeTier }: TierBadgeCardProps) => {
    return (
        <div className="relative p-[1px] my-4 bg-gradient-to-b from-[#c8a96e]/50 to-transparent font-[family-name:var(--font-display)]">
            <div className="bg-[#0a0a0c] p-5 flex items-center gap-6 overflow-hidden relative shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c8a96e]/50 to-transparent" />
                <div
                    className="relative flex items-center justify-center shrink-0 w-16 h-16 border border-[#c8a96e]/20 bg-[#0a0a0c] shadow-[0_0_17px_rgba(0,0,0,0.5)]"
                    style={{ borderColor: `${activeTier.color}40` }}
                >
                    <span className="text-3xl font-light" style={{ color: activeTier.color }}>
                        {activeTier.kanji}
                    </span>
                    <div className="absolute inset-0 opacity-20" style={{ backgroundColor: activeTier.color }} />
                </div>

                <div className="flex flex-col gap-1 w-full">
                    <div className="text-[11px] uppercase tracking-[0.3em] text-[#c8a96e]/60 font-medium">
                        Assigned Title
                    </div>
                    <div className="text-xl text-[#f5ebd5] tracking-wide leading-tight">
                        {activeTier.badge}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="w-4 h-[1px] bg-[#c8a96e]/40" />
                        <div className="text-[12px] font-mono text-[#c8a96e]/50 tracking-wider">
                            {activeTier.sub}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};