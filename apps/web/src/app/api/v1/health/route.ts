import { NextResponse } from "next/server";
import postgres from "postgres";

export const runtime = "nodejs";

export async function GET() {
  let db: "up" | "skipped" | "down" = "skipped";
  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = postgres(url, { max: 1 });
    try {
      await sql`select 1`;
      db = "up";
    } catch {
      db = "down";
    } finally {
      await sql.end({ timeout: 2 });
    }
  }

  return NextResponse.json({
    ok: true,
    db,
    time: new Date().toISOString(),
  });
}
