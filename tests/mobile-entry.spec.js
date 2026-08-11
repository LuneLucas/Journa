const { test, expect } = require('@playwright/test');

async function openAmountEditor(page, projectName) {
  await page.goto('/');
  const welcome = page.locator('#welcomeView');
  if (await welcome.isVisible()) await page.locator('#welcomeSkipButton').click();
  if (projectName.includes('mobile')) {
    await page.evaluate(() => localStorage.setItem('travel-ledger-entry-mode', 'natural'));
    await page.reload();
    await page.locator('#mobileEntryTab').click();
    await page.locator('#naturalAmountToken').click();
    await expect(page.locator('#amountInput')).toBeVisible();
    return;
  }
  await page.evaluate(() => localStorage.setItem('travel-ledger-entry-mode', 'standard'));
  await page.reload();
}

test.describe('mobile entry smoke flow', () => {
  test('amount entry exposes one visible input and preserves the form flow', async ({ page }, testInfo) => {
    await openAmountEditor(page, testInfo.project.name);

    const amount = page.locator('#amountInput');
    await amount.fill('12.34');
    await expect(amount).toHaveValue('12.34');

    const visibleAmountInputs = page.locator('input[type="number"]:visible, input[inputmode="decimal"]:visible');
    await expect(visibleAmountInputs).toHaveCount(1);
  });

  test('amount Enter moves focus to note input', async ({ page }, testInfo) => {
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    const note = page.locator('#noteInput');

    await amount.fill('12.34');
    await amount.press('Enter');
    await expect(note).toBeFocused();
  });
});
