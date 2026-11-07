import path from "node:path";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import { diagramHash, readDiagram } from "@/lib/mermaid-cache.mjs";

// Swaps each ```mermaid fence for the inline SVG pre-rendered by scripts/render-mermaid.mjs, as a
// <MermaidSvg light dark caption /> element (src/components/mdx/code-block.tsx). A fence wrapped in
// <Figure caption="..."> becomes one captioned MermaidSvg.
//
// A diagram missing from the cache fails a production build with its file and line (run
// `npm run mermaid`). In `next dev` the fence is left as is and the client-side fallback renders it.

type Options = {
  /** Absolute path of the MDX file, for error messages. */
  filePath: string;
  /** Lines of frontmatter stripped before compiling, so reported lines match the file. */
  lineOffset?: number;
};

type MdxAttribute = { type: "mdxJsxAttribute"; name: string; value?: unknown };
type MdxJsxElement = {
  type: "mdxJsxFlowElement";
  name: string | null;
  attributes: MdxAttribute[];
  children: (RootContent | ElementContent)[];
  position?: Element["position"];
};
type AnyNode = Root | RootContent | ElementContent | MdxJsxElement;

const isDev = process.env.NODE_ENV === "development";

function textOf(node: AnyNode): string {
  if (node.type === "text") return (node as Text).value;
  return "children" in node ? (node.children as AnyNode[]).map(textOf).join("") : "";
}

function mermaidFence(node: AnyNode): string | null {
  if (node.type !== "element" || node.tagName !== "pre") return null;
  const code = node.children.find((c): c is Element => c.type === "element" && c.tagName === "code");
  const cls = code?.properties?.className;
  return Array.isArray(cls) && cls.includes("language-mermaid") ? textOf(code!) : null;
}

function isBlank(node: AnyNode) {
  return node.type === "text" && !(node as Text).value.trim();
}

export function rehypeMermaidSvg({ filePath, lineOffset = 0 }: Options) {
  const file = path.relative(process.cwd(), filePath);

  function svgElement(chart: string, at: AnyNode, caption?: unknown): MdxJsxElement | null {
    const entry = readDiagram(diagramHash(chart));
    if (!entry) {
      if (isDev) return null;
      const line = ("position" in at && at.position?.start.line ? at.position.start.line : 0) + lineOffset;
      throw new Error(
        `${file}:${line}: Mermaid diagram has no pre-rendered SVG. Run \`npm run mermaid\` (it also runs before \`npm run build\`).`,
      );
    }
    const attributes: MdxAttribute[] = [
      { type: "mdxJsxAttribute", name: "light", value: entry.light },
      { type: "mdxJsxAttribute", name: "dark", value: entry.dark },
    ];
    if (typeof caption === "string") attributes.push({ type: "mdxJsxAttribute", name: "caption", value: caption });
    return { type: "mdxJsxFlowElement", name: "MermaidSvg", attributes, children: [] };
  }

  function transform(parent: AnyNode) {
    if (!("children" in parent)) return;
    const children = parent.children as AnyNode[];
    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const chart = mermaidFence(node);
      if (chart !== null) {
        const replacement = svgElement(chart, node);
        if (replacement) children[i] = replacement;
        continue;
      }
      // <Figure caption="...">```mermaid ...```</Figure>
      if (node.type === "mdxJsxFlowElement" && (node as MdxJsxElement).name === "Figure") {
        const fig = node as MdxJsxElement;
        const inner = (fig.children as AnyNode[]).filter((c) => !isBlank(c));
        const figChart = inner.length === 1 ? mermaidFence(inner[0]) : null;
        if (figChart !== null) {
          const caption = fig.attributes.find((a) => a.name === "caption")?.value;
          const replacement = svgElement(figChart, inner[0], caption);
          if (replacement) children[i] = replacement;
          continue;
        }
      }
      transform(node);
    }
  }

  return (tree: Root) => transform(tree);
}
