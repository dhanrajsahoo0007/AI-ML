import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Security review M6: every security-critical path needs a code-owner review. GitHub picks the last matching
// pattern; this file uses only directory and file patterns rooted at `/`, so a prefix match is enough here.

const root = path.resolve(__dirname, "../../../..");
const patterns = fs
  .readFileSync(path.join(root, ".github/CODEOWNERS"), "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => {
    const [pattern, ...owners] = l.split(/\s+/);
    return { pattern: pattern!, owners };
  });

const owned = (file: string) =>
  patterns.some(
    ({ pattern, owners }) =>
      owners.length > 0 && (pattern.endsWith("/") ? `/${file}`.startsWith(pattern) : `/${file}` === pattern)
  );

const CRITICAL = [
  ".github/workflows/ci.yml",
  ".github/workflows/deploy.yml",
  ".github/workflows/preview.yml",
  ".github/workflows/preview-deploy.yml",
  ".github/workflows/newsletter-send.yml",
  "package-lock.json",
  "apps/web/package.json",
  "apps/web/wrangler.jsonc",
  "apps/web/open-next.config.ts",
  "apps/web/next.config.ts",
  "apps/web/eslint.config.mjs",
  "apps/web/src/middleware.ts",
  "apps/web/src/server/http.ts",
  "apps/web/src/server/env.ts",
  "apps/web/src/server/rate-limit.ts",
  "apps/web/src/server/edge/entitlement.ts",
  "apps/web/src/server/edge/host-guard.ts",
  "apps/web/src/server/db/client.ts",
  "apps/web/drizzle/0000_init.sql",
  "apps/web/src/app/api/progress/route.ts",
  "apps/web/src/app/api/csp-report/route.ts",
  "apps/web/src/features/auth/server.ts",
  "apps/web/src/features/auth/next-path.ts",
  "apps/web/src/features/account/index.ts",
  "apps/web/src/features/billing/index.ts",
  "apps/web/src/features/entitlements/server.ts",
  "apps/web/src/features/paywall/access.ts",
  "apps/web/src/features/newsletter/token.ts",
  "apps/web/src/features/admin/access.ts",
  "apps/web/src/features/seo/security-headers.ts",
  "apps/web/content/sections.yaml",
  "apps/web/content/features.yaml",
];

describe("CODEOWNERS", () => {
  it.each(CRITICAL)("covers %s", (file) => {
    expect(fs.existsSync(path.join(root, file)), `${file} exists`).toBe(true);
    expect(owned(file)).toBe(true);
  });
});
