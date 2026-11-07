import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import yaml from "js-yaml";
import { fixtureDocsFor } from "../paywall/fixtures";
import { CONTENT_DIR, resolveAppEnv } from "../sections/registry";
import { navIndexSchema, type NavIndex, type SectionDef } from "../sections/schema";

// Reads a docs section from disk: content/<key>/<hub>.mdx hubs and content/<key>/<hub>/<article>.mdx
// articles, plus the section's nav index (content/<key>/_index.yaml). Build time only. No JSX
// imports, so the scripts can load it with plain Node.

export type DocStatus = "outline" | "draft" | "published";

export interface DocItem {
  section: string;
  /** Path below the section, e.g. "databases/b-trees". */
  slug: string;
  segments: string[];
  href: string;
  /** Absolute path of the MDX file. */
  file: string;
  /** Top-level slug this page belongs to (itself for a hub). */
  hub: string;
  isHub: boolean;
  /** Raw frontmatter (validated by content-check, not here). */
  data: Record<string, unknown>;
  title: string;
  description?: string;
  icon?: string;
  order?: number;
  status: DocStatus;
  /** True when the body has <InterviewQuestion> blocks. */
  hasQuestions: boolean;
}

export function sectionDir(section: Pick<SectionDef, "key">) {
  return path.join(CONTENT_DIR, section.key);
}

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

const cache = new Map<string, DocItem[]>();

/** Every page of a docs section: hubs first (by `order`, then name), then their articles. */
export function loadDocItems(section: Pick<SectionDef, "key" | "href">): DocItem[] {
  const hit = cache.get(section.key);
  if (hit) return hit;
  const dir = sectionDir(section);
  // Test-only fixture pages (the leak canary) join the section in every environment but production.
  const sources = [
    ...walk(dir).map((slug) => ({ slug, file: path.join(dir, `${slug}.mdx`) })),
    ...fixtureDocsFor(section.key, resolveAppEnv()),
  ];
  const items = sources.map(({ slug, file }): DocItem => {
    const { data, content } = matter(fs.readFileSync(file, "utf8"));
    const segments = slug.split("/");
    const status = data.status === "outline" || data.status === "draft" ? data.status : "published";
    return {
      section: section.key,
      slug,
      segments,
      href: `${section.href}/${slug}`,
      file,
      hub: segments[0],
      isHub: segments.length === 1,
      data,
      title: typeof data.title === "string" ? data.title : slug.replaceAll("-", " "),
      description: typeof data.description === "string" ? data.description : undefined,
      icon: typeof data.icon === "string" ? data.icon : undefined,
      order: typeof data.order === "number" ? data.order : undefined,
      status,
      hasQuestions: content.includes("<InterviewQuestion "),
    };
  });
  // Hubs with an `order` come first, in that order; the rest keep name order.
  const hubRank = new Map(
    items
      .filter((i) => i.isHub)
      .map((h, i) => ({ h, i }))
      .sort((a, b) => (a.h.order ?? Infinity) - (b.h.order ?? Infinity) || a.i - b.i)
      .map(({ h }, rank) => [h.slug, rank])
  );
  const rank = (i: DocItem) => hubRank.get(i.hub) ?? Infinity;
  const sorted = items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rank(a.item) - rank(b.item) || Number(b.item.isHub) - Number(a.item.isHub) || a.i - b.i)
    .map(({ item }) => item);
  cache.set(section.key, sorted);
  return sorted;
}

export function hubsOf(items: DocItem[]) {
  return items.filter((i) => i.isHub);
}

export function articlesOf(items: DocItem[], hub?: string) {
  return items.filter((i) => !i.isHub && (hub === undefined || i.hub === hub));
}

export const NAV_INDEX_FILE = "_index.yaml";

/** The section's nav index; an empty one when the file is missing (content-check reports that). */
export function loadNavIndex(section: Pick<SectionDef, "key">): NavIndex {
  const file = path.join(sectionDir(section), NAV_INDEX_FILE);
  if (!fs.existsSync(file)) return { hubs: [] };
  const result = navIndexSchema.safeParse(yaml.load(fs.readFileSync(file, "utf8")));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  ${file} [${i.path.join(".")}]: ${i.message}`);
    throw new Error(`Invalid nav index:\n${lines.join("\n")}`);
  }
  return result.data;
}
