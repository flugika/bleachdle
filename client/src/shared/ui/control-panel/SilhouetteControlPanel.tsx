// src/features/silhouette/components/SilhouetteControlPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { SearchBar } from '@/src/shared/ui/SearchBar';
import { Character } from '@/src/entities/character/schema';
import { SilhouetteImage } from '@/src/features/silhouette/components/shared/SilhouetteImage';
// 🆕 game: SilhouetteGuessable แทน SilhouetteGameController — panel นี้แค่โชว์รูป + ส่งเดา
// ไม่เคยเรียก hardReset/initializeGame/resetStreakKeepMax เลย ไม่มีเหตุผลต้องบังคับรับ type เต็ม
import { SilhouetteGuessable, SilhouetteTargetHidden } from '@/src/features/silhouette/types';
import { STORAGE_KEYS } from '@/src/const/localStorage';

// 🎨 ปรับปรุงพาเลทสีใหม่: เน้นสีสว่าง/สดใส ที่ไม่ปนม่วงหรือดำ เพื่อให้ตัดกับเงาตัวละครสีดำได้คมชัดที่สุด
const TYBW_PALETTE = [
    { name: 'Sternritter Blue', hex: '#3E77CF' },    // ฟ้าประกายกวินซี
    { name: 'Blood War Crimson', hex: '#A62424' },   // แดงชาดสงครามเลือดพันปี
    { name: 'Captain Amber', hex: '#f8c361' },       // ทองอำพันเสื้อคลุมหัวหน้าหน่วย
    { name: 'Quincy Pure White', hex: '#F8FAFC' },    // ขาวบริสุทธิ์ชุดกวินซี
    { name: 'Kurosaki Orange', hex: '#F6842E' },     // ส้มเพลิงแรงดันวิญญาณอิจิโกะ
    { name: 'Senbonzakura Pink', hex: '#D45B7E' },    // ชมพูกลีบซากุระบังไคเบียคุยะ
    { name: 'Urahara Jade Green', hex: '#16805B' }    // เขียวหยกพรีเมียมหมวกอุราฮาร่า
];

interface Props {
    target: SilhouetteTargetHidden | null;
    characters: Character[];
    remainingGuesses: number;
    stats: { currentStreak: number; maxStreak: number };
    game: SilhouetteGuessable;
    isGameOver: boolean;
    mode: "daily" | "unlimited";
    timeLeft?: string;
}

export function SilhouetteControlPanel({ target, characters, remainingGuesses, stats, game, isGameOver, mode, timeLeft }: Props) {
    const [currentBg, setCurrentBg] = useState('#3E77CF');
    const [showPalette, setShowPalette] = useState(false);

    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
            if (savedConfig) {
                const configObj = JSON.parse(savedConfig);
                // ตรวจสอบว่ามีคีย์ silhouette_bg บันทึกไว้ไหม ถ้ามีก็เซ็ตใช้งานเลย
                if (configObj.silhouette_bg) {
                    setCurrentBg(configObj.silhouette_bg);
                }
            }
        } catch (error) {
            console.error('Failed to load silhouette background from localStorage:', error);
        }
    }, []);

    const handleBgChange = (hex: string) => {
        setCurrentBg(hex);
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
            // ถ้าเคยมี config อยู่แล้วให้แกะออกมาอัปเดตเพิ่ม ถ้าไม่มีให้สร้างเป็นออบเจกต์ว่างเปล่าขึ้นมาใหม่
            const configObj = savedConfig ? JSON.parse(savedConfig) : {};

            configObj.silhouette_bg = hex; // ฝังฟิลด์สีเข้าไป

            localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(configObj));
        } catch (error) {
            console.error('Failed to save silhouette background to localStorage:', error);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full font-[family-name:var(--font-display)]">

            {/* กล่องแสดงเงาตัวละครพร้อมสลับสีพื้นหลังตาม State */}
            {target && (
                <SilhouetteImage
                    mode={mode}
                    characterId={target.character_id}
                    image={target.id}
                    guessCount={game.guesses.length}
                    bgColor={currentBg}
                />
            )}

            {/* คอนโทรลเลอร์จานสีดีไซน์คลีน */}
            <div className="flex flex-col items-center gap-2 transition-all">
                <button
                    onClick={() => setShowPalette(!showPalette)}
                    className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#c8a96e]/70 hover:text-[#c8a96e] bg-white/[0.02] border border-white/[0.05] hover:border-[#c8a96e]/30 px-3 py-1 rounded-full transition-all flex items-center gap-2 active:scale-95"
                >
                    <span className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: currentBg }} />
                    {showPalette ? 'Close Palette' : 'Change Aura Background'}
                </button>

                {/* หลุมสี 4 สีพรีเมียม ไร้เงาสีมืดหรือสีม่วงกวนใจ */}
                {showPalette && (
                    <div className={`flex gap-4 px-2 py-1 items-center justify-center overflow-hidden transition-all duration-300 ease-out ${showPalette ? 'max-h-10 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 pointer-events-none'
                        }`}>
                        {TYBW_PALETTE.map((color) => (
                            <button
                                key={color.hex}
                                onClick={() => handleBgChange(color.hex)}
                                title={color.name}
                                className={`w-5 h-5 rounded-full border transition-all relative group flex items-center justify-center ${currentBg === color.hex
                                    ? 'border-[#c8a96e] scale-110 ring-2 ring-[#c8a96e]/20'
                                    : 'border-white/10 hover:border-white/40 hover:scale-105'
                                    }`}
                                style={{ backgroundColor: color.hex }}
                            >
                                {/* จุดเอฟเฟกต์กะพริบตรงกลางเมื่อเลือกสีนั้นๆ */}
                                {currentBg === color.hex && (
                                    <span className="w-1 h-1 bg-white rounded-full animate-ping absolute" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ส่วนของช่องค้นหาเดาชื่อตัวละคร */}
            <div className="w-full max-w-md">
                <SearchBar
                    characters={characters}
                    disabled={isGameOver}
                    game={game}
                    rowIdPrefix="silhouette-row"
                />
            </div>

            {/* บอร์ดสถิติผู้เล่น */}
            <div className="flex gap-8 text-[11px] uppercase tracking-[0.2em] text-[#777796] mt-2">
                {mode === 'daily' && timeLeft && (
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Next Reset</span>
                        <span className="text-[#4de880] text-lg font-bold font-mono">{timeLeft}</span>
                    </div>
                )}

                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Attempts Left</span>
                    <span className={`${remainingGuesses === 0 ? 'text-[#e83030]' : 'text-[#4de880]'} text-lg font-bold`}>
                        {remainingGuesses}
                    </span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Current Streak</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.currentStreak}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Max Streak</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.maxStreak}</span>
                </div>
            </div>
        </div>
    );
}