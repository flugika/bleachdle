interface HeaderDividerProps {
    className?: string; // ไว้ใช้ปรับระยะห่างหรือ layout เพิ่มเติม
}

export const HeaderDivider = ({ className = "" }: HeaderDividerProps) => {
    return (
        <div className={`w-full flex items-center justify-center px-[5%] opacity-90 ${className}`}>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
            <div className="mx-8 relative flex items-center justify-center">
                <div className="w-6 h-6 border border-[#c8a96e] rotate-45 flex items-center justify-center shadow-[0_0_15px_rgba(200,169,110,0.3)] bg-black/20">
                    <div className="w-1.5 h-1.5 bg-[#c8a96e] rotate-0 shadow-[0_0_8px_#c8a96e]" />
                </div>
                <div className="absolute -left-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
                <div className="absolute -right-4 w-1.5 h-1.5 border border-[#c8a96e]/50 rotate-45" />
            </div>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#c8a96e]/60 to-[#c8a96e]/20" />
        </div>
    );
};