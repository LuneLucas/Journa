const { defineConfig, devices } = require('@playwright/test');
// 本地可复用已安装的 Chrome；CI 不设置该变量，仍使用 lockfile 对应的 Playwright Chromium。
const chromiumChannel = process.env.JOURNA_PLAYWRIGHT_CHROMIUM_CHANNEL;
const chromiumChannelUse = chromiumChannel ? { channel: chromiumChannel } : {};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['iPhone 13'], browserName: 'chromium', ...chromiumChannelUse } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
    { name: 'webkit-desktop', use: { ...devices['Desktop Safari'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], ...chromiumChannelUse } },
  ],
});
