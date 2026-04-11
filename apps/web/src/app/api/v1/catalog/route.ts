import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/get-catalog";

export const runtime = "nodejs";
export const revalidate = 0;

export async function GET() {
  try {
    const catalog = await getCatalog();
    return NextResponse.json(
      { paths: catalog },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}
