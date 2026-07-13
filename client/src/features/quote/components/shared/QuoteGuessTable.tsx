// src/features/quote/components/shared/QuoteGuessTable.tsx
'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuoteGuessEntry, QuoteGuessStatus } from '@/src/features/quote/types';
import Image from 'next/image';

// ─────────────────────────────────────────────────────────────
// THEME — the two verdicts are now opposite visual systems, not
// just a recolored ink. Correct = Soul Society seal (gold + jade,
// full-color photo, circular hanko). Wrong = void-stamped record
// (crimson, desaturated photo, torn rectangular stamp, dimmer case).
// ─────────────────────────────────────────────────────────────
const THEME: Record<QuoteGuessStatus, {
    ink: string;
    accent: string;
    stampText: string;
    kanji: string;
    label: string;
    tint: string;
    border: string;
    glow: string;
    photoFilter: string;
    rotate: number;
    borderWidth: string;
}> = {
    correct: {
        ink: '#8fd66a',
        accent: '#d4b876',
        stampText: 'VERIFIED',
        kanji: '合',
        label: 'Testimony Confirmed',
        tint: 'linear-gradient(100deg, rgba(143,214,106,0.16), rgba(212,184,118,0.05) 45%, rgba(0,0,0,0) 75%)',
        border: 'rgba(143,214,106,0.55)',
        glow: '0 0 0 1px rgba(143,214,106,0.15), 0 0 28px rgba(143,214,106,0.18), 0 0 4px rgba(212,184,118,0.35)',
        photoFilter: 'grayscale(0%) saturate(1.2) contrast(1.05)',
        rotate: -7,
        borderWidth: '1.5px',
    },
    wrong: {
        ink: '#c85050',
        accent: '#6b6258',
        stampText: 'REJECTED',
        kanji: '否',
        label: 'Record Mismatch',
        tint: 'linear-gradient(100deg, rgba(200,80,80,0.09), rgba(0,0,0,0) 60%)',
        border: 'rgba(90,84,72,0.4)',
        glow: 'inset 0 0 24px rgba(0,0,0,0.55), 0 0 10px rgba(200,80,80,0.06)',
        photoFilter: 'grayscale(75%) saturate(0.65) brightness(0.85)',
        rotate: 5,
        borderWidth: '1px',
    },
};

