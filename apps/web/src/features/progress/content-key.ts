import { z } from "zod";
import { hasPageIndex, pageInfo } from "@/features/search";
import { MAX_MERGE_ITEMS } from "./local";

export { MAX_MERGE_ITEMS };

/**
 * Whether `key` names a page of this build (security review M7: otherwise anyone signed in could store unbounded
 * junk rows). The list is the build's page index (SEARCH_INDEX: every page of every `on` section). Without one
 * (`next dev`, unit tests) any well-formed key passes, but never in a production bundle: there it fails closed.
 */
export function isKnownContentKey(key: string): boolean {
  if (!hasPageIndex()) return process.env.NODE_ENV !== "production";
  return pageInfo(`/${key}`) !== undefined;
}

// `section/slug` keys for progress and bookmarks, e.g. `system-design/caching/cdn`: the page's path without the
// leading slash. Same shape rule as the database check constraint (server/db/schema/account-data.ts), and it must
// be a page that exists.
export const contentKeySchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9/_-]{0,199}$/, "content key must look like section/slug")
  .refine(isKnownContentKey, "unknown content key");

export const progressKindSchema = z.enum(["complete", "bookmark"]);
export type ProgressKind = z.infer<typeof progressKindSchema>;

export const mergeItemSchema = z.strictObject({
  contentKey: contentKeySchema,
  completedAt: z.iso.datetime().optional(),
  bookmarkedAt: z.iso.datetime().optional(),
});
export type MergeItem = z.infer<typeof mergeItemSchema>;
