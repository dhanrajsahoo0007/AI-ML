import { z } from "zod";

// Data and pure helpers for <FileTree>: a scenario repo drawn as a tree from a flat list of file paths.

export const FILE_TAGS = ["read", "edit", "new", "bug", "test"] as const;
export type FileTag = (typeof FILE_TAGS)[number];

const segment = /^[^/\s]+$/;

const itemSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .refine((p) => p.split("/").every((s) => segment.test(s) && s !== "." && s !== ".."), {
        message: "a relative file path with no leading or trailing slash, no spaces and no . or .. segments",
      }),
    note: z.string().min(1).max(120).optional(),
    tag: z.enum(FILE_TAGS).optional(),
  })
  .strict();

type FileTreeItem = z.output<typeof itemSchema>;

export const fileTreeSchema = z
  .object({
    root: z.string().min(1).max(60).optional(),
    items: z.array(itemSchema).min(1).max(40),
  })
  .strict()
  .superRefine((p, ctx) => {
    const problem = treeProblem(p.items.map((i) => i.path));
    if (problem) ctx.addIssue({ code: "custom", path: ["items"], message: problem });
  });

/** Why a list of paths cannot form a tree (a duplicate, or a path that is both a file and a folder), or null. */
export function treeProblem(paths: string[]): string | null {
  const files = new Set<string>();
  for (const p of paths) {
    if (files.has(p)) return `duplicate path ${p}`;
    files.add(p);
  }
  for (const p of paths) {
    const parts = p.split("/");
    for (let i = 1; i < parts.length; i++) {
      const folder = parts.slice(0, i).join("/");
      if (files.has(folder)) return `${folder} is listed as a file but ${p} puts files inside it`;
    }
  }
  return null;
}

export interface FolderNode {
  kind: "folder";
  name: string;
  children: TreeNode[];
}

export interface FileNode {
  kind: "file";
  name: string;
  item: FileTreeItem;
}

export type TreeNode = FolderNode | FileNode;

/**
 * Builds the tree: at every level folders come first, then files; folders keep the order in which they first
 * appear in `items`, files keep the order given.
 */
export function buildTree(items: readonly FileTreeItem[]): TreeNode[] {
  const root: FolderNode = { kind: "folder", name: "", children: [] };
  for (const item of items) {
    const parts = item.path.split("/");
    let at = root;
    for (const name of parts.slice(0, -1)) {
      let next = at.children.find((c): c is FolderNode => c.kind === "folder" && c.name === name);
      if (!next) {
        next = { kind: "folder", name, children: [] };
        at.children.push(next);
      }
      at = next;
    }
    at.children.push({ kind: "file", name: parts[parts.length - 1], item });
  }
  const order = (nodes: TreeNode[]): TreeNode[] => [
    ...nodes.filter((n): n is FolderNode => n.kind === "folder").map((f) => ({ ...f, children: order(f.children) })),
    ...nodes.filter((n) => n.kind === "file"),
  ];
  return order(root.children);
}
