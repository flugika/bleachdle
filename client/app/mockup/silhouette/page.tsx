"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import { getCharacters } from '@/src/features/character/character';
import { Character } from '@/src/entities/character/schema';
import { createSearchEngine } from '@/src/lib/search/fuzzy';
import { getCellWeights, getOccupiedCells, getRevealedCellIndices, getSilhouetteImageUrl, getSilhouettes, GRID_SIZE } from '@/src/features/silhouette/silhouette';

// Layout Shared Components
import { Header } from '@/src/shared/ui/layout/Header';
import { Divider } from '@/src/shared/ui/layout/Divider';
import { SubHeader } from '@/src/shared/ui/layout/SubHeader';
import { ModeBadge } from '@/src/shared/ui/game-selector/ModeBadge';
import Sealed from '@/src/shared/ui/Sealed';
import { FEATURE_FLAGS } from '@/src/config/feature.flags';
import SoulSyncLoader from '@/src/shared/ui/loader/SoulSyncLoader';

// ============================================================================
// Constants
// ============================================================================

const PREVIEW_STEPS = [
    { label: 'Start (0)', value: 0 },
    { label: '2', value: 2 },
    { label: '4', value: 4 },
    { label: '6', value: 6 },
    { label: '8', value: 8 },
    { label: '🔥 Full (10)', value: 10 },
] as const;

const DEFAULT_SCALE = 2.5;
const DEFAULT_FOCUS = 50;

// ============================================================================
// Helpers
// ============================================================================

const generateUuid = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });

// ============================================================================
// Sub-component: Character Filter Search Bar
// ============================================================================

