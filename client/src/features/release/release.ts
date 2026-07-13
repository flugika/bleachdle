// src/features/release/release.ts

import rawReleases from '@/src/data/releases.json';
import { BleachRelease } from '@/src/entities/release/schema';
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';

// 🩹 FIX: cast once here, not per call-site. The TS error ("Property 'find' does not
// exist on type '{}'") happens because the JSON import isn't being inferred as an array —
// either releases.json is still `{}` instead of `[]`, or resolveJsonModule is inferring a
// narrower type from current (possibly empty/malformed) file contents. Casting once at the
// module boundary means every consumer below gets a real BleachRelease[] regardless of what
// TS infers from the JSON's current shape.
const releases = rawReleases as BleachRelease[];

export const getReleases = (): BleachRelease[] => releases;

export const getReleaseById = (id: string): BleachRelease | undefined =>
    releases.find(r => r.id === id);

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

export const attachReleaseCharacter = (
    release: BleachRelease
): (BleachRelease & { character: Character }) | undefined => {
    const character = getCharacterById(release.character_id);
    if (!character) return undefined;
    return { ...release, character };
};

export const countReleasesByCharacter = (): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const r of releases) {
        counts.set(r.character_id, (counts.get(r.character_id) ?? 0) + 1);
    }
    return counts;
};