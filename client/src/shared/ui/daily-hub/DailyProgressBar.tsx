// src/shared/ui/daily-hub/DailyProgressBar.tsx
"use client";

import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';

interface DailyProgressBarProps {
    activeMode?: string;
    variant?: 'bar' | 'compact';
    className?: string;
}

export function DailyProgressBar({ activeMode, variant = 'bar', className = '' }: DailyProgressBarProps) {
    const { modes, totalModes, completedModes, isAllDone, nextMode } = useDailyHub();
    const { navigate } = useSenkaimon();

    if (totalModes === 0) return null;

    const progressPercent = Math.round((completedModes / totalModes) * 100);

    return (
        <div className={`w-full ${className}`}>
            {/* 🎛️ HEADER: TACTICAL HUD */}
            <div className="flex items-center justify-between mb-3 border-b border-[#c8a96e]/15 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[12px] leading-none text-[#c8a96e]/60 animate-pulse">卍</span>
                    <span className="text-[10px] uppercase tracking-[0.4em] text-[#eed9c4]/60 font-bold">
                        Seireitei Operations
                    </span>
                </div>
                <div className="flex items-center gap-[4px]">
                    <div className="flex gap-[3px] mr-1">
                        {Array.from({ length: totalModes }).map((_, i) => (
                            <span
                                key={i}
                                className={`h-[5px] w-3 transition-all duration-500 ${i < completedModes
                                        ? 'bg-[#c8a96e] shadow-[0_0_8px_rgba(200,169,110,0.6)]'
                                        : 'bg-white/[0.05] border border-white/[0.05]'
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-[10px] font-mono tracking-widest font-bold tabular-nums text-[#c8a96e]">
                        {completedModes}/{totalModes}
                    </span>
                </div>
            </div>

            {/* 📏 PROGRESS TRACK: RAZOR THIN LINE */}
            <div className="relative h-[2px] w-full bg-white/[0.05] mb-4 overflow-hidden">
                <div
                    className={`h-full transition-all duration-1000 ease-out ${isAllDone
                            ? 'bg-[#4de880] shadow-[0_0_12px_rgba(77,232,128,1)]'
                            : 'bg-[#c8a96e] shadow-[0_0_10px_rgba(200,169,110,0.8)]'
                        }`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>

            {/* ⛩️ GATE SELECTOR: DYNAMIC COLUMNS (Auto-fits to number of active modes) */}
            <div
                className="grid gap-1.5 w-full"
                style={{ gridTemplateColumns: `repeat(${totalModes}, minmax(0, 1fr))` }}
            >
                {modes.map((m) => {
                    const isCurrent = m.id === activeMode;
                    const isDone = m.played;

                    // 🔲 Mechanical State Styling
                    const pillClasses = isDone
                        ? m.won
                            ? 'border-[#4de880]/30 bg-[#4de880]/[0.05] text-[#4de880] shadow-[inset_0_0_12px_rgba(77,232,128,0.03)] opacity-95'
                            : 'border-[#e84d4d]/25 bg-[#e84d4d]/[0.03] text-[#e84d4d]/70 opacity-60'
                        : isCurrent
                            ? 'border-[#c8a96e] bg-[#c8a96e]/[0.1] text-[#f5e6cc] shadow-[0_0_15px_rgba(200,169,110,0.15),inset_0_0_20px_rgba(200,169,110,0.1)] z-10'
                            : 'border-white/[0.08] bg-black/40 text-[#eed9c4]/35 hover:bg-[#c8a96e]/[0.03] transition-all duration-300';

                    const content = (
                        <div className={`relative flex flex-col items-center justify-center py-2.5 border transition-all duration-500 group select-none overflow-hidden ${pillClasses}`}>

                            {/* 🎯 KINETIC CORNER BRACKETS (Expands on Hover) */}
                            <span className={`absolute top-0 left-0 w-1.5 h-1.5 border-t border-l transition-all duration-300 ease-out ${isCurrent && !isDone ? 'border-[#c8a96e] -translate-x-[1px] -translate-y-[1px]' : 'border-current opacity-30 group-hover:w-2 group-hover:h-2 group-hover:-translate-x-[1px] group-hover:-translate-y-[1px] group-hover:border-[#c8a96e] group-hover:opacity-100'}`} />
                            <span className={`absolute top-0 right-0 w-1.5 h-1.5 border-t border-r transition-all duration-300 ease-out ${isCurrent && !isDone ? 'border-[#c8a96e] translate-x-[1px] -translate-y-[1px]' : 'border-current opacity-30 group-hover:w-2 group-hover:h-2 group-hover:translate-x-[1px] group-hover:-translate-y-[1px] group-hover:border-[#c8a96e] group-hover:opacity-100'}`} />
                            <span className={`absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l transition-all duration-300 ease-out ${isCurrent && !isDone ? 'border-[#c8a96e] -translate-x-[1px] translate-y-[1px]' : 'border-current opacity-30 group-hover:w-2 group-hover:h-2 group-hover:-translate-x-[1px] group-hover:translate-y-[1px] group-hover:border-[#c8a96e] group-hover:opacity-100'}`} />
                            <span className={`absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r transition-all duration-300 ease-out ${isCurrent && !isDone ? 'border-[#c8a96e] translate-x-[1px] translate-y-[1px]' : 'border-current opacity-30 group-hover:w-2 group-hover:h-2 group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:border-[#c8a96e] group-hover:opacity-100'}`} />

                            {/* 💫 SCANNING LASER EFFECT ON HOVER */}
                            {!isDone && !isCurrent && (
                                <span className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c8a96e]/10 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-700 ease-in-out" />
                            )}

                            {/* Active Targeting Glow */}
                            {isCurrent && !isDone && (
                                <span className="absolute inset-0 border border-[#c8a96e]/20 animate-pulse pointer-events-none" />
                            )}

                            {/* Icon Symbol */}
                            <span className={`relative text-[13px] leading-none mb-1.5 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transition-all duration-300 ease-out ${isCurrent && !isDone ? 'scale-110 text-[#c8a96e]' : 'group-hover:scale-125 group-hover:text-[#c8a96e]'}`}>
                                {m.icon}
                            </span>

                            {/* Shorthand label (Expands letter spacing on hover) */}
                            <span className={`relative text-[9px] font-bold font-mono uppercase transition-all duration-300 ease-out ${isCurrent && !isDone ? 'tracking-[0.3em] text-[#c8a96e]' : 'tracking-[0.15em] group-hover:tracking-[0.3em] group-hover:text-[#f5e6cc]'}`}>
                                {m.shortLabel}
                            </span>

                            {/* Strict Square Result Stamp */}
                            {isDone && (
                                <div className="absolute bottom-0 left-0 right-0 flex justify-center">
                                    <span className={`h-[2px] w-4 ${m.won ? 'bg-[#4de880] shadow-[0_0_6px_rgba(77,232,128,0.8)]' : 'bg-[#e84d4d] opacity-50'}`} />
                                </div>
                            )}
                        </div>
                    );

                    return isDone ? (
                        <div key={m.id} className="w-full">{content}</div>
                    ) : (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => navigate(m.href)}
                            className="appearance-none bg-transparent border-0 p-0 m-0 w-full text-left cursor-pointer focus:outline-none"
                        >
                            {content}
                        </button>
                    );
                })}
            </div>

            {/* 🚀 CTA — STRICT RECTANGULAR BAR VARIANT */}
            {variant === 'bar' && (
                isAllDone ? (
                    <div className="relative mt-5 border border-[#4de880]/30 bg-[#4de880]/[0.03] text-center py-3 shadow-[inset_0_0_20px_rgba(77,232,128,0.05)]">
                        <span className="absolute top-0 left-0 w-1 h-1 bg-[#4de880]/60" />
                        <span className="absolute top-0 right-0 w-1 h-1 bg-[#4de880]/60" />
                        <span className="absolute bottom-0 left-0 w-1 h-1 bg-[#4de880]/60" />
                        <span className="absolute bottom-0 right-0 w-1 h-1 bg-[#4de880]/60" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#4de880]">
                            SYSTEM // ALL MISSIONS COMPLETE 卍
                        </span>
                    </div>
                ) : nextMode && nextMode.id !== activeMode ? (
                    <button
                        type="button"
                        onClick={() => navigate(nextMode.href)}
                        className="group relative mt-5 w-full border border-[#c8a96e]/40 bg-black/40 hover:border-[#c8a96e] hover:bg-[#c8a96e]/[0.05] py-3.5 transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] hover:shadow-[inset_0_0_30px_rgba(200,169,110,0.1),0_0_15px_rgba(200,169,110,0.15)]"
                    >
                        {/* Hover Radar Sweep */}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c8a96e]/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1200ms] ease-in-out" />

                        <span className="absolute top-1 inset-x-2 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/20 to-transparent" />
                        <span className="absolute bottom-1 inset-x-2 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/20 to-transparent" />

                        <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#c8a96e]" />
                        <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#c8a96e]" />

                        <span className="text-[13px] leading-none text-[#c8a96e] filter drop-shadow-[0_0_5px_rgba(200,169,110,0.5)] group-hover:scale-110 transition-transform duration-300">
                            {nextMode.icon}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#f5e6cc] group-hover:text-white transition-colors duration-300">
                            <span className="text-[#c8a96e]/60 mr-2 group-hover:opacity-100 transition-opacity">►</span>
                            Continue: <span className="text-[#c8a96e] tracking-[0.4em] ml-1">{nextMode.label}</span>
                        </span>
                    </button>
                ) : null
            )}
        </div>
    );
}