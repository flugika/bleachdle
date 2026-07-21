"use client";

// src/shared/ui/hero-phenomena/phenomena/Almighty.tsx
//
// Thin adapter so AlmightyShadowEyes (a general-purpose, standalone canvas
// component) slots directly into HeroPhenomenonStage's
// `RENDERERS: Record<PhenomenonKey, ComponentType<{ phase: PhenomenonPhase }>>`
// registry, matching the calling convention of Garganta / Kurohitsugi /
// ZeroDivision: `<Renderer phase={phase} />`, nothing else.

import type { PhenomenonPhase } from "../constants";
import { AlmightyShadowEyes } from "./AlmightyShadowEyes";

export function Almighty({ phase }: { phase: PhenomenonPhase }) {
    return (
        <AlmightyShadowEyes
            className="absolute inset-0 w-full h-full -z-10 pointer-events-none"
            width="100%"
            height="100%"
            phase={phase}
            eyeCount={16}
            interactive
        />
    );
}

export default Almighty;