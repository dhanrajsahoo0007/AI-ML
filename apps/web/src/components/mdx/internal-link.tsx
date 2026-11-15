import type { ComponentProps } from "react";

// Markdown links in docs pages. A link into a section (or hub) that is not `on` in this build renders as plain
// text, so a published page never links to a hidden or off section (content/AGENTS.md; checked per build profile
// by tests/e2e/sections.profile.spec.ts). External links, anchors and visible internal links render unchanged.
// `isPathVisible` comes from the section registry; src/lib/mdx-doc.tsx passes it in (components/ may not import
// features/).
export function mdxLink(isPathVisible: (pathname: string) => boolean) {
  return function MdxLink({ href, children, ...rest }: ComponentProps<"a">) {
    if (href?.startsWith("/") && !href.startsWith("//")) {
      const pathname = href.split(/[?#]/)[0] || "/";
      if (!isPathVisible(pathname)) return <span>{children}</span>;
    }
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
}
