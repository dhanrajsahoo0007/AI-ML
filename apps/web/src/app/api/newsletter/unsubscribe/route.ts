import { z } from "zod";
import { error, guarded, isJson, json, parseJson, readBody, sectionOff } from "@/features/newsletter/http";
import { newsletterDeps, newsletterHref } from "@/features/newsletter/server";
import { unsubscribeWithToken } from "@/features/newsletter/service";
import { isOneClick } from "@/features/newsletter/unsubscribe-headers";

// Unsubscribe (plan §15.2).
//   POST ?token=…  with `List-Unsubscribe=One-Click` (RFC 8058): what Gmail and Yahoo send from their unsubscribe
//                  button. No cookies, no redirect, no confirmation step.
//   POST {token}   from the unsubscribe page's button.
//   GET  ?token=…  changes nothing (link scanners open links); it redirects to the unsubscribe page.

export const dynamic = "force-dynamic";

const tokenSchema = z.string().min(1).max(1024);
const jsonSchema = z.object({ token: tokenSchema }).strict();

async function tokenFrom(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get("token");
  if (fromQuery !== null) {
    const contentType = request.headers.get("content-type") ?? "";
    // RFC 8058 §3.2: the body is urlencoded or multipart form data carrying List-Unsubscribe=One-Click.
    if (/^(application\/x-www-form-urlencoded|multipart\/form-data)/i.test(contentType)) {
      const form = await request.formData().catch(() => null);
      if (!form || !isOneClick(form)) return null;
    }
    const parsed = tokenSchema.safeParse(fromQuery);
    return parsed.success ? parsed.data : null;
  }
  if (!isJson(request)) return null;
  const text = await readBody(request);
  const parsed = jsonSchema.safeParse(text === null ? undefined : parseJson(text));
  return parsed.success ? parsed.data.token : null;
}

export async function POST(request: Request) {
  const href = newsletterHref();
  if (!href) return sectionOff();
  return guarded("unsubscribe", async () => {
    const token = await tokenFrom(request);
    if (!token) return error(400, "invalid_request");
    const result = await unsubscribeWithToken(newsletterDeps(href), token);
    return result.kind === "unsubscribed" ? json(200, { status: "unsubscribed" }) : error(400, "invalid_token");
  });
}

export async function GET(request: Request) {
  const href = newsletterHref();
  if (!href) return sectionOff();
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const target = new URL(`${href}/unsubscribe`, request.url);
  if (token) target.searchParams.set("token", token);
  return new Response(null, {
    status: 303,
    headers: { Location: target.pathname + target.search, "Cache-Control": "no-store" },
  });
}
