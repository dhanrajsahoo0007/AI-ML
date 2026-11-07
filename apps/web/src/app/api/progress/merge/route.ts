import { z } from "zod";
import { route } from "@/features/auth";
import { MAX_MERGE_ITEMS, mergeItemSchema, mergeProgress } from "@/features/progress";

// Merges signed-out (localStorage) progress into the account right after sign-in.
export const POST = route({
  auth: "user",
  body: z.object({ items: z.array(mergeItemSchema).max(MAX_MERGE_ITEMS) }),
  rateLimit: { name: "progress", by: "user" },
  handler: ({ auth, body, db }) => mergeProgress(db(), auth.user.id, body.items),
});
