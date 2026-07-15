// client/tests/e2e/daily-character-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/daily-character-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawCharacters from '../../src/data/characters.json';

const DAILY_ROUTE = '/daily/character';
const PROGRESS_STORAGE_KEY = 'bleachdle-character-progress';

// ⚠️ FIX: default `waitUntil: 'load'` was hanging indefinitely on this route
// (see error-context.md — every test timed out at `page.goto`, stuck on the
// "ANALYZING SOUL..." loading state). We navigate on `domcontentloaded`
// instead, which fires as soon as the DOM is parsed and doesn't depend on
// every network connection (fetch/websocket/polling) settling. We then
// assert on the actual UI signal we care about (the search input / target
// data in localStorage) with an explicit, generous timeout, so a real
// regression fails fast with a clear message instead of masquerading as a
// 30s `goto` timeout.
async function gotoDaily(page: Page) {
    await page.goto(DAILY_ROUTE, { waitUntil: 'domcontentloaded' });

    const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
    await expect(searchInput).toBeVisible({ timeout: 15000 });

    await page.waitForFunction((key) => {
        const progress = JSON.parse(localStorage.getItem(key) || '{}');
        return !!progress?.daily?.state?.targetId;
    }, PROGRESS_STORAGE_KEY, { timeout: 15000 });

    return searchInput;
}

