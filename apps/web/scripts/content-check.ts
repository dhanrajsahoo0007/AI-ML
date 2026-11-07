// Content checks (plan §5.4), run before every build (next.config.ts) and in CI:
//
//   node --import ./scripts/ts-hooks.mjs scripts/content-check.ts [--warn-cloud-questions] [--strict]
//
// Validates the section registry against content folders and route folders, every section through
// its kind's validate() (frontmatter schema, icons, nav index ↔ files), the interview question library,
// question mapping for every section with `questions: true`, internal links, and the asset library (plan §5.6:
// IDs exist, alt text, licences, size limits, duplicates, no premium asset on a free page, generated files
// up to date; unused assets and repeated Mermaid fences are warnings). Prints
// `file:line: level: message` and exits 1 when there are errors.
//
// --warn-cloud-questions  report cloud articles with practice questions that are not filed in
//                         content/question-bank/articles.yaml as warnings instead of errors (until the
//                         content owner maps them).
// --strict                treat warnings as errors.

import fs from "node:fs";
import path from "node:path";
import { allSections, CONTENT_DIR, REGISTRY_FILE } from "../src/features/sections/registry";
import { KINDS_WITH_ROUTES, type SectionDef } from "../src/features/sections/schema";
import type { ContentError } from "../src/features/sections/kind";

const args = new Set(process.argv.slice(2));
const WARN_UNMAPPED = new Set(args.has("--warn-cloud-questions") ? ["cloud"] : []);
const STRICT = args.has("--strict");

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "src", "app");
/** content/ folders that hold data rather than a section. */
const DATA_FOLDERS = new Set(["question-bank", "pages", "assets"]);
/** Top-level route folders that are not sections (plan §5.1 registry contract). */
const SYSTEM_ROUTES = new Set([
  "api",
  "pricing",
  "account",
  "sign-in",
  "admin",
  "legal",
  "contact",
  "security",
  "auth",
  "login",
]);

const problems: ContentError[] = [];
const report = (file: string, message: string, level: ContentError["level"] = "error", line?: number) =>
  problems.push({ file: path.isAbsolute(file) ? path.relative(ROOT, file) : file, line, message, level });

function lineIn(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function lineOfKey(file: string, key: string) {
  const i = fs
    .readFileSync(file, "utf8")
    .split("\n")
    .findIndex((l) => l.includes(`key: ${key}`));
  return i === -1 ? undefined : i + 1;
}

// ── Registry ↔ folders ────────────────────────────────────────────────────────────────────────────
function checkRegistry(sections: SectionDef[]) {
  const regFile = path.relative(ROOT, REGISTRY_FILE);
  const keys = new Set(sections.map((s) => s.key));
  const { iconMap } = icons;
  for (const s of sections) {
    const line = lineOfKey(REGISTRY_FILE, s.key);
    if (!(s.icon in iconMap)) report(regFile, `section ${s.key}: unknown icon "${s.icon}"`, "error", line);
    const contentDir = path.join(CONTENT_DIR, s.key);
    const routeDir = path.join(APP_DIR, s.key);
    const hasContent = fs.existsSync(contentDir);
    if (s.kind === "docs") {
      if (!hasContent)
        report(
          regFile,
          `docs section ${s.key} has no content/${s.key}/ folder`,
          s.state === "off" ? "warning" : "error",
          line
        );
      if (fs.existsSync(routeDir))
        report(
          path.relative(ROOT, routeDir),
          `docs sections are served by app/(content)/[section]; remove app/${s.key}`
        );
    } else if (KINDS_WITH_ROUTES.includes(s.kind) && s.state !== "off" && !fs.existsSync(routeDir)) {
      report(regFile, `section ${s.key} (${s.kind}) has no app/${s.key}/ route folder`, "error", line);
    }
    for (const a of s.aggregates ?? []) {
      const target = sections.find((t) => t.key === a);
      if (target && target.kind !== "question-bank" && target.kind !== "problems") {
        report(
          regFile,
          `section ${s.key} aggregates ${a}, whose kind (${target.kind}) has no company tags`,
          "warning",
          line
        );
      }
    }
  }
  for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && !keys.has(entry.name) && !DATA_FOLDERS.has(entry.name)) {
      report(`content/${entry.name}`, "content folder is not a section in content/sections.yaml");
    }
  }
  for (const entry of fs.readdirSync(APP_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("(") || entry.name.startsWith("[")) continue;
    if (!keys.has(entry.name) && !SYSTEM_ROUTES.has(entry.name)) {
      report(`src/app/${entry.name}`, "route folder belongs to no section and is not a known system route");
    }
  }
}

// ── Routes, for link checking ─────────────────────────────────────────────────────────────────────
interface RouteSet {
  /** Path → state of the section it belongs to ("on" for pages outside sections). */
  pages: Map<string, SectionDef["state"]>;
  companies: Set<string>;
  directoryHref?: string;
  redirects: string[];
}

function staticAppRoutes(dir = APP_DIR, prefix = ""): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) {
      if (e.name === "page.tsx") out.push(prefix || "/");
      continue;
    }
    if (e.name.startsWith("[") || e.name === "api") continue;
    const seg = e.name.startsWith("(") ? "" : `/${e.name}`;
    out.push(...staticAppRoutes(path.join(dir, e.name), prefix + seg));
  }
  return out;
}

// ── Main ──────────────────────────────────────────────────────────────────────────────────────────
let icons: { iconMap: Record<string, unknown> };

