const { test, expect } = require('@playwright/test');
const { seedLocalState, stubSupabase } = require('./support/test-helpers');

const editableFamilyLedger = {
  activeLedgerId: 'editable-family-ledger',
  ledgers: [{
    id: 'editable-family-ledger',
    name: '可编辑家庭账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
      { id: 'family-c', name: '旦家' },
    ],
    familyMembers: { 'family-a': 1, 'family-b': 2, 'family-c': 1 },
    categories: ['餐饮'],
    expenses: [{
      id: 'expense-before-family-editing',
      amount: 90,
      payerId: 'family-a',
      category: '餐饮',
      date: '2026-08-24',
      note: '新增家庭前的旧账',
      splitMode: 'equal',
      splitFamilyIds: [],
      splitAmounts: {},
      createdAt: '2026-08-24T08:00:00.000Z',
      updatedAt: '2026-08-24T08:00:00.000Z',
    }],
  }],
};

async function openApp(page, initialState = editableFamilyLedger) {
  await seedLocalState(page, initialState, { entryMode: 'natural', welcomeSeen: true });
  await stubSupabase(page);
  await page.goto('/index.html?family-editing-test=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-shell')).toBeVisible();
}

async function openFamilySettings(page) {
  await page.locator('#openSettingsButton').click();
  const group = page.locator('details.settings-mobile-group').filter({ has: page.locator('#settingsFamilyForm') });
  if (!await group.evaluate((details) => details.open)) {
    await group.locator(':scope > summary').click();
  }
  await expect(page.locator('#settingsFamilyForm')).toBeVisible();
}

test.describe('可编辑家庭', () => {
  test('可新增、重命名和删除未使用家庭，旧账参与者快照不变', async ({ page }, testInfo) => {
    if (testInfo.project.name.includes('mobile')) {
      await page.setViewportSize({ width: 320, height: 568 });
    }
    await openApp(page);
    await openFamilySettings(page);

    await page.locator('#settingsNewFamilyInput').fill('新家');
    await page.locator('#settingsFamilyForm button[type="submit"]').click();
    await expect(page.locator('[data-settings-family]')).toHaveCount(4);

    const addedRow = page.locator('[data-settings-family]').filter({ has: page.locator('input[value="新家"]') });
    await expect(addedRow).toBeVisible();
    const familyEditorGeometry = await page.evaluate(() => {
      const drawer = document.querySelector('#settingsView').getBoundingClientRect();
      const rows = [...document.querySelectorAll('[data-settings-family]')].map((row) => row.getBoundingClientRect());
      return {
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        rowsInsideDrawer: rows.every((row) => row.left >= drawer.left && row.right <= drawer.right),
      };
    });
    expect(familyEditorGeometry).toEqual({ pageOverflow: false, rowsInsideDrawer: true });
    const addedId = await addedRow.getAttribute('data-settings-family');
    await addedRow.locator('[data-family-name-input]').fill('海家');
    await addedRow.locator('[data-family-name-input]').press('Enter');
    await expect(page.locator(`[data-settings-family="${addedId}"] [data-family-name-input]`)).toHaveValue('海家');

    await page.waitForTimeout(650);
    const savedAfterAdd = await page.evaluate(() => JSON.parse(localStorage.getItem('travel-ledger-v3')));
    const savedLedger = savedAfterAdd.ledgers.find((ledger) => ledger.id === 'editable-family-ledger');
    expect(savedLedger.expenses[0].splitFamilyIds).toEqual(['family-a', 'family-b', 'family-c']);
    expect(savedLedger.families.find((family) => family.id === addedId).name).toBe('海家');

    await page.locator('#closeSettingsButton').click();
    await expect(page.locator(`#familyRoster [data-payer-id="${addedId}"]`)).toContainText('海家');
    await expect(page.locator(`#ledgerFamilyFilter option[value="${addedId}"]`)).toHaveText('海家');
    await openFamilySettings(page);

    const renamedRow = page.locator(`[data-settings-family="${addedId}"]`);
    await expect(renamedRow.locator('[data-family-state]')).toHaveText('删除');
    await renamedRow.locator('[data-family-state]').click();
    await expect(page.locator(`[data-settings-family="${addedId}"]`)).toHaveCount(0);
  });

  test('已使用家庭会停用并保留历史，且至少保留两个启用家庭', async ({ page }) => {
    await openApp(page);
    await openFamilySettings(page);

    const usedRow = page.locator('[data-settings-family="family-c"]');
    await expect(usedRow.locator('[data-family-state]')).toHaveText('停用');
    await usedRow.locator('[data-family-state]').click();
    await expect(page.locator('[data-settings-family="family-c"]')).toHaveClass(/is-inactive/);
    await expect(page.locator('[data-settings-family="family-c"] [data-family-state]')).toHaveText('恢复');
    await expect(page.locator('[data-settings-family="family-a"] [data-family-state]')).toBeDisabled();
    await expect(page.locator('[data-settings-family="family-b"] [data-family-state]')).toBeDisabled();

    await page.locator('#closeSettingsButton').click();
    await expect(page.locator('#familyRoster [data-payer-id="family-c"]')).toHaveCount(0);
    await expect(page.locator('.ledger-item').filter({ hasText: '新增家庭前的旧账' })).toContainText('3 家 · 均分');

    await page.waitForTimeout(650);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('travel-ledger-v3')));
    const ledger = saved.ledgers.find((item) => item.id === 'editable-family-ledger');
    expect(ledger.families.find((family) => family.id === 'family-c').active).toBe(false);
    expect(ledger.expenses[0].payerId).toBe('family-a');
    expect(ledger.expenses[0].splitFamilyIds).toEqual(['family-a', 'family-b', 'family-c']);
  });
});
