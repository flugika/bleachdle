// src/shared/ui/daily-hub/DailyProgressBar.tsx
"use client";

import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

interface DailyProgressBarProps {
    /** id of the mode currently being played (e.g. "character" / "song") — highlights that pill differently */
    activeMode?: string;
    /** 'bar' = full strip with a continue CTA (used on game pages) / 'compact' = CTA stripped out (used inside the result modal) */
    variant?: 'bar' | 'compact';
    className?: string;
}

export function DailyProgressBar({ activeMode, variant = 'bar', className = '' }: DailyProgressBarProps) {
    const { modes, totalModes, completedModes, isAllDone, nextMode } = useDailyHub();
    // 🛡️ ใช้ context เดียวกับทั้งแอป แทน <Link>/router.push ตรงๆ — เพื่อให้ทุก navigation
    // จาก Daily Hub วิ่งผ่านวงจร closing → closed → opening ของ Senkaimon เหมือนที่อื่น
    // (ก่อนหน้านี้ตรงนี้ใช้ <Link> ตรงๆ ทำให้ข้าม animation ประตูไปเฉยๆ)
    const { navigate } = useSenkaimon();

    // No daily modes enabled at all (every feature flag off) → render nothing
    if (totalModes === 0) return null;

    const progressPercent = Math.round((completedModes / totalModes) * 100);

    return (
        <div className={`w-full ${className}`}>
            {/* Header: label + segmented pip counter */}
            <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-[12px] leading-none text-[#c8a96e]/60">卍</span>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#eed9c4]/45 font-medium">
                        Daily Missions
                    </span>
                </div>
                <div className="flex items-center gap-[3px]">
                    {Array.from({ length: totalModes }).map((_, i) => (
                        <span
                            key={i}
                            className={`h-[3px] w-3 rounded-full transition-colors duration-300 ${i < completedModes ? 'bg-[#c8a96e]' : 'bg-white/10'
                                }`}
                        />
                    ))}
                    <span className="ml-1.5 text-[10px] font-mono tabular-nums text-[#c8a96e]">
                        {completedModes}/{totalModes}
                    </span>
                </div>
            </div>

            {/* Progress Track */}
            <div className="relative h-[3px] w-full bg-white/[0.06] mb-3.5 overflow-hidden rounded-full">
                <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${isAllDone
                            ? 'bg-gradient-to-r from-[#c8a96e] via-[#e0b980] to-[#4de880] shadow-[0_0_8px_rgba(77,232,128,0.5)]'
                            : 'bg-gradient-to-r from-[#c8a96e] to-[#d47a2a] shadow-[0_0_8px_rgba(200,169,110,0.4)]'
                        }`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* Mode Pills */}
            <div className="flex flex-wrap gap-2">
                {modes.map((m) => {
                    const isCurrent = m.id === activeMode;
                    const isDone = m.played;

                    const pillClasses = isDone
                        ? m.won
                            ? 'border-[#4de880]/40 bg-[#4de880]/[0.08] text-[#4de880]'
                            : 'border-[#e84d4d]/40 bg-[#e84d4d]/[0.08] text-[#e84d4d]'
                        : isCurrent
                            ? 'border-[#c8a96e]/70 bg-[#c8a96e]/[0.12] text-[#c8a96e] shadow-[0_0_10px_rgba(200,169,110,0.25)]'
                            : 'border-white/10 bg-white/[0.02] text-[#eed9c4]/40 hover:border-[#c8a96e]/30 hover:text-[#eed9c4]/70';

                    const content = (
                        <div className={`relative flex items-center gap-1.5 px-2.5 py-1.5 border text-[10px] font-medium tracking-wide transition-all duration-200 select-none ${pillClasses}`}>
                            {isCurrent && !isDone && (
                                <span className="absolute inset-0 border border-[#c8a96e]/40 animate-pulse pointer-events-none" />
                            )}
                            <span className="text-xs leading-none">{m.icon}</span>
                            <span className="uppercase">{m.shortLabel}</span>
                            {isDone && <span className="leading-none">{m.won ? '✓' : '✕'}</span>}
                        </div>
                    );

                    // Already played = status display only, not clickable (avoid confusion about replaying)
                    // Not played yet = clickable, routed through the Senkaimon transition
                    return isDone ? (
                        <div key={m.id}>{content}</div>
                    ) : (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => navigate(m.href)}
                            className="appearance-none bg-transparent border-0 p-0 m-0 text-left cursor-pointer"
                        >
                            {content}
                        </button>
                    );
                })}
            </div>

            {/* CTA — 'bar' variant only. The modal result screen uses DailyHubModalFooter instead. */}
            {variant === 'bar' && (
                isAllDone ? (
                    <div className="mt-3.5 text-center text-[10px] uppercase tracking-[0.25em] text-[#4de880]/80 border border-[#4de880]/20 bg-[#4de880]/[0.05] py-2.5">
                        All Missions Complete 卍
                    </div>
                ) : nextMode && nextMode.id !== activeMode ? (
                    <button
                        type="button"
                        onClick={() => navigate(nextMode.href)}
                        className="mt-3.5 w-full flex items-center justify-center gap-2 border border-[#c8a96e]/40 bg-[#c8a96e]/[0.08] hover:bg-[#c8a96e]/[0.15] hover:shadow-[0_0_14px_rgba(200,169,110,0.25)] py-2.5 text-[10px] uppercase tracking-[0.25em] text-[#c8a96e] transition-all duration-200"
                    >
                        <span>{nextMode.icon}</span>
                        Continue: {nextMode.label}
                    </button>
                ) : null
            )}
        </div>
    );
}