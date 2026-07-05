// src/shared/ui/daily-hub/DailyHubModalFooter.tsx
"use client";

import { Button } from '@/src/shared/ui/button';
import { useDailyHub } from '@/src/shared/hooks/useDailyHub';
import { useSenkaimon } from '@/src/shared/ui/context/NavigationContext';
import { DailyProgressBar } from './DailyProgressBar';

interface DailyHubModalFooterProps {
    /** id of the mode that was just completed (e.g. "character" / "song") */
    activeMode: string;
}

/**
 * 🧧 Placed directly below <XxxSummaryGuess /> only when mode === 'daily' (same conditional
 * pattern DailyResetTimer already uses inside the modal). Kept out of CharacterSummaryGuess/
 * SongSummaryGuess directly to minimize diff and merge-conflict risk with existing code.
 *
 * 🛡️ FIX: เดิมใช้ useRouter().push(nextMode.href) ตรงๆ ทำให้ข้าม Senkaimon transition
 * (closing → closed → opening) ไปเฉยๆ — สลับมาใช้ useSenkaimon().navigate() แทน ให้พฤติกรรม
 * เหมือนปุ่มเปลี่ยนมิติอื่นๆ ในแอปทุกจุด ไม่มี route ไหนหลุด animation ประตู
 */
export function DailyHubModalFooter({ activeMode }: DailyHubModalFooterProps) {
    const { isAllDone, nextMode } = useDailyHub();
    const { navigate } = useSenkaimon();

    return (
        <div className="relative w-full max-w-md mx-auto mt-3 p-5 border border-[#c8a96e]/20 bg-[#0a0a0c]/80 backdrop-blur-md overflow-hidden">
            {/* framed corner accents for a premium, "sealed scroll" feel consistent with the rest of the site */}
            <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#c8a96e]/40" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#c8a96e]/40" />
            <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#c8a96e]/40" />
            <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#c8a96e]/40" />

            <DailyProgressBar activeMode={activeMode} variant="compact" />

            <div className="mt-4">
                {isAllDone ? (
                    <Button variant="primary" className="w-full opacity-60 cursor-default" disabled>
                        All Missions Complete 卍
                    </Button>
                ) : nextMode ? (
                    <Button
                        variant="primary"
                        className="w-full hover:!bg-[#c8a96e] hover:!border-[#c8a96e]"
                        onClick={() => navigate(nextMode.href)}
                    >
                        {nextMode.icon} Continue: {nextMode.label.toUpperCase()}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}