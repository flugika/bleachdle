// src/shared/lib/guessGame/types.ts
import { recordDailyStat } from '@/src/services/statsClient';

/**
 * 🆕 ดึง union type ของ arg แรก recordDailyStat มาใช้ตรงๆ แทนที่จะ hardcode
 * "character" | "song" | ... ซ้ำที่นี่ — กัน type สองที่ desync กันตอนมีโหมดใหม่เพิ่ม
 */
type DailyStatGameKey = Parameters<typeof recordDailyStat>[0];

/**
 * 🎯 ทุกโหมดตอนนี้ (Quote, Silhouette) มีคำตอบเดียวเป๊ะ ไม่มี partial/higher-lower
 * ถ้าในอนาคตมีโหมดที่ status ซับซ้อนกว่านี้ (เช่น Song ที่มี partial) ให้แตก
 * BinaryGuessStatus ออกไปเป็น type parameter ของตัวเอง แทนที่จะ hardcode ตรงนี้
 */
export type BinaryGuessStatus = 'correct' | 'wrong';

export interface GuessEntry<TCharacter> {
    guess: TCharacter;
    status: BinaryGuessStatus;
    isNew?: boolean;
}

export interface GuessGameStorageKeys {
    progress: string;
    completed: string;
    stats: string;
}

/**
 * Config ที่ทั้ง daily และ unlimited factory ใช้ร่วมกัน
 *
 * 🔧 FIX: TTarget ไม่บังคับมี field `character: TCharacter` อีกต่อไป — เดิมบังคับไว้
 * เพราะโหมด Quote/Silhouette ใช้ target.character เทียบ (compareGuess default) แต่
 * โหมด Release สิ่งที่ "ทาย" (TCharacter) คือ release เอง ไม่ใช่ Character คนปล่อยท่า
 * พอบังคับ target.character: TCharacter ไว้ตายตัว โหมด Release เลยต้องยัด field
 * character = release ซ้ำเข้าไปทั้งที่มันสื่อความหมายผิด (คนอ่านเห็น .character คิดว่า
 * เป็นตัวละคร) — จริง ๆ แล้ว logic ในไฟล์นี้ทั้งหมดไม่เคยอ่าน target.character ตรง ๆ เลย
 * (compareBinaryGuess เทียบด้วย target.character_id) field นี้เลยไม่จำเป็นต้องบังคับใน
 * constraint เลย ปล่อยให้แต่ละโหมดมี field เสริมของตัวเอง (character, wielder, ฯลฯ)
 * ตามที่ต้องการจริงแทน
 */

export interface ExtraTargetFieldConfig<TTarget> {
    key: string;
    deriveFromSetTargetArgs: (target: TTarget, ...rest: unknown[]) => unknown;
    isSameRound: (prevValue: unknown, nextValue: unknown) => boolean;
}

export interface DerivedCounterConfig<TCharacter> {
    /** ชื่อ field บน store state เช่น 'revealedCount' */
    key: string;
    initial: number;
    compute: (guesses: GuessEntry<TCharacter>[]) => number;
    /** ค่าที่บังคับ set ตอนเกมจบ (finalizeGame) — emoji ใช้เพื่อเฉลยครบทุกตัวเสมอ */
    finalizeValue: number;
    isValidRange: (value: number) => boolean;
}

export interface GuessGameConfig<
    TCharacter extends { id: string },
    TTarget extends { id: string; character_id: string }
