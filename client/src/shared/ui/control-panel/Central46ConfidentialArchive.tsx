"use client";

import React, { useState, useEffect, useRef } from "react";
import { SubFeatureKey, BL_MODES_METADATA } from "@/src/config/mode";

// ─────────────────────────────────────────────
//  TYPE DEFINITIONS
// ─────────────────────────────────────────────

type CSSPropertiesWithVars = React.CSSProperties & {
    [key: `--${string}`]: string | number;
};

interface Central46ArchiveProps {
    mode?: SubFeatureKey; // รองรับการขยายไปโหมดอื่นๆ (Default: "character")
    guesses: unknown[];
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
// ─────────────────────────────────────────────

const T = {
    bg: "#07070a",
    border: "#272420",
    borderDim: "#8a7657",
    label: "#9a9088",
    body: "#c8bdb0",
    value: "#e8ddd0",
    gold: "#c8a96e",
    goldBright: "#dec085",
    green: "#7ab85a",
    redNotice: "#e06060",
    noticeTxt: "#c8a890",
    noticeAlt: "#a89070",
    section: "#a09080",
    muted: "#b1a693",
    mutedMid: "#857a73",
    stampRed: "#c8a86e96",
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

// Deterministic string hash (FNV-1a-ish) — used so registry/file/archive
// numbers are seeded by the ACTUAL soul name + mode (real localStorage
// data), not just reincarnationCount. Two different players on the same
// cycle count used to get an identical registry ID; now every soul×mode
// combination produces its own number, same as real archive filing would.
function hashString(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function generateRegistryId(seed: number): string {
    const hash = (seed % 900000) + 100000;
    return `C46-${hash}`;
}

// Local date + time, e.g. "2026-07-12 07:03" — archive timestamps read as
// stale/misleading with a date-only stamp once a soul can cycle same-day.
function formatArchiveTimestamp(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────
//  MODE SPECIFIC TECHNICAL METHODS MAP
//  (ผูกคำศัพท์เทคนิคตามโหมด โดยอิง UI เดิมของ Character ไว้เสถียรที่สุด)
// ─────────────────────────────────────────────
const MODE_SPECIFIC_METHODS: Record<SubFeatureKey, string> = {
    character: "ZANPAKUTŌ RESONANCE SCAN",
    song: "HADŌ FREQUENCY RESONANCE SCAN",
    quote: "KOTODAMA VOCAL PRINT ANALYSIS",
    silhouette: "SHIKAKU VISUAL RECONSTRUCTION",
    emoji: "REISHI SYMBOLOGY CIPHER DECODE",
    release: "KAIHŌ INVOCATION VERIFICATION",
};

// Each discipline files its soul at a different archive site — this used to
// hardcode "WORLD OF THE LIVING" for every mode regardless of which one the
// player was actually in.
const MODE_LOCATIONS: Record<SubFeatureKey, string> = {
    character: "WORLD OF THE LIVING",
    song: "SEIREITEI · 12TH DIVISION ARCHIVES",
    quote: "SŌKYOKU HILL RECORDS HALL",
    silhouette: "SHISHINRŌ VISUAL VAULT",
    emoji: "REIOKYŪ SYMBOL ARCHIVE",
    release: "KUCHIKI MANOR SEALED WING",
};

// Threat index is read straight off the LIVE reiatsu classification (itself
// derived from this session's actual guesses.length), so it changes puzzle
// to puzzle instead of being a frozen string.
const THREAT_INDEX_BY_CLASSIFICATION: Record<string, string> = {
    "AIZEN-CLASS": "OMEGA THREAT · TRANSCENDENT",
    "CAPTAIN-CLASS": "SPECIAL WAR POTENTIAL",
    "LIEUTENANT-CLASS": "ELEVATED COMBAT THREAT",
    "SEATED OFFICER": "MODERATE THREAT",
    "UNSEATED": "MINIMAL THREAT · UNDER REVIEW",
};

// Observation status reads the player's real current streak + reincarnation
// count from localStorage — a soul that's never cleared a cycle reads
// differently from one that's between streaks.
function getObservationStatus(currentStreak: number, reincarnationCount: number): { label: string; tone: "green" | "gold" | "muted" } {
    if (currentStreak > 0) return { label: "ACTIVE", tone: "green" };
    if (reincarnationCount > 0) return { label: "DORMANT", tone: "gold" };
    return { label: "NEWLY OBSERVED", tone: "muted" };
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
    glow = false,
}: {
    label: string;
    value: React.ReactNode;
    accent?: boolean;
    green?: boolean;
    large?: boolean;
    glow?: boolean;
}) {
    const valueColor = accent ? T.gold : green ? T.green : T.value;
    return (
        <div
            style={{
                padding: "13px 0",
                borderRadius: glow ? "2px" : 0,
                animation: glow ? "c46-etched-pulse 1.5s ease-out" : "none",
            }}
        >
            <p style={{
                fontSize: "10px",
                letterSpacing: "0.3em",
                color: T.label,
                textTransform: "uppercase",
                margin: "0 0 7px",
            }}>
                {label}
            </p>
            <p style={{
                fontSize: large ? "19px" : "16px",
                letterSpacing: large ? "0.12em" : "0.08em",
                color: valueColor,
                fontWeight: large ? 700 : 500,
                margin: 0,
                lineHeight: 1.3,
                wordBreak: "break-word",
            }}>
                {value}
            </p>
        </div>
    );
}

// Two-up compact row — halves the vertical footprint versus stacking every
// Field full-width. Falls back gracefully with any number of children.
function FieldRow({ children }: { children: React.ReactNode }) {
    const count = React.Children.count(children);
    return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, columnGap: "20px" }}>
            {children}
        </div>
    );
}

