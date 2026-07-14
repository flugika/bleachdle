import React, { useEffect, useRef } from 'react';
// import './TensaZangetsu.css';

interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  decay: number;
  size: number;
  c: number[];
  trail: { x: number; y: number; l: number }[];
}

interface Burst {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  decay: number;
  size: number;
  c: number[];
}

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  c: number[];
  alpha: number;
  phase: number;
}

// โครงสร้างอนุภาคแรงดันวิญญาณขั้นสูง (Advanced Plasma Node Architecture)
interface ReiatsuDot {
  id: number;
  type: 'zangetsu-core' | 'adjacent-satellite' | 'outer-field';
  baseRadius: number;
  currentAngle: number;
  orbitSpeed: number;
  waveFreqRadius: number;
  waveFreqAngle: number;
  ampRadius: number;
  ampAngle: number;
  phaseOffset: number;
  size: number;
  colorMode: 'gold-electric' | 'pastel-spirit';
  baseColor: number[];
  targetColor: number[];
  colorProgress: number;
  trail: { x: number; y: number }[];
}

const ZangetsuLoader: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tsubaRef = useRef<HTMLDivElement>(null);

  const spdRef = useRef<number>(1);
  // 🌟 เพิ่ม Ref เพื่อแทร็กสถานะระดับแรงดันวิญญาณในปัจจุบัน
  const lvlRef = useRef<'low' | 'medium' | 'high'>('medium');
  const lastBurstRef = useRef<number>(0);

  useEffect(() => {
    const CV = canvasRef.current;
    if (!CV) return;

    const ctx = CV.getContext('2d');
    if (!ctx) return;

    const CX = 180;
    const CY = 180;

    const PAL = [
      [105, 135, 235], // ฟ้านวล
      [155, 105, 235], // ม่วงพาสเทล
      [95, 205, 175],  // เขียวมิ้นต์หม่น
      [235, 145, 105], // ส้มพีชซอฟต์
      [215, 105, 145], // ชมพูหม่นเท่ๆ
      [125, 185, 215]  // ฟ้าน้ำทะเลนุ่ม
    ];

    const GOLD_CORE = [200, 169, 110]; // เฉดสีทองคำดั้งเดิมของ Tensa Zangetsu

    function lerpColor(c1: number[], c2: number[], p: number): number[] {
      return [
        c1[0] + (c2[0] - c1[0]) * p,
        c1[1] + (c2[1] - c1[1]) * p,
        c1[2] + (c2[2] - c1[2]) * p
      ];
    }

    const particles: Particle[] = [];
    function mkP(): Particle {
      const a = Math.random() * Math.PI * 2;
      const r = 48 + Math.random() * 35;
      const c = PAL[Math.floor(Math.random() * PAL.length)];
      return {
        x: CX + Math.cos(a) * r,
        y: CY + Math.sin(a) * r,
        dx: Math.cos(a) * (0.5 + Math.random() * 1.3),
        dy: Math.sin(a) * (0.5 + Math.random() * 1.3),
        life: Math.random(),
        decay: 0.007 + Math.random() * 0.018,
        size: 1.2 + Math.random() * 2.2,
        c,
        trail: []
      };
    }
    for (let i = 0; i < 32; i++) particles.push(mkP());

    const bursts: Burst[] = [];
    function mkB(): Burst {
      const a = Math.random() * Math.PI * 2;
      const c = PAL[Math.floor(Math.random() * PAL.length)];
      return {
        x: CX,
        y: CY,
        dx: Math.cos(a) * (2.5 + Math.random() * 3.5),
        dy: Math.sin(a) * (2.5 + Math.random() * 3.5),
        life: 1,
        decay: 0.025 + Math.random() * 0.04,
        size: 1.5 + Math.random() * 3,
        c
      };
    }

    const orbs: Orb[] = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 80 + Math.random() * 60;
      const c = PAL[Math.floor(Math.random() * PAL.length)];
      orbs.push({
        x: CX + Math.cos(a) * r,
        y: CY + Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 14 + Math.random() * 18,
        c,
        alpha: 0.3 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2
      });
    }

    // ===================================================
    // 🧬 DYNAMIC GENERATE REIATSUDOTS MATRIX
    // ===================================================
    const reiatsuDots: ReiatsuDot[] = [];
    let idTracker = 0;
    let activeLvl = lvlRef.current;

    // ฟังก์ชันสำหรับสร้างจุดตามระดับความรุนแรงของแรงดันวิญญาณ
    function generateReiatsuDots(lvl: 'low' | 'medium' | 'high') {
      reiatsuDots.length = 0; // ล้างข้อมูลจุดเดิมออกทั้งหมด
      idTracker = 0;

      // ปรับแต่งจำนวนจุดตามความเหมาะสมของคำ (Low = จางๆ, Medium = ปกติ, High = เต็มพิกัด)
      const dotConfig = {
        low: { satelliteCount: 0, outerCount: 6 },
        medium: { satelliteCount: 2, outerCount: 15 },
        high: { satelliteCount: 4, outerCount: 35 }
      }[lvl];

      const zangetsuBaseAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

      zangetsuBaseAngles.forEach((targetAngle, index) => {
        // 1. จุดประดับแฉกดาบหลัก (มีครบทั้ง 4 ทิศทุกระดับเพื่อคงโครงสร้างรูปทรงใบดาบไว้)
        reiatsuDots.push({
          id: idTracker++,
          type: 'zangetsu-core',
          baseRadius: 55,
          currentAngle: targetAngle,
          orbitSpeed: 0.01 + (index * 0.002),
          waveFreqRadius: 12.5 + index * 1.8,
          waveFreqAngle: 14.2 + index * 1.1,
          ampRadius: 4.0,
          ampAngle: 0.03,
          phaseOffset: Math.random() * 50,
          size: 2.2,
          colorMode: 'gold-electric',
          baseColor: GOLD_CORE,
          targetColor: GOLD_CORE,
          colorProgress: 0,
          trail: []
        });

        // 2. จุดบริวารรอบแฉกดาบ (Adjacent Satellites)
        for (let j = 0; j < dotConfig.satelliteCount; j++) {
          reiatsuDots.push({
            id: idTracker++,
            type: 'adjacent-satellite',
            baseRadius: 58 + Math.random() * 12,
            currentAngle: targetAngle + (Math.random() - 0.5) * 0.3,
            orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (0.014 + Math.random() * 0.012),
            waveFreqRadius: 5.3 + Math.random() * 3.5,
            waveFreqAngle: 6.1 + Math.random() * 2.8,
            ampRadius: 10.0,
            ampAngle: 0.14,
            phaseOffset: Math.random() * 150,
            size: 2.8 + Math.random() * 1.0,
            colorMode: 'pastel-spirit',
            baseColor: PAL[Math.floor(Math.random() * PAL.length)],
            targetColor: PAL[Math.floor(Math.random() * PAL.length)],
            colorProgress: Math.random(),
            trail: []
          });
        }
      });

      // 3. จุดอิสระวงนอกกระจายตัว (Outer Field)
      for (let i = 0; i < dotConfig.outerCount; i++) {
        reiatsuDots.push({
          id: idTracker++,
          type: 'outer-field',
          baseRadius: 105 + (i % 3) * 25 + Math.random() * 12,
          currentAngle: Math.random() * Math.PI * 2,
          orbitSpeed: (i % 2 === 0 ? 1 : -1) * (0.003 + Math.random() * 0.007),
          waveFreqRadius: 2.2 + Math.random() * 2.0,
          waveFreqAngle: 2.8 + Math.random() * 1.5,
          ampRadius: 18 + Math.random() * 14,
          ampAngle: 0.22,
          phaseOffset: Math.random() * 300,
          size: 3.0 + Math.random() * 2.5,
          colorMode: 'pastel-spirit',
          baseColor: PAL[Math.floor(Math.random() * PAL.length)],
          targetColor: PAL[Math.floor(Math.random() * PAL.length)],
          colorProgress: Math.random(),
          trail: []
        });
      }
    }

    // เรียกใช้งานครั้งแรกตอนโหลด Component
    generateReiatsuDots(activeLvl);


    // ===================================================
    // ⚙️ ENGINE TIMELINE MANAGEMENT (ENGINE CORE)
    // ===================================================
    let imageRotationAngle = 0;
    let auraPhase = 0;
    let auraColorProgress = 0;
    let auraIdx = 0;
    let nextAuraIdx = 1;
    let animationFrameId: number;

    function frame(ts: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, 400, 400);

      const currentSpd = spdRef.current;
      const currentLvl = lvlRef.current;

      // 🌟 ตรวจสอบว่าผู้ใช้กดเปลี่ยนระดับแรงดันวิญญาณหรือไม่? ถ้าใช่ให้ Regenerate จุดใหม่ทันทีแบบเรียลไทม์
      if (currentLvl !== activeLvl) {
        generateReiatsuDots(currentLvl);
        activeLvl = currentLvl;
      }

      imageRotationAngle += 0.0022 * currentSpd;
      if (tsubaRef.current) {
        tsubaRef.current.style.transform = `rotate(${imageRotationAngle * (180 / Math.PI)}deg)`;
      }

      auraPhase += 0.0035 * currentSpd;
      auraColorProgress += 0.0015 * currentSpd;

      if (auraColorProgress >= 1) {
        auraColorProgress = 0;
        auraIdx = nextAuraIdx;
        nextAuraIdx = (nextAuraIdx + 1) % PAL.length;
      }

      const curAuraColor = lerpColor(PAL[auraIdx], PAL[nextAuraIdx], auraColorProgress);
      const pulseScale = 1.0 + Math.sin(auraPhase) * 0.02;
      const pulseAlpha = 0.08 + Math.sin(auraPhase * 1.0) * 0.01;

      const coreGlow = ctx.createRadialGradient(CX, CY, 10, CX, CY, 120 * pulseScale);
      coreGlow.addColorStop(0, `rgba(${curAuraColor[0]},${curAuraColor[1]},${curAuraColor[2]},${pulseAlpha})`);
      coreGlow.addColorStop(0.5, `rgba(${curAuraColor[0]},${curAuraColor[1]},${curAuraColor[2]},${pulseAlpha * 0.4})`);
      coreGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(CX, CY, 120 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = coreGlow;
      ctx.fill();

      if (tsubaRef.current) {
        const glowRadius = 13 + Math.sin(auraPhase) * 0.6;
        tsubaRef.current.style.filter = `
          drop-shadow(0 0 ${glowRadius}px rgba(${curAuraColor[0]},${curAuraColor[1]},${curAuraColor[2]},0.38)) 
          drop-shadow(0 0 ${glowRadius * 2.2}px rgba(${curAuraColor[0]},${curAuraColor[1]},${curAuraColor[2]},0.12))
        `.trim();
      }

      for (const o of orbs) {
        o.x += o.vx * currentSpd * 0.4;
        o.y += o.vy * currentSpd * 0.4;
        o.phase += 0.004 * currentSpd;

        const a = o.alpha * (0.5 + 0.5 * Math.sin(o.phase));
        const dx = o.x - CX;
        const dy = o.y - CY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 145) {
          o.vx *= -1;
          o.vy *= -1;
        }
        const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.size);
        g.addColorStop(0, `rgba(${o.c[0]},${o.c[1]},${o.c[2]},${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.size, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }

      // ===================================================
      // 🔮 ADVANCED MATHEMATICS MATRIX FOR REIATSUDOTS
      // ===================================================
      for (const dot of reiatsuDots) {
        dot.currentAngle += dot.orbitSpeed * currentSpd;
        const timeScalar = (ts * 0.001 * currentSpd) + dot.phaseOffset;

        const radiusNoise = Math.sin(timeScalar * dot.waveFreqRadius) * Math.cos(timeScalar * dot.waveFreqRadius * 0.45);
        const angleNoise = Math.cos(timeScalar * dot.waveFreqAngle) * Math.sin(timeScalar * dot.waveFreqAngle * 0.65);

        const calculatedRadius = dot.baseRadius + (radiusNoise * dot.ampRadius);
        let calculatedAngle = dot.currentAngle + (angleNoise * dot.ampAngle);

        if (dot.type === 'zangetsu-core') {
          calculatedAngle = imageRotationAngle + dot.currentAngle + (angleNoise * dot.ampAngle);
        }

        const dotX = CX + Math.cos(calculatedAngle) * calculatedRadius;
        const dotY = CY + Math.sin(calculatedAngle) * calculatedRadius;

        dot.trail.push({ x: dotX, y: dotY });
        if (dot.trail.length > 15) dot.trail.shift();

        let rgb = GOLD_CORE;
        if (dot.colorMode === 'pastel-spirit') {
          dot.colorProgress += 0.0035 * currentSpd;
          if (dot.colorProgress >= 1) {
            dot.colorProgress = 0;
            dot.baseColor = dot.targetColor;
            dot.targetColor = PAL[Math.floor(Math.random() * PAL.length)];
          }
          rgb = lerpColor(dot.baseColor, dot.targetColor, dot.colorProgress);
        }

        if (dot.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(dot.trail[0].x, dot.trail[0].y);
          for (let i = 1; i < dot.trail.length; i++) {
            ctx.lineTo(dot.trail[i].x, dot.trail[i].y);
          }
          ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.16)`;
          ctx.lineWidth = dot.size * 0.6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        const glowGrad = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dot.size * 4.2);
        glowGrad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.82)`);
        glowGrad.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.24)`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(dotX, dotY, dot.size * 4.2, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dotX, dotY, dot.size * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`;
        ctx.fill();
      }

      if (ts - lastBurstRef.current > 600 + Math.random() * 1000) {
        for (let i = 0; i < 10; i++) bursts.push(mkB());
        lastBurstRef.current = ts;
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.x += b.dx * currentSpd;
        b.y += b.dy * currentSpd;
        b.life -= b.decay * currentSpd;
        if (b.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size * b.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${b.c[0]},${b.c[1]},${b.c[2]},${b.life * 0.95})`;
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.trail.push({ x: p.x, y: p.y, l: Math.max(0, p.life) });
        if (p.trail.length > 10) p.trail.shift();

        p.x += p.dx * currentSpd;
        p.y += p.dy * currentSpd;
        p.life -= p.decay * currentSpd;

        for (let j = 0; j < p.trail.length; j++) {
          const tr = p.trail[j];
          const a = (j / p.trail.length) * tr.l * 0.45;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, p.size * (j / p.trail.length) * 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${Math.max(0, a)})`;
          ctx.fill();
        }

        const particleRadius = Math.max(0, p.size * p.life);
        if (particleRadius > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, particleRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${Math.max(0, p.life)})`;
          ctx.fill();
        }

        if (p.life <= 0) {
          particles[i] = mkP();
        }
      }

      if (Math.random() < 0.06) {
        const a = particles[Math.floor(Math.random() * particles.length)];
        const b = particles[Math.floor(Math.random() * particles.length)];
        if (a && b && a !== b) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          const mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * 40;
          const my = (a.y + b.y) / 2 + (Math.random() - 0.5) * 40;
          ctx.quadraticCurveTo(mx, my, b.x, b.y);
          ctx.strokeStyle = `rgba(${a.c[0]},${a.c[1]},${a.c[2]},0.3)`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(frame);
    }
    animationFrameId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ค้นหาฟังก์ชัน setLvl ในไฟล์ ZangetsuLoader.tsx แล้วแทนที่ด้วยโค้ดนี้:

  const setLvl = (lvl: 'low' | 'medium' | 'high', event: React.MouseEvent<HTMLButtonElement>) => {
    const buttons = event.currentTarget.parentElement?.querySelectorAll('.btn');
    buttons?.forEach(b => b.classList.remove('on'));
    event.currentTarget.classList.add('on');

    // กำหนดค่าความเร็ว และเวลาของ Pulse ให้สัมพันธ์กัน
    // (สูตร: ความเร็วเพิ่มขึ้น = เวลาแอนิเมชันและเวลาหน่วงลดลง)
    const configs = {
      low: { m: 0.4, dur: '7.5s', d2: '2.5s', d3: '5s' },      // ช้าลง (3s / 0.4 = 7.5s)
      medium: { m: 1, dur: '3s', d2: '1s', d3: '2s' },         // ความเร็วปกติ (3s)
      high: { m: 2.5, dur: '1.2s', d2: '0.4s', d3: '0.8s' }    // ไวขึ้นแบบบังไค (3s / 2.5 = 1.2s)
    };

    spdRef.current = configs[lvl].m;
    // 🌟 อัปเดตค่าไปยังระดับแรงดันวิญญาณล่าสุดเพื่อให้ Canvas ดึงไปคำนวณจำนวนจุดใหม่
    lvlRef.current = lvl;

    // 🔮 อัปเดต CSS Variables ไปยังตัวครอบชั้นนอกสุด เพื่อให้ CSS นำไปปรับความเร็วทันที
    const wrap = event.currentTarget.closest('.wrap') as HTMLElement;
    if (wrap) {
      wrap.style.setProperty('--pulse-duration', configs[lvl].dur);
      wrap.style.setProperty('--pulse-delay-2', configs[lvl].d2);
      wrap.style.setProperty('--pulse-delay-3', configs[lvl].d3);
    }
  };

  return (
    <div className="wrap">
      <div className="stage">
        <canvas ref={canvasRef} id="pcanvas" width="400" height="400"></canvas>

        <div className="smoke s1"></div>
        <div className="smoke s2"></div>
        <div className="smoke s3"></div>
        <div className="pulse p1"></div>
        <div className="pulse p2"></div>
        <div className="pulse p3"></div>

        <div className="chain cv" style={{ top: '310px' }}></div>
        <div className="chain cv2" style={{ bottom: '310px' }}></div>

        <div className="tsuba-wrap">
          <div className="tsuba-spin" ref={tsubaRef}>
            <svg width="112" height="112" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }} className='relative'>
              <image href="/assets/tensazangetsu.png" x="0" y="0" width="110" height="110" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '14px' }}>
        <div className="txt-main soul-txt">
          Analyzing Soul<span className="loading-dots"></span>
        </div>

        <div className="txt-sub bankai-txt">
          Bankai · Tensa Zangetsu
        </div>
      </div>

      <div>
        <div className="lbl" style={{ marginBottom: '10px' }}>Reiatsu Intensity</div>
        <div className="ctrl">
          <button className="btn" onClick={(e) => { setLvl('low', e); e.currentTarget.blur(); }}>Low</button>
          <button className="btn on" onClick={(e) => { setLvl('medium', e); e.currentTarget.blur(); }}>Shikai</button>
          <button className="btn" onClick={(e) => { setLvl('high', e); e.currentTarget.blur(); }}>Bankai</button>
        </div>
      </div>
    </div>
  );
};

export default ZangetsuLoader;