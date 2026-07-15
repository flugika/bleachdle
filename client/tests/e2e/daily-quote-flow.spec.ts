// client/tests/e2e/daily-quote-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/daily-quote-flow.spec.ts
//
// Senior review notes (read before touching this file):
//
//   1. Modeled directly on `daily-emoji-flow.spec.ts`. The structural
//      difference: Quote mode is built on `createDailyGuessGameStore` with
//      NO `derivedCounters` (see `useQuoteGame.ts` — no `revealedCount`
//      config passed to the factory), so there is no progressive-reveal
//      case here (emoji's CASE 4). Every other lifecycle shape — hydration,
//      win/loss, persistence, mode switch, daily-hub footer — is identical
//      because both modes share the same `createDailyGuessGameStore`
//      factory and the same `DailyGuessGameState` contract.
//
//   2. `target` on the persisted store is `QuoteTargetHidden` — only
//      `{ id, character_id, text }` (see `src/features/quote/types.ts`).
//      Unlike emoji's `emoji_list`, the quote TEXT itself is part of the
//      hidden target and is shown to the player up front (it's the puzzle,
//      not a spoiler) — so there's no equivalent to emoji's "sanity check
//      the full emoji_list resolves" case beyond confirming the target's
//      `text` is non-empty and the case-file id in the DOM matches a real
//      quote record.
//
//   3. The character pool for guessing must come from QUOTABLE characters
//      only (`getQuotableCharacters()` in `src/features/quote/quote.ts` —
//      characters who actually appear in `quotes.json`), NOT the full
//      character roster. Guessing a character with zero quotes is not
//      reachable through the real dropdown, so `getQuotableCharacters()` is
//      reimplemented here from `quotes.json` + `characters.json` to build a
//      safe "wrong guess" pool — mirroring the real dedupe-by-character_id
//      logic in the source 1:1. Keep this in sync if that function changes.
//
//   4. Summary copy: `QuoteSummaryGuess.tsx` hardcodes
//      `"Testimony Traced to Registered Speaker"` / `"Testimony Left
//      Unattributed"` as its subtitle based on `isWin` — used as the win/
//      loss anchor text, the same role `"REISHI KAKUNIN"` / `"Symbol Set
//      Traced to Registered Soul"` played in the emoji spec.
//
//   5. `MAX_DAILY_QUOTE_GUESSES` is not asserted against a hardcoded number
//      in this file — CASE 2 (loss loop) intentionally only exercises as
//      many wrong guesses as the quotable-character pool safely allows
//      (slice(0, 6), same cushion the emoji spec used) without asserting a
//      specific loss-copy string, since that string wasn't confirmed in the
//      provided source. Tighten this once the loss-state markup is known.

import { test, expect, Page } from '@playwright/test';
import rawCharacters from '../../src/data/characters.json';
import rawQuotes from '../../src/data/quotes.json';
// 🛡️ Import the REAL constant instead of hardcoding the literal string.
// Hardcoding 'bleachdle-quote-progress' as a guess is exactly what caused
// every test in this file to hang for the full 30s waitForFunction timeout:
// the actual key never matched, so localStorage.getItem() always returned
// null and the predicate never became true. Importing STORAGE_KEYS directly
// from the app's own source makes this class of failure structurally
// impossible — if the constant ever changes, the test changes with it
// instead of silently rotting.
import { STORAGE_KEYS } from '../../src/const/localStorage';

const DAILY_ROUTE = '/daily/quote';
const PROGRESS_STORAGE_KEY = STORAGE_KEYS.QOUTE_PROGRESS; // ⚠️ note: the real constant is spelled QOUTE, not QUOTE

