// app/api/support/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase/supabase-server";
import { packCookie, unpackCookie, todayKey } from "@/src/lib/support/rateLimitCookie";
import { sanitizeInput } from "@/src/lib/utils/sanitize";
import { checkIpRateLimit } from "@/src/lib/support/ipRateLimit"; // 💡 นำเข้าตัวตรวจ IP
import { logApiEvent } from "@/src/services/monitor/logEvent";

export const runtime = "nodejs";

const ENDPOINT = "support";
const COOLDOWN_SECONDS = 120;
const DAILY_LIMIT_PER_DEVICE = 8;
const MIN_LEN = 10;
const MAX_LEN = 1000;
const ALLOWED_CATEGORIES = ["bug", "feedback", "suggestion", "other"] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];
const COOLDOWN_COOKIE = "spt_cd";
const COUNTER_COOKIE = "spt_ct";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            logApiEvent(ENDPOINT, "warning", 400, "invalid_json_body");
            return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
        }

        const { category, message, honeypot, clientRef } = body;

        // ด่าน 0: Honeypot ล่อซื้อบอท
        if (honeypot) {
            logApiEvent(ENDPOINT, "warning", 200, "honeypot_triggered");
            return NextResponse.json({ ok: true });
        }

        // ด่าน 1: เช็คขนาดของข้อความพื้นฐาน
        if (typeof message !== "string" || message.trim().length < MIN_LEN || message.length > MAX_LEN) {
            logApiEvent(ENDPOINT, "warning", 400, "invalid_message_length");
            return NextResponse.json({ ok: false, error: "Invalid message length." }, { status: 400 });
        }
        if (!ALLOWED_CATEGORIES.includes(category as Category)) {
            logApiEvent(ENDPOINT, "warning", 400, "invalid_category");
            return NextResponse.json({ ok: false, error: "Invalid category." }, { status: 400 });
        }

        // ด่าน 2: เช็คคุกกี้ทั่วไปแบบปกติ
        const cooldownPayload = unpackCookie(req.cookies.get(COOLDOWN_COOKIE)?.value);
        if (cooldownPayload) {
            const lastSubmitMs = Number(cooldownPayload);
            if (Number.isFinite(lastSubmitMs)) {
                const elapsedSec = (Date.now() - lastSubmitMs) / 1000;
                if (elapsedSec < COOLDOWN_SECONDS) {
                    const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsedSec);
                    logApiEvent(ENDPOINT, "warning", 429, "cooldown_active");
                    return NextResponse.json({ ok: false, error: "The Kido barrier is still recharging.", retryAfter }, { status: 429 });
                }
            }
        }

        // ด่าน 3: สกัดบอทยิงถล่มด้วยสคริปต์เปล่า (In-Memory IP Hash) 🛡️
        // อนุญาตให้ส่งตั๋วได้สูงสุดแค่ 2 ใบ ทุกๆ 45 วินาทีต่อ 1 วง IP (เผื่อเผื่อเน็ตหอพักกดพร้อมกัน)
        const ipCheck = checkIpRateLimit(req, 2, COOLDOWN_SECONDS);
        if (!ipCheck.success) {
            logApiEvent(ENDPOINT, "warning", 429, "ip_rate_limited");
            return NextResponse.json(
                { ok: false, error: "Too many tickets sent from this network. Please wait.", retryAfter: ipCheck.success },
                { status: 429 }
            );
        }

        // เช็คโควตารายวันตัวคุกกี้ต่อ...
        const counterPayload = unpackCookie(req.cookies.get(COUNTER_COOKIE)?.value);
        const today = todayKey();
        let dailyCount = 0;
        if (counterPayload) {
            const [countStr, dayKey] = counterPayload.split(":");
            if (dayKey === today) dailyCount = Number(countStr) || 0;
        }
        if (dailyCount >= DAILY_LIMIT_PER_DEVICE) {
            logApiEvent(ENDPOINT, "warning", 429, "daily_limit_reached");
            return NextResponse.json({ ok: false, error: "Daily report limit reached for this device." }, { status: 429 });
        }

        // บันทึกตั๋ว (ไม่มีการเก็บ IP ลง Table ในฐานข้อมูล Supabase)
        const { error: insertErr } = await supabaseServer.from("support_tickets").insert({
            category,
            message: sanitizeInput(message.trim()),
            client_ref: typeof clientRef === "string" ? clientRef.slice(0, 64) : null,
        });

        if (insertErr) throw insertErr;

        // จ่ายคุกกี้คูลดาวน์กลับไปตามระเบียบ
        const res = NextResponse.json({ ok: true, cooldownSeconds: COOLDOWN_SECONDS });
        const cookieOpts = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

        res.cookies.set(COOLDOWN_COOKIE, packCookie(String(Date.now())), { ...cookieOpts, maxAge: COOLDOWN_SECONDS });
        res.cookies.set(COUNTER_COOKIE, packCookie(`${dailyCount + 1}:${today}`), { ...cookieOpts, maxAge: 60 * 60 * 24 });

        logApiEvent(ENDPOINT, "success", 200);
        return res;
    } catch (err) {
        console.error("[/api/support] error:", err);
        logApiEvent(ENDPOINT, "error", 500, err instanceof Error ? err.message : "unknown_error");
        return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
    }
}