// src/features/support/SupportForm.tsx
"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/src/shared/ui/modal";
import { Button } from "@/src/shared/ui/button";
import { useCooldown, getOrCreateClientRef } from "@/src/shared/hooks/useCooldown";

type Category = "bug" | "feedback" | "suggestion" | "other";

const CATEGORIES: { id: Category; label: string; kanji: string }[] = [
    { id: "feedback", label: "Feedback", kanji: "声" },
    { id: "bug", label: "Bug Report", kanji: "虫" },
    { id: "suggestion", label: "Suggestion", kanji: "案" },
    { id: "other", label: "Other", kanji: "他" },
];

const MIN_LEN = 10;
const MAX_LEN = 1000;

export function SupportForm() {
    const [category, setCategory] = useState<Category>("feedback");
    const [message, setMessage] = useState("");
    const [honeypot, setHoneypot] = useState(""); // must stay empty for real users
    const [submitting, setSubmitting] = useState(false);
    const [modal, setModal] = useState<{ open: boolean; variant: "success" | "danger"; text: string }>({
        open: false,
        variant: "success",
        text: "",
    });

    const { remainingSec, isActive, startCooldown } = useCooldown();

    // Create the local client reference on first mount (stored in localStorage).
    useEffect(() => {
        getOrCreateClientRef();
    }, []);

    const trimmedLen = message.trim().length;
    const isTooShort = trimmedLen > 0 && trimmedLen < MIN_LEN;
    const canSubmit = trimmedLen >= MIN_LEN && trimmedLen <= MAX_LEN && !submitting && !isActive;

    const formatCountdown = (sec: number) => {
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;

        setSubmitting(true);
        try {
            const res = await fetch("/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    message,
                    honeypot,
                    clientRef: getOrCreateClientRef(),
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.ok) {
                if (typeof data.retryAfter === "number") {
                    startCooldown(data.retryAfter);
                }
                setModal({
                    open: true,
                    variant: "danger",
                    text: data.error ?? "Failed to send report. Please try again.",
                });
                return;
            }

            startCooldown(data.cooldownSeconds ?? 45);
            setMessage("");
            setModal({
                open: true,
                variant: "success",
                text: "Your report has reached Central 46. Thank you for helping improve the system.",
            });
        } catch {
            setModal({
                open: true,
                variant: "danger",
                text: "Could not reach the server. Please check your connection and try again.",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="relative bg-gradient-to-b from-[#0a0a0f]/90 to-[#020205]/95 border border-[#c8a96e]/25 p-6 md:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                {/* Kido corner brackets */}
                <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
                <div className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
                <div className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-2 border-l-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />
                <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#c8a96e] drop-shadow-[0_0_7px_rgba(200,169,110,0.6)]" />

                <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#c8a96e]/60" />
                    <span className="text-lg font-bold text-[#c8a96e] tracking-[0.3em]" style={{ fontFamily: "'Cinzel', serif" }}>
                        報告書
                    </span>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#c8a96e]/60" />
                </div>
                <p className="text-center text-[12px] uppercase tracking-[0.35em] text-[#eed9c4]/50 font-mono mb-8">
                    Mission Report // Bug &amp; Feedback
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Category pills */}
                    <div>
                        <label className="block text-[11px] uppercase tracking-[0.25em] text-[#eed9c4]/40 font-mono mb-2">
                            Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {CATEGORIES.map((c) => {
                                const active = category === c.id;
                                return (
                                    <button
                                        type="button"
                                        key={c.id}
                                        onClick={() => setCategory(c.id)}
                                        className={`flex flex-col items-center gap-1 py-2.5 border text-[10px] uppercase tracking-[0.15em] font-mono transition-all duration-200 cursor-pointer
                                            ${active
                                                ? "border-[#c8a96e] bg-[#c8a96e]/10 text-[#c8a96e]"
                                                : "border-[#c8a96e]/15 text-[#eed9c4]/40 hover:border-[#c8a96e]/40 hover:text-[#eed9c4]/70"
                                            }`}
                                    >
                                        <span className="text-sm">{c.kanji}</span>
                                        {c.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Textarea */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="support-message" className="text-[11px] uppercase tracking-[0.25em] text-[#eed9c4]/40 font-mono">
                                Details
                            </label>
                            <span
                                className={`text-[11px] font-mono tracking-wider ${
                                    trimmedLen > MAX_LEN ? "text-red-500" : "text-[#eed9c4]/50"
                                }`}
                            >
                                {trimmedLen}/{MAX_LEN}
                            </span>
                        </div>
                        <textarea
                            id="support-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={MAX_LEN}
                            rows={7}
                            placeholder="Describe the issue or share your feedback... (minimum 10 characters)"
                            className="w-full resize-none bg-[#050507] border border-[#1a1a24] focus:border-[#c8a96e]/70 focus:outline-none p-4 text-sm text-[#e2e2e5] placeholder-[#444452] font-medium tracking-wide transition-colors duration-300"
                        />
                        {isTooShort && (
                            <p className="mt-1.5 text-[11px] font-mono text-red-500/80 tracking-wide uppercase">
                                Minimum {MIN_LEN} characters required
                            </p>
                        )}
                    </div>

                    {/* Honeypot — visually hidden from real users, not with display:none
                        (some bots skip fields hidden that way, so an off-screen position is used instead) */}
                    <div
                        aria-hidden="true"
                        style={{ position: "absolute", left: "-99911px", width: "1px", height: "1px", overflow: "hidden" }}
                    >
                        <label htmlFor="website">Website</label>
                        <input
                            id="website"
                            name="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                        />
                    </div>

                    <Button type="submit" variant="primary" disabled={!canSubmit} className="w-full disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[#c8a96e]">
                        {submitting ? "TRANSMITTING..." : isActive ? `RECHARGING // ${formatCountdown(remainingSec)}` : "SEND REPORT"}
                    </Button>

                    {isActive && (
                        <p className="text-center text-[11px] font-mono text-[#eed9c4]/50 tracking-[0.2em] uppercase -mt-2">
                            Kido barrier recharging — next report available in {formatCountdown(remainingSec)}
                        </p>
                    )}
                </form>
            </div>

            <Modal
                isOpen={modal.open}
                onClose={() => setModal((m) => ({ ...m, open: false }))}
                title={modal.variant === "success" ? "REPORT RECEIVED" : "TRANSMISSION FAILED"}
                variant={modal.variant}
                maxWidth="max-w-[420px]"
                onConfirm={() => setModal((m) => ({ ...m, open: false }))}
                confirmText="CLOSE"
                hideCancel
            >
                <p className="text-sm text-[#d8d0c8]/80 leading-relaxed text-center">{modal.text}</p>
            </Modal>
        </>
    );
}