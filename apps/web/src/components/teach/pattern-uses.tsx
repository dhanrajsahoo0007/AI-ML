import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { ArrowRight } from "lucide-react";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Where a pattern shows up in the case studies. An explicit list for now; a later version can derive it from
// the diagram specs. Usage in MDX:
//   <PatternUses pattern="Consistent hashing" uses={[{ title: "Design a key-value store", href: "/…", note: "Partitioning" }]} />

const patternUsesSchema = z
  .object({
    pattern: z.string().min(1),
    uses: z
      .array(
        z.object({ title: z.string().min(1), href: z.string().min(1), note: z.string().min(1).optional() }).strict()
      )
      .min(1),
  })
  .strict();

export function PatternUses(props: z.input<typeof patternUsesSchema>) {
  const parsed = parseProps("PatternUses", patternUsesSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { pattern, uses } = parsed.data;
  return (
    <nav className="my-8 rounded-xl border border-hairline bg-paper" aria-label={`Where ${pattern} is used`}>
      <div className="border-b border-hairline px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground sm:px-5">
        Where {pattern} is used
      </div>
      <ul className="!m-0 divide-y divide-hairline !p-0">
        {uses.map((u) => (
          <li key={u.href} className="!m-0 !pl-0 before:!hidden">
            <Link
              href={u.href}
              className="group flex items-center justify-between gap-3 px-4 py-3 !no-underline transition-colors hover:bg-paper-2/60 sm:px-5"
            >
              <span className="min-w-0">
                <span className="block font-medium text-ink">{u.title}</span>
                {u.note && <span className="mt-0.5 block text-sm text-muted-foreground">{u.note}</span>}
              </span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
