// src/features/song/components/shared/SongGuessTable.tsx
'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SongGuessEntry, SongGuessStatus } from '@/src/features/song/types';

// 🎫 ธีม Win/Loss เท่านั้น — ไม่มีม่วง/เหลืองแบบ character เพราะเพลงมีคำตอบเดียว ไม่มี "เกือบถูก"
const THEME: Record<SongGuessStatus, {
    border: string;
    bg: string;
    glow: string;
    text: string;
    ring: string;
    label: string;
    badgeBg: string;
    stampText: string;
    stampColor: string;
    inkColor: string;
}> = {
    correct: {
        border: 'border-[#2da157]/50',
        bg: 'bg-gradient-to-b from-[#0d2918] via-[#0a2515] to-[#05130b]',
        glow: '0 0 28px rgba(77,232,128,0.22), inset 0 0 26px rgba(77,232,128,0.06)',
        text: 'text-[#4de880]',
        ring: 'ring-1 ring-[#4de880]/20',
        label: 'REISHI MATCH',
        badgeBg: 'bg-[#4de880]',
        stampText: 'VERIFIED',
        stampColor: '#4de880',
        inkColor: 'rgba(77,232,128,0.5)',
    },
    wrong: {
        border: 'border-[#822d2d]/40',
        bg: 'bg-gradient-to-b from-[#1c0808] via-[#160505] to-[#0c0303]',
        glow: '0 0 110px rgba(0,0,0,0.5), inset 0 0 24px rgba(0,0,0,0.5)',
        text: 'text-[#c47a7a]',
        ring: 'ring-1 ring-[#a64747]/15',
        label: 'SIGNAL MISMATCH',
        badgeBg: 'bg-[#a64747]',
        stampText: 'VOID',
        stampColor: '#e05656',
        inkColor: 'rgba(224,86,86,0.55)',
    },
};

// สีของ "รอยปรุ" ตั๋ว — โทนเดียวกับพื้นหลังแอปโดยรวม (near-black) ให้ notch ดูกลืนเป็นรูเจาะจริง
const PERFORATION_COLOR = '#08060b';

// ─── Victory particle burst — เฉพาะตอนทายถูก (ให้ความรู้สึก reward ชัดเจน) ────────────────────

