import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // 1. Header เดิมของคุณ (สำหรับไฟล์เสียง)
      {
        source: '/assets/audio/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // 2. เพิ่มอันนี้: เปิดสิทธิ์ CSP ทั่วทั้งเว็บ เพื่อรองรับ Cloudflare Turnstile
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;",
              "frame-src 'self' https://challenges.cloudflare.com;",
              "img-src 'self' data: https://challenges.cloudflare.com;",
              "style-src 'self' 'unsafe-inline';",
              // ปลดล็อก trusted-types ให้กว้างขึ้นเพื่อป้องกัน Extension แปลกๆ มาทำพัง
              "trusted-types * 'allow-duplicates';"
            ].join(' ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;