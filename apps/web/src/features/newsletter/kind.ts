import fs from "node:fs";
import path from "node:path";
import { navSection, type ContentError, type NavGroup, type SectionKind } from "../sections/kind";
import { SUBSCRIBE_KIND as NEWSLETTER_KIND } from "../sections/public";
import { allSections } from "../sections/registry";
import type { SectionDef } from "../sections";
import { loadDocItems } from "../docs/source";
import { findComponents, findImages, findLinks, internalPath, isPng } from "./links";
import { issueFrontmatterSchema, SUMMARY_MAX } from "./schema";
import { isBuilt, isPublished, isValidSlug, loadIssues, type Issue } from "./source";

// The newsletter kind (plan §15.2): issues in content/<section>/<yyyy>/<slug>.mdx, served by app/<section>/**.
// Sent issues are public (archive, sitemap, search, RSS); drafts and scheduled issues get a noindex review page
// outside production only. Search and RSS carry summaries, never the body (plan §11.10).

export { NEWSLETTER_KIND };

function lineOf(file: string, needle: RegExp): number | undefined {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const i = lines.findIndex((l) => needle.test(l));
  return i === -1 ? undefined : i + 1;
}

/** Line in the file of a 1-based line in the body (the body starts after the frontmatter). */
function fileLine(issue: Issue, bodyLine: number) {
  const text = fs.readFileSync(issue.file, "utf8");
  const offset = text.split("\n").length - issue.body.split("\n").length;
  return offset + bodyLine;
}

function staticAppRoutes(dir: string, prefix = ""): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory()) return e.name === "page.tsx" ? [prefix || "/"] : [];
    if (e.name.startsWith("[") || e.name === "api") return [];
    const seg = e.name.startsWith("(") ? "" : `/${e.name}`;
    return staticAppRoutes(path.join(dir, e.name), prefix + seg);
  });
}

/** Every site path an issue may link to, with the state of the section it belongs to. */
function knownPaths(section: SectionDef, items: Issue[]) {
  const paths = new Map<string, SectionDef["state"]>();
  for (const r of staticAppRoutes(path.join(process.cwd(), "src", "app"))) paths.set(r, "on");
  for (const s of allSections()) {
    paths.set(s.href, s.state);
    if (s.kind === "docs") for (const d of loadDocItems(s)) paths.set(d.href, s.state);
  }
  for (const i of items) paths.set(i.href, isPublished(i) ? section.state : "hidden");
  return paths;
}

export const newsletterKind: SectionKind<Issue> = {
  kind: NEWSLETTER_KIND,

  async load(section) {
    return loadIssues(section);
  },

  staticParams(_section, items) {
    return items.filter((i) => isBuilt(i)).map((i) => ({ slug: i.slug }));
  },

  // One group per year, newest first.
  nav(section, items) {
    const groups: NavGroup[] = [];
    for (const issue of items.filter((i) => isBuilt(i))) {
      let group = groups.find((g) => g.slug === issue.year);
      if (!group) {
        group = { slug: issue.year, title: issue.year, href: section.href, items: [] };
        groups.push(group);
      }
      group.items!.push({
        slug: issue.slug,
        title: issue.title,
        href: issue.href,
        status: isPublished(issue) ? "published" : "draft",
      });
    }
    return navSection(section, groups);
  },

  sitemap(section, items) {
    return [{ url: section.href }, ...items.filter(isPublished).map((i) => ({ url: i.href, lastModified: i.date }))];
  },

  search(section, items) {
    return items
      .filter(isPublished)
      .map((i) => ({ href: i.href, title: i.title, description: i.summary, section: section.key }));
  },

  access(section, item) {
    if (item.data.access === "free" || item.data.access === "premium") return item.data.access;
    return section.access?.default ?? "free";
  },

  counts(items) {
    const sent = items.filter(isPublished).length;
    return { written: sent, outline: items.length - sent };
  },

  validate(section, items) {
    const errors: ContentError[] = [];
    const rel = (file: string) => path.relative(process.cwd(), file);
    const push = (issue: Issue, message: string, line?: number, level: ContentError["level"] = "error") =>
      errors.push({ file: rel(issue.file), line, message, level });
    const now = Date.now();
    const paths = knownPaths(section, items);
    const slugs = new Map<string, Issue>();

    for (const issue of items) {
      if (!isValidSlug(issue.slug)) push(issue, `file name "${issue.slug}" must be lowercase kebab-case`, 1);
      const first = slugs.get(issue.slug);
      if (first) push(issue, `slug ${issue.slug} is also used by ${rel(first.file)}; slugs are unique across years`, 1);
      slugs.set(issue.slug, issue);
      if (!/^\d{4}$/.test(issue.year)) push(issue, `issues live in a <yyyy> folder, not "${issue.year}"`, 1);

      const result = issueFrontmatterSchema.safeParse(issue.data);
      if (!result.success) {
        for (const i of result.error.issues) {
          const key = String(i.path[0] ?? "");
          const message =
            i.code === "unrecognized_keys"
              ? `frontmatter: ${i.message}`
              : `frontmatter ${i.path.join(".")}: ${i.message}`;
          push(issue, message, key ? lineOf(issue.file, new RegExp(`^${key}:`)) : 1);
        }
        continue;
      }
      const fm = result.data;
      const sendAtLine = lineOf(issue.file, /^sendAt:/);
      if (fm.date.slice(0, 4) !== issue.year) {
        push(issue, `date ${fm.date} is not in the ${issue.year} folder`, lineOf(issue.file, /^date:/));
      }
      if (fm.status === "scheduled" && fm.sendAt && fm.sendAt.getTime() <= now) {
        push(
          issue,
          `scheduled for ${fm.sendAt.toISOString()}, which has passed: send it and set status: sent, or move sendAt`,
          sendAtLine
        );
      }
      if (fm.status === "sent" && fm.sendAt && fm.sendAt.getTime() > now) {
        push(issue, `status is sent but sendAt ${fm.sendAt.toISOString()} is in the future`, sendAtLine);
      }
      if (fm.summary.length > SUMMARY_MAX) {
        push(
          issue,
          `summary is ${fm.summary.length} characters (max ${SUMMARY_MAX})`,
          lineOf(issue.file, /^summary:/),
          "warning"
        );
      }
      if (fm.audience === "pro" && fm.access === "free") {
        push(
          issue,
          "audience is pro but access is free: the web version would be public",
          lineOf(issue.file, /^audience:/),
          "warning"
        );
      }

      // Body: plain Markdown (renders to the web page and to email), links that resolve, PNG images only.
      for (const c of findComponents(issue.body)) {
        push(
          issue,
          `<${c.url}> is not allowed in an issue: issues are Markdown so they render to email too`,
          fileLine(issue, c.line)
        );
      }
      for (const img of findImages(issue.body)) {
        if (!isPng(img.url)) push(issue, `image ${img.url} must be a PNG (email clients)`, fileLine(issue, img.line));
      }
      for (const link of findLinks(issue.body)) {
        const line = fileLine(issue, link.line);
        if (link.url.startsWith("http://")) {
          push(issue, `link ${link.url} must use https`, line);
          continue;
        }
        const target = internalPath(link.url);
        if (target === null) continue;
        const state = paths.get(target);
        if (state === undefined) push(issue, `broken internal link ${link.url}`, line);
        else if (state !== "on" && isPublished(issue)) {
          push(issue, `links to ${link.url}, which is ${state} in this environment`, line, "warning");
        }
      }
    }
    return errors;
  },
};
