import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { bookmark, progress } from "@/server/db/schema";
import type { MergeItem, ProgressKind } from "./content-key";

// Per-user progress and bookmarks (plan §8.2). Only API routes call this; pages never read it.

export async function setProgress(db: Db, userId: string, contentKey: string, kind: ProgressKind, on: boolean) {
  const now = new Date();
  if (kind === "bookmark") {
    if (on) await db.insert(bookmark).values({ userId, contentKey, createdAt: now }).onConflictDoNothing();
    else await db.delete(bookmark).where(and(eq(bookmark.userId, userId), eq(bookmark.contentKey, contentKey)));
    return;
  }
  if (on) {
    await db
      .insert(progress)
      .values({ userId, contentKey, completedAt: now, lastReadAt: now })
      .onConflictDoUpdate({
        target: [progress.userId, progress.contentKey],
        set: { completedAt: sql`coalesce(${progress.completedAt}, excluded.completed_at)`, lastReadAt: now },
      });
  } else {
    await db
      .update(progress)
      .set({ completedAt: null })
      .where(and(eq(progress.userId, userId), eq(progress.contentKey, contentKey)));
  }
}

export async function listProgress(db: Db, userId: string) {
  const [done, marks] = await Promise.all([
    db
      .select({ contentKey: progress.contentKey, completedAt: progress.completedAt, lastReadAt: progress.lastReadAt })
      .from(progress)
      .where(eq(progress.userId, userId)),
    db
      .select({ contentKey: bookmark.contentKey, createdAt: bookmark.createdAt })
      .from(bookmark)
      .where(eq(bookmark.userId, userId)),
  ]);
  return { progress: done, bookmarks: marks };
}

/**
 * Merges what a signed-out learner saved in this browser into their account (plan §8.3). Keeps the earliest
 * completion time; never removes anything that's already saved. Timestamps in the future are clamped to now.
 */
export async function mergeProgress(db: Db, userId: string, items: MergeItem[], now = new Date()) {
  const clamp = (iso: string | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.getTime() > now.getTime() ? now : d;
  };
  const completions = items.flatMap((i) => {
    const at = clamp(i.completedAt);
    return at ? [{ userId, contentKey: i.contentKey, completedAt: at, lastReadAt: at }] : [];
  });
  const marks = items.flatMap((i) => {
    const at = clamp(i.bookmarkedAt);
    return at ? [{ userId, contentKey: i.contentKey, createdAt: at }] : [];
  });
  await db.transaction(async (tx) => {
    if (completions.length) {
      await tx
        .insert(progress)
        .values(completions)
        .onConflictDoUpdate({
          target: [progress.userId, progress.contentKey],
          set: {
            completedAt: sql`least(coalesce(${progress.completedAt}, excluded.completed_at), excluded.completed_at)`,
            lastReadAt: sql`greatest(${progress.lastReadAt}, excluded.last_read_at)`,
          },
        });
    }
    if (marks.length) await tx.insert(bookmark).values(marks).onConflictDoNothing();
  });
  return { completed: completions.length, bookmarks: marks.length };
}
