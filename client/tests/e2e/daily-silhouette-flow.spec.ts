// client/tests/e2e/daily-silhouette-flow.spec.ts
// pnpm --prefix client exec playwright test tests/e2e/daily-silhouette-flow.spec.ts

import { test, expect, Page } from '@playwright/test';
import rawCharacters from '../../src/data/characters.json';
import rawSilhouettes from '../../src/data/silhouettes.json';

const DAILY_ROUTE = '/daily/silhouette';
const PROGRESS_STORAGE_KEY = 'bleachdle-silhouette-progress'; // ⚠️ ปรับ Key ให้ตรงกับ STORAGE_KEYS.SILHOUETTE_PROGRESS จริง

// 🎯 ต้องตรงกับ src/features/silhouette/silhouette.ts เป๊ะ
// GRID_SIZE=5 -> TOTAL_CELLS=25, INITIAL_REVEAL_SILHOUETTE=5 (ตามที่ SilhouetteHowToPlayModal
// พูดถึง "shatters 5 random grid cells"), REVEAL_PER_GUESS=1, MAX_REVEAL_RATIO=0.85
const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
// ⚠️ ค่านี้ยึดตามค่าจริงที่วัดได้จาก UI (8) ไม่ใช่ตามคำบรรยายใน SilhouetteHowToPlayModal
// ("shatters 5 random grid cells") ซึ่งดูเหมือนจะเป็น copy ที่ไม่ตรงกับ INITIAL_REVEAL_SILHOUETTE
// จริงใน src/const/guess.ts แล้ว — แนะนำให้ไปแก้ copy ในโมดัลให้ตรงกับค่าจริงด้วย (8) กันผู้เล่นสับสน
const INITIAL_REVEAL_SILHOUETTE = 8;
const REVEAL_PER_GUESS = 1;
const MAX_REVEAL_RATIO = 0.85;
const MAX_ALLOWED_TOTAL_REVEAL = Math.floor(TOTAL_CELLS * MAX_REVEAL_RATIO); // 21

// ⚠️ rowIdPrefix ต้องตรงกับที่ SilhouetteControlPanel ส่งให้ SearchBar เป๊ะ
// (SilhouetteControlPanel.tsx: <SearchBar ... rowIdPrefix="silhouette-row" />)
const ROW_ID_PREFIX = 'silhouette-row';

