import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests: pure logic only (no network, no database, no browser). Colocate as `src/**/*.test.ts` or put
// them under `tests/unit/`. Playwright specs in `tests/e2e/` are run by `npm run e2e`, not Vitest.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside a React Server Components bundle; in unit tests it's a no-op.
      "server-only": path.resolve(__dirname, "tests/unit/server-only-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
