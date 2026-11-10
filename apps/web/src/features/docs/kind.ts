import fs from "node:fs";
import path from "node:path";
import { navSection, type ContentError, type NavCategory, type NavGroup, type SectionKind } from "../sections/kind";
import { DESCRIPTION_MAX, docGroupSchema, frontmatterSchema, type SectionDef } from "../sections/schema";
import { articlesOf, hubsOf, loadDocItems, loadNavIndex, NAV_INDEX_FILE, sectionDir, type DocItem } from "./source";
import { parseHubMarkup } from "./hub-markup";

// The `docs` kind: MDX hubs and articles under content/<section>/, served by the shared
// app/(content)/[section] routes. GenAI & LLM Systems, Classic System Design and Cloud.

function lineOf(file: string, needle: RegExp): number | undefined {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const i = lines.findIndex((l) => needle.test(l));
  return i === -1 ? undefined : i + 1;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function lastSegment(href: string) {
  return href.split("/").filter(Boolean).at(-1) ?? href;
}

function hubCategories(section: SectionDef, hub: string): NavCategory[] {
  const entry = loadNavIndex(section).hubs.find((h) => h.slug === hub);
  return (entry?.categories ?? [])
    .filter((c) => c.cards.length > 0)
    .map((c) => ({
      title: c.title,
      items: c.cards.map((card) => ({ slug: lastSegment(card.href), title: card.title, href: card.href })),
    }));
}

function hubGroups(hub: DocItem) {
  const parsed = docGroupSchema.array().safeParse(hub.data.groups);
  return parsed.success ? parsed.data : [];
}

export const docsKind: SectionKind<DocItem> = {
  kind: "docs",

  async load(section) {
    return loadDocItems(section);
  },

  staticParams(_section, items) {
    return items.map((i) => ({ slug: i.segments }));
  },

  // One nav group per hub, or one per frontmatter `groups` entry; categories and cards come from the
  // section's _index.yaml, and hubs without an index entry list their articles flat.
  nav(section, items) {
    const groups: NavGroup[] = [];
    for (const hub of hubsOf(items)) {
      const base = { slug: hub.slug, title: hub.title, href: hub.href, icon: hub.icon };
      const children = articlesOf(items, hub.slug);
      if (children.length === 0) {
        groups.push(base);
        continue;
      }
      const categories = hubCategories(section, hub.slug);
      const fmGroups = hubGroups(hub);
      if (fmGroups.length > 0) {
        const byTitle = new Map(categories.map((c) => [c.title, c]));
        for (const g of fmGroups) {
          const matched = g.categories.flatMap((name) => byTitle.get(name) ?? []);
          groups.push({
            slug: `${hub.slug}--${g.name.toLowerCase().replaceAll(" ", "-")}`,
            title: g.name,
            href: hub.href,
            icon: g.icon ?? hub.icon,
            categories: matched.length > 0 ? matched : undefined,
          });
        }
      } else if (categories.length > 0) {
        groups.push({ ...base, categories });
      } else {
        groups.push({
          ...base,
          items: children.map((c) => ({ slug: c.segments.slice(1).join("/"), title: c.title, href: c.href })),
        });
      }
    }
    return navSection(section, groups);
  },

  sitemap(section, items) {
    return [{ url: section.href }, ...items.map((i) => ({ url: i.href }))];
  },

  search(section, items) {
    return items.map((i) => ({ href: i.href, title: i.title, description: i.description, section: section.key }));
  },

  access(section, item) {
    if (item.data.access === "free" || item.data.access === "premium") return item.data.access;
    const alwaysFree = section.access?.alwaysFree ?? [];
    if (item.isHub && alwaysFree.includes("hubs")) return "free";
    if (item.status === "outline" && alwaysFree.includes("outlines")) return "free";
    return section.access?.default ?? "free";
  },

  questions(item) {
    return item.hasQuestions ? [{ href: item.href, file: item.file }] : [];
  },

  counts(items) {
    const articles = articlesOf(items);
    const outline = articles.filter((a) => a.status === "outline").length;
    return { written: articles.length - outline, outline };
  },

  async validate(section, items) {
    const { iconMap } = await import("../../lib/icons");
    const errors: ContentError[] = [];
    const rel = (file: string) => path.relative(process.cwd(), file);
    const push = (file: string, message: string, line?: number, level: ContentError["level"] = "error") =>
      errors.push({ file: rel(file), line, message, level });
    const checkIcon = (file: string, icon: string | undefined, where: string) => {
      if (icon && !(icon in iconMap))
        push(
          file,
          `unknown icon "${icon}" (${where}); add it to src/lib/icons.ts`,
          lineOf(file, new RegExp(`icon[=:]\\s*"?${escape(icon)}`))
        );
    };

    // Frontmatter (§5.3).
    for (const item of items) {
      const result = frontmatterSchema.safeParse(item.data);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const key = String(issue.path[0] ?? "");
          const message =
            issue.code === "unrecognized_keys"
              ? `frontmatter: ${issue.message}`
              : `frontmatter ${issue.path.join(".")}: ${issue.message}`;
          push(item.file, message, key ? lineOf(item.file, new RegExp(`^${escape(key)}:`)) : 1);
        }
      }
      if (item.description && item.description.length > DESCRIPTION_MAX) {
        push(
          item.file,
          `description is ${item.description.length} characters (max ${DESCRIPTION_MAX} for <meta>)`,
          lineOf(item.file, /^description:/),
          "warning"
        );
      }
      checkIcon(item.file, item.icon, "frontmatter");
      for (const g of hubGroups(item)) {
        checkIcon(item.file, g.icon, `group ${g.name}`);
        const known = new Set(Array.isArray(item.data.categories) ? (item.data.categories as string[]) : []);
        for (const c of g.categories) {
          if (!known.has(c))
            push(
              item.file,
              `group "${g.name}" lists category "${c}", which is not in categories`,
              lineOf(item.file, new RegExp(escape(c)))
            );
        }
      }
    }

    // Nav index ↔ files: every card points at a page, every article is on its hub's cards, and the
    // index matches the hub's MDX grid.
    const indexFile = path.join(sectionDir(section), NAV_INDEX_FILE);
    const byHref = new Map(items.map((i) => [i.href, i]));
    const hubs = new Map(hubsOf(items).map((h) => [h.slug, h]));
    if (!fs.existsSync(indexFile)) {
      if (articlesOf(items).length > 0) push(indexFile, "missing nav index (run scripts/migrate-nav-index.ts)");
      return errors;
    }
    const index = loadNavIndex(section);
    const listed = new Set<string>();
    for (const hub of index.hubs) {
      const hubItem = hubs.get(hub.slug);
      if (!hubItem) {
        push(
          indexFile,
          `hub "${hub.slug}" has no ${hub.slug}.mdx`,
          lineOf(indexFile, new RegExp(`slug: ${escape(hub.slug)}$`))
        );
        continue;
      }
      for (const cat of hub.categories) {
        checkIcon(indexFile, cat.icon, `category ${cat.title}`);
        for (const card of cat.cards) {
          listed.add(card.href);
          checkIcon(indexFile, card.icon, `card ${card.title}`);
          const target = byHref.get(card.href);
          const line = lineOf(indexFile, new RegExp(`href: ${escape(card.href)}$`));
          if (!target) push(indexFile, `card "${card.title}" links to ${card.href}, which has no MDX file`, line);
          else if (target.hub !== hub.slug) push(indexFile, `card ${card.href} is listed under hub ${hub.slug}`, line);
          else if ((card.status ?? "published") !== target.status) {
            push(
              indexFile,
              `card ${card.href} has status ${card.status ?? "published"} but the page is ${target.status}`,
              line,
              "warning"
            );
          }
        }
      }
      const markup = JSON.stringify(parseHubMarkup(fs.readFileSync(hubItem.file, "utf8")));
      if (markup !== JSON.stringify(hub.categories)) {
        push(
          indexFile,
          `hub ${hub.slug}: _index.yaml differs from the cards in ${rel(hubItem.file)} (run scripts/migrate-nav-index.ts)`
        );
      }
    }
    for (const article of articlesOf(items)) {
      const hubIndexed = index.hubs.some((h) => h.slug === article.hub);
      if (hubIndexed && !listed.has(article.href))
        push(article.file, `orphan page: not on any card in ${rel(indexFile)}`, 1);
    }
    for (const hub of hubsOf(items)) {
      if (articlesOf(items, hub.slug).length > 0 && !index.hubs.some((h) => h.slug === hub.slug)) {
        push(indexFile, `hub ${hub.slug} has articles but no entry`, undefined, "warning");
      }
    }
    return errors;
  },
};