// Particle burst — only fires for confirmed testimonies.
function useVerdictBurst(ref: React.RefObject<HTMLDivElement | null>, fire: boolean) {
    useEffect(() => {
        if (!fire || !ref.current) return;
        const container = ref.current;
        const rect = container.getBoundingClientRect();
        const colors = ['#8fd66a', '#d4b876', '#ffffff'];

        for (let i = 0; i < 18; i++) {
            const p = document.createElement('span');
            const angle = (360 / 18) * i + Math.random() * 12 - 6;
            const distance = 55 + Math.random() * 85;
            const size = 2 + Math.random() * 4;
            const duration = 0.5 + Math.random() * 0.3;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const rad = (angle * Math.PI) / 180;

            Object.assign(p.style, {
                position: 'fixed',
                left: `${rect.left + 40}px`,
                top: `${rect.top + rect.height / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                background: color,
                pointerEvents: 'none',
                zIndex: '9999',
                transform: 'translate(-50%,-50%) scale(1)',
                opacity: '1',
                transition: `transform ${duration}s cubic-bezier(0.22,1,0.36,1), opacity ${duration}s ease-out`,
            });
            document.body.appendChild(p);
            void p.offsetWidth;
            p.style.transform = `translate(calc(-50% + ${Math.cos(rad) * distance}px), calc(-50% + ${Math.sin(rad) * distance}px)) scale(0)`;
            p.style.opacity = '0';
            setTimeout(() => p.remove(), duration * 1000 + 50);
        }
    }, [fire]); // eslint-disable-line react-hooks/exhaustive-deps
}

export interface QuoteGuessCardProps extends QuoteGuessEntry {
    attemptNumber?: number;
}

// Seal / stamp — correct gets a hanko-style circular seal, wrong gets
// a jagged, double-struck rejection stamp. Different shapes read
// instantly at a glance, before color is even processed.
function VerdictSeal({ status }: { status: QuoteGuessStatus }) {
    const theme = THEME[status] || THEME.wrong;

    if (status === 'correct') {
        return (
            <div
                className="relative shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center select-none"
                style={{
                    border: `2px solid ${theme.ink}`,
                    boxShadow: `0 0 14px ${theme.ink}66, 0 0 2px ${theme.accent}`,
                    transform: `rotate(${theme.rotate}deg)`,
                    background: 'radial-gradient(circle, rgba(143,214,106,0.08), transparent 70%)',
                }}
            >
                <span className="absolute inset-[3px] rounded-full" style={{ border: `1px solid ${theme.accent}66` }} />
                <span className="text-lg font-black leading-none" style={{ color: theme.ink }}>
                    {theme.kanji}
                </span>
                <span className="text-[6px] font-bold tracking-[0.14em] uppercase mt-0.5" style={{ color: theme.accent }}>
                    {theme.stampText}
                </span>
            </div>
        );
    }

    return (
        <div className="relative shrink-0 w-14 h-14 flex items-center justify-center select-none">
            {/* ghost double-strike, offset, for a hurried rejection-stamp feel */}
            <div
                className="absolute w-12 h-9 opacity-25"
                style={{
                    border: `1.5px solid ${theme.ink}`,
                    clipPath: 'polygon(4% 0%, 100% 6%, 96% 100%, 0% 92%)',
                    transform: `rotate(${theme.rotate + 5}deg) translate(3px, 2px)`,
                }}
            />
            <div
                className="relative w-12 h-9 flex flex-col items-center justify-center"
                style={{
                    border: `1.5px solid ${theme.ink}`,
                    clipPath: 'polygon(2% 4%, 98% 0%, 100% 96%, 4% 100%)',
                    transform: `rotate(${theme.rotate}deg)`,
                    background: 'rgba(200,80,80,0.04)',
                }}
            >
                <span className="text-sm font-black leading-none" style={{ color: theme.ink }}>
                    {theme.kanji}
                </span>
                <span className="text-[5.5px] font-bold tracking-[0.1em] uppercase" style={{ color: theme.ink }}>
                    {theme.stampText}
                </span>
            </div>
        </div>
    );
}

// 🗂️ Case Record Card — ID-photo frame มุมเหลี่ยม + field labels แบบเอกสารราชการ
// แทนที่จะเป็น ticket-stub ของ song, ใบนี้คือ "แผ่นบันทึกการตรวจสอบพยาน" แบบ Central 46
export function QuoteGuessCard({ guess, status, isNew, attemptNumber }: QuoteGuessCardProps) {
    const theme = THEME[status] || THEME.wrong;
    const isCorrect = status === 'correct';
    const cardRef = useRef<HTMLDivElement>(null);
    useVerdictBurst(cardRef, Boolean(isNew) && isCorrect);

    const recordNo = attemptNumber ? String(attemptNumber).padStart(3, '0') : '—';

    const initial = isNew
        ? isCorrect
            ? { opacity: 0, y: -14, scale: 0.94 }
            : { opacity: 0, x: 0, scale: 1 }
        : false;

    const animate = isNew
        ? isCorrect
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 1, x: [0, -7, 7, -4, 4, 0], y: 0, scale: 1 }
        : { opacity: 1, y: 0, x: 0, scale: 1 };

    const transition = isCorrect
        ? { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }
        : { duration: 0.5, ease: 'easeOut' as const };

    return (
        <motion.div
            ref={cardRef}
            id={`quote-row-${guess.id}`}
            layout
            initial={initial}
            animate={animate}
            transition={transition}
            className="relative flex mb-3 overflow-hidden bg-[#0a0a0c] font-[family-name:var(--font-display)]"
            style={{
                border: `${theme.borderWidth} solid ${theme.border}`,
                boxShadow: theme.glow,
                opacity: isCorrect ? 1 : 0.88,
            }}
        >
            {/* status wash across the whole card — the fastest signal, read before anything else */}
            <div className="pointer-events-none absolute inset-0" style={{ background: theme.tint }} />

            {/* top accent bar */}
            <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                    background: isCorrect
                        ? `linear-gradient(90deg, ${theme.ink}, ${theme.accent}, transparent)`
                        : `repeating-linear-gradient(90deg, ${theme.ink} 0px, ${theme.ink} 6px, transparent 6px, transparent 12px)`,
                    opacity: isCorrect ? 0.9 : 0.35,
                }}
            />

            {/* Left ledger strip — record number, vertical */}
            <div
                className="relative w-8 shrink-0 flex items-center justify-center border-r z-10"
                style={{ borderColor: '#1a1816', background: 'rgba(0,0,0,0.25)' }}
            >
                <span
                    className="text-[11px] font-mono tracking-[0.2em] uppercase"
                    style={{ writingMode: 'vertical-rl', color: isCorrect ? `${theme.ink}cc` : '#5a5448' }}
                >
                    REC {recordNo}
                </span>
            </div>

            {/* ID photo — square corner brackets, ไม่ปัดมุม เพื่อความเป็นทางการแบบเอกสารราชการ */}
            <div
                className="relative w-16 h-16 m-3 shrink-0 z-10"
                style={{ border: `1px solid ${isCorrect ? theme.ink + '99' : '#2a2620'}` }}
            >
                <Image
                    src={`/api/asset/character/${guess.id}`}
                    alt={guess.name}
                    className="w-full h-full object-cover"
                    style={{ filter: theme.photoFilter }}
                    fill
                    sizes="w-16 h-16"
                />
                {/* corner brackets */}
                {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((pos, i) => (
                    <span
                        key={i}
                        className={`absolute w-2 h-2 ${pos}`}
                        style={{ borderColor: theme.ink, opacity: isCorrect ? 0.9 : 0.5 }}
                    />
                ))}
                {/* void strike across the photo for a rejected record */}
                {!isCorrect && (
                    <div
                        className="absolute left-[-8%] top-1/2 w-[116%] h-[2px] -translate-y-1/2"
                        style={{ background: theme.ink, opacity: 0.65, transform: 'translateY(-50%) rotate(-22deg)' }}
                    />
                )}
                {/* small confirmation badge for a verified record */}
                {isCorrect && (
                    <div
                        className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: '#0a0a0c', border: `1.5px solid ${theme.ink}`, boxShadow: `0 0 8px ${theme.ink}88` }}
                    >
                        <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
                            <path d="M4 10l4 4 8-9" stroke={theme.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Field content */}
            <div className="relative z-10 flex-1 min-w-0 py-3 pr-4 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] tracking-[0.24em] uppercase text-[#5a5448] mb-1">Subject Name</p>
                        <h3
                            className="text-sm font-bold uppercase tracking-wide truncate"
                            style={{ color: isCorrect ? '#f0e9dd' : '#b8ac9e' }}
                        >
                            {guess.name}
                        </h3>
                        <p className="text-[12px] mt-0.5 truncate font-black" style={{ color: isCorrect ? '#a89a86' : '#6b6258' }}>
                            {guess.affiliation}
                        </p>
                    </div>

                    <VerdictSeal status={status} />
                </div>

                <div className="mt-2 pt-2 border-t border-dashed flex items-center justify-between" style={{ borderColor: '#1a1816' }}>
                    <span className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: theme.ink }}>
                        {theme.label}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em]" style={{ color: '#3d3a34' }}>
                        Central 46 Archive
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export const QuoteGuessTable = ({ guesses }: { guesses: QuoteGuessEntry[] }) => {
    if (!guesses.length) return null;

    return (
        <div className="w-full max-w-xl mx-auto py-6 px-4">
            <p className="text-[11px] tracking-[0.32em] uppercase text-center mb-4" style={{ color: '#5a5448' }}>
                § Witness Verification Ledger
            </p>
            <AnimatePresence initial={true}>
                {guesses.map((entry, idx) => (
                    <QuoteGuessCard
                        key={entry.guess.id}
                        guess={entry.guess}
                        status={entry.status}
                        isNew={entry.isNew}
                        attemptNumber={guesses.length - idx}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
};