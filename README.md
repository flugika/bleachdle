# BLEACHDLE

> A Wordle-style character guessing game for Bleach fans — unlimited mode, attribute-based feedback, Soul Society aesthetic.

**Last Updated:** 31 July 2026, 1:00 AM.

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
| **Garganta** | <img width="450" alt="homepage_garganta" src="https://github.com/user-attachments/assets/cc78a463-2a0f-46d4-928b-d34293b74dbf" /> |
| **Almighty** | <img width="450" alt="homepage_almighty" src="https://github.com/user-attachments/assets/bb0f3031-fc06-41ec-a96e-37e1594adf19" /> |
| **Kurohitsugi** | <img width="450" alt="homepage_kurohitsugi" src="https://github.com/user-attachments/assets/51e61f7d-eefb-4f4e-a67e-900c779996c1" /> |
| **Zero Division** | <img width="450" alt="homepage_zerodivision" src="https://github.com/user-attachments/assets/7c024679-7869-4f9c-ae46-3808597baeed" /> |

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
- **Emoji anti-peek reveal** — `getDailyEmoji` (`services/getDailySchedule/emoji.ts`) now returns an `EmojiTargetHidden` (`id` + `character_id` only — see `features/emoji/types.ts`) instead of the full row, so the round's complete 4-emoji clue array no longer ships to the client up front. `getRevealedEmojiTiles` (`features/emoji/emoji.ts`) then renders only the slice unlocked by `revealedCount` and masks the rest as `null`; `emojiRevealedCounter.ts` drives that count up as wrong guesses accumulate. Note: `character_id` itself is still present client-side for guess comparison, same as every other vertical (see [Reliability & Process](#reliability--process) below) — this fix closes the emoji-clue leak specifically, not full answer confidentiality.
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

> Status below was verified directly against the current `main` branch (source, config, and test files), not just tracked from memory — so checkbox state and description should stay in sync going forward. Please keep it that way in PRs: flipping a box without updating its sentence is worse than leaving it unchecked.

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
- [ ] **First Name** — simplest new mode, Wordle-style guessing on a character's first name only, with the classic gray/yellow/green letter feedback. Needs a new `first_name` field split out from the existing full `name` field, otherwise no new data required (confirmed: `characters.json` has no `first_name` field yet)
- [ ] **Trait Group** — system picks 3 characters at random and reveals what they share (trait / race / affiliation / friend group) but NOT who they are — player must guess the identities of those 3 hidden characters themselves (not guess additional members of the group); countdown-based
- [ ] **Higher/Lower** — one character card shows a revealed "power level," the other is hidden; guess higher or lower than the revealed card. Blocked on defining a power-ranking methodology — win rate alone isn't sufficient, multiple factors need to be weighed
- [ ] **Link** — chain-guessing mode: player is given a start character and a target character, and must build a relationship path connecting them in as few hops as possible (4–5 steps target). Each step must be a direct relationship to the previous character (e.g. `Orihime → Ichigo → Aizen → Ichimaru → Kira` = 4 steps, counting the target itself as the final hop). Depends on the same **character relationship / boundary table** needed for Pair/Connection above — blocked on that data model landing first
- [ ] **Tap One** — 10 character cards shown per round, each card asks "who is the strongest/best in [category]" (a random category per card — e.g. raw power, speed, kido mastery, swordsmanship). Player picks the character they believe ranks #1 for that card's category; any card not yet answered re-shuffles its character pool on each pick, so the options keep shifting until every card is resolved. Blocked on the same open question as Higher/Lower: needs a defined power-ranking/category methodology per trait before cards can be scored as correct/incorrect

### Data Model (new, supports the modes above)
- [ ] **Character relationship / boundary table** — stores how one character relates to another. Rough shape so far: `id`, `character_id`, `related_character_id`, `type` (e.g. friend / family / rival / same-trait). Still deciding what else needs to be captured — directional vs. bidirectional, a strength/weight field, free-text notes, whether one row can represent multiple shared boundaries at once, etc. Not started — no migration or schema stub for it yet. Needed for **Pair**, **Connection**, and **Link** above.

### Stats & Social
- [x] **Global daily stats** — "X% of players solved it within N guesses," aggregated via Supabase on top of existing round/result tables
- [x] **Surface badges on `/stats`** — badge system already exists but currently only renders inside each mode's summary card, not on the dedicated stats page
- [x] **Rate limiting on game APIs** (not just `/api/support`) — done, but via the lighter path rather than the originally planned one: `app/api/stats/finalize`, `app/api/stats/daily`, and `app/api/stats/global` all now gate on IP-based checks (`checkIpRateLimit` from `lib/support/ipRateLimit.ts`, the same pattern generalized from the support ticket system) or the in-memory `edgeRateLimit` helper (`lib/rateLimit.ts`). `@upstash/ratelimit` / `@upstash/redis` are installed as dependencies but not wired into any route yet — today's limiter is in-process memory, which is fine for a single Vercel region but won't share state across edge regions if traffic grows; revisit Upstash then.
- [x] **Shareable result as image** — still pending. Skip the Wordle/Worldle-style emoji-grid text share; generate a downloadable/story-ready image (canvas or server-side OG image) instead
- [x] **Streak/session portability without login** — still pending. Current direction: generate a code on one device that can be entered on a second device to link/sync the streak data across them. This replaces the earlier same-network auto-detection idea, which had an unresolved collision problem on shared networks (family, roommates) where distinct players would merge onto one streak

### Accounts & Progression (new)
- [ ] **Login** — account system, currently unauthenticated
- [ ] **Card pack rewards** — gacha-style random cosmetic character card drawn after each round, collected and displayed on the user's profile
- [ ] **User level** — XP/progression tied to playtime and rounds completed
- [ ] **Character card / archive detail view** — a fuller per-character info page. Hesitant here because it could let players look up dle answers directly, but still seems worth building — likely gated somehow (behind account/level, or hiding the specific fields used in comparisons) rather than dropped. (Not to be confused with the existing `/soul-society-archives` page, which is a daily-answers recap, not a general per-character profile.)

