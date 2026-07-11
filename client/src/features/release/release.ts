// src/features/release/release.ts
import rawReleases from '@/src/data/releases.json';
import { BleachRelease, ReleaseSchema } from '@/src/entities/release/schema';
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';

// 🩹 FIX: cast once here, not per call-site. The TS error ("Property 'find' does not
// exist on type '{}'") happens because the JSON import isn't being inferred as an array —
// either releases.json is still `{}` instead of `[]`, or resolveJsonModule is inferring a
// narrower type from current (possibly empty/malformed) file contents. Casting once at the
// module boundary means every consumer below gets a real BleachRelease[] regardless of what
// TS infers from the JSON's current shape.
const releases = rawReleases as BleachRelease[];

export const getReleases = (): BleachRelease[] => {
    return releases;
};

// Raw shape actually present in releases.json — character_id only, no nested character.
const RawReleaseSchema = ReleaseSchema.omit({ character: true });

export const getReleaseById = (id: string): (BleachRelease & { character: Character }) | undefined => {
    const raw = releases.find(r => r.id === id);
    if (!raw) return undefined;

    const parsedRaw = RawReleaseSchema.parse(raw);
    const character = getCharacterById(parsedRaw.character_id);
    if (!character) return undefined;

    return { ...parsedRaw, character };
};

/**
 * 🔎 Search-bar pool สำหรับ Release mode โดยเฉพาะ (เหมือน getQuotableCharacters แต่
 * ตอบเป็น release เอง ไม่ใช่ character — เพราะ compare logic เทียบด้วย release id/technique_name)
 *
 * ไม่ต้อง de-dupe เพราะแต่ละ release เป็นคำตอบของตัวเอง (1 character มีได้หลาย release
 * เช่น Shikai + Bankai + Vollstandig คนละคำตอบ คนละไฟล์เสียง)
 */
export const getReleasableItems = (): (BleachRelease & { character: Character })[] => {
    return getReleases()
        .map(attachReleaseCharacter)
        .filter((r): r is BleachRelease & { character: Character } => r !== undefined);
};

/**
 * ใช้ตอนเฉลย เพื่อโชว์ว่า technique นี้เป็นของตัวละครไหน (ไม่ใช้ compare)
 */
export const attachReleaseCharacter = (
    release: BleachRelease
): (BleachRelease & { character: Character }) | undefined => {
    const character = getCharacterById(release.character_id);
    if (!character) return undefined;
    return { ...release, character };
};

/**
 * นับจำนวน release ต่อตัวละคร — ใช้ debug/QA เท่านั้น
 */
export const countReleasesByCharacter = (): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const r of releases) {
        counts.set(r.character_id, (counts.get(r.character_id) ?? 0) + 1);
    }
    return counts;
};