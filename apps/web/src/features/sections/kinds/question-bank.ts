import { navSection, type SectionKind } from "../kind";
import { getCategories, getQuestions, validateLibrary, type Category } from "../../../lib/question-bank";

// The `question-bank` kind: Interview Practice. Items are the visible categories of the question
// library (content/question-bank/*.yaml plus <InterviewQuestion> blocks from `on` sections), served by
// the app/interviews routes.

const categoryHref = (section: { href: string }, c: Category) => `${section.href}/${c.slug}`;

export const questionBankKind: SectionKind<Category> = {
  kind: "question-bank",

  async load() {
    return getCategories();
  },

  staticParams(_section, items) {
    return items.flatMap((c) => [
      { category: c.slug },
      ...c.subsections.map((s) => ({ category: c.slug, subsection: s.slug })),
    ]);
  },

  // One group per category, one item per subsection.
  nav(section, items) {
    return navSection(
      section,
      items.map((c) => ({
        slug: c.slug,
        title: c.title,
        href: categoryHref(section, c),
        icon: c.icon,
        items: c.subsections.map((s) => ({
          slug: s.slug,
          title: s.title,
          href: `${categoryHref(section, c)}/${s.slug}`,
        })),
      }))
    );
  },

  sitemap(section, items) {
    return [
      { url: section.href },
      ...items.flatMap((c) => [
        { url: categoryHref(section, c) },
        ...c.subsections.map((s) => ({ url: `${categoryHref(section, c)}/${s.slug}` })),
      ]),
    ];
  },

  search(section, items) {
    return items.map((c) => ({
      href: categoryHref(section, c),
      title: c.title,
      description: c.description,
      section: section.key,
    }));
  },

  access(section) {
    return section.access?.default ?? "free";
  },

  companyRefs(item) {
    return getQuestions({ category: item.slug }).flatMap((q) =>
      q.companies.map((company) => ({ company, href: `#${q.id}` }))
    );
  },

  counts(items) {
    const visible = new Set(items.map((c) => c.slug));
    return { written: getQuestions().filter((q) => visible.has(q.category)).length, outline: 0 };
  },

  validate() {
    return validateLibrary().map((message) => ({
      file: "content/question-bank",
      message: message.trim(),
      level: "error" as const,
    }));
  },
};
