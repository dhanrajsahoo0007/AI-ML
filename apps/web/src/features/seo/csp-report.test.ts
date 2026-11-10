import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/csp-report/route";
import { setLogSink } from "@/server/log";
import { CSP_REPORT_MAX_BYTES, parseCspReports, scrubUrl } from "./csp-report";

// Security review M3: CSP violations reach our logs, without query strings, and the endpoint is capped and limited.

const legacy = {
  "csp-report": {
    "document-uri": "https://tokenstoscale.example/newsletter/confirm?token=secret-token",
    "blocked-uri": "https://evil.example/x.js?a=1",
    "effective-directive": "script-src-elem",
    disposition: "report",
    "line-number": 3,
  },
};
const modern = [
  {
    type: "csp-violation",
    body: {
      documentURL: "https://tokenstoscale.example/dsa#x",
      blockedURL: "eval",
      effectiveDirective: "script-src",
      sample: "x".repeat(99),
    },
  },
  { type: "deprecation", body: {} },
];

describe("parseCspReports", () => {
  it("reads both report formats into the same fields, without query strings", () => {
    expect(parseCspReports(legacy)).toEqual([
      expect.objectContaining({
        document: "https://tokenstoscale.example/newsletter/confirm",
        blocked: "https://evil.example/x.js",
        directive: "script-src-elem",
        line: 3,
      }),
    ]);
    const [v, ...rest] = parseCspReports(modern);
    expect(rest).toEqual([]);
    expect(v).toMatchObject({
      document: "https://tokenstoscale.example/dsa",
      blocked: "eval",
      directive: "script-src",
    });
    expect(v!.sample).toHaveLength(40);
    expect(parseCspReports({ hello: 1 })).toEqual([]);
    expect(scrubUrl("data:text/html,hi")).toBe("data:");
  });
});

describe("POST /api/csp-report", () => {
  const lines: string[] = [];
  let restore: () => void;
  beforeEach(() => {
    lines.length = 0;
    restore = setLogSink((_l, line) => lines.push(line));
  });
  afterEach(() => restore());

  const post = (body: string, type = "application/csp-report", ip = "203.0.113.20") =>
    POST(
      new Request("https://tokenstoscale.example/api/csp-report", {
        method: "POST",
        body,
        headers: { "content-type": type, "cf-connecting-ip": ip },
      }),
      { params: Promise.resolve({}) }
    );

  it("logs each violation and answers 204", async () => {
    expect((await post(JSON.stringify(legacy))).status).toBe(204);
    expect((await post(JSON.stringify(modern), "application/reports+json")).status).toBe(204);
    const logged = lines.map((l) => JSON.parse(l));
    expect(logged.map((l) => l.msg)).toEqual(["csp_violation", "csp_violation"]);
    expect(lines.join("\n")).not.toContain("secret-token");
  });

  it("refuses other content types, bad JSON, non-reports and bodies over 8 KB", async () => {
    expect((await post(JSON.stringify(legacy), "text/plain")).status).toBe(415);
    expect((await post("{nope")).status).toBe(400);
    expect((await post(JSON.stringify({ a: 1 }))).status).toBe(400);
    const big = JSON.stringify({ "csp-report": { "document-uri": "x".repeat(CSP_REPORT_MAX_BYTES) } });
    expect((await post(big)).status).toBe(413);
  });

  it("is rate-limited per IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await post(JSON.stringify(legacy), undefined, "203.0.113.99")).status);
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
