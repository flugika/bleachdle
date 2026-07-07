// src/features/silhouette/components/SilhouetteImage.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCellWeights, getOccupiedCells, getRevealedCellIndices, getSilhouetteImageUrl, GRID_SIZE } from '@/src/features/silhouette/silhouette';
import { STORAGE_KEYS } from '@/src/const/localStorage';
import SoulSyncLoader from '@/src/shared/ui/loader/SoulSyncLoader';

interface Props {
    characterId: string;
    image: string;
    realImage?: string;
    guessCount?: number;
    forceReveal?: boolean;
    bgColor?: string;
}

const DEFAULT_BG = '#3E77CF';

export const SilhouetteImage = ({
    characterId,
    image,
    realImage,
    guessCount = 0,
    forceReveal = false,
    bgColor
}: Props) => {
    const [internalBg, setInternalBg] = useState(bgColor || DEFAULT_BG);
    const [configReady, setConfigReady] = useState(false);
    const [silhouetteLoaded, setSilhouetteLoaded] = useState(false);
    const [realImageLoaded, setRealImageLoaded] = useState(false);

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

    const silhouetteSrc = getSilhouetteImageUrl(image);
    const fullCharacterSrc = realImage ? `/assets/characters/${realImage}` : null;

    useEffect(() => {
        let cancelled = false;
        setSilhouetteLoaded(false);

        const silhouetteImg = new Image();
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

    useEffect(() => {
        let cancelled = false;

        if (!fullCharacterSrc) {
            setRealImageLoaded(true);
            return;
        }

        setRealImageLoaded(false);
        const realImg = new Image();
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
        () => getRevealedCellIndices(characterId, guessCount, getOccupiedCells(image), getCellWeights(image)),
        [characterId, guessCount, image],
    );

    const isReady = configReady && silhouetteLoaded;

    return (
        <div className="relative w-full max-w-sm aspect-square mx-auto">

            {/* 🔄 LOADING LAYER — Central 46 / Kido premium plate */}
            <div
                aria-hidden={isReady}
                className={`absolute inset-0 overflow-hidden rounded-sm border border-[#c8a96e]/20 bg-[radial-gradient(ellipse_at_center,#0d0d14_0%,#020205_90%)] transition-all duration-500 ease-out ${isReady ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
                    }`}
            >
                {/* scanline texture */}
                <div className="absolute inset-0 bleach-scanlines pointer-events-none opacity-30" />

                {/* ambient reiatsu glow, breathing */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,169,110,0.08),transparent_65%)] animate-pulse pointer-events-none" />

                {/* rotating diagonal blade-light, faint */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
                    <div className="w-[160%] h-[1px] bg-gradient-to-r from-transparent via-[#c8a96e]/50 to-transparent rotate-[-35deg] blur-[0.5px]" />
                </div>

                {/* Kido corner brackets */}
                <div className="absolute inset-3 pointer-events-none">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#c8a96e]/70 drop-shadow-[0_0_6px_rgba(200,169,110,0.5)]" />
                </div>

                {/* system tag, top */}
                <span className="absolute top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-[0.35em] text-[#c8a96e]/50 uppercase">
                    Reishi // Decrypting
                </span>

                {/* center: loader + kanji */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <span className="text-2xl font-black text-[#c8a96e]/25 tracking-widest select-none animate-pulse">
                        卍
                    </span>
                    <SoulSyncLoader hideLabel className="mt-0 mb-0" />
                    <span className="text-[9px] font-mono tracking-[0.3em] text-[#8a8aa3]/70 uppercase animate-pulse">
                        Analyzing Spiritual Signature
                    </span>
                </div>

                {/* bottom system code */}
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-[0.25em] text-neutral-600 uppercase">
                    Central_46 // Archive_Sync
                </span>
            </div>

            {/* 🖼️ CONTENT LAYER */}
            <div
                aria-hidden={!isReady}
                className={`absolute inset-0 overflow-hidden border border-[#232333] rounded-sm shadow-2xl group ring-1 ring-white/5 transition-all duration-700 ease-out ${isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98] pointer-events-none'
                    }`}
                style={{ backgroundColor: internalBg }}
            >
                {/* 🖼️ LAYER 3 (Base Silhouette Image) */}
                <img
                    src={silhouetteSrc}
                    alt="Target Silhouette Signature"
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter drop-shadow-[0_0_15px_rgba(0,0,0,0.9)] transition-all duration-700 ease-in-out z-20 ${forceReveal ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'
                        }`}
                    draggable={false}
                />

                {/* 🌟 LAYER 4 (Premium Reveal Layer) */}
                {fullCharacterSrc && (
                    <img
                        src={fullCharacterSrc}
                        alt="Character Reality Decrypted"
                        className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter drop-shadow-[0_0_20px_rgba(200,169,110,0.3)] transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) z-30 ${forceReveal && realImageLoaded ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-105 rotate-1'
                            }`}
                        draggable={false}
                    />
                )}

                {/* 🔲 LAYER 6: แผ่นป้ายบล็อกสีดำปิดทับปริศนา */}
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
        </div>
    );
};