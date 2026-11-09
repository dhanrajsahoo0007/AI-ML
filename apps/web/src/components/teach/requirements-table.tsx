import * as React from "react";
import { z } from "zod";
import { duplicateAnchors, requirementAnchor } from "./anchors";
import { parseProps } from "./parse-props";
import { InvalidProps } from "./props";

// Case-study requirements with one anchor per row (id "req-<id>"), so a diagram step can link to #req-F1.
//   <RequirementsTable kind="functional" rows={[{ id: "F1", requirement: "Send a message", notes: "1:1 and groups" }]} />
//   <RequirementsTable kind="non-functional" rows={[{ id: "N1", property: "Latency", target: "p99 < 200 ms", why: "Chat feels instant" }]} />

const id = z.string().min(1);

const requirementsSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        kind: z.literal("functional"),
        rows: z.array(z.object({ id, requirement: z.string().min(1), notes: z.string().optional() }).strict()).min(1),
      })
      .strict(),
    z
      .object({
        kind: z.literal("non-functional"),
        rows: z
          .array(
            z
              .object({ id, property: z.string().min(1), target: z.string().min(1), why: z.string().optional() })
              .strict()
          )
          .min(1),
      })
      .strict(),
  ])
  .superRefine((p, ctx) => {
    const dupes = duplicateAnchors(p.rows.map((r) => r.id));
    if (dupes.length) ctx.addIssue({ code: "custom", path: ["rows"], message: `duplicate ids: ${dupes.join(", ")}` });
  });

const idCell =
  "w-14 whitespace-nowrap font-mono !text-xs !font-semibold !normal-case !tracking-normal !text-ink !border-b-hairline";

export function RequirementsTable(props: z.input<typeof requirementsSchema>) {
  const parsed = parseProps("RequirementsTable", requirementsSchema, props);
  if (!parsed.ok) return <InvalidProps message={parsed.message} />;
  const data = parsed.data;

  return (
    <table className="my-8">
      <thead>
        <tr>
          <th scope="col">ID</th>
          {data.kind === "functional" ? (
            <>
              <th scope="col">Requirement</th>
              <th scope="col">Notes</th>
            </>
          ) : (
            <>
              <th scope="col">Property</th>
              <th scope="col">Target</th>
              <th scope="col">Why</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {data.kind === "functional"
          ? data.rows.map((r) => (
              <tr key={r.id} id={requirementAnchor(r.id)} className="scroll-mt-24 target:bg-paper-2/60">
                <th scope="row" className={idCell}>
                  {r.id}
                </th>
                <td className="text-ink">{r.requirement}</td>
                <td>{r.notes}</td>
              </tr>
            ))
          : data.rows.map((r) => (
              <tr key={r.id} id={requirementAnchor(r.id)} className="scroll-mt-24 target:bg-paper-2/60">
                <th scope="row" className={idCell}>
                  {r.id}
                </th>
                <td className="text-ink">{r.property}</td>
                <td className="whitespace-nowrap font-mono text-[13px]">{r.target}</td>
                <td>{r.why}</td>
              </tr>
            ))}
      </tbody>
    </table>
  );
}
