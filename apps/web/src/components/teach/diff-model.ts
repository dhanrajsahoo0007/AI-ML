import * as React from "react";
import { z } from "zod";

// Data and pure helpers for <Diff>: one hunk of a unified diff with review comments pinned to its lines.

export const SEVERITIES = ["blocker", "should-fix", "nit"] as const;
export type Severity = (typeof SEVERITIES)[number];

const MAX_COMMENTS = 8;
const HUNK_RE = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

const commentSchema = z
  .object({
    line: z.number().int().min(1),
    severity: z.enum(SEVERITIES),
    text: z.string().min(1).max(400),
  })
  .strict();

type DiffComment = z.output<typeof commentSchema>;

export const diffSchema = z
  .object({
    file: z.string().min(1).max(120),
    hunk: z.string().regex(HUNK_RE, "a hunk header such as @@ -40,7 +40,12 @@").optional(),
    comments: z.array(commentSchema).max(MAX_COMMENTS).optional(),
    children: z.unknown(),
  })
  .strict();

export type DiffLineKind = "add" | "del" | "context" | "meta";

export interface DiffLine {
  /** 1-based line of the fence. */
  n: number;
  kind: DiffLineKind;
  /** The line without its +, - or space prefix (meta lines keep their whole text). */
  text: string;
  /** Line numbers in the old and new file, when the hunk header gives a start. */
  oldNo?: number;
  newNo?: number;
}

/**
 * The text and language of the single code fence among `children` (MDX gives `<pre><code className="language-x">`).
 * Null when there is no fence or more than one.
 */
export function fenceOf(children: React.ReactNode): { lang: string | null; text: string } | null {
  const found: { lang: string | null; text: string }[] = [];
  const textOf = (node: React.ReactNode): string => {
    if (typeof node === "string" || typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(textOf).join("");
    if (React.isValidElement<{ children?: React.ReactNode }>(node)) return textOf(node.props.children);
    return "";
  };
  const visit = (node: React.ReactNode) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!React.isValidElement<{ className?: string; children?: React.ReactNode }>(node)) return;
    const { className, children: inner } = node.props;
    if (node.type === "code" || (typeof className === "string" && className.includes("language-"))) {
      const lang = className?.split(" ").find((c) => c.startsWith("language-"));
      found.push({ lang: lang ? lang.slice("language-".length) : null, text: textOf(inner) });
      return;
    }
    visit(inner);
  };
  visit(children);
  return found.length === 1 ? found[0] : null;
}

/** Splits the fence into lines (one trailing newline dropped) and numbers them from the hunk header. */
export function parseDiff(text: string, hunk?: string): DiffLine[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  const start = hunk ? HUNK_RE.exec(hunk) : null;
  let oldNo = start ? Number(start[1]) : undefined;
  let newNo = start ? Number(start[2]) : undefined;
  return raw.map((line, i): DiffLine => {
    const n = i + 1;
    if (line.startsWith("@@") || line.startsWith("+++ ") || line.startsWith("--- ") || line.startsWith("\\")) {
      return { n, kind: "meta", text: line };
    }
    if (line.startsWith("+")) {
      const out: DiffLine = { n, kind: "add", text: line.slice(1), newNo };
      if (newNo !== undefined) newNo++;
      return out;
    }
    if (line.startsWith("-")) {
      const out: DiffLine = { n, kind: "del", text: line.slice(1), oldNo };
      if (oldNo !== undefined) oldNo++;
      return out;
    }
    const out: DiffLine = { n, kind: "context", text: line.startsWith(" ") ? line.slice(1) : line, oldNo, newNo };
    if (oldNo !== undefined) oldNo++;
    if (newNo !== undefined) newNo++;
    return out;
  });
}

/** Why the comments do not fit the fence (a line out of range), or null. */
export function commentProblem(lineCount: number, comments: readonly DiffComment[]): string | null {
  const bad = comments.find((c) => c.line > lineCount);
  return bad ? `comment on line ${bad.line}, but the diff has ${lineCount} lines` : null;
}
