# CI/CD — BLEACHDLE

## Architecture

Two systems, each doing the job it's actually good at — don't make them fight:

- **GitHub Actions = CI (quality gate).** Lint, type check, character-data
  integrity, build verification, CodeQL security scan. Nothing here talks to
  Vercel or touches production.
- **Vercel's native Git integration = CD (build + deploy).** Every push gets
  a build; every PR gets a real preview URL commented automatically; every
  merge to `main` promotes to production. Do **not** duplicate this with a
  `vercel deploy` step in Actions — two systems building/deploying the same
  commit just doubles build minutes and gives you two sources of truth for
  "did this deploy."

The two are linked by **branch protection**, not by a workflow calling the
other: `main` requires the CI workflow to pass before a PR can merge, so
nothing broken ever reaches the branch Vercel treats as production.

```
PR opened → CI (lint/typecheck/build/CodeQL) runs in parallel with
            Vercel's own preview build (also triggered by the PR)
          → both show up as checks on the PR
          → merge blocked until CI is green (Vercel preview failing
            is informative but not required — see note below)
merge to main → Vercel production build/deploy fires automatically
```

## 1. Files in this drop

```
.github/workflows/ci.yml       # lint, typecheck, character-data check, build
.github/workflows/codeql.yml   # static security analysis, PR + weekly
.github/dependabot.yml         # weekly dependency PRs (pnpm deps in client/, + Actions)
```

Copy the `.github/` folder into the **repo root** (`bleachdle/.github/`, as a
sibling of `client/`, not inside it) and push. `ci.yml` already sets
`working-directory: client` for every step since that's where
`pnpm-workspace.yaml`, `package.json`, and the app live.

## 2. Vercel project settings

Since the app isn't at the repo root, this is the one setting that trips
people up on this layout:

| Setting | Value |
|---|---|
| Root Directory | `client` |
| Framework Preset | Next.js (auto-detected) |
| Install Command | `pnpm install` (default, fine as-is) |
| Build Command | `pnpm build` (default, fine as-is) |
| Node.js Version | 20.x |

Set once under **Project Settings → General → Root Directory**. Without it,
Vercel tries to build from the repo root and won't find `package.json`.

## 3. Secrets

**GitHub (Settings → Secrets and variables → Actions):**

| Secret | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `build` job in `ci.yml`, so the CI build exercises real env-dependent code paths |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |

Both are optional — `ci.yml` falls back to placeholder values if unset, so CI
still runs green on a fresh fork. Add the real values once you want CI's
build step to match production behavior exactly.

**Vercel (Project Settings → Environment Variables):** whatever the app
already reads at runtime — Supabase URL/anon key, Turnstile site/secret key
(currently disabled per the roadmap, but the env vars can stay wired),
Sentry DSN if configured. Set per-environment (Production / Preview /
Development) as appropriate — most of these are safe to share across all
three; anything genuinely production-only should be scoped to Production.

## 4. Branch protection (do this once, in GitHub UI)

Settings → Branches → Add rule for `main`:

- Require a pull request before merging
- Require status checks to pass before merging → select **`CI success`**
  (the final job in `ci.yml` — it fans out to lint/typecheck/character-data/
  build and only goes green if all of them do, so it's the one check you
  need to require)
- Optionally require **CodeQL**'s check too if you want security findings to
  block merge rather than just get reported
- Require branches to be up to date before merging (optional, keeps the
  build job honest against the latest `main`)

Vercel's own preview-build check will also appear on the PR — leave it
**not required**. It's genuinely useful signal (broken preview = don't
merge), but making it a hard gate means a transient Vercel infra hiccup can
block an otherwise-good PR. CI (which you control and can re-run for free)
is the gate; Vercel's check is the second opinion.

## 5. What's intentionally out of scope here

- **Rollback:** Vercel keeps every deployment; "Promote to Production" on a
  prior deployment from the dashboard is the fastest rollback path — no
  Action needed for this.
- **Testing suite (unit/integration):** the README's own roadmap defers this
  until `characters.json`/entity schemas stabilize post-Supabase-migration.
  `ci.yml` has a natural slot for it (a `test` job feeding into `ci-status`,
  same shape as `lint`/`typecheck`) — add it there once tests exist rather
  than scaffolding an empty test job now.
- **Rate limiting on game APIs, Turnstile re-enable, Supabase migration:**
  application-level roadmap items, not CI/CD concerns.