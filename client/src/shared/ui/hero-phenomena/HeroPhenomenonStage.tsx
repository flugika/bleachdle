"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useDailyPhenomenon } from "./useDailyPhenomenon";
import { PHENOMENON_LABELS, PHENOMENON_ENTRANCE_MS, type PhenomenonKey, type PhenomenonPhase } from "./constants";
import { PhenomenaStyles } from "./PhenomenaStyles";
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
 * 1. ฟังก์ชันตัวช่วยสำหรับ Force ปรากฏการณ์ผ่าน URL (เช่น ?phenomenon=garganta)
 * ทำการ Export ออกไปเพื่อให้ Hook ตัวอื่นเรียกใช้ร่วมกันได้ ไร้ปัญหา Scope
 */
export function useForcedPhenomenon(): PhenomenonKey | undefined {
    const [forced, setForced] = useState<PhenomenonKey | undefined>(undefined);
    useEffect(() => {
        const param = new URLSearchParams(window.location.search).get("phenomenon");
        if (param && (Object.keys(PHENOMENON_LABELS) as PhenomenonKey[]).includes(param as PhenomenonKey)) {
            setForced(param as PhenomenonKey);
        }
    }, []);
    return forced;
}

/**
 * 2. Shared Hook สำหรับดึง State ปรากฏการณ์ปัจจุบันไปใช้ร่วมกับ Component อื่นๆ
 * (เช่น นำไปใช้คู่กับ GargantaContentMask ในหน้าปุ่มกด HeroDailyCTA)
 */
export function usePhenomenonState(dateKey?: string, overridePhenomenon?: PhenomenonKey, enabled: boolean = true) {
    const [phase, setPhase] = useState<PhenomenonPhase>("entrance");
    const dailyPhenomenon = useDailyPhenomenon(dateKey);
    const urlForced = useForcedPhenomenon();
    const phenomenon = overridePhenomenon ?? urlForced ?? dailyPhenomenon;

    useEffect(() => {
        if (!enabled) return; // parent owns the clock — don't run our own
        setPhase("entrance");
        const t = setTimeout(() => setPhase("idle"), PHENOMENON_ENTRANCE_MS);
        return () => clearTimeout(t);
    }, [phenomenon, dateKey, enabled]);

    return { phenomenon, phase };
}

/**
 * 3. Main Stage Component
 * ปรับปรุงใหม่ให้ดึง Logic มาจาก usePhenomenonState โดยตรง ไม่ซ้ำซ้อนกันแล้ว
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

    useEffect(() => { setMounted(true); }, []);
    if (!mounted) return null;

    const Renderer = RENDERERS[phenomenon];
    const label = PHENOMENON_LABELS[phenomenon];

    return (
        <>
            <PhenomenaStyles />
            <div className="fixed inset-0 z-[8] pointer-events-none overflow-hidden">
                <Renderer key={phenomenon} phase={phase} />
            </div>
            <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center gap-2 text-[9px] font-mono tracking-[0.35em] text-white/30 pointer-events-none">
                <span className="w-4 h-px bg-white/25" />
                <span>{label.kanji} · {label.name}</span>
                <span className="w-4 h-px bg-white/25" />
            </div>
        </>
    );
}

export { PHENOMENON_ENTRANCE_MS } from "./constants";