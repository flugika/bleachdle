# BLEACHDLE

> A Wordle-style character guessing game for Bleach fans — unlimited mode, attribute-based feedback, Soul Society aesthetic.

**Last Updated:** 22 July 2026, 9:49 PM.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black?logo=vercel)](https://vercel.com/)
[![Deployed on Supabase](https://img.shields.io/badge/Deployed-Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-bleachdle--theta.vercel.app-black?logo=vercel)](https://bleachdle-theta.vercel.app/)

## 🚀 Live Demo

**Production:** [https://bleachdle-theta.vercel.app/](https://bleachdle-theta.vercel.app/)

---

## 🏠 Home Page

Screenshots of the home page across different days, different themes:

| Theme | Preview |
|---|---|
| **Garganta** | <img width="450" alt="homepage_garganta" src="https://github.com/user-attachments/assets/e86c8e64-4ab5-45ac-8e3f-659ca7257939" /> |
| **Almighty** | <img width="450" alt="homepage_almighty" src="https://github.com/user-attachments/assets/8a4e8fbd-0713-486c-b8de-7ecaed469759" /> |
| **Kurohitsugi** | <img width="450" alt="homepage_kurohitsugi" src="https://github.com/user-attachments/assets/3165c406-70e4-4223-b267-c98bd5e9d46d" /> |
| **Zero Division** | <img width="450" alt="homepage_zerodivision" src="https://github.com/user-attachments/assets/7ec5afcc-17a5-4cb2-8f7b-e530a8a9e63b" /> |

<details>
<summary><strong>Standard (full page)</strong></summary>

<img width="900" alt="homepage" src="https://github.com/user-attachments/assets/dd871a29-b785-4d69-a690-606cc57bdc07" />

</details>

---

## Overview

BLEACHDLE is a DLE-style character identification game scoped to the Bleach universe. Each round selects a target character, and players narrow it down through attribute-based guesses — Race, Affiliation, Weapon type, first-appearance Chapter, and more — with color-coded feedback per field.

The game ships six verticals: **Character**, **Quote**, **Song**, **Silhouette**, **Emoji**, and **Release** (guess by release state — Shikai / Bankai / Resurrection). All six are complete and available in both **Daily** (one seeded round per day, shared across players) and **Unlimited** (random target, no daily lock, streak tracking) modes. Core gameplay is considered done — active work now is new modes, accounts/progression, and infra hardening (see [Roadmap](#roadmap)).

---

## Features

- **Attribute comparison engine** — one stateless compare module per vertical (`compareCharacter.ts`, `compareSong.ts`, `compareBinaryGuess.ts`): takes a guess and a target, returns a diffed result array. Height and Age are deliberately *not* routed through a shared numeric comparator — see [Comparison Engine notes](#-character-comparison-engine-architectural--technical-notes) below.
- **Fuzzy search** — typo- and alternate-romanization-tolerant name lookup for guesses (`src/lib/search/fuzzy.ts`)
- **Daily Hub** — one seeded round per day across all six verticals, shared across all players, with countdown-based reset (`DailyResetTimer`, `useCountdown`, `DailyProgressBar`)
- **Session & streak tracking** — client-side round state, finalized server-side via `app/api/stats/finalize`
- **Support ticket system** — `SupportForm` → `app/api/support`, persisted through Supabase (`0001_support_tickets.sql`), with IP-based rate limiting (`ipRateLimit.ts`, `rateLimitCookie.ts`). Cloudflare Turnstile is wired up (`useTurnstile.ts`) but currently **disabled** — it was misflagging legitimate traffic as bot activity; re-enabling it is tracked in the Roadmap.
- **Dynamic wallpaper rotation** — background swaps per session/day (`useDailyWallpaper`, `WallpaperInitializer`, `wallpapers.json`)
- **Race emblem indicator** — per-character race badge (Shinigami / Hollow / Arrancar / Quincy / Visored / Mod Soul) resolved via `useRaceEmblem` from `public/assets/emblems`
- **Custom transitions & loaders** — `ZangetsuLoader`, `SoulSyncLoader`, `SenkaimonTransition`; purpose-built animations instead of a generic spinner
- **Reiatsu cursor** — optional particle-trail cursor effect, togglable (`BleachReiatsuCursor.tsx`)
- **Feature flags** — `src/config/feature.flags.ts` gates verticals per mode (nested under `daily` / `unlimited`) so a mode can ship in Unlimited before Daily. All six verticals — Character, Quote, Song, Silhouette, Emoji, and Release — are now live in both modes.
- **Dark-first UI** — Soul Society-themed palette, responsive layout down to mobile

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
| Backend / DB | Supabase (Postgres) | `src/lib/supabase/`; seeded via `src/scripts/seeds/`, schema in `src/scripts/migrations/` |
| Package manager | pnpm (workspace) | `pnpm-workspace.yaml` at root |
| Deployment | Vercel + Supabase | App on Vercel, data/auth on Supabase |

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

To add a character: append an entry to `characters.json` and drop the corresponding `.webp` into `public/api/asset/character/`. Run `src/lib/utils/scripts/check-assets.js` to validate name parity between the JSON and the asset directory.

> **Note:** several planned modes below (Pair, Connection, First Name, Trait Group) need new data that doesn't exist on `characters.json` yet — see the **Data Model** section of the Roadmap.

---

## Feature Flags

Verticals are gated per mode in `src/config/feature.flags.ts`:

```ts
export const FEATURE_FLAGS = {
  daily: {
    character: true,
    quote: true,
    silhouette: true,
    emoji: true,
    song: true,
    release: true,
  },

  unlimited: {
    character: true,
    quote: true,
    silhouette: true,
    emoji: true,
    song: true,
    release: true,
  },

  mockup: {
    song: false,
    silhouette: false,
    release: false,
  },

  support: true,
} as const;
```

Flags are nested per mode rather than a flat list, since a vertical can ship in Unlimited before it ships in Daily — Silhouette, Emoji, and Release all followed that path before landing in Daily as well. All six verticals are now live in both modes — this part of the flag config is stable going forward; new entries will only be added for brand-new modes (see Roadmap). `mockup.song` / `mockup.silhouette` / `mockup.release` gate the standalone design-preview routes under `app/mockup/` independently of the live game flags above — all three are currently off, so none of the `/mockup/*` preview routes are reachable. `support` toggles the support ticket page/API independently of any game vertical.

---

## Roadmap

> Testing (unit/integration/UAT) is intentionally deferred — data schemas (`characters.json`, entity types) are still changing frequently, so writing tests now would mean rewriting them constantly. Will pick up once the data layer stabilizes (post Supabase migration).

### Gameplay — core modes (done)
- [x] Silhouette Daily — bring Silhouette to Daily Hub
- [x] Emoji Mode — abstract visual puzzle, shipped in both Daily and Unlimited
- [x] Release Mode — guess by release state (Shikai / Bankai / Resurrection)
- [x] All six verticals (Character, Quote, Song, Silhouette, Emoji, Release) complete and live in both Daily and Unlimited

### Gameplay — new modes (planned)
- [ ] **Imposter** — 5 characters shown, 1 breaks the group's pattern (trait / race / appearance / power); player has to spot the odd one out
- [ ] **Pyramid** — order ~10 characters along an axis (e.g. power level); height and age are excluded as axes since canon data is too inconsistent for them. Mode itself may be skipped entirely unless Bleach actually has enough data to build a real pyramid ranking
- [ ] **Pair** — a flip-card / memory-matching game where cards aren't reused; the target relationship type (siblings, family, enemies, romantic, past opponents, shared trait, etc.) is shown to the player up front, and they match pairs of characters that fit that relationship — needs the new relationship table, see Data Model below
- [ ] **Connection** — 16 characters shown, 4 of them share a hidden boundary/relationship (trait, race, affiliation, etc.). Player picks 4 and submits; sees how many of the 4 were correct (e.g. "3 of 4 belong, 1 doesn't"), then re-picks to isolate the outlier — up to 5 guesses total
- [ ] **First Name** — simplest new mode, Wordle-style guessing on a character's first name only, with the classic gray/yellow/green letter feedback. Needs a new `first_name` field split out from the existing full `name` field, otherwise no new data required
- [ ] **Trait Group** — system picks 3 characters at random and reveals what they share (trait / race / affiliation / friend group) but NOT who they are — player must guess the identities of those 3 hidden characters themselves (not guess additional members of the group); countdown-based
- [ ] **Higher/Lower** — one character card shows a revealed "power level," the other is hidden; guess higher or lower than the revealed card. Blocked on defining a power-ranking methodology — win rate alone isn't sufficient, multiple factors need to be weighed

### Data Model (new, supports the modes above)
- [ ] **Character relationship / boundary table** — stores how one character relates to another. Rough shape so far: `id`, `character_id`, `related_character_id`, `type` (e.g. friend / family / rival / same-trait). Still deciding what else needs to be captured — directional vs. bidirectional, a strength/weight field, free-text notes, whether one row can represent multiple shared boundaries at once, etc.
- [x] **Emoji list anti-peek** — the full emoji clue array currently ships to the client up front, so opening dev tools reveals every clue immediately. Plan is to send emojis one at a time as the round progresses instead of the whole array at once.

### Stats & Social
- [x] **Global daily stats** — "X% of players solved it within N guesses," aggregated via Supabase on top of existing round/result tables
- [x] **Surface badges on `/stats`** — badge system already exists but currently only renders inside each mode's summary card, not on the dedicated stats page
- [ ] **Shareable result as image** — still pending. Skip the Wordle/Worldle-style emoji-grid text share; generate a downloadable/story-ready image (canvas or server-side OG image) instead
- [ ] **Streak/session portability without login** — still pending. Current direction: generate a code on one device that can be entered on a second device to link/sync the streak data across them. This replaces the earlier same-network auto-detection idea, which had an unresolved collision problem on shared networks (family, roommates) where distinct players would merge onto one streak
- [ ] **Rate limiting on game APIs** (not just `/api/support`) — still pending. Direction: sliding-window or token-bucket limiter via Upstash Redis + `@upstash/ratelimit` at the edge/middleware level, keyed by IP + session id. Apply first to `app/api/stats/finalize` (highest abuse risk — fake streak submissions) and any future leaderboard-writing routes; generalize the existing `ipRateLimit.ts` / `rateLimitCookie.ts` pattern from the support ticket system into shared middleware

### Accounts & Progression (new)
- [ ] **Login** — account system, currently unauthenticated
- [ ] **Card pack rewards** — gacha-style random cosmetic character card drawn after each round, collected and displayed on the user's profile
- [ ] **User level** — XP/progression tied to playtime and rounds completed
- [ ] **Character card / archive detail view** — a fuller per-character info page. Hesitant here because it could let players look up dle answers directly, but still seems worth building — likely gated somehow (behind account/level, or hiding the specific fields used in comparisons) rather than dropped

### Reliability & Process
- [x] **Error monitoring (Sentry or similar)** — done — high priority precisely because there's no test coverage yet; needed visibility into prod failures before shipping faster
- [ ] **Real CI pipeline** — still pending. A CI file exists but currently only validates character data; needs lint + `tsc --noEmit` + build checks gating PRs
- [ ] **Reduced-motion setting** — still pending, lower priority; touches many components (loaders, transitions, cursor effect), needs a broader pass
- [x] **Testing suite** (unit + integration) — still pending, blocked on schema stabilization, see note above

### Infra
- [x] **Supabase migration** — still pending. Persistent leaderboard and cross-session streaks
- [ ] **Turnstile spam mitigation** — still paused. Legitimate traffic was being flagged as bot activity, needs a fix before re-enabling
- [ ] **PWA + push notifications** — still pending, and tied to the Discord bot notifications below — both are further out since they depend on renting a domain first
- [ ] **Discord integration** — bot-based notifications, blocked on renting a domain

---

## Contributing

1. Branch from `main`: `git checkout -b feat/your-feature`
2. Follow the existing feature-slice structure under `src/features/`
3. Entities go in `src/entities/`, shared primitives in `src/shared/ui/`
4. Run `pnpm tsc --noEmit` and `pnpm lint` before opening a PR
5. Character assets must be `.webp`, named exactly as the JSON `name` field with underscores for spaces

---

## Credits

Built by fukusana.dev team (solo developer/uxui/game designer)
Bleach and all related characters © Tite Kubo / Shueisha.
This is a fan project — not affiliated with or endorsed by Shueisha, Viz Media, or TV Tokyo.
This project is non-commercial: it is not monetized in any form (no ads, no paid tiers, no merchandising) and is made solely for entertainment and educational purposes by fans of the series. All rights to Bleach and its characters remain with their respective owners.

---

## Project Structure

```
bleachdle
├─ client
│  ├─ AGENTS.md
│  ├─ app
│  │  ├─ (admin)
│  │  │  └─ monitor
│  │  │     └─ page.tsx
│  │  ├─ (game)
│  │  │  ├─ daily
│  │  │  │  ├─ character
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ emoji
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ page.tsx
│  │  │  │  ├─ quote
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ release
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ silhouette
│  │  │  │  │  └─ page.tsx
│  │  │  │  └─ song
│  │  │  │     └─ page.tsx
│  │  │  └─ unlimited
│  │  │     ├─ character
│  │  │     │  └─ page.tsx
│  │  │     ├─ emoji
│  │  │     │  └─ page.tsx
│  │  │     ├─ page.tsx
│  │  │     ├─ quote
│  │  │     │  └─ page.tsx
│  │  │     ├─ release
│  │  │     │  └─ page.tsx
│  │  │     ├─ silhouette
│  │  │     │  └─ page.tsx
│  │  │     └─ song
│  │  │        └─ page.tsx
│  │  ├─ (home)
│  │  │  ├─ HomePageClient.tsx
│  │  │  └─ page.tsx
│  │  ├─ about
│  │  │  ├─ AboutPageClient.tsx
│  │  │  └─ page.tsx
│  │  ├─ api
│  │  │  ├─ asset
│  │  │  │  ├─ audio
│  │  │  │  │  └─ [...path]
│  │  │  │  │     ├─ route.test.ts
│  │  │  │  │     └─ route.ts
│  │  │  │  └─ [type]
│  │  │  │     └─ [id]
│  │  │  │        ├─ route.test.ts
│  │  │  │        └─ route.ts
│  │  │  ├─ monitor
│  │  │  │  ├─ feedback
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ health
│  │  │  │     ├─ route.test.ts
│  │  │  │     └─ route.ts
│  │  │  ├─ stats
│  │  │  │  ├─ daily
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ finalize
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ global
│  │  │  │     ├─ route.test.ts
│  │  │  │     └─ route.ts
│  │  │  └─ support
│  │  │     ├─ route.test.ts
│  │  │     └─ route.ts
│  │  ├─ favicon.ico
│  │  ├─ icon.svg
│  │  ├─ layout.tsx
│  │  ├─ loading
│  │  │  └─ page.tsx
│  │  ├─ loading.tsx
│  │  ├─ mockup
│  │  │  ├─ release
│  │  │  │  └─ page.tsx
│  │  │  ├─ silhouette
│  │  │  │  └─ page.tsx
│  │  │  └─ song
│  │  │     └─ page.tsx
│  │  ├─ not-found.tsx
│  │  ├─ soul-society-archives
│  │  │  └─ page.tsx
│  │  ├─ stats
│  │  │  └─ page.tsx
│  │  ├─ support
│  │  │  └─ page.tsx
│  │  └─ [...catchAll]
│  │     └─ page.tsx
│  ├─ assets-private
│  │  ├─ audio
│  │  │  ├─ releases
│  │  │  │  ├─ Bankai_Byakuya_Kuchiki.mp3
│  │  │  │  ├─ Bankai_Chojiro_Sasakibe.mp3
│  │  │  │  ├─ Bankai_Genryusai_Shigekuni_Yamamoto.mp3
│  │  │     └─ ...
│  │  ├─ characters
│  │  │  ├─ Aaroniero_Arruruerie.webp
│  │  │  ├─ Abirama_Redder.webp
│  │  │  ├─ Aisslinger_Wernarr.webp
│  │  │  ├─ Akon.webp
│  │  │  └─ ...
│  │  └─ character_silhouette
│  │     ├─ Aaroniero_Arruruerie_cutout_silhouette.webp
│  │     ├─ Abirama_Redder_cutout_silhouette.webp
│  │     ├─ Aisslinger_Wernarr_cutout_silhouette.webp
│  │     ├─ Akon_cutout_silhouette.webp
│  │     └─ ...
│  ├─ CLAUDE.md
│  ├─ eslint.config.mjs
│  ├─ next.config.ts
│  ├─ package.json
│  ├─ playwright-report
│  │  └─ index.html
│  ├─ playwright.config.ts
│  ├─ pnpm-lock.yaml
│  ├─ pnpm-workspace.yaml
│  ├─ postcss.config.mjs
│  ├─ proxy.ts
│  ├─ public
│  │  ├─ assets
│  │  │  ├─ bleachdle-avatar.psd
│  │  │  ├─ emblems
│  │  │  │  ├─ arrancar.webp
│  │  │  │  ├─ daiko_shinigami.webp
│  │  │  │  ├─ mod_soul.webp
│  │  │  │  ├─ quincy.webp
│  │  │  │  ├─ shinigami.webp
│  │  │  │  ├─ soul.webp
│  │  │  │  ├─ visored.webp
│  │  │  │  ├─ wandenreich.webp
│  │  │  │  └─ Xcution.webp
│  │  │  ├─ screenshots
│  │  │  │  ├─ homepage.png
│  │  │  │  └─ homepage_old.png
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
│  │  │  ├─ howToPlayModals.ts
│  │  │  ├─ mode.ts
│  │  │  └─ zIndex.ts
│  │  ├─ const
│  │  │  ├─ guess.ts
│  │  │  ├─ localStorage.ts
│  │  │  └─ summary.ts
│  │  ├─ data
│  │  │  ├─ characters.json
│  │  │  ├─ emoji-list.json
│  │  │  ├─ emojis.json
│  │  │  ├─ powers.json
│  │  │  ├─ quotes.json
│  │  │  ├─ releases.json
│  │  │  ├─ releases.json.bak
│  │  │  ├─ silhouette-cells.json
│  │  │  ├─ silhouettes.json
│  │  │  ├─ songs.json
│  │  │  └─ wallpapers.json
│  │  ├─ entities
│  │  │  ├─ character
│  │  │  │  └─ schema.ts
│  │  │  ├─ emoji
│  │  │  │  └─ schema.ts
│  │  │  ├─ quote
│  │  │  │  └─ schema.ts
│  │  │  ├─ release
│  │  │  │  └─ schema.ts
│  │  │  ├─ silhouette
│  │  │  │  └─ schema.ts
│  │  │  ├─ song
│  │  │  │  └─ schema.ts
│  │  │  └─ stats
│  │  │     └─ types.ts
│  │  ├─ features
│  │  │  ├─ admin
│  │  │  │  ├─ components
│  │  │  │  │  ├─ FeedbackPanel.tsx
│  │  │  │  │  └─ MonitorClient.tsx
│  │  │  │  └─ monitorAuth.ts
│  │  │  ├─ character
│  │  │  │  ├─ character.ts
│  │  │  │  ├─ compareCharacter.ts
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ DailyCharacterWrapper.tsx
│  │  │  │  │  │  └─ __tests__
│  │  │  │  │  │     └─ DailyCharacterWrapper.test.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ CharacterGuessTable.tsx
│  │  │  │  │  │  ├─ CharacterHowToPlayModal.tsx
│  │  │  │  │  │  ├─ CharacterSummaryGuess.tsx
│  │  │  │  │  │  └─ EmptyGuessState.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     ├─ UnlimitedCharacterWrapper.tsx
│  │  │  │  │     └─ __tests__
│  │  │  │  │        └─ UnlimitedCharacterWrapper.test.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useCharacterGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useCharacterGame.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ types.ts
│  │  │  │  ├─ validGuessEntry.ts
│  │  │  │  └─ __tests__
│  │  │  │     └─ compareCharacter.test.ts
│  │  │  ├─ emoji
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ DailyEmojiWrapper.tsx
│  │  │  │  │  │  └─ __tests__
│  │  │  │  │  │     └─ DailyEmojiWrapper.test.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ EmojiGuessTable.tsx
│  │  │  │  │  │  ├─ EmojiHowToPlayModal.tsx
│  │  │  │  │  │  ├─ EmojiSummaryGuess.tsx
│  │  │  │  │  │  └─ EmojiTestimonyDisplay.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     ├─ UnlimitedEmojiWrapper.tsx
│  │  │  │  │     └─ __tests__
│  │  │  │  │        └─ UnlimitedEmojiWrapper.test.tsx
│  │  │  │  ├─ emoji.ts
│  │  │  │  ├─ emojiRevealedCounter.ts
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useEmojiGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useEmojiGame.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ quote
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ DailyQuoteWrapper.tsx
│  │  │  │  │  │  └─ __tests__
│  │  │  │  │  │     └─ DailyQuoteWrapper.test.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ QuoteGuessTable.tsx
│  │  │  │  │  │  ├─ QuoteHowToPlayModal.tsx
│  │  │  │  │  │  ├─ QuoteSummaryGuess.tsx
│  │  │  │  │  │  └─ QuoteTestimonyDisplay.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     ├─ UnlimitedQuoteWrapper.tsx
│  │  │  │  │     └─ __tests__
│  │  │  │  │        └─ UnlimitedQuoteWrapper.test.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useQuoteGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useQuoteGame.ts
│  │  │  │  ├─ quote.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ release
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ DailyReleaseWrapper.tsx
│  │  │  │  │  │  └─ __tests__
│  │  │  │  │  │     └─ DailyReleaseWrapper.test.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ ReleaseGuessTable.tsx
│  │  │  │  │  │  ├─ ReleaseHowToPlayModal.tsx
│  │  │  │  │  │  ├─ ReleaseSearchBar.tsx
│  │  │  │  │  │  ├─ ReleaseSummaryGuess.tsx
│  │  │  │  │  │  └─ ReleaseTestimonyDisplay.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     ├─ UnlimitedReleaseWrapper.tsx
│  │  │  │  │     └─ __tests__
│  │  │  │  │        └─ UnlimitedReleaseWrapper.test.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useReleaseGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useReleaseGame.ts
│  │  │  │  ├─ release.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ silhouette
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ DailySilhouetteWrapper.tsx
│  │  │  │  │  │  └─ __tests__
│  │  │  │  │  │     └─ DailySilhouetteWrapper.test.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ SilhouetteGuessTable.tsx
│  │  │  │  │  │  ├─ SilhouetteHowToPlayModal.tsx
│  │  │  │  │  │  ├─ SilhouetteImage.tsx
│  │  │  │  │  │  └─ SilhouetteSummaryGuess.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     ├─ UnlimitedSilhouetteWrapper.tsx
│  │  │  │  │     └─ __tests__
│  │  │  │  │        └─ UnlimitedSilhouetteWrapper.test.tsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useSilhouetteGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useSilhouetteGame.ts
│  │  │  │  ├─ silhouette.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ song
│  │  │  │  ├─ components
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  ├─ DailySongWrapper.tsx
│  │  │  │  │  │  └─ __tests__
│  │  │  │  │  │     └─ DailySongWrapper.test.tsx
│  │  │  │  │  ├─ shared
│  │  │  │  │  │  ├─ SongAudioPlayer.tsx
│  │  │  │  │  │  ├─ SongGuessTable.tsx
│  │  │  │  │  │  ├─ SongHowToPlayModal.tsx
│  │  │  │  │  │  ├─ SongProgressBar.tsx
│  │  │  │  │  │  ├─ SongSearchBar.tsx
│  │  │  │  │  │  └─ SongSummaryGuess.tsx
│  │  │  │  │  └─ unlimited
│  │  │  │  │     ├─ UnlimitedSongWrapper.tsx
│  │  │  │  │     └─ __tests__
│  │  │  │  │        └─ UnlimitedSongWrapper.test.tsx
│  │  │  │  ├─ constants.ts
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ daily
│  │  │  │  │  │  └─ useSongGame.ts
│  │  │  │  │  └─ unlimited
│  │  │  │  │     └─ useSongGame.ts
│  │  │  │  ├─ song.ts
│  │  │  │  └─ types.ts
│  │  │  ├─ soul-society-archives
│  │  │  │  └─ components
│  │  │  │     └─ ArchiveCharacterCard.tsx
│  │  │  ├─ stats
│  │  │  │  ├─ components
│  │  │  │  │  └─ StatsHubPage.tsx
│  │  │  │  └─ types.ts
│  │  │  └─ support
│  │  │     ├─ KidoSeal.tsx
│  │  │     ├─ PortfolioCard.tsx
│  │  │     ├─ SupportForm.tsx
│  │  │     └─ SupportPageClient.tsx
│  │  ├─ lib
│  │  │  ├─ assets
│  │  │  │  └─ resolveAssetPath.ts
│  │  │  ├─ debug
│  │  │  │  └─ logFullTarget.ts
│  │  │  ├─ guessGame
│  │  │  │  ├─ compareBinaryGuess.ts
│  │  │  │  ├─ createDailyGuessGameStore.ts
│  │  │  │  ├─ createUnlimitedGuessGameStore.ts
│  │  │  │  ├─ types.ts
│  │  │  │  └─ __tests__
│  │  │  │     └─ compareBinaryGuess.test.ts
│  │  │  ├─ rateLimit.ts
│  │  │  ├─ search
│  │  │  │  └─ fuzzy.ts
│  │  │  ├─ security
│  │  │  │  └─ turnstile.ts
│  │  │  ├─ store
│  │  │  │  └─ createNestedStorage.ts
│  │  │  ├─ supabase
│  │  │  │  ├─ supabase-client.ts
│  │  │  │  └─ supabase-server.ts
│  │  │  ├─ support
│  │  │  │  ├─ constantsExtractor.ts
│  │  │  │  ├─ ipRateLimit.ts
│  │  │  │  └─ rateLimitCookie.ts
│  │  │  └─ utils
│  │  │     ├─ absolutePathEntities.ts
│  │  │     ├─ checking.ts
│  │  │     ├─ daily.ts
│  │  │     ├─ format.ts
│  │  │     ├─ generateCaseFileId.ts
│  │  │     ├─ sanitize.ts
│  │  │     ├─ time.ts
│  │  │     └─ ui.ts
│  │  ├─ scripts
│  │  │  ├─ check-assets.js
│  │  │  ├─ check-release-audio.js
│  │  │  ├─ cutout_characters.py
│  │  │  ├─ extract-character-meta.js
│  │  │  ├─ extract-character.js
│  │  │  ├─ fix-all-json-relations.js
│  │  │  ├─ fix-duplicate-ids.js
│  │  │  ├─ generate-emojis.js
│  │  │  ├─ generate-releases.js
│  │  │  ├─ generate-silhouettes.js
│  │  │  ├─ generate-wallpapers.js
│  │  │  ├─ map-character-quote.js
│  │  │  ├─ precompute-silhouette-cells.mjs
│  │  │  └─ seeds
│  │  │     ├─ daily
│  │  │     │  └─ trigger-schedule.js
│  │  │     ├─ seed-characters.js
│  │  │     ├─ seed-emojis.js
│  │  │     ├─ seed-quotes.js
│  │  │     ├─ seed-releases.js
│  │  │     ├─ seed-silhouettes.js
│  │  │     └─ seed-songs.js
│  │  ├─ services
│  │  │  ├─ getDailySchedule
│  │  │  │  ├─ character.ts
│  │  │  │  ├─ emoji.ts
│  │  │  │  ├─ quote.ts
│  │  │  │  ├─ release.ts
│  │  │  │  ├─ silhouette.ts
│  │  │  │  └─ song.ts
│  │  │  ├─ monitor
│  │  │  │  └─ logEvent.ts
│  │  │  └─ statsClient.ts
│  │  ├─ shared
│  │  │  ├─ hooks
│  │  │  │  ├─ useBadgeTier.ts
│  │  │  │  ├─ useCooldown.ts
│  │  │  │  ├─ useCountdown.ts
│  │  │  │  ├─ useDailyHub.ts
│  │  │  │  ├─ useDailyWallpaper.ts
│  │  │  │  ├─ useRaceEmblem.ts
│  │  │  │  ├─ useRouteLoadingStore.ts
│  │  │  │  ├─ useTestWallpaper.ts
│  │  │  │  └─ useTurnstile.ts
│  │  │  ├─ types
│  │  │  └─ ui
│  │  │     ├─ BleachReiatsuCursor.tsx
│  │  │     ├─ button.tsx
│  │  │     ├─ context
│  │  │     │  └─ NavigationContext.tsx
│  │  │     ├─ control-panel
│  │  │     │  ├─ Central46ConfidentialArchive.tsx
│  │  │     │  ├─ CharacterControlPanel.tsx
│  │  │     │  ├─ EmojiControlPanel.tsx
│  │  │     │  ├─ Legend.tsx
│  │  │     │  ├─ QuoteControlPanel.tsx
│  │  │     │  ├─ ReleaseControlPanel.tsx
│  │  │     │  ├─ SearchBar.tsx
│  │  │     │  ├─ SilhouetteControlPanel.tsx
│  │  │     │  └─ SongControlPanel.tsx
│  │  │     ├─ daily-hub
│  │  │     │  ├─ DailyCountdownBadge.tsx
│  │  │     │  ├─ DailyHubModalFooter.tsx
│  │  │     │  ├─ DailyProgressBar.tsx
│  │  │     │  └─ DailyStatsBar.tsx
│  │  │     ├─ game-selector
│  │  │     │  ├─ AboutButton.tsx
│  │  │     │  ├─ AllModesButton.tsx
│  │  │     │  ├─ AllModesModal.tsx
│  │  │     │  ├─ HomeButton.tsx
│  │  │     │  ├─ HowToPlayButton.tsx
│  │  │     │  ├─ ModeBadge.tsx
│  │  │     │  ├─ ModeSelectorModal.tsx
│  │  │     │  ├─ SpotifyPlaylistButton.tsx
│  │  │     │  ├─ StatsButton.tsx
│  │  │     │  ├─ SupportButton.tsx
│  │  │     │  └─ ThematicModeSelector.tsx
│  │  │     ├─ hero-phenomena
│  │  │     │  ├─ constants.ts
│  │  │     │  ├─ hankoSeal
│  │  │     │  │  ├─ AlmightyIcon.tsx
│  │  │     │  │  ├─ GargantaIcon.tsx
│  │  │     │  │  ├─ HankoSeal.tsx
│  │  │     │  │  ├─ KurohitsugiIcon.tsx
│  │  │     │  │  └─ ZeroDivisionIcon.tsx
│  │  │     │  ├─ HeroDailyCTA.tsx
│  │  │     │  ├─ HeroPhenomenonStage.tsx
│  │  │     │  ├─ phenomena
│  │  │     │  │  ├─ Almighty.tsx
│  │  │     │  │  ├─ AlmightyBleed.tsx
│  │  │     │  │  ├─ AlmightyShadowEyes.tsx
│  │  │     │  │  ├─ Garganta.tsx
│  │  │     │  │  ├─ GargantaBleed.tsx
│  │  │     │  │  ├─ Kurohitsugi.tsx
│  │  │     │  │  ├─ KurohitsugiBleed.tsx
│  │  │     │  │  ├─ ZeroDivision.tsx
│  │  │     │  │  └─ ZeroDivisionBleed.tsx
│  │  │     │  ├─ PhenomenonPlayButton.tsx
│  │  │     │  └─ useDailyPhenomenon.ts
│  │  │     ├─ input.tsx
│  │  │     ├─ layout
│  │  │     │  ├─ Divider.tsx
│  │  │     │  ├─ Footer.tsx
│  │  │     │  ├─ GlobalGameNav.tsx
│  │  │     │  ├─ Header.tsx
│  │  │     │  ├─ HeaderDivider.tsx
│  │  │     │  ├─ ReiatsuAmbientSides.tsx
│  │  │     │  └─ SubHeader.tsx
│  │  │     ├─ loader
│  │  │     │  ├─ SenkaimonTransition.tsx
│  │  │     │  ├─ SoulSyncLoader.tsx
│  │  │     │  └─ ZangetsuLoader.tsx
│  │  │     ├─ modal.tsx
│  │  │     ├─ ScaleFit.tsx
│  │  │     ├─ Sealed.tsx
│  │  │     ├─ summary
│  │  │     │  ├─ DailyResetTimer.tsx
│  │  │     │  ├─ IdentificationHistoryPanel.tsx
│  │  │     │  ├─ index.ts
│  │  │     │  ├─ NarrativeFlavorText.tsx
│  │  │     │  ├─ StreakStatsGrid.tsx
│  │  │     │  ├─ SummaryActionButton.tsx
│  │  │     │  ├─ SummaryCardShell.tsx
│  │  │     │  ├─ SummaryHeader.tsx
│  │  │     │  └─ TierBadgeCard.tsx
│  │  │     ├─ tooltip.tsx
│  │  │     └─ WallpaperInitializer.tsx
│  │  ├─ styles
│  │  │  └─ globals.css
│  │  └─ test
│  │     └─ setup.ts
│  ├─ supabase
│  │  ├─ .temp
│  │  │  ├─ cli-latest
│  │  │  ├─ gotrue-version
│  │  │  ├─ linked-project.json
│  │  │  ├─ pooler-url
│  │  │  ├─ postgres-version
│  │  │  ├─ project-ref
│  │  │  ├─ rest-version
│  │  │  ├─ storage-migration
│  │  │  └─ storage-version
│  │  └─ migrations
│  │     ├─ 0001_support_tickets.sql
│  │     ├─ 01_type.sql
│  │     ├─ 02_table.sql
│  │     ├─ 03_index.sql
│  │     ├─ 04_function.sql
│  │     ├─ 05_cronjob.sql
│  │     ├─ 06_new_schema_dump.sql
│  │     └─ 07_rls_policies.sql
│  ├─ test-results
│  │  └─ .last-run.json
│  ├─ tests
│  │  └─ e2e
│  │     ├─ daily-character-flow.spec.ts
│  │     ├─ daily-emoji-flow.spec.ts
│  │     ├─ daily-quote-flow.spec.ts
│  │     ├─ daily-release-flow.spec.ts
│  │     ├─ daily-silhouette-flow.spec.ts
│  │     ├─ daily-song-flow.spec.ts
│  │     ├─ unlimited-character-flow.spec.ts
│  │     ├─ unlimited-emoji-flow.spec.ts
│  │     ├─ unlimited-quote-flow.spec.ts
│  │     ├─ unlimited-release-flow.spec.ts
│  │     ├─ unlimited-silhouette-flow.spec.ts
│  │     └─ unlimited-song-flow.spec.ts
│  ├─ tsconfig.json
│  └─ vitest.config.ts
└─ README.md

```
