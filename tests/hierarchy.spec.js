const { test, expect } = require('@playwright/test');
const { seedLocalState, stubSupabase } = require('./support/test-helpers');

async function openFreshApp(page, initialState = null) {
  await seedLocalState(page, initialState, { entryMode: 'natural', welcomeSeen: true });
  await stubSupabase(page);
  await page.goto('/index.html?audit=hierarchy-tests', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-shell')).toBeVisible();
}

const settlementLedger = {
  activeLedgerId: 'hierarchy-settlement-ledger',
  ledgers: [{
    id: 'hierarchy-settlement-ledger',
    name: '层级平账回归账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
    ],
    categories: ['餐饮'],
    familyMembers: { 'family-a': 1, 'family-b': 1 },
    expenses: [{
      id: 'hierarchy-settlement-expense',
      amount: 100,
      payerId: 'family-a',
      category: '餐饮',
      date: '2026-08-22',
      note: '层级平账测试',
      splitMode: 'equal',
      splitFamilyIds: [],
      splitAmounts: {},
      createdBy: { familyId: 'family-a' },
      updatedBy: null,
      createdAt: '2026-08-22T12:00:00.000Z',
      updatedAt: '2026-08-22T12:00:00.000Z',
    }],
  }],
};

const visualGeometryLedger = {
  activeLedgerId: 'hierarchy-visual-ledger',
  ledgers: [{
    id: 'hierarchy-visual-ledger',
    name: '圆角与中线回归账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
      { id: 'family-c', name: '旦家' },
    ],
    categories: ['交通', '住宿', '餐饮', '门票', '购物', '其他'],
    familyMembers: { 'family-a': 1, 'family-b': 1, 'family-c': 1 },
    expenses: [{
      id: 'hierarchy-visual-expense',
      amount: 88.8,
      payerId: 'family-b',
      category: '交通',
      date: '2026-08-22',
      note: '圆角与中线验证',
      splitMode: 'equal',
      splitFamilyIds: [],
      splitAmounts: {},
      createdBy: { familyId: 'family-b' },
      updatedBy: null,
      createdAt: '2026-08-22T12:00:00.000Z',
      updatedAt: '2026-08-22T12:00:00.000Z',
    }],
  }],
};

