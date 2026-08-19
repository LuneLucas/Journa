const { test, expect } = require('@playwright/test');

async function dismissWelcomeIfOpen(page) {
  const welcome = page.locator('#welcomeView');
  if (await welcome.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.locator('#welcomeSkipButton').click({ force: true });
    await expect(welcome).toBeHidden();
  }
}

async function openAmountEditor(page, projectName) {
  await page.addInitScript(() => {
    localStorage.setItem('travel-ledger-welcome-seen', '1');
  });
  await page.route('**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: 'window.supabase = undefined;',
  }));
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
    await page.addInitScript((state) => {
      localStorage.setItem('travel-ledger-v3', JSON.stringify(state));
    }, editableMobileLedger);
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
    await expect(page.locator('.toast')).toContainText('已更新账单');
  });

  test('expanded data cards do not hide the submit bar after returning to entry', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '数据卡片与提交栏回归只在移动端启用');
    await page.addInitScript((state) => {
      localStorage.setItem('travel-ledger-v3', JSON.stringify(state));
    }, editableMobileLedger);
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
    await page.addInitScript((state) => {
      localStorage.setItem('travel-ledger-v3', JSON.stringify(state));
    }, customSplitEditableMobileLedger);
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
      return {
        tokenOverflow: getComputedStyle(token).overflow,
        lensRadius: lensStyle.borderRadius,
        lensShadow: lensStyle.boxShadow,
      };
    });
    expect(lens.tokenOverflow).toBe('visible');
    expect(lens.lensRadius).not.toBe('0px');
    expect(lens.lensShadow).not.toBe('none');
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
    expect(motion.shellSurface).toContain('0.88');
    expect(motion.shellShadow).toContain('0 24px 48px -24px');

    await page.locator('#naturalEntryFocusBackdrop').evaluate((backdrop) => backdrop.click());
    await expect(page.locator('#naturalEntryStage')).toBeHidden();
    await page.locator('#naturalNoteToken').click({ force: true });
    const openingFilter = await page.locator('.natural-entry-stage-shell').evaluate((shell) => getComputedStyle(shell).backdropFilter);
    expect(openingFilter).toBe('none');
    await expect(page.locator('#naturalEntryStage')).toHaveClass(/is-relay-settled/);
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
      };
    });

    expect(motion.focusScrim).toContain('0.12');
    expect(motion.focusFilter).toMatch(/saturate\(1\.08\)/);
    expect(motion.backdropColor).toContain('0.12');
    expect(motion.shellFilter).toContain('blur');
    expect(motion.shellSurface).toContain('0.21');
  });

  test('bottom submit bar follows one anchored lift and landing rebound path', async ({ page }, testInfo) => {
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
          lensSheenDisplay: getComputedStyle(bar.querySelector('.mobile-submit-lens-sheen')).display,
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
      expect(collapse.overshoot).toBeGreaterThanOrEqual(1.2);
      expect(collapse.overshoot).toBeLessThanOrEqual(3.8);
      expect(collapse.tailMovesBackwards).toBeFalsy();
      expect(collapse.finalBottomError).toBeLessThanOrEqual(1.1);

      const expandFrames = await sampleTransition('#mobileEntryTab', 660);
      const expand = summarize(expandFrames, 'expand');
      expect(expand.rightDrift).toBeLessThanOrEqual(1.1);
      expect(expand.lift).toBeGreaterThanOrEqual(2.2);
      expect(expand.lift).toBeLessThanOrEqual(3.8);
      expect(expand.overshoot).toBeGreaterThanOrEqual(1.2);
      expect(expand.overshoot).toBeLessThanOrEqual(3.8);
      expect(expand.tailMovesBackwards).toBeFalsy();
      expect(expand.finalBottomError).toBeLessThanOrEqual(1.1);
      expect(expandFrames[0].expandHaloCount).toBe(0);
      expect(Number(expandFrames[0].auraOpacity)).toBe(0);
      expect(Number(expandFrames[expandFrames.length - 1].auraOpacity)).toBe(0);
      expect(expandFrames[0].lensSheenDisplay).toBe('none');

      await page.locator('#mobileDataTab').click();
      await page.waitForTimeout(120);
      await page.locator('#mobileEntryTab').click();
      await page.waitForTimeout(700);
      await expect(page.locator('#ledgerView')).toHaveAttribute('data-mobile-panel', 'entry');
      await expect(page.locator('#mobileSubmitBar')).not.toHaveClass(/is-flip-morphing/);
      await expect(page.locator('.bar-summary-ghost')).toHaveCount(0);
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
});
