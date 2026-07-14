// src/features/silhouette/components/SilhouetteImage.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCellWeights, getOccupiedCells, getRevealedCellIndices, GRID_SIZE } from '@/src/features/silhouette/silhouette';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import SoulSyncLoader from '@/src/shared/ui/loader/SoulSyncLoader';
import Image from 'next/image';

interface Props {
    characterId: string;
    image: string;
    mode: "daily" | "unlimited";
    realImage?: string;
    guessCount?: number;
    bgColor?: string;
    revealMode?: 'guessing' | 'revealed' | 'crossfade';
    crossfadeIntervalMs?: number;
}

const DEFAULT_BG = '#3E77CF';

export const SilhouetteImage = ({
    characterId,
    image,
    mode,
    realImage,
    guessCount = 0,
    bgColor,
    revealMode = 'guessing',
    crossfadeIntervalMs = 3200,
}: Props) => {
    const [internalBg, setInternalBg] = useState(bgColor || DEFAULT_BG);
    const [configReady, setConfigReady] = useState(false);
    const [silhouetteLoaded, setSilhouetteLoaded] = useState(false);
    const [realImageLoaded, setRealImageLoaded] = useState(false);
    const [isCrossfadeRevealed, setIsCrossfadeRevealed] = useState(false);

    useEffect(() => {
        if (bgColor) {
            setInternalBg(bgColor);
            setConfigReady(true);
            return;
        }
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
            } finally {
                setConfigReady(true);
            }
        } else {
            setConfigReady(true);
        }
    }, [bgColor]);

    // 🔒 จุดที่ 1: silhouette เดิมโหลดได้เสมอ (ไม่ใช่เฉลยเต็ม) แต่เปลี่ยนไปผ่าน proxy
    // เพื่อความสม่ำเสมอ — ไม่ต้อง getSilhouetteImageUrl(image) ที่ยิง /assets/... ตรงอีก
    const silhouetteSrc = `/api/asset/silhouette/${characterId}`;

    // 🔒 จุดที่ 2: fullCharacterSrc ต้องเป็น null จนกว่าจะถึงจังหวะเฉลยจริง
    // เดิม: realImage ? `/api/asset/character/${realImage}` : null  ← เห็นชื่อไฟล์ตรงๆ ใน Network
    // ใหม่: ใช้ proxy + เงื่อนไข revealMode ป้องกันทั้ง "เห็นชื่อไฟล์" และ "เห็นจังหวะโหลดก่อนเฉลย"
    const fullCharacterSrc = (revealMode !== 'guessing' && realImage)
        ? `/api/asset/character/${characterId}`
        : null;

    useEffect(() => {
        let cancelled = false;
        setSilhouetteLoaded(false);

        const silhouetteImg = new window.Image();
        silhouetteImg.src = silhouetteSrc;

        const markSilhouetteLoaded = () => {
            if (!cancelled) setSilhouetteLoaded(true);
        };

        if (silhouetteImg.complete) {
            markSilhouetteLoaded();
        } else {
            silhouetteImg.onload = markSilhouetteLoaded;
            silhouetteImg.onerror = markSilhouetteLoaded;
        }

        return () => { cancelled = true; };
    }, [silhouetteSrc]);

    // 🔒 จุดที่ 3: อย่า fetch fullCharacterSrc จนกว่า revealMode จะไม่ใช่ 'guessing'
    // เดิม effect นี้รันทันทีที่ fullCharacterSrc มีค่า ไม่สนโหมด — ทำให้รูปจริงถูก
    // request ล่วงหน้าตั้งแต่ตอนเกมยังไม่จบ (เห็นใน Network tab ก่อนทายถูกเสียอีก)
    useEffect(() => {
        let cancelled = false;

        if (!fullCharacterSrc) {
            // ยังไม่ถึงจังหวะเฉลย หรือไม่มีรูปจริงให้โหลด — ถือว่า "พร้อม" ไปเลย ไม่ต้องรอ
            setRealImageLoaded(true);
            return;
        }

        setRealImageLoaded(false);
        const realImg = new window.Image();
        realImg.src = fullCharacterSrc;

        const markRealImageLoaded = () => {
            if (!cancelled) setRealImageLoaded(true);
        };

        if (realImg.complete) {
            markRealImageLoaded();
        } else {
            realImg.onload = markRealImageLoaded;
            realImg.onerror = markRealImageLoaded;
        }

        return () => { cancelled = true; };
    }, [fullCharacterSrc]);

    const revealed = useMemo(
        () => getRevealedCellIndices(characterId, guessCount, mode, getOccupiedCells(image), getCellWeights(image)),
        [characterId, guessCount, image, mode],
    );

    const isReady = configReady && silhouetteLoaded;

    useEffect(() => {
        if (revealMode !== 'crossfade' || !fullCharacterSrc || !isReady || !realImageLoaded) {
            setIsCrossfadeRevealed(false);
            return;
        }

        const id = setInterval(() => {
            setIsCrossfadeRevealed((prev) => !prev);
        }, crossfadeIntervalMs);

        return () => clearInterval(id);
    }, [revealMode, fullCharacterSrc, isReady, realImageLoaded, crossfadeIntervalMs]);

    const effectiveReveal = revealMode === 'revealed' || (revealMode === 'crossfade' && isCrossfadeRevealed);

    return (
        <div className="relative w-full max-w-sm aspect-square mx-auto">
            {/* 🔄 LOADING LAYER — เหมือนเดิมทั้งหมด ไม่แตะ */}
            <div
                aria-hidden={isReady}
                className={`absolute inset-0 overflow-hidden rounded-sm border border-[#c8a96e]/20 bg-[radial-gradient(ellipse_at_center,#0d0d14_0%,#020205_90%)] transition-all duration-500 ease-out ${isReady ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
                    }`}
            >
                <div className="absolute inset-0 bleach-scanlines pointer-events-none opacity-30" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.08),transparent_65%)] animate-pulse pointer-events-none" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-[160%] h-[1px] bg-gradient-to-r from-transparent via-[#c8a96e]/50 to-transparent rotate-[-35deg] blur-[0.5px]" />
                </div>
                <div className="absolute inset-3 pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                </div>
                <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.35em] text-[#c8a96e]/50 uppercase">
                    Reishi // Decrypting
                </span>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="text-2xl font-black text-[#c8a96e]/25 tracking-widest select-none animate-pulse">
                        卍
                    </span>
                    <SoulSyncLoader hideLabel className="mt-0 mb-0" />
                    <span className="text-[9px] font-mono tracking-[0.3em] text-[#8a8aa3]/70 uppercase animate-pulse">
                        Analyzing Spiritual Signature
                    </span>
                </div>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-[0.25em] text-neutral-600 uppercase">
                    Central_46 // Archive_Sync
                </span>
            </div>

            {/* 🖼️ CONTENT LAYER — เหมือนเดิมทั้งหมด ไม่แตะ */}
            <div
                aria-hidden={!isReady}
                className={`absolute inset-0 overflow-hidden border border-[#232333] rounded-sm shadow-2xl group ring-1 ring-white/5 transition-all duration-700 ease-out ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98] pointer-events-none'
                    }`}
                style={{ backgroundColor: internalBg }}
            >
                <Image
                    src={silhouetteSrc}
                    alt="Target Silhouette Signature"
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter drop-shadow-[0_0_15px_rgba(0,0,0,0.9)] transition-all duration-700 ease-in-out z-20 ${effectiveReveal ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'
                        }`}
                    draggable={false}
                    fill
                    sizes="(max-w-sm) 100vw, 384px"
                    unoptimized // 👈 เพิ่ม: /api/asset/... เป็น dynamic route ไม่ใช่ static file ปล่อยให้ Next.js Image Optimizer จัดการเองจะ error/ไม่คุ้ม
                />

                {fullCharacterSrc && (
                    <Image
                        src={fullCharacterSrc}
                        alt="Character Reality Decrypted"
                        className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter drop-shadow-[0_0_20px_rgba(200,169,110,0.3)] transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) z-30 ${effectiveReveal && realImageLoaded ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-105 rotate-1'
                            }`}
                        draggable={false}
                        fill
                        sizes="(max-w-sm) 100vw, 384px"
                        unoptimized
                    />
                )}

                <div
                    className="absolute inset-0 grid z-40 transition-opacity duration-500"
                    style={{
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                    }}
                >
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                        const isBoxRevealed = effectiveReveal || revealed.has(i);
                        return (
                            <div
                                key={i}
                                className="transition-all duration-700 ease-out border border-[#c8a96e]/15 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)]"
                                style={{
                                    backgroundColor: '#010103',
                                    opacity: isBoxRevealed ? 0 : 1,
                                    transform: isBoxRevealed ? 'scale(0.85)' : 'scale(1)',
                                    pointerEvents: 'none',
                                }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};