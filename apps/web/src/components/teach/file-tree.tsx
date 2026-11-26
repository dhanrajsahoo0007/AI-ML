import * as React from "react";
import type { z } from "zod";
import { File, Folder } from "lucide-react";
import { buildTree, fileTreeSchema, type FileTag, type TreeNode } from "./file-tree-model";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// A scenario repo as a tree, built from flat paths (folders first, then files, in the order given). Usage in MDX:
//   <FileTree root="rule_engine/" items={[{ path: "engine/parser.py", note: "Turns rule text into tokens", tag: "edit" }]} />
// Server component, no client JavaScript. Each row stays on one line; the box scrolls sideways on a phone.

// The tag is a text badge; the tone shows only on its border, so the ink label keeps AA contrast in both themes.
const TAG_TONE: Record<FileTag, string> = {
  read: "var(--dg-neutral)",
  edit: "var(--dg-blue)",
  new: "var(--dg-green)",
  bug: "var(--dg-red)",
  test: "var(--dg-violet)",
};

function Row({ node, depth }: { node: TreeNode; depth: number }) {
  const indent = { paddingLeft: `${depth * 1.25}rem` };
  if (node.kind === "folder") {
    return (
      <li>
        <div className="flex items-center gap-2 py-0.5" style={indent}>
          <Folder aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-mono text-[13px] font-semibold text-ink">{node.name}/</span>
        </div>
        <ul className="m-0 list-none p-0">
          {node.children.map((c) => (
            <Row key={`${c.kind}:${c.name}`} node={c} depth={depth + 1} />
          ))}
        </ul>
      </li>
    );
  }
  const { note, tag } = node.item;
  return (
    <li className="flex items-center gap-2 py-0.5" style={indent} data-path={node.item.path}>
      <File aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="font-mono text-[13px] text-ink">{node.name}</span>
      {tag && (
        <span
          className="rounded border px-1.5 py-px font-mono text-[11px] leading-tight text-ink"
          style={{ borderColor: TAG_TONE[tag] }}
        >
          {tag}
        </span>
      )}
      {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
    </li>
  );
}

export function FileTree(props: z.input<typeof fileTreeSchema>) {
  const parsed = parseProps("FileTree", fileTreeSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { root, items } = parsed.data;
  const tree = buildTree(items);

  return (
    <figure
      data-file-tree
      className="not-prose my-8 max-w-full overflow-x-auto rounded-xl border border-hairline bg-paper p-4"
      aria-label={root ? `Files in ${root}` : "Files in the repo"}
    >
      <div className="min-w-max whitespace-nowrap">
        {root && (
          <div className="flex items-center gap-2 pb-1">
            <Folder aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-mono text-[13px] font-semibold text-ink">{root}</span>
          </div>
        )}
        <ul className="m-0 list-none p-0">
          {tree.map((n) => (
            <Row key={`${n.kind}:${n.name}`} node={n} depth={root ? 1 : 0} />
          ))}
        </ul>
      </div>
    </figure>
  );
}
