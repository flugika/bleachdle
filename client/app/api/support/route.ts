// app/api/support/route.ts
//
// Receives feedback/bug reports from /support and writes them to Supabase
// using the Service Role Key. No IP address or user-agent is ever read or
// stored — see src/lib/support/rateLimitCookie.ts for why and how rate
// limiting works without that data.
//
// Two layers of spam protection:
//   1) Honeypot field — bots tend to fill every field, including ones
//      hidden from real users via off-screen positioning.
//   2) Signed httpOnly cookies — one enforces a cooldown between
//      submissions, one enforces a rolling daily cap. Both are scoped to
//      the browser, not the network or device fingerprint.

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/src/lib/supabase/supabase-server";
import { packCookie, unpackCookie, todayKey } from "@/src/lib/support/rateLimitCookie";
import { sanitizeInput } from "@/src/lib/utils/sanitize";

export const runtime = "nodejs";

const COOLDOWN_SECONDS = 45;
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
            return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
        }

        const { category, message, honeypot, clientRef } = body as {
            category?: string;
            message?: string;
            honeypot?: string;
            clientRef?: string;
        };

        // Honeypot tripped -> silently succeed so the bot doesn't learn it was caught.
        if (honeypot) {
            return NextResponse.json({ ok: true });
        }

        if (typeof message !== "string" || message.trim().length < MIN_LEN) {
            return NextResponse.json(
                { ok: false, error: `Please write at least ${MIN_LEN} characters.` },
                { status: 400 }
            );
        }
        if (message.length > MAX_LEN) {
            return NextResponse.json(
                { ok: false, error: `Message is too long (max ${MAX_LEN} characters).` },
                { status: 400 }
            );
        }
        if (!ALLOWED_CATEGORIES.includes(category as Category)) {
            return NextResponse.json({ ok: false, error: "Invalid category." }, { status: 400 });
        }

        // --- Cooldown check (signed cookie, no IP involved) ---
        const cooldownPayload = unpackCookie(req.cookies.get(COOLDOWN_COOKIE)?.value);
        if (cooldownPayload) {
            const lastSubmitMs = Number(cooldownPayload);
            if (Number.isFinite(lastSubmitMs)) {
                const elapsedSec = (Date.now() - lastSubmitMs) / 1000;
                if (elapsedSec < COOLDOWN_SECONDS) {
                    const retryAfter = Math.ceil(COOLDOWN_SECONDS - elapsedSec);
                    return NextResponse.json(
                        {
                            ok: false,
                            error: "The Kido barrier is still recharging. Please wait before sending another report.",
                            retryAfter,
                        },
                        { status: 429 }
                    );
                }
            }
        }

        // --- Daily cap check (signed cookie, resets at UTC midnight) ---
        const counterPayload = unpackCookie(req.cookies.get(COUNTER_COOKIE)?.value);
        const today = todayKey();
        let dailyCount = 0;
        if (counterPayload) {
            const [countStr, dayKey] = counterPayload.split(":");
            if (dayKey === today) {
                dailyCount = Number(countStr) || 0;
            }
        }
        if (dailyCount >= DAILY_LIMIT_PER_DEVICE) {
            return NextResponse.json(
                { ok: false, error: "Daily report limit reached for this device. Please try again tomorrow." },
                { status: 429 }
            );
        }

        // --- Write the ticket. Notice: no ip, no user_agent. ---
        const { error: insertErr } = await supabaseServer.from("support_tickets").insert({
            category,
            message: sanitizeInput(message.trim()),
            client_ref: typeof clientRef === "string" ? clientRef.slice(0, 64) : null,
        });

        if (insertErr) throw insertErr;

        const res = NextResponse.json({ ok: true, cooldownSeconds: COOLDOWN_SECONDS });

        const cookieOpts = {
            httpOnly: true,
            sameSite: "lax" as const,
            secure: process.env.NODE_ENV === "production",
            path: "/",
        };

        res.cookies.set(COOLDOWN_COOKIE, packCookie(String(Date.now())), {
            ...cookieOpts,
            maxAge: COOLDOWN_SECONDS,
        });
        res.cookies.set(COUNTER_COOKIE, packCookie(`${dailyCount + 1}:${today}`), {
            ...cookieOpts,
            maxAge: 60 * 60 * 24,
        });

        return res;
    } catch (err) {
        console.error("[/api/support] error:", err);
        return NextResponse.json({ ok: false, error: "Server error. Please try again." }, { status: 500 });
    }
}