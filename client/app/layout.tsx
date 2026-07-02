// app/layout.tsx
import type { Metadata } from "next";
import '../src/styles/globals.css';
import { Cinzel } from "next/font/google";
import Footer from "@/src/shared/layout/Footer";
import { BleachReiatsuCursor } from "@/src/shared/ui/BleachReiatsuCursor";
import { WallpaperInitializer } from "@/src/shared/hooks/WallpaperInitializer";
import { SenkaimonTransition } from "@/src/shared/ui/SenkaimonTransition";
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
      <body className={`${cinzel.className} text-white antialiased`}>
        {/* 🛡️ เปิดมิติตัวคุมเนวิเกชันครอบคลุมทุกเลเยอร์ของ Layout */}
        <NavigationProvider>
          <SenkaimonTransition />
          <BleachReiatsuCursor />
          <WallpaperInitializer />
          {/* Overlay คุมความมืดเพื่อให้ Contrast ของตัวหนังสือชัดเจน */}
          <div className="bg-overlay flex flex-col min-h-screen">
            <main className="flex-grow w-full">
              {children}
            </main>
            <Footer />
          </div>
        </NavigationProvider>
      </body>
    </html>
  );
}