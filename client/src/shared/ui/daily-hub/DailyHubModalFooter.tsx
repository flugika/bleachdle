// src/shared/ui/daily-hub/DailyHubModalFooter.tsx
"use client";

import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { DailyProgressBar } from './DailyProgressBar';

interface DailyHubModalFooterProps {
    activeMode: string;
}

export function DailyHubModalFooter({ activeMode }: DailyHubModalFooterProps) {
    const { isAllDone, nextMode } = useDailyHub();
    const { navigate } = useSenkaimon();

    return (
        <div className="relative w-full max-w-xl mx-auto mt-4 p-5 border border-[#c8a96e]/25 bg-[#060608]/95 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.9),inset_0_0_60px_rgba(0,0,0,0.8)] group/footer">

            {/* 💠 PREMIUM SQUARED CORNER ACCENTS */}
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#c8a96e]/60" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#c8a96e]/60" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#c8a96e]/60" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#c8a96e]/60" />

            <span className="absolute top-1 left-1 w-[2px] h-[2px] bg-[#c8a96e]/40" />
            <span className="absolute top-1 right-1 w-[2px] h-[2px] bg-[#c8a96e]/40" />
            <span className="absolute bottom-1 left-1 w-[2px] h-[2px] bg-[#c8a96e]/40" />
            <span className="absolute bottom-1 right-1 w-[2px] h-[2px] bg-[#c8a96e]/40" />

            <DailyProgressBar activeMode={activeMode} variant="compact" />

            <div className="mt-5 border-t border-[#c8a96e]/10 pt-4">
                {isAllDone ? (
                    <div className="relative w-full text-center py-3.5 border border-white/10 bg-white/[0.02] cursor-default shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]">
                        <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-white/20" />
                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-white/20" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">
                            RECORD // SEALED 卍
                        </span>
                    </div>
                ) : nextMode ? (
                    <button
                        type="button"
                        onClick={() => navigate(nextMode.href)}
                        className="group relative w-full border border-[#c8a96e]/40 bg-gradient-to-b from-[#c8a96e]/[0.02] to-[#c8a96e]/[0.08] hover:border-[#c8a96e] hover:bg-[#c8a96e]/[0.1] py-4 transition-all duration-300 overflow-hidden shadow-[inset_0_0_20px_rgba(200,169,110,0.05)] hover:shadow-[0_0_20px_rgba(200,169,110,0.2),inset_0_0_30px_rgba(200,169,110,0.15)]"
                    >
                        {/* Tactical Crosshairs */}
                        <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#c8a96e]/80" />
                        <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#c8a96e]/80" />
                        <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#c8a96e]/80" />
                        <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#c8a96e]/80" />

                        {/* Ghostly Text Watermark */}
                        <span className="pointer-events-none absolute -right-2 -top-4 text-[50px] leading-none font-black text-[#c8a96e] opacity-[0.03] select-none tracking-tighter">
                            続
                        </span>

                        {/* Sweeping Shimmer Line */}
                        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-[#f5e6cc]/10 to-transparent transition-transform duration-[1500ms] ease-out" />

                        <div className="relative flex items-center justify-center gap-3">
                            <span className="text-[15px] leading-none text-[#c8a96e] filter drop-shadow-[0_0_8px_rgba(200,169,110,0.8)] group-hover:scale-110 transition-transform duration-300">{nextMode.icon}</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#f5e6cc] pt-0.5 group-hover:text-white transition-colors duration-300">
                                Initialize: <span className="text-[#c8a96e] tracking-[0.4em] ml-1">{nextMode.label}</span>
                            </span>
                        </div>
                    </button>
                ) : null}
            </div>
        </div>
    );
}