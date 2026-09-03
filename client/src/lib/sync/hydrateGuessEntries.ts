// src/lib/sync/hydrateGuessEntries.ts

/**
 * Hydrates a raw (persisted/remote) guess-entry array by resolving each
 * entry's `guess.id` back into a full entity via `resolve`.
 *
 * TEntry must always carry `guess: TEntity` and `isNew: boolean` —
 * every other field is preserved as-is from the raw input.
 */
export function hydrateGuessEntries<
    TEntity extends { id: string },
    TEntry extends { guess: TEntity; isNew?: boolean }
>(
    raw: unknown[],
    resolve: (id: string) => TEntity | undefined
): TEntry[] {
    // Raw entries have everything TEntry has, except `guess` (not yet
    // resolved — only an id is available) and `isNew` (always reset below).
    type RawEntry = Omit<TEntry, 'guess' | 'isNew'> & {
        guess?: { id?: string };
        isNew?: boolean;
    };

    return (raw as RawEntry[])
        .map((entry): TEntry | null => {
            const id = entry.guess?.id;
            if (!id) return null;

            const full = resolve(id);
            // เพลง/ตัวละครถูกลบ/id ผิด → ข้ามทิ้งเงียบๆ เหมือน onRehydrateStorage เดิม
            if (!full) return null;

            // 🟢 Copy object แล้ว delete key เก่าทิ้งโดยไม่ต้องสร้าง unused variable
            const rest = { ...entry };
            delete rest.guess;
            delete rest.isNew;

            // Safe: `rest` is exactly `Omit<TEntry, 'guess' | 'isNew'>`,
            // and we're supplying `guess` and `isNew` here — together they
            // structurally reconstruct TEntry. TS can't verify this through
            // a generic type param, hence the explicit unknown-cast.
            return { ...rest, guess: full, isNew: false } as unknown as TEntry;
        })
        .filter((entry): entry is TEntry => entry !== null);
}