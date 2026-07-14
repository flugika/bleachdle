// src/features/silhouette/silhouette.ts

import { INITIAL_REVEAL_SILHOUETTE, MAX_DAILY_SILHOUETTE_GUESSES, MAX_UNLIMITED_SILHOUETTE_GUESSES } from '@/src/const/guess';
import { getCharacterById } from '@/src/features/character/character';
import { SilhouetteSchema, BleachSilhouette } from '@/src/entities/silhouette/schema';
import { SilhouetteTarget } from '@/src/features/silhouette/types';
import silhouetteCells from '@/src/data/silhouette-cells.json';
import rawSilhouettes from '@/src/data/silhouettes.json';
import { Character } from '@/src/entities/character/schema';
import { getTodayStr } from '@/src/lib/utils/format';

interface SilhouetteCellConfig {
    occupied: number[];
    weights: Record<string, number>;
}

const cellsMap = silhouetteCells as unknown as Record<string, SilhouetteCellConfig>;

export const getOccupiedCells = (image: string): number[] | undefined =>
    cellsMap[image]?.occupied;

export const getCellWeights = (image: string): Record<number, number> =>
    (cellsMap[image]?.weights as unknown as Record<number, number>) ?? {};

let cachedSilhouettes: BleachSilhouette[] | null = null;

const loadSilhouettes = (): BleachSilhouette[] => {
    if (cachedSilhouettes) return cachedSilhouettes;

    const parsed = SilhouetteSchema.array().safeParse(rawSilhouettes);
    if (!parsed.success) {
        const badEntries = parsed.error.issues.map((issue) => ({
            index: issue.path[0],
            character_id: (rawSilhouettes as { character_id?: string }[])[issue.path[0] as number]?.character_id,
            message: issue.message,
        }));
        console.error('[silhouette.ts] entries ที่ข้อมูลผิดพลาด:', badEntries);
        throw new Error('Invalid silhouettes.json — ดู console สำหรับค่าที่ผิดจริง');
    }

    cachedSilhouettes = parsed.data;
    return cachedSilhouettes;
};

export const getSilhouettes = (): BleachSilhouette[] => loadSilhouettes();

export const getSilhouetteSearchCharacters = (): Character[] => {
    return loadSilhouettes()
        .map((s) => getCharacterById(s.character_id))
        .filter((c): c is Character => c !== undefined);
};

export const attachCharacter = (silhouette: BleachSilhouette): SilhouetteTarget | undefined => {
    const character = getCharacterById(silhouette.character_id);
    if (!character) return undefined;
    return { ...silhouette, character };
};

export const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const REVEAL_PER_GUESS = 1; // เดาผิด 1 ครั้ง เปิดเพิ่ม 1 ช่อง
const MAX_REVEAL_RATIO = 0.85;

function hashStringToSeed(str: string): number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return h >>> 0;
}

function mulberry32(seed: number) {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleWithSeed<T>(arr: T[], seedStr: string): T[] {
    const rand = mulberry32(hashStringToSeed(seedStr));
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function weightedShuffleWithSeed(
    cells: number[],
    weights: Record<number, number>,
    seedStr: string,
): number[] {
    const rand = mulberry32(hashStringToSeed(seedStr));
    const MIN_WEIGHT = 0.05; // กัน weight = 0 ทำให้ cell นั้นไม่มีโอกาสถูกเลือกเลย

    const keyed = cells.map((cell) => {
        const w = Math.max(weights[cell] ?? MIN_WEIGHT, MIN_WEIGHT);
        const r = rand();
        const key = Math.pow(r, 1 / w); // weight สูง -> key มักจะสูงตาม -> ถูก sort มาก่อน
        return { cell, key };
    });

    keyed.sort((a, b) => b.key - a.key);
    return keyed.map((k) => k.cell);
}


/**
 * 🎯 คืนค่า Set พิกัดกล่องที่ต้องเปิดโชว์แก่ผู้เล่น
 * @param characterId ไอดีตัวละครสำหรับใช้ทำ Seed สุ่มช่องเดาผิด
 * @param initialRevealedTiles อาเรย์กล่องเริ่มต้นที่ดึงมาจาก JSON/Database Column
 * @param guessCount จำนวนครั้งที่ผู้เล่นเดาผิดไปแล้ว
 * @param occupiedCells พิกัดตารางที่ตัวละครทับอยู่จริง (ใช้สำหรับเปิดส่วนสำคัญก่อน)
 */
export const getRevealedCellIndices = (
    characterId: string,
    guessCount: number,
    mode: "daily" | "unlimited",
    occupiedCells?: number[],
    cellWeights?: Record<number, number>, // 🆕 รับ weight เข้ามาด้วย
): Set<number> => {
    const MAX_SILHOUETTE_GUESSES = mode === "daily" ? MAX_DAILY_SILHOUETTE_GUESSES : MAX_UNLIMITED_SILHOUETTE_GUESSES;
    const dateStr = getTodayStr();
    const allCells = Array.from({ length: TOTAL_CELLS }, (_, i) => i);

    const occupied = occupiedCells && occupiedCells.length > 0 ? occupiedCells : allCells;
    const occupiedSet = new Set(occupied);
    const emptyCells = allCells.filter((cell) => !occupiedSet.has(cell));
    const weights = cellWeights ?? {};

    // 🆕 occupied ใช้ weighted shuffle (มีข้อมูลให้ bias) / empty ยังใช้ shuffle ธรรมดา (ไม่มี weight ให้ bias)
    const initialOrder = [
        ...weightedShuffleWithSeed(occupied, weights, `${characterId}:${dateStr}:init:occupied`),
        ...shuffleWithSeed(emptyCells, `${characterId}:${dateStr}:init:empty`),
    ];

    const initialTiles = initialOrder.slice(0, INITIAL_REVEAL_SILHOUETTE);
    const baseRevealedSet = new Set(initialTiles);

    if (guessCount === 0) {
        return baseRevealedSet;
    }

    const remainingCells = allCells.filter((cell) => !baseRevealedSet.has(cell));
    const remainingOccupied = remainingCells.filter((cell) => occupiedSet.has(cell));
    const remainingEmpty = remainingCells.filter((cell) => !occupiedSet.has(cell));

    const orderOfRemaining = [
        ...weightedShuffleWithSeed(remainingOccupied, weights, `${characterId}:${dateStr}:guess:occupied`),
        ...shuffleWithSeed(remainingEmpty, `${characterId}:${dateStr}:guess:empty`),
    ];

    const cappedGuessCount = Math.min(guessCount, MAX_SILHOUETTE_GUESSES);
    const maxAllowedTotalReveal = Math.floor(TOTAL_CELLS * MAX_REVEAL_RATIO);

    const extraRevealCount = Math.min(
        orderOfRemaining.length,
        cappedGuessCount * REVEAL_PER_GUESS,
        maxAllowedTotalReveal - baseRevealedSet.size
    );

    const finalRevealedSet = new Set(initialTiles);
    for (let i = 0; i < extraRevealCount; i++) {
        finalRevealedSet.add(orderOfRemaining[i]);
    }

    return finalRevealedSet;
};