### Reliability & Process
- [x] **Error monitoring (Sentry or similar)** — done — high priority precisely because there wasn't full test coverage early on; needed visibility into prod failures while shipping fast
- [x] **Testing suite** (unit + integration + e2e) — done. Vitest (`vitest.config.ts`, jsdom env) covers unit/integration specs under `src/**/*.{test,spec}.ts(x)` and `app/**/*.{test,spec}.ts(x)` — most API routes now ship a co-located `route.test.ts`. Playwright (`playwright.config.ts`) covers full daily/unlimited flow specs per vertical under `tests/e2e/`. Run via `pnpm test`, `pnpm test:e2e`, or both with `pnpm test:all`.
- [x] **Emoji list anti-peek** — done. Moved up from the Data Model section below since it's a security/architecture fix, not a data-model addition. See the [Features](#features) entry above for the implementation; scope note: it closes the emoji-clue leak specifically, the target `character_id` is still available client-side for guess comparison like every other vertical.
- [x] **Real CI pipeline** — still pending, and currently in worse shape than previously noted: no `.github/workflows` (or equivalent CI config) exists in the repo at all right now, so `lint` / `tsc --noEmit` / tests / build aren't gated on PRs yet even though the scripts (`pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm test:e2e`) all exist and pass locally. Wiring those into GitHub Actions is the next step, now that the testing suite above gives it something real to run.
- [ ] **Reduced-motion setting** — in progress, not done. `prefers-reduced-motion` is already respected in `SenkaimonTransition.tsx` and `SoulSyncLoader.tsx` (plus a corresponding block in `globals.css`), but `BleachReiatsuCursor.tsx` and `ZangetsuLoader.tsx` don't check it yet. Leaving unchecked until the pass covers all loaders/transitions/the cursor effect.

