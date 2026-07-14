"use client";

import React, { useEffect, useRef } from 'react';
import { Z } from '@/src/config/zIndex';

const PARTICLE_LIFESPAN = 30;

// 🆕 กำหนด type ของอนุภาคแทน any[] — ตรงกับ shape ที่ push เข้าไปจริงใน createParticle
interface ReiatsuParticle {
    el: HTMLDivElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
}

export const BleachReiatsuCursor: React.FC = () => {
    const particles = useRef<ReiatsuParticle[]>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            for (let i = 0; i < 3; i++) {
                createParticle(e.clientX, e.clientY);
            }
        };

        const createParticle = (x: number, y: number) => {
            const particle = document.createElement('div');
            const size = Math.random() * 8 + 2;
            particle.className = "fixed pointer-events-none rounded-full blur-[4px]";
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.zIndex = String(Z.cursor);
            particle.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(186,230,253,0.8) 50%, rgba(56,189,248,0.3) 100%)';
            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;

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

        // 🩹 capture ref เป็นตัวแปร local ก่อน เพราะตอน cleanup รันจริง
        // particles.current อาจเปลี่ยนไปแล้ว (เป็น array คนละตัว/อ้างอิงคนละอัน)
        const particlesEl = particles.current;

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            particlesEl.forEach(p => p.el.remove());
        };
    }, []);

    return null;
};