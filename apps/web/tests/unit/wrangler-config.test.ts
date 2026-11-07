import { describe, expect, it } from "vitest";
import { readWranglerConfig } from "./wrangler-config";

// Security review M2: production (and staging) must not expose per-version preview URLs: every uploaded version,
// the canary and old buggy ones included, would stay reachable with production secrets. workers.dev stays on for
// the deploy smoke tests; middleware redirects it to the canonical host (src/server/edge/host-guard.ts).

const config = readWranglerConfig() as {
  preview_urls?: boolean;
  env: Record<string, { workers_dev?: boolean; preview_urls?: boolean; vars?: { APP_ENV?: string } }>;
};

describe("wrangler.jsonc exposure", () => {
  it("has no version preview URLs in production or staging", () => {
    expect(config.env.production?.preview_urls).toBe(false);
    expect(config.env.staging?.preview_urls).toBe(false);
    expect(config.preview_urls).toBe(false);
  });

  it("keeps preview URLs only for the per-PR preview Worker", () => {
    expect(config.env.preview?.preview_urls).toBe(true);
    expect(config.env.preview?.vars?.APP_ENV).toBe("preview");
  });
});
