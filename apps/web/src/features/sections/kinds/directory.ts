import { navSection, type CompanyRef, type SectionKind } from "../kind";
import { COMPANY_GROUPS, getCompanies, type Company } from "../../../lib/question-bank";

// The `directory` kind: Company Questions. Items are the companies in content/companies/companies.yaml;
// question counts come from the `companyRefs()` of the sections listed in `aggregates` that are `on`
// (Interview Practice today, DSA later), so hidden or off sections never add to the counts.

const groupSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const directoryKind: SectionKind<Company> = {
  kind: "directory",

  async load() {
    return getCompanies();
  },

  // The directory is one page filtered by ?company=.
  staticParams: () => [],

  // One group per company type, one item per company.
  nav(section, items) {
    return navSection(
      section,
      COMPANY_GROUPS.map((name) => ({
        slug: groupSlug(name),
        title: name,
        href: section.href,
        items: items
          .filter((c) => c.group === name)
          .map((c) => ({ slug: c.slug, title: c.name, href: `${section.href}?company=${c.slug}` })),
      })).filter((g) => g.items.length > 0)
    );
  },

  sitemap: (section) => [{ url: section.href }],

  search(section, items) {
    return items.map((c) => ({
      href: `${section.href}?company=${c.slug}`,
      title: c.name,
      description: c.roles,
      section: section.key,
    }));
  },

  access: (section) => section.access?.default ?? "free",

  counts: (items) => ({ written: items.length, outline: 0 }),

  validate: () => [],
};

/** Company refs from every aggregated section that is `on`. */
export async function aggregateCompanyRefs(
  aggregated: { section: Parameters<SectionKind<unknown>["load"]>[0]; kind: SectionKind<unknown> }[]
): Promise<CompanyRef[]> {
  const refs: CompanyRef[] = [];
  for (const { section, kind } of aggregated) {
    if (section.state !== "on" || !kind.companyRefs) continue;
    for (const item of await kind.load(section)) refs.push(...kind.companyRefs(item));
  }
  return refs;
}
