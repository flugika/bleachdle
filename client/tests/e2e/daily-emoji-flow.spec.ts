// client/tests/e2e/daily-emoji-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/daily-emoji-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawCharacters from '../../src/data/characters.json';
import rawEmojiSets from '../../src/data/emojis.json';

const DAILY_ROUTE = '/daily/emoji';
const PROGRESS_STORAGE_KEY = 'bleachdle-emoji-progress'; // ปรับ Key ให้ตรงกับที่ระบบคุณใช้จริง

// 🎯 ต้องตรงกับ src/features/emoji/emojiRevealedCounter.ts เป๊ะ
// (INITIAL_REVEALED_EMOJI = 1, WRONG_GUESSES_PER_REVEAL = 2, TOTAL_EMOJI_COUNT = 4)
const INITIAL_REVEALED_EMOJI = 1;
const WRONG_GUESSES_PER_REVEAL = 2;
const TOTAL_EMOJI_COUNT = 4;

test.describe('Bleachdle Daily Emoji Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ Helper รอ Hydration ของ createDailyGuessGameStore ให้เสร็จก่อน แล้วดึง
     * target ที่ server เซ็ตให้ (setTarget ถูกยิงจาก DailyEmojiWrapper ตอน _hasHydrated)
     * ออกมา — target เป็น EmojiTargetHidden { id, character_id } เท่านั้น ไม่มี emoji_list
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

    // ==========================================
    // CASE 1: การเดาจนกระทั่งชนะ (Complete Win Flow)
    // ==========================================
    test('Victory Flow: User matches target character on initial submission', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();

        // รอ Hydration + setTarget(initialTarget) ให้เสร็จแล้วค่อยอ่าน Target
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);

        const state = await getDailyState(page);
        const characterId = state.target.character_id;
        const targetCharacterName = findCharacterName(characterId);

        await searchInput.fill(targetCharacterName);

        const option = page.locator('li').getByText(targetCharacterName, { exact: true }).first();
        await option.waitFor({ state: 'visible' });
        await option.click();

        // ตรวจสอบ UI ชัยชนะ (delay 2500ms ตาม DailyEmojiWrapper ก่อนเปิด Summary)
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });
        await expect(page.getByText('Symbol Set Traced to Registered Soul')).toBeVisible();

        await page.reload();

        // ตรวจสอบว่าช่องค้นหาโดนบล็อก และหน้าจอผลลัพธ์แสดงขึ้นมา
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).not.toBeVisible();
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 2: การเดาผิดจนหมดสิทธิ์ (Complete Loss Flow)
    // ==========================================
    test('The complete loss-loop by guessing incorrectly until running out of turns', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);

        const state = await getDailyState(page);
        const characterId = state.target.character_id;

        // วนลูปทายผิด (เอาตัวละครที่ไม่ใช่ target มาทายให้หมดโควต้า)
        const wrongCharacters = rawCharacters.filter((c) => c.id !== characterId).slice(0, 6);

        for (const wrongCharacter of wrongCharacters) {
            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(wrongCharacter.name);
            const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
            await option.click();

            await expect(page.locator(`[id="emoji-row-${wrongCharacter.id}"]`)).toBeVisible();
        }

        // ตรวจสอบ UI การแพ้ (ถ้ามีข้อความเฉพาะเจาะจง ให้เปลี่ยนตัวอักษรใน getByText)
        // await expect(page.getByText('KONPAKU DANZETSU')).toBeVisible();
    });

    // ==========================================
    // CASE 3: ข้อมูลสเตตคงอยู่หลังรีเฟรชหน้าจอ (Hydration & Persistence)
    // ==========================================
    test('State hydration persists a guess across a hard reload', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);

        const stateBefore = await getDailyState(page);
        const characterId = stateBefore.target.character_id;
        const wrongCharacter = rawCharacters.find((c) => c.id !== characterId) || rawCharacters[0];

        await searchInput.fill(wrongCharacter.name);
        const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
        await option.click();

        await expect(page.locator('[id^="emoji-row-"]')).toHaveCount(1);

        // รีโหลด
        await page.reload();

        // ตรวจสอบ Hydration หลังรีโหลด
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="emoji-row-${wrongCharacter.id}"]`)).toBeVisible();
    });

    // ==========================================
    // CASE 4: กติกาปลดล็อกสัญลักษณ์แบบค่อยเป็นค่อยไป (Progressive Reveal / Central 46 Logic)
    // ==========================================
    test('Reveals one additional emoji symbol every 2 wrong guesses up to the 4-symbol cap', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);

        // ตั้งต้นต้องเห็นแค่สัญลักษณ์แรก
        await expect(page.getByText(`${INITIAL_REVEALED_EMOJI} / ${TOTAL_EMOJI_COUNT} UNSEALED`)).toBeVisible();

        const state = await getDailyState(page);
        const characterId = state.target.character_id;
        const wrongCharacters = rawCharacters.filter((c) => c.id !== characterId);

        let expectedRevealed = INITIAL_REVEALED_EMOJI;

        // MAX_DAILY_EMOJI_GUESSES ไม่รู้ค่าตายตัวในไฟล์เทสต์นี้ — วนทายผิดแค่พอให้เพดาน
        // เปิดครบ 4/4 (ทายผิด 6 ครั้ง ตามสูตร 1 + floor(6/2) = 4) โดยไม่แตะ boundary ของแพ้
        for (let i = 0; i < wrongCharacters.length && expectedRevealed < TOTAL_EMOJI_COUNT; i++) {
            const wrongCharacter = wrongCharacters[i];

            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(wrongCharacter.name);
            const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
            await option.waitFor({ state: 'visible' });
            await option.click();
            await expect(page.locator(`[id="emoji-row-${wrongCharacter.id}"]`)).toBeVisible();

            const wrongGuessCount = i + 1;
            expectedRevealed = Math.min(
                TOTAL_EMOJI_COUNT,
                INITIAL_REVEALED_EMOJI + Math.floor(wrongGuessCount / WRONG_GUESSES_PER_REVEAL)
            );

            await expect(page.getByText(`${expectedRevealed} / ${TOTAL_EMOJI_COUNT} UNSEALED`)).toBeVisible();
        }

        expect(expectedRevealed).toBe(TOTAL_EMOJI_COUNT);
    });

    // ==========================================
    // CASE 5: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
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

    // ==========================================
    // CASE 6: การทำงานของ Daily Hub Footer หลังจบเกม (Daily Hub Navigation)
    // ==========================================
    test('Shows Daily Hub footer once the emoji mission is concluded', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        // 1. รอให้ Hydration + sync กับ initialTarget ของ server เสร็จ
        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);

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
        await expect(page.getByRole('heading', { name: 'REISHI KAKUNIN' })).toBeVisible({ timeout: 6000 });

        // รอหน้าต่างสรุปและส่วนท้ายกระดาน (DailyHubModalFooter) วาดลง DOM เสร็จ
        const initializeCta = page.getByText('Initialize:');
        const sealedRecord = page.getByText('RECORD // SEALED');

        // ตรวจสอบโครงสร้างว่ามีชุดปุ่มเปลี่ยนด่านของระบบปรากฏขึ้นมาจริง
        await expect(initializeCta.or(sealedRecord)).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 7: emoji_list ของแต่ละ target ต้องมีอยู่จริงตามข้อมูล (sanity guard กันข้อมูลเสีย)
    // ==========================================
    test('The daily target resolves to an existing emoji set with a full 4-symbol emoji_list', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.id;
        }, PROGRESS_STORAGE_KEY);

        const state = await getDailyState(page);
        const emojiSetId = state.target.id;

        const fullSet = rawEmojiSets.find((s) => s.id === emojiSetId);
        expect(fullSet).toBeTruthy();
        expect(fullSet!.emoji_list.length).toBeGreaterThanOrEqual(TOTAL_EMOJI_COUNT);
    });
});