// src/features/quote/components/shared/QuoteGuessTable.tsx
'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QuoteGuessEntry, QuoteGuessStatus } from '@/src/features/quote/types';

const THEME: Record<QuoteGuessStatus, {
    ink: string;
    glow: string;
    stampText: string;
    label: string;
    tint: string;
}> = {
    correct: {
        ink: '#7ab85a',
        glow: '0 0 24px rgba(122,184,90,0.16)',
        stampText: 'VERIFIED',
        label: 'Testimony Confirmed',
        tint: 'rgba(122,184,90,0.05)',
    },
    wrong: {
        ink: '#c85050',
        glow: '0 0 18px rgba(0,0,0,0.4)',
        stampText: 'DISCREPANCY',
        label: 'Record Mismatch',
        tint: 'rgba(200,80,80,0.04)',
    },
};

function useVerdictBurst(ref: React.RefObject<HTMLDivElement | null>, fire: boolean) {
    useEffect(() => {
        if (!fire || !ref.current) return;
        const container = ref.current;
        const rect = container.getBoundingClientRect();
        const colors = ['#7ab85a', '#c8a96e', '#ffffff'];

        for (let i = 0; i < 16; i++) {
            const p = document.createElement('span');
            const angle = (360 / 16) * i + Math.random() * 12 - 6;
            const distance = 50 + Math.random() * 80;
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

// 🗂️ Case Record Card — ID-photo frame มุมเหลี่ยม + field labels แบบเอกสารราชการ
// แทนที่จะเป็น ticket-stub ของ song, ใบนี้คือ "แผ่นบันทึกการตรวจสอบพยาน" แบบ Central 46
export function QuoteGuessCard({ guess, status, isNew, attemptNumber }: QuoteGuessCardProps) {
    const theme = THEME[status] || THEME.wrong;
    const cardRef = useRef<HTMLDivElement>(null);
    useVerdictBurst(cardRef, Boolean(isNew) && status === 'correct');

    const recordNo = attemptNumber ? String(attemptNumber).padStart(3, '0') : '—';

    return (
        <motion.div
            ref={cardRef}
            id={`quote-row-${guess.id}`}
            layout
            initial={isNew ? { opacity: 0, y: -10 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex mb-3 overflow-hidden bg-[#0a0a0c] border"
            style={{ borderColor: '#272420', boxShadow: theme.glow }}
        >
            {/* Left ledger strip — record number, vertical */}
            <div
                className="w-8 shrink-0 flex items-center justify-center border-r"
                style={{ borderColor: '#1a1816', background: theme.tint }}
            >
                <span
                    className="text-[11px] font-mono tracking-[0.2em] uppercase"
                    style={{ writingMode: 'vertical-rl', color: '#5a5448' }}
                >
                    REC {recordNo}
                </span>
            </div>

            {/* ID photo — square corner brackets, ไม่ปัดมุม เพื่อความเป็นทางการแบบเอกสารราชการ */}
            <div className="relative w-16 h-16 m-3 shrink-0 border" style={{ borderColor: '#2a2620' }}>
                <img src={`/assets/characters/${guess.image}`} alt={guess.name} className="w-full h-full object-cover grayscale-[15%]" />
                {/* corner brackets */}
                {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((pos, i) => (
                    <span
                        key={i}
                        className={`absolute w-2 h-2 ${pos}`}
                        style={{ borderColor: theme.ink, opacity: 0.7 }}
                    />
                ))}
            </div>

            {/* Field content */}
            <div className="flex-1 min-w-0 py-3 pr-4 flex flex-col justify-center">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[10px] tracking-[0.24em] uppercase text-[#5a5448] mb-1">Subject Name</p>
                        <h3 className="text-sm font-bold uppercase tracking-wide truncate" style={{ color: '#e8ddd0' }}>
                            {guess.name}
                        </h3>
                        <p className="text-[12px] mt-0.5 truncate" style={{ color: '#8a8078' }}>
                            {guess.affiliation}
                        </p>
                    </div>

                    {/* Verdict stamp */}
                    <div
                        className="shrink-0 border-2 rounded-sm px-1.5 py-0.5 text-center select-none"
                        style={{ borderColor: theme.ink, transform: 'rotate(-6deg)', opacity: 0.9 }}
                    >
                        <span
                            className="text-[10px] font-black uppercase tracking-[0.16em] whitespace-nowrap"
                            style={{ color: theme.ink }}
                        >
                            {theme.stampText}
                        </span>
                    </div>
                </div>

                <div className="mt-2 pt-2 border-t border-dashed flex items-center justify-between" style={{ borderColor: '#1a1816' }}>
                    <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#5a5448' }}>
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