"use client";

import dynamic from "next/dynamic";

// The KaTeX stylesheet (~23 kB plus fonts) is only needed on the few pages with math. mdx-doc.tsx renders
// this when the compiled MDX contains math; loading the CSS through next/dynamic keeps it out of every
// other page, while server rendering still emits the <link> in the page head, so formulas never flash.
const KatexCss = dynamic(() => import("@/components/article/katex-css"));

export function KatexStyles() {
  return <KatexCss />;
}
