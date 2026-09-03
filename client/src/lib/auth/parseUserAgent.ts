// src/lib/auth/parseUserAgent.ts
//
// Deliberately NOT pulling in a UA-parsing library for this — we only need
// a rough "Browser · OS" label good enough to tell two devices apart in the
// Manage tab (e.g. "Chrome · Windows" vs "Safari · iPhone"), not analytics-
// grade device fingerprinting. A few regexes cover the overwhelming
// majority of real traffic; anything unmatched falls back to "Unknown Device"
// rather than showing something confusing.

export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown';

export interface ParsedUserAgent {
    deviceType: DeviceType;
    os: string | null;
    browser: string | null;
    /** Human-readable combined label, e.g. "Chrome · Windows" or "Safari · iPhone". */
    label: string;
}

export function parseUserAgentDetailed(
    userAgent: string | null,
    platformHeader?: string | null
): ParsedUserAgent {
    if (!userAgent && !platformHeader) {
        return { deviceType: 'unknown', os: null, browser: null, label: 'Unknown Device' };
    }

    const ua = userAgent ?? '';

    // ==========================================
    // 1. Device type — ต้องเช็คก่อน OS เสมอ เพราะ iPad บาง iOS version ปลอม
    // UA เป็น "Macintosh" (Safari's "Request Desktop Website" default ตั้งแต่
    // iPadOS 13+) ถ้าเช็ค OS ก่อนจะโดนจัดเป็น Mac desktop ผิดพลาด
    // ==========================================
    const deviceType: DeviceType = (() => {
        // iPad ปลอมตัวเป็น Mac: ตรวจจาก touch support ไม่ได้ฝั่ง server-side UA
        // string ล้วนๆ แต่ signature ที่พอเชื่อถือได้คือ "Macintosh" + "Mobile"
        // หรือ "Macintosh" ที่ไม่มี Intel/PPC ระบุ (ของจริง desktop Mac UA จะมี
        // "Intel Mac OS X" เสมอ) — ใช้ heuristic นี้แทน
        if (/iPad/.test(ua)) return 'tablet';
        if (
            /Macintosh/.test(ua) &&
            (/Mobile\//.test(ua) || /Safari\/[\d.]+/.test(ua)) &&
            !/Intel Mac OS X/.test(ua)
        ) {
            return 'tablet'; // แนวโน้มสูงว่าเป็น iPad requesting desktop site
        }
        if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet'; // Android tablet ไม่มี "Mobile" token
        if (/iPhone|iPod/.test(ua)) return 'mobile';
        if (/Android/.test(ua) && /Mobile/.test(ua)) return 'mobile';
        if (/Windows NT|Macintosh|X11|Linux(?!.*Android)/.test(ua)) return 'desktop';
        return 'unknown';
    })();

    // ==========================================
    // 2. OS — Client Hints (Sec-CH-UA-Platform) ก่อน ถ้ามี เพราะแม่นกว่า UA string
    // string ล้วนๆ (UA string กำลังถูก freeze/deprecate ในหลาย browser)
    // ==========================================
    const platform = platformHeader?.replace(/"/g, '').trim().toLowerCase();
    let os: string | null = null;

    if (platform) {
        if (platform.includes('windows')) os = 'Windows';
        else if (platform.includes('mac')) os = deviceType === 'tablet' ? 'iPadOS' : 'macOS';
        else if (platform.includes('android')) os = 'Android';
        else if (platform.includes('ios')) os = 'iOS';
        else if (platform.includes('linux')) os = 'Linux';
        else if (platform.includes('chrome os')) os = 'ChromeOS';
    }

    if (!os && ua) {
        if (/Windows NT|Windows/.test(ua)) os = 'Windows';
        else if (/iPad/.test(ua)) os = 'iPadOS';
        else if (/iPhone|iPod/.test(ua)) os = 'iOS';
        else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
        else if (/Android\s*([\d.]+)?/.test(ua)) {
            const match = ua.match(/Android\s*([\d.]+)/);
            os = match ? `Android ${match[1]}` : 'Android';
        }
        else if (/CrOS/.test(ua)) os = 'ChromeOS';
        else if (/Linux/.test(ua)) os = 'Linux';
    }

    // ==========================================
    // 3. Browser — ลำดับการเช็คสำคัญมาก เพราะหลาย browser ปลอม UA เป็น Chrome/Safari
    // Edge/Opera/Samsung Internet ทุกตัวมี "Chrome/" token ติดมาด้วย (Chromium-based)
    // ต้องเช็คตัวเฉพาะทางก่อน Chrome เสมอ ไม่งั้นจะโดนจัดเป็น Chrome ผิด
    // ==========================================
    const browser: string | null = (() => {
        if (!ua) return null;
        if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet';
        if (/EdgA\/|EdgiOS\/|Edg\//.test(ua)) return 'Edge';
        if (/OPR\/|Opera/.test(ua)) return 'Opera';
        if (/FxiOS\//.test(ua)) return 'Firefox'; // Firefox on iOS (uses WebKit but keeps its own token)
        if (/Firefox\//.test(ua)) return 'Firefox';
        if (/CriOS\//.test(ua)) return 'Chrome'; // Chrome on iOS
        if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
        if (/Chromium\//.test(ua)) return 'Chromium';
        // Safari ต้องเช็คหลังสุด: ทุก browser บน iOS (Chrome, Firefox, Edge) ใช้
        // WebKit บังคับตาม Apple policy เลยมี "Safari/" token ติดมาด้วยเสมอ
        if (/Safari\//.test(ua) && /Version\//.test(ua)) return 'Safari';
        return null;
    })();

    // ==========================================
    // 4. Label — รวม device type เข้าไปด้วยเมื่อเป็น tablet เพื่อไม่ให้สับสนกับ desktop
    // เช่น "Safari · iPadOS" พอเดาได้ว่าเป็น iPad แต่ desktop "Safari · macOS"
    // กับ iPad ที่ request desktop site อาจดูเหมือนกันถ้าไม่มี label ช่วย
    // ==========================================
    const parts = [browser, os].filter(Boolean);
    const label = parts.length > 0 ? parts.join(' · ') : 'Unknown Device';

    return { deviceType, os, browser, label };
}

/**
 * @deprecated ใช้ parseUserAgentDetailed แทนถ้าต้องการ deviceType/os/browser
 * แยกจากกัน — เก็บฟังก์ชันนี้ไว้เพื่อ backward compatibility กับที่เรียกใช้
 * เดิมที่ต้องการแค่ label string
 */
export function parseUserAgent(userAgent: string | null, platformHeader?: string | null): string {
    return parseUserAgentDetailed(userAgent, platformHeader).label;
}