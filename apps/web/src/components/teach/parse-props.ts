import type { z } from "zod";

// Props of the teaching components come straight from MDX, so they are validated with zod at that boundary.
// A bad prop shows a red note in `next dev` and fails the production build (see InvalidProps in ./props.tsx),
// so a typo in an article never ships as a silently missing component.

export const isDev = process.env.NODE_ENV !== "production";

type Parsed<T> = { ok: true; data: T } | { ok: false; message: string };

/** One line per zod issue: "path: message". */
export function formatIssues(issues: readonly { path: readonly PropertyKey[]; message: string }[]): string {
  return issues.map((i) => (i.path.length ? `${i.path.map(String).join(".")}: ${i.message}` : i.message)).join("; ");
}

/** Validates MDX props against a schema; the message names the component. */
export function parseProps<S extends z.ZodType>(component: string, schema: S, props: unknown): Parsed<z.output<S>> {
  const result = schema.safeParse(props);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: `<${component}>: ${formatIssues(result.error.issues)}` };
}
