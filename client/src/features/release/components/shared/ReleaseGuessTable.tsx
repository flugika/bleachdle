// src/features/release/components/shared/ReleaseGuessTable.tsx
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ReleaseGuessEntry, ReleaseGuessStatus } from '@/src/features/release/types';
import { attachReleaseCharacter } from '@/src/features/release/release';

const T = {
    void: '#080605',
    parchment: '#120e0a',
    parchmentMid: '#181310',
    edge: '#2a2015',
    gold: '#c9a45e',
    ink: '#f1e8d8',
    sub: '#aca392',
    jade: '#39e6b8',
    vermillion: '#c23b32',
};

const THEME: Record<ReleaseGuessStatus, { ink: string; border: string; bg: string }> = {
    correct: { ink: T.jade, border: 'rgba(57,230,184,0.35)', bg: 'rgba(57,230,184,0.045)' },
    wrong: { ink: T.vermillion, border: 'rgba(194,59,50,0.25)', bg: 'rgba(0,0,0,0.4)' },
};

function typeTheme(releaseType: string) {
    const key = releaseType.toLowerCase();
    if (key.includes('bankai')) return { c: '#e8b34a', d: '#241a06', kanji: '卍解' };
    if (key.includes('shikai')) return { c: '#8fb8e8', d: '#0a1c2c', kanji: '始解' };
    if (key.includes('resurrec')) return { c: '#ff7a52', d: '#2c1006', kanji: '解放' };
    if (key.includes('segunda')) return { c: '#b083e0', d: '#1a0e28', kanji: '第二' };
    if (key.includes('vollst') || key.includes('quincy')) return { c: '#5fd8d0', d: '#08201d', kanji: '完聖体' };
    if (key.includes('shunko')) return { c: '#e2e8f0', d: '#161c26', kanji: '瞬閧' };
    return { c: T.gold, d: '#241c10', kanji: '解' };
}

function sealRimPath(cx: number, cy: number, rOuter: number, rInner: number, teeth: number) {
    const pts: string[] = [];
    const step = (Math.PI * 2) / (teeth * 2);
    for (let i = 0; i < teeth * 2; i++) {
        const r = i % 2 === 0 ? rOuter : rInner;
        const a = i * step - Math.PI / 2;
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return pts.join(' ') + ' Z';
}

/** 🩹 FIX: ลด opacity + ย่อขนาดจากเดิม เพราะตอนนี้เป็น "ลายเซ็นมุมเดียว" ของ certificate
    ไม่ใช่หนึ่งใน layer ที่ทับกับ kanji ยักษ์ + silhouette เหมือนก่อนหน้านี้ */
function MiniGuilloche({ opacity = 0.05 }: { opacity?: number }) {
    return (
        <svg width="120" height="120" viewBox="0 0 130 130" className="absolute -right-8 -top-8 pointer-events-none" style={{ opacity }}>
            {[60, 48, 36, 24].map((r, i) => (
                <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={T.gold} strokeWidth="0.5" strokeDasharray={i % 2 === 0 ? '2 3' : undefined} />
            ))}
            {Array.from({ length: 16 }).map((_, i) => {
                const a = (i / 16) * Math.PI * 2;
                return <line key={i} x1={65 + 24 * Math.cos(a)} y1={65 + 24 * Math.sin(a)} x2={65 + 60 * Math.cos(a)} y2={65 + 60 * Math.sin(a)} stroke={T.gold} strokeWidth="0.35" />;
            })}
        </svg>
    );
}

/** 🩹 มุมกระดาษใบรับรอง — แทนที่ kanji ลอยตัวใหญ่ (fontSize 92, opacity 0.05) ที่เคยทับ
    กับ guilloche + silhouette + diagonal stripe จนดูรกสามชั้น ด้วยกรอบมุมสไตล์เอกสารทางการ
    (pattern เดียวกับ CornerFret ใน ReleaseTestimonyDisplay) ให้ความรู้สึก "certificate"
    แทน "ลายน้ำสุ่มๆ" */
function CardCornerFret({ pos, color }: { pos: 'tl' | 'tr' | 'bl' | 'br'; color: string }) {
    const rot = { tl: 0, tr: 90, bl: -90, br: 180 }[pos];
    const side: any = {};
    if (pos === 'tl') { side.top = 6; side.left = 6; }
    if (pos === 'tr') { side.top = 6; side.right = 6; }
    if (pos === 'bl') { side.bottom = 6; side.left = 6; }
    if (pos === 'br') { side.bottom = 6; side.right = 6; }
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" className="absolute z-10 pointer-events-none" style={{ ...side, transform: `rotate(${rot}deg)`, opacity: 0.5 }}>
            <path d="M1 1 H11 M1 1 V11" stroke={color} strokeWidth="1.25" fill="none" />
        </svg>
    );
}