test.describe('Bleachdle Daily Character Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }: { page: Page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => localStorage.clear());
    });

    // ==========================================
    // CASE 1: การเดาจนกระทั่งชนะ (Complete Win Flow)
    // ==========================================
    test('The complete win-loop with a wrong guess then the correct guess', async ({ page }: { page: Page }) => {
        const searchInput = await gotoDaily(page);

        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetId = progress.daily.state.targetId;

        const targetCharacter = rawCharacters.find(c => c.id === targetId);
        const wrongCharacter = rawCharacters.find(c => c.id !== targetId) || rawCharacters[0];

        if (!targetCharacter) {
            throw new Error(`Character with ID "${targetId}" not found in characters.json`);
        }

        // เดาผิดครั้งแรก
        await searchInput.fill(wrongCharacter.name);
        const wrongOption = page.locator('div, [role="option"]').getByText(wrongCharacter.name, { exact: true }).last();
        await wrongOption.waitFor({ state: 'visible' });
        await wrongOption.click();

        await expect(page.locator(`[id="row-${wrongCharacter.id}"]`)).toBeVisible();

        // เดาคำตอบที่ถูกต้องเพื่อจบเกมแบบผู้ชนะ
        await searchInput.fill(targetCharacter.name);
        const rightOption = page.locator('div, [role="option"]').getByText(targetCharacter.name, { exact: true }).last();
        await rightOption.waitFor({ state: 'visible' });
        await rightOption.click();

        // ช่องค้นหาต้องอันเมาท์ออกเมื่อเคลียร์เกมสำเร็จ
        await expect(searchInput).not.toBeVisible({ timeout: 6000 });

        // ตรวจสอบข้อมูลสัญลักษณ์และข้อความชัยชนะตามโครงสร้าง Component จริง
        await expect(page.getByText('REISHI KAKUNIN')).toBeVisible();
        await expect(page.getByText('Identity Verified')).toBeVisible();
    });

    // ==========================================
    // CASE 2: การเดาผิดซ้ำๆ จนสิทธิ์หมดแล้วแพ้ (Complete Loss Flow)
    // ==========================================
    test('The complete loss-loop by guessing incorrectly until running out of turns', async ({ page }: { page: Page }) => {
        const searchInput = await gotoDaily(page);

        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetId = progress.daily.state.targetId;

        const targetCharacter = rawCharacters.find(c => c.id === targetId);
        const allWrongCharacters = rawCharacters.filter(c => c.id !== targetId);

        // วนลูปสับคำตอบที่ผิดลงไปเรื่อยๆ จนกว่าระบบจะดีดช่องค้นหาออกเมื่อหมดโควตา
        for (const currentWrong of allWrongCharacters) {
            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(currentWrong.name);

            // เลือกช้อยส์ตัวละครตัวล่าสุด
            const option = page.locator('div, [role="option"]').getByText(currentWrong.name, { exact: true }).last();
            await option.waitFor({ state: 'visible' });
            await option.click();

            // 🏎️ ดักจับสองเหตุการณ์แข่งกัน
            const result = await Promise.race([
                page.locator(`[id="row-${currentWrong.id}"]`).waitFor({ state: 'visible' }).then(() => 'row_visible'),
                page.getByText('KONPAKU DANZETSU').waitFor({ state: 'visible' }).then(() => 'game_over')
            ]);

            // ถ้าหน้าจอซ่อนแรงดันวิญญาณเปิดขึ้นมาครอบ DOM (หมดโควตาทายรอบสุดท้าย) ให้หลุดลูปทันที
            if (result === 'game_over') {
                break;
            }

            // ถ้ายังทายไม่ครบโควตา ยืนยันสิทธิ์ความถูกต้องของแถวประวัติตามปกติ
            await expect(page.locator(`[id="row-${currentWrong.id}"]`)).toBeVisible();
        }

        // ระบบต้องปิดรับอินพุตการทายทันทีที่แตะเงื่อนไข Game Over
        await expect(searchInput).not.toBeVisible({ timeout: 6000 });

        // ตรวจสอบข้อความการแพ้ตามพจนานุกรมเลเบลจริงของฟรอนต์เอนด์
        await expect(page.getByText('KONPAKU DANZETSU')).toBeVisible();
        await expect(page.getByText('Konpaku Link Severed')).toBeVisible();

        // ยืนยันว่าหน้าจอต้องทำการเปิดเผยเฉลยชื่อผู้มีแรงดันวิญญาณประจำวัน
        if (targetCharacter) {
            await expect(page.getByText(targetCharacter.name)).toBeVisible();
        }
    });

    // ==========================================
    // CASE 3: ข้อมูลสเตตคงอยู่หลังรีเฟรชหน้าจอ (Hydration & Progress Verification)
    // ==========================================
    test('State hydration persists a guess and matches localStorage progress across a hard reload', async ({ page }: { page: Page }) => {
        const searchInput = await gotoDaily(page);

        const progressBefore = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetId = progressBefore.daily.state.targetId;

        const wrongCharacter = rawCharacters.find(c => c.id !== targetId) || rawCharacters[0];

        // เริ่มต้นทายผิดไป 1 ตัว
        await searchInput.fill(wrongCharacter.name);
        const wrongOption = page.locator('div, [role="option"]').getByText(wrongCharacter.name, { exact: true }).last();
        await wrongOption.waitFor({ state: 'visible' });
        await wrongOption.click();

        // ยืนยันว่าแถวประวัติถูกวาดขึ้นมาบน UI 1 แถวก่อนกดรีเฟรช
        await expect(page.locator('[id^="row-"]')).toHaveCount(1);

        // สั่งกด F5 (Hard Reload)
        await page.reload({ waitUntil: 'domcontentloaded' });

        // 🛡️ ตรวจสอบฝั่ง UI หลังรีเฟรช (Hydration)
        const hydratedSearchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(hydratedSearchInput).toBeVisible({ timeout: 15000 });
        await expect(page.locator('[id^="row-"]')).toHaveCount(1);
        await expect(page.locator(`[id="row-${wrongCharacter.id}"]`)).toBeVisible();

        // 🧠 ตรวจสอบฝั่ง Data (Data Integrity): ดึงข้อมูลจาก LocalStorage มาแกะพิสูจน์เนื้อในหลัง F5
        const progressAfter = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);

        // 1. ตรวจสอบว่ามีข้อมูลก้อน daily state อยู่จริง
        expect(progressAfter.daily?.state).toBeDefined();

        // 2. ข้อมูลการทาย (guesses) ต้องถูกบันทึกไว้ 1 รายการพอดี
        expect(progressAfter.daily.state.guesses).toHaveLength(1);

        // 3. ข้อมูลภายในออบเจกต์การเดาตัวแรกสุด ต้องตรงกับตัวละครที่เราสุ่มกรอกลงไปเป๊ะๆ
        const firstGuessData = progressAfter.daily.state.guesses[0];
        expect(firstGuessData.guess.id).toBe(wrongCharacter.id);
        expect(firstGuessData.guess.name).toBe(wrongCharacter.name);

        // 4. สเตตภาพรวมของวันนั้นต้องยังไม่ถูกปิดการเล่น (เพราะยังไม่ชนะ/แพ้)
        expect(progressAfter.daily.state.hasFinalized).toBe(false);
    });

    // ==========================================
    // CASE 4: บล็อกการกลับมาเล่นซ้ำและคงหน้าจอสรุปหลัง F5 (Boundary Lockout & Delayed Reload)
    // ==========================================
    test('Daily boundary enforcement shows the summary/lockout state instead of input after reload', async ({ page }: { page: Page }) => {
        // ⚠️ FIX: this test reloads mid-flow, which can hit Next.js dev-server
        // recompilation ("Compiling..." overlay seen in the failure snapshot).
        // A cold recompile can blow past the default 30s budget on its own,
        // unrelated to app/test correctness — give this test more headroom.
        test.setTimeout(60000);

        await gotoDaily(page);

        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const realTargetId = progress.daily.state.targetId;

        const fullTargetCharacter = rawCharacters.find(c => c.id === realTargetId)!;

        const mockWinResult = {
            gender: 'correct', race: 'correct', affiliation: 'correct', height: 'correct',
            age: 'correct', eye_color: 'correct', hair_color: 'correct',
            first_appearance_chapter: 'correct', weapon: 'correct', release: 'correct',
            primary_ability: 'correct', image: fullTargetCharacter.image || ''
        };

        // ม็อกสถานะว่าเคยเล่นผ่านไปแล้ว (จบเกมเรียบร้อย) ลงสู่ LocalStorage
        await page.evaluate(({ key, character, winResult }) => {
            localStorage.setItem(
                key,
                JSON.stringify({
                    daily: {
                        state: {
                            guesses: [{ guess: character, result: winResult, isNew: false }],
                            targetId: character.id,
                            hasFinalized: true
                        },
                        version: 0,
                    },
                })
            );
        }, { key: PROGRESS_STORAGE_KEY, character: fullTargetCharacter, winResult: mockWinResult });

        // สั่งกด F5 (Reload หน้าจอ)
        await page.reload({ waitUntil: 'domcontentloaded' });

        // ⏱️ ช่องค้นหาต้องไม่โผล่ขึ้นมาทำงาน
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).not.toBeVisible();

        // ⏳ ตรวจสอบว่าหน้าจอสรุปผลเด้งกลับขึ้นมาบล็อกได้อย่างสมบูรณ์ (ให้เวลาดาวน์โหลดแอนิเมชัน 2500ms ทำงานอย่างราบรื่น)
        await expect(page.getByText('REISHI KAKUNIN')).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('Identity Verified')).toBeVisible();
    });

    // ==========================================
    // CASE 5: การทำงานของปุ่มนำทางใน Daily Hub Footer หลังจบเกม (Daily Hub Navigation)
    // ==========================================
    test('Shows Daily Hub items and layout when mission is concluded', async ({ page }: { page: Page }) => {
        const searchInput = await gotoDaily(page);

        const progress = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}'), PROGRESS_STORAGE_KEY);
        const targetCharacter = rawCharacters.find(c => c.id === progress.daily.state.targetId)!;

        // ทายคำตอบที่ถูกต้องเพื่อจบเกมทันที
        await searchInput.fill(targetCharacter.name);
        await page.locator('div, [role="option"]').getByText(targetCharacter.name, { exact: true }).last().click();

        // รอหน้าต่างสรุปและส่วนท้ายกระดาน (DailyHubModalFooter) วาดลง DOM เสร็จ
        const initializeCta = page.getByText('Initialize:');
        const sealedRecord = page.getByText('RECORD // SEALED');

        // ตรวจสอบโครงสร้างว่ามีชุดปุ่มเปลี่ยนด่านของระบบปรากฏขึ้นมาจริง
        await expect(initializeCta.or(sealedRecord)).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 6: การทำงานของปุ่มสุ่มตัวละครเริ่มต้น (Empty State Quick Random)
    // ==========================================
    test('Clicking random button in empty state inserts a valid initial guess row', async ({ page }: { page: Page }) => {
        await gotoDaily(page);

        await expect(page.locator('[id^="row-"]')).toHaveCount(0);

        // ตรวจสอบและคลิกปุ่มสุ่มที่อยู่ในกล่องสถานะว่างเปล่า (Empty Guess State)
        const randomButton = page.getByRole('button', { name: /random|สุ่ม/i });
        if (await randomButton.isVisible()) {
            await randomButton.click();
            // ต้องมีแถวประวัติถูกวาดเพิ่มขึ้นมาในระบบ 1 แถวทันที
            await expect(page.locator('[id^="row-"]')).toHaveCount(1);
        }
    });

    // ==========================================
    // CASE 7: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
    // ==========================================
    test('Can trigger mode selector and navigate from Daily to Unlimited emoji mode', async ({ page }: { page: Page }) => {
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
});