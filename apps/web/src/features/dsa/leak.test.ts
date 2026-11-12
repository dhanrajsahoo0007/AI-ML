import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sectionOfKind } from "../sections/registry";
import { problemsKind } from "./kind";
import { problemIndex, workspaceProps } from "./routes";
import { HIDDEN_NAME_SENTINEL } from "./schema";
import {
  loadDsaItems,
  readHiddenTestsForValidation,
  readReferenceSolutionForValidation,
  splitProblemBody,
  validProblems,
  type ValidProblem,
} from "./source";

// Hidden tests and reference solutions never reach the browser (plan §15.1), and neither does a premium
// editorial: not in the props the problem page hands to its client island, not in the problem index, and (when
// a build exists) not in any client bundle or prerendered page. The e2e suite (tests/e2e/dsa.spec.ts) checks
// the served HTML as well.
//
// It scales to hundreds of problems: a hidden case's arguments are looked for only in its own problem's props
// and page (different problems legitimately share small inputs), and hidden case names, which all start with
// `hidden/<slug>/NN `, are found by one pattern scan over every shipped file.

const section = sectionOfKind("problems");
const problems = validProblems(loadDsaItems(section));
const webRoot = path.resolve(__dirname, "../../..");
const nextDir = path.join(webRoot, ".next");
const pagesDir = path.join(nextDir, "server", "app", section.key);

/** A problem's hidden cases as text to look for: each name, and its arguments as JSON when long enough to be telling. */
function hiddenNeedles(p: ValidProblem): string[] {
  return readHiddenTestsForValidation(section, p).flatMap((tc) => {
    const args = JSON.stringify(tc.args);
    return [...(tc.name ? [tc.name] : []), ...(args.length >= 12 ? [args] : [])];
  });
}

/** Code and prose lines made only of characters that HTML and RSC escaping (and, for prose, Markdown) leave as is. */
const CODE_LINE = /^[\w\s.,:;()[\]=+\-*/%]+$/;
const PROSE_LINE = /^[A-Za-z0-9 .,:;()-]+$/;

/** The longest line of `source` of that kind, at least 20 characters, that is not in `except`. */
function distinctiveLine(source: string, plain: RegExp, except = ""): string | undefined {
  return source
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 20 && plain.test(l) && !except.includes(l))
    .sort((a, b) => b.length - a.length)[0];
}

function walk(dir: string, keep: (f: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true, recursive: true }).flatMap((e) => {
    const file = path.join(e.parentPath, e.name);
    return e.isFile() && keep(file) ? [file] : [];
  });
}

const builtPages = walk(pagesDir, (f) => /\.(html|rsc)$/.test(f));
const bundles = walk(path.join(nextDir, "static"), (f) => f.endsWith(".js"));
const rel = (file: string) => path.relative(webRoot, file);

/** The prerendered HTML and RSC files of one problem page (none when this build has no DSA pages). */
function pageFiles(p: ValidProblem): string[] {
  const own = new RegExp(`^problems/${p.slug}\\.(?:html$|rsc$|segments/)`);
  return builtPages.filter((f) => own.test(path.relative(pagesDir, f).split(path.sep).join("/")));
}

