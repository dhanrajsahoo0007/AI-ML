import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { problemIndex, workspaceProps } from "./routes";
import { loadDsaItems, readHiddenTestsForValidation, validProblems } from "./source";

// Hidden tests never reach the browser (plan §15.1): not in the props the problem page hands to its client
// island, not in the problem index, and (when a build exists) not in any client bundle or prerendered page.
// The e2e suite (tests/e2e/dsa.spec.ts) checks the served HTML as well.

const section = sectionOfKind("problems");
const problems = validProblems(loadDsaItems(section));
const webRoot = path.resolve(__dirname, "../../..");
const nextDir = path.join(webRoot, ".next");

/** Text that identifies a hidden case: its name and its arguments as JSON (when long enough to be unique). */
function hiddenNeedles() {
  return problems.flatMap((p) =>
    readHiddenTestsForValidation(section, p).flatMap((tc) => {
      const args = JSON.stringify(tc.args);
      return [...(tc.name ? [tc.name] : []), ...(args.length >= 12 ? [args] : [])].map((needle) => ({ problem: p.slug, needle }));
    })
  );
}

function walk(dir: string, keep: (f: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true }).flatMap((e) => {
    const file = path.join(e.parentPath, e.name);
    return e.isFile() && keep(file) ? [file] : [];
  });
}

describe("hidden tests stay on the build machine", () => {
  const needles = hiddenNeedles();

  it("every problem has hidden cases to look for", () => {
    for (const p of problems) expect(needles.some((n) => n.problem === p.slug), p.slug).toBe(true);
  });

  it("are not in the workspace props or the problem index", () => {
    const shipped = JSON.stringify([...problems.map((p) => workspaceProps(section, p)), problemIndex(section, problems)]);
    expect(needles.filter((n) => shipped.includes(n.needle))).toEqual([]);
    // The props carry the public cases and nothing that points at the hidden file.
    expect(shipped).not.toContain("hidden");
  });

  it("are not in any client bundle or prerendered DSA page", () => {
    const staticFiles = walk(path.join(nextDir, "static"), (f) => f.endsWith(".js"));
    if (staticFiles.length === 0) return; // no build in this checkout; the e2e suite covers served pages
    const pages = walk(path.join(nextDir, "server", "app", section.key), (f) => /\.(html|rsc)$/.test(f));
    const hits: string[] = [];
    for (const file of [...staticFiles, ...pages]) {
      const text = fs.readFileSync(file, "utf8");
      for (const n of needles) if (text.includes(n.needle)) hits.push(`${path.relative(webRoot, file)}: ${n.needle}`);
    }
    expect(hits).toEqual([]);
  });
});