function CharacterFilterBar({
    query,
    onQueryChange,
    resultCount,
    totalCount,
}: {
    query: string;
    onQueryChange: (v: string) => void;
    resultCount: number;
    totalCount: number;
}) {
    return (
        <div className="max-w-2xl mx-auto mb-6">
            <div className="relative group/input">
                <div className="absolute -inset-px bg-gradient-to-r from-red-900/0 via-red-600/0 to-red-900/0 group-focus-within/input:via-red-600/40 transition-all duration-500" />

                <input
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="FILTER: SEARCH CHARACTER NAME..."
                    autoComplete="off"
                    className="relative w-full py-3 pl-5 pr-24 bg-[#050507] text-[#e2e2e5] text-xs font-medium tracking-[0.15em] uppercase border border-[#1a1a24] focus:outline-none focus:border-red-600/80 focus:text-white transition-all duration-300 placeholder-[#444452]"
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                    <span className="text-[11px] font-mono font-bold text-[#777796]">
                        {resultCount}/{totalCount}
                    </span>
                    <span className="text-[12px] text-[#444452] group-focus-within/input:text-red-500 tracking-widest transition-colors duration-300 font-mono">
                        //
                    </span>
                </div>

                {query && (
                    <button
                        type="button"
                        onClick={() => onQueryChange('')}
                        className="absolute right-16 top-1/2 -translate-y-1/2 text-[12px] font-mono font-bold text-[#777796] hover:text-red-500 transition-colors pointer-events-auto"
                        title="Clear filter"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Sub-component: Global Preview Control Panel
// ============================================================================

function PreviewControlPanel({
    selected,
    onSelect,
}: {
    selected: number;
    onSelect: (value: number) => void;
}) {
    return (
        <div className="my-6 p-5 bg-[#0a0a0f] border border-[#1b1b26] rounded-sm max-w-2xl mx-auto shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#c8a96e] mb-3 text-center">
                // GLOBAL REVEAL PREVIEW — SIMULATE WRONG GUESS COUNT
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {PREVIEW_STEPS.map((step) => (
                    <button
                        key={step.value}
                        onClick={() => onSelect(step.value)}
                        className={`py-2 px-1 text-[12px] font-mono font-bold tracking-wider uppercase border transition-all duration-200 ${selected === step.value
                            ? 'bg-red-950/40 border-red-600 text-white shadow-[0_0_14px_rgba(220,38,38,0.2)]'
                            : 'bg-[#050507] border-[#222230] text-[#555566] hover:border-[#44445c] hover:text-white'
                            }`}
                    >
                        {step.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Sub-component: Silhouette preview box (TYBW Premium Interactive Grid)
// ============================================================================

// 🎯 1. Preview box นี้ตอนนี้ preview ผ่าน getRevealedCellIndices จริง ๆ (ไม่มีการเลือกช่องมือแล้ว
//    เพราะ initial reveal ถูก gen อัตโนมัติจาก characterId + วันที่ + occupiedCells)
interface SilhouettePreviewBoxProps {
    characterId: string;         // 🆔 effective id (รวม override) ใช้เป็น seed จริงตอนเล่นเกม
    originalCharacterId: string; // ไอดีต้นฉบับ ใช้หา occupiedCells / silhouette record
    image: string;
    guessCount: number;          // จำนวนเดาผิดที่ simulate จาก PreviewControlPanel
    forceReveal?: boolean;
    isLoading?: boolean;         // 🌀 กำลัง generate grid อยู่ (โชว์ loader แทน)
}

function SilhouettePreviewBox({
    characterId,
    originalCharacterId,
    image,
    guessCount,
    forceReveal = false,
    isLoading = false,
}: SilhouettePreviewBoxProps) {

    const sil = useMemo(() => getSilhouettes().find(s => s.character_id === originalCharacterId), [originalCharacterId]);
    const occupiedCells = useMemo(() => getOccupiedCells(image), [image]);
    const weightCells = useMemo(() => getCellWeights(image), [image]);
    const revealed = useMemo(
        () => getRevealedCellIndices(characterId, guessCount, "unlimited", occupiedCells, weightCells),
        [characterId, guessCount, occupiedCells],
    );

    return (
        <div className="relative w-full aspect-square overflow-hidden border border-[#221c38] bg-[#3E77CF] shrink-0 rounded shadow-[0_0_25px_rgba(15,10,25,0.5)] group/preview">
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050508]">
                    <SoulSyncLoader hideLabel className="mt-0 mb-6" />
                </div>
            ) : image ? (
                <>
                    {/* EFFECT 1: Premium TYBW Reiatsu Radial Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(43,29,87,0.3)_0%,_rgba(5,5,8,0)_75%)]" />

                    {/* EFFECT 2: Vignette Shadow Edge */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.4),transparent_20%,transparent_80%,rgba(0,0,0,0.7))]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.4),transparent_20%,transparent_80%,rgba(0,0,0,0.4))]" />

                    {/* Image Base Layer */}
                    <img
                        src={getSilhouetteImageUrl(image)}
                        alt="preview"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                    />

                    {/* 🔲 GRID LAYER: แนบชิดกันสนิท (gap-0 p-0) ไม่มีการเบลอพื้นหลังกวนตา */}
                    <div
                        className="absolute inset-0 grid gap-0 p-0 z-10"
                        style={{
                            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
                        }}
                    >
                        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                            const isRevealed = revealed.has(i);

                            return (
                                <div
                                    key={i}
                                    className={`
                                        relative aspect-square transition-all duration-150 ease-out font-mono text-[9px] font-bold select-none
                                        flex items-center justify-center border border-black/40 opacity-100
                                        ${
                                        // ถ้าสั่ง forceReveal ให้โปร่งใสเห็นภาพ แต่ถ้าเป็นโหมดปกติ ช่องที่ยังไม่เปิดต้องดำทึบ 100%
                                        forceReveal
                                            ? isRevealed
                                                ? 'bg-transparent border-amber-500/30 text-amber-400/80'
                                                : 'bg-transparent border-white/10 text-[#474761]'
                                            : isRevealed
                                                ? 'bg-transparent border-amber-500/50 text-amber-400 shadow-[inset_0_0_8px_rgba(245,158,11,0.2)]'
                                                : 'bg-[#010103] text-[#69698c]' // ทึบสนิท Opacity 1 ไม่จาง
                                        }
                                    `}
                                    title={isRevealed ? `Tile #${i} — revealed` : `Tile #${i} — hidden`}
                                >
                                    {/* หมายเลขช่องแบบ Grid Matrix */}
                                    <span className={`absolute bottom-0.5 right-1 text-[8px] tracking-tighter ${isRevealed ? 'text-amber-500/60' : 'text-[#474761]'
                                        }`}>
                                        {i}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* EFFECT 3: Premium Corner Brackets */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#5b4d8c] opacity-60 pointer-events-none z-20" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#5b4d8c] opacity-60 pointer-events-none z-20" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#5b4d8c] opacity-60 pointer-events-none z-20" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#5b4d8c] opacity-60 pointer-events-none z-20" />
                </>
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-[#444452] uppercase">
                    No image path
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Sub-component: Live Tuning Workbench
// ============================================================================

function LiveTuningWorkbench({
    character,
    characterId,
    image,
    previewGuessCount,
    onImageChange,
    onRegenerateId,
}: {
    character: Character;
    characterId: string;
    image: string;
    previewGuessCount: number;
    onImageChange: (v: string) => void;
    onRegenerateId: () => void;
}) {
    // 👁️ Isolated State ควบคุมการ Reveal ภาพเต็มเฉพาะคอมโพเนนต์นี้
    const [isFullyRevealed, setIsFullyRevealed] = useState(false);

    // 🌀 State จำลองสถานะ "กำลัง generate grid" ตอนเปลี่ยน image path (โชว์ SoulSyncLoader)
    const [isGridLoading, setIsGridLoading] = useState(false);
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!image) return;
        setIsGridLoading(true);
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = setTimeout(() => setIsGridLoading(false), 400);
        return () => {
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        };
    }, [image]);

    // 🔑 1. เพิ่ม State ควบคุม Record ID (UUID v4) ให้ชัวร์ว่าทำงานบน Client-only ป้องกัน Hydration Error
    const [recordId, setRecordId] = useState('00000000-0000-0000-0000-000000000000');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setRecordId(crypto.randomUUID());
        }
    }, []); // ใส่ดักไว้ให้ทำงานแค่รอบเดียวตอน Mount สำเร็จ

    // 🔄 2. ลอจิก Wrapper เคลียร์และสุ่ม UUID ใหม่ยกแผงเมื่อกดปุ่ม REGEN ID
    const handleRegenerateAllIds = () => {
        setRecordId(crypto.randomUUID());
        onRegenerateId();
    };

    // 💾 3. แนบคีย์ id (UUID v4) เข้าไปใน Object เพื่อให้ Zod Schema ตรวจสอบผ่านฉลุย
    // ⚠️ ไม่มี initial_revealed_tiles แล้ว เพราะช่องเริ่มต้นถูก gen อัตโนมัติจาก characterId + วันที่ ตอน runtime
    const generatedJsonExample = JSON.stringify(
        {
            id: recordId, // 🛡️ ผ่านการตรวจสอบของ z.string().uuid() แน่นอน
            character_id: characterId,
            image,
        },
        null,
        4,
    ) + ',';

    return (
        <div className="col-span-12 md:col-span-6 lg:col-span-5 p-4 bg-[#07070c] border border-[#151522] rounded-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#1b1b30] pb-2">
                <span className="text-[12px] font-mono font-bold text-[#c8a96e] tracking-wider">🌑 SELECTION MATRIX BOARD</span>

                {/* ส่วนปุ่มกดควบคุมสถานะ Reveal รูปภาพ */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsFullyRevealed(!isFullyRevealed)}
                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-sm border transition-all duration-200 ${isFullyRevealed
                            ? 'bg-indigo-950/50 text-indigo-400 border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                            : 'bg-[#0d0d14] text-[#777796] border-[#2c2c3d] hover:text-white hover:bg-[#12121f]'
                            }`}
                    >
                        {isFullyRevealed ? '🔒 HIDE TILES' : '👁️ REVEAL FULL'}
                    </button>

                    <span className="text-[11px] font-mono text-amber-500 font-bold uppercase">
                        SIMULATED WRONG GUESSES: {previewGuessCount}
                    </span>
                </div>
            </div>

            {/* Image path input */}
            <div>
                <label className="text-[10px] font-mono font-bold block text-gray-400 mb-1">
                    IMAGE PATH (/assets/character_silhouette/...)
                </label>
                <input
                    type="text"
                    value={image}
                    onChange={(e) => onImageChange(e.target.value)}
                    placeholder={character.image}
                    className="w-full bg-[#030305] border border-[#1f1f33] px-2 py-1.5 text-[12px] font-mono text-white focus:outline-none focus:border-red-600"
                />
            </div>

            {/* ส่วนจัดเรียงกระดานแล็บและคำอธิบายสถานะ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <SilhouettePreviewBox
                    characterId={characterId}
                    originalCharacterId={character.id}
                    image={image}
                    guessCount={previewGuessCount}
                    forceReveal={isFullyRevealed}
                    isLoading={isGridLoading}
                />
            </div>

            {/* JSON Node Output Section */}
            <div className="mt-1">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold text-[#777796] uppercase">
                        // Live JSON Node Export
                    </span>
                    <button
                        type="button"
                        onClick={handleRegenerateAllIds} // 🔄 สลับมาใช้ฟังก์ชันกลางที่คุมคู่กัน
                        className="text-[10px] font-mono font-bold text-[#c8a96e] bg-[#0d0d14] border border-[#2c2c3d] px-1.5 py-0.5 hover:border-red-600/60 hover:text-white transition-colors"
                    >
                        🔄 REGEN ID
                    </button>
                </div>
                <div className="relative group">
                    <pre
                        onClick={(e) => {
                            navigator.clipboard.writeText(generatedJsonExample);
                            const target = e.currentTarget;
                            target.style.borderColor = "#f59e0b";
                            setTimeout(() => target.style.borderColor = "#141424", 500);
                        }}
                        className="text-[11px] font-mono text-amber-400 bg-[#030305] p-2 border border-[#141424] overflow-x-auto max-h-32 cursor-pointer hover:bg-[#0a0a0f] transition-all"
                    >
                        {generatedJsonExample}
                    </pre>
                    <div className="absolute top-1 right-1 text-[10px] font-mono bg-[#11111a] text-gray-400 px-1 border border-gray-800 pointer-events-none uppercase group-hover:text-amber-500 group-hover:border-amber-600">
                        Click to Copy
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

export default function MockupSilhouetteGame() {
    if (!FEATURE_FLAGS.mockupSilhouette) {
        return <Sealed />;
    }

    const characters = getCharacters();
    const silhouettes = getSilhouettes();

    const [previewGuessCount, setPreviewGuessCount] = useState<number>(0);
    const [isHowToOpen, setIsHowToOpen] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');

    const [customImages, setCustomImages] = useState<Record<string, string>>({});
    const [idOverrides, setIdOverrides] = useState<Record<string, string>>({});

    const silhouetteMap = useMemo(() => {
        return new Map(silhouettes.map(s => [s.character_id, s]));
    }, [silhouettes]);

    const getEffectiveId = (charId: string) => idOverrides[charId] ?? charId;

    const getSilhouetteImage = (charId: string) => {
        return customImages[charId] ?? silhouetteMap.get(charId)?.image ?? '';
    };

    const regenerateId = (charId: string) =>
        setIdOverrides((prev) => ({ ...prev, [charId]: generateUuid() }));

    const searchEngine = useMemo(
        () => createSearchEngine(characters, { keys: ['name'] } as any),
        [characters],
    );

    const filteredCharacters = useMemo(() => {
        const trimmed = filterQuery.trim();
        if (!trimmed) return characters;
        return searchEngine.search(trimmed).map((r) => r.item);
    }, [filterQuery, searchEngine, characters]);

    return (
        <div className="min-h-screen text-[#d8d0c8] overflow-x-hidden">
            <Header onOpenHowTo={() => setIsHowToOpen(true)} />

            <main className="max-w-[95%] mx-auto px-4 pb-16 mt-6">
                <ModeBadge mode="unlimited" />
                <SubHeader title="SHIKAKU VISUALIZATION" subtitle="SDRI // Gotei 13 Division 12 Visual Fragment Testing Laboratory & Live JSON Tuner Bench" />

                <PreviewControlPanel selected={previewGuessCount} onSelect={setPreviewGuessCount} />

                <CharacterFilterBar
                    query={filterQuery}
                    onQueryChange={setFilterQuery}
                    resultCount={filteredCharacters.length}
                    totalCount={characters.length}
                />

                <Divider />

                {/* 📋 SILHOUETTE ASSETS WORKBENCH GRID */}
                <div className="mt-8 overflow-hidden border border-[#14141a] bg-[#030305]/40">
                    <div className="hidden lg:grid grid-cols-12 gap-4 bg-[#0a0a0f] p-4 border-b border-[#1b1b26] text-[11px] font-bold tracking-[0.15em] text-[#777796] uppercase font-mono">
                        <div className="col-span-3">Character Info // Metadata</div>
                        <div className="col-span-9">🌑 Interactive Grid Lab & Real-Time JSON Generation</div>
                    </div>

                    <div className="divide-y divide-[#14141a]/60">
                        {filteredCharacters.length === 0 ? (
                            <div className="p-8 text-center text-[11px] font-mono text-[#444452] uppercase tracking-widest">
                                No characters match "{filterQuery}"
                            </div>
                        ) : (
                            filteredCharacters.map((character) => {
                                const silImage = getSilhouetteImage(character.id);
                                const effectiveId = getEffectiveId(character.id);

                                return (
                                    <div
                                        key={character.id}
                                        className="grid grid-cols-12 gap-4 p-4 items-start hover:bg-[#07070a] transition-colors duration-150"
                                    >
                                        {/* คอลัมน์ที่ 1: ข้อมูลทั่วไปของตัวละคร */}
                                        <div className="col-span-12 lg:col-span-3 flex flex-col gap-1">
                                            <div className="w-16 h-16 border border-[#1a1a24] bg-[#111120] overflow-hidden mb-1">
                                                <img
                                                    src={`/assets/characters/${character.image}`}
                                                    alt={character.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="text-xs font-bold text-white uppercase tracking-wide truncate">
                                                {character.name}
                                            </span>
                                            <span className="text-[11px] text-[#9090ad] font-mono break-all bg-black/40 p-1.5 border border-[#14141a] rounded-sm mt-1">
                                                🆔 {effectiveId}
                                            </span>
                                        </div>

                                        {/* คอลัมน์ที่ 2: Live Tuning Workbench (คลีนพารามิเตอร์ที่ไม่เกี่ยวข้องออกทั้งหมด) */}
                                        <LiveTuningWorkbench
                                            character={character}
                                            characterId={effectiveId}
                                            image={silImage}
                                            previewGuessCount={previewGuessCount}
                                            onImageChange={(v) =>
                                                setCustomImages((prev) => ({ ...prev, [character.id]: v }))
                                            }
                                            onRegenerateId={() => regenerateId(character.id)}
                                        />
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}