describe("hidden tests stay on the build machine", () => {
  it("every problem has hidden cases to look for", () => {
    for (const p of problems) expect(hiddenNeedles(p).length, p.slug).toBeGreaterThan(0);
  });

  it("are not in a problem's own workspace props", () => {
    const hits = problems.flatMap((p) => {
      const shipped = JSON.stringify(workspaceProps(section, p));
      return hiddenNeedles(p)
        .filter((n) => shipped.includes(n))
        .map((n) => `${p.slug}: ${n}`);
    });
    expect(hits).toEqual([]);
  });

  it("are not named, or pointed at, in the props or the problem index", () => {
    const shipped = JSON.stringify([
      ...problems.map((p) => workspaceProps(section, p)),
      problemIndex(section, problems),
    ]);
    expect(shipped).not.toMatch(HIDDEN_NAME_SENTINEL);
    expect(shipped).not.toContain(".hidden.json");
  });

  it("are not in any client bundle or prerendered DSA page", () => {
    if (bundles.length === 0) return; // no build in this checkout; the e2e suite covers served pages
    const hits: string[] = [];
    for (const file of [...bundles, ...builtPages]) {
      const text = fs.readFileSync(file, "utf8");
      const m = HIDDEN_NAME_SENTINEL.exec(text);
      if (m) hits.push(`${rel(file)}: ${text.slice(m.index, m.index + 60)}`);
      if (text.includes(".hidden.json")) hits.push(`${rel(file)}: .hidden.json`);
    }
    for (const p of problems) {
      const needles = hiddenNeedles(p);
      for (const file of pageFiles(p)) {
        const text = fs.readFileSync(file, "utf8");
        for (const n of needles) if (text.includes(n)) hits.push(`${rel(file)}: ${n}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("premium problems keep their solution and editorial out of the page", () => {
  const premium = problems.filter((p) => problemsKind.access(section, p) === "premium");

  it("reference solutions and editorials are not in any client bundle", () => {
    const lines = premium.flatMap((p) => {
      const ref = readReferenceSolutionForValidation(section, p.slug);
      return [ref && distinctiveLine(ref, CODE_LINE, p.fm.starter.python), editorialLine(p)].filter(
        (l): l is string => !!l
      );
    });
    const hits: string[] = [];
    for (const file of bundles) {
      const text = fs.readFileSync(file, "utf8");
      for (const l of lines) if (text.includes(l)) hits.push(`${rel(file)}: ${l}`);
    }
    expect(hits).toEqual([]);
  });

  it("a distinctive line of the reference solution and of the editorial is absent from the prerendered page", () => {
    const hits: string[] = [];
    for (const p of premium) {
      const ref = readReferenceSolutionForValidation(section, p.slug);
      const lines = [ref && distinctiveLine(ref, CODE_LINE, p.fm.starter.python), editorialLine(p)].filter(
        (l): l is string => !!l
      );
      if (lines.length === 0) hits.push(`${p.slug}: no plain line in its reference or editorial to look for`);
      for (const file of pageFiles(p)) {
        const text = fs.readFileSync(file, "utf8");
        for (const l of lines) if (text.includes(l)) hits.push(`${rel(file)}: ${l}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

/** A line of the editorial's prose that only the editorial has (not the statement). */
function editorialLine(p: ValidProblem): string | undefined {
  const { statement, editorial } = splitProblemBody(fs.readFileSync(p.file, "utf8"));
  return editorial ? distinctiveLine(editorial, PROSE_LINE, statement) : undefined;
}

describe("only build-time readers touch hidden tests and reference solutions", () => {
  const readers = /readHiddenTestsForValidation|readReferenceSolutionForValidation|\.hidden\.json|solutions\//;
  const srcDir = path.join(webRoot, "src");
  const pageOrClient = [
    ...walk(path.join(srcDir, "app"), (f) => /\.(ts|tsx)$/.test(f)),
    ...walk(srcDir, (f) => /\.client\.(ts|tsx)$/.test(f) || /\.worker\.ts$/.test(f)),
    ...["routes.ts", "mdx.tsx", "index.ts", "components.tsx", "problem-index.ts", "seo.ts"].map((f) =>
      path.join(__dirname, f)
    ),
  ];

  it("no page, client island, worker or page helper reads them", () => {
    const offenders = pageOrClient.filter((f) => readers.test(fs.readFileSync(f, "utf8"))).map(rel);
    expect(offenders).toEqual([]);
  });
});

// Outline notes (the owner's approach and solution) follow the editorial rule: only the local review compiles
// them. The page marks them with data-dsa-outline-notes, so no built page may carry that attribute.
describe("outline notes stay out of built pages", () => {
  it("no prerendered DSA page contains outline notes", () => {
    const pages = walk(pagesDir, (f) => /\.(html|rsc)$/.test(f));
    if (pages.length === 0) return; // no build in this checkout
    expect(pages.filter((f) => fs.readFileSync(f, "utf8").includes("data-dsa-outline-notes"))).toEqual([]);
  });
});

// Submit runs the hidden cases in the browser, so they are served, but from one place only: the judge route
// (features/dsa/judge.ts and app/<section>/problems/[slug]/judge/route.ts). Nothing else may reach them.
describe("the judge route is the only way hidden cases are served", () => {
  const srcDir = path.join(webRoot, "src");
  const sources = walk(srcDir, (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f));
  const text = (f: string) => fs.readFileSync(f, "utf8");

  it("only the judge route imports the judge module", () => {
    const importers = sources.filter((f) => /from "(@\/features\/dsa|\.)\/judge"/.test(text(f))).map(rel);
    expect(importers).toEqual(["src/app/dsa/problems/[slug]/judge/route.ts"]);
  });

  it("only the judge module uses the judge's reader", () => {
    const users = sources.filter((f) => text(f).includes("readHiddenTestsForJudge")).map(rel);
    expect(users.sort()).toEqual(["src/features/dsa/judge.ts", "src/features/dsa/source.ts"]);
  });

  it("the built judge files carry no case names", () => {
    const bodies = walk(pagesDir, (f) => /[\\/]judge\.body$/.test(f));
    expect(bodies.filter((f) => HIDDEN_NAME_SENTINEL.test(text(f))).map(rel)).toEqual([]);
  });
});
