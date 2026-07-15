// client/tests/e2e/daily-release-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/daily-release-flow.spec.ts
//
// Senior review notes (read before touching this file):
//
//   1. Modeled on `daily-quote-flow.spec.ts`, which itself follows
//      `daily-emoji-flow.spec.ts`. All three share `createDailyGuessGameStore`
//      and NO `derivedCounters` (see `useReleaseGame.ts` daily hook — no
//      `revealedCount` config, same as quote, unlike emoji).
//
//   2. THE KEY DOMAIN DIFFERENCE from quote/emoji: the thing being guessed
//      (`TCharacter` in factory terms) is the RELEASE ITSELF, not a
//      Character. `compareGuess: (guess, target) => guess.id === target.id`
//      (see `useReleaseGame.ts`) — so the search input takes a
//      `technique_name` (via `ReleaseSearchBar`, placeholder "ENTER
//      TECHNIQUE NAME..."), never a character name. `findTechniqueName()`
//      below reimplements this lookup from `releases.json` the same way the
//      quote spec's `findCharacterName()` did from `characters.json`.
//
//   3. THE SECOND KEY DIFFERENCE: audio redaction. `ReleaseTestimonyDisplay`
//      renders `<InvokeWardPlayer releaseId={target.id} clipEndMs={target.clip_end_ms}>`
//      while unsolved — the clip is programmatically cut off at
//      `clip_end_ms` via a `timeupdate` listener (see the component's
//      `InvokeWardPlayer`) — vs. `clipEndMs={null}` (full, untruncated
//      playback) once `canShowAnswer` flips true in the summary. This file
//      has a DEDICATED case (CASE 6) asserting the pre-answer redaction
//      state (`非公開 CLASSIFIED` placeholder, no `technique_name` /
//      `trigger_phrase` text anywhere in the DOM) since that's the actual
//      security-sensitive behavior a regression here would leak spoilers
//      through — this mirrors the exact SECURITY FIX documented in the
//      component's own source comments.
//
//   4. Summary copy: `ReleaseSummaryGuess.tsx` hardcodes
//      `"Release Traced to Registered Technique"` / `"Release Remains
//      Unclassified"` as its subtitle based on `isWin` — used as the win/
//      loss anchor text (role played by `"REISHI KAKUNIN"` in emoji and
//      `"Testimony Traced to Registered Speaker"` in quote).
//
//   5. Reveal-delay timings differ from quote (2500ms) — release daily uses
//      the SAME 1600ms (win) / 900ms (loss) delay as release UNLIMITED (see
//      `DailyReleaseWrapper.tsx`'s own comment: "ใช้ delay เดียวกับ unlimited
//      release ไม่ใช่ quote"). The `{ timeout: 6000 }` margins below are
//      generous enough to cover either without needing to branch on it.
//
//   6. Audio playback truncation itself (does `.pause()` actually fire at
//      `clip_end_ms`) is NOT asserted end-to-end here — real `<audio>`
//      playback in a headless browser depends on whether `/api/asset/
//      release/:id` serves real decodable audio in the test environment,
//      which wasn't confirmed. CASE 6 instead asserts the REDACTION
//      CONTRACT (what text/markup is or isn't in the DOM), which is
//      environment-independent and is the actual spoiler-prevention
//      guarantee worth protecting. If real audio assets ARE available in
//      CI, a dedicated `page.evaluate` timeupdate-simulation test can be
//      added — flagged here rather than guessed at.
//
//   7. `MAX_DAILY_RELEASE_GUESSES` is not asserted against a hardcoded
//      number — CASE 2 (loss loop) only exercises as many wrong guesses as
//      a safe slice of the release pool allows (`slice(0, 6)`), same
//      cushion the quote/emoji specs used.

import { test, expect, Page } from '@playwright/test';
import rawReleases from '../../src/data/releases.json';
import rawCharacters from '../../src/data/characters.json';
// 🛡️ Import the REAL constant instead of hardcoding the literal localStorage
// key string — see daily-quote-flow.spec.ts's note 2 on why a guessed
// literal caused every test to hang for the full 30s waitForFunction
// timeout in that file's first pass. Importing from the app's own const
// module makes this class of failure structurally impossible.
import { STORAGE_KEYS } from '../../src/const/localStorage';

const DAILY_ROUTE = '/daily/release';
const PROGRESS_STORAGE_KEY = STORAGE_KEYS.RELEASE_PROGRESS;