/** พื้นผิวกระดาษบางเบา — แทนที่ diagonal stripe overlay (repeating-linear-gradient 60deg,
    opacity 0.05) เดิมที่ตัดกับ silhouette และ kanji จนแยกไม่ออกว่าอะไรเป็นอะไร ใช้เส้นแนวนอน
    บางๆ เพียงชั้นเดียว ให้ความรู้สึกกระดาษโดยไม่แข่งกับข้อความ */
function CardPaperGrain() {
    return (
        <div
            className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
            style={{
                backgroundImage: `repeating-linear-gradient(0deg, ${T.gold} 0px, ${T.gold} 1px, transparent 1px, transparent 34px)`,
            }}
        />
    );
}

function TypeTag({ type }: { type: string }) {
    const t = typeTheme(type);
    return (
        <span
            className="text-[9px] tracking-[0.22em] uppercase px-2 py-0.5 border font-black shrink-0"
            style={{ color: t.c, borderColor: `${t.c}66`, background: `${t.c}0f`, textShadow: `0 0 6px ${t.c}66` }}
        >
            {type}
        </span>
    );
}

function MiniSeal({ type }: { type: string }) {
    const t = typeTheme(type);
    const rim = sealRimPath(30, 30, 27, 23, 16);
    return (
        <div className="relative shrink-0" style={{ width: 46, height: 46, filter: `drop-shadow(0 0 5px ${t.c}55)` }}>
            <svg viewBox="0 0 60 60" width="46" height="46" style={{ transform: 'rotate(-6deg)' }}>
                <defs>
                    <radialGradient id={`mini-${type}`} cx="50%" cy="45%" r="65%">
                        <stop offset="0%" stopColor={t.d} />
                        <stop offset="100%" stopColor="#050403" />
                    </radialGradient>
                </defs>
                <path d={rim} fill="none" stroke={t.c} strokeWidth="1.3" opacity="0.9" />
                <circle cx="30" cy="30" r="21" fill={`url(#mini-${type})`} stroke={t.c} strokeWidth="0.75" opacity="0.95" />
                <text x="30" y="37" textAnchor="middle" fontSize="15" fontWeight={900} fill={t.c} style={{ textShadow: `0 0 6px ${t.c}` }}>
                    {t.kanji}
                </text>
            </svg>
        </div>
    );
}

function StatusStamp({ isCorrect }: { isCorrect: boolean }) {
    const c = isCorrect ? T.jade : T.vermillion;
    return (
        <div className="relative shrink-0" style={{ filter: `drop-shadow(0 0 5px ${c}55)` }}>
            <div
                className="px-3 py-1 border-2 text-[9px] tracking-[0.25em] uppercase font-black relative"
                style={{
                    color: c, borderColor: c, transform: 'rotate(-3deg)',
                    background: `${c}0d`,
                    textShadow: isCorrect ? `0 0 8px ${c}` : 'none',
                }}
            >
                {isCorrect ? '中 MATCHED' : '外 REJECTED'}
            </div>
        </div>
    );
}

/** avatar เล็กของตัวละคร ถ้ามีรูป */
function CharacterAvatar({ image }: { image?: string | null }) {
    if (!image) return null;
    return (
        <span
            className="inline-block w-4 h-4 rounded-full overflow-hidden shrink-0 border align-middle -mt-0.5"
            style={{ borderColor: `${T.gold}66` }}
        >
            <img src={image} alt="" className="w-full h-full object-cover grayscale" />
        </span>
    );
}

export interface ReleaseGuessCardProps extends ReleaseGuessEntry {
    attemptNumber?: number;
}

