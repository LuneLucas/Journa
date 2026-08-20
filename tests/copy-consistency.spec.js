const { test, expect } = require("@playwright/test");

const legacyCopy = ["TravelLedger", "统计和平账", "云同步与备份", "添加账单", "还差一步"];

test.describe("Journa 文案一致性", () => {
  test("主应用使用统一标题、动作和术语", async ({ page }) => {
    await page.goto("/index.html");
    await page.waitForSelector(".app-shell");

    await expect(page).toHaveTitle("Journa · 共享旅行账本");
    const manifestResponse = await page.request.get("/manifest.webmanifest");
    expect(await manifestResponse.json()).toMatchObject({
      name: "Journa · 共享旅行账本",
      short_name: "Journa",
    });
    await expect(page.locator('#submitButtonLabel')).toHaveText("记下这笔");
    await expect(page.locator("#naturalEntryHint")).toHaveText("点文字修改");
    await expect(page.locator("#confirmEyebrow")).toHaveText("确认操作");
    await expect(page.locator("#operatorModalTitle")).toHaveText("你属于哪个家庭？");
    await expect(page.locator("#settlementEntrySub")).toHaveText("已两清");

    const bodyText = await page.locator("body").innerText();
    for (const phrase of legacyCopy) expect(bodyText).not.toContain(phrase);
  });

  test("分享页与主应用使用同一套邀请口吻", async ({ page }) => {
    await page.goto("/share-welcome.html");

    await expect(page).toHaveTitle("Journa · 共享旅行账本");
    await expect(page.locator("#swSourceBadgeText")).toHaveText("共享旅行账本");
    await expect(page.locator("#swHeroCopy")).toContainText("记下的账");
    await expect(page.locator(".welcome-slide[data-slide='2'] .welcome-copy")).toContainText("算清谁该转给谁");
    await expect(page.locator(".welcome-slide[data-slide='4'] h3")).toHaveText("你属于哪个家庭？");

    const bodyText = await page.locator("body").innerText();
    for (const phrase of legacyCopy) expect(bodyText).not.toContain(phrase);
  });
});
