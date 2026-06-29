interface SubHeaderProps {
    title: string;
    description: string;
    className?: string;
}

export const SubHeader = ({ title, description, className = "mt-8 mb-6" }: SubHeaderProps) => {
    return (
        <div className={`flex flex-col items-center animate-in fade-in duration-700 ${className}`}>
            {/* Decorative Lines & Title */}
            <div className="flex items-center justify-center w-full gap-4 mb-2">
                {/* Left Line */}
                <div className="h-px w-12 bg-gradient-to-r from-transparent via-[#c8a96e]/40 to-[#c8a96e]/60" />

                <p className="text-[14px] tracking-[0.4em] text-[#c8a96e] font-bold uppercase drop-shadow-[0_0_8px_rgba(200,169,110,0.4)]"
                    style={{ fontFamily: "'Cinzel', serif" }}>
                    {title}
                </p>

                {/* Right Line */}
                <div className="h-px w-12 bg-gradient-to-l from-transparent via-[#c8a96e]/40 to-[#c8a96e]/60" />
            </div>

            {/* Subtitle / Status Code */}
            <div className="flex items-center gap-2">
                <span className="w-1 h-1 bg-[#c8a96e] rounded-full animate-pulse" />
                <p className="text-[10px] text-[#d1a9a9]/60 tracking-[0.3em] uppercase">
                    {description}
                </p>
                <span className="w-1 h-1 bg-[#c8a96e] rounded-full animate-pulse" />
            </div>
        </div>
    );
};