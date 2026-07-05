// app/layout.tsx
import type { Metadata } from "next";
import '../src/styles/globals.css';
import { Cinzel } from "next/font/google";
import Footer from "@/src/shared/layout/Footer";
import { BleachReiatsuCursor } from "@/src/shared/ui/BleachReiatsuCursor";
import { WallpaperInitializer } from "@/src/shared/ui/WallpaperInitializer";
import { SenkaimonTransition } from "@/src/shared/ui/loader/SenkaimonTransition";
import { NavigationProvider } from "@/src/shared/ui/context/NavigationContext";
// 💡 นำเข้าตัว Ambient พรีเมียมตัวใหม่ที่เราเพิ่งสร้าง
import { ReiatsuAmbientSides } from "@/src/shared/layout/ReiatsuAmbientSides"; 

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
        {/* เลเยอร์ล่างสุด */}
        <div className="fixed inset-0 bleach-scanlines pointer-events-none z-[0] opacity-40" />

        <NavigationProvider>
          <SenkaimonTransition />
          <BleachReiatsuCursor />
          <WallpaperInitializer />

          {/* 🚪 เสียบเลเยอร์แรงดันวิญญาณด้านข้างตรงนี้ (z-[1]) */}
          <ReiatsuAmbientSides />

          <div className="bg-overlay flex flex-col min-h-screen relative z-10">
            <main className="flex-grow w-full relative">
              {children}
            </main>
            <Footer />
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}