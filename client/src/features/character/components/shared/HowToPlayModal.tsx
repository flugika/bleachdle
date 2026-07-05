// src/features/character/components/shared/HowToPlayModal.tsx
'use client';

import { compareCharacter } from "@/src/lib/game-engine/compareCharacter";
import { getCharacterById } from "@/src/lib/utils/character"; 
import { formatAge, formatHeight } from "@/src/lib/utils/format";
import { useMemo } from "react";
import { CELL_STYLES, ResultCell } from "./CharacterGuessTable";
import { Button } from "@/src/shared/ui/button";
import { Modal } from "@/src/shared/ui/modal";
import Image from 'next/image';

const statusDefinitions = [
    { label: 'Correct Match', status: 'correct' as const },
    { label: 'Partial Match', status: 'partial' as const },
    { label: 'Higher/Lower (▲/▼)', status: 'higher' as const },
    { label: 'No Match', status: 'wrong' as const },
];

// ── 🎯 รับ `mode` เข้ามาจาก Parent Directly (Type-Safe)
interface HowToPlayModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'daily' | 'unlimited';
}

export const HowToPlayModal = ({ isOpen, onClose, mode }: HowToPlayModalProps) => {
    // ── 🎯 1. ประกาศ Hooks ทั้งหมดไว้ที่ TOP LEVEL ──────────────────
    const target = useMemo(() => getCharacterById("e9a8f2c3-9d10-4f5a-8b2c-1d0e9f8a7b6c"), []);
    const guess = useMemo(() => getCharacterById("c7a8b9d0-1e2f-4a3b-8c5d-6e7f8a9b0c1d"), []);

    const comparison = useMemo(() => {
        if (target && guess) {
            return compareCharacter(guess, target);
        }
        return null;
    }, [target, guess]);

    // ── 🎯 2. Early Return (หลังกติกา Hooks ทำงานครบถ้วน) ──────────────────
    if (!isOpen) return null;
    if (!target || !guess || !comparison) return null;

    const cellClass = "h-10 flex items-center justify-center border border-[#c8a96e]/30 text-[8px] font-bold text-center";
    const headers = ['guess', 'Image', 'Gender', 'Race', 'Affiliation', 'Height', 'Age', 'Eye', 'Hair', 'Weapon', 'Ability', 'Release', '1st Arc'];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to Play" titleAlign="center">

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>卍</span> The Objective
                    </h3>
                    
                    <div className="space-y-2">
                        {/* ── 🎯 EXPERT UX/UI: คัดแยก Copywriting ตามโหมดที่ส่งมาทาง Props */}
                        {mode === 'unlimited' ? (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Guess the mystery <span className="text-white font-medium">Bleach character</span> within <span className="text-[#c8a96e] font-semibold">10 attempts</span> to sustain your win streak. Each guess reveals color-coded feedback on their attributes.
                            </p>
                        ) : (
                            <p className="text-[#a0988e] text-xs leading-relaxed">
                                Guess today's mystery <span className="text-white font-medium">Bleach character</span>. You have <span className="text-[#4de880] font-semibold">unlimited attempts</span> until the soul signature is successfully identified.
                            </p>
                        )}
                        
                        {/* 🚫 แจ้งเตือนเรื่องไม่มีคำใบ้ (No Hint) สไตล์โซลโซไซตี้ */}
                        <div className="text-[11px] font-semibold tracking-wider text-[#e83030]/90 uppercase bg-[#200b0b]/60 border border-[#401515]/60 px-2.5 py-1 inline-block">
                            ⚠️ System Warning: No spiritual hints provided.
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                        {statusDefinitions.map(({ label, status }) => {
                            const { bg, border, text } = CELL_STYLES[status];
                            return (
                                <div key={status} className="flex items-center gap-2 text-xs">
                                    <div className={`w-3.5 h-3.5 ${bg} ${border} border`} />
                                    <span className={text}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <span>卍</span> Attribute Definitions
                    </h3>
                    <ul className="text-[#a0988e] text-xs space-y-2">
                        <li>
                            <strong className="text-white">Affiliation:</strong> The organization or group the character belongs to (e.g., Gotei 13, Espada, Sternritter).
                        </li>
                        <li>
                            <strong className="text-white">Weapon:</strong> Combat style based on tools used:
                            <span className="text-[#4de880]"> Weaponized</span>,
                            <span className="text-[#4de880]"> Unarmed</span>,
                            <span className="text-[#4de880]"> Energy</span>.
                        </li>
                        <li>
                            <strong className="text-white">Release:</strong> Highest combat form achieved:
                            <span className="text-[#4de880]"> Shikai/Bankai</span>,
                            <span className="text-[#4de880]"> Resurreccion</span>,
                            <span className="text-[#4de880]"> Vollständig</span>.
                        </li>
                        <li>
                            <strong className="text-white">Ability:</strong> The primary combat utility:
                            <span className="text-[#4de880]"> Physical</span>,
                            <span className="text-[#4de880]"> Element</span>,
                            <span className="text-[#4de880]"> Kido</span>,
                            <span className="text-[#4de880]"> Special</span>.
                        </li>
                        <li>
                            <strong className="text-white">First Arc:</strong> The specific story arc where the character debuted.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Example Table */}
            <div className="border-t border-[#c8a96e]/20 pt-6">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider text-xs mb-4">Example Gameplay</h3>

                <div className="space-y-4">
                    <div className="relative flex items-center gap-4">
                        <div className="relative w-16 h-16">
                            <Image src={`/assets/characters/${target.image}`} alt={target.name} fill sizes="64px" className="object-cover border border-[#2a2a42]" />
                        </div>
                        <p className="text-xs text-[#a0988e]">Target Character: <span className="font-bold text-white">{target.name}</span></p>
                    </div>

                    <div className="grid grid-cols-13 gap-1 text-[8px] uppercase font-bold text-center mb-2">
                        {headers.map(h => (
                            <div key={h} className="text-[#c8a96e] p-1">{h}</div>
                        ))}
                    </div>

                    {/* Target Row */}
                    <div className="grid grid-cols-13 gap-1 text-[8px] font-bold text-center mb-2">
                        <div className={`${cellClass} bg-[#0e0e1a]`}>Target</div>
                        <div className={`${cellClass} bg-gray-900 relative`}>
                            <Image src={`/assets/characters/${target.image}`} alt={target.name} fill sizes="40px" className="object-cover" />
                        </div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.gender}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.race.length > 1 ? "Hybrid" : target.race[0]}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.affiliation}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{formatHeight(target.height_cm)}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{formatAge(target.age)}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.eye_color}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.hair_color}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.weapon.join(', ')}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.primary_ability.join(', ')}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.release.join(', ')}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.first_appearance_chapter}</div>
                    </div>

                    {/* Guess Row */}
                    <div className="grid grid-cols-13 gap-1 text-[8px] font-bold text-center">
                        <div className={`${cellClass} bg-[#0e0e1a]`}>Guess</div>
                        <div className={`${cellClass} bg-gray-900 relative`}>
                            <Image src={`/assets/characters/${guess.image}`} alt={guess.name} fill sizes="40px" className="object-cover" />
                        </div>

                        <ResultCell size="sm" value={guess.gender} status={comparison.gender} colIndex={0} animate={false} />
                        <ResultCell size="sm" value={guess.race.length > 1 ? "Hybrid" : guess.race[0]} status={comparison.race} colIndex={1} animate={false} />
                        <ResultCell size="sm" value={guess.affiliation} status={comparison.affiliation} colIndex={2} animate={false} />
                        <ResultCell size="sm" value={formatHeight(guess.height_cm)} status={comparison.height} colIndex={3} animate={false} />
                        <ResultCell size="sm" value={formatAge(guess.age)} status={comparison.age} colIndex={4} animate={false} />
                        <ResultCell size="sm" value={guess.eye_color} status={comparison.eye_color} colIndex={5} animate={false} />
                        <ResultCell size="sm" value={guess.hair_color} status={comparison.hair_color} colIndex={6} animate={false} />
                        <ResultCell size="sm" value={guess.weapon.join(', ')} status={comparison.weapon} colIndex={7} animate={false} />
                        <ResultCell size="sm" value={guess.primary_ability.join(', ')} status={comparison.primary_ability} colIndex={8} animate={false} />
                        <ResultCell size="sm" value={guess.release.join(', ')} status={comparison.release} colIndex={9} animate={false} />
                        <ResultCell size="sm" value={guess.first_appearance_chapter} status={comparison.first_appearance_chapter} colIndex={10} animate={false} />
                    </div>
                </div>
            </div>

            <Button className="w-full mt-10" onClick={onClose}>
                Start Guessing
            </Button>
        </Modal>
    );
};