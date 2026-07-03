// src/features/support/PromptPayCard.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { KidoSeal } from "./KidoSeal";
import { Tooltip } from "@/src/shared/ui/tooltip";

// Place your real PromptPay QR at public/promptpay-qr.png
// (a static image generated from your bank app — see SUPPORT_SETUP.md for why)
const QR_IMAGE_PATH = "/assets/promptpay-qr.webp";

// Set via env instead of hardcoding a number directly into the source.
// NEXT_PUBLIC_PROMPTPAY_DISPLAY_ID=08X-XXX-XXXX

export function PromptPayCard() {
    return (
        <div className="relative bg-gradient-to-b from-[#0a0a0f]/90 to-[#020205]/95 border border-[#c8a96e]/25 p-6 md:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {/* Kido corner brackets — recurring signature motif */}
            <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_5px_rgba(200,169,110,0.6)]" />
            <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_5px_rgba(200,169,110,0.6)]" />
            <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_5px_rgba(200,169,110,0.6)]" />
            <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_5px_rgba(200,169,110,0.6)]" />

            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8a96e]/60" />
                <span className="text-lg font-bold text-[#c8a96e] tracking-[0.3em]" style={{ fontFamily: "'Cinzel', serif" }}>
                    支援
                </span>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8a96e]/60" />
            </div>
            <p className="text-center text-[10px] uppercase tracking-[0.35em] text-[#eed9c4]/40 font-mono mb-8">
                Kido Support Circle // Built On Goodwill
            </p>

            {/* QR + rotating seal */}
            <div className="relative flex items-center justify-center h-[280px] mb-6">
                <KidoSeal size={420} />
                <div className="relative z-10 bg-white p-3 shadow-[0_0_40px_rgba(200,169,110,0.25)]">
                    <Image
                        src={QR_IMAGE_PATH}
                        alt="PromptPay QR Code"
                        width={150}
                        height={150}
                        className="w-[150px] h-[150px] object-contain"
                        priority
                    />
                </div>

                {/* Rising motes of light — adds a little life to the circle */}
                <span className="kido-mote absolute left-[30%] bottom-6 w-1 h-1 rounded-full bg-[#c8a96e]" />
                <span className="kido-mote absolute left-[62%] bottom-10 w-1.5 h-1.5 rounded-full bg-[#c8a96e]" style={{ animationDelay: "1.4s" }} />
                <span className="kido-mote absolute left-[48%] bottom-2 w-1 h-1 rounded-full bg-[#c8a96e]" style={{ animationDelay: "2.8s" }} />
            </div>

            {/* Formal donation notice — romaji + English, matching the Central 46 register
                used elsewhere in the app (see Sealed.tsx) */}
            <div className="border-t border-[#c8a96e]/10 pt-6">
                <blockquote className="text-[11px] md:text-xs font-medium tracking-wide text-[#c8a96e]/80 italic font-mono leading-relaxed text-center px-2">
                    &ldquo;Kono purojekuto wa, taika naku, tada kokorozashi dake de tsukurareta.&rdquo;
                </blockquote>
                <p className="mt-3 text-[10px] md:text-[11px] leading-relaxed text-neutral-400 text-center px-2">
                    This project is built without payment, on personal time, out of genuine care for it.
                    A donation changes nothing about your access — it is offered entirely as a gesture of
                    moral support, and is always optional.
                </p>
            </div>
        </div>
    );
}