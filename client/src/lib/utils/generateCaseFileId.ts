// src/lib/utils/generateCaseFileId.ts

function hashToNumber(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 33) ^ input.charCodeAt(i);
    }
    return Math.abs(hash);
}

/** prefix defaults to 'QT' so every existing call site keeps working unchanged. */
export function generateCaseFileId(id: string, prefix: string = 'QT'): string {
    const hash = hashToNumber(id);
    const num = (hash % 900000) + 100000;
    return `C46-${prefix}-${num}`;
}