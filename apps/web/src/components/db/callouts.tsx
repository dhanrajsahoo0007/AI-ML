import React from "react";
import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icons";
import type { Tone } from "./types";

// Small layout blocks that break long explanations into scannable pieces.

// Numbered cards in a grid. Usage: <StepCards><StepCard n={1} title="...">body</StepCard></StepCards>
export function StepCards({ children }: { children: React.ReactNode }) {
  return <div className="my-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex size-7 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper">
          {n}
        </span>
        <span className="font-display font-semibold leading-tight text-ink">{title}</span>
      </div>
      <div className="mt-2 text-sm leading-relaxed text-ink-2 [&>*+*]:mt-2">{children}</div>
    </div>
  );
}

// Highlighted aside. Usage: <Callout tone="green" title="Rule of thumb" icon="lightbulb">...</Callout>
export function Callout({
  tone = "blue",
  title,
  icon,
  children,
}: {
  tone?: Tone;
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="my-8 rounded-xl border-l-4 p-4 sm:p-5"
      style={{ background: `var(--dg-${tone}-soft)`, borderColor: `var(--dg-${tone})` }}
    >
      <div className={cn("flex items-center gap-2 font-display font-semibold [&_svg]:size-4")} style={{ color: `var(--dg-${tone})` }}>
        {icon && resolveIcon(icon)}
        {title}
      </div>
      <div className="mt-2 text-[15px] leading-relaxed text-ink-2 [&>*+*]:mt-2">{children}</div>
    </div>
  );
}
