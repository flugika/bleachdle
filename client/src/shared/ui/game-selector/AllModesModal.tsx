// src/shared/ui/AllModesModal.tsx
"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { Modal } from '@/src/shared/ui/modal';
import { BL_MODES_METADATA, DIMENSION_ACCENT, MODE_ACCENT, MODE_ORDER } from '@/src/config/mode';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import type { Dimension, SubFeatureKey } from '@/src/config/mode';

interface AllModesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 🧭 AllModesModal — ทางลัดเดียวที่พาไปได้ทุก dimension (daily/unlimited) × ทุกโหมดเกม
 * ที่ปลดล็อกแล้ว เลือก dimension ก่อน (sliding toggle) แล้วค่อยเลือกโหมด (row list)
 *
 * 🛡️ ใช้ <Modal> ตัวกลางของโปรเจกต์เป็น shell ทั้งหมด — ทั้ง overlay, click-outside-to-close,
 * มุมกรอบ premium (showCorners) และปุ่มปิด (showClose) ยกให้ Modal จัดการเองล้วนๆ แล้ว
 * เนื้อหาข้างในเป็นของ AllModesModal เอง (header, dimension toggle, mode list) ผ่าน children
 */
export function AllModesModal({ isOpen, onClose }: AllModesModalProps) {
    const { navigate } = useSenkaimon();
    const pathname = usePathname();
    const [dimension, setDimension] = useState<Dimension>(
        pathname.startsWith('/unlimited') ? 'unlimited' : 'daily'
    );
    const [hoveredMode, setHoveredMode] = useState<SubFeatureKey | null>(null);

    // 🛡️ <Modal> ของโปรเจกต์ปิดตอนคลิกนอกกล่องให้อยู่แล้ว (mousedown listener ใน modal.tsx)
    // แต่ยังไม่มี ESC + scroll lock ในตัวมันเอง — เสริมสองอย่างนี้เฉพาะจุดที่ AllModesModal ต้องใช้
    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen, onClose]);

    const handleSelect = (modeId: SubFeatureKey) => {
        onClose();
        navigate(`/${dimension}/${modeId}`);
    };

    const unlockedModes = MODE_ORDER.filter((modeId) => FEATURE_FLAGS[dimension][modeId]);
    const dimAccent = DIMENSION_ACCENT[dimension];

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg" variant="default">
            {/* faint inner vignette, tinted by the active dimension's accent instead of a flat gold wash */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-[background] duration-500"
                style={{ background: `radial-gradient(ellipse at top, ${dimAccent.glow} 0%, transparent 60%)` }}
            />

            {/* Header */}
            <div className="relative text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-1">
                    <span className="h-px w-8 bg-gradient-to-r from-transparent to-[#c8a96e]/50" />
                    <span
                        className="text-lg leading-none transition-[color,filter] duration-500"
                        style={{ color: `${dimAccent.base}cc`, filter: `drop-shadow(0 0 14px ${dimAccent.glow})` }}
                    >
                        全
                    </span>
                    <span className="h-px w-8 bg-gradient-to-l from-transparent to-[#c8a96e]/50" />
                </div>
                {/* หัวเรื่องยังเป็นทอง-ขาว-ครีมเสมอ (คงเอกลักษณ์หลัก) ส่วนสีที่ขยับตาม dimension อยู่ที่ kanji และ toggle */}
                <h2 className="text-lg md:text-xl font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white via-[#eed9c4] to-[#c8a96e] drop-shadow-[0_4px_16px_rgba(200,169,110,0.3)]"
                    style={{ fontFamily: "'Cinzel', serif" }}>
                    Select Your Path
                </h2>
                <p className="mt-1.5 text-[12px] uppercase tracking-[0.3em] text-[#eed9c4]/40">
                    Choose Dimension &amp; Discipline
                </p>
            </div>

            {/* Dimension toggle — sliding pill recolors itself: warm gold/ember for Daily (日, the sun),
                cool Quincy blue for Unlimited (無, the void) */}
            <div className="relative grid grid-cols-2 gap-0 mb-2.5 border border-white/10 bg-black/40 p-1 rounded-sm overflow-hidden">
                <div
                    className={`absolute inset-y-1 w-[calc(50%-6px)] rounded-[4px] border transition-all duration-300 ease-out ${dimension === 'unlimited' ? 'translate-x-[calc(100%+10px)]' : 'translate-x-0'
                        }`}
                    style={{
                        background: `linear-gradient(180deg, ${dimAccent.base}4d, ${dimAccent.base}0d)`,
                        borderColor: `${dimAccent.base}8c`,
                        boxShadow: `0 0 20px ${dimAccent.glow}`,
                    }}
                >
                    <span
                        className="absolute inset-0 -translate-x-full animate-[shine_2.6s_ease-in-out_infinite]"
                        style={{ background: `linear-gradient(90deg, transparent, ${dimAccent.bright}26, transparent)` }}
                    />
                </div>
                {(Object.keys(DIMENSION_ACCENT) as Dimension[]).map((dim) => {
                    const meta = DIMENSION_ACCENT[dim];
                    const isActive = dimension === dim;
                    return (
                        <button
                            key={dim}
                            type="button"
                            onClick={() => setDimension(dim)}
                            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 text-[11px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 cursor-pointer ${isActive ? 'text-[#eed9c4]' : 'text-[#eed9c4]/35 hover:text-[#eed9c4]/65'
                                }`}
                        >
                            <span
                                className="text-sm leading-none transition-all duration-300"
                                style={isActive ? { color: meta.bright, filter: `drop-shadow(0 0 8px ${meta.glow})` } : { color: 'rgba(238,217,196,0.3)' }}
                            >
                                {meta.kanji}
                            </span>
                            {meta.label}
                        </button>
                    );
                })}
            </div>
            <p className={`text-center text-[11px] uppercase tracking-[0.22em] mb-5 transition-colors duration-500 ${dimAccent.descTint}`}>
                {dimAccent.desc}
            </p>

            {/* Mode list — each discipline carries its own Bleach-palette color (Quincy blue, ember orange,
                ice cyan, crimson, indigo), staggered fade-in-up so the list feels orchestrated, not dumped */}
            <div className="relative flex flex-col gap-2">
                {unlockedModes.length === 0 ? (
                    <div className="border border-white/10 bg-white/[0.02] py-6 text-center">
                        <p className="text-[12px] uppercase tracking-[0.2em] text-[#eed9c4]/50">
                            No disciplines unlocked in this dimension yet
                        </p>
                    </div>
                ) : (
                    unlockedModes.map((modeId, i) => {
                        const cfg = BL_MODES_METADATA[modeId];
                        const isCurrent = pathname === `/${dimension}/${modeId}`;
                        const accent = MODE_ACCENT[modeId];
                        const isLit = isCurrent || hoveredMode === modeId;

                        return (
                            <button
                                key={modeId}
                                type="button"
                                onClick={() => handleSelect(modeId)}
                                onMouseEnter={() => setHoveredMode(modeId)}
                                onMouseLeave={() => setHoveredMode(null)}
                                style={{ animationDelay: `${i * 45}ms` }}
                                className={`group relative w-full flex items-center gap-4 p-3.5 border overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both cursor-pointer ${isCurrent
                                    ? 'bg-gradient-to-r from-white/[0.05] via-white/[0.015] to-transparent -translate-y-0.5'
                                    : 'border-white/10 bg-white/[0.02] hover:-translate-y-0.5'
                                    }`}
                            >
                                {/* กรอบ + shadow ของทั้งแถวย้อมด้วยสีประจำ mode ตอน active/hover, ปกติเป็นกลางๆ */}
                                <span
                                    className="absolute inset-0 border pointer-events-none transition-all duration-300"
                                    style={isLit
                                        ? { borderColor: `${accent.base}70`, boxShadow: `0 14px 210px rgba(0,0,0,0.45), 0 0 24px ${accent.glow}` }
                                        : { borderColor: 'rgba(255,255,255,0.1)' }}
                                />

                                {/* emblem stripe ซ้ายมือ — เหมือนสี Sternritter ประจำตัวแต่ละ discipline */}
                                <span
                                    className="absolute left-0 top-0 bottom-0 w-[5px] transition-opacity duration-300"
                                    style={{ background: `linear-gradient(180deg, ${accent.bright}, ${accent.base})`, opacity: isLit ? 1 : 0.35 }}
                                />

                                {/* light-sweep on hover */}
                                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/[0.06] to-transparent pointer-events-none" />

                                <span
                                    className="relative flex items-center justify-center w-11 h-11 shrink-0 border text-lg transition-all duration-300 ml-1"
                                    style={isLit
                                        ? { borderColor: `${accent.base}a6`, background: `linear-gradient(180deg, ${accent.base}33, ${accent.base}0d)`, color: accent.bright, boxShadow: `0 0 18px ${accent.glow}` }
                                        : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', color: `${accent.base}99` }}
                                >
                                    {cfg.symbol}
                                </span>

                                <span className="relative flex flex-col items-start text-left flex-1 min-w-0">
                                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#eed9c4]">
                                        {cfg.title}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#eed9c4]/35 mt-0.5">
                                        // {cfg.id}
                                    </span>
                                </span>

                                {isCurrent ? (
                                    <span
                                        className="relative flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] px-2 py-1 shrink-0 border"
                                        style={{ color: dimAccent.bright, borderColor: `${dimAccent.base}70`, background: `${dimAccent.base}1a` }}
                                    >
                                        <span
                                            className="w-1 h-1 rounded-full animate-pulse"
                                            style={{ background: dimAccent.bright, boxShadow: `0 0 8px ${dimAccent.glow}` }}
                                        />
                                        Active
                                    </span>
                                ) : (
                                    <span
                                        className="relative shrink-0 text-sm transition-all duration-300 group-hover:translate-x-1"
                                        style={{ color: hoveredMode === modeId ? accent.bright : 'rgba(200,169,110,0.25)' }}
                                    >
                                        →
                                    </span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </Modal>
    );
}