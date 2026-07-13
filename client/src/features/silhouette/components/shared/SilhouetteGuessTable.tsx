// src/features/silhouette/components/shared/SilhouetteGuessTable.tsx
'use client';

import { SilhouetteGuessEntry } from '@/src/features/silhouette/types';
import { formatAge, formatHeight } from '@/src/lib/utils/format';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import Image from 'next/image';

/**
 * 🩸 Central 46 Case File — dossier card, not a thin row.
 *
 * Verdict stamp: 合 (gō, "match/pass") for a confirmed spirit,
 * 否 (hi, "deny") for a mismatched record — the same stamp vocabulary
 * Soul Society's judiciary would actually use on a case file.
 *
 * ── Wiring notes for whoever hooks this up ──
 * This component expects `entry.guess` to carry the raw character sheet
 * (gender, race, affiliation, height_cm, age, eye_color, hair_color,
 * weapon, release, primary_ability, first_appearance_chapter — same
 * shape as the character JSON) and an optional `entry.attributeStatuses`
 * map describing how each field compares to the target (computed by the
 * game logic, not this component). If `attributeStatuses` is omitted the
 * chips render in a neutral "unverified" tone instead of guessing at
 * correctness — this component never invents comparison results.
 */

type AttributeStatus = 'correct' | 'partial' | 'wrong' | 'higher' | 'lower';

interface AttributeComparison {
    gender?: AttributeStatus;
    race?: AttributeStatus;
    affiliation?: AttributeStatus;
    height?: AttributeStatus;
    age?: AttributeStatus;
    eye?: AttributeStatus;
    hair?: AttributeStatus;
    weapon?: AttributeStatus;
    ability?: AttributeStatus;
    release?: AttributeStatus;
    arc?: AttributeStatus;
}

interface CharacterSheet {
    gender?: string;
    race?: string[];
    affiliation?: string;
    height_cm?: number;
    age?: number | string;
    eye_color?: string;
    hair_color?: string;
    weapon?: string[];
    release?: string[];
    primary_ability?: string[];
    first_appearance_chapter?: string;
}

const ATTR_STYLE: Record<AttributeStatus | 'neutral', { bg: string; border: string; text: string }> = {
    correct: { bg: 'rgba(53,214,138,0.14)', border: 'rgba(53,214,138,0.4)', text: '#5cf0a0' },
    wrong: { bg: 'rgba(255,77,77,0.10)', border: 'rgba(255,77,77,0.3)', text: '#ffb0b0' },
    partial: { bg: 'rgba(201,161,59,0.14)', border: 'rgba(201,161,59,0.4)', text: '#e8c878' },
    higher: { bg: 'rgba(75,120,220,0.14)', border: 'rgba(75,120,220,0.4)', text: '#9db8ff' },
    lower: { bg: 'rgba(75,120,220,0.14)', border: 'rgba(75,120,220,0.4)', text: '#9db8ff' },
    neutral: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: '#8a8aa3' },
};

const AttrChip = ({ label, value, status }: { label: string; value?: string; status?: AttributeStatus }) => {
    if (!value) return null;
    const style = ATTR_STYLE[status ?? 'neutral'];
    return (
        <span
            className="inline-flex items-center gap-1 px-1.5 py-[3px] rounded-[3px] border font-mono text-[8px] uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
        >
            <span className="opacity-50">{label}</span>
            <span className="font-bold">{value}</span>
            {status === 'higher' && <ArrowUp size={8} />}
            {status === 'lower' && <ArrowDown size={8} />}
        </span>
    );
};

