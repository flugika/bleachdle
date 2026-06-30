"use client";

import React, { useState, useEffect } from "react";

// ─────────────────────────────────────────────
//  TYPE DEFINITIONS
// ─────────────────────────────────────────────

interface Central46ArchiveProps {
    guesses: any[];
    soulName: string;
    inputName: string;
    setInputName: (value: string) => void;
    handleRegisterSoul: (e: React.FormEvent) => void;
    reincarnationCount: number;
    canReset: boolean;
    handleHardReset: () => void;
    stats: {
        maxStreak: number;
        currentStreak?: number;
    };
}

// ─────────────────────────────────────────────
//  DESIGN TOKENS — bright enough to read on #07070a
//
//  label     #9a9088   section category labels
//  body      #c8bdb0   general prose
//  value     #e8ddd0   primary data values (highest contrast)
//  gold      #c8a96e   accent / classification
//  green     #7ab85a   APPROVED / ACTIVE
//  redNotice #e06060   NOTICE tag
//  noticeTxt #c8a890   notice body (warm, readable)
//  noticeAlt #a89070   secondary notice line
//  section   #a09080   § headings
//  muted     #5a5448   timestamps / hashes (non-critical)
//  mutedMid  #706660   archive metadata
// ─────────────────────────────────────────────

const T = {
    bg: "#07070a",
    border: "#272420",
    borderDim: "#1a1816",
    label: "#9a9088",
    body: "#c8bdb0",
    value: "#e8ddd0",
    gold: "#c8a96e",
    green: "#7ab85a",
    redNotice: "#e06060",
    noticeTxt: "#c8a890",
    noticeAlt: "#a89070",
    section: "#a09080",
    muted: "#b1a693",
    mutedMid: "#857a73",
    stampRed: "rgba(200,60,60,0.28)",
} as const;

// ─────────────────────────────────────────────
//  REIATSU CLASSIFICATION ENGINE
// ─────────────────────────────────────────────

type ReiatsuTier = {
    classification: string;
    confidence: string;
    observer: string;
    kanji: string;
};

function getReiatsuTier(guessCount: number): ReiatsuTier {
    if (guessCount <= 1) return { classification: "AIZEN-CLASS", confidence: "99.99%", observer: "CENTRAL 46 DIRECT", kanji: "神格" };
    if (guessCount <= 2) return { classification: "CAPTAIN-CLASS", confidence: "99.82%", observer: "12TH DIVISION", kanji: "隊長格" };
    if (guessCount <= 4) return { classification: "LIEUTENANT-CLASS", confidence: "97.41%", observer: "2ND DIVISION", kanji: "副隊長格" };
    if (guessCount <= 6) return { classification: "SEATED OFFICER", confidence: "88.13%", observer: "11TH DIVISION", kanji: "席官級" };
    return { classification: "UNSEATED", confidence: "71.06%", observer: "4TH DIVISION", kanji: "一般兵" };
}

function generateRegistryId(seed: number): string {
    const hash = ((seed * 7 + 100031) % 900000) + 100000;
    return `C46-${hash}`;
}

// ─────────────────────────────────────────────
//  PRIMITIVES
// ─────────────────────────────────────────────

function Rule({ dim = false }: { dim?: boolean }) {
    return <div style={{ width: "100%", height: "1px", background: dim ? T.borderDim : T.border }} />;
}

function Field({
    label,
    value,
    accent = false,
    green = false,
    large = false,
}: {
    label: string;
    value: React.ReactNode;
    accent?: boolean;
    green?: boolean;
    large?: boolean;
}) {
    const valueColor = accent ? T.gold : green ? T.green : T.value;
    return (
        <div style={{ padding: "13px 0" }}>
            <p style={{
                fontSize: "11px",
                letterSpacing: "0.32em",
                color: T.label,
                textTransform: "uppercase",
                margin: "0 0 6px",
            }}>
                {label}
            </p>
            <p style={{
                fontSize: large ? "20px" : "16px",
                letterSpacing: large ? "0.14em" : "0.1em",
                color: valueColor,
                fontWeight: large ? 700 : 500,
                margin: 0,
                lineHeight: 1.3,
            }}>
                {value}
            </p>
        </div>
    );
}