test.describe('层级优化回归', () => {
  test('平账方式默认最简方案并可切换当前方案', async ({ page }) => {
    await openFreshApp(page, settlementLedger);

    await page.locator('#openSettingsButton').click();
    const simpleChoice = page.locator('#settingsSettlementMethodList [data-settlement-method-choice="simple"]');
    const pairwiseChoice = page.locator('#settingsSettlementMethodList [data-settlement-method-choice="pairwise"]');
    await expect(simpleChoice).toHaveAttribute('aria-checked', 'true');
    await expect(pairwiseChoice).toHaveAttribute('aria-checked', 'false');

    await pairwiseChoice.click();
    await expect(simpleChoice).toHaveAttribute('aria-checked', 'false');
    await expect(pairwiseChoice).toHaveAttribute('aria-checked', 'true');
    expect(await page.evaluate(() => localStorage.getItem('travel-ledger-settlement-method'))).toBe('pairwise');

    await simpleChoice.click();
    await expect(simpleChoice).toHaveAttribute('aria-checked', 'true');
    await expect(pairwiseChoice).toHaveAttribute('aria-checked', 'false');
  });

  test('设置、账本管理与平账最多显示一个抽屉', async ({ page }) => {
    await openFreshApp(page, settlementLedger);

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

  test('设置最多一层折叠，数据页保留独立浮动新增入口', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端层级回归');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshApp(page);

    await page.locator('#openSettingsButton').click();
    await expect(page.locator('#settingsView')).toBeVisible();
    await expect(page.locator('#settingsView .settings-mobile-group details')).toHaveCount(0);
    await expect(page.locator('#settingsView .settings-actions-section')).toHaveCount(1);

    await page.locator('#closeSettingsButton').click();
    await page.locator('#mobileDataTab').click();
    await expect(page.locator('#mobileSubmitBar')).toHaveCSS('opacity', '1');
    await expect(page.locator('#mobileSubmitBar')).toHaveCSS('visibility', 'visible');
    await expect(page.locator('#mobileSubmitButton')).toHaveAttribute('aria-label', '选择付款家庭');
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
    const splitModeGeometry = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const buttonStyle = getComputedStyle(document.querySelector('.natural-entry-stage .split-mode-button'));
      return {
        buttonRadius: Number.parseFloat(buttonStyle.borderTopLeftRadius),
        mediumRadius: Number.parseFloat(rootStyle.getPropertyValue('--radius-md')),
      };
    });
    expect(splitModeGeometry.buttonRadius).toBe(splitModeGeometry.mediumRadius);
  });

  test('桌面统计默认收起且关键尺寸无横向溢出', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openFreshApp(page, visualGeometryLedger);
    const geometry = await page.evaluate(() => {
      const radius = (element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
      const rootStyle = getComputedStyle(document.documentElement);
      return {
        overflowX: document.documentElement.scrollWidth > innerWidth,
        openInsights: document.querySelectorAll('.insights-panel .insight-details[open]').length,
        mediumRadius: Number.parseFloat(rootStyle.getPropertyValue('--radius-md')),
        largeRadius: Number.parseFloat(rootStyle.getPropertyValue('--radius-lg')),
        extraLargeRadius: Number.parseFloat(rootStyle.getPropertyValue('--radius-xl')),
        ledgerSectionRadius: radius(document.querySelector('.ledger-section')),
        ledgerItemRadius: radius(document.querySelector('.ledger-item')),
        insightsPanelRadius: radius(document.querySelector('.insights-panel')),
        insightRadius: radius(document.querySelector('.insight-details')),
        settlementEntryRadius: radius(document.querySelector('#settlementEntryButton')),
      };
    });
    expect(geometry.overflowX).toBe(false);
    expect(geometry.openInsights).toBe(0);
    expect(geometry.mediumRadius).toBeLessThan(geometry.largeRadius);
    expect(geometry.largeRadius).toBeLessThan(geometry.extraLargeRadius);
    expect(geometry.ledgerSectionRadius).toBe(geometry.extraLargeRadius);
    expect(geometry.ledgerItemRadius).toBe(geometry.mediumRadius);
    expect(geometry.insightsPanelRadius).toBe(geometry.extraLargeRadius);
    expect(geometry.insightRadius).toBe(geometry.mediumRadius);
    expect(geometry.settlementEntryRadius).toBe(geometry.mediumRadius);

    await page.locator('#openSettingsButton').click();
    await expect(page.locator('#settingsView')).toBeVisible();
    const settingsGeometry = await page.evaluate(() => {
      const radius = (element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
      return {
        choiceRadius: radius(document.querySelector('.settings-entry-mode-choice')),
        inputRadius: radius(document.querySelector('.ledger-name-form input')),
      };
    });
    expect(settingsGeometry.choiceRadius).toBe(settingsGeometry.inputRadius);
  });

  test('移动端统计、设置扁平层级与选择内容中线保持一致', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端视觉几何回归');
    await page.setViewportSize({ width: 390, height: 844 });
    await openFreshApp(page, visualGeometryLedger);

    const dataGeometry = await page.evaluate(() => {
      const radius = (element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
      const firstInsight = document.querySelector('.insight-details');
      return {
        insightRadius: radius(firstInsight),
        mediumRadius: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius-md')),
      };
    });
    expect(dataGeometry.insightRadius).toBe(dataGeometry.mediumRadius);

    await page.locator('#categorySummaryBlock > summary').click();
    const summaryAlignment = await page.locator('.category-row').first().evaluate((row) => {
      const icon = row.querySelector('.category-symbol-pair').getBoundingClientRect();
      const label = row.querySelector('.category-label-text').getBoundingClientRect();
      return Math.abs((icon.top + icon.height / 2) - (label.top + label.height / 2));
    });
    expect(summaryAlignment).toBeLessThan(0.6);

    await page.locator('#openSettingsButton').click();
    await expect(page.locator('#settingsView')).toBeVisible();
    const settingsGeometry = await page.evaluate(() => {
      const radius = (element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
      const panel = document.querySelector('#currentLedgerSummary').closest('.settings-panel');
      const card = document.querySelector('.current-ledger-card');
      const secondaryPanel = document.querySelector('.personalization-panel');
      const input = document.querySelector('.ledger-name-form input');
      const entryModeChoice = document.querySelector('.settings-entry-mode-choice');
      const save = document.querySelector('.ledger-name-form .secondary-button');
      const manager = document.querySelector('.settings-panel-title .compact-button');
      const choices = [...document.querySelectorAll('#settingsOperatorFamilyList .operator-family-choice')];
      const choiceRects = choices.map((choice) => choice.getBoundingClientRect());
      const labelOffsets = choices.map((choice) => {
        const choiceRect = choice.getBoundingClientRect();
        const labelRect = choice.querySelector('span').getBoundingClientRect();
        return {
          x: Math.abs((choiceRect.left + choiceRect.width / 2) - (labelRect.left + labelRect.width / 2)),
          y: Math.abs((choiceRect.top + choiceRect.height / 2) - (labelRect.top + labelRect.height / 2)),
        };
      });
      return {
        panelRadius: radius(panel),
        cardRadius: radius(card),
        panelBackgroundImage: getComputedStyle(panel).backgroundImage,
        panelBackgroundColor: getComputedStyle(panel).backgroundColor,
        panelShadow: getComputedStyle(panel).boxShadow,
        cardBackgroundImage: getComputedStyle(card).backgroundImage,
        cardBackgroundColor: getComputedStyle(card).backgroundColor,
        cardShadow: getComputedStyle(card).boxShadow,
        secondaryDivider: Number.parseFloat(getComputedStyle(secondaryPanel).borderTopWidth),
        dataItemCount: document.querySelectorAll('#settingsDataSummary .settings-data-item').length,
        guideHeadingCount: document.querySelectorAll('.settings-guide-panel h3:not(.visually-hidden)').length,
        inputRadius: radius(input),
        entryModeChoiceRadius: radius(entryModeChoice),
        saveRadius: radius(save),
        managerRadius: radius(manager),
        choiceDisplay: getComputedStyle(choices[0]).display,
        choiceAlign: getComputedStyle(choices[0]).alignItems,
        choiceTops: choiceRects.map((rect) => rect.top),
        choiceHeights: choiceRects.map((rect) => rect.height),
        labelOffsets,
      };
    });

    expect(settingsGeometry.panelRadius).toBe(0);
    expect(settingsGeometry.cardRadius).toBe(0);
    expect(settingsGeometry.panelBackgroundImage).toBe('none');
    expect(settingsGeometry.panelBackgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(settingsGeometry.panelShadow).toBe('none');
    expect(settingsGeometry.cardBackgroundImage).toBe('none');
    expect(settingsGeometry.cardBackgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(settingsGeometry.cardShadow).toBe('none');
    expect(settingsGeometry.secondaryDivider).toBeGreaterThan(0);
    expect(settingsGeometry.dataItemCount).toBe(2);
    expect(settingsGeometry.guideHeadingCount).toBe(0);
    expect(settingsGeometry.saveRadius).toBe(settingsGeometry.inputRadius);
    expect(settingsGeometry.managerRadius).toBe(settingsGeometry.inputRadius);
    expect(settingsGeometry.entryModeChoiceRadius).toBe(settingsGeometry.inputRadius);
    expect(settingsGeometry.choiceDisplay).toBe('flex');
    expect(settingsGeometry.choiceAlign).toBe('center');
    expect(Math.max(...settingsGeometry.choiceTops) - Math.min(...settingsGeometry.choiceTops)).toBeLessThan(0.6);
    expect(Math.max(...settingsGeometry.choiceHeights) - Math.min(...settingsGeometry.choiceHeights)).toBeLessThan(0.6);
    settingsGeometry.labelOffsets.forEach(({ x, y }) => {
      expect(x).toBeLessThan(0.6);
      expect(y).toBeLessThan(0.6);
    });

    await page.locator('.settings-panel:has(#settingsCategoryChips) > summary').click();
    await expect(page.locator('.settings-category-chip').first()).toBeVisible();
    const settingCategoryAlignment = await page.locator('.settings-category-chip').first().evaluate((chip) => {
      const icon = chip.querySelector('.category-symbol-pair').getBoundingClientRect();
      const label = chip.querySelector('.category-label-text').getBoundingClientRect();
      return Math.abs((icon.top + icon.height / 2) - (label.top + label.height / 2));
    });
    expect(settingCategoryAlignment).toBeLessThan(0.6);

    await page.setViewportSize({ width: 320, height: 568 });
    const narrowGeometry = await page.evaluate(() => {
      const radius = (element) => Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
      const settingsDrawer = document.querySelector('.settings-drawer');
      const panel = document.querySelector('#currentLedgerSummary').closest('.settings-panel');
      const card = document.querySelector('.current-ledger-card');
      const input = document.querySelector('.ledger-name-form input');
      const icon = document.querySelector('.settings-category-chip .category-symbol-pair').getBoundingClientRect();
      const label = document.querySelector('.settings-category-chip .category-label-text').getBoundingClientRect();
      return {
        drawerOverflow: settingsDrawer.scrollWidth - settingsDrawer.clientWidth,
        panelRadius: radius(panel),
        cardRadius: radius(card),
        panelBackgroundImage: getComputedStyle(panel).backgroundImage,
        cardBackgroundImage: getComputedStyle(card).backgroundImage,
        inputRadius: radius(input),
        categoryCenterOffset: Math.abs((icon.top + icon.height / 2) - (label.top + label.height / 2)),
      };
    });
    expect(narrowGeometry.drawerOverflow).toBeLessThanOrEqual(0.6);
    expect(narrowGeometry.panelRadius).toBe(0);
    expect(narrowGeometry.cardRadius).toBe(0);
    expect(narrowGeometry.panelBackgroundImage).toBe('none');
    expect(narrowGeometry.cardBackgroundImage).toBe('none');
    expect(narrowGeometry.inputRadius).toBeGreaterThan(0);
    expect(narrowGeometry.categoryCenterOffset).toBeLessThan(0.6);
  });
});
