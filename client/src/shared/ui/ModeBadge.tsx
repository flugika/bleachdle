"use client";

interface ModeBadgeProps {
    mode: 'daily' | 'unlimited';
}

const MODE_CONFIG = {
    daily: {
        kanji: '日',
        label: 'Daily Mission',
        sub: 'One Soul // One Chance // Reset Nightly',
        color: '#c8a96e',
        glow: 'rgba(200,169,110,0.35)',
        borderColor: 'border-[#c8a96e]/30',
    },
    unlimited: {
        kanji: '無限',
        label: 'Unlimited Trial',
        sub: 'Infinite Souls // No Boundaries // Endless Hunt',
        color: '#a855f7',
        glow: 'rgba(168,85,247,0.35)',
        borderColor: 'border-[#a855f7]/30',
    },
} as const;

export function ModeBadge({ mode }: ModeBadgeProps) {
    const config = MODE_CONFIG[mode];

    return (
        <div className="w-full flex justify-center my-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div
                className={`relative inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-b from-[#0a0a0f]/90 to-[#020205]/90 border ${config.borderColor} backdrop-blur-md shadow-lg`}
                style={{ boxShadow: `0 0 24px ${config.glow}` }}
            >
                {/* Kido Corner Brackets — เอกลักษณ์เดิมของเว็บ */}
                <div
                    className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t border-l"
                    style={{ borderColor: config.color }}
                />
                <div
                    className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t border-r"
                    style={{ borderColor: config.color }}
                />
                <div
                    className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b border-l"
                    style={{ borderColor: config.color }}
                />
                <div
                    className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b border-r"
                    style={{ borderColor: config.color }}
                />

                {/* Kanji Seal */}
                <span
                    className="text-lg font-bold leading-none shrink-0"
                    style={{ color: config.color, textShadow: `0 0 10px ${config.glow}` }}
                >
                    {config.kanji}
                </span>

                {/* Divider */}
                <div
                    className="w-[1px] h-8 shrink-0"
                    style={{ background: `linear-gradient(to bottom, transparent, ${config.color}60, transparent)` }}
                />

                {/* Text Block */}
                <div className="flex flex-col items-start">
                    <span
                        className="text-[11px] md:text-xs font-bold uppercase tracking-[0.25em]"
                        style={{ color: config.color }}
                    >
                        {config.label}
                    </span>
                    <span className="text-[8px] uppercase tracking-[0.15em] text-[#eed9c4]/30 font-mono mt-0.5">
                        {config.sub}
                    </span>
                </div>

                {/* Pulse dot บอกสถานะ active */}
                <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ml-1"
                    style={{ background: config.color, boxShadow: `0 0 8px ${config.color}` }}
                />
            </div>
        </div>
    );
}