export function ReleaseGuessCard({ guess, status, isNew, attemptNumber }: ReleaseGuessCardProps) {
    const theme = THEME[status] || THEME.wrong;
    const isCorrect = status === 'correct';
    const num = attemptNumber ? String(attemptNumber).padStart(2, '0') : '--';
    const t = typeTheme(guess.release_type);

    // 🩹 FIX: ReleaseGuessEntry.guess เป็น BleachRelease ดิบ (ไม่มี field `character` เลย —
    // ดู schema.ts) เดิมโค้ดเขียน `guess.character ?? attachReleaseCharacter(guess)?.character`
    // ไว้เผื่อ แต่ฝั่งซ้ายไม่มีทางมีค่าตาม type ปัจจุบันเลย เลยตัดออก resolve ผ่าน
    // attachReleaseCharacter() เพียงทางเดียว

    const character = attachReleaseCharacter(guess)?.character;

    return (
        <motion.div
            layout initial={isNew ? { opacity: 0, x: -20 } : false} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
            className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 px-5 mb-3 overflow-hidden backdrop-blur-sm"
            style={{
                background: `linear-gradient(135deg, ${theme.bg}, ${T.parchment} 60%, ${T.void})`,
                border: `1px solid ${theme.border}`,
                borderLeft: `3px solid ${theme.ink}`,
                boxShadow: isCorrect ? `0 0 22px rgba(57,230,184,0.12), inset 0 0 30px rgba(0,0,0,0.45)` : 'inset 0 0 30px rgba(0,0,0,0.45)',
                clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
            }}
        >
            {/* 🩹 BACKGROUND LAYER REDESIGN: เดิมมี 4 layer ทับกัน (guilloche วงกลม + kanji ยักษ์ลอย
                fontSize 92 + diagonal stripe texture + character silhouette เต็มความสูงการ์ด)
                ซึ่งพอมีตัวหนังสือ/badge ด้านหน้าด้วย ทำให้ดูรกสามชั้นตามที่ผู้ใช้ทัก แก้เป็น:
                1) กรอบมุมทั้ง 4 (certificate corner) แทนความรู้สึก "เอกสารทางการ"
                2) guilloche เล็กมุมเดียว จางลง เป็นแค่ "ลายเซ็นประกอบ" ไม่ใช่ตัวเด่น
                3) paper grain บางเบามาก แทน diagonal stripe หนา
                4) character silhouette ลด opacity ลงมาก + แคบลง + เอา mask ให้จางเข้าเนื้อการ์ด
                   นุ่มกว่าเดิม ไม่ใช่รูปเต็มความสูงที่แข่งกับข้อความ */}
            <div className="absolute inset-[3px] border pointer-events-none z-10" style={{ borderColor: `${theme.ink}22` }} />
            <CardCornerFret pos="tl" color={T.gold} />
            <CardCornerFret pos="tr" color={T.gold} />
            <CardCornerFret pos="bl" color={T.gold} />
            <CardCornerFret pos="br" color={T.gold} />
            <MiniGuilloche opacity={isCorrect ? 0.07 : 0.04} />
            <CardPaperGrain />

            {/* Left: seal, no., invocation, meta */}
            <div className="relative z-10 flex items-center gap-3.5 min-w-0">
                <MiniSeal type={guess.release_type} />

                <div className="truncate">
                    {/* 🆕 คาถาเรียก — ใช้ trigger_phrase คู่กับ technique_name แทนการย้ำคำ release_type ซ้ำ */}
                    <p
                        className="text-[14px] md:text-[16px] font-bold italic tracking-wide truncate"
                        style={{
                            color: isCorrect ? T.ink : '#a89a86',
                            textShadow: isCorrect ? `0 0 12px ${theme.ink}55` : `0 0 8px ${t.c}22`,
                        }}
                    >
                        <span style={{ color: t.c }}>{guess.trigger_phrase}, </span>
                        {guess.technique_name}
                    </p>
                    {guess.technique_translation && (
                        <p className="text-[10px] italic mt-0.5 truncate" style={{ color: T.sub, opacity: 0.75 }}>
                            &ldquo;{guess.technique_translation}&rdquo;
                        </p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <TypeTag type={guess.release_type} />
                        <span className="text-[10px] tracking-[0.15em] uppercase truncate flex items-center gap-1.5">
                            <span style={{ color: T.gold, opacity: 0.55 }}>術者 //</span>
                            {character?.image && <CharacterAvatar image={`/api/asset/character/${character.id}`} />}
                            <span className="font-black" style={{ color: T.gold, opacity: 0.95 }}>{character?.name}</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: case number + status seal — เดิมมีแค่ stamp ลอยเดี่ยวๆ ทำให้ฝั่งขวาโล่ง
                เทียบกับฝั่งซ้ายที่แน่นเนื้อหา ย้ายเลขลำดับ (attemptNumber) มาไว้เหนือ stamp แทน
                ให้ดูเป็น "เลขที่เอกสาร + ตราประทับ" คู่กันแบบใบรับรองจริง สมดุลกับซ้ายมากขึ้น */}
            <div className="relative z-10 mt-1 sm:mt-0 sm:ml-4 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono tracking-[0.2em]" style={{ color: T.sub, opacity: 0.6 }}>
                    CASE No. {num}
                </span>
                <StatusStamp isCorrect={isCorrect} />
            </div>

            {isCorrect && <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(transparent 50%, rgba(57,230,184,0.05) 50%)', backgroundSize: '100% 4px' }} />}
        </motion.div>
    );
}

export const ReleaseGuessTable = ({ guesses }: { guesses: ReleaseGuessEntry[] }) => {
    if (!guesses.length) return null;

    return (
        <div className="w-full max-w-2xl mx-auto py-4 px-2 sm:px-4">
            <AnimatePresence initial={true}>
                {guesses.map((entry, idx) => (
                    <ReleaseGuessCard
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