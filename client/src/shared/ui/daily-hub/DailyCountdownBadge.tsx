import { useCountdown } from "@/src/shared/hooks/useCountdown";
import { DIMENSION_ACCENT } from "@/src/config/mode";

const daily = DIMENSION_ACCENT.daily;

// 🚨 Progressive urgency tiers instead of a single binary switch.
// "calm" → far from reset, reads in normal daily accent color.
// "warn" → under 2h left, amber shift, slightly faster pulse.
// "critical" → under 30m left, red + flicker, reads as reiatsu destabilizing.
type UrgencyTier = "calm" | "warn" | "critical";

function getUrgencyTier(hours: number, minutes: number): UrgencyTier {
    if (hours === 0 && minutes < 30) return "critical";
    if (hours < 2) return "warn";
    return "calm";
}

const TIER_STYLE: Record<UrgencyTier, { text: string; dot: string; glow: string }> = {
    calm: { text: `${daily.bright}cc`, dot: daily.base, glow: daily.glow },
    warn: { text: "#e8b25a", dot: "#e8b25a", glow: "rgba(232,178,90,0.45)" },
    critical: { text: "#f36b57", dot: "#f36b57", glow: "rgba(243,107,87,0.6)" },
};

/**
 * Renders inline inside the hero "console" panel — no border/background of its own,
 * so it sits flush as one row alongside the secondary CTA rather than as a separate
 * floating pill. Urgency now escalates in three tiers (calm → warn → critical) so the
 * shift feels like draining reiatsu rather than a single alarm flipping on.
 */
export function DailyCountdownBadge() {
    const { hours, minutes, seconds } = useCountdown();
    const tier = getUrgencyTier(hours, minutes);
    const style = TIER_STYLE[tier];
    const isCritical = tier === "critical";

    return (
        <span
            className={`inline-flex flex-col items-center gap-1.5 font-mono transition-colors duration-700 ${isCritical ? "bd-countdown-flicker" : ""
                }`}
            style={{ color: style.text }}
        >
            {/* Label row — small and secondary, sits ABOVE the digits so the
                numbers themselves (the thing that actually matters) can be
                the largest, most dominant element in this row. */}
            <span className="inline-flex items-center gap-2">
                <span
                    className={`w-1.5 h-1.5 rounded-full ${isCritical ? "animate-ping" : "animate-pulse"}`}
                    style={{ backgroundColor: style.dot, boxShadow: `0 0 6px ${style.glow}` }}
                />
                <span className="opacity-60 not-italic text-[10px] md:text-[11px] tracking-[0.3em] uppercase" aria-hidden="true">
                    {isCritical ? "封印解除" : "RESETS IN"}
                </span>
            </span>

            {/* Digits — the hero element of this row. Roughly 3x the previous
                size so it reads as the primary status signal, not a footnote. */}
            <span suppressHydrationWarning className={`inline-flex items-center gap-[2px] tabular-nums tracking-wider ${isCritical ? "animate-pulse" : ""}`}>
                {[
                    { value: hours, kanji: "時", unit: "H" },
                    { value: minutes, kanji: "分", unit: "M" },
                    { value: seconds, kanji: "秒", unit: "S" },
                ].map((segment, i) => (
                    <span key={segment.unit} className="inline-flex items-center">
                        {i > 0 && <span className="opacity-30 mx-1 text-2xl md:text-3xl font-light" aria-hidden="true">:</span>}
                        <span className="inline-flex flex-col items-center leading-none">
                            <span className="text-3xl sm:text-4xl font-bold tabular-nums" style={{ textShadow: `0 0 16px ${style.glow}` }}>
                                {String(segment.value).padStart(2, "0")}
                            </span>
                            <span className="flex items-center gap-1 mt-1">
                                <span className="opacity-45 text-[10px] font-normal not-italic" aria-hidden="true">{segment.kanji}</span>
                                <span className="opacity-70 text-[9px] tracking-normal font-semibold">{segment.unit}</span>
                            </span>
                        </span>
                    </span>
                ))}
            </span>
        </span>
    );
}