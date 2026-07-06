"use client";

interface ModeBadgeProps {
    mode: 'daily' | 'unlimited';
    onClick?: () => void;
}

const MODE_CONFIG = {
    daily: {
        kanji: '日',
        label: 'Daily Mission',
        sub: 'One Soul // Reset Nightly',
        color: '#c8a96e',
        glow: 'rgba(200,169,110,0.35)',
        borderColor: 'border-[#c8a96e]/50',
        hoverBg: 'hover:bg-[#c8a96e]/5',
    },
    unlimited: {
        kanji: '無限',
        label: 'Unlimited Trial',
        sub: 'Infinite Souls // Endless Hunt',
        color: '#a855f7',
        glow: 'rgba(168,85,247,0.35)',
        borderColor: 'border-[#a855f7]/50',
        hoverBg: 'hover:bg-[#a855f7]/5',
    },
} as const;

export function ModeBadge({ mode, onClick }: ModeBadgeProps) {
    const config = MODE_CONFIG[mode];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault();
            onClick();
        }
    };

    return (
        <div className="w-full flex justify-center my-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div
                role={onClick ? "button" : undefined}
                tabIndex={onClick ? 0 : undefined}
                onClick={onClick}
                onKeyDown={handleKeyDown}
                className={`relative inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-b from-[#0a0a0f]/90 to-[#020205]/90 border ${config.borderColor} backdrop-blur-md shadow-lg select-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-300 group ${onClick ? `cursor-pointer ${config.hoverBg}` : ''}`}
                style={{ 
                    boxShadow: `0 0 26px ${config.glow}`
                }}
                aria-label={`Current mode is ${config.label}. Click to change mode.`}
            >
                {/* Kido Corner Brackets — เปล่งประกายขึ้นเมื่อ Hover */}
                <div
                    className="absolute -top-[1px] -left-[1px] w-2.5 h-2.5 border-t border-l transition-all duration-300 group-hover:w-4 group-hover:h-4"
                    style={{ borderColor: config.color }}
                />
                <div
                    className="absolute -top-[1px] -right-[1px] w-2.5 h-2.5 border-t border-r transition-all duration-300 group-hover:w-4 group-hover:h-4"
                    style={{ borderColor: config.color }}
                />
                <div
                    className="absolute -bottom-[1px] -left-[1px] w-2.5 h-2.5 border-b border-l transition-all duration-300 group-hover:w-4 group-hover:h-4"
                    style={{ borderColor: config.color }}
                />
                <div
                    className="absolute -bottom-[1px] -right-[1px] w-2.5 h-2.5 border-b border-r transition-all duration-300 group-hover:w-4 group-hover:h-4"
                    style={{ borderColor: config.color }}
                />

                {/* Kanji Seal */}
                <span
                    className="text-lg font-bold leading-none shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: config.color, textShadow: `0 0 14px ${config.glow}` }}
                >
                    {config.kanji}
                </span>

                {/* Divider */}
                <div
                    className="w-[1px] h-8 shrink-0"
                    style={{ background: `linear-gradient(to bottom, transparent, ${config.color}60, transparent)` }}
                />

                {/* Text Block */}
                <div className="flex flex-col items-start pr-1">
                    <span
                        className="text-[11px] md:text-xs font-bold uppercase tracking-[0.25em] transition-colors duration-300"
                        style={{ color: config.color }}
                    >
                        {config.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#eed9c4]/50 font-mono mt-0.5">
                        {config.sub}
                    </span>
                </div>

                {/* Pulse dot บอกสถานะ active */}
                <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ml-1 transition-transform duration-300 group-hover:scale-125"
                    style={{ background: config.color, boxShadow: `0 0 10px ${config.color}` }}
                />
            </div>
        </div>
    );
}