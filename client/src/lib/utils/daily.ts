// @/src/lib/utils/daily.ts

export const getDailyTarget = <T>(items: T[]): T => {
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % items.length;
    return items[index];
};