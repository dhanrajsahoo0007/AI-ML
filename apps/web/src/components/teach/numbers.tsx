import * as React from "react";
import { z } from "zod";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// A row of big numbers. Usage in MDX:
//   <Numbers items={[{ value: "30k", label: "writes/s at peak", hint: "5× the average" }, { value: 18, label: "TB per year" }]} />

const numbersSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            value: z.union([z.string().min(1), z.number()]),
            label: z.string().min(1),
            hint: z.string().min(1).optional(),
          })
          .strict()
      )
      .min(1),
  })
  .strict();

export function Numbers(props: z.input<typeof numbersSchema>) {
  const parsed = parseProps("Numbers", numbersSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  return (
    <dl className="my-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3 lg:grid-cols-4">
      {parsed.data.items.map((item, i) => (
        // A <dl> group must start with its <dt>; CSS order puts the number on top.
        <div key={i} className="flex flex-col bg-paper p-4">
          <dt className="order-2 mt-2 text-sm text-ink-2">{item.label}</dt>
          <dd className="order-1 font-display text-3xl font-semibold leading-none tracking-tight text-ink">
            {String(item.value)}
          </dd>
          {item.hint && <dd className="order-3 mt-0.5 text-xs text-muted-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
