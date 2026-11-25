import { z } from "zod";
import { STORY_LIMITS } from "@/lib/stories";
import { isKnownQuestionId } from "./question-ids";

// What the practice API accepts. The shapes mirror the browser stores (src/lib/practice.ts, src/lib/stories.ts)
// and the database checks in src/server/db/schema/account-data.ts; change all of them together.

/** Ratings per merge request. The browser sends more in several requests (the API body limit is 64 kB). */
export const MAX_MERGE_RATINGS = 200;

export const questionIdSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,199}$/, "question id must be lowercase letters, digits and dashes")
  .refine(isKnownQuestionId, "unknown question id");

export const ratingSchema = z.number().int().min(1).max(5);

export const ratingItemSchema = z.strictObject({
  questionId: questionIdSchema,
  rating: ratingSchema,
  times: z.number().int().min(1).max(100_000),
  at: z.iso.datetime(),
});
export type RatingItem = z.infer<typeof ratingItemSchema>;

export const storyIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{5,39}$/, "bad story id");

export const storySchema = z.strictObject({
  id: storyIdSchema,
  title: z.string().max(STORY_LIMITS.title),
  situation: z.string().max(STORY_LIMITS.part.situation),
  action: z.string().max(STORY_LIMITS.part.action),
  result: z.string().max(STORY_LIMITS.part.result),
  learning: z.string().max(STORY_LIMITS.part.learning),
  covers: z
    .array(
      z
        .string()
        .max(60)
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    )
    .max(STORY_LIMITS.covers),
  updatedAt: z.iso.datetime(),
});
export type StoryInput = z.infer<typeof storySchema>;
