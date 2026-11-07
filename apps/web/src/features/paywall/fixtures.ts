import fs from "node:fs";
import path from "node:path";

// Test-only content (plan §12.2, §12.4), such as the paywall leak suite's premium article whose body carries a
// LEAK-CANARY string. Files under tests/fixtures/content/<section>/ join that docs section in every build
// except production, so production never builds, lists or ships them. Build-time module (relative imports
// only): read by features/docs/source.ts.

export const FIXTURE_CONTENT_DIR = path.join("tests", "fixtures", "content");

function walk(dir: string, base = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => {
      if (e.isDirectory()) return walk(path.join(dir, e.name), `${base}${e.name}/`);
      return e.isFile() && e.name.endsWith(".mdx") ? [`${base}${e.name.slice(0, -4)}`] : [];
    });
}

/** Fixture pages published into `section` for `appEnv` (none in production): slug below the section + file. */
export function fixtureDocsFor(section: string, appEnv: string, root = process.cwd()) {
  if (appEnv === "production") return [];
  const dir = path.join(root, FIXTURE_CONTENT_DIR, section);
  return walk(dir).map((slug) => ({ slug, file: path.join(dir, `${slug}.mdx`) }));
}
