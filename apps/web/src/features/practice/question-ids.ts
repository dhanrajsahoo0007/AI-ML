// The interview questions a rating may be saved for: the ids of this build's leadership-track questions, written by
// scripts/gen-runtime-data.ts and inlined by next.config.ts as PRACTICE_IDS. Without the check anyone signed in
// could store unbounded junk rows (the same reason progress keys are checked: security review M7).
let cache: { from: string | undefined; ids: Set<string> } | null = null;

function ids(): Set<string> {
  const from = process.env.PRACTICE_IDS;
  if (!cache || cache.from !== from) cache = { from, ids: new Set(JSON.parse(from || "[]") as string[]) };
  return cache.ids;
}

/**
 * Whether `id` is a question of this build that can be practised. Without a list (`next dev`, unit tests) any
 * well-formed id passes, but never in a production bundle: there it fails closed.
 */
export function isKnownQuestionId(id: string): boolean {
  const known = ids();
  if (known.size === 0) return process.env.NODE_ENV !== "production";
  return known.has(id);
}
