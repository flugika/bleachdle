export function sanitizeInput(text: string): string {
    // ตัด control characters ที่ไม่ใช่ newline/tab ออก (invisible chars, null bytes)
    return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}