async function main() {
  let sections: SectionDef[];
  try {
    sections = allSections();
  } catch (e) {
    console.error((e as Error).message);
    process.exit(1);
  }
  icons = await import("../src/lib/icons");
  checkRegistry(sections);

  try {
    await import("../src/config/features");
  } catch (e) {
    report("content/features.yaml", (e as Error).message);
  }

  const { kindOf } = await import("../src/features/sections/kinds");
  const routes: RouteSet = { pages: new Map(), companies: new Set(), redirects: [] };
  for (const r of staticAppRoutes()) routes.pages.set(r, "on");

  // Each section through its kind: validate, and collect its URLs.
  const docsItems: { section: SectionDef; items: import("../src/features/docs/source").DocItem[] }[] = [];
  for (const section of sections) {
    const kind = kindOf(section);
    const items = await kind.load(section);
    for (const p of await kind.validate(section, items)) problems.push(p);
    routes.pages.set(section.href, section.state);
    for (const entry of kind.sitemap(section, items)) routes.pages.set(entry.url, section.state);
    if (section.kind === "docs") docsItems.push({ section, items: items as never });
    if (section.kind === "directory") {
      routes.directoryHref = section.href;
      for (const c of items as { slug: string }[]) routes.companies.add(c.slug);
    }
  }
  // Interview Practice lists only visible categories; link checks need every category and subsection.
  const bank = sections.find((s) => s.kind === "question-bank");
  if (bank) {
    const yaml = (await import("js-yaml")).default;
    const taxonomy = yaml.load(fs.readFileSync(path.join(CONTENT_DIR, "question-bank", "taxonomy.yaml"), "utf8")) as {
      slug: string;
      subsections: { slug: string }[];
    }[];
    for (const c of taxonomy) {
      routes.pages.set(`${bank.href}/${c.slug}`, bank.state);
      for (const s of c.subsections) routes.pages.set(`${bank.href}/${c.slug}/${s.slug}`, bank.state);
    }
  }

  // Question mapping for every section with `questions: true`.
  const { findUnmappedQuestionArticles } = await import("../src/lib/question-bank");
  const unmapped = findUnmappedQuestionArticles();
  for (const u of unmapped) {
    report(
      u.file,
      `has <InterviewQuestion> blocks but no entry in content/question-bank/articles.yaml (${u.href})`,
      WARN_UNMAPPED.has(u.section) ? "warning" : "error",
      1
    );
  }

  // Internal links in every docs page.
  const LINK_RE = /\]\((\/[^)\s]*)\)|href=["'](\/[^"']*)["']|href=\{["'](\/[^"']*)["']\}/g;
  const GUARD_RE = /<CloudOnly>[\s\S]*?<\/CloudOnly>/g;
  for (const { section, items } of docsItems) {
    for (const item of items) {
      const text = fs.readFileSync(item.file, "utf8");
      const guarded = [...text.matchAll(GUARD_RE)].map((m) => [m.index!, m.index! + m[0].length]);
      for (const m of text.matchAll(LINK_RE)) {
        const raw = m[1] ?? m[2] ?? m[3];
        const line = lineIn(text, m.index!);
        const [pathAndQuery] = raw.split("#");
        const [pathname, query] = pathAndQuery.split("?");
        const target = pathname.replace(/\/$/, "") || "/";
        if (target.startsWith("/_next") || /\.[a-z0-9]+$/i.test(target)) continue; // assets
        if (routes.directoryHref && target === routes.directoryHref && query?.startsWith("company=")) {
          const slug = query.slice("company=".length);
          if (!routes.companies.has(slug)) report(item.file, `link to unknown company ${slug}`, "error", line);
          continue;
        }
        const state = routes.pages.get(target);
        if (state === undefined) {
          report(item.file, `broken internal link ${raw}`, "error", line);
        } else if (state !== "on" && section.state === "on") {
          const isGuarded = guarded.some(([a, b]) => m.index! >= a && m.index! < b);
          if (!isGuarded) {
            report(
              item.file,
              `links to ${raw}, which is ${state} in this environment (${process.env.APP_ENV ?? "default"})`,
              "warning",
              line
            );
          }
        }
      }
    }
  }

  // Asset library (plan §5.6), with the same rules scripts/build-assets.ts enforces before the build.
  const assetsLib = await import("./build-assets.lib");
  const assetIndex = assetsLib.indexAssets(path.join(ROOT, "assets"), ROOT);
  const assetRefs = assetsLib.scanUsage(CONTENT_DIR, await assetsLib.contentPages(CONTENT_DIR), ROOT);
  problems.push(...assetsLib.checkAssets(assetIndex, assetRefs));
  problems.push(...assetsLib.duplicateMermaidFences(CONTENT_DIR, ROOT));
  for (const g of assetsLib.generatedModules(assetIndex, ROOT)) {
    const current = fs.existsSync(path.join(ROOT, g.file)) ? fs.readFileSync(path.join(ROOT, g.file), "utf8") : "";
    if (current !== g.content) report(g.file, "generated from assets/ but out of date; run `npm run assets`");
  }

  // Print.
  const order = (p: ContentError) => `${p.level === "error" ? 0 : 1}${p.file}${String(p.line ?? 0).padStart(6, "0")}`;
  problems.sort((a, b) => order(a).localeCompare(order(b)));
  for (const p of problems) {
    const level = STRICT && p.level === "warning" ? "error" : p.level;
    console.log(`${p.file}${p.line ? `:${p.line}` : ""}: ${level}: ${p.message}`);
  }
  const errors = problems.filter((p) => p.level === "error" || STRICT).length;
  const warnings = problems.length - errors;
  console.log(`content-check: ${errors} error(s), ${warnings} warning(s) across ${sections.length} sections`);
  if (errors > 0) process.exit(1);
}

await main();
