import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { HeaderNavItems, HeaderNavSection } from "@/features/sections/public";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/use-canonical-pathname", () => ({
  useCanonicalPathname: () => "/",
}));
vi.mock("@/components/theme", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));
vi.mock("@/features/search/search-dialog.client", () => ({
  SearchButton: () => <button type="button">Search</button>,
}));

import { SiteHeader } from "./site-header";

const singleBlockSection: HeaderNavSection = {
  key: "sec-single",
  kind: "docs",
  label: "Case Studies",
  href: "/sec-single",
  icon: "rocket",
  navGroup: "learn",
  groups: [{ slug: "grp-one", title: "Assistants", href: "/sec-single", count: 3 }],
};

const multiBlockSection: HeaderNavSection = {
  key: "sec-multi",
  kind: "docs",
  label: "Foundations",
  href: "/sec-multi",
  icon: "layers",
  navGroup: "learn",
  groups: [{ slug: "grp-many", title: "Core", href: "/sec-multi", count: 4 }],
};

const navItems: HeaderNavItems = {
  "sec-single": {
    "grp-one": [
      {
        title: "Assistants",
        items: [
          { title: "One", href: "/sec-single/one" },
          { title: "Two", href: "/sec-single/two" },
          { title: "Three", href: "/sec-single/three" },
        ],
      },
    ],
  },
  "sec-multi": {
    "grp-many": [
      { title: "Part A", items: [{ title: "Alpha", href: "/sec-multi/alpha" }] },
      { title: "Part B", items: [{ title: "Beta", href: "/sec-multi/beta" }] },
    ],
  },
};

describe("SiteHeader section panel layout", () => {
  it("stacks a single-category list vertically instead of slicing it into two columns", () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        navTree={[singleBlockSection]}
        profileMenu={null}
        profileMenuMobile={null}
        defaultOpenKey="sec-single"
        initialNavItems={navItems}
      />
    );
    expect(html).toContain("space-y-4");
    expect(html).not.toContain("columns-2");
  });

  it("keeps the two-column layout when a group contains multiple categories", () => {
    const html = renderToStaticMarkup(
      <SiteHeader
        navTree={[multiBlockSection]}
        profileMenu={null}
        profileMenuMobile={null}
        defaultOpenKey="sec-multi"
        initialNavItems={navItems}
      />
    );
    expect(html).toContain("columns-2");
  });
});
