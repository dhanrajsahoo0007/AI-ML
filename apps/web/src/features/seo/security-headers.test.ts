import { describe, expect, it } from "vitest";
import { observabilityCspHosts } from "../observability/csp-hosts";
import {
  contentSecurityPolicy,
  CSP_REPORT_ENDPOINT,
  DSA_RUNNER_CHUNKS,
  securityHeaders,
  staticAssetHeadersFile,
} from "./security-headers";

const asMap = (headers: { key: string; value: string }[]) => new Map(headers.map((h) => [h.key, h.value]));

function directives(csp: string) {
  return new Map(
    csp.split(";").map((d) => {
      const [name, ...values] = d.trim().split(/\s+/);
      return [name, values] as const;
    })
  );
}

describe("securityHeaders", () => {
  const h = asMap(securityHeaders());

  it("sends the §11.4 headers", () => {
    expect(h.get("Strict-Transport-Security")).toBe("max-age=63072000; includeSubDomains; preload");
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(h.get("Permissions-Policy")).toBe(
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
    );
    expect(h.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(h.get("Cross-Origin-Resource-Policy")).toBe("same-site");
    expect(h.get("X-Frame-Options")).toBe("DENY");
    expect(h.get("X-Robots-Tag")).toBe("noai, noimageai");
  });

  it("sends the CSP as Report-Only until it is enforced", () => {
    expect(h.has("Content-Security-Policy")).toBe(false);
    expect(h.get("Content-Security-Policy-Report-Only")).toBe(contentSecurityPolicy());
    const enforced = asMap(securityHeaders({ enforceCsp: true }));
    expect(enforced.has("Content-Security-Policy-Report-Only")).toBe(false);
    expect(enforced.get("Content-Security-Policy")).toBe(contentSecurityPolicy());
  });

  it("keeps non-production environments out of search engines", () => {
    expect(asMap(securityHeaders({ indexable: false })).get("X-Robots-Tag")).toBe("noindex, nofollow, noai, noimageai");
  });

  it("reports violations to /api/csp-report (security review M3)", () => {
    expect(CSP_REPORT_ENDPOINT).toBe("/api/csp-report");
    expect(h.get("Reporting-Endpoints")).toBe('csp="/api/csp-report"');
    const d = directives(h.get("Content-Security-Policy-Report-Only")!);
    expect(d.get("report-to")).toEqual(["csp"]);
    expect(d.get("report-uri")).toEqual(["/api/csp-report"]);
    const none = asMap(securityHeaders({ reportEndpoint: null }));
    expect(none.has("Reporting-Endpoints")).toBe(false);
    expect(directives(none.get("Content-Security-Policy-Report-Only")!).has("report-uri")).toBe(false);
  });

  it("relaxes the CSP for the DSA runner workers only, never for pages (security review M3)", () => {
    const runner = directives(asMap(securityHeaders({ dsaRunner: true })).get("Content-Security-Policy-Report-Only")!);
    expect(runner.get("script-src")).toEqual(
      expect.arrayContaining(["'unsafe-eval'", "'wasm-unsafe-eval'", "https://cdn.jsdelivr.net"])
    );
    expect(runner.get("connect-src")).toContain("https://cdn.jsdelivr.net");
    const page = directives(h.get("Content-Security-Policy-Report-Only")!);
    for (const v of ["'unsafe-eval'", "'wasm-unsafe-eval'", "https://cdn.jsdelivr.net"]) {
      expect(page.get("script-src")).not.toContain(v);
    }
  });
});

describe("staticAssetHeadersFile (Workers Static Assets _headers)", () => {
  const file = staticAssetHeadersFile({ indexable: false });
  const rules = new Map<string, string[]>();
  let current = "";
  for (const line of file.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    if (!line.startsWith(" ")) rules.set((current = line), []);
    else rules.get(current)!.push(line.trim());
  }

  it("gives every static file the baseline headers and the page CSP", () => {
    const all = rules.get("/*")!;
    expect(all).toContain("Strict-Transport-Security: max-age=63072000; includeSubDomains; preload");
    expect(all).toContain("X-Content-Type-Options: nosniff");
    expect(all).toContain("X-Robots-Tag: noindex, nofollow, noai, noimageai");
    const csp = all.find((l) => l.startsWith("Content-Security-Policy-Report-Only:"))!;
    expect(csp).not.toContain("unsafe-eval");
  });

  it("swaps in the runner policy for each runner chunk", () => {
    for (const chunk of DSA_RUNNER_CHUNKS) {
      const rule = rules.get(`/_next/static/chunks/${chunk}.*`)!;
      expect(rule[0]).toBe("! Content-Security-Policy-Report-Only");
      expect(rule[1]).toMatch(/^Content-Security-Policy-Report-Only: .*'wasm-unsafe-eval'/);
      expect(rule).toHaveLength(2);
    }
  });
});

describe("contentSecurityPolicy", () => {
  // No observability tool switched on, whatever the environment of the test run.
  const off = observabilityCspHosts({});
  const d = directives(contentSecurityPolicy({ observability: off }));

  it("matches §11.4", () => {
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("script-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("connect-src")).toEqual(["'self'"]);
    expect(d.get("img-src")).toEqual(["'self'", "data:", "https://lh3.googleusercontent.com"]);
    expect(d.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(d.get("font-src")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'", "https://accounts.google.com"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("leaves out directives that browsers reject in report-only mode", () => {
    expect(d.has("upgrade-insecure-requests")).toBe(false);
  });

  it("allows eval only for the dev server", () => {
    expect(d.get("script-src")).not.toContain("'unsafe-eval'");
    expect(directives(contentSecurityPolicy({ dev: true })).get("script-src")).toContain("'unsafe-eval'");
  });
});

describe("observability hosts in the CSP", () => {
  it("adds Sentry, PostHog and Cloudflare Web Analytics only when their variables are set", () => {
    const on = observabilityCspHosts({
      NEXT_PUBLIC_SENTRY_DSN: "https://abc123@o42.ingest.us.sentry.io/7",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
      NEXT_PUBLIC_CF_BEACON_TOKEN: "cf-test",
    });
    const d = directives(contentSecurityPolicy({ observability: on }));
    expect(d.get("script-src")).toEqual(["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"]);
    expect(d.get("connect-src")).toEqual([
      "'self'",
      "https://o42.ingest.us.sentry.io",
      "https://us.i.posthog.com",
      "https://cloudflareinsights.com",
    ]);
  });

  it("uses the configured PostHog host and ignores malformed or non-https values", () => {
    expect(
      observabilityCspHosts({
        NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
        NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com/",
      }).connectSrc
    ).toEqual(["https://eu.i.posthog.com"]);
    expect(observabilityCspHosts({ NEXT_PUBLIC_SENTRY_DSN: "not a url" }).connectSrc).toEqual([]);
    expect(observabilityCspHosts({ NEXT_PUBLIC_SENTRY_DSN: "http://k@sentry.example/1" }).connectSrc).toEqual([]);
    // A host without its key adds nothing.
    expect(observabilityCspHosts({ NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" }).connectSrc).toEqual([]);
  });
});
