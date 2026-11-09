import { allSections } from "../sections/registry";
import { loadDocItems } from "../docs/source";
import { loadCatalog, tagLabel } from "./catalog";
import { isBuilt, type Issue } from "./source";

// Display data for issue pages and cards, built at render time from content (no database).

const formatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
export const formatIssueDate = (d: string) => formatter.format(new Date(`${d}T00:00:00Z`));

export const LEVEL_LABEL = { intro: "Beginner friendly", intermediate: "Intermediate", advanced: "Advanced" } as const;

export function issueLabels(sectionKey: string, issue: Pick<Issue, "series" | "tags">) {
  const catalog = loadCatalog(sectionKey);
  return {
    series: issue.series ? catalog.series[issue.series]?.title : undefined,
    tags: issue.tags.map((t) => ({ key: t, label: tagLabel(catalog, t) })),
  };
}

export interface RelatedArticle {
  href: string;
  title: string;
  description?: string;
  icon?: string;
}

/** The issue's `related` paths as site articles (titles from the docs sections); unknown paths are skipped. */
export function relatedArticles(paths: string[]): RelatedArticle[] {
  if (paths.length === 0) return [];
  const byHref = new Map<string, RelatedArticle>();
  for (const s of allSections()) {
    if (s.kind !== "docs" || s.state === "off") continue;
    for (const d of loadDocItems(s))
      byHref.set(d.href, { href: d.href, title: d.title, description: d.description, icon: d.icon });
  }
  return paths.flatMap((p) => byHref.get(p) ?? []);
}

/** The issues before (older) and after (newer) this one that have a page in this build. */
export function neighbours(issues: Issue[], slug: string) {
  const built = issues.filter((i) => isBuilt(i));
  const i = built.findIndex((x) => x.slug === slug);
  return { newer: i > 0 ? built[i - 1] : undefined, older: i >= 0 ? built[i + 1] : undefined };
}
