import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/vitals/route";
import { setLogSink } from "@/server/log";
import { vitalsPayload } from "./vitals-schema";
import { routeOf, sectionOf } from "./route-info";

const valid = {
  route: "/legal/terms",
  section: "legal",
  metrics: [
    { name: "LCP", value: 1234, rating: "good", navigation_type: "navigate" },
    { name: "CLS", value: 0.0123, rating: "good" },
    { name: "INP", value: 88, rating: "good" },
    { name: "TTFB", value: 95, rating: "good" },
  ],
};

describe("vitalsPayload", () => {
  it("accepts a beacon from vitals.client.ts", () => {
    expect(vitalsPayload.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["an unknown metric", { ...valid, metrics: [{ name: "FID", value: 1, rating: "good" }] }],
    ["a negative value", { ...valid, metrics: [{ name: "LCP", value: -1, rating: "good" }] }],
    ["a non-finite value", { ...valid, metrics: [{ name: "LCP", value: Infinity, rating: "good" }] }],
    ["an unknown rating", { ...valid, metrics: [{ name: "LCP", value: 1, rating: "great" }] }],
    ["no metrics", { ...valid, metrics: [] }],
    ["a metric twice", { ...valid, metrics: [valid.metrics[0], valid.metrics[0]] }],
    ["a query string in the route", { ...valid, route: "/pricing?email=a@b.co" }],
    ["a relative route", { ...valid, route: "pricing" }],
    ["an odd section", { ...valid, section: "Pricing Page" }],
    ["extra fields", { ...valid, user: "u_1" }],
    ["extra metric fields", { ...valid, metrics: [{ ...valid.metrics[0], entries: [] }] }],
  ])("rejects %s", (_name, body) => {
    expect(vitalsPayload.safeParse(body).success).toBe(false);
  });
});

describe("route labels", () => {
  it("keeps only the path and names the section after the first segment", () => {
    expect(routeOf("/pricing?ref=x#top")).toBe("/pricing");
    expect(sectionOf("/")).toBe("home");
    expect(sectionOf("/legal/terms/v2")).toBe("legal");
    expect(sectionOf("/%E2%9C%93")).toBe("other");
    expect(vitalsPayload.safeParse({ ...valid, route: routeOf("/x?y"), section: sectionOf("/x") }).success).toBe(true);
  });
});

describe("POST /api/vitals", () => {
  const lines: string[] = [];
  let restore: () => void;
  beforeEach(() => {
    lines.length = 0;
    restore = setLogSink((_level, line) => lines.push(line));
  });
  afterEach(() => restore());

  const post = (body: string, headers: Record<string, string> = {}) =>
    POST(new Request("http://localhost/api/vitals", { method: "POST", body, headers }));

  it("answers 204 and logs one line with the metrics", async () => {
    const res = await post(JSON.stringify(valid), { "cf-ray": "8f1c2a3b4d5e6f70-BOM" });
    expect(res.status).toBe(204);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: "info",
      msg: "web_vitals",
      request_id: "8f1c2a3b4d5e6f70-BOM",
      colo: "BOM",
      route: "/api/vitals",
      status: 204,
      page_route: valid.route,
      section: "legal",
      metrics: { LCP: { value: 1234, rating: "good" }, CLS: { value: 0.0123, rating: "good" } },
    });
  });

  it("answers 400 to bad JSON and to bodies that fail the schema", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post(JSON.stringify({ ...valid, metrics: [] }))).status).toBe(400);
    expect(JSON.parse(lines.at(-1)!)).toMatchObject({ level: "warn", msg: "web_vitals_rejected", status: 400 });
  });

  it("answers 413 to oversized bodies", async () => {
    expect((await post(JSON.stringify({ ...valid, pad: "x".repeat(5000) }))).status).toBe(413);
  });
});