function SectionHead({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: "13px",
            letterSpacing: "0.4em",
            color: T.section,
            textTransform: "uppercase",
            margin: "0 0 16px",
        }}>
            {children}
        </p>
    );
}

function MetaItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p style={{ fontSize: "11px", letterSpacing: "0.28em", color: T.muted, textTransform: "uppercase", margin: "0 0 6px" }}>
                {label}
            </p>
            <p style={{ fontSize: "11px", color: T.mutedMid, margin: 0, letterSpacing: "0.08em" }}>
                {value}
            </p>
        </div>
    );
}

function SecurityStrip({ bottom = false }: { bottom?: boolean }) {
    const label = "TOP SECRET · 極秘 · ";
    return (
        <div style={{
            width: "100%",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontSize: "10px",
            letterSpacing: "0.18em",
            color: T.gold,
            padding: "7px 0",
            borderBottom: bottom ? "none" : `1px solid ${T.borderDim}`,
            borderTop: bottom ? `1px solid ${T.borderDim}` : "none",
            opacity: 0.3,
            userSelect: "none",
        }} aria-hidden="true">
            {label.repeat(40)}
        </div>
    );
}

function StampApproved() {
    return (
        <div style={{
            position: "absolute", top: 52, right: 24, zIndex: 20,
            transform: "rotate(12deg)", pointerEvents: "none", userSelect: "none",
            border: `4px solid ${T.stampRed}`,
            padding: "7px 14px", textAlign: "center",
        }} aria-hidden="true">
            <p style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.38em", color: T.stampRed, margin: "0 0 4px", textTransform: "uppercase" }}>
                APPROVED
            </p>
            <p style={{ fontSize: "10px", letterSpacing: "0.2em", color: T.stampRed, margin: 0 }}>
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
            padding: "7px 10px", textAlign: "center",
        }} aria-hidden="true">
            <p style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "0.32em", color: "rgba(200,50,50,0.24)", margin: "0 0 4px", textTransform: "uppercase" }}>
                SEALED
            </p>
            <p style={{ fontSize: "10px", color: "rgba(180,45,45,0.20)", margin: "0 0 4px", letterSpacing: "0.15em" }}>
                極秘
            </p>
            <p style={{ fontSize: "10px", color: "rgba(170,42,42,0.18)", margin: 0, letterSpacing: "0.22em", textTransform: "uppercase" }}>
                NOT FOR PUBLIC RELEASE
            </p>
        </div>
    );
}

