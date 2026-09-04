const { test, expect } = require('@playwright/test');
const { dismissWelcomeIfOpen, seedLocalState, stubSupabase } = require('./support/test-helpers');

async function openAmountEditor(page, projectName) {
  await seedLocalState(page, null, { welcomeSeen: true });
  await stubSupabase(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dismissWelcomeIfOpen(page);
  if (projectName.includes('mobile')) {
    await page.evaluate(() => localStorage.setItem('travel-ledger-entry-mode', 'natural'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute('data-entry-mode', 'natural');
    await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'data');
    await expect(page.locator('#mobileEntryTab')).toBeVisible();
    await dismissWelcomeIfOpen(page);
    await page.waitForTimeout(250);
    await page.locator('#mobileEntryTab').click();
    await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'entry');
    await expect(page.locator('#naturalEntryFlow')).toBeVisible();
    await expect(page.locator('#naturalAmountToken')).toBeVisible();
    await dismissWelcomeIfOpen(page);
    await page.locator('#naturalAmountToken').click();
    await expect(page.locator('#amountInput')).toBeVisible();
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
    return;
  }
  await page.evaluate(() => localStorage.setItem('travel-ledger-entry-mode', 'standard'));
  await page.reload({ waitUntil: 'commit' });
}

async function closeAndSampleNoteReturn(page) {
  const framesPromise = page.evaluate(() => new Promise((resolve) => {
    const started = performance.now();
    const frames = [];
    const read = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const opacity = Number.parseFloat(style.opacity) || 0;
      const visible = rect.width > 0 && rect.height > 0
        && style.visibility !== 'hidden'
        && opacity > 0.05;
      return {
        visible,
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + (rect.width / 2),
        centerY: rect.top + (rect.height / 2),
      };
    };
    const sample = (now) => {
      const stage = document.querySelector('#naturalEntryStage');
      const stageToken = document.querySelector('#naturalEntryStageToken');
      const noteInput = document.querySelector('#noteInput');
      const noteTrack = noteInput?.closest('.note-value-track');
      const anchorLabel = document.querySelector('#naturalNoteToken .natural-entry-token-label');
      const source = read(stageToken);
      const input = read(noteInput);
      const trackOpacity = noteTrack ? getComputedStyle(noteTrack).opacity : '';
      if (input && Number.parseFloat(trackOpacity) <= 0.05) input.visible = false;
      const anchor = read(anchorLabel);
      frames.push({
        ms: now - started,
        stageHidden: Boolean(stage?.hidden),
        source,
        input,
        trackOpacity,
        anchor,
        layerCount: [source, input, anchor].filter((item) => item?.visible).length,
      });
      if (now - started < 700) window.requestAnimationFrame(sample);
      else resolve(frames);
    };
    window.requestAnimationFrame(sample);
  }));
  await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
  return framesPromise;
}

function assertNoteReturnFrames(frames) {
  expect(frames.length).toBeGreaterThan(20);
  expect(frames.every((frame) => frame.layerCount <= 1)).toBeTruthy();
  expect(frames.every((frame) => frame.layerCount >= 1)).toBeTruthy();

  const movingFrames = frames.filter((frame) => frame.source?.visible || frame.input?.visible);
  const maxStep = movingFrames.slice(1).reduce((largest, frame, index) => {
    const previous = movingFrames[index];
    const current = frame.source?.visible ? frame.source : frame.input;
    const prior = previous.source?.visible ? previous.source : previous.input;
    if (!current || !prior) return largest;
    return Math.max(largest, Math.hypot(current.centerX - prior.centerX, current.centerY - prior.centerY));
  }, 0);
  // A 60 Hz RAF sample can straddle the source/anchor metric switch by a
  // small amount; keep the guard tight enough to catch a visible jump while
  // allowing that one-frame handoff variance.
  expect(maxStep).toBeLessThan(20);

  const handoff = frames.find((frame) => frame.anchor?.visible && !(frame.source?.visible || frame.input?.visible));
  expect(handoff).toBeTruthy();
  const priorMoving = [...frames].reverse().find((frame) => frame.ms < handoff.ms && (frame.source?.visible || frame.input?.visible));
  const priorText = priorMoving?.source?.visible ? priorMoving.source : priorMoving?.input;
  expect(priorText).toBeTruthy();
  expect(Math.hypot(priorText.centerX - handoff.anchor.centerX, priorText.centerY - handoff.anchor.centerY)).toBeLessThan(6);
}

const editableMobileLedger = {
  activeLedgerId: 'mobile-edit-ledger',
  ledgers: [{
    id: 'mobile-edit-ledger',
    name: '移动编辑测试账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
    ],
    categories: ['餐饮', '交通'],
    familyMembers: { 'family-a': 1, 'family-b': 1 },
    expenses: [{
      id: 'mobile-edit-expense',
      amount: 12.34,
      payerId: 'family-a',
      category: '餐饮',
      date: '2026-08-12',
      note: '编辑前备注',
      splitMode: 'equal',
      splitFamilyIds: [],
      splitAmounts: {},
      createdBy: { familyId: 'family-a' },
      updatedBy: null,
      createdAt: '2026-08-12T12:00:00.000Z',
      updatedAt: '2026-08-12T12:00:00.000Z',
    }],
  }],
};

const customSplitEditableMobileLedger = {
  activeLedgerId: 'mobile-custom-split-edit-ledger',
  ledgers: [{
    id: 'mobile-custom-split-edit-ledger',
    name: '移动自定分摊编辑测试账本',
    families: [
      { id: 'family-a', name: '乐家' },
      { id: 'family-b', name: '祺家' },
      { id: 'family-c', name: '旦家' },
    ],
    categories: ['餐饮', '交通'],
    familyMembers: { 'family-a': 1, 'family-b': 1, 'family-c': 1 },
    expenses: [{
      id: 'mobile-custom-split-expense',
      amount: 422.01,
      payerId: 'family-a',
      category: '餐饮',
      date: '2026-08-12',
      note: '自定分摊数字显示',
      splitMode: 'custom',
      splitFamilyIds: [],
      splitAmounts: { 'family-a': 345.67, 'family-b': 64, 'family-c': 12.34 },
      createdBy: { familyId: 'family-a' },
      updatedBy: null,
      createdAt: '2026-08-12T12:00:00.000Z',
      updatedAt: '2026-08-12T12:00:00.000Z',
    }],
  }],
};

