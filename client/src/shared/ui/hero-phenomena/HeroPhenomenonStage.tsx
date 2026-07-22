"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useDailyPhenomenon } from "./useDailyPhenomenon";
import { PHENOMENON_LABELS, PHENOMENON_ENTRANCE_MS, type PhenomenonKey, type PhenomenonPhase } from "./constants";
import { Garganta } from "./phenomena/Garganta";
import { Almighty } from "./phenomena/Almighty";
import { Kurohitsugi } from "./phenomena/Kurohitsugi";
import { ZeroDivision } from "./phenomena/ZeroDivision";

const RENDERERS: Record<PhenomenonKey, ComponentType<{ phase: PhenomenonPhase }>> = {
    garganta: Garganta,
    almighty: Almighty,
    kurohitsugi: Kurohitsugi,
    zerodivision: ZeroDivision,
};

export interface HeroPhenomenonStageProps {
    dateKey?: string;
    /**
     * NOT used in production right now — the live daily pick always comes
     * from useDailyPhenomenon's deterministic no-repeat rotation. Kept so we
     * can force/preview a specific phenomenon while building and QA-ing NEW
     * hero phenomena before they join the rotation. Do not wire this into
     * any production call site (HomePageClient etc.) — dev/QA only.
     */
    overridePhenomenon?: PhenomenonKey;
    /**
     * Externally-owned timeline (from a parent's own usePhenomenonState call).
     * Pass these when a sibling component (e.g. HeroDailyCTA) needs to sync
     * its own reveal choreography to the SAME entrance/idle clock as the
     * background phenomenon — otherwise every consumer starts its own
     * setTimeout at its own mount tick and they drift apart.
     */
    phenomenon?: PhenomenonKey;
    phase?: PhenomenonPhase;
}

/**
 * Shared Hook สำหรับดึง State ปรากฏการณ์ปัจจุบันไปใช้ร่วมกับ Component อื่นๆ
 * (เช่น นำไปใช้คู่กับ GargantaContentMask ในหน้าปุ่มกด HeroDailyCTA)
 *
 * `overridePhenomenon` มีไว้เพื่อ dev/QA เท่านั้น (เช่น hardcode ทดสอบ
 * phenomenon ใหม่ก่อนปล่อยเข้า rotation จริง) — production call sites
 * ไม่ควร pass ค่านี้เลย ปล่อยให้ useDailyPhenomenon เป็นแหล่งความจริงเดียว
 * ของ "วันนี้คือปรากฏการณ์ไหน" (deterministic, no-repeat)
 */
export function usePhenomenonState(dateKey?: string, overridePhenomenon?: PhenomenonKey, enabled: boolean = true) {
    const [phase, setPhase] = useState<PhenomenonPhase>("entrance");
    const dailyPhenomenon = useDailyPhenomenon(dateKey);
    const phenomenon = overridePhenomenon ?? dailyPhenomenon;

    useEffect(() => {
        if (!enabled) return; // parent owns the clock — don't run our own
        setPhase("entrance");
        const t = setTimeout(() => setPhase("idle"), PHENOMENON_ENTRANCE_MS);
        return () => clearTimeout(t);
    }, [phenomenon, dateKey, enabled]);

    return { phenomenon, phase };
}

/**
 * Main Stage Component
 */
export function HeroPhenomenonStage({ dateKey, overridePhenomenon, phenomenon: controlledPhenomenon, phase: controlledPhase }: HeroPhenomenonStageProps) {
    const [mounted, setMounted] = useState(false);
    const isControlled = controlledPhenomenon !== undefined;

    // Disabled entirely in controlled mode — no second clock, no possibility
    // of the internally-derived phenomenon ever disagreeing with the prop
    // and flipping Renderer's key mid-flight.
    const internalState = usePhenomenonState(dateKey, overridePhenomenon, !isControlled);
    const phenomenon = controlledPhenomenon ?? internalState.phenomenon;
    const phase = controlledPhase ?? internalState.phase;

    useEffect(() => {
        setMounted(true);
        const root = document.documentElement;
        const onVis = () => {
            root.style.setProperty("--bdph-play-state", document.hidden ? "paused" : "running");
        };
        document.addEventListener("visibilitychange", onVis);
        return () => document.removeEventListener("visibilitychange", onVis);
    }, []);

    if (!mounted) return null;

    const Renderer = RENDERERS[phenomenon];
    const label = PHENOMENON_LABELS[phenomenon];

    return (
        <>
            <div className="fixed inset-0 z-[8] pointer-events-none overflow-hidden">
                <Renderer key={phenomenon} phase={phase} />
            </div>
            <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center gap-2 text-[9px] font-mono tracking-[0.35em] text-white/50 pointer-events-none">
                <span className="w-4 h-px bg-white/40" />
                <span>{label.kanji} · {label.name}</span>
                <span className="w-4 h-px bg-white/40" />
            </div>
        </>
    );
}

export { PHENOMENON_ENTRANCE_MS } from "./constants";