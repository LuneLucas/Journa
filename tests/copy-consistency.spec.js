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
    await expect(page.locator("#welcomeHeroCopy")).toHaveText("默认按人数分，也可逐笔调整。");
    await expect(page.locator("#welcomeCloudCopy")).toHaveText("创建云账本后，所有家庭实时同步。");
    await expect(page.locator("#welcomeIdentityHint")).toHaveText("本地账本可稍后再选；云账本需要选择家庭。");

    const bodyText = await page.locator("body").innerText();
    for (const phrase of legacyCopy) expect(bodyText).not.toContain(phrase);
  });

  test("分享页与主应用使用同一套邀请口吻", async ({ page }) => {
    await page.goto("/share-welcome.html");

    await expect(page).toHaveTitle("Journa · 共享旅行账本");
    await expect(page.locator("#swSourceBadgeText")).toHaveText("共享旅行账本");
    await expect(page.locator("#swHeroCopy")).toHaveText("查看账单，也能随手记一笔。");
    await expect(page.locator(".welcome-slide[data-slide='1'] .welcome-split-mode").nth(0).locator("small")).toHaveText("按家庭人数分");
    await expect(page.locator(".welcome-slide[data-slide='2'] h3")).toHaveText("平账建议自动生成");
    await expect(page.locator(".welcome-slide[data-slide='2'] .welcome-copy")).toHaveCount(0);
    await expect(page.locator(".welcome-slide[data-slide='4'] h3")).toHaveText("你属于哪个家庭？");

    const bodyText = await page.locator("body").innerText();
    for (const phrase of legacyCopy) expect(bodyText).not.toContain(phrase);
  });
});
