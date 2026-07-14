// src/features/emoji/components/shared/EmojiTestimonyDisplay.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BleachEmojiSet } from '@/src/entities/emoji/schema';
import { generateCaseFileId } from '@/src/lib/utils/generateCaseFileId';

interface EmojiTestimonyDisplayProps {
    target: BleachEmojiSet;
    revealedCount: number; // จำนวนที่เปิดจริงตอนเล่น
    isSolved?: boolean;
    speakerName?: string;
    forceRevealAll?: boolean; // 🆕 รับค่าจาก Toggle เพื่อเปิด Reference
}

const T = {
    bg: '#050409',
    plate: '#0b0a13',
    border: '#2b2534',
    borderDim: '#1a1620',
    gold: '#c8a96e',
    value: '#e8ddd0',
    muted: '#726c85',
    mutedMid: '#6a6483',
    redNotice: '#c85050',
    reiatsu: '#8a6bf2',
    reiatsuBright: '#b39cff',
};

function WardStrip({ bottom = false }: { bottom?: boolean }) {
    const label = '封印術式 · SPIRIT SEAL PROTOCOL · ';
    return (
        <div
            className="relative w-full overflow-hidden whitespace-nowrap text-[10px] tracking-[0.18em] py-[7px] select-none"
            style={{
                color: T.reiatsu,
                opacity: 0.22,
                borderBottom: bottom ? 'none' : `1px solid ${T.borderDim}`,
                borderTop: bottom ? `1px solid ${T.borderDim}` : 'none',
            }}
            aria-hidden="true"
        >
            {label.repeat(24)}
        </div>
    );
}

