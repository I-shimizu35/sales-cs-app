import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  globalTeardown: require.resolve("./tests/e2e/global-teardown"),
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      // WindowsのPlaywright WebKitビルドはナビゲーション周りのタイミングが
      // 他の2エンジンより不安定(同じ操作が実行ごとに成功したり失敗したりする)。
      // アプリ側の実際の不具合ではなく自動化ドライバ側の既知の傾向のため、
      // webkitプロジェクトのみ再試行を1回許容する。
      name: "webkit",
      retries: 1,
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
