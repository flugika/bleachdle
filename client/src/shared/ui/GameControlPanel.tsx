// src/shared/ui/GameControlPanel.tsx
import { SearchBar } from '@/src/shared/ui/SearchBar';
import { Character } from '@/src/entities/character/schema';

interface GameControlPanelProps {
    mode: 'daily' | 'unlimited'; // รับโหมดเพื่อเปลี่ยน Logic เล็กน้อย
    target: Character | null;
    characters: Character[];
    remainingGuesses?: number;
    stats: { currentStreak: number; maxStreak: number };
    timeLeft?: string; // ใส่เฉพาะโหมด daily
    game: any; // หรือระบุ interface ของ game object ให้ชัดเจน
    disabled?: boolean;
    maxGuesses?: number;
}

export function GameControlPanel({
    mode,
    target,
    characters,
    remainingGuesses,
    stats,
    timeLeft,
    game,
    disabled = false,
    maxGuesses
}: GameControlPanelProps) {
    let isLimitReached = false;
    if (mode === 'unlimited') {
        isLimitReached = maxGuesses !== undefined && remainingGuesses !== undefined && remainingGuesses >= maxGuesses;
    }

    return (
        <div className="flex flex-col items-center">
            {/* Search Section */}
            {target && (
                <div className="flex justify-center w-full mb-6">
                    <SearchBar
                        characters={characters}
                        disabled={disabled || isLimitReached || !target}
                        game={game}
                    />
                </div>
            )}

            {/* Stats Section */}
            <div className="flex justify-center gap-8 my-6 text-[11px] uppercase tracking-[0.2em] text-[#5a5a78]">
                {mode === 'daily' && timeLeft && (
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Next Reset</span>
                        <span className="text-[#4de880] text-lg font-bold font-mono">{timeLeft}</span>
                    </div>
                )}

                {mode === 'unlimited' && (
                    <div className="flex flex-col items-center">
                        <span className="text-[#d1a9a9]">Attempts Left</span>
                        <span className={`${remainingGuesses === 0 ? 'text-[#e83030]' : 'text-[#4de880]'} text-lg font-bold`}>
                            {remainingGuesses}
                        </span>
                    </div>
                )}

                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Current Streaks</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.currentStreak}</span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-[#d1a9a9]">Max Streaks</span>
                    <span className="text-[#c8a96e] text-lg font-bold">{stats.maxStreak}</span>
                </div>
            </div>
        </div>
    );
}