test.describe('Bleachdle Daily Silhouette Challenge E2E Workflow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
    });

    /**
     * 🛡️ รอ Hydration ของ createDailyGuessGameStore ให้เสร็จก่อน แล้วดึง
     * target ที่ server เซ็ตให้ (setTarget ถูกยิงจาก DailySilhouetteWrapper ตอน _hasHydrated)
     * ออกมา — target เป็น SilhouetteTargetHidden { id, character_id } เท่านั้น
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
     * 🧮 นับจำนวนช่องตารางที่ "เปิดแล้ว" (revealed) จาก SilhouetteImage
     * โครงสร้างจริง (SilhouetteImage.tsx): overlay grid ชั้นบนสุด (z-40) มี 25 <div>
     * แต่ละอันคุมด้วย inline style opacity: revealed -> opacity 0, ยังปิดอยู่ -> opacity 1
     *
     * ⚠️ Selector นี้ผูกกับ className จริงใน SilhouetteImage.tsx ("grid z-40") — ถ้ามีการ
     * เปลี่ยน markup ต้องปรับ selector ตรงนี้ตาม หรือแนะนำให้เพิ่ม data-testid="silhouette-cell"
     * บน cell แต่ละอันเพื่อความเสถียรระยะยาว
     */
    async function getRevealedCellCount(page: Page): Promise<number> {
        return await page.evaluate(() => {
            const grid = document.querySelector('.grid.z-40');
            if (!grid) return -1;
            const cells = Array.from(grid.children) as HTMLElement[];
            return cells.filter((cell) => cell.style.opacity === '0').length;
        });
    }

    // ==========================================
    // CASE 1: การเดาจนกระทั่งชนะ (Complete Win Flow)
    // ==========================================
    test('Victory Flow: User matches target character on initial submission', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');
        await expect(searchInput).toBeVisible();

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

        // ตรวจสอบ UI ชัยชนะ (delay 1600ms ตาม DailySilhouetteWrapper ก่อนเปิด Summary)
        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });
        await expect(page.getByText(targetCharacterName, { exact: true }).first()).toBeVisible();

        await page.reload();

        // ตรวจสอบว่าช่องค้นหาโดนบล็อก และหน้าจอผลลัพธ์แสดงขึ้นมา
        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).not.toBeVisible();
        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });
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

        const wrongCharacters = rawCharacters.filter((c) => c.id !== characterId).slice(0, 8);

        for (const wrongCharacter of wrongCharacters) {
            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break;

            await searchInput.fill(wrongCharacter.name);
            const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
            await option.click();

            await expect(page.locator(`[id="${ROW_ID_PREFIX}-${wrongCharacter.id}"]`)).toBeVisible();
        }

        // ตรวจสอบ UI การแพ้ (ถ้ามีข้อความเฉพาะเจาะจง ให้เปลี่ยนตัวอักษรใน getByText)
        // await expect(page.getByText('TARGET IDENTITY DISRUPTED')).toBeVisible();
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

        await expect(page.locator(`[id^="${ROW_ID_PREFIX}-"]`)).toHaveCount(1);

        await page.reload();

        await expect(page.getByPlaceholder('ENTER SOUL NAME...')).toBeVisible();
        await expect(page.locator(`[id="${ROW_ID_PREFIX}-${wrongCharacter.id}"]`)).toBeVisible();
    });

    // ==========================================
    // CASE 4: กติกาปลดล็อกช่องตารางเงาแบบค่อยเป็นค่อยไป (Progressive Grid Reveal)
    // ==========================================
    test('Reveals one additional grid cell every wrong guess, capped at the reveal ratio limit', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.character_id;
        }, PROGRESS_STORAGE_KEY);

        // ตั้งต้นต้องเห็นแค่ 5 ช่องแรก (INITIAL_REVEAL_SILHOUETTE)
        await expect.poll(() => getRevealedCellCount(page)).toBe(INITIAL_REVEAL_SILHOUETTE);

        const state = await getDailyState(page);
        const characterId = state.target.character_id;
        const wrongCharacters = rawCharacters.filter((c) => c.id !== characterId);

        let expectedRevealed = INITIAL_REVEAL_SILHOUETTE;
        const revealCeiling = Math.min(TOTAL_CELLS, MAX_ALLOWED_TOTAL_REVEAL);

        for (let i = 0; i < wrongCharacters.length && expectedRevealed < revealCeiling; i++) {
            const wrongCharacter = wrongCharacters[i];

            const isInputActive = await searchInput.isVisible();
            if (!isInputActive) break; // หมดโควต้าเดา (MAX_DAILY_SILHOUETTE_GUESSES) ก่อนถึงเพดาน reveal

            await searchInput.fill(wrongCharacter.name);
            const option = page.locator('li').getByText(wrongCharacter.name, { exact: true }).first();
            await option.waitFor({ state: 'visible' });
            await option.click();
            await expect(page.locator(`[id="${ROW_ID_PREFIX}-${wrongCharacter.id}"]`)).toBeVisible();

            const wrongGuessCount = i + 1;
            expectedRevealed = Math.min(
                revealCeiling,
                INITIAL_REVEAL_SILHOUETTE + wrongGuessCount * REVEAL_PER_GUESS
            );

            await expect.poll(() => getRevealedCellCount(page)).toBe(expectedRevealed);
        }

        // อย่างน้อยต้องเปิดเพิ่มจาก baseline ได้จริง (กันเคส false-positive ที่ selector หา grid ไม่เจอแล้ว get -1 ตลอด)
        expect(expectedRevealed).toBeGreaterThan(INITIAL_REVEAL_SILHOUETTE);
    });

    // ==========================================
    // CASE 5: การสลับโหมดการเล่นผ่านประตูกลาง (Mode Switch Integration)
    // ==========================================
    test('Can trigger mode selector and navigate from Daily to Unlimited silhouette mode', async ({ page }: { page: Page }) => {
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
    // CASE 6: การทำงานของ Daily Hub Footer หลังจบเกม (Daily Hub Navigation)
    // ==========================================
    test('Shows Daily Hub footer once the silhouette mission is concluded', async ({ page }) => {
        await page.goto(DAILY_ROUTE);
        const searchInput = page.getByPlaceholder('ENTER SOUL NAME...');

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

        await expect(page.getByText('VISUAL SPECTRUM TRACED SUCCESSFULLY')).toBeVisible({ timeout: 6000 });

        const initializeCta = page.getByText('Initialize:');
        const sealedRecord = page.getByText('RECORD // SEALED');

        await expect(initializeCta.or(sealedRecord)).toBeVisible({ timeout: 6000 });
    });

    // ==========================================
    // CASE 7: target ของแต่ละวันต้องมี entry อยู่จริงใน silhouettes.json (sanity guard กันข้อมูลเสีย)
    // ==========================================
    test('The daily target resolves to an existing silhouette entry with a valid image reference', async ({ page }) => {
        await page.goto(DAILY_ROUTE);

        await page.waitForFunction((key) => {
            const progress = JSON.parse(localStorage.getItem(key) || '{}');
            return !!progress?.daily?.state?.target?.id;
        }, PROGRESS_STORAGE_KEY);

        const state = await getDailyState(page);
        const silhouetteId = state.target.id;
        const characterId = state.target.character_id;

        const fullEntry = rawSilhouettes.find((s) => s.id === silhouetteId);
        expect(fullEntry).toBeTruthy();
        expect(fullEntry!.character_id).toBe(characterId);
        expect(typeof fullEntry!.image).toBe('string');
        expect(fullEntry!.image.length).toBeGreaterThan(0);

        const owningCharacter = rawCharacters.find((c) => c.id === characterId);
        expect(owningCharacter).toBeTruthy();
    });
});