function SectionHead({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: "10px",
            letterSpacing: "0.42em",
            color: T.section,
            textTransform: "uppercase",
            margin: "0 0 20px",
        }}>
            {children}
        </p>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p style={{ fontSize: "9px", letterSpacing: "0.28em", color: T.muted, textTransform: "uppercase", margin: "0 0 4px" }}>
                {label}
            </p>
            <p style={{ fontSize: "11px", color: T.mutedMid, margin: 0, letterSpacing: "0.08em" }}>
                {value}
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────
//  SECURITY STRIP
// ─────────────────────────────────────────────

function SecurityStrip({ bottom = false }: { bottom?: boolean }) {
    const label = "TOP SECRET · 極秘 · ";
    return (
        <div style={{
            width: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: "8px",
            letterSpacing: "0.18em",
            color: T.gold,
            padding: "5px 0",
            borderBottom: bottom ? "none" : `1px solid ${T.borderDim}`,
            borderTop: bottom ? `1px solid ${T.borderDim}` : "none",
            opacity: 0.18,
            userSelect: "none",
        }} aria-hidden="true">
            {label.repeat(40)}
        </div>
    );
}

// ─────────────────────────────────────────────
//  STAMPS
// ─────────────────────────────────────────────

function StampApproved() {
    return (
        <div style={{
            position: "absolute", top: 52, right: 24, zIndex: 20,
            transform: "rotate(12deg)", pointerEvents: "none", userSelect: "none",
            border: `2px solid ${T.stampRed}`,
            padding: "5px 10px", textAlign: "center",
        }} aria-hidden="true">
            <p style={{ fontSize: "9px", fontWeight: 900, letterSpacing: "0.38em", color: T.stampRed, margin: "0 0 2px", textTransform: "uppercase" }}>
                APPROVED
            </p>
            <p style={{ fontSize: "8px", letterSpacing: "0.2em", color: T.stampRed, margin: 0 }}>
                中央四十六室
            </p>
        </div>
    );
}

