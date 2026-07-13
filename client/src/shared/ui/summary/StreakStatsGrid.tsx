// src/shared/ui/summary/StreakStatsGrid.tsx
"use client";

interface StreakStatsGridProps {
    isWin: boolean;
    currentStreak: number;
    maxStreak: number;
    tierColor: string;
    labelColorClassName?: string;
}

/**
 * 📊 Shared "Current Streaks / Max Streaks" 2-column stat grid.
 * Current streak is zeroed out on loss in every mode (`isWin ? stats.currentStreak : 0`) —
 * kept exactly as-is here rather than pre-computed by the caller, since it's
 * cheap and keeps the "loss resets the display" rule visible in one place.
 */
export const StreakStatsGrid = ({
    isWin,
    currentStreak,
    maxStreak,
    tierColor,
    labelColorClassName = 'text-[#ebc7c7]/50',
}: StreakStatsGridProps) => {
    return (
        <div className="grid grid-cols-2 divide-x divide-white/[0.08] mb-6 border-t border-white/[0.05] pt-4 font-[family-name:var(--font-display)]">
            <div className="flex flex-col items-center">
                <p className={`text-[13px] uppercase ${labelColorClassName} tracking-widest`}>Current Streaks</p>
                <p className="text-xl font-mono font-bold mt-0.5 text-[#f5ebd5]">
                    {isWin ? currentStreak : 0}
                </p>
            </div>

            <div className="flex flex-col items-center">
                <p className={`text-[13px] uppercase ${labelColorClassName} tracking-widest`}>Max Streaks</p>
                <p className="text-xl font-mono font-bold mt-0.5" style={{ color: tierColor }}>
                    {maxStreak}
                </p>
            </div>
        </div>
    );
};