> {
    storageKeys: GuessGameStorageKeys;
    /** ใช้เป็น key ของ recordDailyStat(...) — ต้องเป็นค่าที่ recordDailyStat รับจริง */
    gameKey: DailyStatGameKey;
    maxGuesses: (mode: 'daily' | 'unlimited') => number;
    getCharacterById: (id: string) => TCharacter | undefined;
    /** default: (guess, target) => guess.id === target.character_id ? 'correct' : 'wrong' */
    compareGuess?: (guess: TCharacter, target: TTarget) => BinaryGuessStatus;
    /**
     * 🆕 บอก factory ว่า "คำตอบเต็ม" (ตัวที่จะเอาไป lookup ผ่าน getCharacterById ตอน
     * finalizeGame เพื่อ set `revealedCharacter`) คือ id ไหนของ target
     *
     * default: target.character_id — ใช้ได้กับโหมดที่ "สิ่งที่ทาย" คือ Character
     * (Quote, Silhouette: guess.id ต้องตรงกับ target.character_id)
     *
     * โหมดที่ "สิ่งที่ทาย" ไม่ใช่ Character (เช่น Release: ทายด้วยตัว release เอง,
     * compareGuess ก็ override เป็น guess.id === target.id) ต้อง override ตัวนี้เป็น
     * `(target) => target.id` ด้วยเหตุผลเดียวกัน มิเช่นนั้น getCharacterById จะถูกเรียก
     * ด้วย character_id (id ของเจ้าของ ไม่ใช่ id ของคำตอบ) แล้วหาไม่เจอ → revealedCharacter
     * เป็น null เสมอ ไม่ว่าจะตอบถูกหรือผิด
     */
    resolveAnswerId?: (target: TTarget) => string;
    /** default: ตรวจ status เป็น correct/wrong + guess เป็น object */
    isValidGuessEntry?: (entry: unknown) => entry is GuessEntry<TCharacter>;
    /** default: ตรวจว่ามี target.character อยู่ (กัน target รุ่นเก่าที่ยังไม่แนบ character)
     *  ⚠️ ใช้ default นี้ได้เฉพาะโหมดที่ TTarget มี field ชื่อ `character` จริง ๆ
     *  (เช่น Quote/Silhouette) — โหมดที่ไม่มี (เช่น Release) ต้อง override เอง */
    hasValidTargetShape?: (target: unknown) => boolean;
    derivedCounters?: DerivedCounterConfig<TCharacter>[];
    extraTargetField?: ExtraTargetFieldConfig<TTarget>;
    deferReveal?: boolean;
}

export interface UnlimitedGuessGameConfig<
    TItem,
    TCharacter extends { id: string },
    TTarget extends { id: string; character_id: string }
> extends GuessGameConfig<TCharacter, TTarget> {
    getAllItems: () => TItem[];
    attachCharacter: (item: TItem) => TTarget | undefined;
    /**
     * key ที่ใช้ dedupe ตอน mark ว่า "เล่นจบแล้ว" — เจตนาแยกจาก getItemCompletionKey
     * เพราะบางโหมด (Quote) นับความจบเป็นราย-item (target.id) แต่บางโหมด (Silhouette)
     * นับความจบเป็นราย-ตัวละคร (target.character_id) กันซ้ำเวลามีหลาย entry ต่อ 1 ตัวละคร
     */
    getCompletionKey: (target: TTarget) => string;
    getItemCompletionKey: (item: TItem) => string;
}

export const defaultIsValidGuessEntry = <TCharacter,>(entry: unknown): entry is GuessEntry<TCharacter> =>
    typeof entry === 'object' &&
    entry !== null &&
    'status' in entry &&
    ((entry as GuessEntry<TCharacter>).status === 'correct' || (entry as GuessEntry<TCharacter>).status === 'wrong') &&
    'guess' in entry &&
    typeof (entry as GuessEntry<TCharacter>).guess === 'object';

export const defaultHasValidTargetShape = (target: unknown): boolean =>
    typeof target === 'object' &&
    target !== null &&
    typeof (target as { character_id?: unknown }).character_id === 'string';

export interface GuessGameController {
    guesses: { guess: { id: string } }[];
    addGuess: (id: string) => void;
}

export interface Stats {
    currentStreak: number;
    maxStreak: number;
    playedCount: number;              // จำนวนครั้งที่ชนะ (solved) สะสม
    passedCount: number;               // จำนวนครั้งที่แพ้ (failed) สะสม
    guessDistribution: Record<string, number>; // "1".."5", "6"="6+" -> จำนวนครั้ง
}