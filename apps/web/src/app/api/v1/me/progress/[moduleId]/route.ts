import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { moduleProgress } from "@/db/schema";
import { findModuleById } from "@/lib/catalog";
import { getOrCreateLearner } from "@/lib/learner";

export const runtime = "nodejs";

const bodySchema = z.object({
  completed: z.boolean(),
});

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await ctx.params;
  const mod = await findModuleById(moduleId);
  if (!mod) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const learner = await getOrCreateLearner();
  const rows = await db
    .select()
    .from(moduleProgress)
    .where(
      and(
        eq(moduleProgress.learnerId, learner.id),
        eq(moduleProgress.moduleId, moduleId)
      )
    )
    .limit(1);

  return NextResponse.json({
    moduleId,
    completed: rows[0]?.completed ?? false,
    updatedAt: rows[0]?.updatedAt ?? null,
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ moduleId: string }> }
) {
  const { moduleId } = await ctx.params;
  const mod = await findModuleById(moduleId);
  if (!mod) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const learner = await getOrCreateLearner();
  const [row] = await db
    .insert(moduleProgress)
    .values({
      learnerId: learner.id,
      moduleId,
      completed: parsed.data.completed,
    })
    .onConflictDoUpdate({
      target: [moduleProgress.learnerId, moduleProgress.moduleId],
      set: {
        completed: parsed.data.completed,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json({
    moduleId,
    completed: row.completed,
    updatedAt: row.updatedAt,
  });
}
