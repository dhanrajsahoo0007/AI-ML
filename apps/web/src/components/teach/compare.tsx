import * as React from "react";
import type { z } from "zod";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { compareSchema, type Cell } from "./compare-schema";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// A comparison table. Two forms:
//   <Compare columns={["", "SQL", "NoSQL"]} rows={[["Joins", true, false]]} caption="..." />
//   <Compare caption="...">  (blank line)  | markdown | table |  (blank line)  </Compare>
// Booleans render as a tick or a cross; the first column stays visible while the table scrolls sideways.

// The first cell of every row stays put while the rest scrolls (the prose table is its own scroll box).
const stickyFirst =
  "[&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-10 [&_tr>*:first-child]:bg-paper [&_tr>*:first-child]:pr-4";

// The table must also be the containing block of its cells' absolutely positioned children (the sr-only "Yes" and
// "No" under each tick and cross). Otherwise their containing block is far up the page, outside the table's scroll
// box, so the ones in columns scrolled out of view are not clipped and widen the whole page on a phone.
const scrollBox = "relative";

function CellValue({ value }: { value: Cell }) {
  if (typeof value === "string") return <>{value}</>;
  return value ? (
    <span className="inline-flex items-center" style={{ color: "var(--dg-green)" }}>
      <Check aria-hidden className="size-4" />
      <span className="sr-only">Yes</span>
    </span>
  ) : (
    <span className="inline-flex items-center" style={{ color: "var(--dg-red)" }}>
      <X aria-hidden className="size-4" />
      <span className="sr-only">No</span>
    </span>
  );
}

export function Compare(props: z.input<typeof compareSchema>) {
  const parsed = parseProps("Compare", compareSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { columns, rows, caption } = parsed.data;
  const children = props.children as React.ReactNode;

  return (
    <figure className="my-8">
      {columns && rows ? (
        <table className={cn("compare", scrollBox, stickyFirst)}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i} scope="col">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((value, ci) =>
                  ci === 0 ? (
                    <th
                      key={ci}
                      scope="row"
                      className="!text-[0.9375rem] !font-medium !normal-case !tracking-normal !text-ink !border-b-hairline"
                    >
                      <CellValue value={value} />
                    </th>
                  ) : (
                    <td key={ci}>
                      <CellValue value={value} />
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className={cn("[&>table]:!my-0 [&>table]:relative", stickyFirst)}>{children}</div>
      )}
      {caption && <figcaption className="mt-2 text-sm text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}
