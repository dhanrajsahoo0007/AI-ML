import { z } from "zod";
import { serverToServerRoute } from "@/features/newsletter/http";
import { newsletterDeps, newsletterHref } from "@/features/newsletter/server";
import { unsubscribeWithToken } from "@/features/newsletter/service";
import { isOneClick } from "@/features/newsletter/unsubscribe-headers";
import { HttpError } from "@/server/http";

// Unsubscribe (plan §15.2). Server to server as well as from the page, so the Origin check is off: the signed
// token is the only authority, and no cookie or session is read.
//   POST ?token=…  with `List-Unsubscribe=One-Click` (RFC 8058): what Gmail and Yahoo send from their unsubscribe
//                  button. No cookies, no redirect, no confirmation step.
//   POST {token}   from the unsubscribe page's button.
//   GET  ?token=…  changes nothing (link scanners open links); it redirects to the unsubscribe page.

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const tokenSchema = z.string().min(1).max(1024);
const jsonSchema = z.object({ token: tokenSchema }).strict();

async function tokenFrom(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return null;
  const contentType = request.headers.get("content-type") ?? "";
  const fromQuery = new URL(request.url).searchParams.get("token");
  if (fromQuery !== null) {
    // RFC 8058 §3.2: the body is urlencoded or multipart form data carrying List-Unsubscribe=One-Click.
    if (/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(contentType)) {
      const form = await request.formData().catch(() => null);
      if (!form || !isOneClick(form)) return null;
    }
    const parsed = tokenSchema.safeParse(fromQuery);
    return parsed.success ? parsed.data : null;
  }
  if (!/^application\/json\b/i.test(contentType)) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = jsonSchema.safeParse(raw);
  return parsed.success ? parsed.data.token : null;
}

export const POST = serverToServerRoute({
  rateLimit: { name: "newsletterToken", by: "ip" },
  handler: async ({ request, db }) => {
    const token = await tokenFrom(request);
    if (!token) throw new HttpError(400, "invalid_request", "Send the unsubscribe token");
    const result = await unsubscribeWithToken(newsletterDeps(newsletterHref()!, db), token);
    if (result.kind !== "unsubscribed") throw new HttpError(400, "invalid_token", "This link is not valid");
    return { status: "unsubscribed" };
  },
});

export const GET = serverToServerRoute({
  handler: ({ request }) => {
    const href = newsletterHref()!;
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const target = new URL(`${href}/unsubscribe`, request.url);
    if (token) target.searchParams.set("token", token);
    return new Response(null, { status: 303, headers: { Location: target.pathname + target.search } });
  },
});
