import React from 'react';

interface TooltipProps {
    children: React.ReactNode;
    content: string;
    className?: string; // สำหรับส่งคลาสกำหนดพิกัดภายนอก เช่น "absolute top-4 right-4"
}

export const Tooltip: React.FC<TooltipProps> = ({ children, content, className = "" }) => {
    // 🔮 เทคนิคพิเศษระดับ Senior: เช็คว่าภายนอกสั่งให้เป็น absolute หรือไม่ 
    // ถ้าภายนอกสั่ง absolute มาแล้ว เราจะไม่ใส่ relative ซ้ำ เพื่อป้องกันบั๊กปุ่มแหว่งหลุดขอบจอแบบคราวที่แล้ว!
    const hasAbsolute = className.includes('absolute');
    const containerClasses = `${hasAbsolute ? '' : 'relative inline-block'} group ${className}`.trim();

    return (
        <div className={containerClasses}>
            {/* Element หลักที่ต้องการให้ Hover (เช่น ปุ่ม หรือ ไอคอน) */}
            {children}

            {/* แผง HUD Tooltip จอวิเคราะห์แรงดันวิญญาณ */}
            <span className="font-[family-name:var(--font-display)] absolute top-full right-0 mt-2.5 translate-y-1 opacity-0 pointer-events-none scale-95 group-hover:translate-y-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 ease-out bg-[#0a0a0f] border border-[#c8a96e]/40 px-2.5 py-1 text-[11px] tracking-[0.15em] text-[#c8a96e] uppercase shadow-2xl whitespace-nowrap z-50">
                {content}
            </span>
        </div>
    );
};