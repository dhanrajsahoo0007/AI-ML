import { z } from "zod";
import { MAX_MERGE_ITEMS } from "./local";

export { MAX_MERGE_ITEMS };

// `section/slug` keys for progress and bookmarks, e.g. `system-design/caching/cdn`. Same rule as the database
// check constraint (server/db/schema/account-data.ts).
export const contentKeySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9/_-]{0,199}$/, "content key must look like section/slug");

export const progressKindSchema = z.enum(["complete", "bookmark"]);
export type ProgressKind = z.infer<typeof progressKindSchema>;

export const mergeItemSchema = z.strictObject({
  contentKey: contentKeySchema,
  completedAt: z.iso.datetime().optional(),
  bookmarkedAt: z.iso.datetime().optional(),
});
export type MergeItem = z.infer<typeof mergeItemSchema>;
