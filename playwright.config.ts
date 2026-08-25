import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// This remote dev environment ships a pre-installed Chromium to avoid
// re-downloading browsers; fall back to Playwright's managed browser
// (e.g. in CI or on a contributor's machine) when that path isn't there.
const localChromium = "/opt/pw-browsers/chromium";
const executablePath = existsSync(localChromium) ? localChromium : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  webServer: {
    command: "npm run dev -- --port 4173 --strictPort",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: "http://localhost:4173",
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
