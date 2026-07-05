# BLEACHDLE

> A Wordle-style character guessing game for Bleach fans — unlimited mode, attribute-based feedback, Soul Society aesthetic.

Lastest Updated: 5 July 2026, 0:17 AM.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)

---

## Overview

BLEACHDLE is a DLE-style character identification game scoped to the Bleach universe. Players guess characters based on shared attribute feedback — Race, Affiliation, Weapon type, first-appearance Chapter, and more — with color-coded clues narrowing down the answer each round.

The current release ships **Unlimited Mode**: randomly-selected characters with no daily lock, streak tracking, and session statistics. The architecture is structured to accommodate Daily Mode, Quote Mode, Image Mode, and Emoji Mode as future game verticals.

---

## Features

- **Attribute comparison engine** — multi-field diff with exact match, partial match, and directional hint (▲/▼) for numeric fields
- **Fuzzy search** — tolerant character name lookup, handles typos and alternate romanizations
- **Streak & session stats** — client-side state persistence across rounds within a session
- **Reiatsu cursor** — optional particle effect (Sode no Shirayuki ice-crystal trail) that follows the pointer; togglable
- **Zangetsu loader** — custom SVG/CSS animated loading screen, not a spinner
- **Feature flags** — `src/config/feature.flags.ts` gates unreleased game modes without code removal
- **Dark-first UI** — Soul Society-themed palette, 60fps-targeted animations, responsive layout

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | File-based routing under `app/(game)/` |
| Language | TypeScript 5 | Strict mode; entity schemas in `src/entities/` |
| Styling | Tailwind CSS 4 | Utility-first; custom tokens in globals |
| State | React Hooks | `useState`, `useEffect`, `useMemo` — no external store |
| Search | Custom fuzzy matcher | `src/lib/search/fuzzy.ts` |
| Game engine | Compare util | `src/lib/game-engine/compare.ts` |
| Package manager | pnpm (workspace) | `pnpm-workspace.yaml` at root |
| Deployment | Vercel | Zero-config, edge-ready |

---

## Getting Started

**Prerequisites:** Node.js ≥ 18, pnpm ≥ 9

```bash
# Clone
git clone <repo-url>
cd bleachdle/client

# Install
pnpm install

# Dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
# Production build
pnpm build
pnpm start

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint
```

---

## Game Logic

Each round selects a target character from `characters.json`. The player submits guesses by name; each guess returns a row of attribute cells with one of four states:

| Color | Meaning |
|---|---|
| 🟢 Green | Exact match |
| 🟡 Yellow | Partial match (e.g. shared affiliation faction) |
| 🔴 Red | No match |
| 🔵 Blue ▲ / ▼ | Numeric field — guess is lower (▲) or higher (▼) than target |

The comparison engine lives in `src/lib/game-engine/compare.ts` and is stateless — it takes a guess object and a target object and returns a result array. Game orchestration (round state, guess history, win/loss) is handled in `useCharacterGame.ts`.

---

## 🧠 Character Comparison Engine: Architectural & Technical Notes

This document details the architectural decisions and design patterns governing the Character Comparison Engine. These patterns ensure strict adherence to core game business rules while mitigating regressions and cross-domain side effects.

---

### 1. Separation of Concerns: Height vs. Age
In the legacy implementation, both **Height** and **Age** attributes routed through a generic `compareNumber` utility. This tight coupling introduced structural regressions because their underlying domain logics are fundamentally distinct. To enforce the **Single Responsibility Principle (SRP)**, we decoupled the logic into two domain-isolated functions:

* **Height Comparison (`compareHeight`):**
    * Dictated strictly by an **Exact Match (1:1)** evaluation matrix.
    * Independent of any range-bucketing or grouping logic.
    * If an exact match fails, it computes directional outcomes based on absolute values, returning Higher (`higher` / ▲) or Lower (`lower` / ▼) indicators.
