interface SubHeaderProps {
    title: string;
    subtitle: string;
    className?: string;
}

export const SubHeader = ({ title, subtitle, className = "my-2" }: SubHeaderProps) => {
    return (
        <div className={`flex flex-col items-center animate-in fade-in duration-700 pt-4 font-[family-name:var(--font-display)] ${className}`}>
            {/* Decorative Lines & Title */}
            <div className="flex items-center justify-center w-full gap-4 mb-2">
                {/* Left Line */}
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#c8a96e]/40 to-[#c8a96e]/60" />

                <p className="text-[16px] text-center tracking-[0.4em] text-[#c8a96e] font-bold uppercase drop-shadow-[0_0_10px_rgba(200,169,110,0.4)]"
                    style={{ fontFamily: "'Cinzel', serif" }}>
                    {title}
                </p>

                {/* Right Line */}
                <div className="h-px w-12 bg-gradient-to-l from-transparent via-[#c8a96e]/40 to-[#c8a96e]/60" />
            </div>

            {/* Subtitle / Status Code */}
            <div className="flex items-center gap-2 pointer-events-none">
                <span className="w-1 h-1 bg-[#c8a96e] rounded-full animate-pulse" />
                <p className="text-[12px] text-[#ebc7c7]/60 tracking-[0.3em] uppercase">
                    {subtitle}
                </p>
                <span className="w-1 h-1 bg-[#c8a96e] rounded-full animate-pulse" />
            </div>
        </div>
    );
};