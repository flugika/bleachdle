'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { EmojiGuessEntry, EmojiGuessStatus } from '@/src/features/emoji/types';
import Image from 'next/image';

// ─────────────────────────────────────────────────────────────
// PREMIUM DETAILED THEME CONFIGURATION
// ─────────────────────────────────────────────────────────────
const THEME: Record<EmojiGuessStatus, {
    bg: string;
    border: string;
    ink: string;
    accent: string;
    stampText: string;
    kanji: string;
    subtitle: string;
    photoFilter: string;
    bounty: string;
    cornerColor: string;
}> = {
    correct: {
        bg: 'linear-gradient(135deg, #fbf7ee 0%, #f3e9d2 100%)',
        border: 'rgba(30, 92, 45, 0.4)',
        ink: '#1e5c2d',
        accent: '#947233',
        stampText: 'VERIFIED',
        kanji: '合',
        subtitle: 'IDENTITY CONFIRMED • SOUL CLEANSED',
        photoFilter: 'sepia(0.15) contrast(1.15) brightness(0.95) saturate(1.1)',
        bounty: 'REWARD CLAIMED',
        cornerColor: 'from-[#bda265] to-[#8c6f39]',
    },
    wrong: {
        bg: 'linear-gradient(135deg, #f5ecd6 0%, #ebdcb9 100%)',
        border: 'rgba(138, 36, 36, 0.35)',
        ink: '#9a1c1c',
        accent: '#5c5446',
        stampText: 'REJECTED',
        kanji: '否',
        subtitle: 'IDENTITY VERIFICATION FAILED • WANTED',
        photoFilter: 'grayscale(1) contrast(1.4) brightness(0.85) sepia(0.2)',
        bounty: 'Bounty: 1,000,000 Kan',
        cornerColor: 'from-[#5c5446] to-[#3a352c]',
    },
};