function StampSealed() {
    return (
        <div style={{
            position: "absolute", bottom: 140, left: 16, zIndex: 20,
            transform: "rotate(-12deg)", pointerEvents: "none", userSelect: "none",
            border: `1px solid rgba(180,40,40,0.22)`,
            padding: "5px 8px", textAlign: "center",
        }} aria-hidden="true">
            <p style={{ fontSize: "9px", fontWeight: 900, letterSpacing: "0.32em", color: "rgba(200,50,50,0.24)", margin: "0 0 2px", textTransform: "uppercase" }}>
                SEALED
            </p>
            <p style={{ fontSize: "8px", color: "rgba(180,45,45,0.20)", margin: "0 0 2px", letterSpacing: "0.15em" }}>
                極秘
            </p>
            <p style={{ fontSize: "7px", color: "rgba(170,42,42,0.18)", margin: 0, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                NOT FOR PUBLIC RELEASE
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────
//  CTA BUTTON
// ─────────────────────────────────────────────

function CTAButton({ canReset, onClick }: { canReset: boolean; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);

    const borderColor = !canReset ? T.borderDim : hovered ? "rgba(200,169,110,0.5)" : "#383028";
    const bgColor = !canReset ? "transparent" : hovered ? "#0d0c09" : "transparent";
    const mainColor = !canReset ? T.muted : hovered ? T.gold : T.section;

    return (
        <button
            type="button"
            onClick={() => { if (canReset) onClick(); }}
            disabled={!canReset}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: "100%",
                border: `1px solid ${borderColor}`,
                background: bgColor,
                padding: "16px 18px",
                cursor: canReset ? "pointer" : "not-allowed",
                opacity: canReset ? 1 : 0.4,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                transition: "border-color 0.25s, background 0.25s",
            }}
        >
            <div style={{ textAlign: "left" }}>
                <p style={{
                    fontSize: "11px",
                    letterSpacing: "0.32em",
                    textTransform: "uppercase",
                    color: mainColor,
                    margin: "0 0 5px",
                    transition: "color 0.25s",
                }}>
                    {canReset ? "AUTHORIZE NEW CYCLE" : "SOUL ID REQUIRED"}
                </p>
                <p style={{
                    fontSize: "10px",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: canReset ? T.mutedMid : T.muted,
                    margin: 0,
                }}>
                    {canReset ? "CURRENT RECORDS WILL BE ARCHIVED" : "COMPLETE SOUL RECORD TO PROCEED"}
                </p>
            </div>
            {canReset && (
                <span style={{
                    fontSize: "14px",
                    color: hovered ? T.gold : T.muted,
                    alignSelf: "center",
                    transition: "color 0.25s",
                }}>
                    →
                </span>
            )}
        </button>
    );
}

// ─────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────

export default function Central46ConfidentialArchive({
    guesses = [],
    soulName = "",
    inputName = "",
    setInputName,
    handleRegisterSoul,
    reincarnationCount = 1,
    canReset = true,
    handleHardReset,
    stats = { maxStreak: 0, currentStreak: 0 },
}: Central46ArchiveProps) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const reiatsu = getReiatsuTier(guesses.length);
    const registryId = generateRegistryId(reincarnationCount);
    const fileNo = `C46-SS-${String(reincarnationCount * 483 + 12847).padStart(7, "0")}`;
    const archiveNo = `C46-221-${String(reincarnationCount * 97 + 918).padStart(3, "0")}`;
    const revision = String(reincarnationCount + 6).padStart(2, "0");
    const currentStreak = stats.currentStreak ?? 0;
    const today = new Date().toISOString().split("T")[0];

    if (!mounted) return null;

    return (
        <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "40px 16px 0", userSelect: "none" }}>
            <div
                role="document"
                aria-label="Central 46 Classified Archive"
                style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: "520px",
                    background: T.bg,
                    color: T.body,
                    overflow: "hidden",
                    boxShadow: `0 0 0 1px ${T.border}, 0 48px 96px rgba(0,0,0,0.95)`,
                }}
            >
                {/* Watermark */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
                    <span style={{ fontSize: "240px", fontWeight: 900, color: "#ffffff", opacity: 0.013, lineHeight: 1 }}>卍</span>
                </div>

                <SecurityStrip />
                <StampApproved />
                <StampSealed />

                {/* ══ HEADER ══ */}
                <div style={{ padding: "28px 36px 0", position: "relative", zIndex: 10 }}>
                    <p style={{ fontSize: "9px", letterSpacing: "0.48em", color: T.muted, textTransform: "uppercase", margin: "0 0 18px" }}>
                        大霊書回廊 // GREAT LOG GALLERY
                    </p>
                    <p style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.14em", color: "#d8ccc0", textTransform: "uppercase", margin: "0 0 3px" }}>
                        中央四十六室
                    </p>
                    <p style={{ fontSize: "11px", letterSpacing: "0.48em", color: T.section, textTransform: "uppercase", margin: "0 0 2px" }}>
                        CENTRAL 46
                    </p>
                    <p style={{ fontSize: "10px", letterSpacing: "0.36em", color: T.mutedMid, textTransform: "uppercase", margin: "0 0 24px" }}>
                        CONFIDENTIAL ARCHIVES
                    </p>

                    <Rule />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 0" }}>
                        <div>
                            <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 5px" }}>CLASSIFICATION</p>
                            <p style={{ fontSize: "12px", letterSpacing: "0.18em", color: T.gold, margin: 0 }}>████ LEVEL BLACK</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 5px" }}>AUTHORIZATION</p>
                            <p style={{ fontSize: "12px", letterSpacing: "0.18em", color: T.gold, margin: 0 }}>LEVEL BLACK</p>
                        </div>
                    </div>
                    <Rule />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 0" }}>
                        <div>
                            <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 5px" }}>FILE NO.</p>
                            <p style={{ fontSize: "12px", letterSpacing: "0.12em", color: T.value, margin: 0 }}>{fileNo}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 5px" }}>STATUS</p>
                            <p style={{ fontSize: "12px", letterSpacing: "0.2em", color: T.green, margin: 0 }}>APPROVED</p>
                        </div>
                    </div>
                    <Rule />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "14px 0 20px" }}>
                        <MetaItem label="ARCHIVE" value={archiveNo} />
                        <MetaItem label="REVISION" value={revision} />
                        <MetaItem label="AUTHOR" value="C. 46" />
                        <MetaItem label="STATUS" value="SEALED" />
                    </div>
                    <Rule />
                </div>

                {/* ══ QUOTE ══ */}
                <div style={{ padding: "24px 36px", position: "relative", zIndex: 10 }}>
                    <p style={{ fontSize: "13px", fontStyle: "italic", color: T.body, lineHeight: 1.8, letterSpacing: "0.05em", margin: "0 0 10px" }}>
                        Observation never ceases.<br />
                        Judgment merely awaits.
                    </p>
                    <p style={{ fontSize: "9px", color: T.muted, letterSpacing: "0.3em", textTransform: "uppercase", margin: 0 }}>
                        — Central Forty-Six Chambers, Internal Directive
                    </p>
                </div>

                <div style={{ padding: "0 36px" }}><Rule /></div>

                {/* ══ § 01 SUBJECT IDENTIFICATION ══ */}
                <div style={{ padding: "24px 36px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 01 — Subject Identification</SectionHead>

                    {!soulName ? (
                        <div>
                            <p style={{ fontSize: "12px", letterSpacing: "0.24em", color: T.value, textTransform: "uppercase", margin: "0 0 8px" }}>
                                IDENTITY REGISTRATION REQUIRED
                            </p>
                            <p style={{ fontSize: "13px", color: T.body, lineHeight: 1.75, letterSpacing: "0.04em", margin: "0 0 22px" }}>
                                No official archive exists for this soul.<br />
                                Register an identity to begin observation.
                            </p>
                            <form onSubmit={handleRegisterSoul} style={{ display: "flex", width: "100%", border: `1px solid ${T.border}` }}>
                                <input
                                    type="text"
                                    maxLength={15}
                                    value={inputName}
                                    onChange={(e) => setInputName(e.target.value)}
                                    placeholder="ENTER REGISTERED SOUL NAME"
                                    style={{
                                        flex: 1,
                                        background: "transparent",
                                        border: "none",
                                        padding: "12px 16px",
                                        fontSize: "11px",
                                        letterSpacing: "0.2em",
                                        textTransform: "uppercase",
                                        color: T.value,
                                        outline: "none",
                                    }}
                                />
                                <button
                                    type="submit"
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        borderLeft: `1px solid ${T.border}`,
                                        padding: "12px 20px",
                                        fontSize: "10px",
                                        letterSpacing: "0.28em",
                                        textTransform: "uppercase",
                                        color: T.section,
                                        cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.color = T.gold;
                                        (e.currentTarget as HTMLButtonElement).style.background = "#0e0d0a";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLButtonElement).style.color = T.section;
                                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                                    }}
                                >
                                    ETCH
                                </button>
                            </form>
                            <p style={{ fontSize: "9px", color: T.muted, letterSpacing: "0.22em", textTransform: "uppercase", margin: "8px 0 0" }}>
                                Identity will be permanently inscribed in the Soul Registry
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: "10px", letterSpacing: "0.36em", color: T.mutedMid, textTransform: "uppercase", margin: "0 0 16px" }}>
                                PERSONAL DOSSIER
                            </p>
                            <Rule />
                            <Field label="NAME" value={soulName.toUpperCase()} accent />
                            <Rule dim />
                            <Field label="REGISTRY ID" value={registryId} />
                            <Rule dim />
                            <Field label="CURRENT LOCATION" value="WORLD OF THE LIVING" />
                            <Rule dim />
                            <Field label="THREAT INDEX" value="SPECIAL WAR POTENTIAL" accent />
                            <Rule dim />
                            <Field label="REINCARNATION COUNT" value={String(reincarnationCount)} />
                            <Rule dim />
                            <Field label="OBSERVATION STATUS" value="ACTIVE" green />
                            <Rule dim />
                            <Field label="LAST REVIEW" value={today} />
                            <Rule />
                        </div>
                    )}
                </div>

                {/* ══ § 02 SPIRITUAL PRESSURE ANALYSIS ══ */}
                <div style={{ padding: "28px 36px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 02 — Spiritual Pressure Analysis</SectionHead>
                    <Rule />
                    <div style={{ padding: "16px 0 10px" }}>
                        <p style={{ fontSize: "10px", letterSpacing: "0.36em", color: T.label, textTransform: "uppercase", margin: "0 0 8px" }}>
                            RESULT
                        </p>
                        <p style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "0.16em", color: T.gold, textTransform: "uppercase", margin: "0 0 4px" }}>
                            {reiatsu.classification}
                        </p>
                        <p style={{ fontSize: "11px", color: T.mutedMid, letterSpacing: "0.28em", margin: 0 }}>
                            {reiatsu.kanji}
                        </p>
                    </div>
                    <Rule dim />
                    <Field label="CONFIDENCE" value={reiatsu.confidence} accent />
                    <Rule dim />
                    <Field label="OBSERVED BY" value={reiatsu.observer} />
                    <Rule dim />
                    <Field label="METHOD" value="ZANPAKUTŌ RESONANCE SCAN" />
                    <Rule />
                </div>

                {/* ══ § 03 SPIRITUAL RECORD ══ */}
                <div style={{ padding: "28px 36px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 03 — Spiritual Record</SectionHead>
                    <Rule />
                    <Field label="CURRENT STREAK" value={String(currentStreak)} accent />
                    <Rule dim />
                    <Field label="MAX STREAK" value={String(stats.maxStreak)} />
                    <Rule dim />
                    <Field label="SOUL CYCLE" value={String(reincarnationCount)} />
                    <Rule dim />
                    <Field label="CLEARANCE REPORT" value="CONTINUED OBSERVATION APPROVED" green />
                    <Rule />
                </div>

                {/* ══ § 04 CYCLE AUTHORIZATION ══ */}
                <div style={{ padding: "28px 36px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 04 — Cycle Authorization</SectionHead>

                    {/* ── NOTICE BLOCK ── */}
                    <div style={{ borderLeft: "2px solid rgba(200,80,80,0.4)", paddingLeft: "16px", marginBottom: "24px" }}>
                        <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.redNotice, textTransform: "uppercase", margin: "0 0 12px" }}>
                            NOTICE
                        </p>

                        {/* Line 1: what gets erased */}
                        <p style={{ fontSize: "12px", color: T.noticeTxt, lineHeight: 1.75, letterSpacing: "0.04em", margin: "0 0 4px" }}>
                            Initiating a new archive cycle will erase all active investigation records.
                        </p>

                        {/* Line 2: streak consequence — the key info */}
                        <p style={{ fontSize: "12px", color: T.noticeTxt, lineHeight: 1.75, letterSpacing: "0.04em", margin: "0 0 12px" }}>
                            <span style={{ color: T.redNotice, fontWeight: 600 }}>CURRENT STREAK</span>
                            {" "}will be reset to{" "}
                            <span style={{ color: T.redNotice, fontWeight: 600 }}>0</span>.
                        </p>

                        {/* Line 3: what persists */}
                        <p style={{ fontSize: "12px", color: T.noticeAlt, lineHeight: 1.75, letterSpacing: "0.04em", margin: "0 0 4px" }}>
                            <span style={{ color: T.gold, fontWeight: 600 }}>MAX STREAK</span>
                            {" "}({stats.maxStreak}) remains permanently sealed within the Central Archives.
                        </p>

                        {/* Line 4: sealed record note */}
                        <p style={{ fontSize: "12px", color: T.noticeAlt, lineHeight: 1.75, letterSpacing: "0.04em", margin: 0 }}>
                            Permanent records remain sealed within the Central Archives.
                        </p>
                    </div>

                    <CTAButton canReset={canReset} onClick={handleHardReset} />
                </div>

                {/* ══ FOOTER ══ */}
                <div style={{ borderTop: `1px solid ${T.borderDim}`, padding: "16px 36px", position: "relative", zIndex: 10, marginTop: "32px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <p style={{ fontSize: "8px", color: T.muted, letterSpacing: "0.28em", textTransform: "uppercase", margin: 0 }}>
                            CENTRAL 46 · ARCHIVAL DIVISION · SOUL SOCIETY
                        </p>
                        <p style={{ fontSize: "8px", color: T.muted, letterSpacing: "0.2em", textTransform: "uppercase", margin: 0 }}>
                            HASH C46-83A91F72
                        </p>
                    </div>
                    <p style={{ fontSize: "8px", color: T.borderDim, letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
                        PROPERTY OF THE CENTRAL FORTY-SIX CHAMBERS · UNAUTHORIZED ACCESS IS PROHIBITED
                    </p>
                </div>

                <SecurityStrip bottom />
            </div>
        </div>
    );
}