function useVictoryBurst(ref: React.RefObject<HTMLDivElement | null>, fire: boolean) {
    useEffect(() => {
        if (!fire || !ref.current) return;

        const container = ref.current;
        const rect = container.getBoundingClientRect();

        const PARTICLE_COUNT = 24;
        const colors = ['#4de880', '#c8a96e', '#ffffff', '#7ab85a'];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = document.createElement('span');

            const angle = (360 / PARTICLE_COUNT) * i + Math.random() * 14 - 7;
            const distance = 60 + Math.random() * 110;
            const size = 3 + Math.random() * 5;
            const duration = 0.6 + Math.random() * 0.35;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const rad = (angle * Math.PI) / 180;
            const tx = Math.cos(rad) * distance;
            const ty = Math.sin(rad) * distance;

            Object.assign(p.style, {
                position: 'fixed',
                left: `${rect.left + rect.width / 2}px`,
                top: `${rect.top + 24}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: color,
                pointerEvents: 'none',
                zIndex: '9999',
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: '1',
                transition: `transform ${duration}s cubic-bezier(0.22,1,0.36,1), opacity ${duration}s ease-out`,
                boxShadow: `0 0 8px 1px ${color}`,
            });

            document.body.appendChild(p);
            void p.offsetWidth;

            p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
            p.style.opacity = '0';

            setTimeout(() => p.remove(), duration * 1000 + 50);
        }
    }, [fire]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Icons (generic glyphs, ไม่ใช้โลโก้จริงของแบรนด์) ─────────────────────────────────────────

function YoutubeGlyph() {
    return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.6 7.2c-.25-1.1-1.1-1.95-2.2-2.2C17.5 4.5 12 4.5 12 4.5s-5.5 0-7.4.5c-1.1.25-1.95 1.1-2.2 2.2C2 9.1 2 12 2 12s0 2.9.4 4.8c.25 1.1 1.1 1.95 2.2 2.2 1.9.5 7.4.5 7.4.5s5.5 0 7.4-.5c1.1-.25 1.95-1.1 2.2-2.2.4-1.9.4-4.8.4-4.8s0-2.9-.4-4.8ZM10 15.2V8.8L15.5 12 10 15.2Z" />
        </svg>
    );
}

function SpotifyGlyph() {
    return (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.3 14.4a.62.62 0 0 1-.86.21c-2.35-1.44-5.31-1.76-8.8-.96a.63.63 0 0 1-.28-1.22c3.82-.87 7.1-.5 9.73 1.11.3.18.4.57.21.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.65-6.8-2.13-9.98-1.17a.78.78 0 1 1-.45-1.5c3.64-1.1 8.16-.57 11.24 1.33.37.23.49.72.26 1.08Zm.1-2.83C14.98 8.9 9.1 8.7 5.7 9.72a.94.94 0 1 1-.54-1.8c3.9-1.18 10.36-.95 14.44 1.47a.94.94 0 0 1-.98 1.6Z" />
        </svg>
    );
}

// ─── SongGuessCard — Concert Ticket Stub Design ─────────────────────────────────────────────
// 🎫 Signature element: การ์ดถูกออกแบบให้เหมือน "บัตรคอนเสิร์ต/บัตรกำนัลเข้าฟัง Reiatsu Broadcast"
// จริง มีรอยปรุแยก stub, บาร์โค้ดประดับ, เลขที่ตั๋วเรียงตาม attempt, และตราปั๊ม VERIFIED/VOID
// เหมือนพนักงานตรวจตั๋วปั๊มยืนยันเข้างานจริง — ให้ identity ที่ต่างจากการ์ดผลลัพธ์ทั่วไป

export interface SongGuessCardProps extends SongGuessEntry {
    attemptNumber?: number;
}

export function SongGuessCard({ guess, status, isNew, attemptNumber }: SongGuessCardProps) {
    // 🛡️ Layer 1: Component Fallback Level หาก Object หลุดเข้ามาแบบไม่คาดฝัน ให้ Fallback ไปที่ theme ผิด ไม่แครชหน้าจอ
    const theme = THEME[status] || THEME['wrong'];
    const cardRef = useRef<HTMLDivElement>(null);
    useVictoryBurst(cardRef, Boolean(isNew) && status === 'correct');

    const ticketNo = attemptNumber ? String(attemptNumber).padStart(2, '0') : '—';

    return (
        <motion.div
            ref={cardRef}
            id={`row-${guess.id}`}
            layout
            initial={isNew ? { opacity: 0, y: -16, scale: 0.94 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex overflow-hidden border mb-4 font-[family-name:var(--font-display)] ${theme.bg} ${theme.border} ${theme.ring}`}
            style={{ boxShadow: theme.glow }}
        >
            {/* เส้นไฮไลต์บนสุด */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent z-10" />

            {/* Ink Stamp — ปั๊มตรวจตั๋วสไตล์ QC จริง มุมขวาบน หมุนเอียงเบาๆ */}
            <div
                className="absolute top-3 right-3 select-none pointer-events-none z-10"
                style={{ transform: 'rotate(-14deg)' }}
            >
                <div
                    className="px-2 py-0.5 border-2 rounded-sm text-[11px] font-black tracking-[0.25em] uppercase"
                    style={{
                        color: theme.stampColor,
                        borderColor: theme.inkColor,
                        opacity: 0.85,
                        textShadow: `0 0 8px ${theme.inkColor}`,
                    }}
                >
                    {theme.stampText}
                </div>
            </div>

            {/* ── MAIN TICKET BODY ── */}
            <div className="flex-1 min-w-0 p-4 pr-6">
                {/* Status ribbon */}
                <div className="flex items-center gap-1.5 mb-3">
                    <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center text-[11px] text-black font-black shrink-0 ${theme.badgeBg}`}
                        style={{ boxShadow: `0 0 10px ${status === 'correct' ? 'rgba(77,232,128,0.6)' : 'rgba(166,71,71,0.5)'}` }}
                    >
                        {status === 'correct' ? '✓' : '✕'}
                    </span>
                    <span className={`text-[11px] font-bold uppercase tracking-[0.22em] ${theme.text}`}>
                        {theme.label}
                    </span>
                </div>

                {/* Track info */}
                <h3 className="text-base font-bold text-[#f5ebd5] tracking-wide truncate leading-tight pr-16">
                    {guess.title}
                </h3>
                <p className="text-[11px] text-[#eed9c4]/50 mt-1 tracking-wide truncate">
                    {guess.artist}
                    {guess.album && (
                        <span className="text-[#c8a96e]/60"> {'//'} {guess.album.toUpperCase()}</span>
                    )}
                </p>

                {/* Link buttons */}
                {(guess.youtube_url || guess.spotify_url) && (
                    <div className="flex gap-2 mt-3">
                        {guess.youtube_url && (
                            <a
                                href={guess.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-2.5 py-1 border border-[#e83030]/50 hover:border-[#e83030]/70 bg-[#e83030]/5 hover:bg-[#e83030]/10 text-[10px] uppercase tracking-[0.15em] text-[#e8807f] hover:text-[#ff9d9d] transition-all duration-200"
                            >
                                <YoutubeGlyph /> YouTube
                            </a>
                        )}
                        {guess.spotify_url && (
                            <a
                                href={guess.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 px-2.5 py-1 border border-[#4de880]/50 hover:border-[#4de880]/70 bg-[#4de880]/5 hover:bg-[#4de880]/10 text-[10px] uppercase tracking-[0.15em] text-[#8fe8ab] hover:text-[#b5f5cb] transition-all duration-200"
                            >
                                <SpotifyGlyph /> Spotify
                            </a>
                        )}
                    </div>
                )}

                {/* Ticket footer meta — venue-style microcopy */}
                <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-white/25 font-mono">
                        Soul Society Broadcast // Admit One
                    </span>
                </div>
            </div>

            {/* ── PERFORATION DIVIDER (รอยปรุตั๋วฉีก) ── */}
            <div className="relative w-0 shrink-0 my-2">
                <div
                    className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-l-2 border-dashed opacity-30"
                    style={{ borderColor: theme.stampColor }}
                />
                <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
                    style={{ background: PERFORATION_COLOR }}
                />
                <div
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full"
                    style={{ background: PERFORATION_COLOR }}
                />
            </div>

            {/* ── TICKET STUB (barcode + ticket no.) ── */}
            <div className="w-16 shrink-0 flex flex-col items-center justify-between py-3 px-2 bg-black/20">
                <div
                    className="w-full h-8 opacity-40"
                    style={{
                        backgroundImage: `repeating-linear-gradient(90deg, ${theme.stampColor} 0 4px, transparent 4px 5px, ${theme.stampColor} 5px 8px, transparent 8px 10px, ${theme.stampColor} 10px 10px, transparent 10px 11px, ${theme.stampColor} 11px 14px, transparent 14px 17px)`,
                    }}
                />
                <span
                    className="text-[10px] font-mono tracking-[0.3em] uppercase whitespace-nowrap opacity-50"
                    style={{ writingMode: 'vertical-rl', color: theme.stampColor }}
                >
                    Reishi Ticket
                </span>
                <span
                    className="text-lg font-black font-mono leading-none"
                    style={{ color: theme.stampColor, textShadow: `0 0 14px ${theme.inkColor}` }}
                >
                    {ticketNo}
                </span>
            </div>
        </motion.div>
    );
}

// ─── SongGuessTable (export) ─────────────────────────────────────────────────────────────────

export const SongGuessTable = ({ guesses }: { guesses: SongGuessEntry[] }) => {
    if (!guesses.length) return null;

    return (
        <div className="w-full max-w-xl mx-auto py-6 px-4">
            <AnimatePresence initial={true}>
                {guesses.map((entry, idx) => {
                    // 🛡️ Layer 2: Runtime Data Normalizer Level — สกัดโครงสร้างข้อมูลเก่า (Legacy State) 
                    // ถ้าตรวจเจอ .result.title จากเซฟเวอร์ชันเก่า ให้แมปแปลงร่างเป็น .status ณ ตอน Render ทันที
                    const legacyStatus = (entry as any).result?.title;
                    const resolvedStatus: SongGuessStatus =
                        (entry.status === 'correct' || entry.status === 'wrong')
                            ? entry.status
                            : (legacyStatus === 'correct' || legacyStatus === 'wrong' ? legacyStatus : 'wrong');

                    // guesses[0] คือ guess ล่าสุด (unshift) → เลขตั๋วนับจากอันเก่าสุด = 1 ไล่ขึ้น
                    const attemptNumber = guesses.length - idx;

                    return (
                        <SongGuessCard
                            key={entry.guess.id}
                            guess={entry.guess}
                            status={resolvedStatus}
                            isNew={entry.isNew}
                            attemptNumber={attemptNumber}
                        />
                    );
                })}
            </AnimatePresence>
        </div>
    );
};