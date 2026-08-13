const { test, expect } = require('@playwright/test');

const sampleState = {
  activeLedgerId: 'ledger-alignment-test',
  ledgers: [{
    id: 'ledger-alignment-test',
    name: '旅行账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
      { id: 'family-c', name: '旦家' },
    ],
    categories: ['交通', '餐饮', '其他'],
    familyMembers: { 'family-a': 1, 'family-b': 1, 'family-c': 1 },
    expenses: [
      {
        id: 'expense-newest',
        amount: 1234.56,
        payerId: 'family-a',
        category: '交通',
        date: '2026-08-12',
        note: '机场到酒店的接送车',
        splitMode: 'equal',
        createdBy: { familyId: 'family-a' },
        updatedBy: { familyId: 'family-b' },
        createdAt: '2026-08-12T12:00:00.000Z',
        updatedAt: '2026-08-12T12:00:00.000Z',
      },
      {
        id: 'expense-older',
        amount: 10,
        payerId: 'family-b',
        category: '餐饮',
        date: '2026-08-12',
        note: '',
        splitMode: 'equal',
        createdBy: { familyId: 'family-b' },
        updatedBy: { familyId: 'family-b' },
        createdAt: '2026-08-12T11:00:00.000Z',
        updatedAt: '2026-08-12T11:00:00.000Z',
      },
    ],
  }],
};

async function openSeededLedger(page) {
  await page.addInitScript((state) => {
    localStorage.setItem('travel-ledger-v3', JSON.stringify(state));
    localStorage.setItem('travel-ledger-welcome-seen', '1');
    localStorage.setItem('travel-ledger-entry-mode', 'standard');
  }, sampleState);
  await page.goto('/');
  await expect(page.locator('.ledger-item').first()).toBeVisible();
  await page.waitForTimeout(500);
}

function rectSnapshot(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

test.describe('ledger card expansion', () => {
  test('mobile expansion keeps the card aligned and actions reachable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-desktop', 'mobile geometry is covered by the mobile projects');
    await page.setViewportSize({ width: 320, height: 568 });
    await openSeededLedger(page);

    const card = page.locator('.ledger-item').first();
    const before = await rectSnapshot(card);
    await expect(card.locator('.ledger-item-actions button').first()).toHaveAttribute('tabindex', '-1');

    await card.click();
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await expect(card.locator('.ledger-expand-cue')).toHaveText('收起');
    await expect(card.locator('.ledger-item-actions button').first()).toBeVisible();
    await page.waitForTimeout(280);

    const after = await rectSnapshot(card);
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after.width - before.width)).toBeLessThan(1);
    expect(await card.locator('.ledger-main').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(200);
    await expect(card.locator('.ledger-operator')).toHaveText('乐家创建 · 祺家更新');

    const overlap = await page.evaluate(() => {
      const card = document.querySelector('.ledger-item.is-expanded');
      const amount = card.querySelector('.ledger-amount').getBoundingClientRect();
      const actions = card.querySelector('.ledger-item-actions').getBoundingClientRect();
      return amount.right > actions.left - 1;
    });
    expect(overlap).toBe(false);

    await card.click();
    await expect(card).toHaveAttribute('aria-expanded', 'false');
    await expect(card.locator('.ledger-item-actions button').first()).toHaveAttribute('tabindex', '-1');

    await page.setViewportSize({ width: 390, height: 844 });
    const beforeWide = await rectSnapshot(card);
    await card.click();
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await page.waitForTimeout(280);
    const afterWide = await rectSnapshot(card);
    expect(Math.abs(afterWide.x - beforeWide.x)).toBeLessThan(1);
    expect(Math.abs(afterWide.width - beforeWide.width)).toBeLessThan(1);
    expect(await card.locator('.ledger-main').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(260);
    await card.click();
    await expect(card).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop expansion retains the date/action columns', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeededLedger(page);

    const card = page.locator('.ledger-item').first();
    await card.click();
    await expect(card).toHaveAttribute('aria-expanded', 'true');
    await expect(card.locator('.ledger-date')).toBeVisible();
    await expect(card.locator('.ledger-item-actions button')).toHaveCount(2);
    await expect(card.locator('.ledger-operator')).toBeVisible();
    await expect(card.locator('.ledger-operator')).toHaveText('乐家创建 · 祺家更新');
  });
});
