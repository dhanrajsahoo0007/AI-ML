// The callouts an issue may use, written in GitHub alert syntax so the file stays plain Markdown:
//
//   > [!NOTE]
//   > A model reads its whole context window on every call.
//
// The web page shows them as tinted boxes (issue-body.tsx), the email as a labelled quote (email-issue.ts).
// Plain data, no JSX, so content-check and the send script can load it.

export const CALLOUTS = {
  NOTE: { label: "In plain English", tone: "blue", icon: "message-circle" },
  IMPORTANT: { label: "Key idea", tone: "violet", icon: "sparkles" },
  WARNING: { label: "Common trap", tone: "orange", icon: "alert-triangle" },
  TIP: { label: "Try it", tone: "green", icon: "lightbulb" },
} as const;
export type CalloutType = keyof typeof CALLOUTS;

export const isCalloutType = (t: string): t is CalloutType => Object.hasOwn(CALLOUTS, t);

/** Data attribute the remark plugin puts on a callout blockquote. */
export const CALLOUT_ATTR = "data-callout";

// ── remark plugin ────────────────────────────────────────────────────────────────────────────────

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, string> };
}

/**
 * Marks `> [!TYPE]` blockquotes: strips the marker and sets `data-callout="TYPE"` on the rendered blockquote,
 * which the web and email `blockquote` components read. Unknown types are left as plain quotes (content-check
 * reports them).
 */
export function remarkCallouts() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (node.type === "blockquote") mark(node);
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

function mark(quote: MdNode) {
  const para = quote.children?.[0];
  const first = para?.type === "paragraph" ? para.children?.[0] : undefined;
  if (first?.type !== "text" || !first.value) return;
  const m = /^\[!([A-Za-z]+)\][ \t]*\n?/.exec(first.value);
  if (!m) return;
  const type = m[1].toUpperCase();
  if (!isCalloutType(type)) return;
  first.value = first.value.slice(m[0].length);
  if (!first.value) para!.children!.shift();
  // A leading line break left behind by the marker line.
  if (para!.children![0]?.type === "break") para!.children!.shift();
  if (para!.children!.length === 0) quote.children!.shift();
  quote.data = { ...quote.data, hProperties: { ...quote.data?.hProperties, [CALLOUT_ATTR]: type } };
}