* **Age Comparison (`compareAge`):**
    * Tailored to accommodate specialized game mechanics based on spiritual entities (Humans vs. Centenarian Shinigami/Hollows).
    * **Ages < 100 (Humans / Young Quincies):** Evaluated linearly to provide precise directional hints (`higher` or `lower`) for granular guessing.
    * **Ages 100+ (Captains / Espadas):** Categorized into discrete brackets via `getAgeRangeBlock` (e.g., `100-999` and `1000+`). If both the guessed character and target character fall within the identical bracket, the match is evaluated as **`correct` (Green)** per game design specifications.

---

### 2. Edge Case Handling: Unknown Data (`-1`)
Certain character metrics are canonically unverified or unspecified in the source material (e.g., Unohana's exact age or specific character heights). The system standardizes these missing metrics using `-1`.

To prevent `-1` from bleeding into downstream numerical computations—which would distort directional indicators (e.g., prompting a user to guess a higher value when the target is unknown)—we implement early-exit **Guard Clauses** at the absolute entry point of each comparison subroutine:

---

## Data

Character data is defined in `src/data/characters.json`. Each entry includes:

- `name` — canonical English romanization
- `gender`
- `race` — Shinigami / Hollow / Arrancar / Quincy / Human / etc.
- `affiliation` — primary organizational alignment
- `height_cm`
- `age`
- `eye_color`
- `hair_color`
- `first_appearance_chapter` — integer, used for directional hint
- `weapon` — Weaponized / Unarmed / Energy / etc.
- `release`  — State of release, Shikai / Bankai / Resurrection
- `primary_ability` — Combat utilities, Physical / Element / Kido / etc.
- `image`

To add a character: append an entry to `characters.json` and drop the corresponding `.webp` into `public/assets/characters/`. Run `src/lib/utils/scripts/check-assets.js` to validate name parity between the JSON and the asset directory.

---

## Feature Flags

Unreleased game modes are gated in `src/config/feature.flags.ts`:

```ts
export const FEATURE_FLAGS = {
  dailyMode: false,
  quoteMode: false,
  imageMode: false,
  emojiMode: false,
  songMode: false,
} as const;
```

Set a flag to `true` locally to develop a mode without affecting production.

---

## Roadmap

- [ ] Daily Mode — seeded character, shared results, no spoilers
- [ ] Quote Mode — identify a character from a dialogue excerpt  
- [ ] Image Mode — identify from a cropped/obscured artwork panel
- [ ] Emoji Mode — abstract visual puzzle
- [ ] Supabase integration — persistent leaderboard and cross-session streaks
- [ ] i18n — Thai / English toggle

---

## Contributing

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Follow the existing feature-slice structure under `src/features/`
3. Entities go in `src/entities/`, shared primitives in `src/shared/ui/`
4. Run `pnpm tsc --noEmit` and `pnpm lint` before opening a PR
5. Character assets must be `.webp`, named exactly as the JSON `name` field with underscores for spaces

---

## Credits

Built by [your name / team].  
Bleach and all related characters © Tite Kubo / Shueisha.  
This is a fan project — not affiliated with or endorsed by Shueisha, Viz Media, or TV Tokyo.

---

## Project Structure

```
bleachdle
├─ client
│  ├─ AGENTS.md
│  ├─ app
│  │  ├─ (game)
│  │  │  ├─ daily
│  │  │  │  ├─ character
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  └─ song
│  │  │  │     └─ page.tsx
│  │  │  └─ unlimited
│  │  │     ├─ character
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     ├─ quote
│  │  │     │  └─ page.tsx
│  │  │     └─ song
│  │  │        ├─ mockup
│  │  │        │  └─ page.tsx
│  │  │        └─ page.tsx
│  │  ├─ (home)
│  │  │  └─ page.tsx
│  │  ├─ api
│  │  │  ├─ stats
│  │  │  │  └─ finalize
│  │  │  │     └─ route.ts
│  │  │  └─ support
│  │  │     └─ route.ts
│  │  ├─ favicon.ico
│  │  ├─ layout.tsx
│  │  ├─ loading
│  │  │  └─ page.tsx
│  │  ├─ loading.tsx
│  │  ├─ support
│  │  │  └─ page.tsx
│  │  └─ [...catchAll]
│  │     └─ page.tsx
│  ├─ CLAUDE.md
│  ├─ eslint.config.mjs
│  ├─ next.config.ts
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ pnpm-workspace.yaml
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ assets
│  │  │  ├─ audio
│  │  │  │  └─ songs
│  │  │  │     ├─ 1106_tybw.mp3
│  │  │  │     ├─ after_dark.mp3
│  │  │  │     ├─ alones.mp3
│  │  │  │     └─ ...
│  │  │  ├─ bleachdle-avatar.psd
│  │  │  ├─ characters
│  │  │  │  ├─ Aaroniero_Arruruerie.webp
│  │  │  │  ├─ Abirama_Redder.webp
│  │  │  │  ├─ Aisslinger_Wernarr.webp
│  │  │  │  ├─ Akon.webp
│  │  │  │  └─ ...
│  │  │  ├─ emblems
│  │  │  │  ├─ arrancar.webp
│  │  │  │  ├─ daiko_shinigami.webp
│  │  │  │  ├─ mod_soul.webp
│  │  │  │  ├─ quincy.webp
│  │  │  │  ├─ shinigami.webp
│  │  │  │  ├─ soul.webp
│  │  │  │  ├─ visored.webp
│  │  │  │  └─ Xcution.webp
│  │  │  ├─ tensazangetsu.png
│  │  │  └─ wallpapers
│  │  │     ├─ bg_wallpaper_1.jpg
│  │  │     ├─ bg_wallpaper_2.jpg
│  │  │     ├─ bg_wallpaper_3.jpg
│  │  │     └─ ...
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ next.svg
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  ├─ README.md
│  ├─ src
│  │  ├─ config
│  │  │  ├─ daily-hub.config.ts
│  │  │  ├─ feature.flags.ts
│  │  │  └─ mode.ts
│  │  ├─ const
│  │  │  ├─ guess.ts
│  │  │  ├─ localStorage.ts
│  │  │  └─ summary.ts
│  │  ├─ data
│  │  │  ├─ characters.json
│  │  │  ├─ emojis.json
│  │  │  ├─ images.json
│  │  │  ├─ powers.json
│  │  │  ├─ quotes.json
│  │  │  ├─ songs.json
│  │  │  └─ wallpapers.json
│  │  ├─ entities
│  │  │  ├─ character
│  │  │  │  └─ schema.ts
│  │  │  ├─ emoji
│  │  │  ├─ image
│  │  │  ├─ quote
│  │  │  │  └─ schema.ts
│  │  │  └─ song
│  │  │     └─ schema.ts
│  │  ├─ features
│  │  │  ├─ character
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ DailyCharacterWrapper.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ CharacterGuessTable.tsx
│  │  │  │  │  │  ├─ CharacterSummaryGuess.tsx
│  │  │  │  │  │  └─ HowToPlayModal.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ Central46ConfidentialArchive.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useCharacterGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useCharacterGame.ts
│  │  │  │  ├─ index.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ emoji
│  │  │  ├─ image
│  │  │  ├─ quote
│  │  │  │  ├─ components
│  │  │  │  │  └─ shared
│  │  │  │  │     ├─ QuoteGuessTable.tsx
│  │  │  │  │     ├─ QuoteHowToPlayModal.tsx
│  │  │  │  │     └─ QuoteSummaryGuess.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useQuoteGame.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ song
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ DailySongWrapper.tsx
│  │  │  │  │  └─ shared
│  │  │  │  │     ├─ SongAudioPlayer.tsx
│  │  │  │  │     ├─ SongGuessTable.tsx
│  │  │  │  │     ├─ SongHowToPlayModal.tsx
│  │  │  │  │     ├─ SongSearchBar.tsx
│  │  │  │  │     └─ SongSummaryGuess.tsx
│  │  │  │  ├─ constants.ts
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useSongGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useSongGame.ts
│  │  │  │  └─ types.ts
│  │  │  └─ support
│  │  │     ├─ KidoSeal.tsx
│  │  │     ├─ PortfolioCard.tsx
│  │  │     ├─ SupportForm.tsx
│  │  │     └─ SupportPageClient.tsx
│  │  ├─ lib
│  │  │  ├─ game-engine
│  │  │  │  ├─ compareCharacter.ts
│  │  │  │  ├─ compareQuote.ts
│  │  │  │  └─ compareSong.ts
│  │  │  ├─ search
│  │  │  │  └─ fuzzy.ts
│  │  │  ├─ supabase
│  │  │  │  ├─ migrations
│  │  │  │  │  ├─ 0001_support_tickets.sql
│  │  │  │  │  ├─ 01_table.sql
│  │  │  │  │  ├─ 02_type.sql
│  │  │  │  │  ├─ 03_function.sql
│  │  │  │  │  └─ 04_cronjob.sql
│  │  │  │  ├─ seeds
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ seed-characters.js
│  │  │  │  │  │  └─ seed-songs.js
│  │  │  │  │  └─ trigger-schedule.js
│  │  │  │  └─ supabase.ts
│  │  │  ├─ support
│  │  │  │  └─ rateLimitCookie.ts
│  │  │  ├─ utils
│  │  │  │  ├─ absolutePathEntities.ts
│  │  │  │  ├─ character.ts
│  │  │  │  ├─ checking.ts
│  │  │  │  ├─ daily.ts
│  │  │  │  ├─ format.ts
│  │  │  │  ├─ quote.ts
│  │  │  │  ├─ scripts
│  │  │  │  │  ├─ check-assets.js
│  │  │  │  │  ├─ extract-character-meta.js
│  │  │  │  │  ├─ extract-character.js
│  │  │  │  │  └─ generate-wallpapers.js
│  │  │  │  ├─ song.ts
│  │  │  │  ├─ songSegment.ts
│  │  │  │  └─ ui.ts
│  │  │  └─ uuid.ts
│  │  ├─ services
│  │  │  ├─ character.ts
│  │  │  ├─ song.ts
│  │  │  └─ statsClient.ts
│  │  ├─ shared
│  │  │  ├─ hooks
│  │  │  │  ├─ useCooldown.ts
│  │  │  │  ├─ useCountdown.ts
│  │  │  │  ├─ useDailyHub.ts
│  │  │  │  ├─ useDailyWallpaper.ts
│  │  │  │  ├─ useTestWallpaper.ts
│  │  │  │  └─ WallpaperInitializer.tsx
│  │  │  ├─ layout
│  │  │  │  ├─ Divider.tsx
│  │  │  │  ├─ Footer.tsx
│  │  │  │  ├─ Header.tsx
│  │  │  │  ├─ HeaderDivider.tsx
│  │  │  │  ├─ ReiatsuAmbientSides.tsx
│  │  │  │  └─ SubHeader.tsx
│  │  │  └─ ui
│  │  │     ├─ BleachReiatsuCursor.tsx
│  │  │     ├─ button.tsx
│  │  │     ├─ context
│  │  │     │  └─ NavigationContext.tsx
│  │  │     ├─ control-panel
│  │  │     │  ├─ CharacterControlPanel.tsx
│  │  │     │  ├─ QuoteControlPanel.tsx
│  │  │     │  └─ SongControlPanel.tsx
│  │  │     ├─ daily-hub
│  │  │     │  ├─ DailyHubModalFooter.tsx
│  │  │     │  └─ DailyProgressBar.tsx
│  │  │     ├─ DailyResetTimer.tsx
│  │  │     ├─ game-selector
│  │  │     │  ├─ AllModesButton.tsx
│  │  │     │  ├─ AllModesModal.tsx
│  │  │     │  ├─ ModeBadge.tsx
│  │  │     │  ├─ ModeSelectorModal.tsx
│  │  │     │  └─ ThematicModeSelector.tsx
│  │  │     ├─ input.tsx
│  │  │     ├─ loader
│  │  │     │  ├─ SenkaimonTransition.tsx
│  │  │     │  ├─ SoulSyncLoader.tsx
│  │  │     │  └─ ZangetsuLoader.tsx
│  │  │     ├─ modal.tsx
│  │  │     ├─ Sealed.tsx
│  │  │     ├─ SearchBar.tsx
│  │  │     ├─ test.tsx
│  │  │     └─ tooltip.tsx
│  │  └─ styles
│  │     └─ globals.css
│  └─ tsconfig.json
└─ README.md

```