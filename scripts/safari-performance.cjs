const os = require("os");
const fs = require("fs");
const path = require("path");

const CORE = path.join(__dirname, "..", "node_modules/.pnpm/playwright-core@1.62.1/node_modules/playwright-core");
const { webkit } = require(CORE);
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4173";

const seed = {
  activeLedgerId: "safari-performance-ledger",
  ledgers: [{
    id: "safari-performance-ledger",
    name: "Safari 性能采样账本",
    families: [
      { id: "family-a", name: "乐家" },
      { id: "family-b", name: "祺家" },
      { id: "family-c", name: "旦家" },
    ],
    categories: ["交通", "餐饮", "其他"],
    familyMembers: { "family-a": 1, "family-b": 1, "family-c": 1 },
    expenses: [{
      id: "safari-performance-expense",
      amount: 123.45,
      payerId: "family-a",
      category: "交通",
      date: "2026-08-20",
      note: "Safari pointer performance probe",
      splitMode: "equal",
      splitFamilyIds: [],
      splitAmounts: {},
      createdAt: "2026-08-20T12:00:00.000Z",
      updatedAt: "2026-08-20T12:00:00.000Z",
    }],
  }],
};

function findWebKitExecutable() {
  const cacheDir = path.join(os.homedir(), ".cache", "ms-playwright");
  if (!fs.existsSync(cacheDir)) return undefined;
  const dir = fs.readdirSync(cacheDir).find((name) => name.startsWith("webkit-"));
  return dir ? path.join(cacheDir, dir, "Playwright.app/Contents/MacOS/Playwright") : undefined;
}

async function readPerf(page) {
  return page.evaluate(() => ({
    ...window.__journaPerf,
    longFrames: [...window.__journaPerf.longFrames],
  }));
}

async function run() {
  const launchOptions = {};
  if (process.env.PW_WEBKIT_EXEC) launchOptions.executablePath = process.env.PW_WEBKIT_EXEC;
  const browser = await webkit.launch(launchOptions);
  const results = { baseUrl: BASE_URL, local: null, mobileStage: null, mobileStage320: null, desktopPointer: null };

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  await context.addInitScript((initialState) => {
    localStorage.setItem("travel-ledger-v3", JSON.stringify(initialState));
    localStorage.setItem("travel-ledger-welcome-seen", "1");
    localStorage.setItem("travel-ledger-entry-mode", "natural");
  }, seed);
  await context.addInitScript(() => {
    const perf = {
      stageRectReads: 0,
      pointerRectReads: 0,
      longFrames: [],
      running: true,
      lastFrame: performance.now(),
    };
    perf.resetSegment = () => {
      perf.stageRectReads = 0;
      perf.pointerRectReads = 0;
      perf.longFrames = [];
      perf.lastFrame = performance.now();
    };
    window.__journaPerf = perf;

    const nativeGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function patchedGetBoundingClientRect() {
      if (this.id === "naturalEntryStage"
        || this.id === "naturalEntryStageToken"
        || this.matches?.(".natural-entry-token.is-stage-anchor")) {
        perf.stageRectReads += 1;
      }
      if (this.matches?.(".pointer-sink-target")) perf.pointerRectReads += 1;
      return nativeGetBoundingClientRect.call(this);
    };

    const sampleFrame = (now) => {
      const interval = now - perf.lastFrame;
      if (interval > 50) perf.longFrames.push(Math.round(interval));
      perf.lastFrame = now;
      if (perf.running) requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
  });
  const page = await context.newPage();
  const requestedUrls = [];
  page.on("request", (request) => requestedUrls.push(request.url()));
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#appShell, .app-shell");
  results.local = {
    supabaseCdnRequests: requestedUrls.filter((url) => url.includes("cdn.jsdelivr.net/npm/@supabase/supabase-js")).length,
    initial: await readPerf(page),
  };

  await page.locator("#mobileEntryTab").click();
  await page.locator("#naturalAmountToken").click();
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__journaPerf.resetSegment());
  await page.evaluate(() => {
    window.scrollTo(0, 180);
    window.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(420);
  results.mobileStage = await readPerf(page);
  await page.locator("#naturalEntryFocusBackdrop").evaluate((backdrop) => backdrop.click());
  await page.waitForSelector("#naturalEntryStage[hidden]", { state: "attached" });
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator("#naturalAmountToken").click();
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__journaPerf.resetSegment());
  await page.evaluate(() => {
    window.scrollTo(0, 140);
    window.dispatchEvent(new Event("scroll"));
  });
  await page.waitForTimeout(420);
  results.mobileStage320 = await readPerf(page);
  await context.close();

  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  });
  await desktop.addInitScript((initialState) => {
    localStorage.setItem("travel-ledger-v3", JSON.stringify(initialState));
    localStorage.setItem("travel-ledger-welcome-seen", "1");
    localStorage.setItem("travel-ledger-entry-mode", "standard");
  }, seed);
  await desktop.addInitScript(() => {
    const perf = {
      stageRectReads: 0,
      pointerRectReads: 0,
      longFrames: [],
      running: true,
      lastFrame: performance.now(),
    };
    perf.resetSegment = () => {
      perf.stageRectReads = 0;
      perf.pointerRectReads = 0;
      perf.longFrames = [];
      perf.lastFrame = performance.now();
    };
    window.__journaPerf = perf;

    const nativeGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function patchedGetBoundingClientRect() {
      if (this.id === "naturalEntryStage"
        || this.id === "naturalEntryStageToken"
        || this.matches?.(".natural-entry-token.is-stage-anchor")) {
        perf.stageRectReads += 1;
      }
      if (this.matches?.(".pointer-sink-target")) perf.pointerRectReads += 1;
      return nativeGetBoundingClientRect.call(this);
    };

    const sampleFrame = (now) => {
      const interval = now - perf.lastFrame;
      if (interval > 50) perf.longFrames.push(Math.round(interval));
      perf.lastFrame = now;
      if (perf.running) requestAnimationFrame(sampleFrame);
    };
    requestAnimationFrame(sampleFrame);
  });
  const desktopPage = await desktop.newPage();
  await desktopPage.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await desktopPage.waitForSelector(".ledger-item");
  const card = desktopPage.locator(".ledger-item").first();
  const box = await card.boundingBox();
  await desktopPage.evaluate(() => window.__journaPerf.resetSegment());
  if (box) {
    for (let index = 0; index < 40; index += 1) {
      await desktopPage.mouse.move(box.x + 12 + (box.width - 24) * (index / 39), box.y + box.height / 2);
    }
  }
  await desktopPage.waitForTimeout(420);
  const pointerState = await card.evaluate((item) => ({
    className: item.className,
    rotateX: item.style.getPropertyValue("--pointer-rotate-x"),
    rotateY: item.style.getPropertyValue("--pointer-rotate-y"),
  }));
  const desktopPointerSample = await readPerf(desktopPage);
  const summaryToggle = card.locator(".ledger-summary-toggle");
  await summaryToggle.click();
  await desktopPage.waitForFunction(() => document.querySelector(".ledger-item")?.classList.contains("is-expanded"));
  const expanded = await card.evaluate((item) => item.classList.contains("is-expanded"));
  await summaryToggle.click();
  await desktopPage.waitForFunction(() => !document.querySelector(".ledger-item")?.classList.contains("is-expanded"));
  const collapsed = await card.evaluate((item) => !item.classList.contains("is-expanded"));
  results.desktopPointer = {
    ...desktopPointerSample,
    pointerState,
    expanded,
    collapsed,
  };
  await desktop.close();
  await browser.close();

  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
