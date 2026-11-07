import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRegistry } from "@/features/sections/registry";
import {
  decideGate,
  matchPrefix,
  needsAdmin,
  normalizePath,
  parseKillList,
  sectionManifestSchema,
  type SectionManifest,
} from "./sections-gate";

const manifest: SectionManifest = { env: "production", hidden: ["/cloud"], off: ["/dsa", "/newsletter"] };
const gate = (pathname: string, opts: { killed?: string[]; isAdmin?: boolean } = {}) =>
  decideGate({ pathname, manifest, killed: opts.killed ?? [], isAdmin: opts.isAdmin ?? false });

describe("decideGate", () => {
  it("passes ordinary content", () => {
    expect(gate("/")).toEqual({ action: "pass", gated: false });
    expect(gate("/system-design/fundamentals")).toEqual({ action: "pass", gated: false });
  });

  it("404s hidden sections for everyone but admins", () => {
    expect(gate("/cloud")).toEqual({ action: "not-found" });
    expect(gate("/cloud/aws/compute")).toEqual({ action: "not-found" });
    expect(gate("/cloud", { isAdmin: true })).toEqual({ action: "pass", gated: true });
    expect(gate("/cloud/aws/compute", { isAdmin: true })).toEqual({ action: "pass", gated: true });
  });

  it("does not treat a path that merely starts with the same letters as the section", () => {
    expect(gate("/cloudflare-notes")).toEqual({ action: "pass", gated: false });
  });

  it("404s off sections, even for admins", () => {
    expect(gate("/dsa")).toEqual({ action: "not-found" });
    expect(gate("/newsletter/issue-1", { isAdmin: true })).toEqual({ action: "not-found" });
  });

  it("serves maintenance for killed sections, before any other rule and for admins too", () => {
    const killed = parseKillList("system-design, cloud");
    expect(gate("/system-design/fundamentals", { killed })).toEqual({
      action: "maintenance",
      prefix: "/system-design",
    });
    expect(gate("/cloud", { killed, isAdmin: true })).toEqual({ action: "maintenance", prefix: "/cloud" });
    expect(gate("/ai-system-design", { killed })).toEqual({ action: "pass", gated: false });
  });

  it("can't be bypassed with case, encoding, slashes or a trailing slash", () => {
    for (const p of ["/Cloud", "/CLOUD/aws", "/%63loud", "//cloud", "/cloud/", "/cloud//aws"]) {
      expect(gate(p), p).toEqual({ action: "not-found" });
    }
  });
});

describe("needsAdmin", () => {
  it("is true only under hidden sections (the cookie is verified only there)", () => {
    expect(needsAdmin("/cloud/aws", manifest)).toBe(true);
    expect(needsAdmin("/system-design", manifest)).toBe(false);
    expect(needsAdmin("/dsa", manifest)).toBe(false);
  });
});

describe("parseKillList", () => {
  it("parses comma-separated keys and ignores junk", () => {
    expect(parseKillList(undefined)).toEqual([]);
    expect(parseKillList("")).toEqual([]);
    expect(parseKillList(" DSA ,newsletter,, ../etc ,a b")).toEqual(["/dsa", "/newsletter"]);
  });
});

describe("matchPrefix / normalizePath", () => {
  it("matches the section root and its children only", () => {
    expect(matchPrefix("/cloud", ["/cloud"])).toBe("/cloud");
    expect(matchPrefix("/cloud/x", ["/cloud"])).toBe("/cloud");
    expect(matchPrefix("/clouds", ["/cloud"])).toBeUndefined();
  });

  it("keeps malformed escapes instead of throwing", () => {
    expect(normalizePath("/%E0%A4%A")).toBe("/%e0%a4%a");
    expect(normalizePath("/")).toBe("/");
  });
});

describe("contract with the section registry", () => {
  const entries = parseRegistry(fs.readFileSync(path.join(__dirname, "../../../content/sections.yaml"), "utf8"));

  // SECTIONS_KILL takes section keys and the gate turns each into `/<key>`.
  it("every section lives at /<key>", () => {
    for (const s of entries) expect(s.href, s.key).toBe(`/${s.key}`);
  });

  it("the manifest shape matches what next.config.ts writes", () => {
    const hidden = entries.filter((s) => s.release.production === "hidden").map((s) => s.href);
    const off = entries.filter((s) => s.release.production === "off").map((s) => s.href);
    expect(sectionManifestSchema.parse({ env: "production", hidden, off })).toEqual({ env: "production", hidden, off });
  });
});
