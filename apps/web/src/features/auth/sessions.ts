import { and, desc, eq, notInArray } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { session } from "@/server/db/schema";

/** At most this many signed-in devices per user (plan §8.3: discourages account sharing). */
export const MAX_SESSIONS_PER_USER = 3;

/** Keeps the newest sessions of a user and revokes the rest. Runs after every session is created. */
export async function enforceSessionLimit(db: Db, userId: string, keep = MAX_SESSIONS_PER_USER): Promise<number> {
  const newest = db
    .select({ id: session.id })
    .from(session)
    .where(eq(session.userId, userId))
    // UUIDv7 ids are time-ordered, so they break ties between sessions created in the same millisecond.
    .orderBy(desc(session.createdAt), desc(session.id))
    .limit(keep);
  const revoked = await db
    .delete(session)
    .where(and(eq(session.userId, userId), notInArray(session.id, newest)))
    .returning({ id: session.id });
  return revoked.length;
}

/** "Sign out everywhere": revokes every session of the user. */
export async function revokeAllSessions(db: Db, userId: string): Promise<number> {
  const revoked = await db.delete(session).where(eq(session.userId, userId)).returning({ id: session.id });
  return revoked.length;
}

/** Re-authentication window for export and delete (plan §11.2). */
const REAUTH_WINDOW_MS = 10 * 60 * 1000;

export function isFreshSession(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() <= REAUTH_WINDOW_MS;
}
