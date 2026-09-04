const { test, expect } = require('@playwright/test');
const { seedLocalState, stubSupabase } = require('./support/test-helpers');

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

async function openSeededLedger(page, state = sampleState) {
  await stubSupabase(page);
  await seedLocalState(page, state, { entryMode: 'standard' });
  const activeLedger = state.ledgers?.find((ledger) => ledger.id === state.activeLedgerId);
  const ledgerHash = activeLedger?.cloudShareToken
    ? `#ledger=${encodeURIComponent(activeLedger.cloudShareToken)}`
    : '';
  await page.goto(`/${ledgerHash}`);
  await expect(page.locator('.ledger-item').first()).toBeVisible();
  const operatorModal = page.locator('#operatorModalView');
  if (await operatorModal.isVisible().catch(() => false)) {
    await operatorModal.locator('[data-operator-family-id]').first().click();
    await operatorModal.locator('button[type="submit"]').click();
    await expect(operatorModal).toBeHidden();
  }
  await page.waitForTimeout(500);
}

const recentPeekState = {
  ...sampleState,
  activeLedgerId: 'recent-peek-order-test',
  ledgers: [{
    ...sampleState.ledgers[0],
    id: 'recent-peek-order-test',
    expenses: [
      {
        ...sampleState.ledgers[0].expenses[0],
        id: 'expense-added-last',
        date: '2026-08-11',
        note: '按添加顺序应排第一',
        createdAt: '2026-08-12T12:00:00.000Z',
        updatedAt: '2026-08-12T12:00:00.000Z',
      },
      {
        ...sampleState.ledgers[0].expenses[1],
        id: 'expense-added-first',
        date: '2026-08-12',
        note: '按添加顺序应排第二',
        createdAt: '2026-08-12T11:00:00.000Z',
        updatedAt: '2026-08-12T11:00:00.000Z',
      },
    ],
  }],
};

const longNoteState = {
  ...sampleState,
  activeLedgerId: 'ledger-long-note-test',
  ledgers: [{
    ...sampleState.ledgers[0],
    id: 'ledger-long-note-test',
    expenses: [{
      ...sampleState.ledgers[0].expenses[0],
      id: 'expense-long-note',
      note: '这是一段足够长的账单备注，用来验证摘要只显示一行，而展开详情才补充完整文本。'.repeat(3),
    }, sampleState.ledgers[0].expenses[1]],
  }],
};

function createDynamicFamilyState(familyCount) {
  const familyNames = [
    '一二三四五六七八九十甲乙',
    '同行家庭二号',
    '同行家庭三号',
    '同行家庭四号',
    '同行家庭五号',
    '同行家庭六号',
    '同行家庭七号',
    '同行家庭八号',
  ];
  const families = Array.from({ length: familyCount }, (_, index) => ({
    id: `dynamic-family-${index + 1}`,
    name: familyNames[index],
    active: true,
  }));
  const familyIds = families.map((family) => family.id);
  return {
    activeLedgerId: `ledger-${familyCount}-family-test`,
    ledgers: [{
      id: `ledger-${familyCount}-family-test`,
      name: `${familyCount}家动态账本`,
      families,
      familyMembers: Object.fromEntries(familyIds.map((id, index) => [id, index + 1])),
      categories: ['交通', '餐饮', '其他'],
      cloudShareToken: 'ledger-card-sync-fixture',
      selectedPayerId: familyIds[0],
      expenses: [{
        ...sampleState.ledgers[0].expenses[0],
        id: `expense-${familyCount}-family`,
        payerId: familyIds[0],
        note: '动态家庭账单的完整长备注，用来验证极窄屏展开后详情自然换行且不会被操作区挤压。'.repeat(3),
        splitMode: 'families',
        splitFamilyIds: familyIds,
        createdBy: { familyId: familyIds[0] },
        updatedBy: { familyId: familyIds[familyIds.length - 1] },
        syncState: 'pending',
      }],
    }],
  };
}

async function openSeededRecentPeek(page) {
  await seedLocalState(page, recentPeekState, { entryMode: 'standard' });
  await page.goto('/');
  const mobileEntryTab = page.locator('#mobileEntryTab');
  if (await mobileEntryTab.isVisible().catch(() => false)) {
    await mobileEntryTab.click();
  }
  await expect(page.locator('#recentPeek')).toBeVisible();
}

