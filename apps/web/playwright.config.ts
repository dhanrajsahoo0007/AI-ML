import { defineConfig, devices } from "@playwright/test";

// End-to-end tests in tests/e2e. By default they run against a local production server (`next start`), so run
// `npm run build` first (APP_ENV=preview or APP_ENV=production picks the section profile; CI builds both). Set
// E2E_BASE_URL to test an already-running deployment instead (no local server).
//
// Projects: the five browser projects run every spec except the visual snapshots; `visual` runs only those, in
// Chromium, against Linux baselines made in the Playwright Docker image (see tests/e2e/visual.spec.ts).
// Tags select suites inside a project: @core, @smoke, @full (plan §12.2), plus @a11y and @leak for their CI jobs.
const PORT = Number(process.env.E2E_PORT ?? 3100);
const externalBaseURL = process.env.E2E_BASE_URL;
const isCI = !!process.env.CI;
const VISUAL_SPEC = /visual\.spec\.ts$/;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  // Plan §12.7: 2 retries in CI (flakes are reported), none locally.
  retries: isCI ? 2 : 0,
  workers: isCI ? 4 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  // One baseline per screenshot, shared by every machine: baselines are always made on Linux (Docker or CI).
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
      // Anti-aliasing noise only; a real layout or colour change moves far more pixels.
      maxDiffPixelRatio: 0.002,
      threshold: 0.2,
    },
  },
  use: {
    baseURL: externalBaseURL ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: VISUAL_SPEC },
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, testIgnore: VISUAL_SPEC },
    { name: "webkit", use: { ...devices["Desktop Safari"] }, testIgnore: VISUAL_SPEC },
    { name: "pixel-7", use: { ...devices["Pixel 7"] }, testIgnore: VISUAL_SPEC },
    { name: "iphone-15", use: { ...devices["iPhone 15"] }, testIgnore: VISUAL_SPEC },
    { name: "visual", use: { ...devices["Desktop Chrome"] }, testMatch: VISUAL_SPEC },
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
