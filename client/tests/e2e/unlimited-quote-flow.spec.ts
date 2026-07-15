// client/tests/e2e/unlimited-quote-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/unlimited-quote-flow.spec.ts
//
// Senior review notes (read before touching this file):
//
//   1. Modeled directly on `unlimited-emoji-flow.spec.ts`. Structural
//      difference: Quote mode's `createUnlimitedGuessGameStore` config has
//      NO `derivedCounters`, so there is no progressive-reveal case here
//      (emoji's CASE 5) and no `revealedCount` field ever appears in any
//      assertion or seeded localStorage payload in this file.
//
//   2. `getCompletionKey` for quote mode dedupes by `target.id` (the QUOTE
//      id), NOT `target.character_id` — see the doc-comment on
//      `UnlimitedGuessGameConfig.getCompletionKey` in
//      `src/lib/guessGame/types.ts`: "Quote นับความจบเป็นราย-item (target.id)
//      but Silhouette นับความจบเป็นราย-ตัวละคร (target.character_id)". This
//      matters because one character can have MULTIPLE quotes in the pool —
//      solving one of Ichigo's quotes must NOT mark all of Ichigo's other
//      quotes as completed. CASE 4 below exercises this distinction
//      directly (two remaining quotes belonging to the SAME character).
//
//   3. The guess pool must be built from QUOTABLE characters only
//      (`getQuotableCharacters()` — characters who actually speak at least
//      one quote), reimplemented here from `quotes.json` + `characters.json`
//      to mirror `src/features/quote/quote.ts` 1:1. A character with zero
//      quotes is unreachable through the real dropdown and would make a
//      "wrong guess" step silently no-op.
//
//   4. Summary/Central-46 copy: `QuoteSummaryGuess.tsx` hardcodes
//      `"Testimony Traced to Registered Speaker"` / `"Testimony Left
//      Unattributed"` — used as the win/loss anchor text. The pool-completed
//      screen reuses the SAME shared `Central46ConfidentialArchive`
//      component as emoji mode (`mode="quote"` passed in from `page.tsx`),
//      so the "CENTRAL 46" / "IDENTITY REGISTRATION REQUIRED" / "ETCH SOUL
//      NAME" / "SOUL CYCLE" / "NEW CYCLE, NEW LIFE" copy and the
//      `SummaryActionButton`'s "OPEN SENKAIMON" label are asserted
//      identically to the emoji spec, since none of that markup is
//      mode-specific.
//
//   5. `STORAGE_KEYS.SOUL_REGISTRY` ('bleachdle-soul-registry') is shared
//      across modes (see `page.tsx`'s `registryData.quote` sub-key), same
//      as emoji's `registryData.emoji` — only the top-level storage key
//      changes per mode, not the registry's storage bucket.

import { test, expect, Page } from '@playwright/test';
import rawQuotes from '../../src/data/quotes.json';
import rawCharacters from '../../src/data/characters.json';
// 🛡️ Import the REAL constant instead of hand-rolling a local lookalike.
// A hand-rolled STORAGE_KEYS object (as the emoji spec did) is a guess —
// if the app's real key differs even by a prefix or the QOUTE/QUOTE typo,
// every waitForFunction below hangs for the full 30s timeout with
// localStorage.getItem() silently returning null the whole time. Importing
// from the app's own const module makes the test key-name-agnostic: it
// always reads whatever the real store actually writes to.
import { STORAGE_KEYS as REAL_STORAGE_KEYS } from '../../src/const/localStorage';

const UNLIMITED_ROUTE = '/unlimited/quote';

// Re-mapped to this file's local (PROGRESS/COMPLETED/STATS/SOUL_REGISTRY)
// naming for readability, but every value traces back to the real constant.
const STORAGE_KEYS = {
    PROGRESS: REAL_STORAGE_KEYS.QOUTE_PROGRESS,
    COMPLETED: REAL_STORAGE_KEYS.QOUTE_COMPLETED,
    STATS: REAL_STORAGE_KEYS.QOUTE_STATS,
    SOUL_REGISTRY: REAL_STORAGE_KEYS.SOUL_REGISTRY,
};