function rectSnapshot(locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function sampleLedgerCardTransition(page, duration = 620) {
  return page.evaluate(async (sampleDuration) => {
    const card = document.querySelector('.ledger-item');
    const summary = card.querySelector('.ledger-summary-toggle');
    const read = (elapsed) => {
      const cardRect = card.getBoundingClientRect();
      const amountRect = card.querySelector('.ledger-amount').getBoundingClientRect();
      const actions = card.querySelector('.ledger-item-actions');
      const details = card.querySelector('.ledger-expanded-details');
      const actionsRect = actions.getBoundingClientRect();
      return {
        elapsed: Math.round(elapsed),
        expanded: summary.getAttribute('aria-expanded'),
        card: {
          top: cardRect.top,
          bottom: cardRect.bottom,
          height: cardRect.height,
        },
        amount: {
          left: amountRect.left,
          top: amountRect.top,
          right: amountRect.right,
          bottom: amountRect.bottom,
        },
        actions: {
          left: actionsRect.left,
          top: actionsRect.top,
          width: actionsRect.width,
        },
        actionsOpacity: Number(getComputedStyle(actions).opacity),
        detailsOpacity: Number(getComputedStyle(details).opacity),
        summaryTransform: getComputedStyle(summary).transform,
        amountTransform: getComputedStyle(card.querySelector('.ledger-amount')).transform,
      };
    };
    const samples = [];
    const before = read(0);
    const start = performance.now();
    summary.click();
    const immediate = read(0);
    await new Promise((resolve) => {
      const sample = (now) => {
        samples.push(read(now - start));
        if (now - start >= sampleDuration) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return { before, immediate, samples };
  }, duration);
}

async function sampleInterruptedLedgerCollapse(page) {
  return page.evaluate(async () => {
    const card = document.querySelector('.ledger-item');
    const read = () => {
      const cardRect = card.getBoundingClientRect();
      const amountRect = card.querySelector('.ledger-amount').getBoundingClientRect();
      return {
        cardHeight: cardRect.height,
        amountLeft: amountRect.left,
        amountTop: amountRect.top,
      };
    };
    card.querySelector('.ledger-summary-toggle').click();
    await new Promise((resolve) => setTimeout(resolve, 160));
    const beforeReverse = read();
    card.querySelector('.ledger-summary-toggle').click();
    const immediate = read();
    const samples = [];
    const start = performance.now();
    await new Promise((resolve) => {
      const sample = (now) => {
        samples.push(read());
        if (now - start >= 520) resolve();
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return { beforeReverse, immediate, samples };
  });
}

function expectMonotonic(values, direction, tolerance = 0.8) {
  for (let index = 1; index < values.length; index += 1) {
    if (direction === 'up') expect(values[index]).toBeGreaterThanOrEqual(values[index - 1] - tolerance);
    else expect(values[index]).toBeLessThanOrEqual(values[index - 1] + tolerance);
  }
}

function expectAmountInsideCard(frames) {
  frames.forEach((frame) => {
    expect(frame.amount.top).toBeGreaterThanOrEqual(frame.card.top - 1.2);
    expect(frame.amount.bottom).toBeLessThanOrEqual(frame.card.bottom + 1.2);
  });
}

test.describe('ledger card expansion', () => {
  test('mobile amount follows one continuous in-card path in both directions', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-desktop', 'mobile motion is covered by the mobile projects');
    await page.setViewportSize({ width: 320, height: 568 });
    await openSeededLedger(page);

    const expand = await sampleLedgerCardTransition(page);
    const expandFrames = [expand.immediate, ...expand.samples];
    expect(Math.abs(expand.immediate.amount.left - expand.before.amount.left)).toBeLessThan(1.2);
    expect(Math.abs(expand.immediate.amount.top - expand.before.amount.top)).toBeLessThan(1.2);
    expectMonotonic(expandFrames.map((frame) => frame.card.height), 'up');
    expectAmountInsideCard(expandFrames);
    expandFrames.forEach((frame) => {
      expect(frame.amount.top - frame.card.top).toBeLessThan(32);
    });
    expect(expand.immediate.actionsOpacity).toBeLessThan(0.08);
    expandFrames.forEach((frame) => {
      const overlapsActions = frame.amount.right > frame.actions.left - 1
        && frame.amount.left < frame.actions.left + frame.actions.width
        && frame.amount.bottom > frame.actions.top
        && frame.amount.top < frame.actions.top + 44;
      if (overlapsActions) {
        expect(frame.actionsOpacity).toBeLessThan(0.08);
      }
    });

    const collapse = await sampleLedgerCardTransition(page);
    const collapseFrames = [collapse.immediate, ...collapse.samples];
    expect(Math.abs(collapse.immediate.amount.left - collapse.before.amount.left)).toBeLessThan(1.2);
    expect(Math.abs(collapse.immediate.amount.top - collapse.before.amount.top)).toBeLessThan(1.2);
    expect(collapse.immediate.actions.width).toBeGreaterThan(90);
    expect(collapse.immediate.actionsOpacity).toBeLessThan(1.01);
    expectMonotonic(collapseFrames.map((frame) => frame.card.height), 'down');
    expectAmountInsideCard(collapseFrames);
    collapseFrames.forEach((frame) => {
      expect(frame.amount.top - frame.card.top).toBeLessThan(34);
    });
    expect(collapse.samples.at(-1).actions.width).toBeLessThan(1);
    expandFrames.forEach((frame) => {
      expect(frame.summaryTransform).toBe('none');
      expect(frame.amountTransform).toBe('none');
    });
  });

  test('mobile motion can reverse without a first-frame jump', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-desktop', 'mobile motion is covered by the mobile projects');
    await page.setViewportSize({ width: 390, height: 844 });
    await openSeededLedger(page);

    const reversal = await sampleInterruptedLedgerCollapse(page);
    expect(Math.abs(reversal.immediate.cardHeight - reversal.beforeReverse.cardHeight)).toBeLessThan(1.2);
    /* click 处理本身可能跨过一小段 document timeline；允许最多 3.2px 的
       正向进度，但仍能拦住曾经约 90px 的双重位移跳变。 */
    expect(Math.abs(reversal.immediate.amountLeft - reversal.beforeReverse.amountLeft)).toBeLessThan(3.2);
    expect(Math.abs(reversal.immediate.amountTop - reversal.beforeReverse.amountTop)).toBeLessThan(3.2);
    expectMonotonic([reversal.immediate, ...reversal.samples].map((frame) => frame.cardHeight), 'down');
  });

  test('recent peek keeps newest additions ahead of newer expense dates', async ({ page }) => {
    await openSeededRecentPeek(page);

    await expect(page.locator('.recent-peek-note')).toHaveText([
      '按添加顺序应排第一',
      '按添加顺序应排第二',
    ]);
  });

  test('mobile expansion keeps the card aligned and actions reachable', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-desktop', 'mobile geometry is covered by the mobile projects');
    await page.setViewportSize({ width: 320, height: 568 });
    await openSeededLedger(page);

    const card = page.locator('.ledger-item').first();
    const before = await rectSnapshot(card);
    await expect(card.locator('.ledger-item-actions button').first()).toHaveAttribute('tabindex', '-1');

    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(card.locator('.ledger-expand-cue .ui-icon-pair')).toBeVisible();
    await expect(card.locator('.ledger-item-actions button').first()).toBeVisible();
    await expect.poll(async () => page.evaluate(() => {
      const expandedCard = document.querySelector('.ledger-item.is-expanded');
      const amount = expandedCard.querySelector('.ledger-amount').getBoundingClientRect();
      const actions = expandedCard.querySelector('.ledger-item-actions').getBoundingClientRect();
      return actions.width > 90 && amount.bottom <= actions.top + 1;
    }), { timeout: 2_000 }).toBe(true);

    const after = await rectSnapshot(card);
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
    expect(Math.abs(after.width - before.width)).toBeLessThan(1);
    expect(await card.locator('.ledger-summary-toggle').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(80);
    await expect(card.locator('.ledger-operator')).toHaveText('乐家创建 · 祺家更新');
    await expect(card.locator('.ledger-edit-button')).toContainText('编辑');
    await expect(card.locator('.delete-button')).toContainText('删除');

    const settledGeometry = await page.evaluate(() => {
      const card = document.querySelector('.ledger-item.is-expanded');
      const amount = card.querySelector('.ledger-amount').getBoundingClientRect();
      const actions = card.querySelector('.ledger-item-actions').getBoundingClientRect();
    return { amountBottom: amount.bottom, actionsTop: actions.top };
  });

    expect(settledGeometry.amountBottom).toBeLessThanOrEqual(settledGeometry.actionsTop + 1);

    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'false');
    await expect(card.locator('.ledger-item-actions button').first()).toHaveAttribute('tabindex', '-1');

    await page.setViewportSize({ width: 390, height: 844 });
    const beforeWide = await rectSnapshot(card);
    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(async () => card.evaluate((element) => {
      const actions = element.querySelector('.ledger-item-actions').getBoundingClientRect();
      return actions.width > 90
        && element.style.height === ''
        && !element.closest('.ledger-list').classList.contains('is-morphing-ledger-items');
    }), { timeout: 2_000 }).toBe(true);
    const afterWide = await rectSnapshot(card);
    expect(Math.abs(afterWide.x - beforeWide.x)).toBeLessThan(1);
    expect(Math.abs(afterWide.width - beforeWide.width)).toBeLessThan(1);
    expect(await card.locator('.ledger-summary-toggle').evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(150);
    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile summaries center amounts and reserve the outer edge for the expand cue', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'chromium-desktop', 'mobile geometry is covered by the mobile projects');

    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await openSeededLedger(page);

      const summaries = await page.locator('.ledger-item').evaluateAll((items) => items.map((item) => {
        const card = item.getBoundingClientRect();
        const amount = item.querySelector('.ledger-amount').getBoundingClientRect();
        const cue = item.querySelector('.ledger-expand-cue').getBoundingClientRect();
        return {
          cardCenterY: card.top + card.height / 2,
          amountCenterY: amount.top + amount.height / 2,
          amountRight: amount.right,
          cueLeft: cue.left,
          cueRight: cue.right,
          cardRight: card.right,
        };
      }));

      summaries.forEach((summary) => {
        expect(Math.abs(summary.amountCenterY - summary.cardCenterY)).toBeLessThanOrEqual(1.5);
        expect(summary.amountRight).toBeLessThanOrEqual(summary.cueLeft - 7);
        expect(summary.cueRight).toBeLessThanOrEqual(summary.cardRight - 9);
      });
    }
  });

  test('expanded content keeps the family rail inside details and removes the lower-left gap', async ({ page }) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 359, height: 740 },
      { width: 390, height: 844 },
      { width: 540, height: 326 },
      { width: 1280, height: 800 },
    ]) {
      await page.setViewportSize(viewport);
      await openSeededLedger(page);

      for (const cardIndex of [0, 1]) {
        const card = page.locator('.ledger-item').nth(cardIndex);
        await card.locator('.ledger-summary-toggle').evaluate((element) => element.click());
        await expect.poll(async () => card.evaluate((item) => (
          item.classList.contains('is-expanded')
          && item.style.height === ''
          && !item.closest('.ledger-list').classList.contains('is-morphing-ledger-items')
        )), { timeout: 2_000 }).toBe(true);

        const geometry = await card.evaluate((item) => {
          const cardRect = item.getBoundingClientRect();
          const content = item.querySelector('.ledger-expanded-content').getBoundingClientRect();
          const details = item.querySelector('.ledger-expanded-details').getBoundingClientRect();
          const rail = item.querySelector('.ledger-expanded-rail').getBoundingClientRect();
          const actions = item.querySelector('.ledger-item-actions').getBoundingClientRect();
          const contentStyle = getComputedStyle(item.querySelector('.ledger-expanded-content'));
          const buttons = [...item.querySelectorAll('.ledger-item-actions button')].map((button) => button.getBoundingClientRect());
          return {
            railInsetLeft: rail.left - cardRect.left,
            railTopGap: rail.top - details.top,
            railBottomGap: details.bottom - rail.bottom,
            detailsCenterY: details.top + details.height / 2,
            actionsCenterY: actions.top + actions.height / 2,
            contentHeight: content.height,
            detailsHeight: details.height,
            actionsHeight: actions.height,
            actionsWidth: actions.width,
            buttonHeights: buttons.map((button) => button.height),
            contentLeft: content.left,
            contentRight: content.right,
            contentInnerRight: content.right - parseFloat(contentStyle.paddingRight),
            detailsTop: details.top,
            detailsBottom: details.bottom,
            detailsLeft: details.left,
            detailsRight: details.right,
            actionsTop: actions.top,
            actionsRight: actions.right,
            actionsLeft: actions.left,
          };
        });

        expect(geometry.railInsetLeft, `viewport ${viewport.width}x${viewport.height}, card ${cardIndex}`).toBeGreaterThanOrEqual(14);
        expect(geometry.railTopGap).toBeGreaterThanOrEqual(-1);
        expect(geometry.railBottomGap).toBeGreaterThanOrEqual(-1);
        expect(geometry.actionsWidth).toBeGreaterThanOrEqual(140);
        geometry.buttonHeights.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));
        if (viewport.width <= 359) {
          expect(geometry.detailsLeft).toBeGreaterThanOrEqual(geometry.contentLeft);
          expect(geometry.detailsRight).toBeLessThanOrEqual(geometry.contentRight);
          expect(geometry.actionsTop).toBeGreaterThanOrEqual(geometry.detailsBottom + 8);
          expect(Math.abs(geometry.contentInnerRight - geometry.actionsRight)).toBeLessThanOrEqual(1);
        } else {
          expect(Math.abs(geometry.detailsCenterY - geometry.actionsCenterY)).toBeLessThanOrEqual(1.5);
          expect(geometry.contentHeight - Math.max(geometry.detailsHeight, geometry.actionsHeight)).toBeLessThanOrEqual(30);
          expect(geometry.detailsRight).toBeLessThanOrEqual(geometry.actionsLeft - 8);
        }

        await card.locator('.ledger-summary-toggle').evaluate((element) => element.click());
        await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'false');
      }
    }
  });

  test('dynamic-family details stay complete across narrow and retained two-column layouts', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.endsWith('desktop'), 'dynamic-family narrow geometry is covered by mobile projects');
    for (const viewport of [{ width: 320, height: 568 }, { width: 359, height: 740 }, { width: 390, height: 844 }]) {
      for (const familyCount of [2, 8]) {
        await page.setViewportSize(viewport);
        await openSeededLedger(page, createDynamicFamilyState(familyCount));
        const card = page.locator('.ledger-item').first();
        const summary = card.locator('.ledger-summary-toggle');
        await expect(summary).toHaveAttribute('aria-label', new RegExp('一二三四五六七八九十甲乙.*展开详情'));
        await summary.evaluate((element) => element.click());
        await expect.poll(async () => card.evaluate((item) => (
          item.classList.contains('is-expanded')
          && item.style.height === ''
          && !item.closest('.ledger-list').classList.contains('is-morphing-ledger-items')
        )), { timeout: 2_000 }).toBe(true);

        const geometry = await card.evaluate((item) => {
          const content = item.querySelector('.ledger-expanded-content').getBoundingClientRect();
          const details = item.querySelector('.ledger-expanded-details').getBoundingClientRect();
          const actions = item.querySelector('.ledger-item-actions').getBoundingClientRect();
          const contentStyle = getComputedStyle(item.querySelector('.ledger-expanded-content'));
          const operator = item.querySelector('.ledger-operator');
          const scope = item.querySelector('.ledger-scope');
          const note = item.querySelector('.ledger-detail-note');
          const rail = item.querySelector('.ledger-expanded-rail');
          const buttons = [...item.querySelectorAll('.ledger-item-actions button')];
          return {
            bodyOverflow: document.documentElement.scrollWidth - window.innerWidth,
            cardVerticalOverflow: item.scrollHeight - item.clientHeight,
            contentVerticalOverflow: item.querySelector('.ledger-expanded-content').scrollHeight
              - item.querySelector('.ledger-expanded-content').clientHeight,
            contentTop: content.top,
            contentBottom: content.bottom,
            detailsTop: details.top,
            detailsHeight: details.height,
            detailsScrollHeight: item.querySelector('.ledger-expanded-details').scrollHeight,
            detailsDisplay: getComputedStyle(item.querySelector('.ledger-expanded-details')).display,
            contentGridRows: getComputedStyle(item.querySelector('.ledger-expanded-content')).gridTemplateRows,
            detailsWidth: details.width,
            availableWidth: content.width
              - parseFloat(contentStyle.paddingLeft)
              - parseFloat(contentStyle.paddingRight),
            detailsBottom: details.bottom,
            detailsRight: details.right,
            actionsTop: actions.top,
            actionsLeft: actions.left,
            actionsRightGap: content.right - parseFloat(contentStyle.paddingRight) - actions.right,
            actionsWidth: actions.width,
            buttonWidths: buttons.map((button) => button.getBoundingClientRect().width),
            buttonHeights: buttons.map((button) => button.getBoundingClientRect().height),
            operatorFits: operator.scrollWidth <= operator.clientWidth + 1,
            scopeFits: scope.scrollWidth <= scope.clientWidth + 1,
            noteFits: note.scrollWidth <= note.clientWidth + 1,
            noteText: note.textContent,
            scopeText: scope.textContent,
            syncText: item.querySelector('.ledger-sync-state')?.textContent || '',
            familyColor: getComputedStyle(item).getPropertyValue('--family-color').trim(),
            railHeight: rail.getBoundingClientRect().height,
          };
        });

        expect(geometry.bodyOverflow).toBeLessThanOrEqual(0);
        expect(geometry.cardVerticalOverflow).toBeLessThanOrEqual(1);
        expect(
          geometry.contentVerticalOverflow,
          `viewport ${viewport.width}x${viewport.height}, families ${familyCount}: ${JSON.stringify(geometry)}`,
        ).toBeLessThanOrEqual(1);
        if (viewport.width <= 359) {
          expect(geometry.detailsWidth).toBeGreaterThan(geometry.actionsWidth);
          expect(geometry.detailsWidth).toBeGreaterThanOrEqual(geometry.availableWidth - 1);
          expect(geometry.actionsTop).toBeGreaterThanOrEqual(geometry.detailsBottom + 8);
          expect(Math.abs(geometry.actionsRightGap)).toBeLessThanOrEqual(1);
        } else {
          expect(geometry.actionsTop).toBeLessThan(geometry.detailsBottom);
          expect(geometry.detailsRight).toBeLessThanOrEqual(geometry.actionsLeft - 8);
        }
        expect(geometry.actionsWidth).toBe(144);
        geometry.buttonWidths.forEach((width) => expect(width).toBe(68));
        geometry.buttonHeights.forEach((height) => expect(height).toBeGreaterThanOrEqual(44));
        expect(geometry.operatorFits).toBe(true);
        expect(geometry.scopeFits).toBe(true);
        expect(geometry.noteFits).toBe(true);
        expect(geometry.noteText).toContain('动态家庭账单的完整长备注');
        expect(geometry.scopeText).toContain(familyCount === 8 ? '同行家庭八号' : '同行家庭二号');
        expect(geometry.syncText).toBe('同步中');
        expect(geometry.familyColor).not.toBe('');
        expect(geometry.railHeight).toBeGreaterThan(0);
      }
    }
  });

  test('expanded shell keeps the radius and horizontal content boundary stable', async ({ page }) => {
    for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await openSeededLedger(page);
      const card = page.locator('.ledger-item').first();
      const readGeometry = () => page.evaluate(() => {
        const card = document.querySelector('.ledger-item');
        const summary = card.querySelector('.ledger-summary-toggle');
        const details = card.querySelector('.ledger-expanded-content');
        const amount = card.querySelector('.ledger-amount');
        const cardRect = card.getBoundingClientRect();
        const amountRect = amount.getBoundingClientRect();
        const cardStyle = getComputedStyle(card);
        const summaryStyle = getComputedStyle(summary);
        const detailsStyle = getComputedStyle(details);
        return {
          radius: cardStyle.borderTopLeftRadius,
          summaryRadius: summaryStyle.borderTopLeftRadius,
          summaryPadding: summaryStyle.paddingLeft,
          detailsPadding: detailsStyle.paddingLeft,
          cardX: cardRect.x,
          cardWidth: cardRect.width,
          amountLeft: amountRect.left,
        };
      });

      const folded = await readGeometry();
      /* 这里验证纯布局边界；程序化点击可避免桌面指针透视效果改变
         getBoundingClientRect()，把刻意的 hover 倾斜误判成卡片宽度漂移。 */
      await card.locator('.ledger-summary-toggle').evaluate((element) => element.click());
      await expect.poll(async () => card.evaluate((item) => (
        item.classList.contains('is-expanded')
        && item.style.height === ''
        && !item.closest('.ledger-list').classList.contains('is-morphing-ledger-items')
      )), { timeout: 2_000 }).toBe(true);
      const expanded = await readGeometry();

      expect(expanded.radius).toBe(folded.radius);
      expect(expanded.summaryRadius).toBe(expanded.radius);
      expect(Number.parseFloat(expanded.detailsPadding)).toBeGreaterThanOrEqual(Number.parseFloat(expanded.summaryPadding));
      expect(Number.parseFloat(expanded.detailsPadding) - Number.parseFloat(expanded.summaryPadding)).toBeLessThanOrEqual(10);
      expect(Math.abs(expanded.cardX - folded.cardX)).toBeLessThan(1);
      expect(
        Math.abs(expanded.cardWidth - folded.cardWidth),
        `viewport ${viewport.width}x${viewport.height}: ${JSON.stringify({ folded, expanded })}`,
      ).toBeLessThan(1);
      expect(Math.abs(expanded.amountLeft - folded.amountLeft)).toBeLessThan(1);
    }
  });

  test('expanded motion reveals a family rail without moving the summary', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSeededLedger(page);
    const card = page.locator('.ledger-item').first();
    const before = await card.locator('.ledger-amount').boundingBox();
    await card.locator('.ledger-summary-toggle').click();
    await expect.poll(async () => card.evaluate((item) => (
      item.classList.contains('is-expanded')
        && item.style.height === ''
        && !item.closest('.ledger-list').classList.contains('is-morphing-ledger-items')
    )), { timeout: 2_000 }).toBe(true);
    const motionState = await card.evaluate((item) => {
      const rail = item.querySelector('.ledger-expanded-rail');
      const details = item.querySelector('.ledger-expanded-details');
      const summary = item.querySelector('.ledger-summary-toggle');
      const amount = item.querySelector('.ledger-amount');
      const railStyle = getComputedStyle(rail);
      return {
        railOpacity: Number(railStyle.opacity),
        railHeight: rail.getBoundingClientRect().height,
        detailsClip: getComputedStyle(details).clipPath,
        summaryTransform: getComputedStyle(summary).transform,
        amountTransform: getComputedStyle(amount).transform,
      };
    });
    const after = await card.locator('.ledger-amount').boundingBox();
    expect(motionState.railOpacity).toBeGreaterThan(0.5);
    expect(motionState.railHeight).toBeGreaterThan(0);
    expect(motionState.detailsClip).toMatch(/none|inset\(0px\)/);
    expect(motionState.summaryTransform).toBe('none');
    expect(motionState.amountTransform).toBe('none');
    expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  });

  test('Safari keeps the ledger glass live throughout expansion', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('webkit'), 'Safari material is covered by WebKit projects');
    await page.setViewportSize({ width: 390, height: 844 });
    await openSeededLedger(page);

    const samples = await page.evaluate(async () => {
      const card = document.querySelector('.ledger-item');
      const material = card.querySelector('.ledger-item-material');
      const summary = card.querySelector('.ledger-summary-toggle');
      const read = () => {
        const cardStyle = getComputedStyle(card);
        const materialStyle = getComputedStyle(material);
        return {
          cardBackdropFilter: cardStyle.webkitBackdropFilter || cardStyle.backdropFilter,
          materialBackdropFilter: materialStyle.webkitBackdropFilter || materialStyle.backdropFilter,
          materialBackgroundImage: materialStyle.backgroundImage,
          cardHeight: card.getBoundingClientRect().height,
          materialHeight: material.getBoundingClientRect().height,
          summaryHeight: summary.getBoundingClientRect().height,
          materialPosition: materialStyle.position,
          materialTransitionDuration: materialStyle.transitionDuration,
        };
      };
      const before = read();
      summary.click();
      await new Promise(requestAnimationFrame);
      const firstFrame = read();
      await new Promise((resolve) => setTimeout(resolve, 180));
      const middle = read();
      await new Promise((resolve) => setTimeout(resolve, 520));
      const settled = read();
      return {
        safariMotion: document.documentElement.dataset.safariMotion,
        before,
        firstFrame,
        middle,
        settled,
      };
    });

    expect(samples.safariMotion).toBe('true');
    for (const sample of [samples.before, samples.firstFrame, samples.middle, samples.settled]) {
      expect(sample.cardBackdropFilter).toBe('none');
      expect(sample.materialBackdropFilter).toContain('blur(12px)');
      expect(sample.materialBackdropFilter).not.toBe('none');
      expect(sample.materialBackgroundImage).toBe(samples.before.materialBackgroundImage);
      expect(sample.materialPosition).toBe('absolute');
      expect(sample.materialTransitionDuration).toBe('0s');
      expect(Math.abs(sample.materialHeight - sample.cardHeight)).toBeLessThan(1);
      expect(sample.summaryHeight).toBeGreaterThanOrEqual(64);
    }
  });

  test('note-first summaries keep fallback metadata compact and reveal only truncated notes', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await openSeededLedger(page);

    const noted = page.locator('.ledger-item').first();
    await expect(noted.locator('.ledger-primary-text')).toHaveText('机场到酒店的接送车');
    await expect(noted.locator('.ledger-summary-meta .ledger-family')).toHaveText('乐家');
    await expect(noted.locator('.ledger-summary-meta .category-pill')).toHaveText('交通');
    await expect(noted.locator('.ledger-detail-note')).toBeHidden();

    const noNote = page.locator('.ledger-item').nth(1);
    await expect(noNote.locator('.ledger-primary-text')).toHaveText('祺家 · 餐饮');
    await expect(noNote.locator('.ledger-summary-meta .ledger-family')).toHaveCount(0);
    await expect(noNote.locator('.ledger-summary-meta .category-pill')).toHaveCount(0);

    await openSeededLedger(page, longNoteState);
    const longNote = page.locator('.ledger-item').first();
    await expect.poll(async () => longNote.evaluate((item) => item.classList.contains('is-note-truncated'))).toBe(true);
    await longNote.locator('.ledger-summary-toggle').click();
    await expect(longNote.locator('.ledger-expanded-content')).toHaveAttribute('aria-hidden', 'false');
    await expect(longNote.locator('.ledger-detail-note')).toBeVisible();
    await expect(longNote.locator('.ledger-detail-note')).toContainText('这是一段足够长的账单备注');
    const longNoteGeometry = await longNote.evaluate((item) => {
      const details = item.querySelector('.ledger-expanded-details').getBoundingClientRect();
      const rail = item.querySelector('.ledger-expanded-rail').getBoundingClientRect();
      return {
        railTopGap: rail.top - details.top,
        railBottomGap: details.bottom - rail.bottom,
      };
    });
    expect(longNoteGeometry.railTopGap).toBeGreaterThanOrEqual(-1);
    expect(longNoteGeometry.railBottomGap).toBeGreaterThanOrEqual(-1);
  });

  test('collapse keeps sibling geometry and scroll anchoring isolated', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSeededLedger(page);

    const result = await page.evaluate(async () => {
      const cards = [...document.querySelectorAll('.ledger-item')];
      const target = cards[0];
      const sibling = cards[1];
      const read = () => {
        const siblingRect = sibling.getBoundingClientRect();
        const siblingAmount = sibling.querySelector('.ledger-amount').getBoundingClientRect();
        const targetSummary = target.querySelector('.ledger-summary-toggle').getBoundingClientRect();
        const targetAmount = target.querySelector('.ledger-amount').getBoundingClientRect();
        const siblingActions = sibling.querySelector('.ledger-item-actions').getBoundingClientRect();
        return {
          scroll: window.scrollY,
          sibling: { x: siblingRect.x, width: siblingRect.width, amountLeft: siblingAmount.left },
          target: { amountLeft: targetAmount.left, amountTop: targetAmount.top, summaryTop: targetSummary.top },
          siblingActionsWidth: siblingActions.width,
          targetActionsWidth: target.querySelector('.ledger-item-actions').getBoundingClientRect().width,
        };
      };
      target.querySelector('.ledger-summary-toggle').click();
      await new Promise((resolve) => setTimeout(resolve, 680));
      const expanded = read();
      target.querySelector('.ledger-summary-toggle').click();
      await new Promise(requestAnimationFrame);
      const collapsing = read();
      return { expanded, collapsing };
    });

    expect(Math.abs(result.collapsing.sibling.x - result.expanded.sibling.x)).toBeLessThan(0.5);
    expect(Math.abs(result.collapsing.sibling.width - result.expanded.sibling.width)).toBeLessThan(0.5);
    expect(Math.abs(result.collapsing.sibling.amountLeft - result.expanded.sibling.amountLeft)).toBeLessThan(0.5);
    expect(result.collapsing.siblingActionsWidth).toBeLessThan(1);
    expect(result.collapsing.targetActionsWidth).toBeGreaterThan(90);
    expect(Math.abs(result.collapsing.target.amountLeft - result.expanded.target.amountLeft)).toBeLessThan(1.2);
    expect(Math.abs(result.collapsing.target.amountTop - result.expanded.target.amountTop)).toBeLessThan(1.2);
    expect(Math.abs(result.collapsing.scroll - result.expanded.scroll)).toBeLessThanOrEqual(1);
  });

  test('switching cards during a morph cancels the previous card cleanly', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSeededLedger(page);

    const result = await page.evaluate(async () => {
      const cards = [...document.querySelectorAll('.ledger-item')];
      cards[0].querySelector('.ledger-summary-toggle').click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      cards[1].querySelector('.ledger-summary-toggle').click();
      await new Promise((resolve) => setTimeout(resolve, 760));
      return cards.map((card) => ({
        expanded: card.classList.contains('is-expanded'),
        morphing: card.classList.contains('is-ledger-expanding') || card.classList.contains('is-ledger-collapsing'),
        height: card.style.height,
        contentHidden: card.querySelector('.ledger-expanded-content').hidden,
      }));
    });

    expect(result).toEqual([
      { expanded: false, morphing: false, height: '', contentHidden: true },
      { expanded: true, morphing: false, height: '', contentHidden: false },
    ]);
  });

  test('reduced motion commits the final card state without a morph class', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openSeededLedger(page);

    const card = page.locator('.ledger-item').first();
    await card.locator('.ledger-summary-toggle').click();
    await expect.poll(async () => card.evaluate((item) => ({
      expanded: item.classList.contains('is-expanded'),
      height: item.style.height,
      listMorphing: item.closest('.ledger-list').classList.contains('is-morphing-ledger-items'),
      hidden: item.querySelector('.ledger-expanded-content').hidden,
    }))).toEqual({ expanded: true, height: '', listMorphing: false, hidden: false });

    await card.locator('.ledger-summary-toggle').click();
    await expect.poll(async () => card.evaluate((item) => ({
      expanded: item.classList.contains('is-expanded'),
      height: item.style.height,
      listMorphing: item.closest('.ledger-list').classList.contains('is-morphing-ledger-items'),
      hidden: item.querySelector('.ledger-expanded-content').hidden,
    }))).toEqual({ expanded: false, height: '', listMorphing: false, hidden: true });
  });

  test('collapsed cards keep secondary metadata hidden and filters collapse details', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openSeededLedger(page);

    const first = page.locator('.ledger-item').first();
    const summary = first.locator('.ledger-summary-toggle');
    await expect(first).not.toHaveAttribute('tabindex');
    await expect(summary).toHaveAttribute('aria-label', /机场到酒店的接送车，乐家，交通，¥1,234.56，展开详情/);
    await expect(first.locator('.ledger-expanded-content')).toHaveAttribute('aria-hidden', 'true');
    await expect(first.locator('.ledger-expanded-content')).toHaveAttribute('inert', '');
    await expect(first.locator('.ledger-expanded-content')).toBeHidden();
    await expect(first.locator('.ledger-operator')).toHaveCSS('opacity', '1');

    const filterToggle = page.locator('#ledgerFilterToggle');
    expect((await rectSnapshot(filterToggle)).height).toBeGreaterThanOrEqual(44);
    await summary.click();
    await expect(summary).toHaveAttribute('aria-expanded', 'true');
    await filterToggle.click();
    await expect(page.locator('.ledger-item.is-expanded')).toHaveCount(0);
    await expect(filterToggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('desktop expansion keeps the amount centered and actions reachable', async ({ page }, testInfo) => {
    test.skip(!['chromium-desktop', 'webkit-desktop'].includes(testInfo.project.name), 'desktop geometry is covered by the desktop projects');
    await page.setViewportSize({ width: 1280, height: 800 });
    await openSeededLedger(page);

    const card = page.locator('.ledger-item').first();
    await card.locator('.ledger-summary-toggle').click();
    await expect(card.locator('.ledger-summary-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(card.locator('.ledger-date')).toBeHidden();
    await expect(card.locator('.ledger-item-actions button')).toHaveCount(2);
    await expect(card.locator('.ledger-expanded-content')).toBeVisible();
    await expect(card.locator('.ledger-operator')).toBeVisible();
    await expect(card.locator('.ledger-operator')).toHaveText('乐家创建 · 祺家更新');

    const geometry = await card.evaluate((item) => {
      const summary = item.querySelector('.ledger-summary-toggle').getBoundingClientRect();
      const amount = item.querySelector('.ledger-amount').getBoundingClientRect();
      const cue = item.querySelector('.ledger-expand-cue').getBoundingClientRect();
      return {
        summaryCenterY: summary.top + summary.height / 2,
        amountCenterY: amount.top + amount.height / 2,
        amountRight: amount.right,
        cueLeft: cue.left,
      };
    });
    expect(Math.abs(geometry.amountCenterY - geometry.summaryCenterY)).toBeLessThanOrEqual(1.5);
    expect(geometry.amountRight).toBeLessThanOrEqual(geometry.cueLeft - 9);
  });
});
