import * as React from "react";
import { z } from "zod";
import { Bot, Check, Keyboard, Wrench, X } from "lucide-react";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// One turn with an AI assistant: what the candidate typed, what came back, and the verdict on it. Usage in MDX:
//   <PromptExchange verdict="fix" why="It parsed the rules but ignored precedence." tool="IDE assistant">
//     <Prompt>In `engine/parser.py`, add AND and OR …</Prompt>
//     <AiReply>Here is the updated parser: …</AiReply>
//   </PromptExchange>
// Children of <Prompt> and <AiReply> are ordinary MDX (text, lists, code fences). The verdict shows a text label and
// an icon, never colour alone. No copy button (repo rule 7). Server component, no client JavaScript.

const VERDICTS = {
  accept: { label: "Accept", tone: "green", Icon: Check },
  fix: { label: "Fix before using", tone: "orange", Icon: Wrench },
  reject: { label: "Reject", tone: "red", Icon: X },
} as const;

const schema = z
  .object({
    verdict: z.enum(["accept", "fix", "reject"]),
    why: z.string().min(1).max(240),
    tool: z.string().min(1).max(40).optional(),
    children: z.unknown(),
  })
  .strict();

type Slot = { children?: React.ReactNode };

/** The prompt the candidate types. Only meaningful as the first child of <PromptExchange>. */
export function Prompt({ children }: Slot) {
  return <>{children}</>;
}

/** What the assistant sent back. Only meaningful as the second child of <PromptExchange>. */
export function AiReply({ children }: Slot) {
  return <>{children}</>;
}

/** The <Prompt> and <AiReply> children, in that order, or null when the children are anything else. */
export function exchangeParts(children: React.ReactNode): { prompt: React.ReactNode; reply: React.ReactNode } | null {
  const parts = React.Children.toArray(children).filter((c) => !(typeof c === "string" && c.trim() === ""));
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!React.isValidElement<Slot>(a) || a.type !== Prompt) return null;
  if (!React.isValidElement<Slot>(b) || b.type !== AiReply) return null;
  return { prompt: a.props.children, reply: b.props.children };
}

const label = "flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground";
const body = "mt-2 text-[15px] leading-relaxed text-ink-2 [&>*+*]:mt-2 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0";

export function PromptExchange(props: z.input<typeof schema>) {
  const parsed = parseProps("PromptExchange", schema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { verdict, why, tool } = parsed.data;
  const parts = exchangeParts(props.children as React.ReactNode);
  if (!parts) {
    return <InvalidProps message="<PromptExchange>: children must be one <Prompt> then one <AiReply>" />;
  }
  const v = VERDICTS[verdict];

  return (
    <section
      data-prompt-exchange={verdict}
      aria-label="A prompt and the AI's reply"
      className="my-8 max-w-full overflow-hidden rounded-xl border border-hairline bg-paper"
    >
      <div className="border-b border-hairline bg-paper-2/60 p-4">
        <div className={label}>
          <Keyboard aria-hidden className="size-3.5" />
          You type
          {tool && (
            <span className="rounded-full border border-hairline bg-paper px-2 py-0.5 text-[11px] font-medium normal-case tracking-normal text-ink-2">
              {tool}
            </span>
          )}
        </div>
        <div className={body}>{parts.prompt}</div>
      </div>
      <div className="border-b border-hairline p-4">
        <div className={label}>
          <Bot aria-hidden className="size-3.5" />
          What came back
        </div>
        <div className={body}>{parts.reply}</div>
      </div>
      <div
        className="border-l-4 px-4 py-3 text-[15px] leading-relaxed text-ink"
        style={{ background: `var(--dg-${v.tone}-soft)`, borderColor: `var(--dg-${v.tone})` }}
      >
        <span className="mr-2 inline-flex items-center gap-1.5 font-semibold">
          <v.Icon aria-hidden className="size-4" style={{ color: `var(--dg-${v.tone})` }} />
          Verdict: {v.label}.
        </span>
        {why}
      </div>
    </section>
  );
}
