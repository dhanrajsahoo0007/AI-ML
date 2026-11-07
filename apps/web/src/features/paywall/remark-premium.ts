import { DEFAULT_PREVIEW_BLOCKS, PREMIUM_BREAK } from "./constants";

// remark plugin that splits a premium article into its preview at build time (plan §9.2). The cut is made on
// the Markdown tree, before anything is compiled, so the premium part of a preview never reaches the
// renderer, the RSC payload or the table of contents. The full variant only drops the <PremiumBreak /> marker.

// The few mdast fields used here (top-level nodes of a Markdown/MDX tree), so no extra type package is needed.
export interface MdNode {
  type: string;
  name?: unknown;
}
interface MdRoot {
  children: MdNode[];
}

export interface PremiumSplit {
  /** `preview` keeps the first blocks only; `full` keeps everything. */
  mode: "full" | "preview";
  /** Top-level blocks in the preview (frontmatter `preview`); a <PremiumBreak /> marker wins. */
  blocks?: number;
}

// Nodes that render nothing on their own, so they don't count as a block of the preview.
const NON_BLOCK = new Set(["mdxjsEsm", "yaml", "toml", "definition"]);

function isBreak(node: MdNode): boolean {
  return node.type === "mdxJsxFlowElement" && node.name === PREMIUM_BREAK;
}

/**
 * The top-level nodes a preview keeps: everything before a <PremiumBreak /> marker, or else the first `blocks`
 * blocks (imports and definitions are kept but not counted). `truncated` is false when nothing was cut.
 */
export function previewNodes<N extends MdNode>(
  children: readonly N[],
  blocks: number = DEFAULT_PREVIEW_BLOCKS
): { nodes: N[]; truncated: boolean } {
  const marker = children.findIndex(isBreak);
  if (marker !== -1) return { nodes: children.slice(0, marker), truncated: marker < children.length - 1 };
  const limit = Math.max(0, Math.floor(blocks));
  const nodes: N[] = [];
  let counted = 0;
  for (const [i, node] of children.entries()) {
    if (NON_BLOCK.has(node.type)) {
      nodes.push(node);
      continue;
    }
    if (counted === limit) return { nodes, truncated: children.slice(i).some((n) => !NON_BLOCK.has(n.type)) };
    nodes.push(node);
    counted++;
  }
  return { nodes, truncated: false };
}

export function remarkPremium(options: PremiumSplit) {
  return <T extends MdRoot>(tree: T) => {
    tree.children =
      options.mode === "preview"
        ? previewNodes(tree.children, options.blocks).nodes
        : tree.children.filter((node) => !isBreak(node));
  };
}
