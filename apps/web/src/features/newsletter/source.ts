import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CONTENT_DIR, resolveAppEnv } from "../sections/registry";
import type { SectionDef } from "../sections";
import { issueFrontmatterSchema, type IssueAudience, type IssueStatus } from "./schema";

// Reads newsletter issues from content/<section>/<yyyy>/<slug>.mdx. Build time only (fs), and no JSX
// imports, so content-check and the send script can load it with plain Node.

export interface Issue {
  slug: string;
  /** The <yyyy> folder the file sits in. */
  year: string;
  href: string;
  /** Absolute path of the MDX file. */
  file: string;
  /** Raw frontmatter, validated by the kind's validate(). */
  data: Record<string, unknown>;
  /** MDX body without the frontmatter. */
  body: string;
  title: string;
  /** YYYY-MM-DD. */
  date: string;
  summary: string;
  access: "free" | "premium";
  status: IssueStatus;
  sendAt?: Date;
  audience: IssueAudience;
}

function issuesDir(section: Pick<SectionDef, "key">) {
  return path.join(CONTENT_DIR, section.key);
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Reads one issue file; `year` is the folder it sits in. */
export function readIssueFile(section: Pick<SectionDef, "href">, file: string, year: string): Issue {
  const slug = path.basename(file, ".mdx");
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const parsed = issueFrontmatterSchema.safeParse(data);
  // Invalid frontmatter is reported by validate(); load still returns the issue (as a draft) so the check can
  // name the file instead of crashing.
  const fm = parsed.success ? parsed.data : undefined;
  const str = (v: unknown, fallback: string) => (typeof v === "string" && v ? v : fallback);
  return {
    slug,
    year,
    href: `${section.href}/${slug}`,
    file,
    data,
    body: content,
    title: fm?.title ?? str(data.title, slug),
    date: fm?.date ?? `${year}-01-01`,
    summary: fm?.summary ?? str(data.summary, ""),
    access: fm?.access ?? "premium",
    status: fm?.status ?? "draft",
    sendAt: fm?.sendAt,
    audience: fm?.audience ?? "all",
  };
}

const cache = new Map<string, Issue[]>();

/** Every issue of the section, newest first. */
export function loadIssues(section: Pick<SectionDef, "key" | "href">): Issue[] {
  const hit = cache.get(section.key);
  if (hit) return hit;
  const dir = issuesDir(section);
  const issues: Issue[] = [];
  if (fs.existsSync(dir)) {
    for (const year of fs.readdirSync(dir).sort()) {
      const yearDir = path.join(dir, year);
      if (!fs.statSync(yearDir).isDirectory()) continue;
      for (const name of fs.readdirSync(yearDir).sort()) {
        if (name.endsWith(".mdx")) issues.push(readIssueFile(section, path.join(yearDir, name), year));
      }
    }
  }
  issues.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  cache.set(section.key, issues);
  return issues;
}

export const isValidSlug = (slug: string) => SLUG_RE.test(slug);

/** Sent issues: the public archive, sitemap, search and RSS. */
export const isPublished = (issue: Pick<Issue, "status">) => issue.status === "sent";

/**
 * Issues that get a web page: sent ones everywhere, and drafts and scheduled ones too outside production, so they
 * can be reviewed on local, preview and staging (noindex, never in the sitemap or the feed).
 */
export function isBuilt(issue: Pick<Issue, "status">, env = resolveAppEnv()): boolean {
  return isPublished(issue) || env !== "production";
}