// ─────────────────────────────────────────────
//  ETCH BUTTON — solid-fill, not just a hover border, so it reads as the
//  primary action the moment a name is typed (previously a thin inline
//  border-button that was easy to miss).
// ─────────────────────────────────────────────

function EtchButton({ disabled }: { disabled: boolean }) {
    const [hovered, setHovered] = useState(false);
    const bg = disabled ? "transparent" : hovered ? T.goldBright : T.gold;
    const border = disabled ? T.borderDim : T.gold;
    const textColor = disabled ? T.muted : "#07070a";

    return (
        <button
            type="submit"
            disabled={disabled}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: "100%",
                border: `1px solid ${border}`,
                background: bg,
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.4 : 1,
                boxShadow: !disabled && hovered ? "0 0 26px rgba(200,169,110,0.45)" : "none",
                transition: "all 0.2s ease",
            }}
        >
            <span style={{ fontSize: "15px", color: textColor }}>刻</span>
            <span style={{ fontSize: "13px", letterSpacing: "0.32em", fontWeight: 700, color: textColor, textTransform: "uppercase" }}>
                ETCH SOUL NAME
            </span>
        </button>
    );
}

// ─────────────────────────────────────────────
//  CYCLE AUTHORIZATION CTA
// ─────────────────────────────────────────────

