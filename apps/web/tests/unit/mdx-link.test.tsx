import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { mdxLink } from "@/components/mdx/mdx-link";
import { isPathVisible } from "@/features/sections/registry";

// A page must not link into a section that is not released: the production build of a case study that mentions
// the ML System Design pages showed their URLs while that section was off (CI: sections.profile.spec.ts).

const before = process.env.APP_ENV;
afterEach(() => {
  if (before === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = before;
});

// The component as mdx-doc.tsx builds it, against the real registry of the given environment.
const render = (href: string, env: "local" | "production") => {
  process.env.APP_ENV = env;
  return renderToStaticMarkup(createElement(mdxLink(isPathVisible), { href }, "Recommendation Systems"));
};

describe("mdxLink", () => {
  it("renders a link into a section that is off as its text", () => {
    expect(render("/ml-system-design/case-studies/recommendation-systems", "production")).toBe(
      "Recommendation Systems"
    );
  });

  it("keeps the link where that section is on", () => {
    expect(render("/ml-system-design/case-studies/recommendation-systems", "local")).toBe(
      '<a href="/ml-system-design/case-studies/recommendation-systems">Recommendation Systems</a>'
    );
  });

  it("keeps links to released pages, other pages of the site, anchors and other sites in production", () => {
    for (const href of [
      "/system-design/databases/search-engines",
      "/ai-system-design/genai-system-design/rag-fundamentals#chunking",
      "/pricing",
      "#trade-offs",
      "https://example.com/ml-system-design",
    ]) {
      expect(render(href, "production")).toBe(`<a href="${href}">Recommendation Systems</a>`);
    }
  });

  it("passes other anchor attributes through", () => {
    process.env.APP_ENV = "production";
    const html = renderToStaticMarkup(
      createElement(mdxLink(isPathVisible), { href: "https://example.com", target: "_blank", rel: "noreferrer" }, "x")
    );
    expect(html).toBe('<a href="https://example.com" target="_blank" rel="noreferrer">x</a>');
  });
});
