// src/features/character/components/GuessTable.tsx
'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Character } from '@/src/entities/character/schema';
import { ComparisonOutcome, MatchResult } from '@/src/features/character/types';
import { formatAge, formatHeight } from '@/src/lib/utils/format';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GuessEntry {
    guess: Character;
    result: ComparisonOutcome;
    isNew?: boolean; // true เฉพาะ guess ล่าสุด → trigger animation
}

interface CellProps {
    value: string | number;
    status: MatchResult;
    colIndex: number; // 0-based → stagger delay
    animate: boolean; // animate เฉพาะ row ที่ isNew === true
    size?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HEADERS = [
    '', 'GENDER', 'RACE', 'AFFILIATION',
    'HEIGHT', 'AGE', 'EYE', 'HAIR',
    'WEAPON', 'ABILITY', 'RELEASE', 'FIRST ARC',
] as const;

// ─── Cell colour tokens (Bleach dark palette) ────────────────────────────────

export const CELL_STYLES: Record<MatchResult, { bg: string; border: string; text: string; glow: string }> = {
    correct: {
        bg: 'bg-[#19522f]',
        border: 'border-[#2c9151]',
        text: 'text-[#4de880]',
        glow: '0 0 18px 4px rgba(77,232,128,0.55), 0 0 40px 8px rgba(77,232,128,0.25)',
    },
    partial: {
        bg: 'bg-[#995325]',
        border: 'border-[#e0874c]',
        text: 'text-[#e8b830]',
        glow: '0 0 18px 4px rgba(232,184,48,0.55), 0 0 40px 8px rgba(232,184,48,0.25)',
    },
    wrong: {
        bg: 'bg-[#590e0e]',
        border: 'border-[#a64747]',
        text: 'text-[#d1a9a9]',
        glow: 'none',
    },
    higher: {
        bg: 'bg-[#0f0f38]',
        border: 'border-[#3a3a7a]',
        text: 'text-[#7090f0]',
        glow: '0 0 14px 3px rgba(112,144,240,0.45)',
    },
    lower: {
        bg: 'bg-[#0f0f38]',
        border: 'border-[#3a3a7a]',
        text: 'text-[#7090f0]',
        glow: '0 0 14px 3px rgba(112,144,240,0.45)',
    },
};

// ─── Reiatsu burst hook ──────────────────────────────────────────────────────
// ยิง particle burst 1 ครั้งทันทีที่ row ใหม่ mount

function useReiatsuBurst(ref: React.RefObject<HTMLDivElement | null>, fire: boolean) {
    useEffect(() => {
        if (!fire || !ref.current) return;

        const container = ref.current;
        const rect = container.getBoundingClientRect();

        // spawn หลาย particle กระจายออกจาก centre ของ row
        const PARTICLE_COUNT = 22;
        const colors = ['#c8a96e', '#4de880', '#7090f0', '#e8b830', '#ffffff'];

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = document.createElement('span');

            const angle = (360 / PARTICLE_COUNT) * i + Math.random() * 14 - 7;
            const distance = 60 + Math.random() * 100;
            const size = 3 + Math.random() * 5;
            const duration = 0.55 + Math.random() * 0.35;
            const color = colors[Math.floor(Math.random() * colors.length)];
            const rad = (angle * Math.PI) / 180;
            const tx = Math.cos(rad) * distance;
            const ty = Math.sin(rad) * distance;

            Object.assign(p.style, {
                position: 'fixed',
                left: `${rect.left + rect.width / 2}px`,
                top: `${rect.top + rect.height / 2}px`,
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: color,
                pointerEvents: 'none',
                zIndex: '9999',
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: '1',
                transition: `transform ${duration}s cubic-bezier(0.22,1,0.36,1), opacity ${duration}s ease-out`,
                boxShadow: `0 0 6px 1px ${color}`,
            });

            document.body.appendChild(p);

            // force reflow → start animation
            void p.offsetWidth;

            p.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`;
            p.style.opacity = '0';

            setTimeout(() => p.remove(), duration * 1000 + 50);
        }

        // เพิ่ม shockwave ring บน row เอง
        const ring = document.createElement('span');
        Object.assign(ring.style, {
            position: 'absolute',
            inset: '0',
            borderRadius: '2px',
            border: '2px solid rgba(200,169,110,0.9)',
            pointerEvents: 'none',
            zIndex: '10',
            animation: 'reiatsuRing 0.6s ease-out forwards',
        });
        container.style.position = 'relative';
        container.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove(), { once: true });

    }, [fire]); // eslint-disable-line react-hooks/exhaustive-deps
}

// inject keyframe หนึ่งครั้ง
if (typeof document !== 'undefined') {
    const id = '__reiatsu_ring_kf__';
    if (!document.getElementById(id)) {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = `
            @keyframes reiatsuRing {
                0%   { transform: scale(1);    opacity: 1; border-width: 2px; }
                100% { transform: scale(1);    opacity: 0; border-width: 6px; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ─── ResultCell ──────────────────────────────────────────────────────────────

export const ResultCell = ({ value, status, colIndex, animate, size = "" }: CellProps) => {
    const { bg, border, text, glow } = CELL_STYLES[status];

    // กำหนดเงื่อนไขขนาด
    const isSm = size === "sm";
    const heightClass = isSm ? "h-10" : "h-[72px]";
    const textClass = isSm ? "text-[8px]" : "text-[12px]";
    const arrowClass = isSm ? "text-[8px]" : "text-[11px]";

    const isHighlight = status === 'correct' || status === 'partial';

    const variants = {
        hidden: { rotateY: 90, opacity: 0, scale: 0.92 },
        visible: {
            rotateY: [90, -6, 0],
            opacity: 1,
            scale: isHighlight ? [0.92, 1.08, 1] : [0.92, 1],
            boxShadow: isHighlight ? ['none', glow, 'none'] : 'none',
        },
    };

    return (
        <div className="[perspective:900px]">
            <motion.div
                variants={animate ? variants : undefined}
                initial={animate ? 'hidden' : false}
                animate={animate ? 'visible' : false}
                transition={{
                    delay: animate ? colIndex * 0.2 : 0,
                    duration: 0.55,
                    ease: [0.22, 1, 0.36, 1],
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className={[
                    'flex flex-row items-center justify-center',
                    heightClass, // ใช้ตัวแปร height
                    'px-2 gap-1',
                    textClass,   // ใช้ตัวแปร text
                    'font-bold tracking-wide text-center leading-tight',
                    'border rounded-[2px] overflow-hidden',
                    bg, border, text,
                ].join(' ')}
            >
                <span className={[
                    "px-1 leading-[0.8] break-words", // ใช้ leading-tight หรือ leading-none เพื่อให้บรรทัดชิดกัน
                    isSm && "line-clamp-2" // จริงๆ line-clamp-2 ดีอยู่แล้วถ้าอยากให้มัน wrap ลงมา
                ].join(' ')}>
                    {value}
                </span>
                {status === 'higher' && <span className={`${arrowClass} leading-none`}>▲</span>}
                {status === 'lower' && <span className={`${arrowClass} leading-none`}>▼</span>}
            </motion.div>
        </div>
    );
};

// ─── GuessRow ────────────────────────────────────────────────────────────────

const GuessRow = ({ guess, result, isNew = false }: GuessEntry) => {
    const rowRef = useRef<HTMLDivElement>(null);
    useReiatsuBurst(rowRef, isNew);

    return (
        <motion.div
            ref={rowRef}
            layout
            initial={isNew ? { opacity: 0, y: -8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            // ปรับ grid-cols คอลัมน์แรกให้เป็น 72px เท่ากับขนาดรูป
            className="grid grid-cols-[72px_repeat(11,minmax(60px,1fr))] gap-[6px] mb-[4px]"
        >
            {/* Name cell: ปรับขนาดเป็น 72x72 เท่ากันเป๊ะ */}
            <div className="bg-[#111120] border border-[#1e1e30] rounded-[2px] overflow-hidden w-[72px] h-[72px] flex-shrink-0">
                <img
                    src={`/assets/characters/${guess.image}`}
                    alt={guess.name}
                    className="w-full h-full object-cover" // บังคับ 1:1 เต็มพื้นที่
                    title={guess.name}
                />
            </div>

            <ResultCell value={guess.gender} status={result.gender} colIndex={0} animate={isNew} />
            <ResultCell value={guess.race.length > 1 ? "Hybrid" : guess.race[0]} status={result.race} colIndex={1} animate={isNew} />
            <ResultCell value={guess.affiliation} status={result.affiliation} colIndex={2} animate={isNew} />
            <ResultCell value={formatHeight(guess.heightCm)} status={result.height} colIndex={3} animate={isNew} />
            <ResultCell value={formatAge(guess.age)} status={result.age} colIndex={4} animate={isNew} />
            <ResultCell value={guess.eyeColor} status={result.eyeColor} colIndex={5} animate={isNew} />
            <ResultCell value={guess.hairColor} status={result.hairColor} colIndex={6} animate={isNew} />
            <ResultCell value={guess.weapon.join(' , ')} status={result.weapon} colIndex={7} animate={isNew} />
            <ResultCell value={guess.primaryAbility.join(' , ')} status={result.primaryAbility} colIndex={8} animate={isNew} />
            <ResultCell value={guess.release.join(' , ')} status={result.release} colIndex={9} animate={isNew} />
            <ResultCell value={guess.firstAppearanceChapter} status={result.firstAppearanceChapter} colIndex={10} animate={isNew} />
        </motion.div>
    );
};

// ─── GuessTable (export) ─────────────────────────────────────────────────────

export const GuessTable = ({
    guesses,
}: {
    guesses: GuessEntry[];
}) => {
    if (!guesses.length) return null;

    return (
        <div className="w-full py-6 px-[28px] overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-[72px_repeat(11,minmax(0,1fr))] gap-[6px] mb-2 min-w-[780px]">
                {HEADERS.map((h, index) => (
                    <div
                        key={h}
                        // ปรับ text-align: ถ้าเป็นหัวคอลัมน์ชื่อ ให้จัดชิดซ้ายหรือกลางตามต้องการ
                        className={`text-[14px] text-zinc-500 tracking-widest font-bold py-1 ${index === 0 ? 'text-center' : 'text-center'}`}
                    >
                        {h}
                    </div>
                ))}
            </div>

            {/* Rows — AnimatePresence จัดการ mount/unmount animation */}
            <div className="min-w-[780px]">
                <AnimatePresence initial={true}>
                    {guesses.map((entry) => (
                        <GuessRow
                            key={entry.guess.id}
                            guess={entry.guess}
                            result={entry.result}
                            isNew={entry.isNew}
                        />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};