function CTAButton({ canReset, onClick }: { canReset: boolean; onClick: () => void }) {
    const [hovered, setHovered] = useState(false);

    const bgColor = !canReset
        ? "transparent"
        : hovered
            ? T.goldBright
            : T.gold;

    const borderColor = !canReset
        ? T.borderDim
        : hovered
            ? T.goldBright
            : T.gold;

    const mainTextColor = !canReset ? T.muted : "#07070a";
    const subTextColor = !canReset ? T.muted : "rgba(7, 7, 10, 0.75)";
    const arrowColor = !canReset ? T.muted : "#07070a";

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
                padding: "18px 24px",
                cursor: canReset ? "pointer" : "not-allowed",
                opacity: canReset ? 1 : 0.3,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "16px",
                boxShadow: canReset && hovered ? "0 0 27px rgba(200, 169, 110, 0.4)" : "none",
                transition: "all 0.2s ease-in-out",
            }}
        >
            <div style={{ textAlign: "left" }}>
                <p style={{
                    fontSize: "13px",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    color: mainTextColor,
                    fontWeight: canReset ? 700 : 400,
                    margin: "0 0 7px",
                    transition: "color 0.2s",
                }}>
                    {canReset ? "新周・新生 — NEW CYCLE, NEW LIFE" : "SOUL ID REQUIRED"}
                </p>
                <p style={{
                    fontSize: "12px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: subTextColor,
                    fontWeight: canReset ? 600 : 400,
                    margin: 0,
                }}>
                    {canReset ? "CURRENT RECORDS WILL BE ARCHIVED" : "COMPLETE SOUL RECORD TO PROCEED"}
                </p>
            </div>
            {canReset && (
                <span style={{
                    fontSize: "16px",
                    color: arrowColor,
                    alignSelf: "center",
                    flexShrink: 0,
                    transform: hovered ? "translateX(6px)" : "translateX(0)",
                    transition: "all 0.2s ease",
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
    mode = "character",
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

    const [nameFocused, setNameFocused] = useState(false);
    const [justEtched, setJustEtched] = useState(false);
    const prevSoulNameRef = useRef(soulName);
    const ctaRef = useRef<HTMLDivElement>(null);

    // Detect the empty→named transition (i.e. the moment ETCH actually
    // registers a soul) and: (1) flash the freshly-written NAME field so the
    // player sees their name land in the dossier, then (2) auto-scroll down
    // to the cycle-authorization CTA a beat later, so they don't have to
    // hunt for it themselves.
    useEffect(() => {
        const prev = prevSoulNameRef.current;
        if (!prev && soulName) {
            setJustEtched(true);
            const scrollTimer = setTimeout(() => {
                ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 1100);
            const clearTimer = setTimeout(() => setJustEtched(false), 2200);
            return () => {
                clearTimeout(scrollTimer);
                clearTimeout(clearTimer);
            };
        }
        prevSoulNameRef.current = soulName;
    }, [soulName]);

    // Extract dynamic metadata based on current game mode
    const modeMeta = BL_MODES_METADATA[mode];
    const techTerm = modeMeta?.technicalTerm || "REISHI PULSE: CLASSIFIED";
    const scanMethod = MODE_SPECIFIC_METHODS[mode] || "ZANPAKUTŌ RESONANCE SCAN";

    const reiatsu = getReiatsuTier(guesses.length);
    const currentStreak = stats.currentStreak ?? 0;
    const today = formatArchiveTimestamp(new Date());

    // Everything below is seeded from the ACTUAL soul name + mode (real
    // SOUL_REGISTRY data), not just reincarnationCount — so two different
    // souls, or the same soul across two disciplines, file under genuinely
    // different numbers instead of an identical formula output.
    const identitySeed = hashString(`${soulName || "UNREGISTERED"}::${mode}`);
    const registryId = generateRegistryId(identitySeed + reincarnationCount * 7);
    const fileSeed = (identitySeed % 9000000) + reincarnationCount * 483 + 12847;
    const fileNo = `C46-SS-${String(fileSeed % 10000000).padStart(7, "0")}`;
    const archiveSeed = (identitySeed % 900) + reincarnationCount * 97 + 918;
    const archiveNo = `C46-221-${String(archiveSeed % 1000).padStart(3, "0")}`;
    const revision = String(reincarnationCount + 6).padStart(2, "0");

    const location = MODE_LOCATIONS[mode] || "WORLD OF THE LIVING";
    const threatIndex = THREAT_INDEX_BY_CLASSIFICATION[reiatsu.classification] || "SPECIAL WAR POTENTIAL";
    const observation = getObservationStatus(currentStreak, reincarnationCount);

    if (!mounted) return null;

    return (
        <div style={{
            width: "100%", display: "flex", justifyContent: "center", padding: "40px 18px 0", userSelect: "none",
            '--c46-border': T.border,
            '--c46-gold': T.gold,
        } as CSSPropertiesWithVars}>
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
                    boxShadow: `0 0 0 1px ${T.border}, 0 40px 98px rgba(0,0,0,0.95)`,
                }}
            >
                {/* Watermark */}
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0, display: "flex", alignItems: "center", justifyContent: "center" }} aria-hidden="true">
                    <span style={{ fontSize: "240px", fontWeight: 900, color: "#ffffff", opacity: 0.013, lineHeight: 1 }}>
                        {modeMeta?.symbol || "卍"}
                    </span>
                </div>

                <SecurityStrip />
                <StampApproved />
                <StampSealed />

                {/* ══ HEADER ══ */}
                <div style={{ padding: "88px 38px 0", position: "relative", zIndex: 10 }}>
                    <p style={{ fontSize: "11px", letterSpacing: "0.48em", color: T.muted, textTransform: "uppercase", margin: "0 0 22px" }}>
                        大霊書回廊 // GREAT LOG GALLERY
                    </p>
                    <p style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "0.14em", color: "#d8ccc0", textTransform: "uppercase", margin: "0 0 5px" }}>
                        中央四十六室
                    </p>
                    <p style={{ fontSize: "11px", letterSpacing: "0.48em", color: T.section, textTransform: "uppercase", margin: "0 0 4px" }}>
                        CENTRAL 46
                    </p>
                    <p style={{ fontSize: "14px", letterSpacing: "0.36em", color: T.mutedMid, textTransform: "uppercase", margin: "0 0 22px" }}>
                        CONFIDENTIAL ARCHIVES
                    </p>

                    <Rule />
                    <FieldRow>
                        <div style={{ padding: "13px 0" }}>
                            <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 7px" }}>CLASSIFICATION</p>
                            <p style={{ fontSize: "13px", letterSpacing: "0.16em", color: T.gold, margin: 0 }}>████ LEVEL BLACK</p>
                        </div>
                        <div style={{ padding: "13px 0" }}>
                            <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 7px" }}>AUTHORIZATION</p>
                            <p style={{ fontSize: "13px", letterSpacing: "0.16em", color: T.gold, margin: 0 }}>LEVEL BLACK</p>
                        </div>
                    </FieldRow>
                    <Rule />
                    <FieldRow>
                        <div style={{ padding: "13px 0" }}>
                            <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 7px" }}>FILE NO.</p>
                            <p style={{ fontSize: "13px", letterSpacing: "0.1em", color: T.value, margin: 0 }}>{fileNo}</p>
                        </div>
                        <div style={{ padding: "13px 0" }}>
                            <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 7px" }}>STATUS</p>
                            <p style={{ fontSize: "13px", letterSpacing: "0.18em", color: T.green, margin: 0 }}>APPROVED</p>
                        </div>
                    </FieldRow>
                    <Rule />

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "14px 0 18px" }}>
                        <MetaItem label="ARCHIVE" value={archiveNo} />
                        <MetaItem label="REVISION" value={revision} />
                        <MetaItem label="AUTHOR" value="C. 46" />
                        <MetaItem label="STATUS" value="SEALED" />
                    </div>
                    <Rule />
                </div>

                {/* ══ QUOTE ══ */}
                <div style={{ padding: "20px 38px", position: "relative", zIndex: 10 }}>
                    <p style={{ fontSize: "14px", fontStyle: "italic", color: T.body, lineHeight: 1.7, letterSpacing: "0.04em", margin: "0 0 12px" }}>
                        Observation never ceases.<br />
                        Judgment merely awaits.
                    </p>
                    <p style={{ fontSize: "10px", color: T.muted, letterSpacing: "0.28em", textTransform: "uppercase", margin: 0 }}>
                        — Central Forty-Six Chambers, Internal Directive
                    </p>
                </div>

                <div style={{ padding: "0 38px" }}><Rule /></div>

                {/* ══ § 01 SUBJECT IDENTIFICATION ══ */}
                <div style={{ padding: "24px 38px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 01 — Subject Identification</SectionHead>

                    {!soulName ? (
                        <div>
                            <p style={{ fontSize: "14px", letterSpacing: "0.22em", color: T.value, textTransform: "uppercase", margin: "0 0 8px" }}>
                                IDENTITY REGISTRATION REQUIRED
                            </p>
                            <p style={{ fontSize: "13px", color: T.body, lineHeight: 1.65, letterSpacing: "0.02em", margin: "0 0 18px" }}>
                                No official archive exists for this soul. Register an identity to begin observation.
                            </p>
                            <form onSubmit={handleRegisterSoul} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <div style={{ position: "relative" }}>
                                    <input
                                        type="text"
                                        maxLength={15}
                                        value={inputName}
                                        onChange={(e) => setInputName(e.target.value)}
                                        onFocus={() => setNameFocused(true)}
                                        onBlur={() => setNameFocused(false)}
                                        placeholder="ENTER YOUR SOUL NAME"
                                        autoComplete="off"
                                        className={!inputName && !nameFocused ? 'c46-input-glow' : ''}
                                        style={{
                                            width: "100%",
                                            boxSizing: "border-box",
                                            background: "rgba(200,169,110,0.05)",
                                            border: `1px solid ${nameFocused || inputName ? T.gold : T.border}`,
                                            padding: "18px 20px",
                                            fontSize: "15px",
                                            letterSpacing: "0.16em",
                                            textTransform: "uppercase",
                                            color: T.value,
                                            outline: "none",
                                            transition: "border-color 0.2s ease",
                                        }}
                                    />
                                    {!inputName && !nameFocused && (
                                        <span
                                            aria-hidden="true"
                                            className="c46-hint-blink"
                                            style={{
                                                position: "absolute",
                                                right: "18px",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                fontSize: "10px",
                                                letterSpacing: "0.2em",
                                                color: T.gold,
                                                textTransform: "uppercase",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            TYPE HERE ✎
                                        </span>
                                    )}
                                </div>
                                <EtchButton disabled={!inputName.trim()} />
                            </form>
                            <p style={{ fontSize: "10px", color: T.muted, letterSpacing: "0.2em", textTransform: "uppercase", margin: "10px 0 0" }}>
                                Identity will be permanently inscribed in the Soul Registry
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ fontSize: "13px", letterSpacing: "0.34em", color: T.mutedMid, textTransform: "uppercase", margin: "0 0 14px" }}>
                                PERSONAL DOSSIER
                            </p>

                            {/* ── IDENTITY BAND — NAME + SOUL CYCLE are the two things a
                                 player actually comes here to check, so they get their own
                                 bordered/glowing band instead of sitting in the same grid
                                 rhythm as location/threat/timestamp filler fields. ── */}
                            <div
                                className={justEtched ? 'c46-etched-pulse' : ''}
                                style={{
                                    border: `1px solid ${T.borderDim}`,
                                    background: "rgba(200,169,110,0.04)",
                                    padding: "18px 20px",
                                    marginBottom: "18px",
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    alignItems: "center",
                                    gap: "20px",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 8px" }}>
                                        NAME
                                    </p>
                                    <p style={{
                                        fontSize: "26px",
                                        fontWeight: 800,
                                        letterSpacing: "0.1em",
                                        color: T.goldBright,
                                        margin: 0,
                                        lineHeight: 1.2,
                                        wordBreak: "break-word",
                                    }}>
                                        {soulName.toUpperCase()}
                                    </p>
                                </div>
                                <div style={{ textAlign: "right", borderLeft: `1px solid ${T.borderDim}`, paddingLeft: "20px" }}>
                                    <p style={{ fontSize: "10px", letterSpacing: "0.3em", color: T.label, textTransform: "uppercase", margin: "0 0 8px" }}>
                                        SOUL CYCLE
                                    </p>
                                    <p style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "0.04em", color: T.gold, margin: 0, lineHeight: 1 }}>
                                        {reincarnationCount}
                                    </p>
                                </div>
                            </div>

                            <Rule />
                            <FieldRow>
                                <Field label="REGISTRY ID" value={registryId} />
                                <Field label="CURRENT LOCATION" value={location} />
                            </FieldRow>
                            <Rule dim />
                            <FieldRow>
                                <Field label="THREAT INDEX" value={threatIndex} accent />
                                <Field label="LAST REVIEW" value={today} />
                            </FieldRow>
                            <Rule dim />
                            <Field
                                label="OBSERVATION STATUS"
                                value={observation.label}
                                green={observation.tone === "green"}
                                accent={observation.tone === "gold"}
                            />
                            <Rule />
                        </div>
                    )}
                </div>

                {/* ══ § 02 SPIRITUAL PRESSURE ANALYSIS ══ */}
                <div style={{ padding: "30px 38px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 02 — Spiritual Pressure Analysis</SectionHead>
                    <Rule />
                    <div style={{ padding: "16px 0 12px" }}>
                        <p style={{ fontSize: "13px", letterSpacing: "0.34em", color: T.label, textTransform: "uppercase", margin: "0 0 9px" }}>
                            RESULT
                        </p>
                        <p style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "0.14em", color: T.gold, textTransform: "uppercase", margin: "0 0 6px" }}>
                            {reiatsu.classification}
                        </p>
                        <p style={{ fontSize: "10px", color: T.mutedMid, letterSpacing: "0.26em", margin: 0 }}>
                            {reiatsu.kanji} {techTerm ? `[ ${techTerm} ]` : ""}
                        </p>
                    </div>
                    <Rule dim />
                    <FieldRow>
                        <Field label="CONFIDENCE" value={reiatsu.confidence} accent />
                        <Field label="OBSERVED BY" value={reiatsu.observer} />
                    </FieldRow>
                    <Rule dim />
                    <Field label="METHOD" value={scanMethod} />
                    <Rule />
                </div>

                {/* ══ § 03 SPIRITUAL RECORD ══ */}
                <div style={{ padding: "30px 38px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 03 — Spiritual Record</SectionHead>
                    <Rule />
                    <FieldRow>
                        <Field label="CURRENT STREAK" value={String(currentStreak)} accent />
                        <Field label="MAX STREAK" value={String(stats.maxStreak)} />
                    </FieldRow>
                    <Rule dim />
                    <Field label="SOUL CYCLE" value={String(reincarnationCount)} />
                    <Rule dim />
                    <Field label="CLEARANCE REPORT" value="CONTINUED OBSERVATION APPROVED" green />
                    <Rule />
                </div>

                {/* ══ § 04 CYCLE AUTHORIZATION ══ */}
                <div ref={ctaRef} style={{ padding: "30px 38px 0", position: "relative", zIndex: 10 }}>
                    <SectionHead>§ 04 — Cycle Authorization</SectionHead>

                    {/* ── NOTICE BLOCK ── */}
                    <div style={{ borderLeft: "4px solid rgba(200,80,80,0.4)", paddingLeft: "16px", marginBottom: "22px" }}>
                        <p style={{ fontSize: "13px", letterSpacing: "0.28em", color: T.redNotice, textTransform: "uppercase", margin: "0 0 12px" }}>
                            NOTICE
                        </p>

                        <p style={{ fontSize: "13px", color: T.noticeTxt, lineHeight: 1.65, letterSpacing: "0.02em", margin: "0 0 6px" }}>
                            Initiating a new archive cycle will erase all active investigation records.
                        </p>

                        <p style={{ fontSize: "13px", color: T.noticeTxt, lineHeight: 1.65, letterSpacing: "0.02em", margin: "0 0 12px" }}>
                            <span style={{ color: T.redNotice, fontWeight: 600 }}>CURRENT STREAK</span>
                            {" "}will be reset to{" "}
                            <span style={{ color: T.redNotice, fontWeight: 600 }}>0</span>.
                        </p>

                        <p style={{ fontSize: "13px", color: T.noticeAlt, lineHeight: 1.65, letterSpacing: "0.02em", margin: 0 }}>
                            <span style={{ color: T.gold, fontWeight: 600 }}>MAX STREAK</span>
                            {" "}({stats.maxStreak}) and all permanent records remain sealed within the Central Archives.
                        </p>
                    </div>

                    <CTAButton canReset={canReset} onClick={handleHardReset} />
                </div>

                {/* ══ FOOTER ══ */}
                <div style={{ borderTop: `1px solid ${T.borderDim}`, padding: "20px 24px", position: "relative", zIndex: 10, marginTop: "30px" }}>
                    {/* ส่วนหัว: Metadata */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "16px", marginBottom: "12px", alignItems: "baseline" }}>
                        <p style={{ fontSize: "10px", color: T.muted, letterSpacing: "0.15em", textTransform: "uppercase", margin: 0, fontWeight: 600 }}>
                            CENTRAL 46 <span style={{ color: T.borderDim, margin: "0 4px" }}>·</span> ARCHIVAL DIVISION <br />SOUL SOCIETY
                        </p>
                        <p style={{ fontSize: "9px", color: T.borderDim, letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, fontFamily: "monospace" }}>
                            [ {`HASH: C46-83A91F72`} ]
                        </p>
                    </div>

                    {/* เส้นคั่นกลางแบบจางๆ เพิ่มความดิบแบบ UI ระบบคอมพิวเตอร์ */}
                    <div style={{ height: "1px", backgroundColor: T.borderDim, opacity: 0.2, marginBottom: "12px" }} />

                    {/* ส่วนท้าย: Security Notice */}
                    <p style={{ fontSize: "9px", color: T.muted, letterSpacing: "0.18em", textTransform: "uppercase", margin: 0, lineHeight: "1.6", opacity: 0.85 }}>
                        PROPERTY OF THE CENTRAL FORTY-SIX CHAMBERS<br />
                        <span style={{ color: "#ff4d4f", fontSize: "8.5px", letterSpacing: "0.22em" }}>UNAUTHORIZED ACCESS IS PROHIBITED</span>
                    </p>
                </div>

                <SecurityStrip bottom />
            </div>
        </div>
    );
}