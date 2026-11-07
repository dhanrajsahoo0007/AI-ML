import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

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

  it("adds Reporting-Endpoints and report-to only when a report endpoint is set", () => {
    expect(h.has("Reporting-Endpoints")).toBe(false);
    const withReports = asMap(securityHeaders({ reportEndpoint: "https://r.test/csp" }));
    expect(withReports.get("Reporting-Endpoints")).toBe('csp="https://r.test/csp"');
    const d = directives(withReports.get("Content-Security-Policy-Report-Only")!);
    expect(d.get("report-to")).toEqual(["csp"]);
    expect(d.get("report-uri")).toEqual(["https://r.test/csp"]);
  });
});

describe("contentSecurityPolicy", () => {
  const d = directives(contentSecurityPolicy());

  it("matches §11.4", () => {
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("script-src")).toEqual(["'self'", "'unsafe-inline'", "https://static.cloudflareinsights.com"]);
    expect(d.get("connect-src")).toEqual(["'self'", "https://cloudflareinsights.com"]);
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
    expect(d.has("report-to")).toBe(false);
  });

  it("allows eval only for the dev server", () => {
    expect(d.get("script-src")).not.toContain("'unsafe-eval'");
    expect(directives(contentSecurityPolicy({ dev: true })).get("script-src")).toContain("'unsafe-eval'");
  });
});
