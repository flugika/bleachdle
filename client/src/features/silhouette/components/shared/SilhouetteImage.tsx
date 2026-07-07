// src/features/silhouette/components/SilhouetteImage.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { getOccupiedCells, getRevealedCellIndices, getSilhouetteImageUrl, GRID_SIZE } from '@/src/features/silhouette/silhouette';
import { STORAGE_KEYS } from '@/src/const/localStorage';

interface Props {
    characterId: string;
    image: string;          // ไฟล์เงา เช่น "Yasutora_Sado_cutout_silhouette.webp"
    realImage?: string;     // ไฟล์รูปจริง เช่น "Yasutora_Sado.webp" เพื่อใช้เปิดโชว์ตอนชนะ/แพ้
    guessCount?: number;     // จำนวนครั้งที่ทายไปแล้ว
    forceReveal?: boolean;   // สั่งข้ามไปเปิดเผยตัวตนที่แท้จริงทั้งหมดทันที
    bgColor?: string;        // 🎨 เพิ่ม Prop รับสีพื้นหลังเบื้องหลังเงา
}

const DEFAULT_BG = '#3E77CF';

export const SilhouetteImage = ({
    characterId,
    image,
    realImage,
    guessCount = 0,
    forceReveal = false,
    bgColor     // Default เป็นสีฟ้า Quincy คลาสสิก
}: Props) => {
    // 🎨 สร้าง State ภายในเพื่อรองรับการดึงข้อมูลจาก LocalStorage
    const [internalBg, setInternalBg] = useState(bgColor || DEFAULT_BG);

    // ลอจิกดึงข้อมูลจาก localStorage สดๆ เมื่อคอมโพเนนต์เริ่มทำงานบน Client
    useEffect(() => {
        // ถ้าข้างนอกส่งสีเจาะจงมา (เช่น จากปุ่มกดเปลี่ยนสดๆ ใน ControlPanel) ให้ยึดสีนั้นก่อน
        if (bgColor) {
            setInternalBg(bgColor);
            return;
        }

        // หากไม่มีสีส่งเข้ามา ให้ทำการรื้อถอนก้อน config เพื่อหาค่าสีเดิมที่เคยบันทึกไว้
        if (typeof window !== 'undefined') {
            try {
                const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
                if (savedConfig) {
                    const configObj = JSON.parse(savedConfig);
                    if (configObj.silhouette_bg) {
                        setInternalBg(configObj.silhouette_bg);
                    }
                }
            } catch (error) {
                console.error('Failed to parse silhouette_bg from config:', error);
            }
        }
    }, [bgColor]);

    // ดึงค่าอาเรย์ช่องกริดที่ถูกสุ่มเปิดเผยตามลอจิกของวัน/รอบนั้นๆ
    const revealed = useMemo(
        () => getRevealedCellIndices(characterId, guessCount, getOccupiedCells(image)),
        [characterId, guessCount, image],
    );

    // กำหนด Path รูปภาพหลักและรูปภาพเฉลยจริง
    const silhouetteSrc = getSilhouetteImageUrl(image);
    const fullCharacterSrc = realImage ? `/assets/characters/${realImage}` : null;

    return (
        // 🛠️ FIX: ถอด bg-[#3E77CF] ออกแล้วผูก style เข้ากับตัวแปร bgColor แทน
        <div
            className="relative w-full max-w-sm aspect-square mx-auto overflow-hidden border border-[#232333] rounded-sm shadow-2xl group ring-1 ring-white/5 transition-colors duration-500"
            style={{ backgroundColor: internalBg }}
        >

            {/* 🖼️ LAYER 3 (Base Silhouette Image): ก้อนเงาดำทมิฬ */}
            <img
                src={silhouetteSrc}
                alt="Target Silhouette Signature"
                className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter drop-shadow-[0_0_15px_rgba(0,0,0,0.9)] transition-all duration-700 ease-in-out z-20 ${forceReveal ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'
                    }`}
                draggable={false}
            />

            {/* 🌟 LAYER 4 (Premium Reveal Layer): ภาพสีจริงจากตัวละครที่จะเฟดเข้ามาอย่างอลังการ */}
            {fullCharacterSrc && (
                <img
                    src={fullCharacterSrc}
                    alt="Character Reality Decrypted"
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter drop-shadow-[0_0_20px_rgba(200,169,110,0.3)] transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) z-30 ${forceReveal ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-105 rotate-1'
                        }`}
                    draggable={false}
                />
            )}

            {/* 🔲 LAYER 6: แผ่นป้ายบล็อกสีดำปิดทับปริศนา (Premium Covering Blocks) */}
            <div
                className="absolute inset-0 grid z-40 transition-opacity duration-500"
                style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                }}
            >
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                    const isRevealed = forceReveal || revealed.has(i);

                    return (
                        <div
                            key={i}
                            className="transition-all duration-700 ease-out border border-[#c8a96e]/15 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)]"
                            style={{
                                backgroundColor: '#010103',
                                opacity: isRevealed ? 0 : 1,
                                transform: isRevealed ? 'scale(0.85)' : 'scale(1)',
                                pointerEvents: 'none',
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};