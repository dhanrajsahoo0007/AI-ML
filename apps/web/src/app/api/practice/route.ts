import { isFeatureOn } from "@/config/features";
import { route } from "@/features/auth";
import { listRatings, listStories, STORY_SYNC_FLAG } from "@/features/practice";

// Your own practice data: ratings by question id, and your stories. `stories` is null while the account does
// not store story text (content/features.yaml `practiceStories`); the browser then keeps stories to itself.
export const GET = route({
  auth: "user",
  rateLimit: { name: "progress", by: "user" },
  handler: async ({ auth, db }) => {
    const [ratings, stories] = await Promise.all([
      listRatings(db(), auth.user.id),
      isFeatureOn(STORY_SYNC_FLAG) ? listStories(db(), auth.user.id) : null,
    ]);
    return { ratings, stories };
  },
});
