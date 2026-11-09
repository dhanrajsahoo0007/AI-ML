import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { Clock } from "lucide-react";
import { formatMinutes, totalMinutes } from "./learning-path-time";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// An ordered reading list for a hub. Usage in MDX:
//   <LearningPath
//     title="Databases in a week"
//     steps={[
//       { title: "Indexes", href: "/…/indexes", minutes: 20 },
//       { title: "Transactions", href: "/…/transactions", minutes: 30 },
//     ]}
//   />

const learningPathSchema = z
  .object({
    title: z.string().min(1),
    steps: z
      .array(
        z
          .object({
            title: z.string().min(1),
            href: z.string().min(1),
            minutes: z.number().int().positive().optional(),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

export function LearningPath(props: z.input<typeof learningPathSchema>) {
  const parsed = parseProps("LearningPath", learningPathSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { title, steps } = parsed.data;
  const total = totalMinutes(steps);

  return (
    <nav className="my-8 rounded-xl border border-hairline bg-paper" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline px-4 py-3 sm:px-5">
        <span className="font-display font-semibold text-ink">{title}</span>
        {total > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock aria-hidden className="size-3.5" /> {formatMinutes(total)} in {steps.length} steps
          </span>
        )}
      </div>
      <ol className="!m-0 divide-y divide-hairline !p-0 !list-none">
        {steps.map((s, i) => (
          <li key={s.href} className="!m-0">
            <Link
              href={s.href}
              className="flex items-center gap-3 px-4 py-3 !no-underline transition-colors hover:bg-paper-2/60 sm:px-5"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 font-medium text-ink">{s.title}</span>
              {s.minutes !== undefined && (
                <span className="shrink-0 text-xs text-muted-foreground">{formatMinutes(s.minutes)}</span>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
