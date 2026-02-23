import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8888",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "chrome-headed",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        headless: false,
        launchOptions: {
          args: ["--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
        },
      },
    },
    {
      name: "chromium-headed",
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        launchOptions: {
          args: ["--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-dev-shm-usage"],
        },
      },
    },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command:
          process.env.PLAYWRIGHT_USE_NETLIFY === "1"
            ? "npm run dev:netlify"
            : "npm run dev:e2e",
        url: "http://localhost:8888",
        reuseExistingServer: !process.env.CI,
        timeout: process.env.PLAYWRIGHT_USE_NETLIFY === "1" ? 120000 : 30000,
      },
})
