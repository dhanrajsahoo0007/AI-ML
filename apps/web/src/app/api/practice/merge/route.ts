import { z } from "zod";
import { route } from "@/features/auth";
import { MAX_MERGE_RATINGS, mergeRatings, ratingItemSchema } from "@/features/practice";

// Merges the ratings a browser collected (signed out, or on another device) into the account.
export const POST = route({
  auth: "user",
  body: z.strictObject({ ratings: z.array(ratingItemSchema).max(MAX_MERGE_RATINGS) }),
  rateLimit: { name: "progress", by: "user" },
  handler: ({ auth, body, db }) => mergeRatings(db(), auth.user.id, body.ratings),
});
