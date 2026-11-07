/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS config file read by the tool */
// Lighthouse CI budgets (plan §6): `/`, a section hub, the heaviest diagram article and an interview subsection,
// mobile emulation with Lighthouse's default simulated throttling, 3 runs each, asserted on the median run.
// Run after `npm run build` with `npm run lighthouse -w web`. It serves the build with `next start` (static
// export isn't possible, so `staticDistDir` doesn't apply).
//
// Results stay local: written to test-results/lighthouse/ (CI uploads that folder as a workflow artifact). No
// Lighthouse server and no temporary public storage. The npm script runs lhci from test-results/ so its working
// folder (.lighthouseci/) lands there too, outside git.
const path = require("node:path");

const webDir = __dirname;
const PORT = Number(process.env.LHCI_PORT ?? 3200);
const base = `http://127.0.0.1:${PORT}`;

// Keep in step with tests/e2e/support/templates.ts.
const PAGES = [
  "/",
  "/system-design",
  "/ai-system-design/genai-system-design/transformer-architecture",
  "/interviews/rag/rag-fundamentals",
];

const median = (level, option) => [level, { ...option, aggregationMethod: "median" }];

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx next start ${JSON.stringify(webDir)} -p ${PORT}`,
      startServerReadyPattern: "Ready in",
      startServerReadyTimeout: 60_000,
      url: PAGES.map((p) => `${base}${p}`),
      numberOfRuns: 3,
      settings: {
        formFactor: "mobile",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "largest-contentful-paint": median("error", { maxNumericValue: 2000 }),
        "total-blocking-time": median("error", { maxNumericValue: 150 }),
        "cumulative-layout-shift": median("error", { maxNumericValue: 0.05 }),
        "categories:performance": median("warn", { minScore: 0.95 }),
      },
    },
    upload: {
      target: "filesystem",
      outputDir: path.join(webDir, "test-results", "lighthouse"),
    },
  },
};
