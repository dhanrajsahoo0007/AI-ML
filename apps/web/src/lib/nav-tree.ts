import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  getContentSlugs,
  getTopLevelMeta,
  partitionSlugs,
} from "@/lib/mdx-doc";
import { getCategories, getCompanies, COMPANY_GROUPS } from "@/lib/question-bank";
import { isSectionEnabled } from "@/config/features";
import type { ContentSection } from "@/types/content";

export interface NavItem {
  slug: string;
  title: string;
  href: string;
}

export interface NavCategory {
  title: string;
  items: NavItem[];
}

export interface NavGroup {
  slug: string;
  title: string;
  href: string;
  icon?: string;
  categories?: NavCategory[];
  items?: NavItem[];
}

export interface NavSection {
  key: ContentSection;
  label: string;
  href: string;
  icon: string;
  groups: NavGroup[];
}

const sectionDefs: {
  key: ContentSection;
  label: string;
  href: string;
  icon: string;
}[] = [
  { key: "ai-system-design", label: "GenAI & LLM Systems", href: "/ai-system-design", icon: "sparkles" },
  { key: "system-design", label: "Classic System Design", href: "/system-design", icon: "layers" },
  { key: "cloud", label: "Cloud Architecture", href: "/cloud", icon: "cloud" },
  { key: "interviews", label: "Interview Practice", href: "/interviews", icon: "brain" },
  { key: "companies", label: "Company Questions", href: "/companies", icon: "users" },
  { key: "ml-system-design", label: "ML System Design", href: "/ml-system-design", icon: "server" },
];

function extractCategoryMapping(
  rawMdx: string,
  sectionPath: string,
  parentSlug: string
): NavCategory[] {
  const categories: NavCategory[] = [];
  const categoryRegex =
    /<ModelCategory\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/ModelCategory>/g;
  const cardRegex =
    /<ModelCard\s+[^>]*title="([^"]+)"[^>]*href="([^"]+)"[^>]*\/?\s*>/g;

  let catMatch: RegExpExecArray | null;
  while ((catMatch = categoryRegex.exec(rawMdx)) !== null) {
    const categoryTitle = catMatch[1];
    const categoryBody = catMatch[2];
    const items: NavItem[] = [];

    let cardMatch: RegExpExecArray | null;
    const localCardRegex = new RegExp(cardRegex.source, "g");
    while ((cardMatch = localCardRegex.exec(categoryBody)) !== null) {
      const title = cardMatch[1];
      const href = cardMatch[2];
      const slugParts = href.split("/");
      const slug = slugParts[slugParts.length - 1];
      items.push({ slug, title, href });
    }

    if (items.length > 0) {
      categories.push({ title: categoryTitle, items });
    }
  }

  return categories;
}

interface FrontmatterGroup {
  name: string;
  icon?: string;
  categories: string[];
}

// Interview questions live in the question library: one group per category, one item per subsection.
function buildInterviewGroups(): NavGroup[] {
  return getCategories().map((c) => ({
    slug: c.slug,
    title: c.title,
    href: `/interviews/${c.slug}`,
    icon: c.icon,
    items: c.subsections.map((s) => ({
      slug: s.slug,
      title: s.title,
      href: `/interviews/${c.slug}/${s.slug}`,
    })),
  }));
}

// Companies live on one page that filters by ?company=; one group per company type, one item per company.
function buildCompanyGroups(): NavGroup[] {
  const companies = getCompanies();
  return COMPANY_GROUPS.map((name) => ({
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    title: name,
    href: "/companies",
    items: companies
      .filter((c) => c.group === name)
      .map((c) => ({ slug: c.slug, title: c.name, href: `/companies?company=${c.slug}` })),
  })).filter((g) => g.items.length > 0);
}

async function buildGroupsForSection(
  section: ContentSection
): Promise<NavGroup[]> {
  if (section === "interviews") return buildInterviewGroups();
  if (section === "companies") return buildCompanyGroups();
  const allSlugs = await getContentSlugs(section);
  const metas = await getTopLevelMeta(section);
  const { topLevel, children } = partitionSlugs(allSlugs);
  const sectionHref =
    sectionDefs.find((s) => s.key === section)?.href ?? `/${section}`;
  const contentDir = path.join(process.cwd(), "content", section);

  const groups: NavGroup[] = [];

  for (const slug of metas.map((m) => m.slug).filter((s) => topLevel.includes(s))) {
    const meta = metas.find((m) => m.slug === slug);
    const childSlugs = children[slug];

    if (childSlugs && childSlugs.length > 0) {
      const parentPath = path.join(contentDir, `${slug}.mdx`);
      try {
        const raw = await fs.readFile(parentPath, "utf8");
        const { data } = matter(raw);
        const fmGroups = data.groups as FrontmatterGroup[] | undefined;

        if (fmGroups && fmGroups.length > 0) {
          const allCategories = extractCategoryMapping(raw, section, slug);
          const catMap = new Map(allCategories.map((c) => [c.title, c]));

          for (const fg of fmGroups) {
            const matchedCats: NavCategory[] = [];
            for (const catName of fg.categories) {
              const cat = catMap.get(catName);
              if (cat) matchedCats.push(cat);
            }
            groups.push({
              slug: `${slug}--${fg.name.toLowerCase().replaceAll(" ", "-")}`,
              title: fg.name,
              href: `${sectionHref}/${slug}`,
              icon: fg.icon ?? meta?.icon,
              categories: matchedCats.length > 0 ? matchedCats : undefined,
            });
          }
          continue;
        }

        const categories = extractCategoryMapping(raw, section, slug);
        const group: NavGroup = {
          slug,
          title: meta?.title ?? slug.replaceAll("-", " "),
          href: `${sectionHref}/${slug}`,
          icon: meta?.icon,
        };
        if (categories.length > 0) {
          group.categories = categories;
        } else {
          group.items = await buildFlatItems(
            contentDir,
            slug,
            childSlugs,
            sectionHref
          );
        }
        groups.push(group);
      } catch {
        groups.push({
          slug,
          title: meta?.title ?? slug.replaceAll("-", " "),
          href: `${sectionHref}/${slug}`,
          icon: meta?.icon,
          items: await buildFlatItems(contentDir, slug, childSlugs, sectionHref),
        });
      }
    } else {
      groups.push({
        slug,
        title: meta?.title ?? slug.replaceAll("-", " "),
        href: `${sectionHref}/${slug}`,
        icon: meta?.icon,
      });
    }
  }

  return groups;
}

async function buildFlatItems(
  contentDir: string,
  parentSlug: string,
  childSlugs: string[],
  sectionHref: string
): Promise<NavItem[]> {
  const items: NavItem[] = [];
  for (const childSlug of childSlugs) {
    const filePath = path.join(contentDir, parentSlug, `${childSlug}.mdx`);
    let title = childSlug.replaceAll("-", " ");
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const { data } = matter(raw);
      if (data.title) title = data.title as string;
    } catch {}
    items.push({
      slug: childSlug,
      title,
      href: `${sectionHref}/${parentSlug}/${childSlug}`,
    });
  }
  return items;
}

let cachedNavTree: NavSection[] | null = null;

export async function getNavTree(): Promise<NavSection[]> {
  if (cachedNavTree) return cachedNavTree;

  const sections: NavSection[] = [];

  for (const def of sectionDefs.filter((d) => isSectionEnabled(d.key))) {
    const groups = await buildGroupsForSection(def.key);
    sections.push({
      key: def.key,
      label: def.label,
      href: def.href,
      icon: def.icon,
      groups,
    });
  }

  cachedNavTree = sections;
  return sections;
}
