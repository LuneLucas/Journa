const SUPABASE_CDN_PATTERN = "**/cdn.jsdelivr.net/npm/@supabase/supabase-js@2*";

async function stubSupabase(page) {
  await page.route(SUPABASE_CDN_PATTERN, (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "window.supabase = undefined;",
  }));
}

async function seedLocalState(page, state, { entryMode = null, welcomeSeen = true } = {}) {
  await page.addInitScript(({ initialState, initialEntryMode, initialWelcomeSeen }) => {
    if (initialState) localStorage.setItem("travel-ledger-v3", JSON.stringify(initialState));
    if (initialEntryMode) localStorage.setItem("travel-ledger-entry-mode", initialEntryMode);
    if (initialWelcomeSeen) localStorage.setItem("travel-ledger-welcome-seen", "1");
    else localStorage.removeItem("travel-ledger-welcome-seen");
  }, { initialState: state, initialEntryMode: entryMode, initialWelcomeSeen: welcomeSeen });
}

async function dismissWelcomeIfOpen(page) {
  const welcome = page.locator("#welcomeView");
  if (await welcome.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.locator("#welcomeSkipButton").click({ force: true });
    await welcome.waitFor({ state: "hidden" });
  }
}

module.exports = { dismissWelcomeIfOpen, seedLocalState, stubSupabase };
