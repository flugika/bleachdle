# BLEACHDLE

> A Wordle-style character guessing game for Bleach fans — unlimited mode, attribute-based feedback, Soul Society aesthetic.

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

## Data

Character data is defined in `src/data/characters.json`. Each entry includes:

- `name` — canonical English romanization
- `race` — Shinigami / Hollow / Arrancar / Quincy / Human / etc.
- `affiliation` — primary organizational alignment
- `weapon` — Zanpakuto, Vollständig, Quincy bow, etc.
- `firstAppearanceChapter` — integer, used for directional hint
- `gender`
- `status` — alive / deceased / unknown

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
│  │  │  └─ unlimited
│  │  │     ├─ character
│  │  │     │  └─ page.tsx
│  │  │     └─ page.tsx
│  │  ├─ (home)
│  │  │  └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  ├─ loading
│  │  │  └─ page.tsx
│  │  └─ src
│  │     ├─ config
│  │     │  ├─ daily.config.ts
│  │     │  ├─ env.ts
│  │     │  ├─ feature.flags.ts
│  │     │  └─ game.config.ts
│  │     ├─ data
│  │     │  ├─ characters.json
│  │     │  ├─ emojis.json
│  │     │  ├─ images.json
│  │     │  ├─ powers.json
│  │     │  ├─ quotes.json
│  │     │  └─ songs.json
│  │     ├─ entities
│  │     │  ├─ character
│  │     │  │  └─ schema.ts
│  │     │  ├─ emoji
│  │     │  ├─ image
│  │     │  ├─ quote
│  │     │  └─ song
│  │     ├─ features
│  │     │  ├─ character
│  │     │  │  ├─ components
│  │     │  │  │  ├─ GameOverModal.tsx
│  │     │  │  │  ├─ GuessTable.tsx
│  │     │  │  │  ├─ HowToPlayModal.tsx
│  │     │  │  │  └─ SearchBar.tsx
│  │     │  │  ├─ hooks
│  │     │  │  │  └─ useCharacterGame.ts
│  │     │  │  ├─ index.ts
│  │     │  │  └─ types.ts
│  │     │  ├─ daily
│  │     │  ├─ emoji
│  │     │  ├─ image
│  │     │  ├─ quote
│  │     │  ├─ song
│  │     │  └─ unlimited
│  │     ├─ lib
│  │     │  ├─ game-engine
│  │     │  │  └─ compare.ts
│  │     │  ├─ search
│  │     │  │  └─ fuzzy.ts
│  │     │  ├─ supabase
│  │     │  ├─ utils
│  │     │  │  ├─ character.ts
│  │     │  │  ├─ checking.ts
│  │     │  │  ├─ format.ts
│  │     │  │  └─ scripts
│  │     │  │     ├─ check-assets.js
│  │     │  │     ├─ extract-character-meta.js
│  │     │  │     └─ extract-character.js
│  │     │  └─ uuid.ts
│  │     └─ shared
│  │        ├─ constants
│  │        ├─ hooks
│  │        ├─ layout
│  │        │  └─ Footer.tsx
│  │        ├─ styles
│  │        └─ ui
│  │           ├─ BleachReiatsuCursor.tsx
│  │           ├─ button.tsx
│  │           ├─ input.tsx
│  │           ├─ loader
│  │           │  ├─ TensaZangetsu.css
│  │           │  └─ ZangetsuLoader.tsx
│  │           ├─ modal.tsx
│  │           └─ tooltip.tsx
│  ├─ CLAUDE.md
│  ├─ eslint.config.mjs
│  ├─ next.config.ts
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ pnpm-workspace.yaml
│  ├─ postcss.config.mjs
│  ├─ public
│  │  ├─ assets
│  │  │  ├─ bg_wallpaper.jpg
│  │  │  ├─ bleachdle-avatar.psd
│  │  │  ├─ characters
│  │  │  │  ├─ Aaroniero_Arruruerie.webp
│  │  │  │  ├─ Abirama_Redder.webp
│  │  │  │  ├─ Aisslinger_Wernarr.webp
│  │  │  │  ├─ Akon.webp
|  |  |  |  └─ ...
│  │  │  └─ tensazangetsu.png
│  │  ├─ file.svg
│  │  ├─ globe.svg
│  │  ├─ next.svg
│  │  ├─ tensa_zangetsu_manji_v3.html
│  │  ├─ vercel.svg
│  │  └─ window.svg
│  ├─ README.md
│  └─ tsconfig.json
└─ README.md

```