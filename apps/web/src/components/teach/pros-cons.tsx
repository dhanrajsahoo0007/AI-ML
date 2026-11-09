import * as React from "react";
import { z } from "zod";
import { Check, Minus } from "lucide-react";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Two columns of short points. Usage in MDX:
//   <ProsCons pros={["Simple", "Cheap"]} cons={["Single point of failure"]} />

const prosConsSchema = z
  .object({
    pros: z.array(z.string().min(1)).min(1),
    cons: z.array(z.string().min(1)).min(1),
  })
  .strict();

// The column titles are labels, not headings, so they do not break the article's heading outline.
function Column({
  title,
  tone,
  icon,
  items,
}: {
  title: string;
  tone: "green" | "red";
  icon: React.ReactNode;
  items: string[];
}) {
  const labelId = React.useId();
  return (
    <div className="rounded-xl border border-hairline bg-paper p-4">
      <p id={labelId} className="!mt-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
        {title}
      </p>
      <ul aria-labelledby={labelId} className="!mt-2 !p-0 text-[15px] leading-relaxed text-ink-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 !pl-0 before:!hidden">
            <span className="mt-1 shrink-0 [&_svg]:size-4" style={{ color: `var(--dg-${tone})` }} aria-hidden>
              {icon}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProsCons(props: z.input<typeof prosConsSchema>) {
  const parsed = parseProps("ProsCons", prosConsSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { pros, cons } = parsed.data;
  return (
    <div className="my-8 grid gap-3 sm:grid-cols-2">
      <Column title="Pros" tone="green" icon={<Check />} items={pros} />
      <Column title="Cons" tone="red" icon={<Minus />} items={cons} />
    </div>
  );
}
