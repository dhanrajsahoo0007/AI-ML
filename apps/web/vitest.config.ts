import path from "node:path";
import { defineConfig } from "vitest/config";

// Unit tests: pure logic only (no network, no database, no browser). Colocate as `src/**/*.test.ts` or put
// them under `tests/unit/`. Playwright specs in `tests/e2e/` are run by `npm run e2e`, not Vitest.
export default defineConfig({
  // tsconfig sets "jsx": "preserve" for Next; Vite 8 (oxc) cannot parse preserved JSX, so component tests
  // (renderToStaticMarkup of .tsx modules) need the automatic runtime here.
  oxc: { jsx: { runtime: "automatic" } },
  // Lazily loaded components can import CSS (katex.min.css); unit tests never need it processed, and the app's
  // PostCSS config (Tailwind) is not meant for Vite. An inline config stops Vite from loading postcss.config.mjs.
  css: { postcss: { plugins: [] } },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` throws outside a React Server Components bundle; in unit tests it's a no-op.
      "server-only": path.resolve(__dirname, "tests/unit/server-only-stub.ts"),
      // `next/dynamic` renders nothing outside a Next.js build; in tests it is React.lazy (see the stub).
      "next/dynamic": path.resolve(__dirname, "tests/unit/next-dynamic-stub.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
