"use client";

import React, { useEffect, useRef } from 'react';

// ปรับค่าความฟุ้งของไอเย็น
const PARTICLE_LIFESPAN = 30; // ยิ่งมากยิ่งลอยนาน

export const BleachReiatsuCursor: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const particles = useRef<any[]>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // สร้างละอองน้ำแข็ง 2-3 จุดต่อการขยับเมาส์ 1 ครั้ง เพื่อความฟุ้ง
            for (let i = 0; i < 3; i++) {
                createParticle(e.clientX, e.clientY);
            }
        };

        const createParticle = (x: number, y: number) => {
            const particle = document.createElement('div');
            // สไตล์ละอองน้ำแข็ง (เล็ก-ใหญ่สลับกัน)
            const size = Math.random() * 8 + 2;
            particle.className = "fixed pointer-events-none rounded-full blur-[4px] z-[9999]";
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(186,230,253,0.8) 50%, rgba(56,189,248,0.3) 100%)';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

            // สุ่มทิศทางการกระจายตัว
            const vx = (Math.random() - 0.5) * 2;
            const vy = (Math.random() - 0.5) * 2;

            document.body.appendChild(particle);
            particles.current.push({ el: particle, x, y, vx, vy, life: PARTICLE_LIFESPAN });
        };

        const animate = () => {
            particles.current.forEach((p, index) => {
                p.life -= 1;
                p.x += p.vx;
                p.y += p.vy;
                p.el.style.left = `${p.x}px`;
                p.el.style.top = `${p.y}px`;
                p.el.style.opacity = `${p.life / PARTICLE_LIFESPAN}`;
                p.el.style.transform = `scale(${p.life / PARTICLE_LIFESPAN})`;

                if (p.life <= 0) {
                    p.el.remove();
                    particles.current.splice(index, 1);
                }
            });
            requestAnimationFrame(animate);
        };

        window.addEventListener('mousemove', handleMouseMove);
        requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            particles.current.forEach(p => p.el.remove());
        };
    }, []);

    return null;
};