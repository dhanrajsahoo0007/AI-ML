import { judgeCases, judgeParams } from "@/features/dsa";

// The hidden cases "Submit" runs in the browser (features/dsa/judge.ts). Prerendered: one static JSON file per
// problem, nothing computed per request and no database. Not a page, so it is kept out of search indexes.

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return judgeParams();
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const cases = judgeCases((await params).slug);
  if (!cases) return new Response("Not found", { status: 404 });
  return Response.json(cases, { headers: { "X-Robots-Tag": "noindex" } });
}
