import { z } from "zod";

// Props schema and shape check for <Compare> (kept out of the .tsx so tests can import it).

const cell = z.union([z.string(), z.boolean()]);

export const compareSchema = z
  .object({
    columns: z.array(z.string()).min(1).optional(),
    rows: z.array(z.array(cell)).optional(),
    caption: z.string().min(1).optional(),
    children: z.unknown().optional(),
  })
  .strict()
  .superRefine((p, ctx) => {
    const problem = compareShape(p.columns, p.rows, p.children !== undefined);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

export type Cell = z.output<typeof cell>;

/** Why a Compare's data does not fit together, or null when it does. */
export function compareShape(
  columns: string[] | undefined,
  rows: Cell[][] | undefined,
  hasChildren: boolean
): string | null {
  if (!columns) {
    if (rows) return "rows need columns";
    if (!hasChildren) return "give columns and rows, or a markdown table as children";
    return null;
  }
  if (!rows || rows.length === 0) return "rows are required with columns";
  const bad = rows.findIndex((r) => r.length !== columns.length);
  if (bad >= 0) return `row ${bad + 1} has ${rows[bad].length} cells, expected ${columns.length}`;
  return null;
}
