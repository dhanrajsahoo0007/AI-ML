import { z } from "zod";
import { isFeatureOn } from "@/config/features";
import { route } from "@/features/auth";
import { deleteStory, saveStory, storyIdSchema, storySchema, STORY_SYNC_FLAG } from "@/features/practice";
import { HttpError, notFound } from "@/server/http";

// Save (POST) or delete (DELETE) one of your own interview stories. Off until the site owner turns on
// `practiceStories` in content/features.yaml: then both answer 404 and stories stay in the browser.
export const POST = route({
  auth: "user",
  body: z.strictObject({ story: storySchema }),
  rateLimit: { name: "progress", by: "user" },
  handler: async ({ auth, body, db }) => {
    if (!isFeatureOn(STORY_SYNC_FLAG)) throw notFound();
    if ((await saveStory(db(), auth.user.id, body.story)) === "full") {
      throw new HttpError(409, "story_limit", "You have reached the number of stories an account can hold");
    }
    return { ok: true };
  },
});

export const DELETE = route({
  auth: "user",
  body: z.strictObject({ id: storyIdSchema }),
  rateLimit: { name: "progress", by: "user" },
  handler: async ({ auth, body, db }) => {
    if (!isFeatureOn(STORY_SYNC_FLAG)) throw notFound();
    await deleteStory(db(), auth.user.id, body.id);
    return { ok: true };
  },
});
