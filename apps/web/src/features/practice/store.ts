import "server-only";
import { and, eq, ne, sql } from "drizzle-orm";
import type { Db } from "@/server/db/client";
import { practiceRating, practiceStory } from "@/server/db/schema";
import { STORY_LIMITS } from "@/lib/stories";
import type { RatingItem, StoryInput } from "./schema";

// Per-user practice data: self-ratings of interview answers and the stories written in the story builder.
// Only API routes and the account pages call this; content pages never read it. Story text is the reader's own
// writing: it is stored and returned to its owner, and never logged.

/** A time from the browser, never later than now (a wrong clock must not make an entry unbeatable). */
const clamp = (iso: string, now: Date) => {
  const d = new Date(iso);
  return d.getTime() > now.getTime() ? now : d;
};

export async function listRatings(db: Db, userId: string) {
  const rows = await db
    .select({
      questionId: practiceRating.questionId,
      rating: practiceRating.rating,
      times: practiceRating.times,
      at: practiceRating.practisedAt,
    })
    .from(practiceRating)
    .where(eq(practiceRating.userId, userId));
  return Object.fromEntries(rows.map(({ questionId, ...entry }) => [questionId, entry]));
}

export async function listStories(db: Db, userId: string) {
  return db
    .select({
      id: practiceStory.id,
      title: practiceStory.title,
      situation: practiceStory.situation,
      action: practiceStory.action,
      result: practiceStory.result,
      learning: practiceStory.learning,
      covers: practiceStory.covers,
      updatedAt: practiceStory.updatedAt,
    })
    .from(practiceStory)
    .where(eq(practiceStory.userId, userId))
    .orderBy(sql`${practiceStory.updatedAt} desc`);
}

/** One more practice of a question, rated now. */
export async function addRating(db: Db, userId: string, questionId: string, rating: number, now = new Date()) {
  await db
    .insert(practiceRating)
    .values({ userId, questionId, rating, times: 1, practisedAt: now })
    .onConflictDoUpdate({
      target: [practiceRating.userId, practiceRating.questionId],
      set: { rating, times: sql`least(${practiceRating.times} + 1, 100000)`, practisedAt: now },
    });
}

/**
 * Merges ratings made in a browser into the account. For a question both have, the later practice sets the
 * rating and the larger count is kept. Nothing saved is ever removed.
 */
export async function mergeRatings(db: Db, userId: string, items: RatingItem[], now = new Date()) {
  if (items.length === 0) return { merged: 0 };
  const rows = items.map((i) => ({
    userId,
    questionId: i.questionId,
    rating: i.rating,
    times: i.times,
    practisedAt: clamp(i.at, now),
  }));
  await db
    .insert(practiceRating)
    .values(rows)
    .onConflictDoUpdate({
      target: [practiceRating.userId, practiceRating.questionId],
      set: {
        rating: sql`case when excluded.practised_at > ${practiceRating.practisedAt} then excluded.rating else ${practiceRating.rating} end`,
        times: sql`greatest(${practiceRating.times}, excluded.times)`,
        practisedAt: sql`greatest(${practiceRating.practisedAt}, excluded.practised_at)`,
      },
    });
  return { merged: rows.length };
}

/**
 * Saves one story. An older copy never replaces a newer one (two devices editing the same story), and a new story
 * is refused once the account holds the limit.
 */
export async function saveStory(
  db: Db,
  userId: string,
  story: StoryInput,
  now = new Date()
): Promise<"saved" | "full"> {
  const others = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(practiceStory)
    .where(and(eq(practiceStory.userId, userId), ne(practiceStory.id, story.id)));
  if ((others[0]?.n ?? 0) >= STORY_LIMITS.stories) return "full";
  const { updatedAt, ...text } = story;
  const at = clamp(updatedAt, now);
  await db
    .insert(practiceStory)
    .values({ userId, ...text, updatedAt: at, createdAt: now })
    .onConflictDoUpdate({
      target: [practiceStory.userId, practiceStory.id],
      set: { ...text, updatedAt: at },
      setWhere: sql`${practiceStory.updatedAt} <= excluded.updated_at`,
    });
  return "saved";
}

export async function deleteStory(db: Db, userId: string, id: string) {
  await db.delete(practiceStory).where(and(eq(practiceStory.userId, userId), eq(practiceStory.id, id)));
}
