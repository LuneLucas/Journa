const { webkit } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const OUT = process.env.AUDIT_OUT || path.join(__dirname, '..', 'audits', 'safari-audit-20260819');
fs.mkdirSync(OUT, { recursive: true });

const iosUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ipadUA = 'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const macUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

function buildSeed() {
  const families = [
    { id: 'family-a', name: '乐家' },
    { id: 'family-b', name: '祺家' },
    { id: 'family-c', name: '旦家' },
  ];
  const categories = ['交通', '餐饮', '住宿', '门票', '购物', '其他'];
  const familyMembers = { 'family-a': 2, 'family-b': 3, 'family-c': 1 };
  const mk = (id, amount, payerId, category, date, note, splitMode = 'equal', splitAmounts = {}) => ({
    id, amount, payerId, category, date, note,
    splitMode, splitFamilyIds: splitMode === 'custom' ? Object.keys(splitAmounts) : [],
    splitAmounts, createdBy: { familyId: payerId }, updatedBy: null,
    createdAt: date + 'T12:00:00.000Z', updatedAt: date + 'T12:00:00.000Z',
  });
  const expenses = [
    mk('e1', 1280.00, 'family-a', '住宿', '2026-08-10', '海景民宿两晚'),
    mk('e2', 86.50, 'family-b', '餐饮', '2026-08-10', '晚餐海鲜'),
    mk('e3', 420.00, 'family-c', '交通', '2026-08-11', '租车'),
    mk('e4', 240.00, 'family-a', '门票', '2026-08-11', '主题乐园'),
    mk('e5', 58.00, 'family-b', '餐饮', '2026-08-12', '早餐'),
    mk('e6', 312.40, 'family-c', '购物', '2026-08-12', '伴手礼'),
    mk('e7', 199.00, 'family-a', '其他', '2026-08-13', '洗衣'),
    mk('e8', 422.01, 'family-b', '餐饮', '2026-08-13', '自定分摊', 'custom', { 'family-a': 345.67, 'family-b': 64, 'family-c': 12.34 }),
  ];
  return { activeLedgerId: 'audit-ledger', ledgers: [{ id: 'audit-ledger', name: '旅行账本', families, categories, familyMembers, expenses }] };
}

const runs = [
  { name: 'iphone-se', viewport: { width: 375, height: 667 }, dsf: 2, isMobile: true, hasTouch: true, ua: iosUA, colorScheme: 'light', welcome: false, entryMode: 'natural' },
  { name: 'iphone-13', viewport: { width: 390, height: 844 }, dsf: 3, isMobile: true, hasTouch: true, ua: iosUA, colorScheme: 'light', welcome: false, entryMode: 'natural' },
  { name: 'iphone-13-dark', viewport: { width: 390, height: 844 }, dsf: 3, isMobile: true, hasTouch: true, ua: iosUA, colorScheme: 'dark', welcome: false, entryMode: 'natural' },
  { name: 'ipad-air', viewport: { width: 820, height: 1180 }, dsf: 2, isMobile: true, hasTouch: true, ua: ipadUA, colorScheme: 'light', welcome: false, entryMode: 'standard' },
  { name: 'desktop-mac', viewport: { width: 1280, height: 800 }, dsf: 2, isMobile: false, hasTouch: false, ua: macUA, colorScheme: 'light', welcome: false, entryMode: 'standard' },
  { name: 'iphone-se-onboard', viewport: { width: 375, height: 667 }, dsf: 2, isMobile: true, hasTouch: true, ua: iosUA, colorScheme: 'light', welcome: true, entryMode: 'natural', operator: false },
];

function loadReport() {
  const p = path.join(OUT, 'report.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) {}
  }
  return { engine: 'WebKit (Playwright webkit 26.0)', generatedAt: new Date().toISOString(), runs: [] };
}

function saveReport(report) {
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}

async function tryClick(page, selector, opts = {}) {
  try {
    const el = await page.$(selector);
    if (!el) return { ok: false, reason: 'not-found' };
    await el.click(opts);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e).split('\n')[0] };
  }
}

async function safeShot(page, path) {
  try { await page.screenshot({ path, fullPage: false }); return true; } catch (e) { return String(e).split('\n')[0]; }
}

