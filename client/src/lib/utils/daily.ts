// @/src/lib/utils/daily.ts
export const getDailyTarget = (characters: any[]) => {
    const today = new Date().toISOString().split('T')[0];
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
        hash = today.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % characters.length;
    return characters[index];
};