// Heading ids and the "On this page" outline for MDX articles. A small rehype plugin gives every h2/h3
// a stable id (slug of its text, de-duplicated) and records it, so the server can hand the outline to the
// table of contents without scraping the DOM.

export interface DocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function textOf(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

export function rehypeHeadingIds({ headings }: { headings: DocHeading[] }) {
  return (tree: HastNode) => {
    const seen = new Map<string, number>();
    const walk = (node: HastNode) => {
      if (node.type === "element" && (node.tagName === "h2" || node.tagName === "h3")) {
        const text = textOf(node).trim();
        const base = slugify(text) || "section";
        const n = seen.get(base) ?? 0;
        seen.set(base, n + 1);
        const id = n === 0 ? base : `${base}-${n}`;
        node.properties = { ...node.properties, id };
        headings.push({ id, text, level: node.tagName === "h2" ? 2 : 3 });
        return;
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
