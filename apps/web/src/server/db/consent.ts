import { and, eq } from "drizzle-orm";
import type { Db } from "./client";
import { consentLog } from "./schema";

// Versions of the consent texts users agree to. Bump a version when its wording changes; the new version is
// recorded the next time the user agrees. Kept here (not in features/) so the seed script can use it too.
export const CONSENT_VERSIONS = {
  /** "I'm 18 or older, or my parent or guardian has given permission" on /sign-in (plan §8.3). */
  age_confirmation: "age-2026-11",
} as const;

/** Records the user's consent once per (kind, text version). */
export async function recordConsentOnce(
  db: Db,
  input: { userId: string; kind: "age_confirmation"; textVersion: string; country: string | null }
): Promise<void> {
  const [existing] = await db
    .select({ id: consentLog.id })
    .from(consentLog)
    .where(
      and(
        eq(consentLog.userId, input.userId),
        eq(consentLog.kind, input.kind),
        eq(consentLog.textVersion, input.textVersion)
      )
    )
    .limit(1);
  if (existing) return;
  await db.insert(consentLog).values(input);
}
