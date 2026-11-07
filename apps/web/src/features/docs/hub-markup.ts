import type { NavIndexCategory } from "../sections/schema";

// Reads the <ModelCategory>/<ModelCard> grid out of a hub's MDX. Used by the one-off nav index
// migration and by content-check to catch a hub whose cards drifted from its _index.yaml (until the
// hub MDX renders its grid from the index). Attribute order does not matter.

const CATEGORY_RE = /<ModelCategory\b((?:[^>"]|"[^"]*")*)>([\s\S]*?)<\/ModelCategory>/g;
const CARD_RE = /<ModelCard\b((?:[^>"]|"[^"]*")*?)\/?>/g;
const ATTR_RE = /([a-zA-Z]+)="([^"]*)"/g;

function attrs(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(ATTR_RE)].map((m) => [m[1], m[2]]));
}

export function parseHubMarkup(mdx: string): NavIndexCategory[] {
  return [...mdx.matchAll(CATEGORY_RE)].map((cat) => {
    const a = attrs(cat[1]);
    const cards = [...cat[2].matchAll(CARD_RE)].map((card) => {
      const c = attrs(card[1]);
      return {
        title: c.title,
        href: c.href,
        ...(c.icon ? { icon: c.icon } : {}),
        ...(c.description ? { description: c.description } : {}),
        ...(c.status ? { status: c.status as "outline" | "draft" | "published" } : {}),
      };
    });
    return {
      title: a.title,
      ...(a.icon ? { icon: a.icon } : {}),
      ...(a.subtitle ? { subtitle: a.subtitle } : {}),
      cards,
    };
  });
}
