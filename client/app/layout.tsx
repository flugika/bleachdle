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
import { DeviceSyncProvider } from "@/src/shared/ui/layout/DeviceSyncProvider";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

// JSON-LD Structured Data ช่วยให้ Google เข้าใจว่าเป็นเกม และดึงแสดง Rich Snippets
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Bleachdle",
  "operatingSystem": "Any",
  "applicationCategory": "GameApplication",
  "genre": "Puzzle / Trivia",
  "url": "https://play-bleachdle.vercel.app",
  "description": "Daily Bleach character and lore deductive guessing game.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL("https://play-bleachdle.vercel.app"),

  title: {
    default: "Bleachdle",
    template: "%s | Bleachdle",
  },
  description:
    "Test your Soul Society knowledge in Bleachdle! A daily Bleach Wordle game where you guess characters, Zanpakuto, Bankai, and lore (TYBW Cour 4 updated). Play free now!",
  keywords: [
    "Bleachdle",
    "Bleach Wordle",
    "Bleach guessing game",
    "Bleach daily game",
    "Soul Society trivia",
    "TYBW Cour 4",
    "Zanpakuto quiz",
    "Bankai guesser",
    "Shinigami game",
    "Bleach anime game",
    "เกมทายตัวละครบลีช",
  ],
  authors: [
    { name: "fukusana.dev", url: "https://fukusanadev.vercel.app" },
    { name: "flugika", url: "https://github.com/flugika" },
  ],
  creator: "fukusana.dev",
  publisher: "fukusana.dev",

  alternates: {
    canonical: "/",
  },

  openGraph: {
    title: "Bleachdle - Daily Bleach Character & Lore Guessing Game",
    description:
      "Can you guess today's Shinigami? Test your Bleach lore knowledge in this daily Wordle-inspired game!",
    url: "https://play-bleachdle.vercel.app",
    siteName: "Bleachdle",
    locale: "en_US",
    type: "website",
    images: [
      {
        // อ้างอิง Path จากโฟลเดอร์ public/
        url: "/assets/screenshots/homepage_zerodivision.png",
        width: 1200,
        height: 630,
        alt: "Bleachdle Game Interface - Zero Division Theme",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Bleachdle - Daily Bleach Character Guessing Game",
    description: "Guess today's Bleach character! Fully updated with TYBW Cour 4 lore.",
    images: ["/assets/screenshots/homepage_zerodivision.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  verification: {
    google: "Vqtoe2DGfTlbjprbawP_D2w7iknfUoRb_0iSs82UXDU",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${cinzel.variable} ${inter.variable} ${mono.variable} ${geist.variable} font-[family-name:var(--font-body)] text-white antialiased relative`}
      >
        <div className="fixed inset-0 bleach-scanlines pointer-events-none z-[0] opacity-40" />

        <DeviceSyncProvider>
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
        </DeviceSyncProvider>
      </body>
    </html>
  );
}