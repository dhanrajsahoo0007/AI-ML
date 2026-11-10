import * as React from "react";
import { Lightbulb } from "lucide-react";

// The one-sentence summary at the top of a concept page. Usage in MDX:
//   <KeyIdea>A cache trades freshness for speed.</KeyIdea>
export function KeyIdea({ children }: { children: React.ReactNode }) {
  return (
    <aside
      className="my-8 rounded-xl border-l-4 p-4 sm:p-5"
      style={{ background: "var(--dg-green-soft)", borderColor: "var(--dg-green)" }}
      aria-label="In one sentence"
    >
      {/* Tone colour on the icon and border only; the label stays ink so it passes AA contrast. */}
      <div className="flex items-center gap-2 font-display font-semibold text-ink">
        <Lightbulb aria-hidden className="size-4" style={{ color: "var(--dg-green)" }} />
        In one sentence
      </div>
      <div className="mt-2 text-[17px] font-medium leading-relaxed text-ink [&>*+*]:mt-2">{children}</div>
    </aside>
  );
}
