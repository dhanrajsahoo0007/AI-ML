import { z } from "zod";

// Data and pure helpers for <DecisionTree>: a yes/no tree whose leaves are answers.

interface TreeLeaf {
  answer: string;
  href?: string;
}

interface TreeQuestion {
  q: string;
  yes: TreeNode;
  no: TreeNode;
}

export type TreeNode = string | TreeLeaf | TreeQuestion;

const leafSchema = z.object({ answer: z.string().min(1), href: z.string().min(1).optional() }).strict();

const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.union([
    z.string().min(1),
    leafSchema,
    z.object({ q: z.string().min(1), yes: treeNodeSchema, no: treeNodeSchema }).strict(),
  ])
);

export const decisionTreeSchema = z.object({ tree: treeNodeSchema, title: z.string().min(1).optional() }).strict();

export function isQuestion(node: TreeNode): node is TreeQuestion {
  return typeof node === "object" && "q" in node;
}

/** A leaf in object form, whatever shape the author wrote. */
export function leafOf(node: string | TreeLeaf): TreeLeaf {
  return typeof node === "string" ? { answer: node } : node;
}

/** Follows the answers from the root. Stops at a leaf even if more answers are given. */
export function nodeAt(tree: TreeNode, answers: readonly boolean[]): TreeNode {
  let node = tree;
  for (const yes of answers) {
    if (!isQuestion(node)) break;
    node = yes ? node.yes : node.no;
  }
  return node;
}

/** The questions answered so far, each with the answer given, for the path display. */
export function pathTaken(tree: TreeNode, answers: readonly boolean[]): { q: string; yes: boolean }[] {
  const out: { q: string; yes: boolean }[] = [];
  let node = tree;
  for (const yes of answers) {
    if (!isQuestion(node)) break;
    out.push({ q: node.q, yes });
    node = yes ? node.yes : node.no;
  }
  return out;
}
