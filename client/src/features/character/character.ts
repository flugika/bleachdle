// src/data/character.ts

import rawCharacters from '@/src/data/characters.json';
import { Character, CharacterDropdown } from '@/src/entities/character/schema';

// ทำการ cast ข้อมูลให้เป็น Character[]
export const getCharacters = (): Character[] => {
    return rawCharacters as Character[];
};

export const getCharacterDropdown = (): CharacterDropdown[] => {
    return rawCharacters.map(({ id, name, image }) => ({ id, name, image }));
};

export const getCharacterById = (id: string): Character | undefined => {
    return (rawCharacters as unknown as Character[]).find(char => char.id === id);
};