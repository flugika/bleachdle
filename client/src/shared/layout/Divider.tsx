interface DividerProps {
    className?: string; // ไว้ใช้ปรับระยะห่างหรือ layout เพิ่มเติม
}

export const Divider = ({ className = "my-8" }: DividerProps) => {
    return (
        <div className={`flex items-center justify-center gap-4 w-full opacity-80 ${className}`}>
            {/* Left Gradient Line */}
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#c8a96e]/40 to-[#c8a96e]/10" />

            {/* Center Element */}
            <div className="flex items-center gap-3 text-[#c8a96e]">
                {/* Diamond accents */}
                <div className="w-1.5 h-1.5 rotate-45 border border-[#c8a96e]/50 bg-[#c8a96e]/20" />

                {/* The Symbol */}
                <span className="text-[16px] font-bold tracking-[0.2em] drop-shadow-[0_0_5px_rgba(200,169,110,0.5)]">
                    卍
                </span>

                <div className="w-1.5 h-1.5 rotate-45 border border-[#c8a96e]/50 bg-[#c8a96e]/20" />
            </div>

            {/* Right Gradient Line */}
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[#c8a96e]/40 to-[#c8a96e]/10" />
        </div>
    );
};