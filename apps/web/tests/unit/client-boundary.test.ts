import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Regression test for React hydration error #418 (2026-11-07). The root layout (a server component) imported
// THEME_SCRIPT, a plain string, from the "use client" module components/theme.tsx. Across the server/client
// boundary every export of a client module is a *client reference*, so the RSC payload carried
// `"__html":"$10"` → `10:I[…5 layout chunks…,"THEME_SCRIPT"]` instead of the string. The browser could only
// hydrate <head> once those async chunks had loaded; under load they hadn't, <head> suspended outside any
// Suspense boundary, React lost its place in the DOM and threw #418, then re-rendered the whole document on
// the client (dropping the font preload link, which made tests/e2e/fonts-prefetch.spec.ts flaky).
//
// The same failure happens on <main> and <body>: `children`, the footer and the observability island are separate
// RSC rows that can arrive after hydration has started. A host element that suspends during hydration outside a
// Suspense boundary is replayed without restoring React's DOM cursor, so the root layout wraps those slots in
// <Suspense> (React then hydrates them later, from the boundary's own markers).
//
// Rule: a module without "use client" may import only components (PascalCase) from a "use client" module.
// Constants, helpers and config shared by both sides belong in a plain module (e.g. components/theme-script.ts).

const SRC = path.resolve(__dirname, "../../src");
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "generated" ? [] : walk(full);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [full] : [];
  });
}

const isClientModule = (source: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(source);

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTENSIONS) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

/** Value (non-type) names imported by `import {…} from "spec"` / `import X from "spec"`. */
function importedValues(source: string): { spec: string; names: string[] }[] {
  const out: { spec: string; names: string[] }[] = [];
  const re = /import\s+(?!type\b)([^"';]+?)\s+from\s+["']([^"']+)["']/g;
  for (const m of source.matchAll(re)) {
    const clause = m[1];
    const names: string[] = [];
    const named = clause.match(/\{([^}]*)\}/);
    if (named) {
      for (const part of named[1].split(",")) {
        const p = part.trim();
        if (!p || p.startsWith("type ")) continue;
        names.push(p.split(/\s+as\s+/)[0].trim());
      }
    }
    const def = clause
      .replace(/\{[^}]*\}/, "")
      .replace(/,/g, "")
      .trim();
    if (def && !def.startsWith("*")) names.push("default");
    if (names.length) out.push({ spec: m[2], names });
  }
  return out;
}

const isComponentName = (name: string) => name === "default" || /^[A-Z][a-z0-9]+[A-Za-z0-9]*$/.test(name);

describe("server → client module boundary", () => {
  const files = walk(SRC);
  const clientFiles = new Set(files.filter((f) => isClientModule(fs.readFileSync(f, "utf8"))));

  it("finds client modules to check (sanity)", () => {
    expect(clientFiles.size).toBeGreaterThan(10);
  });

  it('server modules import only components from "use client" modules', () => {
    const violations: string[] = [];
    for (const file of files) {
      if (clientFiles.has(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      for (const { spec, names } of importedValues(source)) {
        const target = resolveImport(file, spec);
        if (!target || !clientFiles.has(target)) continue;
        for (const name of names.filter((n) => !isComponentName(n))) {
          violations.push(`${path.relative(SRC, file)} imports \`${name}\` from client module ${spec}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("the root layout inlines the theme script from a plain module", () => {
    const themeScript = path.join(SRC, "components/theme-script.ts");
    expect(isClientModule(fs.readFileSync(themeScript, "utf8"))).toBe(false);
    const layout = fs.readFileSync(path.join(SRC, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/import \{ THEME_SCRIPT \} from "@\/components\/theme-script"/);
  });

  it("the root layout gives late RSC rows a Suspense boundary instead of <main>/<body>", () => {
    const layout = fs.readFileSync(path.join(SRC, "app/layout.tsx"), "utf8");
    expect(layout).toMatch(/<main[^>]*>\s*<Suspense>\{children\}<\/Suspense>\s*<\/main>/);
    expect(layout).toMatch(/<Suspense>\s*<SiteFooter \/>\s*<Observability \/>\s*<\/Suspense>/);
  });
});