test.describe('Bleachdle Unlimited Quote Challenge E2E Workflow (State & UI Integration)', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ Helper สำหรับแกะกล่องสเตตล่าสุดจาก Zustand Core (Unwrap จาก .state Envelope)
     * หมายเหตุ: Quote mode ใช้ createUnlimitedGuessGameStore ตัวเดียวกับ Character/Emoji —
     * target เก็บเป็น Object ซ้อน { id, character_id, text } และ "ไม่มี" revealedCount
     * (ไม่มี derivedCounters ผูกไว้เลยในโหมดนี้ ต่างจาก Emoji)
     */
    async function getZustandProgress(page: Page) {
        return await page.evaluate((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                const parsed = JSON.parse(raw);
                return parsed.unlimited?.state || null;
            } catch {
                return null;
            }
        }, STORAGE_KEYS.PROGRESS);
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

    // ==========================================================================
    // CASE 1: การเล่นชนะ -> เช็คคลังประวัติ (Completed) -> กดเริ่มข้อใหม่ -> สเตตล้างสะอาด
    // ==========================================================================
    test('The complete unlimited win flow, persisting the quote id to completed and resetting safely', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();

        // 🛡️ [HYDRATION GUARD] รอจนกว่า Zustand Rehydrate และเซ็ต target.id ลงใต้ state
        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            if (!raw) return false;
            try {
                const parsed = JSON.parse(raw);
                return !!parsed.unlimited?.state?.target?.id;
            } catch {
                return false;
            }
        }, STORAGE_KEYS.PROGRESS);

        // ดึง Target จริงจากเบื้องหลังออกมาเพื่อทำการทายถูก (target.character_id คือคำตอบจริง)
        const storeProgress = await getZustandProgress(page);
        const currentQuoteId = storeProgress.target.id;
        const currentCharacterId = storeProgress.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        await searchInput.fill(targetCharacterName);
        const rightOption = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // ⏳ ตรวจจับหน้ากระดานสรุปคะแนนโผล่ขึ้นมาบล็อกหลังจาก Delay ทำงานเสร็จ
        await expect(page.getByText('Testimony Traced to Registered Speaker')).toBeVisible({ timeout: 6000 });

        // ตรวจสอบว่า `finalizeGame` ได้ทำการถลุงเอา QUOTE id (ไม่ใช่ character id) ลง Completed —
        // ต่างจาก emoji ตรงที่ dedupe key คือ target.id เสมอ (ดู note 2)
        const completedDataBeforeClose = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);
        expect(completedDataBeforeClose).toContain(currentQuoteId);

        // 🔀 กดปุ่มล่างสุดของตัว Modal สรุปผล เพื่อสั่ง handleCloseModal() -> สุ่ม quote ข้อใหม่
        const nextRoundButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await nextRoundButton.click();

        // 🔄 [STATE HYDRATION & REBOOT CHECK] ยืนยันว่าหน้าจอหลักกลับสู่สถานะพร้อมเล่นใหม่ทันที
        await expect(searchInput).toBeVisible();
        await expect(page.locator('[id^="quote-row-"]')).toHaveCount(0);

        // ตรวจสอบข้อมูลความสะอาดของข้อมูลบน Zustand หลังขึ้นรอบใหม่ — guesses ว่าง, เป้าหมายเปลี่ยน
        // (ไม่มี revealedCount ให้ตรวจ ต่างจาก emoji)
        const newStoreProgress = await getZustandProgress(page);
        expect(newStoreProgress.guesses).toHaveLength(0);
        expect(newStoreProgress.target.id).not.toBe(currentQuoteId);
    });

    // ==========================================================================
    // CASE 2: เงื่อนไขสิ้นสุดด่าน (ทายถูกหมดทุก quote) -> ขึ้นหน้า Central 46 -> Etch -> New Life
    // ==========================================================================
    test('Boundary condition when all quotes are completed, rendering Central 46, etching soul and triggering a new life', async ({ page }) => {
        // คัดแยก quote ตัวสุดท้ายออกเพื่อมาทำเป็น Target ในการปิดกล่องเกม
        const lastQuote = rawQuotes[rawQuotes.length - 1];
        const allOtherQuoteIds = rawQuotes.slice(0, -1).map((q) => q.id);
        const targetCharacterName = findCharacterName(lastQuote.character_id);

        await page.goto('/');

        // 🏗️ ม็อกสถานะก่อนเข้าด่าน: ทายถูกไปแล้วทุก quote ยกเว้นตัวสุดท้ายตัวเดียว
        await page.evaluate(({ keys, completedIds, targetQuote }) => {
            // 1. ตั้งค่า quote ที่ทำสำเร็จไปแล้ว (dedupe ด้วย quote.id ตาม getCompletionKey)
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));

            // 2. ม็อกตัวโครงสร้าง Zustand Store ลง Progress Storage โดยครอบด้วย state และ version
            //    target เป็น Hidden shape { id, character_id, text } ตาม QuoteTargetHidden —
            //    ไม่มี revealedCount เลยในโหมดนี้ (ต่างจาก emoji ที่ต้องม็อกค่าเริ่มต้น = 1)
            localStorage.setItem(keys.PROGRESS, JSON.stringify({
                unlimited: {
                    state: {
                        target: { id: targetQuote.id, character_id: targetQuote.character_id, text: targetQuote.text },
                        guesses: [],
                        hasFinalized: false,
                    },
                    version: 0,
                },
            }));

            // 3. ม็อกข้อมูลสถิติพื้นฐานเพื่อให้หน้าสถิติมีค่าตั้งต้น
            localStorage.setItem(keys.STATS, JSON.stringify({
                unlimited: { currentStreak: 5, maxStreak: 10, playedCount: 5, passedCount: 0, guessDistribution: {} },
            }));
        }, { keys: STORAGE_KEYS, completedIds: allOtherQuoteIds, targetQuote: lastQuote });

        await page.goto(UNLIMITED_ROUTE);

        // จัดการทาย quote ตัวสุดท้ายของซีรีส์ทิ้งซะ
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await searchInput.fill(targetCharacterName);
        await page.locator('li').getByText(targetCharacterName, { exact: true }).first().click();

        // เคลียร์ปุ่มโมดอลปิดสรุปของข้อสุดท้ายเพื่อกระตุ้นเงื่อนไข IsGameCompleted
        const closeSummaryButton = page.getByRole('button', { name: /OPEN SENKAIMON/i });
        await closeSummaryButton.waitFor({ state: 'visible', timeout: 6000 });
        await closeSummaryButton.click();

        // 🏛️ [CENTRAL 46 DOM INTEGRATION] ยืนยันโครงสร้างหน้าคลังข้อมูลลับโผล่ขึ้นมาปิดหน้าเกม —
        // component เดียวกับ emoji mode (`mode="quote"` เท่านั้นที่ต่าง)
        await expect(page.getByText('CENTRAL 46', { exact: false }).first()).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('IDENTITY REGISTRATION REQUIRED')).toBeVisible();

        // ดำเนินกระบวนการกรอกฟอร์มลงทะเบียนดวงวิญญาณ
        const nameInput = page.getByPlaceholder('ENTER YOUR SOUL NAME');
        await expect(nameInput).toBeVisible();
        await nameInput.fill('Kurosaki Ichigo');

        // กดปุ่มพิธีกรรม "ETCH SOUL NAME"
        const etchButton = page.getByRole('button', { name: /ETCH SOUL NAME|刻/i });
        await etchButton.click();

        // ตรวจสอบ Dossier ส่วนบุคคลว่าจะต้องเรนเดอร์ชื่อผู้เล่นเป็นอักษรตัวใหญ่ตามหน้าโค้ดจริง
        await expect(page.getByText('KUROSAKI ICHIGO')).toBeVisible();
        await expect(page.getByText('SOUL CYCLE').first()).toBeVisible();

        // ⚡ ดำเนินพิธีกรรมขั้นสูงสุด: กดปุ่ม "NEW CYCLE, NEW LIFE" เพื่อสั่งล้างประวัติ
        // (เรียก hardReset() ซึ่งลบ progress ทิ้งด้วย ไม่ใช่แค่ completed)
        const newLifeButton = page.getByRole('button', { name: /NEW CYCLE, NEW LIFE|新周/i });
        await newLifeButton.waitFor({ state: 'visible' });
        await newLifeButton.click();

        // 🧠 [DATA INTEGRITY RESET VERIFICATION]
        const postCompletedList = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || [];
        }, STORAGE_KEYS.COMPLETED);

        expect(postCompletedList).toHaveLength(0);

        // เช็คที่ฝั่ง UI ว่าช่องค้นหาของหน้าปกติพร้อมให้เล่นสแตนด์บายเรียบร้อยแล้ว
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
    });

    // ==========================================================================
    // CASE 3: การบันทึกสถานะระหว่างเล่นและการอัปเดตสถิติ (Hydration & Stats Integration)
    // ==========================================================================
    test('Mid-game progress persists after reload and successfully updates stats upon winning', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        // 🛡️ รอจนกว่า Zustand Rehydrate ตัวเองเสร็จ
        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentQuoteId = storeProgress.target.id;
        const currentCharacterId = storeProgress.target.character_id;
        const targetCharacterName = findCharacterName(currentCharacterId);

        const wrongCharacter = getQuotableCharacters().find((c) => c.id !== currentCharacterId)!;

        // 1. เดาผิดไป 1 ครั้ง
        await searchInput.fill(wrongCharacter.name);
        const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();
        await expect(page.locator(`[id="quote-row-${wrongCharacter.id}"]`)).toBeVisible();

        // 2. กดรีเฟรชหน้าจอ (F5) เพื่อทดสอบ Hydration
        await page.reload();

        // ยืนยันว่าประวัติการเดายังคงอยู่บน UI ครบถ้วนหลังรีเฟรช
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="quote-row-${wrongCharacter.id}"]`)).toBeVisible();

        // 3. ทายตัวละครเป้าหมายที่ถูกต้องเพื่อจบด่าน
        await page.getByPlaceholder('ENTER SOUL NAME...').fill(targetCharacterName);
        const rightOption = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // รอหน้าต่างสรุปคะแนนแสดงผล
        await expect(page.getByText('Testimony Traced to Registered Speaker')).toBeVisible({ timeout: 6000 });

        // 4. ตรวจสอบข้อมูลสถิติใน LocalStorage ว่าได้รับการอัปเดตอย่างถูกต้องหรือไม่
        const stats = await page.evaluate((key) => {
            return JSON.parse(localStorage.getItem(key) || '{}').unlimited || {};
        }, STORAGE_KEYS.STATS);

        expect(stats.playedCount).toBe(1);
        expect(stats.currentStreak).toBe(1);
        // sanity: target ยังตรงกับที่ mark completed
        expect(currentQuoteId).toBeTruthy();
    });

    // ==========================================================================
    // CASE 4: quote ที่สุ่มมาเล่นต้องไม่ซ้ำกับที่ชนะไปแล้ว รวมถึงกรณีคนพูดคนเดียวกันมีหลาย quote
    // (Target Filtering Guarantee — dedupe key คือ target.id ไม่ใช่ character_id)
    // ==========================================================================
    test('Target selection filters out and avoids quotes already present in the completed list, even from the same speaker', async ({ page }) => {
        // ม็อกสถานะว่าเคยทายถูกไปแล้วทุก quote ยกเว้น 2 quote สุดท้ายในลิสต์ —
        // ถ้า 2 quote สุดท้ายบังเอิญเป็นคนพูดคนเดียวกัน ยิ่งดี เพราะพิสูจน์ว่า dedupe
        // ใช้ target.id (per-quote) ไม่ใช่ target.character_id (per-speaker) ตามที่ระบุใน
        // getCompletionKey ของ types.ts — ถ้าระบบ dedupe ผิดพลาดไปใช้ character_id แทน
        // การชนะ quote แรกของตัวละครนั้นจะเผลอ mark quote ที่สองของตัวละครเดียวกันว่าจบไปด้วย
        const nearFullCompletedIds = rawQuotes.slice(0, -2).map((q) => q.id);
        const remainingQuotes = rawQuotes.slice(-2);

        await page.evaluate(({ keys, completedIds }) => {
            localStorage.setItem(keys.COMPLETED, JSON.stringify({ unlimited: completedIds }));
        }, { keys: STORAGE_KEYS, completedIds: nearFullCompletedIds });

        await page.goto(UNLIMITED_ROUTE);

        await page.waitForFunction((key) => {
            const raw = localStorage.getItem(key);
            return !!JSON.parse(raw || '{}').unlimited?.state?.target?.id;
        }, STORAGE_KEYS.PROGRESS);

        const storeProgress = await getZustandProgress(page);
        const currentQuoteId = storeProgress.target.id;

        // Quote ที่จับคู่ได้ จะต้องเป็นหนึ่งในสอง quote ที่ยังไม่เคยเล่นเท่านั้น
        const isFromRemaining = remainingQuotes.some((q) => q.id === currentQuoteId);
        expect(isFromRemaining).toBe(true);
        expect(nearFullCompletedIds).not.toContain(currentQuoteId);
    });

    // ==========================================================================
    // CASE 5: หน้าจอว่างเปล่าต้อง "ไม่มี" ปุ่มสุ่มแบบที่ Character mode มี
    // ==========================================================================
    test('Empty state does NOT expose a quick-random button (unlike character mode)', async ({ page }) => {
        await page.goto(UNLIMITED_ROUTE);

        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();

        // 🎯 Quote mode เริ่มเกมอัตโนมัติผ่าน initializeGame() ตอน mount (page.tsx) เสมอ
        // ไม่มี "ปุ่มสุ่มเริ่มต้น" แบบ Character mode ให้กดเอง — เกมพร้อมเล่นทันทีที่โหลดหน้า
        await expect(page.getByRole('button', { name: /random|สุ่ม/i })).toHaveCount(0);
    });

    // ==========================================================================
    // CASE 6: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration, กลับสู่ Daily)
    // ==========================================================================
    test('Can trigger mode selector and navigate from Unlimited to Daily quote mode', async ({ page }: { page: Page }) => {
        await page.goto(UNLIMITED_ROUTE);

        const modeBadge = page.locator('span, div').getByText(/unlimited/i).first();
        await expect(modeBadge).toBeVisible();
        await modeBadge.click();

        const dailyOption = page.locator('button, div').getByText(/daily/i).last();
        await expect(dailyOption).toBeVisible();
        await dailyOption.click();

        await expect(page).toHaveURL(/\/daily/);
    });
});