// app/layout.tsx
import type { Metadata } from "next";
import '../src/styles/globals.css';
import { Cinzel } from "next/font/google";
import Footer from "@/src/shared/layout/Footer";
import { BleachReiatsuCursor } from "@/src/shared/ui/BleachReiatsuCursor";
import { WallpaperInitializer } from "@/src/shared/hooks/WallpaperInitializer";
import { SenkaimonTransition } from "@/src/shared/ui/loader/SenkaimonTransition";
import { NavigationProvider } from "@/src/shared/ui/context/NavigationContext"; // นำเข้าตัวคุมทรานซิชัน

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Bleachdle",
  description: "Anime guessing game (Bleach TYBW Cour 3)",
  metadataBase: new URL("https://bleachdle.app"),
  openGraph: {
    title: "Bleachdle",
    description: "Guess Bleach characters daily",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${cinzel.className} text-white antialiased relative`}>
        {/* 1. ย้าย Scanlines มาไว้ตรงนี้ ให้เป็นเลเยอร์ที่อยู่ล่างสุดของทุกอย่าง */}
        <div className="fixed inset-0 bleach-scanlines pointer-events-none z-[0] opacity-40" />

        <NavigationProvider>
          <SenkaimonTransition />
          <BleachReiatsuCursor />
          <WallpaperInitializer />

          <div className="bg-overlay flex flex-col min-h-screen">
            {/* 2. ให้ main เป็น relative และกำหนด z-index ให้มันอยู่เหนือ scanlines */}
            <main className="flex-grow w-full relative z-10">
              {children}
            </main>
            <Footer />
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}