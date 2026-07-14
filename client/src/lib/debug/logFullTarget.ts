// src/lib/debug/logFullTarget.ts
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';

type TargetInput = Character | { id: string } | { character_id: string } | null | undefined;

/**
 * Dev-only logger: resolve target (ไม่ว่าจะเป็น full character หรือแค่ id)
 * ให้เป็น full character แล้ว log ออกมา
 *
 * 🆕 fullSets (optional): ถ้ามี ให้ merge record เต็มที่ match ด้วย target.id
 * เข้าไปด้วย (เช่น emojiSets → ได้ emoji_list ติดมา) เพราะ target ที่ store ถือ
 * มีแค่ id/character_id ไม่มี emoji_list เอง — ต้องพ่วง source ที่มีของเต็มเข้ามาเอง
 * ไม่ทำอะไรเลยใน production build
 */
export function logFullTarget<T extends { id: string }>(
    target: TargetInput,
    fullSets?: T[]
) {
    if (!target || process.env.NODE_ENV === 'production') return;

    // ถ้าเป็น full character อยู่แล้ว (มี field เฉพาะ เช่น race)
    if ('race' in target) {
        console.log('target:', target);
        return;
    }

    const characterId = 'character_id' in target ? target.character_id : target.id;
    const character = getCharacterById(characterId);

    const targetId = 'id' in target ? target.id : undefined;
    const fullSet = fullSets && targetId ? fullSets.find((s) => s.id === targetId) : undefined;

    console.log('target:', { ...target, ...fullSet, character });
}