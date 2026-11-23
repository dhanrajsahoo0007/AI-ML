import { z } from "zod";
import { route } from "@/features/auth";
import { addRating, questionIdSchema, ratingSchema } from "@/features/practice";

// Records one practice of an interview question with the learner's own rating (1 to 5).
export const POST = route({
  auth: "user",
  body: z.strictObject({ questionId: questionIdSchema, rating: ratingSchema }),
  rateLimit: { name: "progress", by: "user" },
  handler: async ({ auth, body, db }) => {
    await addRating(db(), auth.user.id, body.questionId, body.rating);
    return { ok: true };
  },
});
