import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseRegistry, resolveSections } from "../../src/features/sections/registry";
import { APP_ENVS, KINDS_WITH_ROUTES } from "../../src/features/sections/schema";

// Registry contract, static half (plan §5.1): every top-level route folder under src/app belongs to a registry
// entry or to a known system route, and every section of a kind with routes is actually served. The runtime half
// (routes return 200, header entries) is tests/e2e/registry.contract.spec.ts.

const webRoot = path.resolve(__dirname, "../..");
const appDir = path.join(webRoot, "src", "app");
const registryFile = path.join(webRoot, "content", "sections.yaml");
const entries = parseRegistry(fs.readFileSync(registryFile, "utf8"), registryFile);

/** Top-level routes that are not sections. Add one here only for a page that must never be a section. */
const SYSTEM_ROUTES = new Set(["pricing", "contact", "security", "legal", "api", "account", "sign-in", "admin"]);
/** The route group that serves every `docs` section through one dynamic `[section]` segment. */
const DOCS_GROUP = "(content)";

const dirs = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

const topLevel = dirs(appDir);
const docs = entries.filter((s) => s.kind === "docs");

describe("registry contract: route folders", () => {
  it.each(topLevel)("src/app/%s belongs to a section or a system route", (name) => {
    if (name === DOCS_GROUP) return;
    if (SYSTEM_ROUTES.has(name)) return;
    const section = entries.find((s) => s.href === `/${name}`);
    expect(section, `src/app/${name} is neither in content/sections.yaml nor a system route`).toBeDefined();
    // docs sections must go through the shared [section] route, not a folder of their own.
    expect(section!.kind, `src/app/${name}`).not.toBe("docs");
    expect(KINDS_WITH_ROUTES, `src/app/${name} serves a kind without a module`).toContain(section!.kind);
  });

  it("no other route group or dynamic segment sits at the top level", () => {
    const groups = topLevel.filter((n) => n.startsWith("(") || n.startsWith("["));
    expect(groups).toEqual([DOCS_GROUP]);
  });

  it("the docs route group serves sections through one dynamic segment", () => {
    expect(dirs(path.join(appDir, DOCS_GROUP))).toEqual(["[section]"]);
    expect(fs.existsSync(path.join(appDir, DOCS_GROUP, "[section]", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, DOCS_GROUP, "[section]", "[...slug]", "page.tsx"))).toBe(true);
  });
});

describe("registry contract: sections", () => {
  it.each(entries.filter((s) => s.kind !== "docs" && KINDS_WITH_ROUTES.includes(s.kind)).map((s) => [s.key, s]))(
    "%s has its own route folder",
    (_key, s) => {
      expect(fs.existsSync(path.join(appDir, s.href.slice(1), "page.tsx"))).toBe(true);
    }
  );

  it.each(docs.map((s) => s.key))("docs section %s has a content folder and no route folder of its own", (key) => {
    expect(fs.existsSync(path.join(webRoot, "content", key))).toBe(true);
    expect(topLevel).not.toContain(key);
  });

  it.each(entries.filter((s) => !KINDS_WITH_ROUTES.includes(s.kind)).map((s) => s.key))(
    "%s (kind without a module yet) has no route folder",
    (key) => {
      expect(topLevel).not.toContain(key);
    }
  );

  it.each(APP_ENVS)("in %s, no system route shares an href with a section", (env) => {
    for (const s of resolveSections(entries, env)) expect(SYSTEM_ROUTES.has(s.href.slice(1))).toBe(false);
  });
});
