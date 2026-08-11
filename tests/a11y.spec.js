const { test, expect } = require('@playwright/test');
const { AxeBuilder } = require('@axe-core/playwright');

test('standard entry surface has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('travel-ledger-entry-mode', 'standard'));
  await page.reload();
  await expect(page.locator('body')).toBeVisible();

  const results = await new AxeBuilder({ page })
    .disableRules(['color-contrast'])
    .analyze();

  expect(results.violations.filter(({ impact }) => impact === 'critical' || impact === 'serious'))
    .toEqual([]);
});
