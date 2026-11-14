import type { AnchorHTMLAttributes } from "react";

// The link component for every MDX page (`a` in the component map of src/lib/mdx-doc.tsx). A link to a page of the
// site that is not visible in this environment (its section is hidden or off, or its hub is off) renders as its
// text, so published pages never link to a section that is not released. content-check still reports each such
// link as a warning. Anything else renders as the plain anchor MDX would have produced.
//
// `isVisible` is the registry's isPathVisible, passed in by mdx-doc.tsx because components/ may not import features/.
export function mdxLink(isVisible: (path: string) => boolean) {
  return function MdxLink({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    if (href && href.startsWith("/") && !href.startsWith("//") && !isVisible(href)) return <>{children}</>;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
}