### Infra
- [x] **Supabase migration** — done. `client/supabase/migrations/` now runs through `07_rls_policies.sql` and a full schema dump (`06_new_schema_dump.sql`), on top of the original support-ticket/daily-schedule migrations; `supabaseServer` (service-role client) is the backing store for daily schedules, stats, and support tickets in production.
- [x] **Turnstile spam mitigation** — still paused. `useTurnstile.ts` exists but isn't called anywhere in `SupportForm.tsx` yet — legitimate traffic was being flagged as bot activity, needs a fix before re-enabling
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
│  │  │  ├─ cron
│  │  │  │  └─ purge-pairing-codes
│  │  │  │     ├─ route.test.ts
│  │  │  │     └─ route.ts
│  │  │  ├─ device
│  │  │  │  ├─ init
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ unlink
│  │  │  │     ├─ route.test.ts
│  │  │  │     └─ route.ts
│  │  │  ├─ monitor
│  │  │  │  ├─ feedback
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ health
│  │  │  │     ├─ route.test.ts
│  │  │  │     └─ route.ts
│  │  │  ├─ pair
│  │  │  │  ├─ confirm
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ create
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ devices
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ redeem
│  │  │  │  │  ├─ route.test.ts
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ status
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
│  │  │  ├─ support
│  │  │  │  ├─ route.test.ts
│  │  │  │  └─ route.ts
│  │  │  └─ sync
│  │  │     ├─ completed
│  │  │     │  ├─ route.test.ts
│  │  │     │  └─ route.ts
│  │  │     ├─ progress
│  │  │     │  ├─ route.test.ts
│  │  │     │  └─ route.ts
│  │  │     ├─ reincarnate
│  │  │     │  ├─ route.test.ts
│  │  │     │  └─ route.ts
│  │  │     ├─ result
│  │  │     │  ├─ route.test.ts
│  │  │     │  └─ route.ts
│  │  │     ├─ soul-name
│  │  │     │  ├─ route.test.ts
│  │  │     │  └─ route.ts
│  │  │     ├─ soul-registry
│  │  │     │  ├─ route.test.ts
│  │  │     │  └─ route.ts
│  │  │     └─ stats
│  │  │        ├─ route.test.ts
│  │  │        └─ route.ts
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
│  │  ├─ robots.ts
│  │  ├─ sitemap.ts
│  │  ├─ soul-society-archives
│  │  │  └─ page.tsx
│  │  ├─ stats
│  │  │  ├─ page.tsx
│  │  │  └─ test
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
│  │  │  │  ├─ Bankai_Gin_Ichimaru.mp3
│  │  │  │  ├─ Bankai_Ichibe'e_Hyosube.mp3
│  │  │  │  ├─ Bankai_Ichigo_Kurosaki.mp3
│  │  │  │  ├─ Bankai_Ikkaku_Madarame.mp3
│  │  │  │  ├─ Bankai_Kaname_Tosen.mp3
│  │  │  │  ├─ Bankai_Kensei_Muguruma.mp3
│  │  │  │  ├─ Bankai_Kisuke_Urahara.mp3
│  │  │  │  ├─ Bankai_Kugo_Ginjo.mp3
│  │  │  │  ├─ Bankai_Mayuri_Kurotsuchi.mp3
│  │  │  │  ├─ Bankai_Renji_Abarai.mp3
│  │  │  │  ├─ Bankai_Retsu_Unohana.mp3
│  │  │  │  ├─ Bankai_Rojuro_Otoribashi.mp3
│  │  │  │  ├─ Bankai_Rukia_Kuchiki.mp3
│  │  │  │  ├─ Bankai_Sajin_Komamura.mp3
│  │  │  │  ├─ Bankai_Senjumaru_Shutara.mp3
│  │  │  │  ├─ Bankai_Shinji_Hirako.mp3
│  │  │  │  ├─ Bankai_Shunsui_Kyoraku.mp3
│  │  │  │  ├─ Bankai_Sui_Feng.mp3
│  │  │  │  ├─ Bankai_Toshiro_Hitsugaya.mp3
│  │  │  │  ├─ Resurreccion_Aaroniero_Arruruerie.mp3
│  │  │  │  ├─ Resurreccion_Baraggan_Louisenbairn.mp3
│  │  │  │  ├─ Resurreccion_Coyote_Starrk.mp3
│  │  │  │  ├─ Resurreccion_Grimmjow_Jaegerjaquez.mp3
│  │  │  │  ├─ Resurreccion_Kaname_Tosen.mp3
│  │  │  │  ├─ Resurreccion_Loly_Aivirrne.mp3
│  │  │  │  ├─ Resurreccion_Luppi_Antenor.mp3
│  │  │  │  ├─ Resurreccion_Nelliel_Tu_Odelschwanck.mp3
│  │  │  │  ├─ Resurreccion_Nnoitra_Gilga.mp3
│  │  │  │  ├─ Resurreccion_Szayelaporro_Granz.mp3
│  │  │  │  ├─ Resurreccion_Tier_Harribel.mp3
│  │  │  │  ├─ Resurreccion_Ulquiorra_Cifer.mp3
│  │  │  │  ├─ Resurreccion_Ulquiorra_Cifer_2.mp3
│  │  │  │  ├─ Resurreccion_Yammy_Llargo.mp3
│  │  │  │  ├─ Resurreccion_Zommari_Rureaux.mp3
│  │  │  │  ├─ Shikai_Izuru_Kira.mp3
│  │  │  │  ├─ Shikai_Kenpachi_Zaraki.mp3
│  │  │  │  ├─ Shikai_Shuhei_Hisagi.mp3
│  │  │  │  ├─ Shikai_Sosuke_Aizen.mp3
│  │  │  │  ├─ Vollstandig_As_Nodt.mp3
│  │  │  │  ├─ Vollstandig_Bambietta_Basterbine.mp3
│  │  │  │  ├─ Vollstandig_Giselle_Gewelle.mp3
│  │  │  │  ├─ Vollstandig_Lille_Barro.mp3
│  │  │  │  ├─ Vollstandig_Liltotto_Lamperd.mp3
│  │  │  │  ├─ Vollstandig_Meninas_McAllon.mp3
│  │  │  │  ├─ Vollstandig_PePe_Waccabrada.mp3
│  │  │  │  └─ Vollstandig_Quilge_Opie.mp3
│  │  │  └─ songs
│  │  │     ├─ 1106_tybw.mp3
│  │  │     ├─ after_dark.mp3
│  │  │     ├─ alones.mp3
│  │  │     ├─ anima_rossa.mp3
│  │  │     ├─ asterisk.mp3
│  │  │     ├─ baby_its_you.mp3
│  │  │     ├─ blue.mp3
│  │  │     ├─ blue_bird.mp3
│  │  │     ├─ change.mp3
│  │  │     ├─ chu_bura.mp3
│  │  │     ├─ clavar_la_espada.mp3
│  │  │     ├─ composite.mp3
│  │  │     ├─ creeping_shadows.mp3
│  │  │     ├─ daidai.mp3
│  │  │     ├─ d_tecnolife.mp3
│  │  │     ├─ echoes.mp3
│  │  │     ├─ eien.mp3
│  │  │     ├─ endroll.mp3
│  │  │     ├─ escalon.mp3
│  │  │     ├─ gallop.mp3
│  │  │     ├─ hanabi.mp3
│  │  │     ├─ happypeople.mp3
│  │  │     ├─ harukaze.mp3
│  │  │     ├─ haruka_kanata.mp3
│  │  │     ├─ hitohira_no_hanabira.mp3
│  │  │     ├─ ichirin_no_hana.mp3
│  │  │     ├─ invasion.mp3
│  │  │     ├─ i_bull.mp3
│  │  │     ├─ kansha.mp3
│  │  │     ├─ kimi_wo_mamotte.mp3
│  │  │     ├─ last_moment.mp3
│  │  │     ├─ life.mp3
│  │  │     ├─ life_is_like_a_boat.mp3
│  │  │     ├─ mad_surfer.mp3
│  │  │     ├─ mask.mp3
│  │  │     ├─ monochrome.mp3
│  │  │     ├─ movin.mp3
│  │  │     ├─ my_pace.mp3
│  │  │     ├─ never_meant_to_belong.mp3
│  │  │     ├─ number_one.mp3
│  │  │     ├─ oldrose.mp3
│  │  │     ├─ on_the_precipice.mp3
│  │  │     ├─ orange.mp3
│  │  │     ├─ ranbu_no_melody.mp3
│  │  │     ├─ rapport.mp3
│  │  │     ├─ rasen.mp3
│  │  │     ├─ reaper.mp3
│  │  │     ├─ re_pray.mp3
│  │  │     ├─ rolling_star.mp3
│  │  │     ├─ saihate.mp3
│  │  │     ├─ sakurabito.mp3
│  │  │     ├─ sakura_biyori.mp3
│  │  │     ├─ scar.mp3
│  │  │     ├─ senna.mp3
│  │  │     ├─ shojo_s.mp3
│  │  │     ├─ sky_chord.mp3
│  │  │     ├─ song_for.mp3
│  │  │     ├─ stars.mp3
│  │  │     ├─ stay_beautiful.mp3
│  │  │     ├─ tabidatsu_kimi_e.mp3
│  │  │     ├─ tane_wo_maku_hibi.mp3
│  │  │     ├─ thank_you.mp3
│  │  │     ├─ tonight_tonight_tonight.mp3
│  │  │     ├─ treachery.mp3
│  │  │     ├─ tsumasaki.mp3
│  │  │     ├─ velonica.mp3
│  │  │     └─ without_any_words.mp3
│  │  ├─ characters
│  │  │  ├─ Aaroniero_Arruruerie.webp
│  │  │  ├─ Abirama_Redder.webp
│  │  │  ├─ Aisslinger_Wernarr.webp
│  │  │  ├─ Akon.webp
│  │  │  ├─ Asguiaro_Ebern.webp
│  │  │  ├─ Askin_Nakk_Le_Vaar.webp
│  │  │  ├─ As_Nodt.webp
│  │  │  ├─ Ayon.webp
│  │  │  ├─ Bambietta_Basterbine.webp
│  │  │  ├─ Baraggan_Louisenbairn.webp
│  │  │  ├─ Bawabawa.webp
│  │  │  ├─ Bazz_B.webp
│  │  │  ├─ BG9.webp
│  │  │  ├─ Byakuya_Kuchiki.webp
│  │  │  ├─ Candice_Catnipp.webp
│  │  │  ├─ Cang_Du.webp
│  │  │  ├─ Charlotte_Chuhlhourne.webp
│  │  │  ├─ Choe_Neng_Poww.webp
│  │  │  ├─ Chojiro_Sasakibe.webp
│  │  │  ├─ Cirucci_Sanderwicci.webp
│  │  │  ├─ Coyote_Starrk.webp
│  │  │  ├─ Cyan_Sung_Sun.webp
│  │  │  ├─ Demoura_Zodd.webp
│  │  │  ├─ Di_Roy_Rinker.webp
│  │  │  ├─ Dondochakka_Bilstin.webp
│  │  │  ├─ Don_Kanonji.webp
│  │  │  ├─ Dordoni_Alessandro_Del_Socaccio.webp
│  │  │  ├─ Driscoll_Berci.webp
│  │  │  ├─ Edrad_Liones.webp
│  │  │  ├─ Emilou_Apacci.webp
│  │  │  ├─ Findorr_Calius.webp
│  │  │  ├─ Franceska_Mila_Rose.webp
│  │  │  ├─ Ganju_Shiba.webp
│  │  │  ├─ Gantenbainne_Mosqueda.webp
│  │  │  ├─ Genryusai_Shigekuni_Yamamoto.webp
│  │  │  ├─ Genshiro_Okikiba.webp
│  │  │  ├─ Gerard_Valkyrie.webp
│  │  │  ├─ Ggio_Vega.webp
│  │  │  ├─ Ginrei_Kuchiki.webp
│  │  │  ├─ Gin_Ichimaru.webp
│  │  │  ├─ Giriko_Kutsuzawa.webp
│  │  │  ├─ Giselle_Gewelle.webp
│  │  │  ├─ Grand_Fisher.webp
│  │  │  ├─ Gremmy_Thoumeaux.webp
│  │  │  ├─ Grimmjow_Jaegerjaquez.webp
│  │  │  ├─ Guenael_Lee.webp
│  │  │  ├─ Hachigen_Ushoda.webp
│  │  │  ├─ Hanataro_Yamada.webp
│  │  │  ├─ Hidetomo_Kajomaru.webp
│  │  │  ├─ Hisana_Kuchiki.webp
│  │  │  ├─ Hiyori_Sarugaki.webp
│  │  │  ├─ Hiyosu.webp
│  │  │  ├─ Hooleer.webp
│  │  │  ├─ Ichibe'e_Hyosube.webp
│  │  │  ├─ Ichigo_Kurosaki.webp
│  │  │  ├─ Ikkaku_Madarame.webp
│  │  │  ├─ Ikumi_Unagiya.webp
│  │  │  ├─ Isane_Kotetsu.webp
│  │  │  ├─ Isshin_Kurosaki.webp
│  │  │  ├─ Isuzu_Ise.webp
│  │  │  ├─ Izumi_Ishida.webp
│  │  │  ├─ Izuru_Kira.webp
│  │  │  ├─ Jackie_Tristan.webp
│  │  │  ├─ James.webp
│  │  │  ├─ Jerome_Guizbatt.webp
│  │  │  ├─ Jidanbo_Ikkanzaka.webp
│  │  │  ├─ Jinta_Hanakari.webp
│  │  │  ├─ Jirobo_Ikkanzaka.webp
│  │  │  ├─ Jugram_Haschwalth.webp
│  │  │  ├─ Jushiro_Ukitake.webp
│  │  │  ├─ Kagine.webp
│  │  │  ├─ Kaien_Shiba.webp
│  │  │  ├─ Kanae_Katagiri.webp
│  │  │  ├─ Kaname_Tosen.webp
│  │  │  ├─ Kaoru_Unagiya.webp
│  │  │  ├─ Karin_Kurosaki.webp
│  │  │  ├─ Keigo_Asano.webp
│  │  │  ├─ Kenpachi_Kiganjo.webp
│  │  │  ├─ Kenpachi_Zaraki.webp
│  │  │  ├─ Kensei_Muguruma.webp
│  │  │  ├─ Kirio_Hikifune.webp
│  │  │  ├─ Kisuke_Urahara.webp
│  │  │  ├─ Kiyone_Kotetsu.webp
│  │  │  ├─ Kon.webp
│  │  │  ├─ Kugo_Ginjo.webp
│  │  │  ├─ Kukaku_Shiba.webp
│  │  │  ├─ Kukkapuro.webp
│  │  │  ├─ Lille_Barro.webp
│  │  │  ├─ Liltotto_Lamperd.webp
│  │  │  ├─ Lilynette_Gingerbuck.webp
│  │  │  ├─ Lisa_Yadomaru.webp
│  │  │  ├─ Loly_Aivirrne.webp
│  │  │  ├─ Love_Aikawa.webp
│  │  │  ├─ Loyd_Lloyd.webp
│  │  │  ├─ Luders_Friegen.webp
│  │  │  ├─ Luppi_Antenor.webp
│  │  │  ├─ Mahana_Natsui.webp
│  │  │  ├─ Marechiyo_Omaeda.webp
│  │  │  ├─ Masaki_Kurosaki.webp
│  │  │  ├─ Mashiro_Kuna.webp
│  │  │  ├─ Mask_De_Masculine.webp
│  │  │  ├─ Mayuri_Kurotsuchi.webp
│  │  │  ├─ Meninas_McAllon.webp
│  │  │  ├─ Menoly_Mallia.webp
│  │  │  ├─ Michiru_Ogawa.webp
│  │  │  ├─ Mimihagi.webp
│  │  │  ├─ Miyako_Shiba.webp
│  │  │  ├─ Mizuiro_Kojima.webp
│  │  │  ├─ Moe_Shishigawara.webp
│  │  │  ├─ Momo_Hinamori.webp
│  │  │  ├─ Nakeem_Grindina.webp
│  │  │  ├─ NaNaNa_Najahkoop.webp
│  │  │  ├─ Nanao_Ise.webp
│  │  │  ├─ Nelliel_Tu_Odelschwanck.webp
│  │  │  ├─ Nemu_Kurotsuchi.webp
│  │  │  ├─ Nianzol_Weizol.webp
│  │  │  ├─ Niko_Kuna.webp
│  │  │  ├─ Nirgge_Parduoc.webp
│  │  │  ├─ Nnoitra_Gilga.webp
│  │  │  ├─ Oetsu_Nimaiya.webp
│  │  │  ├─ Orihime_Inoue.webp
│  │  │  ├─ Oscar_Joaquin_De_La_Rosa.webp
│  │  │  ├─ PePe_Waccabrada.webp
│  │  │  ├─ Pernida_Parnkgjas.webp
│  │  │  ├─ Pesche_Guatiche.webp
│  │  │  ├─ Quilge_Opie.webp
│  │  │  ├─ Rangiku_Matsumoto.webp
│  │  │  ├─ Renji_Abarai.webp
│  │  │  ├─ Retsu_Unohana.webp
│  │  │  ├─ Rin_Tsubokura.webp
│  │  │  ├─ Riruka_Dokugamine.webp
│  │  │  ├─ Robert_Accutrone.webp
│  │  │  ├─ Rojuro_Otoribashi.webp
│  │  │  ├─ Royd_Lloyd.webp
│  │  │  ├─ Rudbornn_Chelute.webp
│  │  │  ├─ Rukia_Kuchiki.webp
│  │  │  ├─ Runuganga.webp
│  │  │  ├─ Ryuken_Ishida.webp
│  │  │  ├─ Ryunosuke_Yuki.webp
│  │  │  ├─ Sajin_Komamura.webp
│  │  │  ├─ Senjumaru_Shutara.webp
│  │  │  ├─ Sentaro_Kotsubaki.webp
│  │  │  ├─ Shawlong_Koufang.webp
│  │  │  ├─ Shinji_Hirako.webp
│  │  │  ├─ Shino_Madarame.webp
│  │  │  ├─ Shuhei_Hisagi.webp
│  │  │  ├─ Shukuro_Tsukishima.webp
│  │  │  ├─ Shunsui_Kyoraku.webp
│  │  │  ├─ Shunzan_Kyoraku.webp
│  │  │  ├─ Soken_Ishida.webp
│  │  │  ├─ Sosuke_Aizen.webp
│  │  │  ├─ Soul_King.webp
│  │  │  ├─ Sui_Feng.webp
│  │  │  ├─ Szayelaporro_Granz.webp
│  │  │  ├─ Tatsufusa_Enjoji.webp
│  │  │  ├─ Tatsuki_Arisawa.webp
│  │  │  ├─ Tenjiro_Kirinji.webp
│  │  │  ├─ Tesra_Lindocruz.webp
│  │  │  ├─ Tessai_Tsukabishi.webp
│  │  │  ├─ Tetsuzaemon_Iba.webp
│  │  │  ├─ Tier_Harribel.webp
│  │  │  ├─ Toshiro_Hitsugaya.webp
│  │  │  ├─ Ulquiorra_Cifer.webp
│  │  │  ├─ Ururu_Tsumugiya.webp
│  │  │  ├─ Uryu_Ishida.webp
│  │  │  ├─ Wonderweiss_Margela.webp
│  │  │  ├─ Yachiru_Kusajishi.webp
│  │  │  ├─ Yammy_Llargo.webp
│  │  │  ├─ Yasochika_Iemura.webp
│  │  │  ├─ Yasutora_Sado.webp
│  │  │  ├─ Yhwach.webp
│  │  │  ├─ Yoruichi_Shihoin.webp
│  │  │  ├─ Yukio_Hans_Vorarlberna.webp
│  │  │  ├─ Yumichika_Ayasegawa.webp
│  │  │  ├─ Yushiro_Shihoin.webp
│  │  │  ├─ Yuzu_Kurosaki.webp
│  │  │  ├─ Yylfordt_Granz.webp
│  │  │  ├─ Zangetsu.webp
│  │  │  ├─ Zennosuke_Kurumadani.webp
│  │  │  └─ Zommari_Rureaux.webp
│  │  └─ character_silhouette
│  │     ├─ Aaroniero_Arruruerie_cutout_silhouette.webp
│  │     ├─ Abirama_Redder_cutout_silhouette.webp
│  │     ├─ Aisslinger_Wernarr_cutout_silhouette.webp
│  │     ├─ Akon_cutout_silhouette.webp
│  │     ├─ Asguiaro_Ebern_cutout_silhouette.webp
│  │     ├─ Askin_Nakk_Le_Vaar_cutout_silhouette.webp
│  │     ├─ As_Nodt_cutout_silhouette.webp
│  │     ├─ Ayon_cutout_silhouette.webp
│  │     ├─ Bambietta_Basterbine_cutout_silhouette.webp
│  │     ├─ Baraggan_Louisenbairn_cutout_silhouette.webp
│  │     ├─ Bawabawa_cutout_silhouette.webp
│  │     ├─ Bazz_B_cutout_silhouette.webp
│  │     ├─ BG9_cutout_silhouette.webp
│  │     ├─ Byakuya_Kuchiki_cutout_silhouette.webp
│  │     ├─ Candice_Catnipp_cutout_silhouette.webp
│  │     ├─ Cang_Du_cutout_silhouette.webp
│  │     ├─ Charlotte_Chuhlhourne_cutout_silhouette.webp
│  │     ├─ Choe_Neng_Poww_cutout_silhouette.webp
│  │     ├─ Chojiro_Sasakibe_cutout_silhouette.webp
│  │     ├─ Cirucci_Sanderwicci_cutout_silhouette.webp
│  │     ├─ Coyote_Starrk_cutout_silhouette.webp
│  │     ├─ Cyan_Sung_Sun_cutout_silhouette.webp
│  │     ├─ Demoura_Zodd_cutout_silhouette.webp
│  │     ├─ Di_Roy_Rinker_cutout_silhouette.webp
│  │     ├─ Dondochakka_Bilstin_cutout_silhouette.webp
│  │     ├─ Don_Kanonji_cutout_silhouette.webp
│  │     ├─ Dordoni_Alessandro_Del_Socaccio_cutout_silhouette.webp
│  │     ├─ Driscoll_Berci_cutout_silhouette.webp
│  │     ├─ Edrad_Liones_cutout_silhouette.webp
│  │     ├─ Emilou_Apacci_cutout_silhouette.webp
│  │     ├─ Findorr_Calius_cutout_silhouette.webp
│  │     ├─ Franceska_Mila_Rose_cutout_silhouette.webp
│  │     ├─ Ganju_Shiba_cutout_silhouette.webp
│  │     ├─ Gantenbainne_Mosqueda_cutout_silhouette.webp
│  │     ├─ Genryusai_Shigekuni_Yamamoto_cutout_silhouette.webp
│  │     ├─ Genshiro_Okikiba_cutout_silhouette.webp
│  │     ├─ Gerard_Valkyrie_cutout_silhouette.webp
│  │     ├─ Ggio_Vega_cutout_silhouette.webp
│  │     ├─ Ginrei_Kuchiki_cutout_silhouette.webp
│  │     ├─ Gin_Ichimaru_cutout_silhouette.webp
│  │     ├─ Giriko_Kutsuzawa_cutout_silhouette.webp
│  │     ├─ Giselle_Gewelle_cutout_silhouette.webp
│  │     ├─ Grand_Fisher_cutout_silhouette.webp
│  │     ├─ Gremmy_Thoumeaux_cutout_silhouette.webp
│  │     ├─ Grimmjow_Jaegerjaquez_cutout_silhouette.webp
│  │     ├─ Guenael_Lee_cutout_silhouette.webp
│  │     ├─ Hachigen_Ushoda_cutout_silhouette.webp
│  │     ├─ Hanataro_Yamada_cutout_silhouette.webp
│  │     ├─ Hidetomo_Kajomaru_cutout_silhouette.webp
│  │     ├─ Hisana_Kuchiki_cutout_silhouette.webp
│  │     ├─ Hiyori_Sarugaki_cutout_silhouette.webp
│  │     ├─ Hiyosu_cutout_silhouette.webp
│  │     ├─ Hooleer_cutout_silhouette.webp
│  │     ├─ Ichibe'e_Hyosube_cutout_silhouette.webp
│  │     ├─ Ichigo_Kurosaki_cutout_silhouette.webp
│  │     ├─ Ikkaku_Madarame_cutout_silhouette.webp
│  │     ├─ Ikumi_Unagiya_cutout_silhouette.webp
│  │     ├─ Isane_Kotetsu_cutout_silhouette.webp
│  │     ├─ Isshin_Kurosaki_cutout_silhouette.webp
│  │     ├─ Isuzu_Ise_cutout_silhouette.webp
│  │     ├─ Izumi_Ishida_cutout_silhouette.webp
│  │     ├─ Izuru_Kira_cutout_silhouette.webp
│  │     ├─ Jackie_Tristan_cutout_silhouette.webp
│  │     ├─ James_cutout_silhouette.webp
│  │     ├─ Jerome_Guizbatt_cutout_silhouette.webp
│  │     ├─ Jidanbo_Ikkanzaka_cutout_silhouette.webp
│  │     ├─ Jinta_Hanakari_cutout_silhouette.webp
│  │     ├─ Jirobo_Ikkanzaka_cutout_silhouette.webp
│  │     ├─ Jugram_Haschwalth_cutout_silhouette.webp
│  │     ├─ Jushiro_Ukitake_cutout_silhouette.webp
│  │     ├─ Kagine_cutout_silhouette.webp
│  │     ├─ Kaien_Shiba_cutout_silhouette.webp
│  │     ├─ Kanae_Katagiri_cutout_silhouette.webp
│  │     ├─ Kaname_Tosen_cutout_silhouette.webp
│  │     ├─ Kaoru_Unagiya_cutout_silhouette.webp
│  │     ├─ Karin_Kurosaki_cutout_silhouette.webp
│  │     ├─ Keigo_Asano_cutout_silhouette.webp
│  │     ├─ Kenpachi_Kiganjo_cutout_silhouette.webp
│  │     ├─ Kenpachi_Zaraki_cutout_silhouette.webp
│  │     ├─ Kensei_Muguruma_cutout_silhouette.webp
│  │     ├─ Kirio_Hikifune_cutout_silhouette.webp
│  │     ├─ Kisuke_Urahara_cutout_silhouette.webp
│  │     ├─ Kiyone_Kotetsu_cutout_silhouette.webp
│  │     ├─ Kon_cutout_silhouette.webp
│  │     ├─ Kugo_Ginjo_cutout_silhouette.webp
│  │     ├─ Kukaku_Shiba_cutout_silhouette.webp
│  │     ├─ Kukkapuro_cutout_silhouette.webp
│  │     ├─ Lille_Barro_cutout_silhouette.webp
│  │     ├─ Liltotto_Lamperd_cutout_silhouette.webp
│  │     ├─ Lilynette_Gingerbuck_cutout_silhouette.webp
│  │     ├─ Lisa_Yadomaru_cutout_silhouette.webp
│  │     ├─ Loly_Aivirrne_cutout_silhouette.webp
│  │     ├─ Love_Aikawa_cutout_silhouette.webp
│  │     ├─ Loyd_Lloyd_cutout_silhouette.webp
│  │     ├─ Luders_Friegen_cutout_silhouette.webp
│  │     ├─ Luppi_Antenor_cutout_silhouette.webp
│  │     ├─ Mahana_Natsui_cutout_silhouette.webp
│  │     ├─ Marechiyo_Omaeda_cutout_silhouette.webp
│  │     ├─ Masaki_Kurosaki_cutout_silhouette.webp
│  │     ├─ Mashiro_Kuna_cutout_silhouette.webp
│  │     ├─ Mask_De_Masculine_cutout_silhouette.webp
│  │     ├─ Mayuri_Kurotsuchi_cutout_silhouette.webp
│  │     ├─ Meninas_McAllon_cutout_silhouette.webp
│  │     ├─ Menoly_Mallia_cutout_silhouette.webp
│  │     ├─ Michiru_Ogawa_cutout_silhouette.webp
│  │     ├─ Mimihagi_cutout_silhouette.webp
│  │     ├─ Miyako_Shiba_cutout_silhouette.webp
│  │     ├─ Mizuiro_Kojima_cutout_silhouette.webp
│  │     ├─ Moe_Shishigawara_cutout_silhouette.webp
│  │     ├─ Momo_Hinamori_cutout_silhouette.webp
│  │     ├─ Nakeem_Grindina_cutout_silhouette.webp
│  │     ├─ NaNaNa_Najahkoop_cutout_silhouette.webp
│  │     ├─ Nanao_Ise_cutout_silhouette.webp
│  │     ├─ Nelliel_Tu_Odelschwanck_cutout_silhouette.webp
│  │     ├─ Nemu_Kurotsuchi_cutout_silhouette.webp
│  │     ├─ Nianzol_Weizol_cutout_silhouette.webp
│  │     ├─ Niko_Kuna_cutout_silhouette.webp
│  │     ├─ Nirgge_Parduoc_cutout_silhouette.webp
│  │     ├─ Nnoitra_Gilga_cutout_silhouette.webp
│  │     ├─ Oetsu_Nimaiya_cutout_silhouette.webp
│  │     ├─ Orihime_Inoue_cutout_silhouette.webp
│  │     ├─ Oscar_Joaquin_De_La_Rosa_cutout_silhouette.webp
│  │     ├─ PePe_Waccabrada_cutout_silhouette.webp
│  │     ├─ Pernida_Parnkgjas_cutout_silhouette.webp
│  │     ├─ Pesche_Guatiche_cutout_silhouette.webp
│  │     ├─ Quilge_Opie_cutout_silhouette.webp
│  │     ├─ Rangiku_Matsumoto_cutout_silhouette.webp
│  │     ├─ Renji_Abarai_cutout_silhouette.webp
│  │     ├─ Retsu_Unohana_cutout_silhouette.webp
│  │     ├─ Rin_Tsubokura_cutout_silhouette.webp
│  │     ├─ Riruka_Dokugamine_cutout_silhouette.webp
│  │     ├─ Robert_Accutrone_cutout_silhouette.webp
│  │     ├─ Rojuro_Otoribashi_cutout_silhouette.webp
│  │     ├─ Royd_Lloyd_cutout_silhouette.webp
│  │     ├─ Rudbornn_Chelute_cutout_silhouette.webp
│  │     ├─ Rukia_Kuchiki_cutout_silhouette.webp
│  │     ├─ Runuganga_cutout_silhouette.webp
│  │     ├─ Ryuken_Ishida_cutout_silhouette.webp
│  │     ├─ Ryunosuke_Yuki_cutout_silhouette.webp
│  │     ├─ Sajin_Komamura_cutout_silhouette.webp
│  │     ├─ Senjumaru_Shutara_cutout_silhouette.webp
│  │     ├─ Sentaro_Kotsubaki_cutout_silhouette.webp
│  │     ├─ Shawlong_Koufang_cutout_silhouette.webp
│  │     ├─ Shinji_Hirako_cutout_silhouette.webp
│  │     ├─ Shino_Madarame_cutout_silhouette.webp
│  │     ├─ Shuhei_Hisagi_cutout_silhouette.webp
│  │     ├─ Shukuro_Tsukishima_cutout_silhouette.webp
│  │     ├─ Shunsui_Kyoraku_cutout_silhouette.webp
│  │     ├─ Shunzan_Kyoraku_cutout_silhouette.webp
│  │     ├─ Soken_Ishida_cutout_silhouette.webp
│  │     ├─ Sosuke_Aizen_cutout_silhouette.webp
│  │     ├─ Soul_King_cutout_silhouette.webp
│  │     ├─ Sui_Feng_cutout_silhouette.webp
│  │     ├─ Szayelaporro_Granz_cutout_silhouette.webp
│  │     ├─ Tatsufusa_Enjoji_cutout_silhouette.webp
│  │     ├─ Tatsuki_Arisawa_cutout_silhouette.webp
│  │     ├─ Tenjiro_Kirinji_cutout_silhouette.webp
│  │     ├─ Tesra_Lindocruz_cutout_silhouette.webp
│  │     ├─ Tessai_Tsukabishi_cutout_silhouette.webp
│  │     ├─ Tetsuzaemon_Iba_cutout_silhouette.webp
│  │     ├─ Tier_Harribel_cutout_silhouette.webp
│  │     ├─ Toshiro_Hitsugaya_cutout_silhouette.webp
│  │     ├─ Ulquiorra_Cifer_cutout_silhouette.webp
│  │     ├─ Ururu_Tsumugiya_cutout_silhouette.webp
│  │     ├─ Uryu_Ishida_cutout_silhouette.webp
│  │     ├─ Wonderweiss_Margela_cutout_silhouette.webp
│  │     ├─ Yachiru_Kusajishi_cutout_silhouette.webp
│  │     ├─ Yammy_Llargo_cutout_silhouette.webp
│  │     ├─ Yasochika_Iemura_cutout_silhouette.webp
│  │     ├─ Yasutora_Sado_cutout_silhouette.webp
│  │     ├─ Yhwach_cutout_silhouette.webp
│  │     ├─ Yoruichi_Shihoin_cutout_silhouette.webp
│  │     ├─ Yukio_Hans_Vorarlberna_cutout_silhouette.webp
│  │     ├─ Yumichika_Ayasegawa_cutout_silhouette.webp
│  │     ├─ Yushiro_Shihoin_cutout_silhouette.webp
│  │     ├─ Yuzu_Kurosaki_cutout_silhouette.webp
│  │     ├─ Yylfordt_Granz_cutout_silhouette.webp
│  │     ├─ Zangetsu_cutout_silhouette.webp
│  │     ├─ Zennosuke_Kurumadani_cutout_silhouette.webp
│  │     └─ Zommari_Rureaux_cutout_silhouette.webp
│  ├─ CLAUDE.md
│  ├─ eslint.config.mjs
│  ├─ next.config.ts
│  ├─ package.json
│  ├─ playwright-report
│  │  └─ index.html
│  ├─ playwright.config.ts
│  ├─ pnpm-lock.yaml
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
│  │  │  │  ├─ homepage_almighty.png
│  │  │  │  ├─ homepage_garganta.png
│  │  │  │  ├─ homepage_kurohitsugi.png
│  │  │  │  ├─ homepage_old.png
│  │  │  │  └─ homepage_zerodivision.png
│  │  │  ├─ tensazangetsu.png
│  │  │  └─ wallpapers
│  │  │     ├─ bg_wallpaper_1.jpg
│  │  │     ├─ bg_wallpaper_10.jpg
│  │  │     ├─ bg_wallpaper_11.jpg
│  │  │     ├─ bg_wallpaper_12.jpg
│  │  │     ├─ bg_wallpaper_13.jpg
│  │  │     ├─ bg_wallpaper_14.jpg
│  │  │     ├─ bg_wallpaper_15.jpg
│  │  │     ├─ bg_wallpaper_16.jpg
│  │  │     ├─ bg_wallpaper_17.jpg
│  │  │     ├─ bg_wallpaper_18.jpg
│  │  │     ├─ bg_wallpaper_19.jpg
│  │  │     ├─ bg_wallpaper_2.jpg
│  │  │     ├─ bg_wallpaper_20.jpg
│  │  │     ├─ bg_wallpaper_21.jpg
│  │  │     ├─ bg_wallpaper_22.jpg
│  │  │     ├─ bg_wallpaper_23.jpg
│  │  │     ├─ bg_wallpaper_24.jpg
│  │  │     ├─ bg_wallpaper_25.jpg
│  │  │     ├─ bg_wallpaper_26.jpg
│  │  │     ├─ bg_wallpaper_27.jpg
│  │  │     ├─ bg_wallpaper_28.jpg
│  │  │     ├─ bg_wallpaper_29.jpg
│  │  │     ├─ bg_wallpaper_3.jpg
│  │  │     ├─ bg_wallpaper_30.jpg
│  │  │     ├─ bg_wallpaper_31.jpg
│  │  │     ├─ bg_wallpaper_32.jpg
│  │  │     ├─ bg_wallpaper_33.jpg
│  │  │     ├─ bg_wallpaper_34.jpg
│  │  │     ├─ bg_wallpaper_35.jpg
│  │  │     ├─ bg_wallpaper_36.jpg
│  │  │     ├─ bg_wallpaper_37.jpg
│  │  │     ├─ bg_wallpaper_38.jpg
│  │  │     ├─ bg_wallpaper_39.jpg
│  │  │     ├─ bg_wallpaper_4.jpg
│  │  │     ├─ bg_wallpaper_40.jpg
│  │  │     ├─ bg_wallpaper_41.jpg
│  │  │     ├─ bg_wallpaper_5.jpg
│  │  │     ├─ bg_wallpaper_6.jpg
│  │  │     ├─ bg_wallpaper_7.jpg
│  │  │     ├─ bg_wallpaper_8.jpg
│  │  │     └─ bg_wallpaper_9.jpg
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
│  │  │  ├─ auth.ts
│  │  │  ├─ guess.ts
│  │  │  ├─ localStorage.ts
│  │  │  └─ summary.ts
│  │  ├─ data
│  │  │  ├─ characters.json
│  │  │  ├─ emoji-list.json
│  │  │  ├─ emojis.json
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
│  │  │  ├─ api
│  │  │  │  └─ clientFetch.ts
│  │  │  ├─ assets
│  │  │  │  └─ resolveAssetPath.ts
│  │  │  ├─ auth
│  │  │  │  ├─ hmac.ts
│  │  │  │  ├─ parseUserAgent.ts
│  │  │  │  ├─ resolvePlayer.ts
│  │  │  │  └─ verifySameOrigin.ts
│  │  │  ├─ debug
│  │  │  │  └─ logFullTarget.ts
│  │  │  ├─ guessGame
│  │  │  │  ├─ compareBinaryGuess.ts
│  │  │  │  ├─ createDailyGuessGameStore.ts
│  │  │  │  ├─ createUnlimitedGuessGameStore.ts
│  │  │  │  ├─ types.ts
│  │  │  │  └─ __tests__
│  │  │  │     └─ compareBinaryGuess.test.ts
│  │  │  ├─ moderation
│  │  │  │  └─ filterSoulName.ts
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
│  │  │  ├─ sync
│  │  │  │  ├─ clearAllLocalGameState.ts
│  │  │  │  ├─ completedSyncEvent.ts
│  │  │  │  ├─ fetchActiveRemoteProgress.ts
│  │  │  │  ├─ hydrateGuessEntries.ts
│  │  │  │  ├─ pullAndApplyMeta.ts
│  │  │  │  ├─ pullServerStats.ts
│  │  │  │  ├─ roundKey.ts
│  │  │  │  ├─ storageKeyMaps.ts
│  │  │  │  ├─ storeAccessMaps.ts
│  │  │  │  ├─ syncEngine.ts
│  │  │  │  ├─ syncProgressHelper.ts
│  │  │  │  └─ syncStateOnLoad.ts
│  │  │  ├─ test
│  │  │  │  └─ helpers
│  │  │  │     └─ selectSearchOption.ts
│  │  │  ├─ turnstile
│  │  │  │  └─ verifyTurnstileToken.ts
│  │  │  └─ utils
│  │  │     ├─ absolutePathEntities.ts
│  │  │     ├─ checking.ts
│  │  │     ├─ daily.ts
│  │  │     ├─ format.ts
│  │  │     ├─ generateCaseFileId.ts
│  │  │     ├─ isTouchDevice.ts
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
│  │  │  │  ├─ useDeviceBootstrap.ts
│  │  │  │  ├─ useManualResync.ts
│  │  │  │  ├─ useRaceEmblem.ts
│  │  │  │  ├─ useRemoteProgress.ts
│  │  │  │  ├─ useRemoteProgressSync.ts
│  │  │  │  ├─ useRouteLoadingStore.ts
│  │  │  │  ├─ useShareResultData.ts
│  │  │  │  ├─ useShareResultExport.ts
│  │  │  │  ├─ useSoulName.ts
│  │  │  │  ├─ useSyncStatus.ts
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
│  │  │     │  ├─ DeviceLinkButton.tsx
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
│  │  │     │  ├─ DeviceSyncProvider.tsx
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
│  │  │     ├─ pairing
│  │  │     │  ├─ DeviceManagementPanel.tsx
│  │  │     │  ├─ LastActiveIndicator.tsx
│  │  │     │  ├─ OtpCodeInput.tsx
│  │  │     │  ├─ PairingModal.tsx
│  │  │     │  ├─ RemoteProgressBanner.tsx
│  │  │     │  ├─ ResyncButton.tsx
│  │  │     │  ├─ SoulNameEditor.tsx
│  │  │     │  └─ SyncStatusBanner.tsx
│  │  │     ├─ ScaleFit.tsx
│  │  │     ├─ Sealed.tsx
│  │  │     ├─ summary
│  │  │     │  ├─ DailyResetTimer.tsx
│  │  │     │  ├─ IdentificationHistoryPanel.tsx
│  │  │     │  ├─ index.ts
│  │  │     │  ├─ NarrativeFlavorText.tsx
│  │  │     │  ├─ ShareResultButton.tsx
│  │  │     │  ├─ ShareResultCard.tsx
│  │  │     │  ├─ ShareResultPreviewModal.tsx
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
│  │     ├─ 07_rls_policies.sql
│  │     ├─ 08_pairing_schema.sql
│  │     ├─ 09_player_progress.sql
│  │     ├─ 10_replay_protection.sql
│  │     ├─ 11_pairing_create_cap.sql
│  │     ├─ 12_completion_and_reincarnation.sql
│  │     ├─ 13_pairing_hardening.sql
│  │     ├─ 14_soul_name_unification.sql
│  │     ├─ 15_pairing_full_carryover.sql
│  │     └─ 16_result_integrity_gate.sql
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
│  ├─ vercel.json
│  └─ vitest.config.ts
├─ DEPLOYMENT.md
└─ README.md

```