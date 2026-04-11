import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { learners } from "@/db/schema";

const COOKIE = "aiml_learner_key";

export async function getOrCreateLearner() {
  const jar = await cookies();
  let key = jar.get(COOKIE)?.value;
  if (!key) {
    key = randomUUID();
    jar.set(COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
      secure: process.env.NODE_ENV === "production",
    });
  }

  const existing = await db
    .select()
    .from(learners)
    .where(eq(learners.externalKey, key))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(learners)
    .values({ externalKey: key })
    .returning();
  return created;
}
