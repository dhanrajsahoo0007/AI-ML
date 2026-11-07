import type { Root } from "mdast";

// `<Mermaid ref="system-design/wal" />` is the documented way to reuse a diagram from
// assets/diagrams/mermaid/ (plan §5.6), but React reserves `ref`: Server Components reject it at render.
// This plugin renames the attribute to `id` on <Mermaid> while the MDX compiles, before any JSX exists.

type JsxAttribute = { type: string; name?: string };
type Node = { type: string; name?: string | null; attributes?: JsxAttribute[]; children?: Node[] };

export function remarkAssetRefs() {
  const visit = (node: Node) => {
    if ((node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") && node.name === "Mermaid") {
      for (const attr of node.attributes ?? []) {
        if (attr.type === "mdxJsxAttribute" && attr.name === "ref") attr.name = "id";
      }
    }
    node.children?.forEach(visit);
  };
  return (tree: Root) => visit(tree as unknown as Node);
}