async function auditRun(browser, cfg) {
  const ctx = await browser.newContext({
    viewport: cfg.viewport, deviceScaleFactor: cfg.dsf, isMobile: cfg.isMobile, hasTouch: cfg.hasTouch,
    userAgent: cfg.ua, colorScheme: cfg.colorScheme, reducedMotion: 'no-preference',
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);

  const consoleErrors = [], consoleWarnings = [], pageErrors = [], failedRequests = [];
  page.on('console', (m) => {
    const rec = { text: m.text(), loc: m.location() };
    if (m.type() === 'error') consoleErrors.push(rec);
    else if (m.type() === 'warning') consoleWarnings.push(rec);
  });
  page.on('pageerror', (e) => pageErrors.push(String(e && e.stack ? e.stack : e)));
  page.on('requestfailed', (r) => failedRequests.push({ url: r.url(), error: r.failure() ? r.failure().errorText : '' }));

  const seed = buildSeed();
  await page.addInitScript((args) => {
    try {
      localStorage.setItem('travel-ledger-v3', JSON.stringify(args.seed));
      localStorage.setItem('travel-ledger-entry-mode', args.entryMode);
      if (args.welcome) localStorage.removeItem('travel-ledger-welcome-seen');
      else localStorage.setItem('travel-ledger-welcome-seen', '1');
      if (!args.operator) localStorage.removeItem('travel-ledger-operator-family-id');
    } catch (e) {}
  }, { seed, entryMode: cfg.entryMode, welcome: !!cfg.welcome, operator: !!cfg.operator });

  const screenshots = [];
  const shot = async (key) => {
    const p = path.join(OUT, `${cfg.name}-${key}.png`);
    const ok = await safeShot(page, p);
    if (ok === true) screenshots.push(p);
    return { ok, path: p };
  };

  const rec = { name: cfg.name, viewport: cfg.viewport, colorScheme: cfg.colorScheme, screenshots, consoleErrors, consoleWarnings, pageErrors, failedRequests, notes: {} };

  try {
    await page.goto(BASE, { waitUntil: 'load', timeout: 30000 });
  } catch (e) { rec.notes.gotoError = String(e); }

  try {
    await page.waitForSelector(cfg.welcome ? '.welcome-view, .confirm-view, .ledger-item, .app-shell' : '.ledger-item, .app-shell', { timeout: 8000 });
  } catch (e) { rec.notes.renderWait = 'no primary selector within 8s'; }

  // Let the 1450ms hero total-reveal scramble finish and any settle animation complete.
  await page.waitForTimeout(2600);

  rec.notes.htmlClass = await page.evaluate(() => document.documentElement.className);
  rec.notes.safariMotion = await page.evaluate(() => document.documentElement.dataset.safariMotion || null);
  rec.notes.applePlatform = await page.evaluate(() => document.documentElement.classList.contains('apple-platform'));

  rec.notes.overflow = await page.evaluate(() => {
    const de = document.documentElement;
    return { docScrollWidth: de.scrollWidth, innerWidth: window.innerWidth, bodyScrollWidth: document.body ? document.body.scrollWidth : 0, horizontalOverflow: de.scrollWidth > window.innerWidth + 1 };
  });

  rec.notes.cssSupport = await page.evaluate(() => ({
    backdropFilter: CSS.supports('backdrop-filter', 'blur(1px)'),
    webkitBackdropFilter: CSS.supports('-webkit-backdrop-filter', 'blur(1px)'),
    dvh: CSS.supports('height', '100dvh'),
    colorMixSrgb: CSS.supports('color', 'color-mix(in srgb, red 10%, blue)'),
    colorMixOklch: CSS.supports('color', 'color-mix(in oklch, red 10%, blue)'),
    inert: 'inert' in HTMLElement.prototype,
  }));

  rec.notes.glass = await page.evaluate(() => {
    const el = document.querySelector('.app-header');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter || '', position: cs.position };
  });

  rec.notes.totalReveal = await page.evaluate(() => {
    const el = document.querySelector('#totalAmount');
    if (!el) return null;
    return { text: el.textContent, isScrambling: el.classList.contains('is-scrambling'), isSoftRefresh: el.classList.contains('is-soft-refresh'), hasScrambleGlyphs: /[\#%*&@]/.test(el.textContent || '') };
  });

  rec.notes.font = await page.evaluate(() => {
    const title = document.querySelector('#currentLedgerTitle');
    const amount = document.querySelector('#totalAmount');
    const listAmount = document.querySelector('.ledger-card-amount, .ledger-item-amount, .ledger-amount');
    const csTitle = title ? getComputedStyle(title) : null;
    const csAmount = amount ? getComputedStyle(amount) : null;
    const csList = listAmount ? getComputedStyle(listAmount) : null;
    return {
      titleFont: csTitle ? csTitle.fontFamily : null,
      amountFont: csAmount ? csAmount.fontFamily : null,
      listAmountFont: csList ? csList.fontFamily : null,
      fontCount: document.fonts ? document.fonts.size : null,
    };
  });

  rec.notes.tapTargets = await page.evaluate(() => {
    const selectors = 'button, [role="button"], a, input[type="button"], input[type="submit"], .icon-button';
    const els = [...document.querySelectorAll(selectors)];
    const small = [];
    for (const el of els) {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none') {
        if (r.height < 44 || r.width < 44) {
          small.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 60), w: Math.round(r.width), h: Math.round(r.height), text: (el.textContent || '').trim().slice(0, 12) });
        }
      }
    }
    return { checked: els.length, small: small.slice(0, 30) };
  });

  await shot('main');

  // Settlement entry is inside the data view; check it before switching tabs/panels.
  try {
    const setBtn = await page.$('#mobileSettlementEntryButton');
    const isVisible = setBtn ? await setBtn.isVisible() : false;
    rec.notes.settlementButtonVisible = isVisible;
    if (isVisible) {
      await setBtn.click();
      await page.waitForTimeout(800);
      await shot('settlement');
      const close = await tryClick(page, '#settlementCloseButton, .settlement-close, [aria-label="关闭"]');
      if (!close.ok) await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch (e) { rec.notes.settlementError = String(e).split('\n')[0]; }

  // Settings
  try {
    const open = await tryClick(page, '#openSettingsButton');
    rec.notes.settingsOpen = open;
    if (open.ok) {
      await page.waitForTimeout(700);
      await shot('settings');
      rec.notes.settingsView = await page.evaluate(() => {
        const v = document.querySelector('.settings-view');
        return v ? { present: true, scrollW: v.scrollWidth, clientW: v.clientWidth } : { present: false };
      });
      // close settings (look for close button or hit Escape)
      const close = await tryClick(page, '#closeSettingsButton');
      if (!close.ok) await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }
  } catch (e) { rec.notes.settingsError = String(e).split('\n')[0]; }

  // Entry tab (mobile natural mode)
  if (cfg.entryMode === 'natural' && cfg.isMobile) {
    try {
      const entry = await tryClick(page, '#mobileEntryTab');
      rec.notes.entryTab = entry;
      if (entry.ok) {
        await page.waitForTimeout(700);
        await shot('entry');
        rec.notes.entryVisible = await page.evaluate(() => {
          const form = document.querySelector('#expenseForm');
          return form ? { display: getComputedStyle(form).display, hidden: form.hidden } : null;
        });

        // Amount token stage
        const amountClick = await tryClick(page, '#naturalAmountToken', { force: true });
        rec.notes.amountStageClick = amountClick;
        if (amountClick.ok) {
          await page.waitForTimeout(800);
          await shot('stage-amount');
          rec.notes.amountStage = await page.evaluate(() => {
            const s = document.querySelector('#naturalEntryStage');
            return s ? { hidden: s.hidden, display: getComputedStyle(s).display, zIndex: getComputedStyle(s).zIndex } : null;
          });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
        }

        // Category token
        const catClick = await tryClick(page, '#naturalCategoryToken', { force: true });
        rec.notes.categoryStageClick = catClick;
        if (catClick.ok) {
          await page.waitForTimeout(800);
          await shot('stage-category');
          rec.notes.categoryChips = await page.evaluate(() => {
            const c = document.querySelector('#categoryChips');
            return c ? { scrollW: c.scrollWidth, clientW: c.clientWidth, hasHorizontalScroll: c.scrollWidth > c.clientWidth + 1 } : null;
          });
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
        }

        // Split token
        const splitClick = await tryClick(page, '#naturalSplitToken', { force: true });
        rec.notes.splitStageClick = splitClick;
        if (splitClick.ok) {
          await page.waitForTimeout(800);
          await shot('stage-split');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(400);
        }
      }
    } catch (e) { rec.notes.entryFlowError = String(e).split('\n')[0]; }
  }

  if (cfg.welcome) {
    try {
      await page.waitForTimeout(600);
      const wel = await page.$('#welcomeView');
      if (wel && await wel.isVisible()) await shot('welcome');
      const op = await page.$('#operatorModalView');
      if (op && await op.isVisible()) await shot('operator');
    } catch (e) { rec.notes.onboardError = String(e).split('\n')[0]; }
  }

  await ctx.close();
  return rec;
}

(async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const browser = await webkit.launch({ args: ['--use-gl=swiftshader'] });
  const report = loadReport();
  for (const cfg of runs) {
    if (only && !only.includes(cfg.name)) continue;
    try {
      const rec = await auditRun(browser, cfg);
      const idx = report.runs.findIndex(r => r.name === cfg.name);
      if (idx >= 0) report.runs[idx] = rec; else report.runs.push(rec);
      saveReport(report);
      console.log(`[done] ${cfg.name}: err=${rec.consoleErrors.length} warn=${rec.consoleWarnings.length} pageErr=${rec.pageErrors.length} reqFail=${rec.failedRequests.length} overflowX=${rec.notes.overflow ? rec.notes.overflow.horizontalOverflow : '?'} scramble=${rec.notes.totalReveal ? rec.notes.totalReveal.hasScrambleGlyphs : '?'}`);
    } catch (e) {
      console.log(`[FAIL] ${cfg.name}: ${e}`);
      report.runs.push({ name: cfg.name, fatal: String(e) });
      saveReport(report);
    }
  }
  await browser.close();
  console.log('REPORT_WRITTEN', path.join(OUT, 'report.json'));
})();
