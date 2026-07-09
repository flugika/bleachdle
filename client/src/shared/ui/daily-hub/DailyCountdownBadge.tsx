import { useCountdown } from "@/src/shared/hooks/useCountdown";
import { DIMENSION_ACCENT } from "@/src/config/mode";

const daily = DIMENSION_ACCENT.daily;

/**
 * Renders inline inside the hero "console" panel — no border/background of its own,
 * so it sits flush as one row alongside the secondary CTA rather than as a separate
 * floating pill. Urgency uses a universal red warning, independent of the mode color
 * system (red always means "running out," regardless of which dimension you're in).
 */
export function DailyCountdownBadge() {
    const { hours, minutes, seconds } = useCountdown();
    const isUrgent = hours === 0 && minutes < 30; // 🚨 ปรับสีแดงเมื่อเหลือน้อยกว่า 30 นาที

    return (
        <span
            className={`inline-flex items-center gap-2 font-mono tabular-nums tracking-widest text-[12px] transition-colors duration-500 ${isUrgent ? "text-red-400" : ""
                }`}
            style={!isUrgent ? { color: `${daily.bright}cc` } : undefined}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full ${isUrgent ? "bg-red-400 animate-ping" : "animate-pulse"}`}
                style={!isUrgent ? { backgroundColor: daily.base, boxShadow: `0 0 6px ${daily.glow}` } : undefined}
            />
            <span suppressHydrationWarning className={isUrgent ? "animate-pulse" : ""}>
                RESETS IN {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
        </span>
    );
}