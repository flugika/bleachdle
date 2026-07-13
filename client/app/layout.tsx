// app/layout.tsx
import type { Metadata } from "next";
import '../src/styles/globals.css';
import { Cinzel, Geist, Inter, JetBrains_Mono } from "next/font/google";
import Footer from "@/src/shared/ui/layout/Footer";
import { BleachReiatsuCursor } from "@/src/shared/ui/BleachReiatsuCursor";
import { WallpaperInitializer } from "@/src/shared/ui/WallpaperInitializer";
import { SenkaimonTransition } from "@/src/shared/ui/loader/SenkaimonTransition";
import { NavigationProvider } from "@/src/shared/ui/context/NavigationContext";
import { ReiatsuAmbientSides } from "@/src/shared/ui/layout/ReiatsuAmbientSides";
import { GlobalGameNav } from "@/src/shared/ui/layout/GlobalGameNav";

// Display: logotype, big titles, kanji accents — used sparingly, opt-in via
// font-[family-name:var(--font-display)]
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

// Body: the default for everything — paragraphs, descriptions, buttons
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

// Mono: labels, stats, timers, HUD-style tags — opt-in via
// font-[family-name:var(--font-mono)]
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export const metadata: Metadata = {
  title: "Bleachdle",
  description: "Anime guessing game (Bleach TYBW Cour 3)",
  metadataBase: new URL("https://bleachdle.app"),
  openGraph: {
    title: "Bleachdle",
    description: "Guess Bleach daily",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${cinzel.variable} ${inter.variable} ${mono.variable} ${geist.variable} font-[family-name:var(--font-body)] text-white antialiased relative`}
      >
        <div className="fixed inset-0 bleach-scanlines pointer-events-none z-[0] opacity-40" />

        <NavigationProvider>
          <SenkaimonTransition />
          <BleachReiatsuCursor />
          <WallpaperInitializer />
          <ReiatsuAmbientSides />
          <GlobalGameNav />

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