// ⚜️ Premium Brass Corner Plates Graphic Component
function BrassCorner({ position, colorClass }: { position: string; colorClass: string }) {
    const posClasses: Record<string, string> = {
        'top-left': 'top-0 left-0 rounded-br-md border-b border-r',
        'top-right': 'top-0 right-0 rounded-bl-md border-b border-l',
        'bottom-left': 'bottom-0 left-0 rounded-tr-md border-t border-r',
        'bottom-right': 'bottom-0 right-0 rounded-tl-md border-t border-l',
    };

    return (
        <div className={`absolute w-5 h-5 z-30 bg-gradient-to-br ${colorClass} border-[#2d271e]/30 shadow-sm ${posClasses[position]}`}>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-[#1a1610]/60 ring-1 ring-white/10" />
        </div>
    );
}

// 💥 Confirmed Match Particles Burst
function useVerdictBurst(ref: React.RefObject<HTMLDivElement | null>, fire: boolean) {
    useEffect(() => {
        if (!fire || !ref.current) return;
        const container = ref.current;
        const rect = container.getBoundingClientRect();
        const colors = ['#1e5c2d', '#947233', '#dfcbb5'];

        for (let i = 0; i < 24; i++) {
            const p = document.createElement('span');
            const angle = (360 / 24) * i + Math.random() * 10 - 5;
            const distance = 60 + Math.random() * 100;
            const size = 3 + Math.random() * 4;
            const duration = 0.6 + Math.random() * 0.3;
            const rad = (angle * Math.PI) / 180;

            Object.assign(p.style, {
                position: 'fixed',
                left: `${rect.left + rect.width / 2}px`,
                top: `${rect.top + rect.height / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                background: colors[Math.floor(Math.random() * colors.length)],
                pointerEvents: 'none',
                zIndex: '9999',
                borderRadius: '50%',
                transform: 'translate(-50%,-50%) scale(1)',
                opacity: '1',
                transition: `transform ${duration}s cubic-bezier(0.1, 1, 0.1, 1), opacity ${duration}s ease-out`,
            });
            document.body.appendChild(p);
            void p.offsetWidth;
            p.style.transform = `translate(calc(-50% + ${Math.cos(rad) * distance}px), calc(-50% + ${Math.sin(rad) * distance}px)) scale(0)`;
            p.style.opacity = '0';
            setTimeout(() => p.remove(), duration * 1000 + 50);
        }
    }, [fire, ref]);
}

export interface EmojiGuessCardProps extends EmojiGuessEntry {
    attemptNumber?: number;
}

export function EmojiGuessCard({ guess, status, isNew, attemptNumber }: EmojiGuessCardProps) {
    const theme = THEME[status] || THEME.wrong;
    const isCorrect = status === 'correct';
    const cardRef = useRef<HTMLDivElement>(null);
    useVerdictBurst(cardRef, Boolean(isNew) && isCorrect);

    const recordNo = attemptNumber ? String(attemptNumber).padStart(3, '0') : '—';

    // 🔥 RESOLVED CRITICAL SPRING ERROR: Explicitly separating property transitions 
    // to bypass internal Framer Motion spring array syntax validation.
    const cardVariants: Variants = {
        initial: {
            opacity: isNew ? 0 : 1,
            scale: isNew ? 1.08 : 1,
            y: isNew ? 15 : 0,
            rotate: isNew ? (isCorrect ? -0.5 : 1) : 0
        },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            rotate: isNew ? (isCorrect ? 0 : [0, -1.5, 1.2, -0.6, 0.3, 0]) : 0,
            transition: {
                opacity: { type: 'spring', damping: 15, stiffness: 120 },
                scale: { type: 'spring', damping: 15, stiffness: 120 },
                y: { type: 'spring', damping: 15, stiffness: 120 },
                // Isolate keyframes completely to tween engine
                rotate: { type: 'tween', duration: 0.4, ease: 'easeInOut' }
            }
        }
    };

    return (
        <motion.div
            ref={cardRef}
            id={`emoji-row-${guess.id}`}
            layout
            variants={cardVariants}
            initial="initial"
            animate="animate"
            className="relative flex mb-6 mx-auto w-full bg-[#f4ebd0] text-[#1a1612] font-[family-name:var(--font-display)] shadow-[5px_5px_15px_rgba(0,0,0,0.4),inset_0_0_40px_rgba(139,115,85,0.15)] overflow-hidden border border-[#2d271e]/20"
            style={{
                background: theme.bg,
                boxShadow: isCorrect ? '0 0 25px rgba(45,133,68,0.15), 5px 5px 20px rgba(0,0,0,0.4)' : undefined,
                zIndex: attemptNumber || 1 // 🔥 RESOLVED OVERLAPPING: Forces the newest card to stay dynamically on top
            }}
        >
            {/* Vintage Paper Texture & Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/parchment.png')]" />

            {/* Brass Plate Corners */}
            <BrassCorner position="top-left" colorClass={theme.cornerColor} />
            <BrassCorner position="top-right" colorClass={theme.cornerColor} />
            <BrassCorner position="bottom-left" colorClass={theme.cornerColor} />
            <BrassCorner position="bottom-right" colorClass={theme.cornerColor} />

            {/* Left Column: Traditional Archive Binder Edge */}
            <div className="relative w-12 shrink-0 flex flex-col items-center justify-between py-4 border-r border-[#2d271e]/15 bg-[#ebdcb9]/40 select-none">
                <span className="text-sm font-bold text-[#4a3e2e]/70">録</span>
                <span className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase text-[#4a3e2e]/60 [writing-mode:vertical-lr]">
                    REC {recordNo}
                </span>
                <span className="text-xs font-bold text-[#4a3e2e]/40">§</span>
            </div>

            {/* Character Ink Sketch Frame */}
            <div className="relative w-24 h-28 m-4 shrink-0 border-2 border-[#2d271e]/80 shadow-md bg-[#ded0b0] p-1 z-10 group overflow-hidden">
                <div className="absolute inset-0 pointer-events-none border border-black/10 z-20" />
                <Image
                    src={`/api/asset/character/${guess.id}`}
                    alt={guess.name}
                    className="w-full h-full object-cover grayscale transition-transform duration-500 group-hover:scale-105"
                    style={{ filter: theme.photoFilter }}
                    fill
                    sizes="w-24 h-28"
                />

                {/* Criminal Identity Slash Mark: Authentic Traditional Calligraphy Ink Brush X-Slash */}
                {!isCorrect && (
                    <div className="absolute inset-0 pointer-events-none z-20 p-1.5 overflow-hidden mix-blend-multiply opacity-90 animate-fade-in">
                        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-[#9a1c1c] filter drop-shadow-[1px_2px_1px_rgba(0,0,0,0.25)]">
                            {/* เส้นพู่กันที่ 1: เฉือนจากบนซ้ายลงล่างขวา (หัวหนาท้ายตวัดหาง) */}
                            <path
                                d="M 8,14 C 28,22 62,54 94,86 C 74,72 34,38 6,18 Z"
                                fill="currentColor"
                            />
                            {/* เส้นพู่กันที่ 2: เฉือนจากบนขวาลงล่างซ้าย ตัดกันเป็นเครื่องหมายกากบาทผู้ต้องหา */}
                            <path
                                d="M 92,12 C 72,28 34,64 10,88 C 30,68 66,36 94,8 Z"
                                fill="currentColor"
                            />
                            {/* รอยหมึกกระเซ็นเล็กๆ รอบแผลเฉือนพู่กันเพื่อความสมจริง */}
                            <circle cx="22" cy="48" r="1.2" fill="currentColor" className="opacity-70" />
                            <circle cx="78" cy="32" r="0.9" fill="currentColor" className="opacity-60" />
                            <circle cx="48" cy="72" r="1.5" fill="currentColor" className="opacity-75" />
                            <circle cx="15" cy="25" r="0.8" fill="currentColor" className="opacity-50" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Core Text Dossier Ledger */}
            <div className="relative flex-1 py-4 pr-6 pl-2 z-10 flex flex-col justify-between min-w-0">
                <div>
                    <span className="block text-[9px] tracking-[0.2em] uppercase text-[#705e47] font-semibold mb-0.5">
                        Subject Name
                    </span>
                    <h2 className="text-xl font-extrabold tracking-wide uppercase text-[#1a1612] truncate">
                        {guess.name}
                    </h2>
                    <p className="text-xs font-bold text-[#705e47] tracking-wider mt-0.5 uppercase">
                        {guess.affiliation}
                    </p>
                </div>

                {/* Subtitle status line & Bounty indicator */}
                <div className="my-1 text-[10px] uppercase font-bold tracking-wider">
                    <div style={{ color: theme.ink }}>{theme.subtitle}</div>
                    <div className="text-[#a68648] tracking-widest mt-0.5 font-mono text-[11px]">
                        {theme.bounty}
                    </div>
                </div>

                {/* Bottom metadata strip */}
                <div className="pt-2 border-t border-dashed border-[#2d271e]/20 flex items-center justify-between text-[9px] text-[#705e47]/70 tracking-widest uppercase">
                    <span>SYMBOL MISMATCH DETECTED</span>
                    <span className="font-mono font-bold">CENTRAL 46 ARCHIVE</span>
                </div>
            </div>

            {/* Absolute Stamped Overlay: Massive High-Impact Rejection/Approval Stamp */}
            <motion.div
                initial={isNew ? { scale: 2.2, opacity: 0 } : { scale: 1, opacity: 1 }}
                animate={isNew ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, type: 'spring', damping: 12 }}
                className="absolute right-8 top-4 bottom-4 w-40 pointer-events-none z-20 flex items-center justify-center select-none overflow-hidden"
            >
                <div
                    className="relative px-4 py-1.5 border-[3.5px] rounded font-black tracking-tighter text-center uppercase opacity-85 mix-blend-multiply flex flex-col items-center justify-center"
                    style={{
                        borderColor: theme.ink,
                        color: theme.ink,
                        transform: isCorrect ? 'rotate(-8deg) scale(0.95)' : 'rotate(14deg) scale(1)',
                        boxShadow: `inset 0 0 4px ${theme.ink}40, 0 0 1px rgba(0,0,0,0.1)`,
                        background: 'rgba(244, 235, 208, 0.15)'
                    }}
                >
                    <div className="absolute inset-0 opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,#fff_2px,#fff_4px)] mix-blend-screen" />

                    <span className="text-xs tracking-[0.35em] font-bold leading-none mb-0.5 opacity-90">
                        {theme.stampText}
                    </span>
                    <span className="text-3xl font-black leading-none tracking-normal">
                        {theme.kanji}
                    </span>
                </div>
            </motion.div>

            {/* Vintage Central 46 Logo watermark subtle shadow */}
            <div className="absolute right-[20%] bottom-[-10px] w-24 h-24 opacity-[0.04] pointer-events-none mix-blend-multiply select-none">
                <svg viewBox="0 0 100 100" fill="currentColor" className="text-[#1a1612]">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M50 20 L50 80 M20 50 L80 50" stroke="currentColor" strokeWidth="1.5" />
                    <text x="50" y="55" fontSize="16" textAnchor="middle" fontWeight="bold">46</text>
                </svg>
            </div>
        </motion.div>
    );
}

export const EmojiGuessTable = ({ guesses }: { guesses: EmojiGuessEntry[] }) => {
    if (!guesses.length) return null;

    return (
        <div className="w-full max-w-xl mx-auto py-8 px-4">
            {/* Top Archive Title Header */}
            <div className="flex flex-col items-center mb-6 select-none">
                <p className="text-[11px] tracking-[0.35em] font-semibold font-[family-name:var(--font-display)] uppercase text-[#a69680]">
                    § Central 46 Verification Ledger
                </p>
                <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#a69680]/40 to-transparent mt-2" />
            </div>

            {/* Stacked Ledger Layout Container */}
            <div className="relative p-2 bg-[#141210]/60 border border-[#2d271e]/30 rounded shadow-2xl backdrop-blur-sm">
                <AnimatePresence initial={true}>
                    {guesses.map((entry, idx) => (
                        <EmojiGuessCard
                            key={entry.guess.id}
                            guess={entry.guess}
                            status={entry.status}
                            isNew={entry.isNew}
                            attemptNumber={guesses.length - idx}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};