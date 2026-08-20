const { test, expect } = require('@playwright/test');
const { seedLocalState, stubSupabase } = require('./support/test-helpers');

async function openFreshApp(page) {
  await seedLocalState(page, null, { entryMode: 'natural', welcomeSeen: true });
  await stubSupabase(page);
  await page.goto('/index.html?audit=hierarchy-tests', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-shell')).toBeVisible();
}

test.describe('层级优化回归', () => {
  test('设置、账本管理与平账最多显示一个抽屉', async ({ page }) => {
    await openFreshApp(page);

    await page.locator('#openSettingsButton').click();
    await expect(page.locator('#settingsView')).toBeVisible();
    await page.locator('#openLedgerManagerButton').click();
    await expect(page.locator('#ledgerManagementView')).toBeVisible();
    await expect(page.locator('#settingsView')).toBeHidden();

    await page.locator('#closeLedgerManagerButton').click();
    await expect(page.locator('#ledgerManagementView')).toBeHidden({ timeout: 2_000 });
    await expect(page.locator('#settingsView')).toBeVisible();

    await page.locator('#closeSettingsButton').click();
    await expect(page.locator('#settingsView')).toBeHidden({ timeout: 2_000 });
    await page.locator('#settlementEntryButton:visible, #mobileSettlementEntryButton:visible').first().click();
    await expect(page.locator('#settingsView')).toHaveAttribute('data-mode', 'settlement');
    await expect(page.locator('#settingsView .settlement-panel h3')).toHaveCount(0);
    await expect(page.locator('#settingsView h2')).toHaveText('平账建议');
  });

  test('设置最多一层折叠，数据页不显示独立浮动主操作', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端层级回归');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshApp(page);

    await page.locator('#openSettingsButton').click();
    await expect(page.locator('#settingsView')).toBeVisible();
    await expect(page.locator('#settingsView .settings-mobile-group details')).toHaveCount(0);
    await expect(page.locator('#settingsView .settings-actions-section')).toHaveCount(1);

    await page.locator('#closeSettingsButton').click();
    await page.locator('#mobileDataTab').click();
    await expect(page.locator('#mobileSubmitBar')).toHaveCSS('opacity', '0');
    await expect(page.locator('#mobileSubmitBar')).toHaveCSS('visibility', 'hidden');
    await page.locator('#mobileEntryTab').click();
    await expect(page.locator('#mobileSubmitBar')).toHaveCSS('opacity', '1');
    await expect(page.locator('#mobileSubmitBar')).toHaveCSS('visibility', 'visible');
  });

  test('全部家庭分摊不再显示参与家庭子层', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端自然录入回归');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshApp(page);

    await page.locator('#mobileEntryTab').click();
    await page.getByRole('button', { name: '三家均分', exact: true }).click();
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-open/);
    await expect(page.locator('#splitParticipantToggle')).toBeHidden();
    await expect(page.locator('#splitFamilyChoices')).toBeVisible();
  });

  test('桌面统计默认收起且关键尺寸无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openFreshApp(page);
    const geometry = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth > innerWidth,
      openInsights: document.querySelectorAll('.insights-panel .insight-details[open]').length,
    }));
    expect(geometry.overflowX).toBe(false);
    expect(geometry.openInsights).toBe(0);
  });
});