export const SilhouetteGuessTable = ({ guesses }: { guesses: SilhouetteGuessEntry[] }) => {
    if (!guesses.length) return null;

    return (
        <div className="w-full max-w-2xl mx-auto py-4 space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[#c9a13b]/70" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a8aa3] font-mono">
                        Central 46 Case Archive
                    </span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-[#8a8aa3] font-mono">
                    Verdict Log
                </span>
            </div>

            <AnimatePresence initial={false}>
                {guesses.map((entry, idx) => {
                    const isCorrect = entry.status === 'correct';
                    const accent = isCorrect ? '#35d68a' : '#ff4d4d';
                    const seal = isCorrect ? '合' : '否';
                    const caseNo = String(guesses.length - idx).padStart(3, '0');

                    const characterThumbSrc = entry.guess.image
                        ? `/api/asset/character/${entry.guess.id}`
                        : "" ;

                    // See wiring note above: cast is intentional until the shared
                    // type file grows these fields.
                    const sheet = entry.guess as unknown as CharacterSheet;
                    const attrs: AttributeComparison =
                        (entry as unknown as { attributeStatuses?: AttributeComparison }).attributeStatuses ?? {};

                    return (
                        <motion.div
                            key={entry.guess.id}
                            id={`silhouette-row-${entry.guess.id}`}
                            initial={entry.isNew ? { opacity: 0, x: -24, skewX: -4 } : { opacity: 1, x: 0, skewX: 0 }}
                            animate={{ opacity: 1, x: 0, skewX: 0 }}
                            exit={{ opacity: 0, x: 16 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="relative rounded-lg border overflow-hidden backdrop-blur-md"
                            style={{
                                borderColor: `${accent}33`,
                                background: isCorrect
                                    ? 'linear-gradient(135deg, rgba(10,23,16,0.96), rgba(13,13,19,0.94))'
                                    : 'linear-gradient(135deg, rgba(23,10,10,0.96), rgba(13,13,19,0.94))',
                                boxShadow: isCorrect
                                    ? `0 0 32px ${accent}14, inset 0 0 20px ${accent}0d`
                                    : `inset 0 0 20px ${accent}0a`,
                            }}
                        >
                            {isCorrect && (
                                <div
                                    className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none"
                                    style={{ background: `radial-gradient(circle, ${accent}22, transparent 70%)` }}
                                />
                            )}

                            <span
                                aria-hidden
                                className="absolute -right-3 -bottom-6 text-[110px] leading-none select-none pointer-events-none"
                                style={{ color: accent, opacity: 0.045 }}
                            >
                                {seal}
                            </span>

                            {entry.isNew && (
                                <motion.div
                                    initial={{ x: '-120%' }}
                                    animate={{ x: '220%' }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                                    style={{
                                        background: `linear-gradient(90deg, transparent, ${accent}22, transparent)`,
                                        transform: 'skewX(-20deg)',
                                    }}
                                />
                            )}

                            {isCorrect && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {[0, 1, 2, 3].map((i) => (
                                        <motion.span
                                            key={i}
                                            className="absolute bottom-0 w-[2px] h-[2px] rounded-full"
                                            style={{ left: `${12 + i * 20}%`, backgroundColor: accent }}
                                            animate={{ y: [-2, -40], opacity: [0, 0.55, 0] }}
                                            transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.7, ease: 'easeOut' }}
                                        />
                                    ))}
                                </div>
                            )}

                            {!isCorrect && (
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.035] mix-blend-screen"
                                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, transparent 1px, transparent 2px)' }}
                                />
                            )}

                            <div
                                className="relative z-10 flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-dashed"
                                style={{ borderColor: `${accent}26` }}
                            >
                                <span className="text-[8px] uppercase tracking-[0.25em] font-mono opacity-40">
                                    Case Entry № {caseNo}
                                </span>
                                <span className="text-[8px] uppercase tracking-[0.25em] font-mono opacity-40">
                                    Soul Society Registry
                                </span>
                            </div>

                            <div className="relative z-10 flex gap-4 px-4 py-4">
                                <div className="relative w-20 h-24 shrink-0">
                                    <span className="absolute -top-1 -left-1 w-3 h-3 border-t border-l" style={{ borderColor: `${accent}80` }} />
                                    <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r" style={{ borderColor: `${accent}80` }} />
                                    <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l" style={{ borderColor: `${accent}80` }} />
                                    <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r" style={{ borderColor: `${accent}80` }} />
                                    <div className="w-full h-full overflow-hidden rounded-[2px] bg-[#0e0e12] border border-white/5">
                                        <Image
                                            src={characterThumbSrc}
                                            alt={entry.guess.name}
                                            className={`w-full h-full object-cover object-top transition-transform duration-500 hover:scale-110 ${isCorrect ? 'brightness-110' : 'grayscale-[55%] brightness-75'
                                                }`}
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                            }}
                                            fill
                                            sizes="w-20 h-24"
                                        />
                                    </div>
                                </div>

                                <div className="relative self-stretch w-px shrink-0">
                                    <div className="absolute inset-0 border-l border-dashed" style={{ borderColor: `${accent}30` }} />
                                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: '#0b0b10' }} />
                                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: '#0b0b10' }} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] uppercase tracking-[0.25em] font-mono opacity-40 mb-0.5">Subject Name</p>
                                    <h3 className="text-[17px] font-black uppercase tracking-wide text-[#ece6df] truncate leading-tight">
                                        {entry.guess.name}
                                    </h3>
                                    {sheet.affiliation && (
                                        <p className="text-[10px] uppercase tracking-wider opacity-55 mt-0.5 truncate">{sheet.affiliation}</p>
                                    )}

                                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: accent }}>
                                        {isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                        {isCorrect ? 'Record Match' : 'Record Mismatch'}
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-1">
                                        <AttrChip label="Gender" value={sheet.gender} status={attrs.gender} />
                                        <AttrChip label="Race" value={(sheet.race?.length ?? 0) > 1 ? "Hybrid" : sheet.race?.[0]} status={attrs.race} />
                                        <AttrChip label="Height" value={formatHeight(Number(sheet.height_cm || -1))} status={attrs.height} />
                                        <AttrChip label="Age" value={formatAge(Number(sheet.age) || -1)} status={attrs.age} />
                                    </div>
                                </div>
                            </div>

                            <div
                                className="absolute right-3 top-9 rotate-[-9deg] z-20 select-none pointer-events-none"
                                style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
                            >
                                <div
                                    className="px-2.5 py-1 border-[3px] rounded-sm flex items-center gap-1.5"
                                    style={{ borderColor: accent, color: accent, opacity: 0.9 }}
                                >
                                    <span className="text-base leading-none">{seal}</span>
                                    <span className="text-[8px] font-black uppercase tracking-widest">
                                        {isCorrect ? 'Confirmed' : 'Rejected'}
                                    </span>
                                </div>
                            </div>

                            <div
                                className="relative z-10 flex items-center justify-between px-4 py-1.5 border-t border-dashed text-[8px] font-mono uppercase tracking-[0.2em] opacity-35"
                                style={{ borderColor: `${accent}26` }}
                            >
                                <span>id: {entry.guess.id.slice(0, 8)}...</span>
                                <span>Central 46 Archive</span>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};