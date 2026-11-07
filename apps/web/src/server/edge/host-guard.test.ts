import { describe, expect, it } from "vitest";
import { decideHost } from "./host-guard";

// Security review M2: production pages are served on the canonical host only; workers.dev and version preview
// hosts redirect there, unless the deploy smoke key is presented.

const KEY = "k".repeat(40);
const at = (url: string, extra: Partial<Parameters<typeof decideHost>[0]> = {}) =>
  decideHost({
    appEnv: "production",
    url: new URL(url),
    canonicalUrl: "https://learn.example",
    smokeKey: KEY,
    ...extra,
  });

describe("decideHost", () => {
  it("passes the canonical host", () => {
    expect(at("https://learn.example/system-design?x=1")).toEqual({ action: "pass" });
  });

  it("redirects workers.dev and preview-URL hosts to the canonical origin, keeping path and query", () => {
    expect(at("https://origins-ai-learn-production.acme.workers.dev/interviews?company=google")).toEqual({
      action: "redirect",
      location: "https://learn.example/interviews?company=google",
    });
    expect(at("https://abc123-origins-ai-learn-production.acme.workers.dev/")).toMatchObject({ action: "redirect" });
    expect(at("https://www.learn.example/")).toMatchObject({ action: "redirect" });
  });

  it("lets the deploy smoke tests through with the right key only (noindex)", () => {
    const host = "https://origins-ai-learn-production.acme.workers.dev/";
    expect(at(host, { presentedKey: KEY })).toEqual({ action: "pass-noindex" });
    expect(at(host, { presentedKey: `${KEY}x` })).toMatchObject({ action: "redirect" });
    expect(at(host, { presentedKey: "" })).toMatchObject({ action: "redirect" });
    // A short or missing SMOKE_KEY never admits anyone.
    expect(at(host, { smokeKey: "short", presentedKey: "short" })).toMatchObject({ action: "redirect" });
    expect(at(host, { smokeKey: undefined, presentedKey: undefined })).toMatchObject({ action: "redirect" });
  });

  it("does nothing outside production, or before the canonical URL is known", () => {
    expect(at("https://x.workers.dev/", { appEnv: "staging" })).toEqual({ action: "pass" });
    expect(at("https://x.workers.dev/", { appEnv: "preview" })).toEqual({ action: "pass" });
    expect(at("https://x.workers.dev/", { canonicalUrl: undefined })).toEqual({ action: "pass" });
    expect(at("https://x.workers.dev/", { canonicalUrl: "https://x.workers.dev" })).toEqual({ action: "pass" });
  });
});
