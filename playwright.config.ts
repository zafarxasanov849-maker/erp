import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = `http://127.0.0.1:${PORT}`;

// O'rnatilgan Chromium boshqa versiyada bo'lsa (masalan, bulut muhitida), yo'lini shu bilan bering.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "uz-UZ",
    timezoneId: "Asia/Tashkent",
    trace: "on-first-retry",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      // PRD §7: asosiy sahifalar 375 px kenglikda ishlashi kerak
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 740 }, hasTouch: true },
    },
  ],
  webServer: {
    command: process.env.CI ? `pnpm build && pnpm start -p ${PORT}` : `pnpm dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
