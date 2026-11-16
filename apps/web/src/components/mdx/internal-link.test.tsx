import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { mdxLink } from "./internal-link";

const MdxLink = mdxLink((pathname) => !pathname.startsWith("/off-section"));

describe("mdxLink", () => {
  it("keeps links into visible pages", () => {
    expect(renderToStaticMarkup(<MdxLink href="/system-design/patterns/caching#ttl">Caching</MdxLink>)).toBe(
      '<a href="/system-design/patterns/caching#ttl">Caching</a>'
    );
  });

  it("renders a link into a hidden or off section as plain text", () => {
    const out = renderToStaticMarkup(
      <MdxLink href="/off-section/case-studies/x?tab=1">Recommendation Systems</MdxLink>
    );
    expect(out).toBe("<span>Recommendation Systems</span>");
    expect(out).not.toContain("/off-section");
  });

  it("leaves external links and in-page anchors alone", () => {
    expect(renderToStaticMarkup(<MdxLink href="https://example.com">x</MdxLink>)).toBe(
      '<a href="https://example.com">x</a>'
    );
    expect(renderToStaticMarkup(<MdxLink href="#intro">x</MdxLink>)).toBe('<a href="#intro">x</a>');
  });
});
