// src/shared/ui/hero-phenomena/PhenomenaStyles.tsx
// One <style> tag, injected once by HeroPhenomenonStage, shared by all four
// phenomena. Kept as a single block (rather than one per component) so the
// hero never pays for four separate stylesheet insertions when only one
// phenomenon ever renders at a time.

export function PhenomenaStyles() {
    return (
        <style>{`
/* ============================== GARGANTA ============================== */
/* ขั้นที่ 1: เส้นตัดมิติตอนแรก ขยายออกด้านข้างอย่างรวดเร็วและกระพริบถี่ๆ */
@keyframes bdph-garganta-glitchline {
  0% { transform: scaleX(0) translateY(-50%); opacity: 0; }
  10% { transform: scaleX(0.3) translateY(-50%); opacity: 1; }
  30% { transform: scaleX(0.8) translateY(-50%) skewX(-20deg); opacity: 0.5; }
  50% { transform: scaleX(1.05) translateY(-50%) skewX(10deg); opacity: 1; }
  90% { transform: scaleX(1) translateY(-50%); opacity: 1; }
  100% { transform: scaleX(1) translateY(-50%); opacity: 0; }
}

/* ขั้นที่ 2: แท่งมิติฉีกกระชากออกจากตรงกลาง แยกตัวออกแบบ Step-Function (ไม่สมูท) */
@keyframes bdph-garganta-strip-rip {
  0% { transform: translateY(-50%) scaleY(0.01); opacity: 0; filter: brightness(3); }
  15% { transform: translateY(-50%) scaleY(0.08); opacity: 1; filter: brightness(2); }
  40% { transform: translateY(-50%) scaleY(0.45); filter: brightness(1.5); }
  65% { transform: translateY(-50%) scaleY(1.08); filter: brightness(1); }
  85% { transform: translateY(-50%) scaleY(0.96); }
  100% { transform: translateY(-50%) scaleY(1); opacity: 1; }
}

/* ขั้นที่ 3: มิติต้องไม่นิ่ง! สั่นไหวแบบกึกๆ ตลอดเวลาเหมือนโดนแรงดันวิญญาณ (Reiatsu) กดทับ */
@keyframes bdph-garganta-jitter {
  0%, 100% { transform: translateY(-50%) scaleY(1) translateX(0px) rotate(0deg); }
  25% { transform: translateY(-50%) scaleY(1.01) translateX(1px) scaleX(0.99) rotate(0.2deg); }
  50% { transform: translateY(-50%) scaleY(0.99) translateX(-1px) rotate(-0.1deg); }
  75% { transform: translateY(-50%) scaleY(1.02) translateX(0.5px) scaleX(1.01) rotate(0.1deg); }
}

/* แสงออร่าสีม่วงตรงขอบรอยแยก กระพริบอย่างไม่มั่นคง (Unstable Spiritual Pressure) */
@keyframes bdph-garganta-glow-flicker {
  0%, 100% { opacity: 0.35; filter: drop-shadow(0 0 15px rgba(147,51,234,0.4)); }
  33% { opacity: 0.75; filter: drop-shadow(0 0 25px rgba(168,85,255,0.7)); }
  66% { opacity: 0.5; filter: drop-shadow(0 0 18px rgba(147,51,234,0.5)); }
}

/* อนุภาคอณูวิญญาณ (Reishi) ระเบิดพุ่งกระจายออกจากรอยแยก */
@keyframes bdph-garganta-leak {
  0% { transform: translate(0, 0) scale(1.5); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 0.4; }
  100% { transform: translate(var(--bdph-lx), var(--bdph-ly)) scale(0.2); opacity: 0; }
}

/* เส้นขนแตกละเอียด (Hairline Fringe) กระพริบไม่สม่ำเสมอ เหมือนเส้นถ่านที่ยังไม่นิ่ง */
@keyframes bdph-garganta-hair-flicker {
  0%, 100% { opacity: var(--bdph-hair-o, 0.2); transform: scaleY(1); }
  35% { opacity: calc(var(--bdph-hair-o, 0.2) * 1.6); transform: scaleY(1.03); }
  60% { opacity: calc(var(--bdph-hair-o, 0.2) * 0.5); transform: scaleY(0.98); }
  82% { opacity: calc(var(--bdph-hair-o, 0.2) * 1.3); transform: scaleY(1.015); }
}
`}</style>
    );
}