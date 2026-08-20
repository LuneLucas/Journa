const { test, expect } = require('@playwright/test');
const { seedLocalState } = require('./support/test-helpers');

const layoutState = {
  activeLedgerId: 'desktop-layout-test',
  ledgers: [{
    id: 'desktop-layout-test',
    name: '旅行账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
      { id: 'family-c', name: '旦家' },
    ],
    categories: ['交通', '住宿', '餐饮', '门票', '购物', '其他'],
    familyMembers: { 'family-a': 1, 'family-b': 1, 'family-c': 1 },
    expenses: [{
      id: 'desktop-layout-expense',
      amount: 128,
      payerId: 'family-a',
      category: '交通',
      date: '2026-08-20',
      note: '机场到酒店',
      splitMode: 'equal',
      splitFamilyIds: [],
      splitAmounts: {},
      createdBy: { familyId: 'family-a' },
      updatedBy: null,
      createdAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-08-20T08:00:00.000Z',
    }],
  }],
};

test('desktop keeps entry, ledger, and insights in one three-column workspace', async ({ page }) => {
  await seedLocalState(page, layoutState, { entryMode: 'standard' });

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/');
  await expect(page.locator('.ledger-item').first()).toBeVisible();

  for (const width of [1024, 1179, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const workspace = document.querySelector('.workspace');
      const style = getComputedStyle(workspace);
      const rect = (selector) => document.querySelector(selector).getBoundingClientRect();
      const entry = rect('.entry-panel');
      const ledger = rect('.ledger-section');
      const insights = rect('.insights-panel');
      return {
        areas: style.gridTemplateAreas,
        entryPosition: getComputedStyle(document.querySelector('.entry-panel')).position,
        insightsPosition: getComputedStyle(document.querySelector('.insights-panel')).position,
        ledgerScrollMargin: getComputedStyle(document.querySelector('.ledger-section')).scrollMarginBlockStart,
        pageWidth: document.documentElement.scrollWidth,
        entry: { x: entry.x, right: entry.right },
        ledger: { x: ledger.x, right: ledger.right },
        insights: { x: insights.x, right: insights.right },
      };
    });

    expect(geometry.areas, `viewport ${width}`).toBe('"entry ledger insights"');
    expect(geometry.entryPosition, `viewport ${width} entry stays in the page flow`).toBe('static');
    expect(geometry.insightsPosition, `viewport ${width} insights stays available`).toBe('sticky');
    expect(geometry.ledgerScrollMargin, `viewport ${width} ledger clears the header`).not.toBe('0px');
    expect(geometry.pageWidth, `viewport ${width} should not overflow`).toBeLessThanOrEqual(width + 1);
    expect(geometry.ledger.x, `viewport ${width} ledger follows entry`).toBeGreaterThanOrEqual(geometry.entry.right - 1);
    expect(geometry.insights.x, `viewport ${width} insights follows ledger`).toBeGreaterThanOrEqual(geometry.ledger.right - 1);
  }
});
