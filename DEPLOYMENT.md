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

---

## 6. Local dev workflow (before CI even sees it)

CI is the gate, but running the same checks locally first means you catch
problems before pushing — faster feedback, fewer wasted CI minutes, and no
"fix lint" follow-up commits cluttering the PR.

### 6.1 Standard loop for any change

```bash
# from client/
pnpm lint
pnpm test
pnpm build
```

Run all three before pushing. `pnpm build` matters even for small changes —
type errors and import issues sometimes only surface at build time, not in
`pnpm lint` or in editor tooling.

### 6.2 Starting a new feature/fix — branch hygiene

Always branch from an up-to-date `main`. Never branch from another feature
branch unless you specifically mean to stack work on it.

```bash
git checkout main
git pull origin main
git checkout -b fix/short-description
```

Why `pull` before `checkout -b`: branching off a stale local `main` means
the new branch is already missing recent commits, which just means bigger
conflicts later when merging `main` back in.

### 6.3 While working — keep the branch in sync

For anything longer-lived than a day or two, merge `main` in periodically
instead of letting the branch drift for weeks and facing one huge conflict
at the end:

```bash
git checkout main
git pull origin main
git checkout fix/short-description
git merge main
# resolve any conflicts now, while they're small
```

### 6.4 Before pushing / opening a PR

```bash
pnpm lint
pnpm test
pnpm build

git checkout main
git pull origin main
git checkout fix/short-description
git merge main
# resolve conflicts if any → git add → git commit

git push origin fix/short-description
```

Open the PR on GitHub. CI (`ci.yml`) and Vercel's preview build both kick
off automatically — no extra step needed on your end.

### 6.5 Merging the PR

- Wait for **`CI success`** to go green (required check per §4).
- Vercel preview failing is worth a look but isn't blocking — use judgment.
- Use **Squash and merge**. This repo's branches often accumulate messy
  intermediate commits (WIP fixes, merge-main-back-in commits, etc.) —
  squashing means `main` gets one clean commit per PR regardless of what
  happened inside the branch.
- Delete the branch after merging (GitHub prompts for this automatically).

### 6.6 After merge

```bash
git checkout main
git pull origin main
git branch -d fix/short-description
```

Back to §6.2 for the next piece of work — always fresh off `main`, never off
whatever branch you happened to be sitting on.

### 6.7 Rules of thumb / things that have caused pain before

- **Never** run `git checkout -b` from a branch other than `main` unless
  intentional — the new branch inherits that branch's entire history, which
  is how PRs end up with 15+ unrelated-looking commits.
- **Never** click VS Code's "Sync Changes" button while a merge/conflict is
  in progress — depending on `pull.rebase` config it can kick off a rebase
  on top of an unfinished merge and leave the repo in a confusing state.
  Resolve via terminal (`git status` → fix → `git add` → `git commit`) when
  a merge is underway.
- **Never** switch branches or run `git pull` mid-conflict. Finish resolving
  (`add` + `commit`, or `merge --abort` / `rebase --abort` to bail out
  cleanly) before doing anything else.
- When unsure what state the repo is in, `git status` first. It tells you
  directly if there's an unfinished merge or rebase — don't guess.
- If things get tangled beyond a quick fix, aborting back to a clean state
  and redoing the merge is faster and safer than untangling it live:
  ```bash
  git merge --abort      # if mid-merge
  git rebase --abort     # if mid-rebase
  git status             # confirm it's clean before retrying
  ```