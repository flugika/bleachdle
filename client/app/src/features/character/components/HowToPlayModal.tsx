import { compareCharacters } from "@/src/lib/game-engine/compare";
import { getCharacterById } from "@/src/lib/utils/character"; // ปรับ path ตามจริง
import { formatAge, formatHeight } from "@/src/lib/utils/format";
import { useMemo } from "react";
import { CELL_STYLES, ResultCell } from "./GuessTable";
import { Button } from "@/src/shared/ui/button";
import { Modal } from "@/src/shared/ui/modal";
import Image from 'next/image';

const statusDefinitions = [
    { label: 'Correct Match', status: 'correct' as const },
    { label: 'Partial Match', status: 'partial' as const },
    { label: 'Higher/Lower (▲/▼)', status: 'higher' as const },
    { label: 'No Match', status: 'wrong' as const },
];

export const HowToPlayModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    const cellClass = "h-10 flex items-center justify-center border border-[#c8a96e]/30 text-[8px] font-bold text-center";

    const target = useMemo(() => getCharacterById("e9a8f2c3-9d10-4f5a-8b2c-1d0e9f8a7b6c"), []);
    const guess = useMemo(() => getCharacterById("c7a8b9d0-1e2f-4a3b-8c5d-6e7f8a9b0c1d"), []);

    // 2. คำนวณ comparison โดยใช้ useMemo (ปลอดภัยและไม่ทำให้เกิด undefined error)
    const comparison = useMemo(() => {
        if (target && guess) {
            return compareCharacters(guess, target);
        }
        return null;
    }, [target, guess]);

    if (!isOpen || !target || !guess || !comparison) return null;
    console.log(guess)

    if (!target || !guess) return null;

    const headers = ['guess', 'Image', 'Gender', 'Race', 'Affiliation', 'Height', 'Age', 'Eye', 'Hair', 'Weapon', 'Ability', 'Release', '1st Arc'];

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to Play" titleAlign="center">

            {/* Instructions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-sm">
                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider">The Objective</h3>
                    <p className="text-[#a0988e]">Guess the mystery <span className="text-white">Bleach character</span> in 10 attempts. Each guess reveals color-coded feedback on their attributes.</p>
                    <div className="flex flex-col gap-2 pt-2">
                        {statusDefinitions.map(({ label, status }) => {
                            const { bg, border, text } = CELL_STYLES[status];
                            // แปลง class Tailwind (เช่น bg-[#0d2918]) ให้กลายเป็นสไตล์ CSS สำหรับดึงสีมาโชว์
                            // หรือถ้าอยากง่ายสุด ให้ดึงจากโครงสร้างที่เหมือนกับ ResultCell
                            return (
                                <div key={status} className="flex items-center gap-2">
                                    <div className={`w-4 h-4 ${bg} ${border} border rounded-[2px]`} />
                                    <span className={text}>{label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider">Attribute Definitions</h3>
                    <ul className="text-[#a0988e] text-xs space-y-2">
                        <li>
                            <strong className="text-white">Affiliation:</strong> The organization or group the character belongs to (e.g., Gotei 13, Espada, Sternritter).
                        </li>
                        <li>
                            <strong className="text-white">Weapon:</strong> Combat style based on tools used:
                            <span className="text-[#4de880]"> Weaponized</span> (Sword/Bow/Tool),
                            <span className="text-[#4de880]"> Unarmed</span> (Physical),
                            <span className="text-[#4de880]"> Energy</span> (Spells).
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
                            <span className="text-[#4de880]"> Scientific</span>,
                            <span className="text-[#4de880]"> Special</span>,
                            <span className="text-[#4de880]"> Support</span>.
                        </li>
                        <li>
                            <strong className="text-white">First Arc:</strong> The specific story arc where the character debuted.
                        </li>
                    </ul>
                </div>
            </div>

            {/* Example Table */}
            <div className="border-t border-[#c8a96e]/20 pt-6">
                <h3 className="text-[#c8a96e] font-bold uppercase tracking-wider mb-4">Example Gameplay</h3>

                <div className="space-y-4">
                    <div className="relative flex items-center gap-4">
                        <div className="relative w-16 h-16">
                            <Image src={`/assets/characters/${target.image}`} alt={target.name} fill className="object-cover" />
                        </div>
                        <p className="text-xs text-[#a0988e]">Target Character: <span className="font-bold">{target.name}</span></p>
                    </div>

                    {/* Grid 12 Columns now including Image/FirstArc */}
                    {/* Header Row */}
                    <div className="grid grid-cols-13 gap-1 text-[8px] uppercase font-bold text-center mb-2">
                        {headers.map(h => (
                            <div key={h} className="text-[#c8a96e] p-1">{h}</div>
                        ))}
                    </div>

                    {/* Target Row (Byakuya) */}
                    <div className="grid grid-cols-13 gap-1 text-[8px] font-bold text-center mb-2">
                        <div className={`${cellClass} bg-[#0e0e1a]`}>Target</div>
                        <div className={`${cellClass} bg-gray-900 relative`}>
                            <Image src={`/assets/characters/${target.image}`} alt={target.name} fill className="w-10 h-10 object-cover" />
                        </div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.gender}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.race.length > 1 ? "Hybrid" : target.race[0]}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.affiliation}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{formatHeight(target.heightCm)}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{formatAge(target.age)}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.eyeColor}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.hairColor}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.weapon.join(', ')}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.primaryAbility.join(', ')}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.release.join(', ')}</div>
                        <div className={`${cellClass} bg-[#0e0e1a]`}>{target.firstAppearanceChapter}</div>
                    </div>

                    {/* Guess Row (Ichigo) */}
                    <div className="grid grid-cols-13 gap-1 text-[8px] font-bold text-center">
                        <div className={`${cellClass} bg-[#0e0e1a]`}>Guess</div>

                        {/* Image */}
                        <div className={`${cellClass} bg-gray-900 relative`}>
                            <Image src={`/assets/characters/${guess.image}`} alt={guess.name} fill className="w-10 h-10 object-cover" />
                        </div>

                        {/* ใช้ ResultCell ที่คุณมีอยู่แล้ว เพื่อจัดการเรื่องสีและสถานะ */}
                        <ResultCell size="sm" value={guess.gender} status={comparison.gender} colIndex={0} animate={false} />
                        <ResultCell size="sm" value={guess.race.length > 1 ? "Hybrid" : guess.race[0]} status={comparison.race} colIndex={1} animate={false} />
                        <ResultCell size="sm" value={guess.affiliation} status={comparison.affiliation} colIndex={2} animate={false} />

                        {/* ใช้ formatHeight กับค่าจาก guess.heightCm โดยตรง และใช้ status จาก comparison.height */}
                        <ResultCell size="sm" value={formatHeight(guess.heightCm)} status={comparison.height} colIndex={3} animate={false} />
                        <ResultCell size="sm" value={formatAge(guess.age)} status={comparison.age} colIndex={4} animate={false} />

                        <ResultCell size="sm" value={guess.eyeColor} status={comparison.eyeColor} colIndex={5} animate={false} />
                        <ResultCell size="sm" value={guess.hairColor} status={comparison.hairColor} colIndex={6} animate={false} />

                        {/* ส่งค่า .join() เข้าไปใน value โดยตรง */}
                        <ResultCell size="sm" value={guess.weapon.join(', ')} status={comparison.weapon} colIndex={7} animate={false} />
                        <ResultCell size="sm" value={guess.primaryAbility.join(', ')} status={comparison.primaryAbility} colIndex={8} animate={false} />
                        <ResultCell size="sm" value={guess.release.join(', ')} status={comparison.release} colIndex={9} animate={false} />
                        <ResultCell size="sm" value={guess.firstAppearanceChapter} status={comparison.firstAppearanceChapter} colIndex={10} animate={false} />
                    </div>
                </div>
            </div>

            <Button className="w-full mt-10" onClick={onClose}>
                Start Guessing
            </Button>
        </Modal>
    );
};