test.describe('mobile entry smoke flow', () => {
  test('mobile edit saves the existing expense from the floating submit button', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端编辑保存回归');
    await seedLocalState(page, editableMobileLedger);
    await openAmountEditor(page, testInfo.project.name);

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await expect(page.locator('#naturalEntryFocusBackdrop')).toBeHidden();
    await page.locator('#mobileDataTab').click();
    await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'data');
    const card = page.locator('[data-expense-id="mobile-edit-expense"]');
    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'true');
    await card.locator('[data-edit-id="mobile-edit-expense"]').click();

    await expect(page.locator('#editBanner')).toBeVisible();
    await expect(page.locator('#mobileSubmitButton')).toHaveAttribute('aria-label', '保存修改');
    await page.locator('#naturalAmountToken').click({ force: true });
    await expect(page.locator('#amountInput')).toBeVisible();
    await page.locator('#amountInput').fill('45.67');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#mobileEntryTab').click({ force: true });
    await expect(page.locator('#naturalEntryFlow')).toBeVisible();
    await page.locator('#naturalNoteToken').click({ force: true });
    await expect(page.locator('#noteInput')).toBeVisible();
    await page.locator('#noteInput').fill('编辑后备注');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await expect(page.locator('#mobileSubmitButton')).toBeVisible();
    await page.locator('#mobileSubmitButton').click();

    await expect(page.locator('#editBanner')).toBeHidden();
    await expect(page.locator('.ledger-item')).toHaveCount(1);
    await expect(page.locator('.ledger-item')).toContainText('¥45.67');
    await expect(page.locator('.ledger-item')).toContainText('编辑后备注');
    await expect(page.locator('.toast')).toContainText('修改已保存');
  });

  test('expanded data cards do not hide the submit bar after returning to entry', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '数据卡片与提交栏回归只在移动端启用');
    await seedLocalState(page, editableMobileLedger);
    await openAmountEditor(page, testInfo.project.name);

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#mobileDataTab').click();
    await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'data');

    const card = page.locator('[data-expense-id="mobile-edit-expense"]');
    const bar = page.locator('#mobileSubmitBar');
    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(bar).toHaveCSS('opacity', '0');
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
    await expect(bar).toHaveAttribute('inert', '');

    await page.locator('#mobileEntryTab').click();
    await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'entry');
    await page.waitForTimeout(700);
    await expect(bar).toHaveCSS('opacity', '1');
    await expect(bar).toHaveAttribute('aria-hidden', 'false');
    await expect(bar).not.toHaveAttribute('inert', '');

    await page.locator('#mobileDataTab').click();
    await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'data');
    await page.waitForTimeout(700);
    await expect(bar).toHaveCSS('opacity', '0');
    await expect(bar).toHaveAttribute('aria-hidden', 'true');
    await expect(bar).toHaveAttribute('inert', '');

    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(bar).toHaveCSS('opacity', '1');
    await expect(bar).toHaveAttribute('aria-hidden', 'false');
    await expect(bar).not.toHaveAttribute('inert', '');
  });

  test('prefilled custom split amounts keep their full width after entering the natural stage', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自定金额舞台只在移动端启用');
    await seedLocalState(page, customSplitEditableMobileLedger);
    await openAmountEditor(page, testInfo.project.name);

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#mobileDataTab').click();
    const card = page.locator('[data-expense-id="mobile-custom-split-expense"]');
    await card.click();
    await card.locator('[data-edit-id="mobile-custom-split-expense"]').click();

    await expect(page.locator('#editBanner')).toBeVisible();
    await page.locator('#naturalSplitToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

    const geometry = await page.locator('[data-split-amount]').evaluateAll((inputs) => inputs.map((input) => ({
      value: input.value,
      width: input.clientWidth,
      scrollWidth: input.scrollWidth,
    })));
    expect(geometry.map(({ value }) => value)).toEqual(['345.67', '64', '12.34']);
    expect(geometry.every(({ width, scrollWidth }) => width > 24 && scrollWidth <= width + 1)).toBeTruthy();
  });

  test('saving custom split amounts keeps persisted values in yuan', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自定金额保存单位回归只在移动端启用');
    await seedLocalState(page, customSplitEditableMobileLedger);
    await openAmountEditor(page, testInfo.project.name);

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#mobileDataTab').click();
    const card = page.locator('[data-expense-id="mobile-custom-split-expense"]');
    await card.click();
    await card.locator('[data-edit-id="mobile-custom-split-expense"]').click();
    await page.locator('#naturalSplitToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

    const splitInputs = page.locator('[data-split-amount]');
    await splitInputs.nth(0).fill('345.67');
    await splitInputs.nth(1).fill('64.00');
    await splitInputs.nth(2).fill('12.34');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#mobileSubmitButton').click();

    await expect(page.locator('#editBanner')).toBeHidden();
    const persisted = await page.evaluate(() => {
      const appState = JSON.parse(localStorage.getItem('travel-ledger-v3'));
      return appState.ledgers[0].expenses.find((expense) => expense.id === 'mobile-custom-split-expense').splitAmounts;
    });
    expect(persisted).toEqual({ 'family-a': 345.67, 'family-b': 64, 'family-c': 12.34 });
  });

  test('amount entry exposes one visible input and preserves the form flow', async ({ page }, testInfo) => {
    await openAmountEditor(page, testInfo.project.name);

    const amount = page.locator('#amountInput');
    await amount.fill('12.34');
    await expect(amount).toHaveValue('12.34');

    const visibleAmountInputs = page.locator('input[type="number"]:visible, input[inputmode="decimal"]:visible');
    await expect(visibleAmountInputs).toHaveCount(1);
  });

  test('amount summary keeps the same rounded lens geometry as other tokens', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自然录入透镜只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();

    const lens = await page.locator('#naturalAmountToken').evaluate((token) => {
      const lensStyle = getComputedStyle(token, '::before');
      const tokenRect = token.getBoundingClientRect();
      return {
        tokenOverflow: getComputedStyle(token).overflow,
        tokenHeight: tokenRect.height,
        lensRadius: lensStyle.borderRadius,
        lensShadow: lensStyle.boxShadow,
        lensTop: lensStyle.top,
        lensBottom: lensStyle.bottom,
        lensHeight: Number.parseFloat(lensStyle.height),
      };
    });
    expect(lens.tokenOverflow).toBe('visible');
    expect(lens.lensRadius).not.toBe('0px');
    expect(lens.lensShadow).not.toBe('none');
    expect(lens.lensTop).toBe('5px');
    expect(lens.lensBottom).toBe('4px');
    expect(Math.abs(lens.lensHeight - (lens.tokenHeight - 9))).toBeLessThanOrEqual(0.5);

    const splitLensShadow = await page.locator('#naturalSplitToken').evaluate((token) => getComputedStyle(token, '::before').boxShadow);
    expect(splitLensShadow).toContain('0.55px');
  });

  test('mobile panel indicator stretches before settling on both directions', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端分段切换器只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();

    await page.locator('#mobileDataTab').click();
    await page.waitForTimeout(700);
    const restingWidth = await page.locator('.mobile-panel-indicator').evaluate((indicator) => indicator.getBoundingClientRect().width);

    const sampleIndicator = (selector) => page.evaluate((tabSelector) => new Promise((resolve) => {
      const tab = document.querySelector(tabSelector);
      const indicator = document.querySelector('.mobile-panel-indicator');
      const started = performance.now();
      const frames = [];
      tab?.click();
      const sample = (now) => {
        frames.push({ t: now - started, width: indicator?.getBoundingClientRect().width || 0 });
        if (now - started >= 520) {
          resolve(frames);
          return;
        }
        window.requestAnimationFrame(sample);
      };
      window.requestAnimationFrame(sample);
    }), selector);

    const forwardFrames = await sampleIndicator('#mobileEntryTab');
    const forwardWidths = forwardFrames.map((frame) => frame.width);
    expect(Math.max(...forwardWidths)).toBeGreaterThan(restingWidth * 1.06);
    expect(Math.abs(forwardWidths.at(-1) - restingWidth)).toBeLessThanOrEqual(1.5);

    await page.waitForTimeout(700);
    const backwardFrames = await sampleIndicator('#mobileDataTab');
    const backwardWidths = backwardFrames.map((frame) => frame.width);
    expect(Math.max(...backwardWidths)).toBeGreaterThan(restingWidth * 1.06);
    expect(Math.abs(backwardWidths.at(-1) - restingWidth)).toBeLessThanOrEqual(1.5);
  });

  test('every natural entry stage stays centered in the visual viewport', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自然录入舞台居中只在移动端启用');
    test.setTimeout(90_000);

    const editors = [
      { selector: '#naturalDateToken', width390: 344 },
      { selector: '#naturalPayerToken', width390: 374 },
      { selector: '#naturalAmountToken', width390: 344 },
      { selector: '#naturalCategoryToken', width390: 374 },
      { selector: '#naturalNoteToken', width390: 344 },
      { selector: '#naturalSplitToken', width390: 370 },
    ];

    for (const viewportWidth of [320, 390]) {
      await page.setViewportSize({ width: viewportWidth, height: viewportWidth === 320 ? 568 : 844 });
      await openAmountEditor(page, testInfo.project.name);
      await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
      await expect(page.locator('#naturalEntryStage')).toBeHidden();

      for (const editor of editors) {
        await page.locator(editor.selector).click({ force: true });
        const stage = page.locator('#naturalEntryStage');
        await expect(stage).toHaveClass(/is-relay-settled/);
        const geometry = await stage.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          const viewport = window.visualViewport;
          const viewportLeft = viewport?.offsetLeft || 0;
          const viewportWidth = viewport?.width || window.innerWidth;
          return {
            width: rect.width,
            leftInset: rect.left - viewportLeft,
            rightInset: viewportLeft + viewportWidth - rect.right,
            centerDelta: (rect.left + (rect.width / 2)) - (viewportLeft + (viewportWidth / 2)),
          };
        });
        const expectedWidth = viewportWidth === 320 ? 304 : editor.width390;
        expect(Math.abs(geometry.width - expectedWidth)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.leftInset - geometry.rightInset)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.centerDelta)).toBeLessThanOrEqual(1);
        if (editor.selector === '#naturalDateToken') {
          const dateRadius = await page.locator('#dateInput').evaluate((input) => ({
            actual: Number.parseFloat(getComputedStyle(input).borderTopLeftRadius),
            expected: Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--control-radius')),
          }));
          expect(dateRadius.actual).toBe(18);
          expect(dateRadius.actual).toBe(dateRadius.expected);
        }
        if (editor.selector === '#naturalCategoryToken') {
          const categoryGeometry = await page.locator('#naturalEntryStage').evaluate((element) => {
            const row = element.querySelector('.category-control-row');
            const addButton = element.querySelector('#categoryAddFab');
            const icon = addButton?.querySelector('.category-add-fab-icon');
            const shellRect = element.getBoundingClientRect();
            const rowRect = row?.getBoundingClientRect();
            const buttonStyle = addButton ? getComputedStyle(addButton) : null;
            const iconRect = icon?.getBoundingClientRect();
            return {
              leftInset: rowRect ? rowRect.left - shellRect.left : 0,
              rightInset: rowRect ? shellRect.right - rowRect.right : 0,
              buttonSize: addButton ? addButton.getBoundingClientRect().width : 0,
              buttonBorder: buttonStyle ? Number.parseFloat(buttonStyle.borderTopWidth) : 0,
              buttonBackground: buttonStyle?.backgroundColor || 'transparent',
              iconSize: iconRect?.width || 0,
            };
          });
          expect(categoryGeometry.leftInset).toBeCloseTo(16, 0);
          expect(categoryGeometry.rightInset).toBeCloseTo(16, 0);
          expect(categoryGeometry.buttonSize).toBe(44);
          expect(categoryGeometry.buttonBorder).toBe(1);
          expect(categoryGeometry.buttonBackground).not.toBe('rgba(0, 0, 0, 0)');
          expect(categoryGeometry.iconSize).toBe(20);
        }
        await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
        await expect(stage).toBeHidden();
      }
    }

    // 付款人舞台较宽，金额舞台较窄；两者使用相同的 left/width easing，
    // 因此切换全过程的外框中心都应锁在视觉视口中央。
    await page.setViewportSize({ width: 390, height: 844 });
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalPayerToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
    const switchFrames = await page.evaluate(() => new Promise((resolve) => {
      const stage = document.querySelector('#naturalEntryStage');
      const target = document.querySelector('#naturalAmountToken');
      const frames = [];
      const started = performance.now();
      target.click();
      const sample = (now) => {
        const rect = stage.getBoundingClientRect();
        const viewport = window.visualViewport;
        const viewportLeft = viewport?.offsetLeft || 0;
        const viewportWidth = viewport?.width || window.innerWidth;
        frames.push((rect.left + (rect.width / 2)) - (viewportLeft + (viewportWidth / 2)));
        if (now - started < 420) window.requestAnimationFrame(sample);
        else resolve(frames);
      };
      window.requestAnimationFrame(sample);
    }));
    expect(Math.max(...switchFrames.map((delta) => Math.abs(delta)))).toBeLessThanOrEqual(1);
    await expect(page.locator('#naturalEntryStage')).toHaveAttribute('data-editor', 'amount');
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
  });

  test('note relay keeps one anchored origin through open and close', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '备注 relay 只在移动端启用');

    const sampleRelay = async (action, duration = 620) => page.evaluate(({ action: relayAction, duration: sampleDuration }) => new Promise((resolve) => {
      const stage = document.querySelector('#naturalEntryStage');
      const frames = [];
      const started = performance.now();
      document.querySelector(relayAction).click();
      const sample = (now) => {
        const rect = stage.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          frames.push({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
        }
        if (now - started >= sampleDuration) {
          resolve(frames);
          return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }), { action, duration });

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
      await openAmountEditor(page, testInfo.project.name);
      const closeTiming = await page.locator('#naturalEntryStage').evaluate((stage) => {
        const style = getComputedStyle(stage);
        return {
          closeDuration: style.getPropertyValue('--natural-stage-close-duration').trim(),
          textHandoff: style.getPropertyValue('--natural-stage-text-handoff').trim(),
        };
      });
      expect(closeTiming.closeDuration).toBe('504ms');
      expect(closeTiming.textHandoff).toBe('414ms');
      await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
      await expect(page.locator('#naturalEntryStage')).toBeHidden();

      const openFrames = await sampleRelay('#naturalNoteToken');
      const openOrigin = openFrames[0];
      expect(openOrigin).toBeTruthy();
      expect(Math.max(...openFrames.map((frame) => Math.abs(frame.left - openOrigin.left)))).toBeLessThanOrEqual(2);
      expect(Math.max(...openFrames.map((frame) => Math.abs(frame.top - openOrigin.top)))).toBeLessThanOrEqual(2);
      await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

      const closeFrames = await sampleRelay('#naturalEntryFocusBackdrop');
      const closeOrigin = closeFrames[0];
      expect(closeOrigin).toBeTruthy();
      expect(Math.max(...closeFrames.map((frame) => Math.abs(frame.left - closeOrigin.left)))).toBeLessThanOrEqual(2);
      expect(Math.max(...closeFrames.map((frame) => Math.abs(frame.top - closeOrigin.top)))).toBeLessThanOrEqual(2);
      await expect(page.locator('#naturalEntryStage')).toBeHidden();

      await page.locator('#naturalNoteToken').click({ force: true });
      await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
      await page.locator('#noteInput').fill('酒店晚餐路径检查ABC');
      await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
      await expect(page.locator('#naturalEntryStage')).toBeHidden();
      const filledOpenFrames = await sampleRelay('#naturalNoteToken');
      const filledOpenOrigin = filledOpenFrames[0];
      expect(filledOpenOrigin).toBeTruthy();
      expect(Math.max(...filledOpenFrames.map((frame) => Math.abs(frame.left - filledOpenOrigin.left)))).toBeLessThanOrEqual(2);
      expect(Math.max(...filledOpenFrames.map((frame) => Math.abs(frame.top - filledOpenOrigin.top)))).toBeLessThanOrEqual(2);
      await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
      await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
      await expect(page.locator('#naturalEntryStage')).toBeHidden();
    }
  });

  test('note return keeps one visible text layer through the landing handoff', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '备注返回文字接力只在移动端启用');

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
      await openAmountEditor(page, testInfo.project.name);
      await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
      await expect(page.locator('#naturalEntryStage')).toBeHidden();

      await page.locator('#naturalNoteToken').click({ force: true });
      await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
      const emptyFrames = await closeAndSampleNoteReturn(page);
      assertNoteReturnFrames(emptyFrames);
      await expect(page.locator('#naturalEntryStage')).toBeHidden();

      await page.locator('#naturalNoteToken').click({ force: true });
      await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
      await page.locator('#noteInput').fill('返回交接单层检查');
      const filledFrames = await closeAndSampleNoteReturn(page);
      assertNoteReturnFrames(filledFrames);
      await expect(page.locator('#naturalEntryStage')).toBeHidden();
    }
  });

  test('note return interruption clears relay styles before switching editor', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '备注返回中断只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalNoteToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await page.waitForTimeout(120);
    await page.locator('#naturalAmountToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveAttribute('data-editor', 'amount');
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

    const residual = await page.evaluate(() => ({
      noteInputOpacity: document.querySelector('#noteInput')?.style.opacity || '',
      noteTrackOpacity: document.querySelector('#noteInput')?.closest('.note-value-track')?.style.opacity || '',
      stageTokenVisibility: document.querySelector('#naturalEntryStageToken')?.style.visibility || '',
      sourceState: document.querySelector('#naturalEntryStage')?.dataset.noteSourceState || '',
      flightTokens: document.querySelectorAll('.natural-entry-flight-token').length,
    }));
    expect(residual.noteInputOpacity).toBe('');
    expect(residual.noteTrackOpacity).toBe('');
    expect(residual.stageTokenVisibility).toBe('');
    expect(residual.sourceState).toBe('');
    expect(residual.flightTokens).toBe(0);

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
  });

  test('note return leaves no relay styles with reduced motion', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '备注减少动态效果只在移动端启用');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalNoteToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
    await page.locator('#noteInput').fill('减少动态效果检查');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();

    const residual = await page.evaluate(() => ({
      noteInputOpacity: document.querySelector('#noteInput')?.style.opacity || '',
      noteTrackOpacity: document.querySelector('#noteInput')?.closest('.note-value-track')?.style.opacity || '',
      stageTokenVisibility: document.querySelector('#naturalEntryStageToken')?.style.visibility || '',
      sourceState: document.querySelector('#naturalEntryStage')?.dataset.noteSourceState || '',
    }));
    expect(residual.noteInputOpacity).toBe('');
    expect(residual.noteTrackOpacity).toBe('');
    expect(residual.stageTokenVisibility).toBe('');
    expect(residual.sourceState).toBe('');
  });

  test('natural stage close reverses the expanded clip path into the source lens', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自然录入舞台路径只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);

    const closeKeyframes = await page.evaluate(() => {
      const stage = document.querySelector('#naturalEntryStage');
      const shell = stage?.querySelector('.natural-entry-stage-shell');
      document.querySelector('#naturalEntryFocusBackdrop')?.click();
      const animation = shell?.getAnimations?.().find((item) => item.animationName === 'natural-entry-stage-shell-relay-close');
      return animation?.effect?.getKeyframes?.().map((frame) => ({
        clipPath: frame.clipPath || '',
        offset: frame.offset,
      })) || [];
    });

    const clipFrames = closeKeyframes.filter((frame) => frame.clipPath);
    expect(clipFrames.length).toBeGreaterThanOrEqual(2);
    expect(clipFrames[0].clipPath).not.toBe(clipFrames[clipFrames.length - 1].clipPath);
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
  });

  test('natural stage close overlaps the lens relay and hands off one amount layer', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自然录入透镜接力只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);

    const relay = await page.evaluate(() => {
      const anchor = document.querySelector('#naturalAmountToken');
      const backdrop = document.querySelector('#naturalEntryFocusBackdrop');
      backdrop?.click();
      const lensStyle = anchor ? getComputedStyle(anchor, '::before') : null;
      const lensAnimation = anchor?.getAnimations?.({ subtree: true }).find((animation) => (
        animation.effect?.pseudoElement === '::before'
        && animation.animationName === 'natural-entry-capsule-motion'
      ));
      const timing = lensAnimation?.effect?.getComputedTiming?.();
      return {
        animationName: lensStyle?.animationName || '',
        animationDuration: lensStyle?.animationDuration || '',
        animationDelay: lensStyle?.animationDelay || '',
        duration: timing?.duration || 0,
        delay: timing?.delay || 0,
      };
    });

    expect(relay.animationName).toBe('natural-entry-capsule-motion');
    expect(relay.animationDuration).toBe('0.16s');
    expect(relay.animationDelay).toBe('0.39s');
    expect(relay.duration).toBe(160);
    expect(relay.delay).toBe(390);

    const handoff = await page.evaluate(() => new Promise((resolve) => {
      const started = performance.now();
      const read = () => {
        const track = document.querySelector('#amountInput')?.closest('.amount-value-track');
        const label = document.querySelector('#naturalAmountToken .natural-entry-token-label');
        const result = {
          trackOpacity: track ? getComputedStyle(track).opacity : '',
          labelOpacity: label ? getComputedStyle(label).opacity : '',
        };
        if (result.trackOpacity === '0' || performance.now() - started >= 580) {
          resolve(result);
          return;
        }
        requestAnimationFrame(read);
      };
      requestAnimationFrame(read);
    }));
    expect(handoff.trackOpacity).toBe('0');
    expect(handoff.labelOpacity).toBe('1');
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
  });

  test('Safari mobile uses semantic motion tokens without material blur during relay', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Safari mobile token contract');
    await openAmountEditor(page, testInfo.project.name);
    await page.waitForFunction(() => document.body.classList.contains('natural-entry-focus-settled'));
    const motion = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      const stage = document.querySelector('#naturalEntryStage');
      const shell = stage?.querySelector('.natural-entry-stage-shell');
      const backdrop = document.querySelector('#naturalEntryFocusBackdrop');
      const backdropStyle = backdrop ? getComputedStyle(backdrop) : null;
      const shellStyle = shell ? getComputedStyle(shell) : null;
      return {
        safariMotion: root.dataset.safariMotion,
        feedback: style.getPropertyValue('--motion-feedback').trim(),
        text: style.getPropertyValue('--motion-text').trim(),
        control: style.getPropertyValue('--motion-control').trim(),
        card: style.getPropertyValue('--motion-card').trim(),
        structure: style.getPropertyValue('--motion-structure').trim(),
        settleClass: document.body.classList.contains('natural-entry-focus-settled'),
        focusScrim: style.getPropertyValue('--natural-stage-focus-scrim').trim(),
        focusFilter: style.getPropertyValue('--natural-stage-focus-filter').trim(),
        backdropColor: backdropStyle?.backgroundColor || '',
        shellFilter: shellStyle?.backdropFilter || '',
        shellSurface: shellStyle?.getPropertyValue('--natural-stage-surface').trim() || '',
        shellShadow: shellStyle?.getPropertyValue('--natural-stage-shadow').trim() || '',
        stageRadius: stage ? getComputedStyle(stage).borderRadius : '',
        stageExpandedRadius: shellStyle?.getPropertyValue('--natural-stage-expanded-radius').trim() || '',
      };
    });
    expect(motion.safariMotion).toBe('true');
    expect(motion.feedback).toBe('90ms');
    expect(motion.text).toBe('220ms');
    expect(motion.control).toBe('300ms');
    expect(motion.card).toBe('440ms');
    expect(motion.structure).toBe('560ms');
    expect(motion.settleClass).toBeTruthy();
    expect(motion.focusScrim).toContain('0.07');
    expect(motion.focusFilter).toMatch(/saturate\(1\.1(?:0)?\)/);
    expect(motion.backdropColor).toContain('0.07');
    expect(motion.shellFilter).toContain('blur');
    expect(motion.shellFilter).toContain('18px');
    expect(motion.shellSurface).toContain('0.82');
    expect(motion.shellShadow).toContain('0 18px 42px -28px');
    expect(motion.stageRadius).toBe('24px');
    expect(motion.stageExpandedRadius).toBe('24px');

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalNoteToken').click({ force: true });
    const openingFilter = await page.locator('.natural-entry-stage-shell').evaluate((shell) => getComputedStyle(shell).backdropFilter);
    expect(openingFilter).toBe('none');
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
    await expect(page.locator('#naturalEntryStage')).toHaveCSS('border-radius', '24px');
  });

  test('Safari dark natural stage keeps the background vivid while the card remains elevated', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '暗色自然录入材质只在移动端启用');
    await page.emulateMedia({ colorScheme: 'dark' });
    await openAmountEditor(page, testInfo.project.name);
    await page.waitForFunction(() => document.body.classList.contains('natural-entry-focus-settled'));

    const motion = await page.evaluate(() => {
      const root = document.documentElement;
      const style = getComputedStyle(root);
      const backdrop = document.querySelector('#naturalEntryFocusBackdrop');
      const shell = document.querySelector('.natural-entry-stage-shell');
      const backdropStyle = getComputedStyle(backdrop);
      const shellStyle = getComputedStyle(shell);
      return {
        focusScrim: style.getPropertyValue('--natural-stage-focus-scrim').trim(),
        focusFilter: style.getPropertyValue('--natural-stage-focus-filter').trim(),
        backdropColor: backdropStyle.backgroundColor,
        shellFilter: shellStyle.backdropFilter,
        shellSurface: shellStyle.getPropertyValue('--natural-stage-surface').trim(),
        shellShadow: shellStyle.getPropertyValue('--natural-stage-shadow').trim(),
      };
    });

    expect(motion.focusScrim).toContain('0.12');
    expect(motion.focusFilter).toMatch(/saturate\(1\.08\)/);
    expect(motion.backdropColor).toContain('0.12');
    expect(motion.shellFilter).toContain('blur');
    expect(motion.shellFilter).toContain('18px');
    expect(motion.shellSurface).toContain('0.18');
    expect(motion.shellShadow).toContain('0 18px 42px -28px');
  });

  test('mobile settlement surface keeps the ledger behind an opaque page layer', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '移动端平账面板背景层回归');
    await seedLocalState(page, editableMobileLedger, { entryMode: 'natural' });
    await stubSupabase(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#mobileSettlementEntryButton')).toBeVisible();
    await page.locator('#mobileSettlementEntryButton').click();

    const drawer = page.locator('#settingsView .settings-drawer');
    await expect(drawer).toBeVisible();
    const material = await drawer.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
      };
    });

    expect(material.backgroundImage).toContain('radial-gradient');
    expect(material.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('bottom submit bar follows one anchored lift and terminal deceleration path', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '底部 Bar 路径只在移动端启用');

    const sampleTransition = async (tabSelector, duration) => page.evaluate(({ tabSelector: selector, duration: sampleDuration }) => new Promise((resolve) => {
      const bar = document.querySelector('#mobileSubmitBar');
      const tab = document.querySelector(selector);
      const frames = [];
      const started = performance.now();
      tab.click();
      const sample = (now) => {
        const rect = bar.getBoundingClientRect();
        frames.push({
          t: now - started,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          expandHaloCount: document.querySelectorAll('.bar-morph-glow').length,
          auraOpacity: getComputedStyle(bar, '::before').opacity,
          motionDuration: getComputedStyle(bar).getPropertyValue('--bar-motion-duration').trim(),
          lensSheenDisplay: getComputedStyle(bar.querySelector('.mobile-submit-lens-sheen')).display,
          transferCount: document.querySelectorAll('.bar-content-transfer > span').length,
          transferOpacity: [...document.querySelectorAll('.bar-content-transfer > span')]
            .reduce((total, node) => total + Number.parseFloat(getComputedStyle(node).opacity || '0'), 0),
          plusOpacity: Number.parseFloat(getComputedStyle(bar.querySelector('.mobile-submit-button'), '::after').opacity || '0'),
          realSummaryOpacity: Number.parseFloat(getComputedStyle(bar.querySelector('.mobile-submit-summary')).opacity || '0'),
          realLabelOpacity: Number.parseFloat(getComputedStyle(bar.querySelector('.mobile-submit-button .button-label')).opacity || '0'),
        });
        if (now - started >= sampleDuration) {
          resolve(frames);
          return;
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }), { tabSelector, duration });

    const summarize = (frames, direction) => {
      const first = frames[0];
      const last = frames[frames.length - 1];
      const widths = frames.map((frame) => frame.width);
      const bottoms = frames.map((frame) => frame.bottom);
      const extremumIndex = direction === 'collapse'
        ? widths.indexOf(Math.min(...widths))
        : widths.indexOf(Math.max(...widths));
      const tail = frames.slice(extremumIndex);
      const tailMovesBackwards = tail.slice(1).some((frame, index) => direction === 'collapse'
        ? frame.width < tail[index].width - 0.25
        : frame.width > tail[index].width + 0.25);
      return {
        rightDrift: Math.max(...frames.map((frame) => Math.abs(frame.right - first.right))),
        lift: first.bottom - Math.min(...bottoms),
        overshoot: direction === 'collapse'
          ? last.width - Math.min(...widths)
          : Math.max(...widths) - last.width,
        tailMovesBackwards,
        finalBottomError: Math.abs(last.bottom - first.bottom),
      };
    };

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 568 });
      await openAmountEditor(page, testInfo.project.name);
      await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
      await expect(page.locator('#naturalEntryStage')).toBeHidden();

      const collapseFrames = await sampleTransition('#mobileDataTab', 620);
      const collapse = summarize(collapseFrames, 'collapse');
      expect(collapse.rightDrift).toBeLessThanOrEqual(1.1);
      expect(collapse.lift).toBeGreaterThanOrEqual(2.2);
      expect(collapse.lift).toBeLessThanOrEqual(3.8);
      expect(collapse.overshoot).toBeLessThanOrEqual(0.8);
      expect(collapse.tailMovesBackwards).toBeFalsy();
      expect(collapse.finalBottomError).toBeLessThanOrEqual(1.1);
      expect(collapseFrames[0].motionDuration).toBe('440ms');
      expect(collapseFrames.every((frame) => frame.expandHaloCount === 0)).toBeTruthy();
      expect(collapseFrames.every((frame) => Number(frame.auraOpacity) === 0)).toBeTruthy();
      expect(collapseFrames.some((frame) => frame.transferCount === 2)).toBeTruthy();
      expect(collapseFrames
        .filter((frame) => frame.t <= 440 * 0.62)
        .every((frame) => frame.transferOpacity > 0.25 || frame.plusOpacity >= 0.75)).toBeTruthy();

      const expandFrames = await sampleTransition('#mobileEntryTab', 660);
      const expand = summarize(expandFrames, 'expand');
      expect(expand.rightDrift).toBeLessThanOrEqual(1.1);
      expect(expand.lift).toBeGreaterThanOrEqual(2.2);
      expect(expand.lift).toBeLessThanOrEqual(3.8);
      expect(expand.overshoot).toBeLessThanOrEqual(0.8);
      expect(expand.tailMovesBackwards).toBeFalsy();
      expect(expand.finalBottomError).toBeLessThanOrEqual(1.1);
      expect(expandFrames[0].motionDuration).toBe('440ms');
      expect(expandFrames[0].expandHaloCount).toBe(0);
      expect(Number(expandFrames[0].auraOpacity)).toBe(0);
      expect(Number(expandFrames[expandFrames.length - 1].auraOpacity)).toBe(0);
      expect(expandFrames[0].lensSheenDisplay).toBe('none');
      expect(expandFrames.some((frame) => frame.transferCount === 2)).toBeTruthy();
      expect(expandFrames
        .filter((frame) => frame.t <= 440 * 0.70)
        .every((frame) => frame.transferOpacity > 0.25 || frame.plusOpacity >= 0.75)).toBeTruthy();
      expect(expandFrames
        .filter((frame) => frame.transferCount === 0)
        .every((frame) => frame.realSummaryOpacity >= 0.9 && frame.realLabelOpacity >= 0.9)).toBeTruthy();

      await page.locator('#mobileDataTab').click();
      await page.waitForTimeout(120);
      await page.locator('#mobileEntryTab').click();
      await page.waitForTimeout(700);
      await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'entry');
      await expect(page.locator('#mobileSubmitBar')).not.toHaveClass(/is-flip-morphing/);
      await expect(page.locator('.bar-content-transfer')).toHaveCount(0);
      await expect(page.locator('.bar-family-tint-membrane')).toHaveCount(0);
    }
  });

  test('amount Enter moves focus to note input', async ({ page }, testInfo) => {
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    const note = page.locator('#noteInput');

    await amount.fill('12.34');
    await amount.press('Enter');
    await expect(note).toBeFocused();
  });

  test('long amount stays inside its track and keeps the caret visible', async ({ page }, testInfo) => {
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    await amount.fill('123456789012.34');

    const geometry = await amount.evaluate((el) => {
      const track = el.closest('.amount-value-track');
      return {
        inputRight: el.getBoundingClientRect().right,
        trackRight: track.getBoundingClientRect().right,
        scrollable: el.scrollWidth > el.clientWidth,
        caretAtEnd: el.selectionEnd === el.value.length,
      };
    });
    expect(geometry.inputRight).toBeLessThanOrEqual(geometry.trackRight + 1);
    expect(geometry.scrollable).toBeTruthy();
    expect(geometry.caretAtEnd).toBeTruthy();
  });

  test('custom split keeps a known total and shows the compact matched state', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自定金额入口只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    const splitInputs = page.locator('[data-split-amount]');
    const totalLine = page.locator('.split-total-line');

    // Known total: switching modes must keep it as the target instead of resetting to 0.
    await amount.fill('268.50');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalSplitToken').click();
    await page.getByRole('radio', { name: '自定金额' }).click();
    await expect(amount).toHaveValue('268.50');
    await splitInputs.nth(0).fill('101.20');
    await splitInputs.nth(1).fill('67.80');
    await splitInputs.nth(2).fill('99.50');
    await expect(totalLine).toHaveText('¥268.50 ✓');
  });

  test('custom split derives the total when family amounts are entered first', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自定金额入口只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await page.locator('#naturalSplitToken').click();
    await page.getByRole('radio', { name: '自定金额' }).click();
    const splitInputs = page.locator('[data-split-amount]');
    await splitInputs.nth(0).fill('101.20');
    await splitInputs.nth(1).fill('67.80');
    await splitInputs.nth(2).fill('99.50');
    await expect(amount).toHaveValue('268.50');
    await expect(page.locator('.split-total-line')).toHaveText('¥268.50');
  });

  test('custom split preserves decimal input across typing and rerenders', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自定金额入口只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await page.locator('#naturalSplitToken').click();
    await page.getByRole('radio', { name: '自定金额' }).click();

    const splitInputs = page.locator('[data-split-amount]');
    const first = splitInputs.nth(0);
    await first.pressSequentially('12.', { delay: 30 });
    await splitInputs.nth(1).focus();
    await page.evaluate(() => renderSplitScope());
    await expect(first).toHaveValue('12.');

    await first.focus();
    await first.pressSequentially('34', { delay: 30 });
    await expect(first).toHaveValue('12.34');

    await splitInputs.nth(1).fill('56。78');
    await expect(splitInputs.nth(1)).toHaveValue('56.78');
    await expect(page.locator('.split-total-line')).toHaveText('¥69.12');
  });

  test('custom split marks a mismatch and lets a family be excluded inline', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自定金额入口只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    await amount.fill('268.50');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await page.locator('#naturalSplitToken').click();
    await page.getByRole('radio', { name: '自定金额' }).click();

    const rows = page.locator('.split-amount-row');
    const splitInputs = page.locator('[data-split-amount]');
    await splitInputs.nth(0).fill('101.20');
    await splitInputs.nth(1).fill('67.80');
    await splitInputs.nth(2).fill('90');
    await expect(page.locator('.split-total-line')).toHaveText('¥259 ≠ ¥268.50');

    await rows.nth(2).getByRole('button', { name: /参与分摊/ }).click();
    await expect(splitInputs.nth(2)).toBeDisabled();
    await expect(page.locator('.split-total-line')).toHaveText('¥169 ≠ ¥268.50');
  });

  test('split summaries hand off shared Chinese glyphs without an empty frame', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '分摊汉字接力只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalSplitToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

    const sampleMorph = async (radioName) => {
      const framesPromise = page.evaluate(() => new Promise((resolve) => {
        const started = performance.now();
        const frames = [];
        const sample = (now) => {
          const label = document.querySelector('#naturalEntryStageToken .natural-entry-token-label');
          const oldLayer = label?.querySelector('.split-text-morph-old');
          const newLayer = label?.querySelector('.split-text-morph-new');
          const slot = label?.querySelector('.split-text-morph-slot');
          frames.push({
            ms: now - started,
            text: label?.textContent || '',
            morph: Boolean(label?.querySelector('.split-text-morph')),
            oldOpacity: oldLayer ? Number.parseFloat(getComputedStyle(oldLayer).opacity) : null,
            newOpacity: newLayer ? Number.parseFloat(getComputedStyle(newLayer).opacity) : null,
            slotWidth: slot ? Number.parseFloat(getComputedStyle(slot).width) : null,
            scheduledOverlap: Boolean(
              oldLayer?.getAnimations?.()[0]
              && newLayer?.getAnimations?.()[0]
              && oldLayer.getAnimations()[0].effect.getTiming().duration > newLayer.getAnimations()[0].effect.getTiming().delay,
            ),
          });
          if (now - started < 360) window.setTimeout(() => sample(performance.now()), 4);
          else resolve(frames);
        };
        requestAnimationFrame(sample);
      }));
      await page.getByRole('radio', { name: radioName, exact: true }).click();
      return framesPromise;
    };

    const widerFrames = await sampleMorph('按家庭人数');
    expect(widerFrames.some((frame) => frame.morph)).toBeTruthy();
    // Headless Chromium may coalesce compositor frames across the short 50ms
    // overlap; the animation schedule itself still guarantees the old/new
    // layers coexist for that handoff window.
    expect(widerFrames.some((frame) => frame.oldOpacity > 0.05 && frame.newOpacity > 0.05)
      || widerFrames.some((frame) => frame.scheduledOverlap)).toBeTruthy();
    expect(Math.max(...widerFrames.filter((frame) => frame.slotWidth !== null).map((frame) => frame.slotWidth))
      - Math.min(...widerFrames.filter((frame) => frame.slotWidth !== null).map((frame) => frame.slotWidth))).toBeGreaterThan(10);
    expect(widerFrames.every((frame) => frame.text.length > 0)).toBeTruthy();
    await expect(page.locator('#naturalEntryStageToken .natural-entry-token-label')).toHaveText('三家按人数分摊');

    // 重新打开舞台再验证自定金额：标准模式的选择保留现有自动收起节奏，
    // 试点本身不把这个收起计时器改成另一套交互规则。
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalSplitToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);

    const noPrefixFrames = await sampleMorph('自定金额');
    expect(noPrefixFrames.some((frame) => frame.morph)).toBeTruthy();
    expect(noPrefixFrames.some((frame) => frame.oldOpacity > 0.05 && frame.newOpacity > 0.05)
      || noPrefixFrames.some((frame) => frame.scheduledOverlap)).toBeTruthy();
    await expect(page.locator('#naturalEntryStageToken .natural-entry-token-label')).toHaveText('自定金额分摊');
  });

  test('split summaries settle atomically with reduced motion', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '分摊减少动态效果只在移动端启用');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await page.locator('#naturalSplitToken').click({ force: true });
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
    await page.getByRole('radio', { name: /^按家庭人数/ }).click();
    await expect(page.locator('#naturalEntryStageToken .natural-entry-token-label')).toHaveText('三家按人数分摊');
    await expect(page.locator('#naturalEntryStageToken .split-text-morph')).toHaveCount(0);
    await expect(page.locator('#naturalSplitToken')).toHaveAttribute('aria-label', '三家按人数分摊');
  });

  test('standard split summaries hand off and publish the final accessible names', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.includes('mobile'), '标准录入摘要只在桌面端启用');
    await openAmountEditor(page, testInfo.project.name);
    const scopeToggle = page.locator('#splitScopeToggle');
    const scopeSummary = page.locator('#splitScopeSummary');
    await scopeToggle.click();
    await expect(page.locator('#splitScopePanel')).toBeVisible();

    const framesPromise = page.evaluate(() => new Promise((resolve) => {
      const started = performance.now();
      const frames = [];
      const sample = (now) => {
        const label = document.querySelector('#splitScopeSummary');
        const oldLayer = label?.querySelector('.split-text-morph-old');
        const newLayer = label?.querySelector('.split-text-morph-new');
        frames.push({
          text: label?.textContent || '',
          morph: Boolean(label?.querySelector('.split-text-morph')),
          oldOpacity: oldLayer ? Number.parseFloat(getComputedStyle(oldLayer).opacity) : null,
          newOpacity: newLayer ? Number.parseFloat(getComputedStyle(newLayer).opacity) : null,
          scheduledOverlap: Boolean(
            oldLayer?.getAnimations?.()[0]
            && newLayer?.getAnimations?.()[0]
            && oldLayer.getAnimations()[0].effect.getTiming().duration > newLayer.getAnimations()[0].effect.getTiming().delay,
          ),
          ms: now - started,
        });
        if (now - started < 330) requestAnimationFrame(sample);
        else resolve(frames);
      };
      requestAnimationFrame(sample);
    }));
    await page.getByRole('radio', { name: /^按家庭人数/ }).click();
    const frames = await framesPromise;
    expect(frames.some((frame) => frame.morph)).toBeTruthy();
    expect(frames.some((frame) => frame.oldOpacity > 0.05 && frame.newOpacity > 0.05)
      || frames.some((frame) => frame.scheduledOverlap)).toBeTruthy();
    expect(frames.every((frame) => frame.text.length > 0)).toBeTruthy();
    await expect(scopeSummary).toHaveText('3家按家庭人数');
    await expect(scopeToggle).toHaveAttribute('aria-label', '分摊，3家按家庭人数');
    const scopeBaselineDelta = await scopeToggle.evaluate((toggle) => {
      const label = toggle.children[0]?.getBoundingClientRect();
      const summary = toggle.children[1]?.getBoundingClientRect();
      return label && summary ? Math.abs(label.bottom - summary.bottom) : Infinity;
    });
    expect(scopeBaselineDelta).toBeLessThanOrEqual(2.5);

    const firstFamily = page.locator('#splitFamilyChoices [data-split-family]').first();
    await firstFamily.click();
    await expect(page.locator('#splitParticipantSummary')).toHaveText('2家');
    await expect(page.locator('#splitParticipantToggle')).toHaveAttribute('aria-label', '参与家庭，2家');
    const participantBaselineDelta = await page.locator('#splitParticipantToggle').evaluate((toggle) => {
      const label = toggle.children[0]?.getBoundingClientRect();
      const summary = toggle.children[1]?.getBoundingClientRect();
      return label && summary ? Math.abs(label.bottom - summary.bottom) : Infinity;
    });
    expect(participantBaselineDelta).toBeLessThanOrEqual(2.5);
  });

  test('note expands to a bounded textarea and split amounts remain editable', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自然录入舞台只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#naturalNoteToken').click({ force: true });
    const stage = page.locator('#naturalEntryStage');
    await expect(stage).toHaveClass(/is-relay-settled/);
    const note = page.locator('#noteInput');
    const emptyNoteGeometry = await note.evaluate((el) => {
      const stageRect = document.querySelector('#naturalEntryStage').getBoundingClientRect();
      const noteRect = el.getBoundingClientRect();
      return { stageBottom: stageRect.bottom, noteBottom: noteRect.bottom, inlineHeight: document.querySelector('#naturalEntryStage').style.height };
    });
    expect(emptyNoteGeometry.stageBottom).toBeGreaterThanOrEqual(emptyNoteGeometry.noteBottom - 1);
    expect(emptyNoteGeometry.inlineHeight).toBe('');

    await note.fill('高铁票晚餐上海迪士尼门票测试ABCgjy\n第二行内容\n第三行内容\n第四行滚动');
    await expect(note).toHaveJSProperty('tagName', 'TEXTAREA');
    const noteGeometry = await note.evaluate((el) => {
      const stage = document.querySelector('#naturalEntryStage');
      const stageRect = stage.getBoundingClientRect();
      const noteRect = el.getBoundingClientRect();
      return {
        height: noteRect.height,
        scrollHeight: el.scrollHeight,
        stageBottom: stageRect.bottom,
        noteBottom: noteRect.bottom,
        inlineHeight: stage.style.height,
      };
    });
    expect(noteGeometry.height).toBeGreaterThan(46);
    expect(noteGeometry.scrollHeight).toBeGreaterThanOrEqual(noteGeometry.height);
    expect(noteGeometry.stageBottom).toBeGreaterThanOrEqual(noteGeometry.noteBottom - 1);
    expect(noteGeometry.inlineHeight).toBe('');

    // A multiline note intentionally owns the stage surface. Close that
    // focused editor first, then reopen the split token from the settled
    // sentence so the assertion follows the real modal handoff path.
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(stage).toBeHidden();
    await page.locator('#naturalSplitToken').click();
    await expect(stage).toHaveAttribute('data-editor', 'split');
    await page.getByRole('radio', { name: '自定金额' }).click();
    const splitAmount = page.locator('[data-split-amount]').first();
    await splitAmount.fill('123456789012.34');
    const splitGeometry = await splitAmount.evaluate((el) => {
      const shell = el.closest('.split-amount-input-shell');
      return { inputRight: el.getBoundingClientRect().right, shellRight: shell.getBoundingClientRect().right };
    });
    expect(splitGeometry.inputRight).toBeLessThanOrEqual(splitGeometry.shellRight + 1);
  });

  test('long amount summary stays single-line and inside the mobile viewport', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '自然录入摘要只在移动端启用');
    await openAmountEditor(page, testInfo.project.name);
    await page.locator('#amountInput').fill('123456789012.34');
    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();

    const geometry = await page.locator('#naturalAmountToken').evaluate((token) => {
      const digits = token.querySelector('.natural-entry-amount-digits');
      const flow = document.querySelector('#naturalEntryFlow');
      const viewport = document.documentElement.clientWidth;
      return {
        tokenRight: token.getBoundingClientRect().right,
        flowRight: flow.getBoundingClientRect().right,
        tokenHeight: token.getBoundingClientRect().height,
        viewport,
        pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        ariaLabel: token.getAttribute('aria-label'),
        digitsText: digits.textContent,
        digitsClientWidth: digits.clientWidth,
        digitsScrollWidth: digits.scrollWidth,
        digitsWhiteSpace: getComputedStyle(digits).whiteSpace,
        digitsOverflow: getComputedStyle(digits).textOverflow,
      };
    });

    expect(geometry.tokenRight).toBeLessThanOrEqual(geometry.flowRight + 1);
    expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewport + 1);
    expect(geometry.tokenHeight).toBeLessThan(60);
    expect(geometry.ariaLabel).toContain('123456789012.34');
    expect(geometry.digitsText).toContain('123456789012.34');
    expect(geometry.digitsWhiteSpace).toBe('nowrap');
    expect(geometry.digitsOverflow).toBe('ellipsis');
    expect(geometry.digitsScrollWidth).toBeGreaterThan(geometry.digitsClientWidth);
  });

  test('amount input remeasures when a mobile viewport changes width', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '金额轨道视口重测只在移动端启用');
    await page.setViewportSize({ width: 320, height: 568 });
    await openAmountEditor(page, testInfo.project.name);
    const amount = page.locator('#amountInput');
    const narrow = await amount.evaluate((input) => ({
      width: input.getBoundingClientRect().width,
      fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
    }));

    /* 模拟横屏/地址栏变化：字号已经变大，但 inline width 不能停留在窄屏
       的旧测量值，否则 0.00 的右半会被 amount-field 截掉。 */
    await page.setViewportSize({ width: 596, height: 568 });
    await page.waitForTimeout(120);
    const wide = await amount.evaluate((input) => {
      const inputRect = input.getBoundingClientRect();
      const fieldRect = input.closest('.amount-field').getBoundingClientRect();
      return {
        width: inputRect.width,
        fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
        inputRight: inputRect.right,
        fieldRight: fieldRect.right,
      };
    });

    expect(wide.fontSize).toBeGreaterThan(narrow.fontSize);
    expect(wide.width).toBeGreaterThan(narrow.width + 20);
    expect(wide.width).toBeGreaterThanOrEqual(wide.fontSize * 2.5);
    expect(wide.inputRight).toBeLessThanOrEqual(wide.fieldRight + 1);
  });
});
