export const findDuplicateIds = <T extends { id: string }>(items: T[]): string[] => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const item of items) {
        if (seen.has(item.id)) {
            duplicates.add(item.id);
        } else {
            seen.add(item.id);
        }
    }

    return Array.from(duplicates);
};

export const getDuplicateItems = <T extends { id: string }>(items: T[]): Map<string, T[]> => {
    const map = new Map<string, T[]>();

    for (const item of items) {
        const existing = map.get(item.id) || [];
        map.set(item.id, [...existing, item]);
    }

    // กรองเอาเฉพาะ ID ที่มีรายการมากกว่า 1
    return new Map([...map].filter(([, items]) => items.length > 1));
};