function WardNode({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
    const pos: Record<string, string> = {
        tl: 'top-2 left-2',
        tr: 'top-2 right-2 scale-x-[-1]',
        bl: 'bottom-2 left-2 scale-y-[-1]',
        br: 'bottom-2 right-2 scale-x-[-1] scale-y-[-1]',
    };
    return (
        <svg
            className={`absolute w-4 h-4 z-10 pointer-events-none ${pos[corner]}`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path d="M2 9V2h7" stroke={T.gold} strokeWidth="1.2" opacity="0.55" strokeLinecap="round" />
            <circle cx="2" cy="2" r="1.3" fill={T.reiatsu} opacity="0.7" />
        </svg>
    );
}

function useTalismanBurst(ref: React.RefObject<HTMLDivElement | null>, fire: boolean) {
    useEffect(() => {
        if (!fire || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const colors = [T.reiatsuBright, T.reiatsu, T.gold, '#ffffff'];

        for (let i = 0; i < 16; i++) {
            const p = document.createElement('span');
            const angle = Math.random() * 360;
            const distance = 26 + Math.random() * 54;
            const size = 2 + Math.random() * 3;
            const duration = 0.55 + Math.random() * 0.35;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const rad = (angle * Math.PI) / 180;

            Object.assign(p.style, {
                position: 'fixed',
                left: `${rect.left + rect.width / 2}px`,
                top: `${rect.top + rect.height / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                background: color,
                boxShadow: `0 0 6px ${color}`,
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
            setTimeout(() => p.remove(), duration * 1000 + 60);
        }
    }, [fire, ref]);
}

// 🆕 เปลี่ยน props เป็นรับ status แบบเจาะจงแทน
export function EmojiTile({
    emoji,
    status,
    justUnlocked,
    index,
}: {
    emoji: string;
    status: 'gameplay' | 'reference' | 'sealed';
    justUnlocked: boolean;
    index: number;
}) {
    const tileRef = useRef<HTMLDivElement>(null);
    useTalismanBurst(tileRef, justUnlocked && status === 'gameplay');

    const isGameplay = status === 'gameplay';
    const isReference = status === 'reference';
    const isUnlocked = isGameplay || isReference;

    return (
        <div
            ref={tileRef}
            className="relative aspect-square flex items-center justify-center select-none overflow-hidden transition-all duration-500"
            style={{
                // 🆕 จัดการพื้นหลังแยกตามสถานะ
                background: isGameplay
                    ? 'radial-gradient(circle at 50% 35%, rgba(138,107,242,0.16), rgba(0,0,0,0) 70%)'
                    : isReference
                        ? 'radial-gradient(circle at 50% 35%, rgba(200,169,110,0.12), rgba(0,0,0,0) 70%)'
                        : 'rgba(255,255,255,0.015)',
                // 🆕 จัดการเส้นขอบ (Gold Dashed สำหรับ Reference)
                border: isGameplay
                    ? `1px solid rgba(138,107,242,0.4)`
                    : isReference
                        ? `1px dashed rgba(200,169,110,0.5)`
                        : `1px solid ${T.borderDim}`,
                boxShadow: isGameplay
                    ? '0 0 22px rgba(138,107,242,0.14), inset 0 0 0 1px rgba(200,169,110,0.08)'
                    : isReference
                        ? 'none' // Reference ไม่เรืองแสง
                        : 'inset 0 0 18px rgba(0,0,0,0.6)',
            }}
        >
            {isGameplay && (
                <svg className="absolute inset-0 w-full h-full opacity-[0.18]" viewBox="0 0 100 100" aria-hidden="true">
                    <circle cx="50" cy="50" r="38" stroke={T.reiatsu} strokeWidth="0.6" strokeDasharray="2 4" fill="none" />
                </svg>
            )}

            <span
                className="absolute top-1 left-1.5 text-[9px] font-mono tracking-[0.1em] z-20 transition-colors duration-500"
                style={{
                    color: isGameplay ? `${T.reiatsuBright}99` : isReference ? `${T.gold}99` : '#3d3a34'
                }}
            >
                {String(index + 1).padStart(2, '0')}
            </span>

            {/* 🆕 Tag '写' สำหรับสัญลักษณ์ที่เปิดดูย้อนหลัง */}
            {isReference && (
                <span className="absolute bottom-1 right-1.5 text-[10px] font-bold z-20 opacity-70 select-none animate-in fade-in zoom-in" style={{ color: T.gold }}>
                    写
                </span>
            )}

            {!isUnlocked && (
                <div className="flex flex-col items-center justify-center gap-1 opacity-80">
                    <div
                        className="relative w-6 h-8 flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
                            border: '1px solid #403c4a',
                        }}
                    >
                        <span className="text-[13px] font-black leading-none" style={{ color: '#4a4558' }}>
                            封
                        </span>
                        <span
                            className="absolute -bottom-2 w-px h-2"
                            style={{ background: 'linear-gradient(180deg, #4a4558, transparent)' }}
                        />
                    </div>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ color: '#403c4a' }}>
                        <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                </div>
            )}

            <AnimatePresence>
                {justUnlocked && isGameplay && (
                    <>
                        <motion.div
                            key="seal-top"
                            className="absolute left-1/2 top-1/2 w-6 h-4 -ml-3 flex items-end justify-center overflow-hidden"
                            style={{ marginTop: '-16px' }}
                            initial={{ y: 0, opacity: 1, rotate: 0 }}
                            animate={{ y: -22, opacity: 0, rotate: -14 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <span className="text-[13px] font-black leading-none" style={{ color: T.gold }}>
                                封
                            </span>
                        </motion.div>
                        <motion.div
                            key="ring"
                            className="absolute inset-0 rounded-full"
                            style={{ border: `1px solid ${T.reiatsuBright}`, margin: 'auto', width: '30%', height: '30%' }}
                            initial={{ opacity: 0.7, scale: 0.3 }}
                            animate={{ opacity: 0, scale: 2.4 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                    </>
                )}
            </AnimatePresence>

            {isUnlocked && (
                <motion.span
                    key="emoji"
                    className="relative z-10 text-[34px] leading-none"
                    style={{
                        textShadow: isGameplay ? '0 0 10px rgba(138,107,242,0.3)' : 'none',
                        filter: isReference ? 'saturate(0.85) opacity(0.85)' : 'none'
                    }}
                    role="img"
                    initial={justUnlocked ? { opacity: 0, scale: 0.25, rotate: -18 } : { opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={justUnlocked ? { type: 'spring', stiffness: 260, damping: 17, delay: 0.18 } : { duration: 0.3 }}
                >
                    {emoji}
                </motion.span>
            )}
        </div>
    );
}

export function EmojiTestimonyDisplay({ target, revealedCount, isSolved = false, speakerName, forceRevealAll = false }: EmojiTestimonyDisplayProps) {
    const caseNo = generateCaseFileId(target.id);

    // 🆕 ถอด isSolved ออกจากการคำนวณ effectiveRevealed เพื่อให้เก็บค่าที่แท้จริงไว้ได้
    const actualRevealed = revealedCount;

    const prevRevealedRef = useRef(revealedCount);
    const [justUnlockedIndex, setJustUnlockedIndex] = useState<number | null>(null);

    useEffect(() => {
        if (revealedCount > prevRevealedRef.current) {
            const newIndex = revealedCount - 1;
            setJustUnlockedIndex(newIndex);
            const timer = setTimeout(() => setJustUnlockedIndex(null), 650);
            prevRevealedRef.current = revealedCount;
            return () => clearTimeout(timer);
        }
        prevRevealedRef.current = revealedCount;
    }, [revealedCount]);

    return (
        <div className="relative w-full max-w-lg mx-auto px-1 py-1 font-[family-name:var(--font-display)]" style={{ isolation: 'isolate' }}>
            <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${T.reiatsu}33, transparent 40%, ${T.gold}22)` }}
                aria-hidden="true"
            />

            <div
                className="relative overflow-hidden"
                style={{
                    background: T.plate,
                    boxShadow: `0 0 0 1px ${T.border}, 0 26px 60px rgba(0,0,0,0.65)`,
                    margin: '2px',
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0" aria-hidden="true">
                    <motion.svg
                        width="320"
                        height="320"
                        viewBox="0 0 320 320"
                        style={{ opacity: 0.035 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
                    >
                        <circle cx="160" cy="160" r="150" stroke={T.reiatsuBright} strokeWidth="1" strokeDasharray="1 10" fill="none" />
                        <circle cx="160" cy="160" r="120" stroke={T.gold} strokeWidth="1" strokeDasharray="6 6" fill="none" />
                    </motion.svg>
                    <span
                        className="absolute text-[150px] font-black"
                        style={{ color: '#ffffff', opacity: 0.014, lineHeight: 1 }}
                    >
                        霊
                    </span>
                </div>

                <WardNode corner="tl" />
                <WardNode corner="tr" />
                <WardNode corner="bl" />
                <WardNode corner="br" />

                {!isSolved && (
                    <div className="absolute top-4 right-4 z-20 select-none pointer-events-none" style={{ transform: 'rotate(9deg)' }}>
                        <div
                            className="px-2 py-0.5 border-2 rounded-sm text-[10px] font-black tracking-[0.22em] uppercase"
                            style={{ color: T.redNotice, borderColor: 'rgba(200,80,80,0.35)', opacity: 0.8 }}
                        >
                            Pending ID
                        </div>
                    </div>
                )}

                <WardStrip />

                <div className="relative z-10 px-7 pt-6">
                    <p className="text-[11px] tracking-[0.4em] uppercase mb-3" style={{ color: T.mutedMid }}>
                        霊子紋章封印板 // REISHI WARD PLATE
                    </p>

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: T.muted }}>
                                Plate No.
                            </p>
                            <p className="text-[11px] tracking-[0.14em]" style={{ color: T.gold }}>
                                {caseNo}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: T.muted }}>
                                Seal Status
                            </p>
                            <AnimatePresence mode="wait">
                                <motion.p
                                    key={isSolved ? 'unsealed' : 'sealed'}
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[11px] tracking-[0.14em] uppercase"
                                    style={{ color: isSolved ? '#7ab85a' : T.reiatsuBright }}
                                >
                                    {isSolved ? 'Unsealed' : 'Sealed'}
                                </motion.p>
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${T.border}, transparent)` }} />
                </div>

                <div className="relative z-10 px-8 py-8">
                    <div className="grid grid-cols-4 gap-3 max-w-xs mx-auto">
                        {target.emoji_list.map((emoji, i) => {
                            // 🆕 แยกสถานะการเปิดให้ชัดเจน
                            const isGameplayRevealed = i < actualRevealed;
                            const isReferenceRevealed = forceRevealAll && !isGameplayRevealed;
                            const status = isGameplayRevealed ? 'gameplay' : isReferenceRevealed ? 'reference' : 'sealed';

                            return (
                                <EmojiTile
                                    key={i}
                                    emoji={emoji}
                                    status={status}
                                    justUnlocked={justUnlockedIndex === i}
                                    index={i}
                                />
                            );
                        })}
                    </div>

                    <p className="text-center text-[11px] tracking-[0.2em] uppercase mt-4 font-[family-name:var(--font-body)]" style={{ color: T.mutedMid }}>
                        {actualRevealed} / {target.emoji_list.length} Unsealed
                    </p>
                </div>

                <div className="relative z-10 px-8 pb-6">
                    <div className="h-px w-full mb-4" style={{ background: T.borderDim }} />
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] tracking-[0.28em] uppercase" style={{ color: T.muted }}>
                            Witness
                        </p>
                        <AnimatePresence mode="wait">
                            {isSolved && speakerName ? (
                                <motion.p
                                    key="name"
                                    initial={{ opacity: 0, x: 8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.35, delay: 0.1 }}
                                    className="text-[12px] tracking-[0.14em] uppercase font-bold"
                                    style={{ color: T.gold }}
                                >
                                    {speakerName}
                                </motion.p>
                            ) : (
                                <motion.div
                                    key="redacted"
                                    exit={{ opacity: 0 }}
                                    className="h-[15px] w-32"
                                    style={{ background: 'repeating-linear-gradient(45deg, #16121e 0 6px, #0c0910 6px 10px)' }}
                                    aria-hidden="true"
                                />
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <WardStrip bottom />
            </div>
        </div>
    );
}