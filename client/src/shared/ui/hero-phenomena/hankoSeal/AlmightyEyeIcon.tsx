// src/shared/ui/hero-phenomena/hankoSeal/AlmightyEyeIcon.tsx
"use client";

export function AlmightyEyeIcon({ className = "w-10 h-10" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* 🔴 1. ม่านตาสีแดง Crimson Gradient ของจูฮาบัช */}
                <radialGradient id="yhwach-iris-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="55%" stopColor="#be123c" />
                    <stop offset="100%" stopColor="#4c0519" />
                </radialGradient>

                {/* ⚪ 2. เงาบนตาขาว (Sclera Shadow) */}
                <linearGradient id="sclera-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="35%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>

                {/* ✨ 3. ออร่าแรงดันวิญญาณ Quincy Aura */}
                <filter id="almighty-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* ✂️ Clip Path บังคับให้อยู่ในกรอบเบ้าตา */}
                <clipPath id="yhwach-eye-clip">
                    <path d="M 8,50 Q 50,22 92,50 Q 50,75 8,50 Z" />
                </clipPath>
            </defs>

            {/* 💥 1. ออร่าเรืองแสงขอบตานอก */}
            <path
                d="M 8,50 Q 50,22 92,50 Q 50,75 8,50 Z"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                opacity="0.6"
                filter="url(#almighty-glow)"
            />

            {/* 👁️ 2. ตาขาว + เงามืดจากขอบตาบน */}
            <path
                d="M 8,50 Q 50,22 92,50 Q 50,75 8,50 Z"
                fill="url(#sclera-shadow)"
                stroke="#1e293b"
                strokeWidth="1.5"
            />

            {/* 👁️ 3. ม่านตา 3 ดวง (3 Crimson Irises & Black Pupils) */}
            <g clipPath="url(#yhwach-eye-clip)">
                {/* ม่านตาบน-กลาง (Top Center Iris) */}
                <circle cx="50" cy="37" r="13" fill="url(#yhwach-iris-grad)" />
                <circle cx="50" cy="37" r="5" fill="#020617" />

                {/* ม่านตาล่าง-ซ้าย (Bottom Left Iris) */}
                <circle cx="31" cy="56" r="11.5" fill="url(#yhwach-iris-grad)" />
                <circle cx="31" cy="56" r="4.5" fill="#020617" />

                {/* ม่านตาล่าง-ขวา (Bottom Right Iris) */}
                <circle cx="69" cy="56" r="11.5" fill="url(#yhwach-iris-grad)" />
                <circle cx="69" cy="56" r="4.5" fill="#020617" />

                {/* เงาพาดทับครึ่งบนของลูกตา */}
                <path
                    d="M 8,50 Q 50,22 92,50 Q 50,33 8,50 Z"
                    fill="#0f172a"
                    opacity="0.4"
                />
            </g>

            {/* 🖊️ 4. เส้นขอบตาอนิเมะ & รอยพับเปลือกตา */}
            {/* เส้นเปลือกตาบน (หนา) */}
            <path
                d="M 6,50 Q 50,20 94,50"
                stroke="#020617"
                strokeWidth="3.5"
                strokeLinecap="round"
            />

            {/* เส้นชั้นตาบน (Double Eyelid Crease) */}
            <path
                d="M 22,30 Q 50,15 78,30"
                stroke="#020617"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.8"
            />

            {/* เส้นขอบตาล่าง */}
            <path
                d="M 12,52 Q 50,74 88,52"
                stroke="#020617"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}