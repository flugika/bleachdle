// src/lib/debug/logFullTarget.ts
import { Character } from '@/src/entities/character/schema';
import { getCharacterById } from '@/src/features/character/character';

type TargetInput = Character | { id: string } | { character_id: string } | null | undefined;

/**
 * Dev-only logger: resolve target (ไม่ว่าจะเป็น full character หรือแค่ id)
 * ให้เป็น full character แล้ว log ออกมา
 * ไม่ทำอะไรเลยใน production build
 */
export function logFullTarget(target: TargetInput) {
    if (!target || process.env.NODE_ENV === 'production') return;

    // ถ้าเป็น full character อยู่แล้ว (มี field เฉพาะ เช่น race)
    if ('race' in target) {
        console.log('target:', target);
        return;
    }

    const id = 'character_id' in target ? target.character_id : target.id;
    const character = getCharacterById(id);
    const fullTarget = { ...target, character };

    console.log('target:', fullTarget);
}