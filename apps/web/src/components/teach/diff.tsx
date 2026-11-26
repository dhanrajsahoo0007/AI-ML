import * as React from "react";
import type { z } from "zod";
import { MessageCircle, OctagonAlert, TriangleAlert } from "lucide-react";
import { commentProblem, diffSchema, fenceOf, parseDiff, type DiffLine, type Severity } from "./diff-model";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// One hunk of a pull request with review comments under the lines they are about. Usage in MDX:
//   <Diff file="batcher/processor.py" hunk="@@ -40,7 +40,12 @@" comments={[{ line: 4, severity: "blocker", text: "…" }]}>
//
//   ```diff
//   …
//   ```
//
//   </Diff>
// `line` is the 1-based line of the fence. Added and removed lines carry a +/- gutter and a screen-reader label, so
// the change never rests on colour alone. Server component, no client JavaScript; the box scrolls sideways.

const SEVERITY: Record<Severity, { label: string; tone: string; Icon: typeof OctagonAlert }> = {
  blocker: { label: "Blocker", tone: "red", Icon: OctagonAlert },
  "should-fix": { label: "Should fix", tone: "orange", Icon: TriangleAlert },
  nit: { label: "Nit", tone: "blue", Icon: MessageCircle },
};

const ROW_BG: Record<DiffLine["kind"], string | undefined> = {
  add: "var(--dg-green-soft)",
  del: "var(--dg-red-soft)",
  context: undefined,
  meta: "var(--dg-neutral-soft)",
};
const GUTTER: Record<DiffLine["kind"], string> = { add: "+", del: "-", context: " ", meta: " " };
const SR_LABEL: Partial<Record<DiffLine["kind"], string>> = { add: "Added: ", del: "Removed: " };

const num = "w-10 select-none px-2 text-right align-top text-muted-foreground";

export function Diff(props: z.input<typeof diffSchema> & { children?: React.ReactNode }) {
  const parsed = parseProps("Diff", diffSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { file, hunk, comments = [] } = parsed.data;
  const fence = fenceOf(props.children);
  if (!fence || fence.lang !== "diff") {
    return <InvalidProps message="<Diff>: children must be exactly one ```diff code fence" />;
  }
  const lines = parseDiff(fence.text, hunk);
  const problem = commentProblem(lines.length, comments);
  if (problem) return <InvalidProps message={`<Diff>: comments: ${problem}`} />;
  const numbered = Boolean(hunk);
  const cols = numbered ? 4 : 2;

  return (
    <figure data-diff className="not-prose my-8 max-w-full overflow-hidden rounded-xl border border-hairline bg-paper">
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hairline bg-paper-2/50 px-4 py-2">
        <span className="font-mono text-[13px] font-semibold text-ink">{file}</span>
        {hunk && <span className="font-mono text-[12px] text-muted-foreground">{hunk}</span>}
      </figcaption>
      <div className="max-w-full overflow-x-auto">
        <table className="m-0 w-full min-w-max border-collapse font-mono text-[13px] leading-relaxed">
          <tbody>
            {lines.map((l) => (
              <React.Fragment key={l.n}>
                <tr data-kind={l.kind} style={{ background: ROW_BG[l.kind] }}>
                  {numbered && <td className={num}>{l.oldNo ?? ""}</td>}
                  {numbered && <td className={num}>{l.newNo ?? ""}</td>}
                  <td aria-hidden className="w-6 select-none text-center align-top font-semibold text-ink">
                    {GUTTER[l.kind]}
                  </td>
                  <td
                    className={
                      l.kind === "meta" ? "whitespace-pre pr-4 text-muted-foreground" : "whitespace-pre pr-4 text-ink"
                    }
                  >
                    {SR_LABEL[l.kind] && <span className="sr-only">{SR_LABEL[l.kind]}</span>}
                    {l.text || " "}
                  </td>
                </tr>
                {comments
                  .filter((c) => c.line === l.n)
                  .map((c, i) => {
                    const s = SEVERITY[c.severity];
                    return (
                      <tr key={`c${i}`} data-comment={c.severity}>
                        <td colSpan={cols} className="px-2 py-1.5">
                          <div
                            className="sticky left-2 max-w-[min(40rem,calc(100vw-4rem))] whitespace-normal rounded-lg border-l-4 px-3 py-2 font-sans text-[14px] leading-relaxed text-ink"
                            style={{ background: `var(--dg-${s.tone}-soft)`, borderColor: `var(--dg-${s.tone})` }}
                          >
                            <span className="mr-2 inline-flex items-center gap-1 font-semibold">
                              <s.Icon aria-hidden className="size-3.5" style={{ color: `var(--dg-${s.tone})` }} />
                              {s.label}:
                            </span>
                            {c.text}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