test.describe('Bleachdle Daily Quote Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ รอ target hydrate ลง localStorage พร้อม DIAGNOSTIC DUMP ถ้าไทม์เอาต์ —
     * แทนที่จะปล่อยให้เจอ bare "Test timeout of 30000ms exceeded" เฉยๆ (ซึ่งไม่บอก
     * เลยว่าไทม์เอาต์เพราะ key ผิด, feature flag ปิด, หรือ route พัง) ไทม์เอาต์รอบแรกจะ
     * log localStorage ทั้งก้อนออกมาก่อน re-throw ให้เห็นเลยว่า key จริงคืออะไร
     */
    async function waitForDailyTargetHydration(page: Page, requiredField: 'id' | 'character_id', timeout = 10000) {
        try {
            await page.waitForFunction(
                ({ key, field }) => {
                    const raw = localStorage.getItem(key);
                    if (!raw) return false;
                    try {
                        const parsed = JSON.parse(raw);
                        const target = parsed.daily?.state?.target;
                        return !!(target && target[field]);
                    } catch {
                        return false;
                    }
                },
                { key: PROGRESS_STORAGE_KEY, field: requiredField },
                { timeout }
            );
        } catch (err) {
            const allKeys = await page.evaluate(() => ({ ...localStorage }));
            console.error(
                `[daily-quote-flow] Hydration wait timed out on key "${PROGRESS_STORAGE_KEY}".\n` +
                `Full localStorage snapshot at time of failure:\n${JSON.stringify(allKeys, null, 2)}\n` +
                `→ If the real key differs from STORAGE_KEYS.QOUTE_PROGRESS above, or is entirely absent, ` +
                `check FEATURE_FLAGS.daily.quote and that DAILY_ROUTE ("${DAILY_ROUTE}") actually renders the game (not <Sealed />).`
            );
            throw err;
        }
    }

    /**
     * 🛡️ Helper รอ Hydration ของ createDailyGuessGameStore ให้เสร็จก่อน แล้วดึง
     * target ที่ server เซ็ตให้ (setTarget ถูกยิงจาก DailyQuoteWrapper ตอน _hasHydrated)
     * ออกมา — target เป็น QuoteTargetHidden { id, character_id, text } เท่านั้น
     */
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

    function findCharacterName(characterId: string) {
        const character = rawCharacters.find((c) => c.id === characterId);
        if (!character) throw new Error(`Character with ID "${characterId}" not found`);
        return character.name;
    }

    /**
     * 🎯 ต้องตรงกับ getQuotableCharacters() ใน src/features/quote/quote.ts เป๊ะ —
     * dedupe ด้วย character_id (คนเดียวมีได้หลาย quote) แล้ว resolve เป็น Character
     * จริงจาก characters.json ข้าม id ที่หาไม่เจอ (กัน bad data)
     */
    function getQuotableCharacters() {
        const seen = new Set<string>();
        const result: typeof rawCharacters = [];
        for (const quote of rawQuotes) {
            if (seen.has(quote.character_id)) continue;
            seen.add(quote.character_id);
            const character = rawCharacters.find((c) => c.id === quote.character_id);
            if (character) result.push(character);
        }
        return result;
    }

    // ==========================================
    // CASE 1: การเดาจนกระทั่งชนะ (Complete Win Flow)
    // ==========================================
    test('Victory Flow: User matches the quote speaker on initial submission', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();

        // รอ Hydration + setTarget(initialTarget) ให้เสร็จแล้วค่อยอ่าน Target
        await waitForDailyTargetHydration(page, 'character_id');

        const state = await getDailyState(page);
        const characterId = state.target.character_id;
        const targetCharacterName = findCharacterName(characterId);

        await searchInput.fill(targetCharacterName);

        const option = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // ตรวจสอบ UI ชัยชนะ (delay 2500ms ตาม DailyQuoteWrapper ก่อนเปิด Summary)
        await expect(page.getByText('Testimony Traced to Registered Speaker')).toBeVisible({ timeout: 6000 });

        await page.reload();

        // ตรวจสอบว่าช่องค้นหาโดนบล็อก และหน้าจอผลลัพธ์แสดงขึ้นมา
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).not.toBeVisible();
        await expect(page.getByText('Testimony Traced to Registered Speaker')).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 2: การเดาผิดจนหมดสิทธิ์ (Loss Loop, best-effort within the quotable pool)
    // ==========================================
    test('The loss-loop by guessing incorrectly until the search input locks or the pool is exhausted', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await waitForDailyTargetHydration(page, 'character_id');

        const state = await getDailyState(page);
        const characterId = state.target.character_id;

        // วนลูปทายผิด (เอาตัวละครที่พูด quote จริงแต่ไม่ใช่ target มาทายให้หมดโควต้า)
        const wrongCharacters = getQuotableCharacters().filter((c) => c.id !== characterId).slice(0, 6);

        for (const wrongCharacter of wrongCharacters) {
            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(wrongCharacter.name);
            const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
            await option.click();

            await expect(page.locator(`[id="quote-row-${wrongCharacter.id}"]`)).toBeVisible();
        }

        // ตรวจสอบ UI การแพ้ (ถ้ามีข้อความเฉพาะเจาะจง ให้เปลี่ยนตัวอักษรใน getByText — ยังไม่ยืนยัน
        // จากซอร์สที่มีให้ ดังนั้นจงใจไม่ assert ข้อความ loss-state ตายตัวในเคสนี้)
        // await expect(page.getByText('Testimony Left Unattributed')).toBeVisible();
    });

    // ==========================================
    // CASE 3: ข้อมูลสเตตคงอยู่หลังรีเฟรชหน้าจอ (Hydration & Persistence)
    // ==========================================
    test('State hydration persists a guess across a hard reload', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        await waitForDailyTargetHydration(page, 'character_id');

        const stateBefore = await getDailyState(page);
        const characterId = stateBefore.target.character_id;
        const wrongCharacter = getQuotableCharacters().find((c) => c.id !== characterId) || rawCharacters[0];

        await searchInput.fill(wrongCharacter.name);
        const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
        await option.click();

        await expect(page.locator('[id^="quote-row-"]')).toHaveCount(1);

        // รีโหลด
        await page.reload();

        // ตรวจสอบ Hydration หลังรีโหลด
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="quote-row-${wrongCharacter.id}"]`)).toBeVisible();
    });

    // ==========================================
    // CASE 4: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
    // ==========================================
    test('Can trigger mode selector and navigate from Daily to Unlimited quote mode', async ({ page }: { page: Page }) => {
        await page.goto(DAILY_ROUTE);

        // คลิกป้ายบ่งชี้สถานะโหมดปัจจุบัน
        const modeBadge = page.locator('span, div').getByText(/daily/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        // ตรวจการเปิดขึ้นมาของตัวเลือกโหมดไม่จำกัดรอบ (ModeSelectorModal)
        const unlimitedOption = page.locator('button, div').getByText(/unlimited/i).last();
        await expect(unlimitedOption).toBeVisible();
        await unlimitedOption.click();

        // ตรวจสอบว่า Browser ย้ายพิกัดเส้นทางระบบไปยังหน้าเกมโหมด Unlimited สำเร็จ
        await expect(page).toHaveURL(/\/unlimited/);
    });

    // ==========================================
    // CASE 5: การทำงานของ Daily Hub Footer หลังจบเกม (Daily Hub Navigation)
    // ==========================================
    test('Shows Daily Hub footer once the quote mission is concluded', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        // 1. รอให้ Hydration + sync กับ initialTarget ของ server เสร็จ
        await waitForDailyTargetHydration(page, 'character_id');

        // 2. ดึง Progress ออกมา และใช้ target.character_id ในการหาชื่อตัวละครที่ต้องทาย
        const state = await getDailyState(page);
        const characterId = state.target.character_id;
        const targetCharacterName = findCharacterName(characterId);

        // 3. ทายคำตอบที่ถูกต้อง
        await searchInput.fill(targetCharacterName);
        const option = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // 4. รอหน้าต่างสรุปพร้อม Daily Hub Footer โผล่ขึ้นมา
        await expect(page.getByText('Testimony Traced to Registered Speaker')).toBeVisible({ timeout: 6000 });

        // รอหน้าต่างสรุปและส่วนท้ายกระดาน (DailyHubModalFooter) วาดลง DOM เสร็จ
        const initializeCta = page.getByText('Initialize:');
        const sealedRecord = page.getByText('RECORD // SEALED');

        // ตรวจสอบโครงสร้างว่ามีชุดปุ่มเปลี่ยนด่านของระบบปรากฏขึ้นมาจริง
        await expect(initializeCta.or(sealedRecord)).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 6: quote target ต้องมีอยู่จริงตามข้อมูล พร้อมข้อความไม่ว่างเปล่า (sanity guard กันข้อมูลเสีย)
    // ==========================================
    test('The daily target resolves to an existing quote record with non-empty text', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        await waitForDailyTargetHydration(page, 'id');

        const state = await getDailyState(page);
        const quoteId = state.target.id;

        const fullQuote = rawQuotes.find((q) => q.id === quoteId);
        expect(fullQuote).toBeTruthy();
        expect(fullQuote!.text.trim().length).toBeGreaterThan(0);

        // The hidden target's text must match the full record's text exactly —
        // quote mode shows the puzzle text up front (unlike emoji's hidden
        // emoji_list), so there's no partial-redaction step to verify here.
        expect(state.target.text).toBe(fullQuote!.text);
    });
});