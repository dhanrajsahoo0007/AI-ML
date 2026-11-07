import { z } from "zod";
import { route } from "@/features/auth";
import { contentKeySchema, listProgress, progressKindSchema, setProgress } from "@/features/progress";

// Mark an article complete or bookmark it (POST), undo (DELETE), and read your own progress (GET).
const body = z.object({ contentKey: contentKeySchema, kind: progressKindSchema });

export const GET = route({
  auth: "user",
  rateLimit: { name: "progress", by: "user" },
  handler: ({ auth, db }) => listProgress(db(), auth.user.id),
});

export const POST = route({
  auth: "user",
  body,
  rateLimit: { name: "progress", by: "user" },
  handler: async ({ auth, body, db }) => {
    await setProgress(db(), auth.user.id, body.contentKey, body.kind, true);
    return { ok: true };
  },
});

export const DELETE = route({
  auth: "user",
  body,
  rateLimit: { name: "progress", by: "user" },
  handler: async ({ auth, body, db }) => {
    await setProgress(db(), auth.user.id, body.contentKey, body.kind, false);
    return { ok: true };
  },
});
