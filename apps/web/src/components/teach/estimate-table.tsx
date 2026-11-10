import * as React from "react";
import { z } from "zod";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Back-of-the-envelope estimates. Usage in MDX:
//   <EstimateTable
//     rows={[
//       { quantity: "Write QPS", assumption: "500M messages/day", result: "~6k/s, peak ~30k/s" },
//       { quantity: "Storage/year", assumption: "100 bytes × 500M × 365", result: "~18 TB" },
//     ]}
//     note="Round everything; the order of magnitude is what matters."
//   />

const estimateSchema = z
  .object({
    rows: z
      .array(
        z.object({ quantity: z.string().min(1), assumption: z.string().min(1), result: z.string().min(1) }).strict()
      )
      .min(1),
    note: z.string().min(1).optional(),
  })
  .strict();

export function EstimateTable(props: z.input<typeof estimateSchema>) {
  const parsed = parseProps("EstimateTable", estimateSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const { rows, note } = parsed.data;
  return (
    <figure className="my-8">
      <table>
        <thead>
          <tr>
            <th scope="col">Quantity</th>
            <th scope="col">Assumption</th>
            <th scope="col">Result</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th
                scope="row"
                className="!text-[0.9375rem] !font-medium !normal-case !tracking-normal !text-ink !border-b-hairline"
              >
                {r.quantity}
              </th>
              <td>{r.assumption}</td>
              <td className="whitespace-nowrap font-mono text-[13px] font-semibold text-ink">{r.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <figcaption className="mt-2 text-sm text-muted-foreground">{note}</figcaption>}
    </figure>
  );
}