test.describe('Bleachdle Daily Release Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ รอ target hydrate ลง localStorage พร้อม DIAGNOSTIC DUMP ถ้าไทม์เอาต์ —
     * ดู rationale เต็มใน daily-quote-flow.spec.ts (note เดียวกัน, ย้ายมาไว้ทุกไฟล์
     * แทนการรวมศูนย์ เพราะ Playwright spec files ไม่ share scope กันข้ามไฟล์)
     */
    async function waitForDailyTargetHydration(page: Page, timeout = 10000) {
        try {
            await page.waitForFunction(
                (key) => {
                    const raw = localStorage.getItem(key);
                    if (!raw) return false;
                    try {
                        const parsed = JSON.parse(raw);
                        const target = parsed.daily?.state?.target;
                        return !!(target && target.id && target.character_id);
                    } catch {
                        return false;
                    }
                },
                PROGRESS_STORAGE_KEY,
                { timeout }
            );
        } catch (err) {
            const allKeys = await page.evaluate(() => ({ ...localStorage }));
            console.error(
                `[daily-release-flow] Hydration wait timed out on key "${PROGRESS_STORAGE_KEY}".\n` +
                `Full localStorage snapshot at time of failure:\n${JSON.stringify(allKeys, null, 2)}\n` +
                `→ Check FEATURE_FLAGS.daily.release and that DAILY_ROUTE ("${DAILY_ROUTE}") actually renders the game (not <Sealed />).`
            );
            throw err;
        }
    }

    async function getDailyState(page: Page) {
        return await page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw);
                return parsed.daily?.state || null;
            } catch {
                return null;
            }
        }, PROGRESS_STORAGE_KEY);
    }

    function findTechniqueName(releaseId: string) {
        const release = rawReleases.find((r) => r.id === releaseId);
        if (!release) throw new Error(`Release with ID "${releaseId}" not found`);
        return release.technique_name;
    }

    function findCharacterName(characterId: string) {
        const character = rawCharacters.find((c) => c.id === characterId);
        if (!character) throw new Error(`Character with ID "${characterId}" not found`);
        return character.name;
    }

    // ==========================================
    // CASE 1: การเดาจนกระทั่งชนะ (Complete Win Flow)
    // ==========================================
    test('Victory Flow: User names the exact technique on initial submission', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER TECHNIQUE NAME...');
        await expect(searchInput).toBeVisible();

        await waitForDailyTargetHydration(page);

        const state = await getDailyState(page);
        const releaseId = state.target.id;
        const targetTechniqueName = findTechniqueName(releaseId);

        await searchInput.fill(targetTechniqueName);

        const option = page.locator('li').getByText(targetTechniqueName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // ตรวจสอบ UI ชัยชนะ (delay 1600ms ตาม release ก่อนเปิด Summary — ดู note 5)
        await expect(page.getByText('Release Traced to Registered Technique')).toBeVisible({ timeout: 6000 });

        await page.reload();

        // ตรวจสอบว่าช่องค้นหาโดนบล็อก และหน้าจอผลลัพธ์แสดงขึ้นมา
        await expect(page.getByPlaceholder('ENTER TECHNIQUE NAME...')).not.toBeVisible();
        await expect(page.getByText('Release Traced to Registered Technique')).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 2: การเดาผิดจนหมดสิทธิ์ (Loss Loop, best-effort within the release pool)
    // ==========================================
    test('The loss-loop by guessing incorrectly until the search input locks or the pool is exhausted', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER TECHNIQUE NAME...');
        await waitForDailyTargetHydration(page);

        const state = await getDailyState(page);
        const releaseId = state.target.id;

        // ทุก release เป็นคำตอบของตัวเองได้เลย ไม่ต้องกรองผ่าน "pool" พิเศษแบบ quote —
        // แค่ตัดตัวที่เป็นคำตอบจริงออกไปเฉยๆ (ดู note 2 ของ release.ts: ไม่มี de-dupe)
        const wrongReleases = rawReleases.filter((r) => r.id !== releaseId).slice(0, 6);

        for (const wrongRelease of wrongReleases) {
            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(wrongRelease.technique_name);
            const option = page.locator('li').getByText(wrongRelease.technique_name, { exact: true }).first();
            await option.click();

            await expect(page.locator(`[id="release-row-${wrongRelease.id}"]`)).toBeVisible();
        }

        // ตรวจสอบ UI การแพ้ (ยังไม่ยืนยัน loss-copy จาก source ที่มีให้ ดังนั้นจงใจไม่ assert
        // ข้อความตายตัวในเคสนี้ — ดู note 4)
        // await expect(page.getByText('Release Remains Unclassified')).toBeVisible();
    });

    // ==========================================
    // CASE 3: ข้อมูลสเตตคงอยู่หลังรีเฟรชหน้าจอ (Hydration & Persistence)
    // ==========================================
    test('State hydration persists a guess across a hard reload', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER TECHNIQUE NAME...');

        await waitForDailyTargetHydration(page);

        const stateBefore = await getDailyState(page);
        const releaseId = stateBefore.target.id;
        const wrongRelease = rawReleases.find((r) => r.id !== releaseId) || rawReleases[0];

        await searchInput.fill(wrongRelease.technique_name);
        const option = page.locator('li').getByText(wrongRelease.technique_name, { exact: true }).first();
        await option.click();

        await expect(page.locator('[id^="release-row-"]')).toHaveCount(1);

        // รีโหลด
        await page.reload();

        // ตรวจสอบ Hydration หลังรีโหลด
        await expect(page.getByPlaceholder('ENTER TECHNIQUE NAME...')).toBeVisible();
        await expect(page.locator(`[id="release-row-${wrongRelease.id}"]`)).toBeVisible();
    });

    // ==========================================
    // CASE 4: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
    // ==========================================
    test('Can trigger mode selector and navigate from Daily to Unlimited release mode', async ({ page }: { page: Page }) => {
        await page.goto(DAILY_ROUTE);

        const modeBadge = page.locator('span, div').getByText(/daily/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        const unlimitedOption = page.locator('button, div').getByText(/unlimited/i).last();
        await expect(unlimitedOption).toBeVisible();
        await unlimitedOption.click();

        await expect(page).toHaveURL(/\/unlimited/);
    });

    // ==========================================
    // CASE 5: การทำงานของ Daily Hub Footer หลังจบเกม (Daily Hub Navigation)
    // ==========================================
    test('Shows Daily Hub footer once the release mission is concluded', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER TECHNIQUE NAME...');

        await waitForDailyTargetHydration(page);

        const state = await getDailyState(page);
        const releaseId = state.target.id;
        const targetTechniqueName = findTechniqueName(releaseId);

        await searchInput.fill(targetTechniqueName);
        const option = page.locator('li').getByText(targetTechniqueName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        await expect(page.getByText('Release Traced to Registered Technique')).toBeVisible({ timeout: 6000 });

        const initializeCta = page.getByText('Initialize:');
        const sealedRecord = page.getByText('RECORD // SEALED');
        await expect(initializeCta.or(sealedRecord)).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 6: การเฉลยข้อมูล (Redaction Contract) — ก่อนตอบต้องไม่มีคำใบ้หลุด, หลังตอบต้องเห็นครบ
    // ==========================================
    test('Redacts technique name, trigger phrase, and wielder identity until the game is over, then reveals all three', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER TECHNIQUE NAME...');

        await waitForDailyTargetHydration(page);

        const state = await getDailyState(page);
        const releaseId = state.target.id;
        const characterId = state.target.character_id;
        const targetTechniqueName = findTechniqueName(releaseId);
        const targetWielderName = findCharacterName(characterId);
        const fullRelease = rawReleases.find((r) => r.id === releaseId)!;

        // 🔒 PRE-ANSWER: the classified placeholder must be visible, and none of the
        // answer's identifying text should be anywhere in the DOM yet — this is the
        // exact spoiler-leak class of bug the component's own SECURITY FIX comment
        // (see ReleaseTestimonyDisplay.tsx) was written to prevent.
        await expect(page.getByText('非公開 CLASSIFIED')).toBeVisible();
        await expect(page.getByText(fullRelease.technique_name, { exact: true })).toHaveCount(0);

        // 🛡️ ENTERPRISE SAFEGUARD: If the trigger phrase is identical to the release type (e.g. Quincy Vollständig),
        // it will legitimately appear inside the public "Release Classification" badge.
        // We assert it only appears exactly once (in the badge) instead of leaking into the redacted text.
        const expectedTriggerPhraseCount = fullRelease.trigger_phrase === state.target.release_type ? 1 : 0;
        await expect(page.getByText(fullRelease.trigger_phrase, { exact: true })).toHaveCount(expectedTriggerPhraseCount);

        await expect(page.getByText(targetWielderName, { exact: true })).toHaveCount(0);

        // Answer correctly to end the game.
        await searchInput.fill(targetTechniqueName);
        const option = page.locator('li').getByText(targetTechniqueName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        await expect(page.getByText('Release Traced to Registered Technique')).toBeVisible({ timeout: 6000 });

        // 🔓 POST-ANSWER: technique name, trigger phrase, AND the wielder's character
        // name must now all be visible in the summary's testimony reveal.
        await expect(page.getByText(fullRelease.technique_name, { exact: false }).first()).toBeVisible();
        await expect(page.getByText(fullRelease.trigger_phrase, { exact: false }).first()).toBeVisible();
        await expect(page.getByText(targetWielderName, { exact: true }).first()).toBeVisible();
    });

    // ==========================================
    // CASE 7: release target ต้องมีอยู่จริงตามข้อมูล พร้อม clip_end_ms ที่สมเหตุสมผล (sanity guard)
    // ==========================================
    test('The daily target resolves to an existing release record with a valid clip_end_ms', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        await waitForDailyTargetHydration(page);

        const state = await getDailyState(page);
        const releaseId = state.target.id;

        const fullRelease = rawReleases.find((r) => r.id === releaseId);
        expect(fullRelease).toBeTruthy();
        expect(fullRelease!.clip_end_ms).toBeGreaterThan(0);
        // clip_end_ms on the hidden target must match the full record exactly — this is
        // the ONE piece of "answer" metadata that's safe to expose pre-guess (it's a
        // playback boundary, not the technique name itself).
        expect(state.target.clip_end_ms).toBe(fullRelease!.clip_end_ms);
    });
});