import { navSection, type SectionKind } from "../kind";

// Kinds that are planned but not built yet (plan §15.1 DSA, §15.2 Newsletter). They load nothing and
// have no routes; their sections show as "coming soon" in the nav until the real module lands.

function stub(kind: "problems" | "newsletter"): SectionKind<never> {
  return {
    kind,
    async load() {
      return [];
    },
    staticParams: () => [],
    nav: (section) => navSection(section, []),
    sitemap: () => [],
    search: () => [],
    access: (section) => section.access?.default ?? "free",
    companyRefs: () => [],
    counts: () => ({ written: 0, outline: 0 }),
    validate: () => [],
  };
}

export const problemsKind = stub("problems");
export const newsletterKind = stub("newsletter");
