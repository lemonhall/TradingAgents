import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "browser.spec.mjs",
  fullyParallel: false,
  workers: 1,
  reporter: "line",
  timeout: 30_000,
  use: {
    channel: "chrome",
    headless: true,
    locale: "zh-CN",
    proxy: process.env.PLAYWRIGHT_PROXY_URL
      ? { server: process.env.PLAYWRIGHT_PROXY_URL }
      : undefined,
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
});
