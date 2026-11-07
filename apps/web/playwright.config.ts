import { defineConfig, devices } from "@playwright/test";

// End-to-end tests in tests/e2e. By default they run against a local production server (`next start`), so run
// `npm run build` first. Set E2E_BASE_URL to test an already-running deployment instead (no local server).
const PORT = Number(process.env.E2E_PORT ?? 3100);
const externalBaseURL = process.env.E2E_BASE_URL;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // Plan §12.7: 2 retries in CI (flakes are reported), none locally.
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: externalBaseURL ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "iphone-15", use: { ...devices["iPhone 15"] } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: `npx next start -p ${PORT}`,
        url: `http://127.0.0.1:${PORT}`,
        reuseExistingServer: !isCI,
        timeout: 60_000,
      },
});
