// src/lib/utils/generateCaseFileId.ts

/**
 * 🗂️ แปลง quote.id (uuid) ให้เป็นเลขคดีที่อ่านง่ายและคงที่ (deterministic)
 * ใช้ hash แบบง่าย (djb2-like) แทนการตัด uuid ตรงๆ เพราะ uuid มีทั้งตัวอักษรและ
 * ขีดกลาง เอามาโชว์ตรงๆ จะดูไม่เป็นเอกสารทางการ และไม่ควรสุ่มใหม่ทุก render
 * (ต้อง deterministic เพื่อให้เลขคดีเดิมของ quote เดิมไม่เปลี่ยนไปมา)
 */
function hashToNumber(input: string): number {
    let hash = 5381;
    for (let i = 0; i < input.length; i++) {
        hash = (hash * 33) ^ input.charCodeAt(i);
    }
    return Math.abs(hash);
}

export function generateCaseFileId(quoteId: string): string {
    const hash = hashToNumber(quoteId);
    const num = (hash % 900000) + 100000; // เลข 6 หลักเสมอ, ไม่มีทาง 0 นำหน้า
    return `C46-QT-${num}`;
}