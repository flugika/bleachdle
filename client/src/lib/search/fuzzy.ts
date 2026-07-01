// src/lib/search/fuzzy.ts
import Fuse from 'fuse.js';
import { Character } from '@/src/entities/character/schema';

export const createSearchEngine = (characters: Character[]) => {
    return new Fuse(characters, {
        keys: ['name'],
        threshold: 0.25, // ความเข้มข้นของการค้นหา (0 คือตรงเป๊ะ)
        minMatchCharLength: 1,
    });
};