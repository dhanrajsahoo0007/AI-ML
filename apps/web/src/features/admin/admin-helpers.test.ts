import { describe, expect, it } from "vitest";
import type { AssetEntry } from "@/lib/asset-schema";
import type { RequestSessionInfo } from "@/server/http";
import { adminGate, reauthUrl } from "./access";
import { assetSnippet, filterAssets, parseAssetQuery, tagCounts } from "./asset-filter";
import { formatAge, formatPercent, formatUsdMinor, NO_DATA, sparklinePoints } from "./format";

// Access gate, asset browser search and formatting for /admin.

const NOW = Date.UTC(2026, 10, 7, 12);
const MIN = 60_000;

function session(role: "user" | "admin", ageMinutes: number): RequestSessionInfo {
  return {
    user: { id: "u1", name: "A", email: "a@users.tokenstoscale.test", image: null, role },
    session: { id: "s1", userId: "u1", createdAt: new Date(NOW - ageMinutes * MIN), expiresAt: new Date(NOW + 1e9) },
  };
}

describe("adminGate", () => {
  it("404s anyone who is not an admin, fresh or not", () => {
    expect(adminGate(null, NOW)).toBe("not_found");
    expect(adminGate(session("user", 1), NOW)).toBe("not_found");
    expect(adminGate(session("user", 60), NOW)).toBe("not_found");
  });

  it("lets an admin in within 10 minutes of signing in, then asks to sign in again", () => {
    expect(adminGate(session("admin", 0), NOW)).toBe("ok");
    expect(adminGate(session("admin", 10), NOW)).toBe("ok");
    expect(adminGate(session("admin", 11), NOW)).toBe("reauth");
  });

  it("sends re-auth back to the same admin page", () => {
    expect(reauthUrl("/admin/webhooks")).toBe("/sign-in?reauth=1&callbackURL=%2Fadmin%2Fwebhooks");
  });
});

function asset(over: Partial<AssetEntry> & Pick<AssetEntry, "id" | "type">): AssetEntry {
  return {
    group: over.id.split("/")[0]!,
    file: `assets/${over.id}.svg`,
    ext: "svg",
    bytes: 1000,
    sha256: "0".repeat(64),
    hash: "abc",
    tags: [],
    access: "free",
    source: "original",
    variants: [],
    usedBy: [],
    public: false,
    ...over,
  };
}

describe("asset browser", () => {
  const assets = [
    asset({
      id: "diagrams/mermaid/caching/cdn",
      type: "mermaid",
      tags: ["caching"],
      usedBy: ["/x"],
      title: "CDN edge",
    }),
    asset({ id: "logos/tech/aws/lambda", type: "tech-icon", tags: ["aws", "serverless"], usedBy: ["/y"] }),
    asset({ id: "images/old-photo", type: "image", tags: ["caching"], alt: "Rack of servers" }),
    asset({ id: "downloads/cheatsheet", type: "download" }),
  ];

  it("parses the GET form and ignores junk", () => {
    expect(parseAssetQuery({ q: "  CDN ", type: "mermaid", tag: "Caching", unused: "1" })).toEqual({
      q: "cdn",
      type: "mermaid",
      tag: "caching",
      unused: true,
    });
    expect(parseAssetQuery({ type: "evil", tag: "<script>", q: ["a", "b"] })).toEqual({
      q: "a",
      type: null,
      tag: null,
      unused: false,
    });
  });

  it("searches id, title, alt and tags; filters by type, tag and unused", () => {
    const ids = (p: Record<string, string>) => filterAssets(assets, parseAssetQuery(p)).map((a) => a.id);
    expect(ids({ q: "cdn" })).toEqual(["diagrams/mermaid/caching/cdn"]);
    expect(ids({ q: "servers rack" })).toEqual(["images/old-photo"]);
    expect(ids({ tag: "caching" })).toEqual(["diagrams/mermaid/caching/cdn", "images/old-photo"]);
    expect(ids({ type: "tech-icon" })).toEqual(["logos/tech/aws/lambda"]);
    expect(ids({ unused: "1" })).toEqual(["downloads/cheatsheet", "images/old-photo"]);
    expect(ids({})).toHaveLength(4);
  });

  it("counts tags, most used first", () => {
    expect(tagCounts(assets)).toEqual([
      { tag: "caching", count: 2 },
      { tag: "aws", count: 1 },
      { tag: "serverless", count: 1 },
    ]);
  });

  it("gives the MDX snippet that references the asset by ID", () => {
    expect(assetSnippet(assets[0]!)).toBe('<Mermaid ref="diagrams/mermaid/caching/cdn" />');
    expect(assetSnippet(assets[1]!)).toBe('<TechIcon id="logos/tech/aws/lambda" />');
    expect(assetSnippet(assets[2]!)).toBe('<Img id="images/old-photo" />');
    expect(assetSnippet(assets[3]!)).toBe('<Download id="downloads/cheatsheet" />');
    expect(assetSnippet({ id: "diagrams/excalidraw/a/b", type: "excalidraw" })).toBe(
      '<Diagram id="diagrams/excalidraw/a/b" />'
    );
  });
});

describe("format", () => {
  it("formats money, rates and ages", () => {
    expect(formatUsdMinor(213740)).toBe("$2,137.40");
    expect(formatUsdMinor(0)).toBe("$0.00");
    expect(formatPercent(0.0521)).toBe("5.2%");
    expect(formatPercent(0.0075, 2)).toBe("0.75%");
    expect(formatPercent(null)).toBe(NO_DATA);
    expect(formatAge(new Date(NOW - 90 * MIN), NOW)).toBe("2 h ago");
    expect(formatAge(null, NOW)).toBe("never");
  });

  it("draws sparklines inside the box", () => {
    expect(sparklinePoints([], 100, 20)).toBe("");
    expect(sparklinePoints([0, 10], 100, 20)).toBe("2,18 98,2");
    // The scale includes 0: no revenue lies on the baseline, flat revenue along the top.
    expect(sparklinePoints([0, 0, 0], 100, 20)).toBe("2,18 50,18 98,18");
    expect(sparklinePoints([5, 5, 5], 100, 20)).toBe("2,2 50,2 98,2");
  });
});
